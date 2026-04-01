import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  Inject,
} from '@nestjs/common';
import type { Game } from '../entities/game.entity';
import { GameStatus } from '../entities/game.entity';
import { ParticipantRole } from '../entities/game-participant.entity';
import { JudgeFeedback } from '../entities/judge-feedback.entity';
import type { IGameRepository } from '../repositories/game.repository.interface';
import { GAME_REPOSITORY } from '../repositories/game.repository.interface';
import type { IGameParticipantRepository } from '../repositories/game-participant.repository.interface';
import { GAME_PARTICIPANT_REPOSITORY } from '../repositories/game-participant.repository.interface';
import type { IJudgeFeedbackRepository } from '../repositories/judge-feedback.repository.interface';
import { JUDGE_FEEDBACK_REPOSITORY } from '../repositories/judge-feedback.repository.interface';

export interface JudgeInfo {
  telegramId: number;
  username: string | null;
  firstName: string | null;
}

export interface UnratedJudgeInfo {
  gameId: string;
  judgeTelegramId: number;
  judgeName: string | null;
  motion: string | null;
  gameName: string;
  gameDate: Date;
}

export interface JudgeRatingResult {
  averageScore: number;
  totalFeedbacks: number;
}

@Injectable()
export class JudgeFeedbackService {
  constructor(
    @Inject(GAME_REPOSITORY)
    private readonly gameRepository: IGameRepository,
    @Inject(GAME_PARTICIPANT_REPOSITORY)
    private readonly participantRepository: IGameParticipantRepository,
    @Inject(JUDGE_FEEDBACK_REPOSITORY)
    private readonly judgeFeedbackRepository: IJudgeFeedbackRepository,
  ) {}

  async submitFeedback(
    gameId: string,
    playerTelegramId: number,
    judgeTelegramId: number,
    score: number,
    feedback?: string,
  ): Promise<JudgeFeedback> {
    const game = await this.gameRepository.findById(gameId, ['participants']);

    if (!game) {
      throw new NotFoundException('Игра не найдена');
    }

    if (game.status !== GameStatus.COMPLETED) {
      throw new ForbiddenException(
        'Отзыв можно оставить только после завершения игры',
      );
    }

    const playerParticipant = game.participants?.find(
      (p) =>
        Number(p.telegramId) === playerTelegramId &&
        p.role === ParticipantRole.PLAYER,
    );
    if (!playerParticipant) {
      throw new ForbiddenException('Только участники могут оставлять отзывы');
    }

    const judgeParticipant = game.participants?.find(
      (p) =>
        Number(p.telegramId) === judgeTelegramId &&
        p.role === ParticipantRole.JUDGE,
    );
    if (!judgeParticipant) {
      throw new NotFoundException('Судья не найден');
    }

    const existingFeedback = await this.judgeFeedbackRepository.existsByGamePlayerAndJudge(
      gameId,
      playerTelegramId,
      judgeTelegramId,
    );

    if (existingFeedback) {
      throw new ConflictException('Вы уже оставили отзыв для этого судьи');
    }

    const roomAllocations = game.legacyRoomAllocations;

    if (roomAllocations && roomAllocations.length > 0) {
      const playerRoom = roomAllocations.find((room) =>
        room.participants.some((p) => p.telegramId == playerTelegramId),
      );
      const judgeRoom = roomAllocations.find((room) =>
        room.judges?.some((j) => j.telegramId == judgeTelegramId),
      );

      if (
        !playerRoom ||
        !judgeRoom ||
        playerRoom.roomNumber != judgeRoom.roomNumber
      ) {
        throw new ForbiddenException(
          'Вы можете оставить отзыв только на судью из вашей комнаты',
        );
      }
    }

    return this.judgeFeedbackRepository.create({
      gameId,
      playerTelegramId,
      judgeTelegramId,
      score,
      feedback: feedback || null,
    });
  }

  async getRoomJudges(
    gameId: string,
    playerTelegramId: number,
  ): Promise<JudgeInfo[]> {
    const game = await this.gameRepository.findById(gameId, ['participants']);

    if (!game) {
      throw new NotFoundException('Игра не найдена');
    }

    const roomAllocations = game.legacyRoomAllocations;
    if (!roomAllocations || roomAllocations.length === 0) {
      return [];
    }

    const playerRoom = roomAllocations.find((room) =>
      room.participants.some((p) => p.telegramId === playerTelegramId),
    );

    if (!playerRoom) {
      return [];
    }

    const judgeIds = playerRoom.judges?.map((j) => j.telegramId) || [];

    const judges =
      game.participants?.filter(
        (p) =>
          p.role === ParticipantRole.JUDGE &&
          judgeIds.includes(Number(p.telegramId)),
      ) || [];

    return judges.map((j) => ({
      telegramId: Number(j.telegramId),
      username: j.username,
      firstName: j.firstName,
    }));
  }

  async getUnratedJudges(
    gameId: string,
    playerTelegramId: number,
  ): Promise<JudgeInfo[]> {
    const allJudges = await this.getRoomJudges(gameId, playerTelegramId);

    const ratedFeedbacks = await this.judgeFeedbackRepository.findByGameAndPlayer(
      gameId,
      playerTelegramId,
    );

    const ratedJudgeIds = new Set(ratedFeedbacks.map((f) => f.judgeTelegramId));

    return allJudges.filter((j) => !ratedJudgeIds.has(j.telegramId));
  }

  async hasPlayerRatedJudge(
    gameId: string,
    playerTelegramId: number,
    judgeTelegramId: number,
  ): Promise<boolean> {
    return this.judgeFeedbackRepository.existsByGamePlayerAndJudge(
      gameId,
      playerTelegramId,
      judgeTelegramId,
    );
  }

  async getJudgeAverageRating(judgeTelegramId: number): Promise<JudgeRatingResult> {
    const result = await this.judgeFeedbackRepository.getAverageScoreForJudge(
      judgeTelegramId,
    );

    return {
      averageScore: result.average,
      totalFeedbacks: result.count,
    };
  }

  async getJudgeFeedbacks(judgeTelegramId: number): Promise<JudgeFeedback[]> {
    return this.judgeFeedbackRepository.findByJudgeTelegramId(judgeTelegramId);
  }

  async getUnratedJudgesWithMotion(
    playerTelegramId: number,
  ): Promise<UnratedJudgeInfo[]> {
    const playerParticipations = await this.participantRepository.findByTelegramId(
      playerTelegramId,
    );

    const completedGames = playerParticipations.filter(
      (p) => p.game && p.game.status === GameStatus.COMPLETED && !p.game.isFeedbackHidden,
    );

    if (completedGames.length === 0) {
      return [];
    }

    const result: UnratedJudgeInfo[] = [];

    for (const participation of completedGames) {
      const game = participation.game;
      if (!game || !game.id) continue;

      const judges = await this.participantRepository.findByGameAndRole(
        game.id,
        ParticipantRole.JUDGE,
      );

      if (judges.length === 0) continue;

      const ratedFeedbacks = await this.judgeFeedbackRepository.findByGameAndPlayer(
        game.id,
        playerTelegramId,
      );

      const ratedJudgeIds = new Set(
        ratedFeedbacks.map((f) => Number(f.judgeTelegramId)),
      );

      for (const judge of judges) {
        if (!ratedJudgeIds.has(Number(judge.telegramId))) {
          result.push({
            gameId: game.id,
            judgeTelegramId: Number(judge.telegramId),
            judgeName:
              judge.firstName || judge.username || `Судья ${judge.telegramId}`,
            motion: game.motion || null,
            gameName: game.name || 'Игра без названия',
            gameDate: game.updatedAt || game.createdAt || new Date(),
          });
        }
      }
    }

    return result.sort((a, b) => b.gameDate.getTime() - a.gameDate.getTime());
  }
}
