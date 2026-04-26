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

export interface GameParticipationUser {
  telegramId: number;
  firstName: string;
  lastName: string | null;
}

export interface GameParticipation {
  gameId: string;
  gameName: string;
  participants: GameParticipationUser[];
}

export interface StatsResponse {
  speakers: SpeakerStat[];
  judges: JudgeStat[];
}
