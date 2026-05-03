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

// Me response
export interface MeResponse {
  isAdmin: boolean;
}
