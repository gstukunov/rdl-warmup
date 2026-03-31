// Domain Events
export { DomainEvent, isDomainEvent } from './domain-event';
export { GameCreatedEvent } from './game-created.event';
export { GameAllocatedEvent } from './game-allocated.event';
export { GameStartedEvent } from './game-started.event';
export { GameCompletedEvent } from './game-completed.event';
export { UserRegisteredEvent } from './user-registered.event';
export { ScoresSubmittedEvent } from './scores-submitted.event';

// Types
export type { AllocatedRoom, AllocatedPlayer } from './game-allocated.event';
export type { PlayerResult } from './game-completed.event';
export type { PositionScore } from './scores-submitted.event';
