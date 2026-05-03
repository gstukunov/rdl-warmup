import { apiClient } from '@/shared/api';
import type { GameDetails } from '@/entities/game';
import type {
  UserOption,
  CompletedGame,
  SubmitGameResultsRequest,
  CreateCompletedGameRequest,
} from '../model';
import { ADMIN_TOKEN_KEY } from '../model/constants';

const dispatchSessionExpired = () => {
  window.dispatchEvent(new CustomEvent('admin:session-expired'));
};

const withAuth = async <T>(fn: () => Promise<T>): Promise<T> => {
  try {
    return await fn();
  } catch (error: any) {
    if (error.response?.status === 401) {
      localStorage.removeItem(ADMIN_TOKEN_KEY);
      dispatchSessionExpired();
    }
    throw error;
  }
};

export const adminApi = {
  // Store admin token
  setToken: (token: string) => {
    localStorage.setItem(ADMIN_TOKEN_KEY, token);
  },

  // Get stored admin token
  getToken: (): string | null => {
    return localStorage.getItem(ADMIN_TOKEN_KEY);
  },

  // Clear admin token
  clearToken: () => {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
  },

  // Check if user is authenticated as admin
  isAuthenticated: (): boolean => {
    return !!localStorage.getItem(ADMIN_TOKEN_KEY);
  },

  // Login as admin
  login: async (password: string): Promise<string> => {
    const response = await apiClient.post<{ token: string }>('/admin/login', { password });
    adminApi.setToken(response.token);
    return response.token;
  },

  // Get all users (for speaker/judge selection)
  getUsers: async (): Promise<UserOption[]> => {
    const token = adminApi.getToken();
    return withAuth(() =>
      apiClient.get<UserOption[]>('/admin/users', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }),
    );
  },

  // Get completed games list
  getCompletedGames: async (): Promise<CompletedGame[]> => {
    const token = adminApi.getToken();
    return withAuth(() =>
      apiClient.get<CompletedGame[]>('/admin/games/completed', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }),
    );
  },

  // Get game details for admin
  getGameDetails: async (gameId: string): Promise<GameDetails> => {
    const token = adminApi.getToken();
    return withAuth(() =>
      apiClient.get<GameDetails>(`/admin/games/${gameId}/details`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }),
    );
  },

  // Submit game results
  submitGameResults: async (data: SubmitGameResultsRequest): Promise<void> => {
    const token = adminApi.getToken();
    return withAuth(() =>
      apiClient.post<void>('/admin/games/results', data, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }),
    );
  },

  // Create a new completed game with results
  createCompletedGame: async (data: CreateCompletedGameRequest): Promise<{ gameId: string }> => {
    const token = adminApi.getToken();
    return withAuth(() =>
      apiClient.post<{ gameId: string }>('/admin/games/completed', data, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }),
    );
  },
};
