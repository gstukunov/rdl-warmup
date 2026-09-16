/** Matches the Content-Disposition filename the backend sends. */
export const buildGameVisitsFileName = (date: Date = new Date()): string =>
  `game-visits-${date.toISOString().slice(0, 10)}.xlsx`;
