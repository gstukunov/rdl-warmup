import { Injectable } from '@nestjs/common';
import { GameManagementService } from './services/game-management.service';
import { RoomAllocationService } from './services/room-allocation.service';
import { ScoringService } from './services/scoring.service';
import { JudgeFeedbackService } from './services/judge-feedback.service';
import { GameRegistrationService } from './services/game-registration.service';
import { GameBotService } from './services/game-bot.service';
import type { CreateGameDto } from './dto/create-game.dto';
import type { ImportGameResultDto } from './dto/import-game-result.dto';
import type { Game } from './entities/game.entity';
import type { GameParticipant } from './entities/game-participant.entity';
import { ParticipantRole } from './entities/game-participant.entity';
import type { SpeakerScore } from './entities/speaker-score.entity';
import type { JudgeFeedback } from './entities/judge-feedback.entity';
import type { AllocatedRoom } from './types';

// Re-export for backward compatibility
export type { AllocatedRoom };

/**
 * GameService - Facade that delegates to specialized services
 * 
 * This service maintains backward compatibility while the codebase
 * transitions to using specialized services directly.
 */
@Injectable()
export class GameService {
  constructor(
    private readonly managementService: GameManagementService,
    private readonly registrationService: GameRegistrationService,
    private readonly allocationService: RoomAllocationService,
    private readonly scoringService: ScoringService,
    private readonly feedbackService: JudgeFeedbackService,
    private readonly botService: GameBotService,
  ) {}

  // ==================== Game Management ====================
  
  async createGame(
    createGameDto: CreateGameDto,
    creatorTelegramId: number,
  ): Promise<Game> {
    return this.managementService.createGame(createGameDto, creatorTelegramId);
  }

  async getOpenGames(): Promise<Game[]> {
    return this.managementService.getOpenGames();
  }

  async getGameById(id: string): Promise<Game | null> {
    return this.managementService.getGameById(id);
  }

  async getUserActiveGame(telegramId: number): Promise<Game | null> {
    return this.managementService.getUserActiveGame(telegramId);
  }

  async completeGame(gameId: string, telegramId: number): Promise<Game> {
    return this.managementService.completeGame(gameId, telegramId);
  }

  async leaveGame(gameId: string, telegramId: number): Promise<void> {
    return this.managementService.leaveGame(gameId, telegramId);
  }

  async cancelGame(gameId: string, telegramId: number): Promise<Game> {
    return this.managementService.cancelGame(gameId, telegramId);
  }

  async setMotionAndStart(
    gameId: string,
    motion: string,
    telegramId: number,
  ): Promise<Game> {
    return this.managementService.setMotionAndStart(gameId, motion, telegramId);
  }

  async getGameParticipants(gameId: string): Promise<GameParticipant[]> {
    return this.managementService.getGameParticipants(gameId);
  }

  // ==================== Registration ====================

  async registerForGame(
    gameId: string,
    telegramId: number,
    username: string | null,
    firstName: string | null,
    role: ParticipantRole,
  ): Promise<GameParticipant> {
    return this.registrationService.registerForGame({
      gameId,
      telegramId,
      username,
      firstName,
      role,
    });
  }

  async isUserRegistered(gameId: string, telegramId: number): Promise<boolean> {
    return this.managementService.isUserRegistered(gameId, telegramId);
  }

  // ==================== Room Allocation ====================

  async allocatePlayers(
    gameId: string,
    initiatorTelegramId: number,
  ): Promise<AllocatedRoom[]> {
    return this.allocationService.allocatePlayers(gameId, initiatorTelegramId);
  }

  // ==================== Scoring ====================

  async submitScores(
    gameId: string,
    judgeTelegramId: number,
    openingGovernment?: string,
    openingOpposition?: string,
    closingGovernment?: string,
    closingOpposition?: string,
  ): Promise<void> {
    return this.scoringService.submitScores(gameId, judgeTelegramId, {
      openingGovernment,
      openingOpposition,
      closingGovernment,
      closingOpposition,
    });
  }

  parseScores(scoreString: string): { position: string; score1: number; score2: number } {
    return this.scoringService.parseScores(scoreString);
  }

  async hasJudgeSubmittedScores(
    gameId: string,
    judgeTelegramId: number,
  ): Promise<boolean> {
    return this.scoringService.hasJudgeSubmittedScores(gameId, judgeTelegramId);
  }

  async getGameScores(gameId: string): Promise<SpeakerScore[]> {
    return this.scoringService.getGameScores(gameId);
  }

  // ==================== Judge Feedback ====================

  async submitJudgeFeedback(
    gameId: string,
    playerTelegramId: number,
    judgeTelegramId: number,
    score: number,
    feedback?: string,
  ): Promise<JudgeFeedback> {
    return this.feedbackService.submitFeedback(
      gameId,
      playerTelegramId,
      judgeTelegramId,
      score,
      feedback,
    );
  }

  async getRoomJudges(
    gameId: string,
    playerTelegramId: number,
  ): Promise<{ telegramId: number; username: string | null; firstName: string | null }[]> {
    return this.feedbackService.getRoomJudges(gameId, playerTelegramId);
  }

  async getUnratedJudges(
    gameId: string,
    playerTelegramId: number,
  ): Promise<{ telegramId: number; username: string | null; firstName: string | null }[]> {
    return this.feedbackService.getUnratedJudges(gameId, playerTelegramId);
  }

  async hasPlayerRatedJudge(
    gameId: string,
    playerTelegramId: number,
    judgeTelegramId: number,
  ): Promise<boolean> {
    return this.feedbackService.hasPlayerRatedJudge(
      gameId,
      playerTelegramId,
      judgeTelegramId,
    );
  }

  async getJudgeAverageRating(
    judgeTelegramId: number,
  ): Promise<{ averageScore: number; totalFeedbacks: number }> {
    return this.feedbackService.getJudgeAverageRating(judgeTelegramId);
  }

  async getJudgeFeedbacks(judgeTelegramId: number): Promise<JudgeFeedback[]> {
    return this.feedbackService.getJudgeFeedbacks(judgeTelegramId);
  }

  async getUnratedJudgesWithMotion(
    playerTelegramId: number,
  ): Promise<
    {
      gameId: string;
      judgeTelegramId: number;
      judgeName: string | null;
      motion: string | null;
      gameName: string;
      gameDate: Date;
    }[]
  > {
    return this.feedbackService.getUnratedJudgesWithMotion(playerTelegramId);
  }

  // ==================== Bot Service ====================

  async fillWithBots(
    gameId: string,
    initiatorTelegramId: number,
  ): Promise<Game> {
    return this.botService.fillWithBots(gameId, initiatorTelegramId);
  }

  // ==================== Import (to be moved to separate service) ====================
  
  async importGameResult(importDto: ImportGameResultDto): Promise<Game> {
    // TODO: Move to separate ImportService
    // For now, this is a placeholder - the import logic needs to be refactored
    // to use the new repository pattern
    throw new Error('Import functionality needs to be refactored to use new architecture');
  }

  // ==================== Admin ====================

  async toggleFeedbackVisibility(
    gameId: string,
    hideFeedback: boolean,
  ): Promise<Game> {
    return this.managementService.toggleFeedbackVisibility(gameId, hideFeedback);
  }
}
