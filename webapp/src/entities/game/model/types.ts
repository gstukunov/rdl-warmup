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
