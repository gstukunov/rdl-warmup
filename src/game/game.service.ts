import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Game, GameStatus } from './entities/game.entity';
import { GameParticipant, ParticipantRole, ParticipantPosition } from './entities/game-participant.entity';
import { CreateGameDto } from './dto/create-game.dto';

@Injectable()
export class GameService {
  constructor(
    @InjectRepository(Game)
    private readonly gameRepository: Repository<Game>,
    @InjectRepository(GameParticipant)
    private readonly participantRepository: Repository<GameParticipant>,
  ) {}

  // Create a new game (creator is NOT auto-registered)
  async createGame(createGameDto: CreateGameDto, creatorTelegramId: number): Promise<Game> {
    const game = this.gameRepository.create({
      name: createGameDto.name,
      description: createGameDto.description || null,
      status: GameStatus.REGISTRATION,
      settings: {
        createdByTelegramId: creatorTelegramId,
        maxParticipants: createGameDto.maxParticipants || 8,
      },
    });

    return this.gameRepository.save(game);
  }

  // Get all games that are in registration status
  async getOpenGames(): Promise<Game[]> {
    return this.gameRepository.find({
      where: { status: GameStatus.REGISTRATION },
      relations: ['participants'],
      order: { createdAt: 'DESC' },
    });
  }

  // Get game by ID
  async getGameById(id: string): Promise<Game | null> {
    return this.gameRepository.findOne({
      where: { id },
      relations: ['participants'],
    });
  }

  // Register user for a game
  async registerForGame(
    gameId: string,
    telegramId: number,
    username: string | null,
    firstName: string | null,
    role: ParticipantRole,
  ): Promise<GameParticipant> {
    const game = await this.getGameById(gameId);

    if (!game) {
      throw new NotFoundException('Игра не найдена');
    }

    if (game.status !== GameStatus.REGISTRATION) {
      throw new ForbiddenException('Регистрация на эту игру закрыта');
    }

    // Check if user is already registered (by telegram_id)
    const existingParticipant = await this.participantRepository.findOne({
      where: { gameId, telegramId },
    });

    if (existingParticipant) {
      throw new ConflictException('Вы уже зарегистрированы в этой игре');
    }

    // Check if game is full (only count players, not judges)
    if (role === ParticipantRole.PLAYER) {
      const playerCount = await this.participantRepository.count({
        where: { gameId, role: ParticipantRole.PLAYER },
      });

      if (playerCount >= game.maxParticipants) {
        throw new ForbiddenException('В игре нет свободных мест');
      }
    }

    const participant = this.participantRepository.create({
      gameId,
      telegramId,
      username,
      firstName,
      role,
      position: ParticipantPosition.NONE,
      isRegistered: true,
    });

    return this.participantRepository.save(participant);
  }

  // Check if user is registered for a game
  async isUserRegistered(gameId: string, telegramId: number): Promise<boolean> {
    const participant = await this.participantRepository.findOne({
      where: { gameId, telegramId },
    });

    return !!participant;
  }

  // Get user's active game (game they are registered for that is not completed)
  async getUserActiveGame(telegramId: number): Promise<Game | null> {
    const participant = await this.participantRepository.findOne({
      where: { telegramId },
      relations: ['game'],
    });

    if (!participant) {
      return null;
    }

    // Only return if game is not completed or cancelled
    if (
      participant.game.status === GameStatus.COMPLETED ||
      participant.game.status === GameStatus.CANCELLED
    ) {
      return null;
    }

    return participant.game;
  }

  // Start a game (change status to in_progress)
  async startGame(gameId: string, telegramId: number): Promise<Game> {
    const game = await this.getGameById(gameId);

    if (!game) {
      throw new NotFoundException('Игра не найдена');
    }

    if (game.createdByTelegramId !== telegramId) {
      throw new ForbiddenException('Только создатель может начать игру');
    }

    if (game.status !== GameStatus.REGISTRATION) {
      throw new ForbiddenException('Игру нельзя начать');
    }

    game.status = GameStatus.IN_PROGRESS;
    game.startTime = new Date();

    return this.gameRepository.save(game);
  }
}
