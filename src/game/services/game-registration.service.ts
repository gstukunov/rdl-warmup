import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { Game, GameStatus } from '../entities/game.entity';
import {
  GameParticipant,
  ParticipantRole,
  ParticipantPosition,
} from '../entities/game-participant.entity';
import type { IGameRepository } from '../repositories/game.repository.interface';
import { GAME_REPOSITORY } from '../repositories/game.repository.interface';
import type { IGameParticipantRepository } from '../repositories/game-participant.repository.interface';
import { GAME_PARTICIPANT_REPOSITORY } from '../repositories/game-participant.repository.interface';
import { UserService } from '../../user/services/user.service';

export interface RegistrationData {
  gameId: string;
  telegramId: number;
  username: string | null;
  firstName: string | null;
  role: ParticipantRole;
}

@Injectable()
export class GameRegistrationService {
  constructor(
    @Inject(GAME_REPOSITORY)
    private readonly gameRepository: IGameRepository,
    @Inject(GAME_PARTICIPANT_REPOSITORY)
    private readonly participantRepository: IGameParticipantRepository,
    private readonly userService: UserService,
  ) {}

  async registerForGame(data: RegistrationData): Promise<GameParticipant> {
    const game = await this.gameRepository.findById(data.gameId, ['participants']);

    if (!game) {
      throw new NotFoundException('Игра не найдена');
    }

    if (game.status !== GameStatus.REGISTRATION) {
      throw new ForbiddenException('Регистрация на эту игру закрыта');
    }

    const existingParticipant = await this.participantRepository.findByGameAndTelegramId(
      data.gameId,
      data.telegramId,
    );

    if (existingParticipant) {
      throw new ConflictException('Вы уже зарегистрированы в этой игре');
    }

    if (data.role === ParticipantRole.PLAYER) {
      const playerCount = await this.participantRepository.countByGameAndRole(
        data.gameId,
        ParticipantRole.PLAYER,
      );

      if (playerCount >= game.maxParticipants) {
        throw new ForbiddenException('В игре нет свободных мест');
      }
    }

    const user = await this.userService.findOrCreate({
      telegramId: data.telegramId,
      username: data.username,
      firstName: data.firstName,
    });

    const participant = await this.participantRepository.create({
      gameId: data.gameId,
      userId: user.id,
      telegramId: data.telegramId,
      username: data.username,
      firstName: data.firstName,
      role: data.role,
      position: ParticipantPosition.NONE,
      isRegistered: true,
    });

    return participant;
  }

  async isUserRegistered(gameId: string, telegramId: number): Promise<boolean> {
    return this.participantRepository.exists(gameId, telegramId);
  }

  async getUserActiveGame(telegramId: number): Promise<Game | null> {
    const activeGames = await this.gameRepository.findActiveGamesForUser(telegramId);
    return activeGames.length > 0 ? activeGames[0] : null;
  }
}
