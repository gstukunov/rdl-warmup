import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import type { Game } from '../entities/game.entity';
import { GameStatus } from '../entities/game.entity';
import type { GameParticipant } from '../entities/game-participant.entity';
import { ParticipantRole } from '../entities/game-participant.entity';
import type { IGameRepository } from '../repositories/game.repository.interface';
import { GAME_REPOSITORY } from '../repositories/game.repository.interface';
import type { IGameParticipantRepository } from '../repositories/game-participant.repository.interface';
import { GAME_PARTICIPANT_REPOSITORY } from '../repositories/game-participant.repository.interface';
import type { CreateGameDto } from '../dto/create-game.dto';
import type { AllocatedRoom } from '../types';

@Injectable()
export class GameManagementService {
  constructor(
    @Inject(GAME_REPOSITORY)
    private readonly gameRepository: IGameRepository,
    @Inject(GAME_PARTICIPANT_REPOSITORY)
    private readonly participantRepository: IGameParticipantRepository,
  ) {}

  async createGame(
    createGameDto: CreateGameDto,
    creatorTelegramId: number,
  ): Promise<Game> {
    const game = await this.gameRepository.create({
      name: createGameDto.name,
      description: createGameDto.description || null,
      status: GameStatus.REGISTRATION,
      maxParticipants: createGameDto.maxParticipants || 8,
      createdByTelegramId: creatorTelegramId,
      isAllocated: false,
      settings: {}, // Keep empty settings for any future extensibility
    });

    return game;
  }

  async getOpenGames(): Promise<Game[]> {
    return this.gameRepository.findOpenGames();
  }

  async getGameById(id: string): Promise<Game | null> {
    return this.gameRepository.findById(id, ['participants']);
  }

  async getUserActiveGame(telegramId: number): Promise<Game | null> {
    const activeGames = await this.gameRepository.findActiveGamesForUser(telegramId);
    return activeGames.length > 0 ? activeGames[0] : null;
  }

  async completeGame(gameId: string, telegramId: number): Promise<Game> {
    const game = await this.gameRepository.findById(gameId, ['participants']);

    if (!game) {
      throw new NotFoundException('Игра не найдена');
    }

    const participant = game.participants?.find(
      (p) => Number(p.telegramId) === telegramId,
    );
    if (!participant || participant.role !== ParticipantRole.JUDGE) {
      throw new ForbiddenException('Только судья может завершить игру');
    }

    if (game.status !== GameStatus.IN_PROGRESS) {
      throw new ForbiddenException('Игра не может быть завершена');
    }

    game.status = GameStatus.COMPLETED;
    game.endTime = new Date();

    return this.gameRepository.save(game);
  }

  async leaveGame(gameId: string, telegramId: number): Promise<void> {
    const game = await this.gameRepository.findById(gameId);

    if (!game) {
      throw new NotFoundException('Игра не найдена');
    }

    if (game.status !== GameStatus.REGISTRATION) {
      throw new ForbiddenException(
        'Нельзя покинуть игру после начала регистрации',
      );
    }

    const participant = await this.participantRepository.findByGameAndTelegramId(
      gameId,
      telegramId,
    );

    if (!participant) {
      throw new NotFoundException('Вы не зарегистрированы в этой игре');
    }

    await this.participantRepository.delete(participant);
  }

  async cancelGame(gameId: string, telegramId: number): Promise<Game> {
    const game = await this.gameRepository.findById(gameId);

    if (!game) {
      throw new NotFoundException('Игра не найдена');
    }

    if (game.createdByTelegramId !== telegramId) {
      throw new ForbiddenException('Только организатор может отменить игру');
    }

    if (
      game.status !== GameStatus.REGISTRATION &&
      game.status !== GameStatus.ALLOCATING
    ) {
      throw new ForbiddenException('Нельзя отменить игру после её начала');
    }

    game.status = GameStatus.CANCELLED;

    return this.gameRepository.save(game);
  }

  async isUserRegistered(gameId: string, telegramId: number): Promise<boolean> {
    return this.participantRepository.exists(gameId, telegramId);
  }

  async getGameParticipants(gameId: string): Promise<GameParticipant[]> {
    return this.participantRepository.findByGameId(gameId);
  }

  async setMotionAndStart(
    gameId: string,
    motion: string,
    telegramId: number,
  ): Promise<Game> {
    const game = await this.gameRepository.findById(gameId, ['participants']);

    if (!game) {
      throw new NotFoundException('Игра не найдена');
    }

    const participant = game.participants?.find(
      (p) => Number(p.telegramId) === telegramId,
    );

    if (!participant || participant.role !== ParticipantRole.JUDGE) {
      throw new ForbiddenException('Только судья может установить тему');
    }

    if (game.status !== GameStatus.ALLOCATING) {
      throw new ForbiddenException('Игра не готова к старту');
    }

    game.motion = motion;
    game.status = GameStatus.IN_PROGRESS;
    game.startTime = new Date();

    return this.gameRepository.save(game);
  }
}
