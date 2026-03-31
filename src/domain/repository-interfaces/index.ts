// Repository interfaces
export type { IUserRepository } from './user.repository';
export { USER_REPOSITORY } from './user.repository';

export type { IGameRepository } from './game.repository';
export { GAME_REPOSITORY } from './game.repository';

// Re-export for convenience
export type { IEventBus, IEventStore, EventHandler } from '../../application/ports/event-bus.port';
export { EVENT_BUS, EVENT_STORE } from '../../application/ports/event-bus.port';
