import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
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

@Injectable()
export class GameBotService {
  private readonly botFirstNames = [
    'Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Quinn', 'Avery',
    'Blake', 'Cameron', 'Drew', 'Emery', 'Finley', 'Harper', 'Hayden', 'Jamie',
    'Kendall', 'Lane', 'Marley', 'Nico', 'Parker', 'Peyton', 'Reese', 'Sawyer',
    'Shannon', 'Sidney', 'Skyler', 'Spencer', 'Tatum', 'Tristan', 'Winter', 'Zion',
  ];

  private readonly judgeNames = ['Victoria', 'Alexander', 'Catherine', 'Maximilian'];

  constructor(
    @Inject(GAME_REPOSITORY)
    private readonly gameRepository: IGameRepository,
    @Inject(GAME_PARTICIPANT_REPOSITORY)
    private readonly participantRepository: IGameParticipantRepository,
    private readonly userService: UserService,
  ) {}

  async fillWithBots(
    gameId: string,
    initiatorTelegramId: number,
  ): Promise<Game> {
    const game = await this.gameRepository.findById(gameId, ['participants']);

    if (!game) {
      throw new NotFoundException('Игра не найдена');
    }

    if (game.status !== GameStatus.REGISTRATION) {
      throw new ForbiddenException('Игра не в статусе регистрации');
    }

    const initiator = game.participants?.find(
      (p) => Number(p.telegramId) === initiatorTelegramId,
    );
    const isCreator = game.createdByTelegramId === initiatorTelegramId;
    if (!initiator && !isCreator) {
      throw new ForbiddenException(
        'Только участник или создатель игры может добавлять ботов',
      );
    }

    const currentPlayers =
      game.participants?.filter((p) => p.role === ParticipantRole.PLAYER) || [];
    const playersNeeded = game.maxParticipants - currentPlayers.length;

    if (playersNeeded <= 0) {
      throw new BadRequestException('Игра уже заполнена');
    }

    const baseId = Date.now();

    await this.addBotPlayers(gameId, playersNeeded, baseId);
    await this.addBotJudges(gameId, currentPlayers.length, playersNeeded, baseId);

    const updatedGame = await this.gameRepository.findById(gameId, ['participants']);
    if (!updatedGame) {
      throw new NotFoundException('Не удалось загрузить обновлённую игру');
    }
    return updatedGame;
  }

  private async addBotPlayers(
    gameId: string,
    count: number,
    baseId: number,
  ): Promise<void> {
    for (let i = 0; i < count; i++) {
      const botTelegramId = -(baseId + i + 1);
      const firstName = this.botFirstNames[i % this.botFirstNames.length];
      const botNumber = i + 1;

      const user = await this.userService.findOrCreate({
        telegramId: botTelegramId,
        username: `bot_player_${botNumber}`,
        firstName: `${firstName} (Bot)`,
      });

      await this.participantRepository.create({
        gameId,
        userId: user.id,
        telegramId: botTelegramId,
        username: `bot_player_${botNumber}`,
        firstName: `${firstName} (Bot)`,
        role: ParticipantRole.PLAYER,
        position: ParticipantPosition.NONE,
        isRegistered: true,
        metadata: { isBot: true },
      });
    }
  }

  private async addBotJudges(
    gameId: string,
    currentPlayerCount: number,
    playersAdded: number,
    baseId: number,
  ): Promise<void> {
    const game = await this.gameRepository.findById(gameId, ['participants']);
    const currentJudges =
      game?.participants?.filter((p) => p.role === ParticipantRole.JUDGE) || [];
    const judgesToAdd = Math.max(1, 2 - currentJudges.length);

    for (let i = 0; i < judgesToAdd; i++) {
      const botTelegramId = -(baseId + playersAdded + i + 1);
      const firstName = this.judgeNames[i % this.judgeNames.length];
      const botNumber = i + 1;

      const user = await this.userService.findOrCreate({
        telegramId: botTelegramId,
        username: `bot_judge_${botNumber}`,
        firstName: `${firstName} (Bot Judge)`,
      });

      await this.participantRepository.create({
        gameId,
        userId: user.id,
        telegramId: botTelegramId,
        username: `bot_judge_${botNumber}`,
        firstName: `${firstName} (Bot Judge)`,
        role: ParticipantRole.JUDGE,
        position: ParticipantPosition.NONE,
        isRegistered: true,
        metadata: { isBot: true },
      });
    }
  }

  isBot(telegramId: number): boolean {
    return telegramId < 0;
  }
}
