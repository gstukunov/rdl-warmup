// Repository interfaces
export type { 
  IGameRepository 
} from './game.repository.interface';
export { GAME_REPOSITORY } from './game.repository.interface';

export type { 
  IGameParticipantRepository 
} from './game-participant.repository.interface';
export { GAME_PARTICIPANT_REPOSITORY } from './game-participant.repository.interface';

export type { 
  ISpeakerScoreRepository 
} from './speaker-score.repository.interface';
export { SPEAKER_SCORE_REPOSITORY } from './speaker-score.repository.interface';

export type { 
  IJudgeFeedbackRepository 
} from './judge-feedback.repository.interface';
export { JUDGE_FEEDBACK_REPOSITORY } from './judge-feedback.repository.interface';

export type {
  IRoomAllocationRepository
} from './room-allocation.repository.interface';
export { ROOM_ALLOCATION_REPOSITORY } from './room-allocation.repository.interface';

// Repository implementations
export { GameRepository } from './game.repository';
export { GameParticipantRepository } from './game-participant.repository';
export { SpeakerScoreRepository } from './speaker-score.repository';
export { JudgeFeedbackRepository } from './judge-feedback.repository';
export { RoomAllocationRepository } from './room-allocation.repository';
