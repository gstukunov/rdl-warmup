export interface UserOption {
  telegramId: number;
  username: string | null;
  firstName: string;
  lastName: string | null;
}

export interface CompletedGame {
  id: string;
  name: string;
  description: string | null;
  motion: string | null;
  startTime: string | null;
  endTime: string | null;
  createdAt: string;
  participantCount: number;
  hasResults: boolean;
}

export interface SpeakerResult {
  telegramId: number | null;
  score: number;
}

export interface PositionResult {
  speaker1: SpeakerResult;
  speaker2: SpeakerResult;
  isIronman: boolean;
}

export interface SubmitGameResultsRequest {
  gameId: string;
  motion: string;
  openingGovernment: PositionResult;
  openingOpposition: PositionResult;
  closingGovernment?: PositionResult;
  closingOpposition?: PositionResult;
  judgeTelegramId: number;
}

export interface CreateCompletedGameRequest {
  gameName: string;
  motion: string;
  openingGovernment: PositionResult;
  openingOpposition: PositionResult;
  closingGovernment?: PositionResult;
  closingOpposition?: PositionResult;
  judgeTelegramId: number;
}
