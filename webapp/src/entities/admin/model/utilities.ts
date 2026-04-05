import type {
  UserOption,
  PositionResult,
  PositionResultsRecord,
  CreateCompletedGameRequest,
  ValidationResult,
  PositionConfig,
} from './types';
import {
  DEFAULT_POSITION_RESULT,
  VALIDATION_MESSAGES,
  RESULTS_POSITION_CONFIG,
} from './constants';

/**
 * Format user display name for dropdown/options from UserOption
 */
export const formatUserOptionDisplayName = (user: UserOption): string => {
  let name = user.firstName;
  if (user.lastName) {
    name += ` ${user.lastName}`;
  }
  if (user.username) {
    name += ` (@${user.username})`;
  }
  return name;
};

/**
 * Create a default empty position result
 */
export const createDefaultPosition = (): PositionResult => ({
  ...DEFAULT_POSITION_RESULT,
});

/**
 * Create default position results for all positions
 */
export const createDefaultPositionResults = (): PositionResultsRecord => ({
  openingGovernment: createDefaultPosition(),
  openingOpposition: createDefaultPosition(),
  closingGovernment: createDefaultPosition(),
  closingOpposition: createDefaultPosition(),
});

/**
 * Update position result with ironman toggle
 */
export const updatePositionIronman = (
  current: PositionResult,
  isIronman: boolean
): PositionResult => ({
  ...current,
  isIronman,
  speaker1:
    isIronman && current.speaker1.telegramId
      ? current.speaker1
      : current.speaker1,
});

/**
 * Update speaker in position result
 */
export const updatePositionSpeaker = (
  current: PositionResult,
  speaker: 'speaker1' | 'speaker2',
  field: 'telegramId' | 'score',
  value: number | null
): PositionResult => {
  const isIronman = current.isIronman;

  // If ironman and changing speaker1 telegramId, also update speaker2
  if (isIronman && speaker === 'speaker1' && field === 'telegramId') {
    return {
      ...current,
      speaker1: { ...current.speaker1, telegramId: value },
      speaker2: { ...current.speaker2, telegramId: value },
    };
  }

  return {
    ...current,
    [speaker]: {
      ...current[speaker],
      [field]: value,
    },
  };
};

/**
 * Check if a position has both speakers selected
 */
export const isPositionComplete = (position: PositionResult): boolean => {
  if (!position.speaker1.telegramId) return false;
  if (position.isIronman) return true;
  return !!position.speaker2.telegramId;
};

/**
 * Check if a position has any speakers selected (for optional positions)
 */
export const isPositionPartiallyFilled = (position: PositionResult): boolean => {
  return !!position.speaker1.telegramId;
};

/**
 * Validate form data for creating a completed game
 */
export const validateGameResultsForm = (
  gameName: string,
  motion: string,
  judgeId: number | null,
  positions: PositionResultsRecord
): ValidationResult => {
  if (!gameName.trim()) {
    return { isValid: false, error: VALIDATION_MESSAGES.GAME_NAME_REQUIRED };
  }

  if (!motion.trim()) {
    return { isValid: false, error: VALIDATION_MESSAGES.MOTION_REQUIRED };
  }

  if (judgeId === null) {
    return { isValid: false, error: VALIDATION_MESSAGES.JUDGE_REQUIRED };
  }

  const og = positions.openingGovernment;
  const oo = positions.openingOpposition;

  if (!isPositionComplete(og)) {
    return {
      isValid: false,
      error: VALIDATION_MESSAGES.OPENING_GOVERNMENT_SPEAKERS,
    };
  }

  if (!isPositionComplete(oo)) {
    return {
      isValid: false,
      error: VALIDATION_MESSAGES.OPENING_OPPOSITION_SPEAKERS,
    };
  }

  return { isValid: true, error: null };
};

/**
 * Build CreateCompletedGameRequest from form data
 */
export const buildCreateGameRequest = (
  gameName: string,
  motion: string,
  judgeTelegramId: number,
  positions: PositionResultsRecord
): CreateCompletedGameRequest => {
  const data: CreateCompletedGameRequest = {
    gameName: gameName.trim(),
    motion: motion.trim(),
    openingGovernment: positions.openingGovernment,
    openingOpposition: positions.openingOpposition,
    judgeTelegramId,
  };

  // Add optional positions if complete
  if (isPositionComplete(positions.closingGovernment)) {
    data.closingGovernment = positions.closingGovernment;
  }

  if (isPositionComplete(positions.closingOpposition)) {
    data.closingOpposition = positions.closingOpposition;
  }

  return data;
};

/**
 * Get position config by key
 */
export const getPositionConfig = (
  key: keyof PositionResultsRecord
): PositionConfig | undefined => {
  return RESULTS_POSITION_CONFIG.find((p) => p.key === key);
};
