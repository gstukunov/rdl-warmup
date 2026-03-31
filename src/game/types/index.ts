/**
 * Room allocation types
 */

export interface AllocatedPlayer {
  telegramId: number;
  username: string | null;
  firstName: string | null;
  isIronman: boolean;
}

export interface AllocatedJudge {
  telegramId: number;
  username: string | null;
  firstName: string | null;
}

export interface AllocatedRoom {
  roomNumber: number;
  openingGovernment: AllocatedPlayer[];
  openingOpposition: AllocatedPlayer[];
  closingGovernment: AllocatedPlayer[];
  closingOpposition: AllocatedPlayer[];
  judges: AllocatedJudge[];
  wings: AllocatedJudge[];
}
