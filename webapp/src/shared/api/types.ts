// API Response wrapper
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Telegram User from initData
export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
}

// WebApp Config
export interface WebAppConfig {
  botUsername: string;
  apiBaseUrl: string;
  environment: 'development' | 'production';
}
