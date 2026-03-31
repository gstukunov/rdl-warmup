import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
  Inject,
} from '@nestjs/common';
import type { Game } from '../entities/game.entity';
import { GameStatus, LegacyRoomAllocation } from '../entities/game.entity';
import { ParticipantRole } from '../entities/game-participant.entity';
import type { SpeakerScore } from '../entities/speaker-score.entity';
import type { IGameRepository } from '../repositories/game.repository.interface';
import { GAME_REPOSITORY } from '../repositories/game.repository.interface';
import type { ISpeakerScoreRepository } from '../repositories/speaker-score.repository.interface';
import { SPEAKER_SCORE_REPOSITORY } from '../repositories/speaker-score.repository.interface';
import type { ParsedScores } from '../dto/submit-scores.dto';

export interface ScoreSubmissionData {
  openingGovernment?: string;
  openingOpposition?: string;
  closingGovernment?: string;
  closingOpposition?: string;
}

@Injectable()
export class ScoringService {
  constructor(
    @Inject(GAME_REPOSITORY)
    private readonly gameRepository: IGameRepository,
    @Inject(SPEAKER_SCORE_REPOSITORY)
    private readonly speakerScoreRepository: ISpeakerScoreRepository,
  ) {}

  async submitScores(
    gameId: string,
    judgeTelegramId: number,
    scores: ScoreSubmissionData,
  ): Promise<void> {
    const game = await this.gameRepository.findById(gameId, ['participants']);

    if (!game) {
      throw new NotFoundException('Игра не найдена');
    }

    const judgeParticipant = game.participants?.find(
      (p) => Number(p.telegramId) === judgeTelegramId,
    );
    if (!judgeParticipant || judgeParticipant.role !== ParticipantRole.JUDGE) {
      throw new ForbiddenException('Только судья может вводить оценки');
    }

    if (
      game.status !== GameStatus.IN_PROGRESS &&
      game.status !== GameStatus.ALLOCATING
    ) {
      throw new ForbiddenException('Игра не активна');
    }

    const hasSubmitted = await this.speakerScoreRepository.existsByGameAndJudge(
      gameId,
      judgeTelegramId,
    );

    if (hasSubmitted) {
      throw new ConflictException('Вы уже ввели оценки для этой игры');
    }

    // Use legacy room allocations from settings during transition
    const roomAllocations = game.legacyRoomAllocations;
    if (!roomAllocations || roomAllocations.length === 0) {
      throw new BadRequestException('Распределение не выполнено');
    }

    const judgeRoom =
      roomAllocations.find((room) =>
        room.participants.some((p) => Number(p.telegramId) === judgeTelegramId),
      ) || roomAllocations[0];

    const hasOpeningGov = judgeRoom.participants.some(
      (p) => p.position === 'OG',
    );
    const hasOpeningOpp = judgeRoom.participants.some(
      (p) => p.position === 'OO',
    );
    const hasClosingGov = judgeRoom.participants.some(
      (p) => p.position === 'CG',
    );
    const hasClosingOpp = judgeRoom.participants.some(
      (p) => p.position === 'CO',
    );

    if (hasOpeningGov && scores.openingGovernment) {
      const ogScores = this.parseScores(scores.openingGovernment);
      await this.savePositionScores(
        gameId,
        judgeTelegramId,
        'opening_government',
        ogScores,
        judgeRoom,
      );
    }
    if (hasOpeningOpp && scores.openingOpposition) {
      const ooScores = this.parseScores(scores.openingOpposition);
      await this.savePositionScores(
        gameId,
        judgeTelegramId,
        'opening_opposition',
        ooScores,
        judgeRoom,
      );
    }
    if (hasClosingGov && scores.closingGovernment) {
      const cgScores = this.parseScores(scores.closingGovernment);
      await this.savePositionScores(
        gameId,
        judgeTelegramId,
        'closing_government',
        cgScores,
        judgeRoom,
      );
    }
    if (hasClosingOpp && scores.closingOpposition) {
      const coScores = this.parseScores(scores.closingOpposition);
      await this.savePositionScores(
        gameId,
        judgeTelegramId,
        'closing_opposition',
        coScores,
        judgeRoom,
      );
    }
  }

  private async savePositionScores(
    gameId: string,
    judgeTelegramId: number,
    position: string,
    scores: ParsedScores,
    room: LegacyRoomAllocation,
  ): Promise<void> {
    const positionAbbrev =
      position === 'opening_government'
        ? 'OG'
        : position === 'opening_opposition'
          ? 'OO'
          : position === 'closing_government'
            ? 'CG'
            : 'CO';

    const playersInPosition = room.participants.filter(
      (p) => p.position === positionAbbrev,
    );

    if (playersInPosition.length === 0) {
      return;
    }

    const isIronman =
      playersInPosition.length === 1 && playersInPosition[0].isIronman == true;

    if (isIronman) {
      const highestScore = Math.max(scores.score1, scores.score2);
      const player = playersInPosition[0];

      await this.speakerScoreRepository.create({
        gameId,
        telegramId: player.telegramId,
        position,
        score: highestScore,
        isIronman: true,
        judgeTelegramId,
      });
    } else {
      for (let i = 0; i < playersInPosition.length; i++) {
        const player = playersInPosition[i];
        const score = i === 0 ? scores.score1 : scores.score2;

        await this.speakerScoreRepository.create({
          gameId,
          telegramId: player.telegramId,
          position,
          score,
          isIronman: false,
          judgeTelegramId,
        });
      }
    }
  }

  parseScores(scoreString: string): ParsedScores {
    const parts = scoreString.split('/');
    if (parts.length !== 2) {
      throw new BadRequestException(
        'Invalid score format. Use "score1/score2"',
      );
    }
    const score1 = parseInt(parts[0].trim(), 10);
    const score2 = parseInt(parts[1].trim(), 10);

    if (isNaN(score1) || isNaN(score2)) {
      throw new BadRequestException('Scores must be numbers');
    }

    if (score1 < 0 || score1 > 100 || score2 < 0 || score2 > 100) {
      throw new BadRequestException('Scores must be between 0 and 100');
    }

    return { position: '', score1, score2 };
  }

  async hasJudgeSubmittedScores(
    gameId: string,
    judgeTelegramId: number,
  ): Promise<boolean> {
    return this.speakerScoreRepository.existsByGameAndJudge(
      gameId,
      judgeTelegramId,
    );
  }

  async getGameScores(gameId: string): Promise<SpeakerScore[]> {
    return this.speakerScoreRepository.findByGameId(gameId);
  }

  async getPlayerScores(telegramId: number): Promise<SpeakerScore[]> {
    return this.speakerScoreRepository.findByTelegramId(telegramId);
  }

  async getAverageScoreForPlayer(telegramId: number): Promise<number | null> {
    return this.speakerScoreRepository.getAverageScoreForUser(telegramId);
  }
}
