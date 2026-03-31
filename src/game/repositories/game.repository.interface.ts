import { Game } from '../entities/game.entity';
import { GameStatus } from '../entities/game.entity';

export interface IGameRepository {
  findById(id: string, relations?: string[]): Promise<Game | null>;
  findByStatus(status: GameStatus): Promise<Game[]>;
  findOpenGames(): Promise<Game[]>;
  findActiveGamesForUser(telegramId: number): Promise<Game[]>;
  create(gameData: Partial<Game>): Promise<Game>;
  save(game: Game): Promise<Game>;
  update(gameId: string, gameData: Partial<Game>): Promise<void>;
  delete(gameId: string): Promise<void>;
  exists(gameId: string): Promise<boolean>;
}

export const GAME_REPOSITORY = Symbol('GAME_REPOSITORY');
