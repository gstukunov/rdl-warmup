// Telegram User from initData
export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
}

// Game status enum
export enum GameStatus {
  REGISTRATION = 'registration',
  ALLOCATING = 'allocating',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

// Participant roles
export enum ParticipantRole {
  PLAYER = 'player',
  JUDGE = 'judge',
  WING = 'wing',
}

// BP Positions
export enum Position {
  OPENING_GOVERNMENT = 'opening_government',
  OPENING_OPPOSITION = 'opening_opposition',
  CLOSING_GOVERNMENT = 'closing_government',
  CLOSING_OPPOSITION = 'closing_opposition',
  NONE = 'none',
}

// Game entity
export interface Game {
  id: string;
  name: string;
  description: string | null;
  status: GameStatus;
  maxParticipants: number;
  createdByTelegramId: string;
  isAllocated: boolean;
  motion: string | null;
  startTime: string | null;
  endTime: string | null;
  createdAt: string;
  updatedAt: string;
  participantCount: number;
  isUserRegistered?: boolean;
}

// Game Participant
export interface GameParticipant {
  id: string;
  telegramId: string;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  role: ParticipantRole;
  position: Position;
  teamName: string | null;
  isRegistered: boolean;
  registeredAt: string;
}

// Detailed Game info
export interface GameDetails extends Game {
  participants: GameParticipant[];
}

// User Profile
export interface UserProfile {
  user: {
    id: string;
    telegramId: string;
    username: string | null;
    firstName: string | null;
    lastName: string | null;
    isActive: boolean;
    createdAt: string;
  };
  gamesPlayed: number;
  averageSpeakerScore: number;
}

// Judge Stats
export interface JudgeStats {
  averageScore: number;
  totalFeedbacks: number;
}

// Room Allocation
export interface RoomAllocation {
  roomNumber: number;
  openingGovernment: RoomParticipant[];
  openingOpposition: RoomParticipant[];
  closingGovernment: RoomParticipant[];
  closingOpposition: RoomParticipant[];
  judges: RoomJudge[];
  wings: RoomJudge[];
}

export interface RoomParticipant {
  telegramId: string;
  username: string | null;
  firstName: string | null;
  isIronman: boolean;
}

export interface RoomJudge {
  telegramId: string;
  username: string | null;
  firstName: string | null;
  role: 'chair' | 'wing';
}

// API Response wrapper
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// WebApp Config
export interface WebAppConfig {
  botUsername: string;
  apiBaseUrl: string;
  environment: 'development' | 'production';
}

// Admin types
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

export interface PositionResult {
  telegramId: number | null;
  isIronman: boolean;
  score: number;
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

// Stats types
export interface SpeakerStat {
  telegramId: number;
  username: string | null;
  firstName: string;
  lastName: string;
  gamesPlayed: number;
  averageScore: number;
}

export interface JudgeStat {
  telegramId: number;
  username: string | null;
  firstName: string;
  lastName: string;
  gamesJudged: number;
  averageScore: number;
}
