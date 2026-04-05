import type { PositionConfig } from './types';

// Position configuration for game results form
export const RESULTS_POSITION_CONFIG: PositionConfig[] = [
  {
    key: 'openingGovernment',
    label: 'Opening Government (OG)',
    required: true,
  },
  {
    key: 'openingOpposition',
    label: 'Opening Opposition (OO)',
    required: true,
  },
  {
    key: 'closingGovernment',
    label: 'Closing Government (CG)',
    required: false,
  },
  {
    key: 'closingOpposition',
    label: 'Closing Opposition (CO)',
    required: false,
  },
];

// Default empty position result
export const DEFAULT_POSITION_RESULT = {
  speaker1: { telegramId: null, score: 70 },
  speaker2: { telegramId: null, score: 70 },
  isIronman: false,
};

// Default position results for all positions
export const DEFAULT_POSITION_RESULTS = {
  openingGovernment: { ...DEFAULT_POSITION_RESULT },
  openingOpposition: { ...DEFAULT_POSITION_RESULT },
  closingGovernment: { ...DEFAULT_POSITION_RESULT },
  closingOpposition: { ...DEFAULT_POSITION_RESULT },
};

// Score input constraints
export const SCORE_CONSTRAINTS = {
  min: 0,
  max: 100,
};

// Form validation error messages
export const VALIDATION_MESSAGES = {
  GAME_NAME_REQUIRED: 'Введите название игры',
  MOTION_REQUIRED: 'Введите тему',
  JUDGE_REQUIRED: 'Выберите судью',
  OPENING_GOVERNMENT_SPEAKERS: 'Выберите обоих спикеров для Opening Government',
  OPENING_OPPOSITION_SPEAKERS: 'Выберите обоих спикеров для Opening Opposition',
  SAVE_ERROR: 'Ошибка сохранения результатов',
  SAVE_SUCCESS: 'Игра с результатами успешно создана!',
};

// Admin token storage key
export const ADMIN_TOKEN_KEY = 'admin_token';
