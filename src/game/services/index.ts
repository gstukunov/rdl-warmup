// Service exports
export { GameManagementService } from './game-management.service';
export { RoomAllocationService } from './room-allocation.service';
export { ScoringService } from './scoring.service';
export { JudgeFeedbackService } from './judge-feedback.service';
export { GameRegistrationService } from './game-registration.service';
export { GameBotService } from './game-bot.service';

// Types
export type { ScoreSubmissionData } from './scoring.service';
export type { 
  JudgeInfo, 
  UnratedJudgeInfo, 
  JudgeRatingResult 
} from './judge-feedback.service';
export type { RegistrationData } from './game-registration.service';
