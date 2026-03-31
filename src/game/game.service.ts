import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Game, GameStatus, RoomAllocation } from './entities/game.entity';
import {
  GameParticipant,
  ParticipantRole,
  ParticipantPosition,
} from './entities/game-participant.entity';
import { SpeakerScore } from './entities/speaker-score.entity';
import { JudgeFeedback } from './entities/judge-feedback.entity';
import { User } from '../telegram/entities/user.entity';
import { CreateGameDto } from './dto/create-game.dto';
import { ParsedScores } from './dto/submit-scores.dto';
import { ImportGameResultDto } from './dto/import-game-result.dto';

export interface AllocatedRoom {
  roomNumber: number;
  openingGovernment: Array<{
    telegramId: number;
    username: string | null;
    firstName: string | null;
    isIronman: boolean;
  }>;
  openingOpposition: Array<{
    telegramId: number;
    username: string | null;
    firstName: string | null;
    isIronman: boolean;
  }>;
  closingGovernment: Array<{
    telegramId: number;
    username: string | null;
    firstName: string | null;
    isIronman: boolean;
  }>;
  closingOpposition: Array<{
    telegramId: number;
    username: string | null;
    firstName: string | null;
    isIronman: boolean;
  }>;
  judges: Array<{
    telegramId: number;
    username: string | null;
    firstName: string | null;
  }>;
  wings: Array<{
    telegramId: number;
    username: string | null;
    firstName: string | null;
  }>;
}

@Injectable()
export class GameService {
  constructor(
    @InjectRepository(Game)
    private readonly gameRepository: Repository<Game>,
    @InjectRepository(GameParticipant)
    private readonly participantRepository: Repository<GameParticipant>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(SpeakerScore)
    private readonly speakerScoreRepository: Repository<SpeakerScore>,
    @InjectRepository(JudgeFeedback)
    private readonly judgeFeedbackRepository: Repository<JudgeFeedback>,
  ) {}

  // Create a new game (creator is NOT auto-registered)
  async createGame(
    createGameDto: CreateGameDto,
    creatorTelegramId: number,
  ): Promise<Game> {
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

  // Get or create user by telegram ID
  async getOrCreateUser(
    telegramId: number,
    username: string | null,
    firstName: string | null,
  ): Promise<User> {
    let user = await this.userRepository.findOne({
      where: { telegramId },
    });

    if (!user) {
      user = this.userRepository.create({
        telegramId,
        username,
        firstName,
        lastName: null,
        gamesPlayed: 0,
        speakerScores: [],
        totalPoints: 0,
      });
      await this.userRepository.save(user);
    }

    return user;
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

    // Check if game is full (only count players, not judges or wings)
    if (role === ParticipantRole.PLAYER) {
      const playerCount = await this.participantRepository.count({
        where: { gameId, role: ParticipantRole.PLAYER },
      });

      if (playerCount >= game.maxParticipants) {
        throw new ForbiddenException('В игре нет свободных мест');
      }
    }

    // Get or create user record
    const user = await this.getOrCreateUser(telegramId, username, firstName);

    const participant = this.participantRepository.create({
      gameId,
      userId: user.id,
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
    // Find the most recent participant record with game relation
    const participants = await this.participantRepository.find({
      where: { telegramId },
      relations: ['game'],
      order: { registeredAt: 'DESC' },
    });

    if (!participants || participants.length === 0) {
      return null;
    }

    // Find first active game (not completed or cancelled)
    for (const participant of participants) {
      if (
        participant.game.status !== GameStatus.COMPLETED &&
        participant.game.status !== GameStatus.CANCELLED
      ) {
        return participant.game;
      }
    }

    return null;
  }

  // Get participants of a game
  async getGameParticipants(gameId: string): Promise<GameParticipant[]> {
    return this.participantRepository.find({
      where: { gameId },
    });
  }

  // Allocate players to positions
  async allocatePlayers(
    gameId: string,
    initiatorTelegramId: number,
  ): Promise<AllocatedRoom[]> {
    const game = await this.getGameById(gameId);

    if (!game) {
      throw new NotFoundException('Игра не найдена');
    }

    // Check if initiator is a participant (compare as numbers to handle type mismatches)
    const initiator = game.participants?.find(
      (p) => Number(p.telegramId) === initiatorTelegramId,
    );

    if (!initiator) {
      throw new ForbiddenException(
        'Только участник может начать распределение',
      );
    }

    // Get all participants
    let players =
      game.participants?.filter(
        (p) => p.role === ParticipantRole.PLAYER && p.telegramId !== null,
      ) || [];
    let judges =
      game.participants?.filter(
        (p) => p.role === ParticipantRole.JUDGE && p.telegramId !== null,
      ) || [];
    let wings =
      game.participants?.filter(
        (p) => p.role === ParticipantRole.WING && p.telegramId !== null,
      ) || [];

    // If we have wings and not enough players for a full room (8 players), convert wings to players
    const initialPlayerCount = players.length;

    // Check if we need to convert wings to players
    // If there are less than 8 players total, we might need wings as players
    if (wings.length > 0 && initialPlayerCount < 8) {
      const playersNeeded = 8 - initialPlayerCount;
      const wingsToConvert = Math.min(wings.length, playersNeeded);
      const convertedWings = wings.slice(0, wingsToConvert);
      wings = wings.slice(wingsToConvert);

      // Update wings to players in database
      for (const wing of convertedWings) {
        if (wing.id) {
          await this.participantRepository.update(
            { id: wing.id },
            { role: ParticipantRole.PLAYER },
          );
          wing.role = ParticipantRole.PLAYER;
        }
      }

      // Add converted wings to players list
      players = [...players, ...convertedWings];
    }

    if (players.length < 2) {
      throw new BadRequestException(
        'Недостаточно игроков для начала игры (минимум 2)',
      );
    }

    // Shuffle players randomly
    players = this.shuffleArray([...players]);

    // Calculate number of complete rooms (8 players = 1 room)
    const playersAfterConversion = players.length;
    const fullRoomsCount = Math.floor(playersAfterConversion / 8);
    const remainingPlayers = playersAfterConversion % 8;

    const rooms: AllocatedRoom[] = [];
    let playerIndex = 0;

    // Create full rooms
    for (let roomNum = 1; roomNum <= fullRoomsCount; roomNum++) {
      const roomPlayers = players.slice(playerIndex, playerIndex + 8);
      playerIndex += 8;

      const room = this.allocateRoom(roomNum, roomPlayers, []);
      rooms.push(room);
    }

    // Handle remaining players
    if (remainingPlayers > 0) {
      const remainingRoomPlayers = players.slice(playerIndex);

      // If we have remaining players, we might need to convert wings or judges to fill the room
      const minPlayersForShortGame = 4; // Minimum for Opening Gov + Opening Opp

      if (remainingPlayers >= minPlayersForShortGame) {
        // Can make a short game with just opening positions
        const room = this.allocateShortRoom(
          fullRoomsCount + 1,
          remainingRoomPlayers,
          judges,
        );
        rooms.push(room);
      } else if (
        wings.length > 0 &&
        remainingPlayers + wings.length >= minPlayersForShortGame
      ) {
        // Convert wings to players to fill the room (wings are converted before judges)
        const wingsNeeded = minPlayersForShortGame - remainingPlayers;
        const convertedWings = wings.slice(0, wingsNeeded);
        wings = wings.slice(wingsNeeded);

        // Update wings to players in database
        for (const wing of convertedWings) {
          if (wing.id) {
            await this.participantRepository.update(
              { id: wing.id },
              { role: ParticipantRole.PLAYER },
            );
            wing.role = ParticipantRole.PLAYER;
          }
        }

        const allPlayers = [...remainingRoomPlayers, ...convertedWings];
        const room = this.allocateShortRoom(
          fullRoomsCount + 1,
          allPlayers,
          judges,
        );
        rooms.push(room);
      } else if (
        judges.length > 0 &&
        remainingPlayers + judges.length >= minPlayersForShortGame
      ) {
        // Convert judges to players to fill the room
        const judgesNeeded = minPlayersForShortGame - remainingPlayers;
        const convertedJudges = judges.slice(0, judgesNeeded);
        judges = judges.slice(judgesNeeded);

        // Update judges to players in database
        for (const judge of convertedJudges) {
          if (judge.id) {
            await this.participantRepository.update(
              { id: judge.id },
              { role: ParticipantRole.PLAYER },
            );
            judge.role = ParticipantRole.PLAYER;
          }
        }

        const allPlayers = [...remainingRoomPlayers, ...convertedJudges];
        const room = this.allocateShortRoom(
          fullRoomsCount + 1,
          allPlayers,
          judges,
        );
        rooms.push(room);
      } else if (remainingPlayers >= 2) {
        // Not enough for a proper game but create a partial room with ironman
        const room = this.allocateShortRoomWithIronman(
          fullRoomsCount + 1,
          remainingRoomPlayers,
          judges,
        );
        rooms.push(room);
      }
    }

    // Distribute remaining judges and wings across rooms
    this.distributeJudges(rooms, judges);
    this.distributeWings(rooms, wings);

    // Save allocations to database
    await this.saveAllocations(gameId, rooms);

    return rooms;
  }

  private allocateRoom(
    roomNumber: number,
    players: GameParticipant[],
    judges: GameParticipant[],
    wings: GameParticipant[] = [],
  ): AllocatedRoom {
    // 2 players per position
    const room: AllocatedRoom = {
      roomNumber,
      openingGovernment: [],
      openingOpposition: [],
      closingGovernment: [],
      closingOpposition: [],
      judges: [],
      wings: [],
    };

    if (players.length >= 2 && players[0].telegramId && players[1].telegramId) {
      room.openingGovernment.push(
        {
          telegramId: players[0].telegramId,
          username: players[0].username,
          firstName: players[0].firstName,
          isIronman: false,
        },
        {
          telegramId: players[1].telegramId,
          username: players[1].username,
          firstName: players[1].firstName,
          isIronman: false,
        },
      );
    }

    if (players.length >= 4 && players[2].telegramId && players[3].telegramId) {
      room.openingOpposition.push(
        {
          telegramId: players[2].telegramId,
          username: players[2].username,
          firstName: players[2].firstName,
          isIronman: false,
        },
        {
          telegramId: players[3].telegramId,
          username: players[3].username,
          firstName: players[3].firstName,
          isIronman: false,
        },
      );
    }

    if (players.length >= 6 && players[4].telegramId && players[5].telegramId) {
      room.closingGovernment.push(
        {
          telegramId: players[4].telegramId,
          username: players[4].username,
          firstName: players[4].firstName,
          isIronman: false,
        },
        {
          telegramId: players[5].telegramId,
          username: players[5].username,
          firstName: players[5].firstName,
          isIronman: false,
        },
      );
    }

    if (players.length >= 8 && players[6].telegramId && players[7].telegramId) {
      room.closingOpposition.push(
        {
          telegramId: players[6].telegramId,
          username: players[6].username,
          firstName: players[6].firstName,
          isIronman: false,
        },
        {
          telegramId: players[7].telegramId,
          username: players[7].username,
          firstName: players[7].firstName,
          isIronman: false,
        },
      );
    }

    return room;
  }

  private allocateShortRoom(
    roomNumber: number,
    players: GameParticipant[],
    judges: GameParticipant[],
    wings: GameParticipant[] = [],
  ): AllocatedRoom {
    // Only Opening Government and Opening Opposition (4 players minimum)
    const room: AllocatedRoom = {
      roomNumber,
      openingGovernment: [],
      openingOpposition: [],
      closingGovernment: [],
      closingOpposition: [],
      judges: [], // Judges will be added by distributeJudges
      wings: [], // Wings will be added by distributeWings
    };

    if (players.length >= 2 && players[0].telegramId && players[1].telegramId) {
      room.openingGovernment.push(
        {
          telegramId: players[0].telegramId,
          username: players[0].username,
          firstName: players[0].firstName,
          isIronman: false,
        },
        {
          telegramId: players[1].telegramId,
          username: players[1].username,
          firstName: players[1].firstName,
          isIronman: false,
        },
      );
    }

    if (players.length >= 4 && players[2].telegramId && players[3].telegramId) {
      room.openingOpposition.push(
        {
          telegramId: players[2].telegramId,
          username: players[2].username,
          firstName: players[2].firstName,
          isIronman: false,
        },
        {
          telegramId: players[3].telegramId,
          username: players[3].username,
          firstName: players[3].firstName,
          isIronman: false,
        },
      );
    }

    // If we have 5-7 players, add remaining to positions with ironman
    if (players.length > 4) {
      const remaining = players.slice(4);
      for (let i = 0; i < remaining.length; i++) {
        const player = remaining[i];
        if (!player.telegramId) continue;

        if (i === 0) {
          room.closingGovernment.push({
            telegramId: player.telegramId,
            username: player.username,
            firstName: player.firstName,
            isIronman: true,
          });
        } else if (i === 1) {
          room.closingOpposition.push({
            telegramId: player.telegramId,
            username: player.username,
            firstName: player.firstName,
            isIronman: true,
          });
        }
      }
    }

    return room;
  }

  private allocateShortRoomWithIronman(
    roomNumber: number,
    players: GameParticipant[],
    judges: GameParticipant[],
    wings: GameParticipant[] = [],
  ): AllocatedRoom {
    // Create a short game with ironman positions
    const room: AllocatedRoom = {
      roomNumber,
      openingGovernment: [],
      openingOpposition: [],
      closingGovernment: [],
      closingOpposition: [],
      judges: [], // Judges will be added by distributeJudges
      wings: [], // Wings will be added by distributeWings
    };

    // Distribute players across positions with ironman
    for (let i = 0; i < players.length; i++) {
      const player = players[i];
      if (!player.telegramId) continue;

      const playerData = {
        telegramId: player.telegramId,
        username: player.username,
        firstName: player.firstName,
        isIronman: false,
      };

      if (i === 0) {
        room.openingGovernment.push(playerData);
      } else if (i === 1) {
        room.openingOpposition.push(playerData);
      } else if (i === 2) {
        room.openingGovernment.push({ ...playerData, isIronman: true });
      } else if (i === 3) {
        room.openingOpposition.push({ ...playerData, isIronman: true });
      }
    }

    return room;
  }

  private distributeJudges(
    rooms: AllocatedRoom[],
    judges: GameParticipant[],
  ): void {
    // Distribute judges evenly across rooms
    let judgeIndex = 0;
    const validJudges = judges.filter((j) => j.telegramId !== null);

    while (judgeIndex < validJudges.length) {
      for (const room of rooms) {
        if (judgeIndex < validJudges.length) {
          const judge = validJudges[judgeIndex];
          room.judges.push({
            telegramId: judge.telegramId!,
            username: judge.username,
            firstName: judge.firstName,
          });
          judgeIndex++;
        }
      }
    }
  }

  private distributeWings(
    rooms: AllocatedRoom[],
    wings: GameParticipant[],
  ): void {
    // Distribute wings evenly across rooms (similar to judges, but wings don't have judging powers)
    let wingIndex = 0;
    const validWings = wings.filter((w) => w.telegramId !== null);

    while (wingIndex < validWings.length) {
      for (const room of rooms) {
        if (wingIndex < validWings.length) {
          const wing = validWings[wingIndex];
          room.wings.push({
            telegramId: wing.telegramId!,
            username: wing.username,
            firstName: wing.firstName,
          });
          wingIndex++;
        }
      }
    }
  }

  private async saveAllocations(
    gameId: string,
    rooms: AllocatedRoom[],
  ): Promise<void> {
    // Update participant positions in database
    for (const room of rooms) {
      for (const pos of room.openingGovernment) {
        await this.participantRepository.update(
          { gameId, telegramId: pos.telegramId },
          { position: ParticipantPosition.OPENING_GOVERNMENT },
        );
      }
      for (const pos of room.openingOpposition) {
        await this.participantRepository.update(
          { gameId, telegramId: pos.telegramId },
          { position: ParticipantPosition.OPENING_OPPOSITION },
        );
      }
      for (const pos of room.closingGovernment) {
        await this.participantRepository.update(
          { gameId, telegramId: pos.telegramId },
          { position: ParticipantPosition.CLOSING_GOVERNMENT },
        );
      }
      for (const pos of room.closingOpposition) {
        await this.participantRepository.update(
          { gameId, telegramId: pos.telegramId },
          { position: ParticipantPosition.CLOSING_OPPOSITION },
        );
      }
    }

    // Save room allocations to game settings
    const allocations: RoomAllocation[] = rooms.map((room) => ({
      roomNumber: room.roomNumber,
      participants: [
        ...room.openingGovernment.map((p) => ({
          telegramId: p.telegramId,
          position: 'OG',
          isIronman: p.isIronman,
        })),
        ...room.openingOpposition.map((p) => ({
          telegramId: p.telegramId,
          position: 'OO',
          isIronman: p.isIronman,
        })),
        ...room.closingGovernment.map((p) => ({
          telegramId: p.telegramId,
          position: 'CG',
          isIronman: p.isIronman,
        })),
        ...room.closingOpposition.map((p) => ({
          telegramId: p.telegramId,
          position: 'CO',
          isIronman: p.isIronman,
        })),
      ],
      judges: room.judges.map((j) => ({ telegramId: j.telegramId })),
      wings: room.wings.map((w) => ({ telegramId: w.telegramId })),
    }));

    // Use query builder for safer JSONB update
    const newSettings = JSON.stringify({
      roomAllocations: allocations,
      isAllocated: true,
    });

    await this.gameRepository
      .createQueryBuilder()
      .update(Game)
      .set({
        settings: () => `settings || :newSettings::jsonb`,
        status: GameStatus.ALLOCATING,
      })
      .setParameter('newSettings', newSettings)
      .where('id = :gameId', { gameId })
      .execute();
  }

  // Set motion and start the game
  async setMotionAndStart(
    gameId: string,
    motion: string,
    telegramId: number,
  ): Promise<Game> {
    // Get fresh game data with participants
    const game = await this.gameRepository.findOne({
      where: { id: gameId },
      relations: ['participants'],
    });

    if (!game) {
      throw new NotFoundException('Игра не найдена');
    }

    console.log(`[setMotionAndStart] Game: ${gameId}, User: ${telegramId}`);
    console.log(
      `[setMotionAndStart] Participants:`,
      JSON.stringify(
        game.participants?.map((p) => ({
          id: p.id,
          telegramId: p.telegramId,
          role: p.role,
        })),
      ),
    );

    // Check if user is a judge in this game
    const participant = game.participants?.find(
      (p) => Number(p.telegramId) === telegramId,
    );
    console.log(`[setMotionAndStart] Found participant:`, participant);

    if (!participant || participant.role !== ParticipantRole.JUDGE) {
      throw new ForbiddenException('Только судья может установить тему');
    }

    if (game.status !== GameStatus.ALLOCATING) {
      throw new ForbiddenException('Игра не готова к старту');
    }

    game.motion = motion;
    game.status = GameStatus.IN_PROGRESS;
    game.startTime = new Date();

    return this.gameRepository.save(game);
  }

  // Parse scores from format "75/78"
  parseScores(scoreString: string): ParsedScores {
    const parts = scoreString.split('/');
    if (parts.length !== 2) {
      throw new BadRequestException(
        'Invalid score format. Use "score1/score2"',
      );
    }
    const score1 = parseInt(parts[0].trim(), 10);
    const score2 = parseInt(parts[1].trim(), 10);

    if (isNaN(score1) || isNaN(score2)) {
      throw new BadRequestException('Scores must be numbers');
    }

    if (score1 < 0 || score1 > 100 || score2 < 0 || score2 > 100) {
      throw new BadRequestException('Scores must be between 0 and 100');
    }

    return { position: '', score1, score2 };
  }

  // Submit speaker scores for a game
  async submitScores(
    gameId: string,
    judgeTelegramId: number,
    openingGovernment?: string,
    openingOpposition?: string,
    closingGovernment?: string,
    closingOpposition?: string,
  ): Promise<void> {
    const game = await this.getGameById(gameId);

    if (!game) {
      throw new NotFoundException('Игра не найдена');
    }

    // Check if user is a judge in this game
    const judgeParticipant = game.participants?.find(
      (p) => Number(p.telegramId) === judgeTelegramId,
    );
    if (!judgeParticipant || judgeParticipant.role !== ParticipantRole.JUDGE) {
      throw new ForbiddenException('Только судья может вводить оценки');
    }

    if (
      game.status !== GameStatus.IN_PROGRESS &&
      game.status !== GameStatus.ALLOCATING
    ) {
      throw new ForbiddenException('Игра не активна');
    }

    // Check if judge already submitted scores
    const existingScores = await this.speakerScoreRepository.findOne({
      where: { gameId, judgeTelegramId },
    });

    if (existingScores) {
      throw new ConflictException('Вы уже ввели оценки для этой игры');
    }

    // Get room allocation to know which players are in which position
    const roomAllocations = game.roomAllocations;
    if (!roomAllocations || roomAllocations.length === 0) {
      throw new BadRequestException('Распределение не выполнено');
    }

    // Find the room where this judge is assigned
    const judgeRoom =
      roomAllocations.find((room) =>
        room.participants.some((p) => Number(p.telegramId) === judgeTelegramId),
      ) || roomAllocations[0]; // If judge not in any room, use first room

    // Check which positions exist in the room
    const hasOpeningGov = judgeRoom.participants.some(
      (p) => p.position === 'OG',
    );
    const hasOpeningOpp = judgeRoom.participants.some(
      (p) => p.position === 'OO',
    );
    const hasClosingGov = judgeRoom.participants.some(
      (p) => p.position === 'CG',
    );
    const hasClosingOpp = judgeRoom.participants.some(
      (p) => p.position === 'CO',
    );

    // Save scores only for positions that exist
    if (hasOpeningGov && openingGovernment) {
      const ogScores = this.parseScores(openingGovernment);
      await this.savePositionScores(
        gameId,
        judgeTelegramId,
        'opening_government',
        ogScores,
        judgeRoom,
      );
    }
    if (hasOpeningOpp && openingOpposition) {
      const ooScores = this.parseScores(openingOpposition);
      await this.savePositionScores(
        gameId,
        judgeTelegramId,
        'opening_opposition',
        ooScores,
        judgeRoom,
      );
    }
    if (hasClosingGov && closingGovernment) {
      const cgScores = this.parseScores(closingGovernment);
      await this.savePositionScores(
        gameId,
        judgeTelegramId,
        'closing_government',
        cgScores,
        judgeRoom,
      );
    }
    if (hasClosingOpp && closingOpposition) {
      const coScores = this.parseScores(closingOpposition);
      await this.savePositionScores(
        gameId,
        judgeTelegramId,
        'closing_opposition',
        coScores,
        judgeRoom,
      );
    }

    // Update user stats
    await this.updateUserStats(gameId, judgeRoom);
  }

  private async savePositionScores(
    gameId: string,
    judgeTelegramId: number,
    position: string,
    scores: ParsedScores,
    room: {
      roomNumber: number;
      participants: Array<{
        telegramId: number;
        position: string;
        isIronman: boolean;
      }>;
    },
  ): Promise<void> {
    // Find players in this position
    const positionAbbrev =
      position === 'opening_government'
        ? 'OG'
        : position === 'opening_opposition'
          ? 'OO'
          : position === 'closing_government'
            ? 'CG'
            : 'CO';

    const playersInPosition = room.participants.filter(
      (p) => p.position === positionAbbrev,
    );

    if (playersInPosition.length === 0) {
      return; // No players in this position
    }

    // Check if ironman (only 1 player in position)
    // Using loose equality (==) because isIronman can be string from JSONB
    const isIronman =
      playersInPosition.length === 1 && playersInPosition[0].isIronman == true;

    // For ironman: save only the highest score
    // For normal team: save both scores
    if (isIronman) {
      const highestScore = Math.max(scores.score1, scores.score2);
      const player = playersInPosition[0];

      await this.speakerScoreRepository.save({
        gameId,
        telegramId: player.telegramId,
        position,
        score: highestScore,
        isIronman: true,
        judgeTelegramId,
      });
    } else {
      // Normal team - save both scores
      for (let i = 0; i < playersInPosition.length; i++) {
        const player = playersInPosition[i];
        const score = i === 0 ? scores.score1 : scores.score2;

        await this.speakerScoreRepository.save({
          gameId,
          telegramId: player.telegramId,
          position,
          score,
          isIronman: false,
          judgeTelegramId,
        });
      }
    }
  }

  private async updateUserStats(
    gameId: string,
    room: { participants: Array<{ telegramId: number }> },
  ): Promise<void> {
    // Get all scores for this game
    const scores = await this.speakerScoreRepository.find({
      where: { gameId },
    });

    // Group scores by player
    const playerScores = new Map<number, number[]>();
    for (const score of scores) {
      if (!playerScores.has(score.telegramId)) {
        playerScores.set(score.telegramId, []);
      }
      playerScores.get(score.telegramId)!.push(score.score);
    }

    // Update each user's stats
    for (const [telegramId, userScores] of playerScores) {
      const user = await this.userRepository.findOne({
        where: { telegramId },
      });

      if (user) {
        // Calculate average score from all judges
        const avgScore =
          userScores.reduce((a, b) => a + b, 0) / userScores.length;

        // Update user's speaker scores and games played
        user.speakerScores = [...(user.speakerScores || []), avgScore];
        user.gamesPlayed += 1;

        await this.userRepository.save(user);
      }
    }
  }

  // Check if judge has already submitted scores
  async hasJudgeSubmittedScores(
    gameId: string,
    judgeTelegramId: number,
  ): Promise<boolean> {
    const existingScore = await this.speakerScoreRepository.findOne({
      where: { gameId, judgeTelegramId },
    });
    return !!existingScore;
  }

  // Get scores for a game
  async getGameScores(gameId: string): Promise<SpeakerScore[]> {
    return this.speakerScoreRepository.find({
      where: { gameId },
      order: { submittedAt: 'DESC' },
    });
  }

  // Complete the game
  async completeGame(gameId: string, telegramId: number): Promise<Game> {
    const game = await this.getGameById(gameId);

    if (!game) {
      throw new NotFoundException('Игра не найдена');
    }

    // Check if user is a judge
    const participant = game.participants?.find(
      (p) => Number(p.telegramId) === telegramId,
    );
    if (!participant || participant.role !== ParticipantRole.JUDGE) {
      throw new ForbiddenException('Только судья может завершить игру');
    }

    if (game.status !== GameStatus.IN_PROGRESS) {
      throw new ForbiddenException('Игра не может быть завершена');
    }

    game.status = GameStatus.COMPLETED;
    game.endTime = new Date();

    return this.gameRepository.save(game);
  }

  // Cancel/decline registration for a game
  async leaveGame(gameId: string, telegramId: number): Promise<void> {
    const game = await this.getGameById(gameId);

    if (!game) {
      throw new NotFoundException('Игра не найдена');
    }

    // Can only leave if game is in registration status
    if (game.status !== GameStatus.REGISTRATION) {
      throw new ForbiddenException(
        'Нельзя покинуть игру после начала регистрации',
      );
    }

    // Check if user is registered
    const participant = await this.participantRepository.findOne({
      where: { gameId, telegramId },
    });

    if (!participant) {
      throw new NotFoundException('Вы не зарегистрированы в этой игре');
    }

    // Remove participant
    await this.participantRepository.remove(participant);
  }

  // Cancel game (organizer only)
  async cancelGame(gameId: string, telegramId: number): Promise<Game> {
    const game = await this.getGameById(gameId);

    if (!game) {
      throw new NotFoundException('Игра не найдена');
    }

    // Check if user is the creator/organizer
    if (game.createdByTelegramId !== telegramId) {
      throw new ForbiddenException('Только организатор может отменить игру');
    }

    // Can only cancel if game is in registration or allocating status
    if (
      game.status !== GameStatus.REGISTRATION &&
      game.status !== GameStatus.ALLOCATING
    ) {
      throw new ForbiddenException('Нельзя отменить игру после её начала');
    }

    game.status = GameStatus.CANCELLED;

    return this.gameRepository.save(game);
  }

  // Shuffle array using Fisher-Yates algorithm
  private shuffleArray<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  // ========== JUDGE FEEDBACK METHODS ==========

  // Submit feedback for a judge
  async submitJudgeFeedback(
    gameId: string,
    playerTelegramId: number,
    judgeTelegramId: number,
    score: number,
    feedback?: string,
  ): Promise<JudgeFeedback> {
    const game = await this.getGameById(gameId);

    if (!game) {
      throw new NotFoundException('Игра не найдена');
    }

    // Only allow feedback for completed games
    if (game.status !== GameStatus.COMPLETED) {
      throw new ForbiddenException(
        'Отзыв можно оставить только после завершения игры',
      );
    }

    // Check if player participated in this game
    const playerParticipant = game.participants?.find(
      (p) =>
        Number(p.telegramId) === playerTelegramId &&
        p.role === ParticipantRole.PLAYER,
    );
    if (!playerParticipant) {
      throw new ForbiddenException('Только участники могут оставлять отзывы');
    }

    // Check if judge was in the same room
    const judgeParticipant = game.participants?.find(
      (p) =>
        Number(p.telegramId) === judgeTelegramId &&
        p.role === ParticipantRole.JUDGE,
    );
    if (!judgeParticipant) {
      throw new NotFoundException('Судья не найден');
    }

    // Check if feedback already exists
    const existingFeedback = await this.judgeFeedbackRepository.findOne({
      where: { gameId, playerTelegramId, judgeTelegramId },
    });

    if (existingFeedback) {
      throw new ConflictException('Вы уже оставили отзыв для этого судьи');
    }

    // Check if they were in the same room
    const roomAllocations = game.roomAllocations;

    if (roomAllocations && roomAllocations.length > 0) {
      // Using loose equality (==) because telegramId can be string from JSONB
      const playerRoom = roomAllocations.find((room) =>
        room.participants.some((p) => p.telegramId == playerTelegramId),
      );
      // Judges are stored separately in the judges array
      // Using loose equality (==) because telegramId can be string from JSONB
      const judgeRoom = roomAllocations.find((room) =>
        room.judges?.some((j) => j.telegramId == judgeTelegramId),
      );

      // Using loose equality (==) because roomNumber can be string from JSONB
      if (
        !playerRoom ||
        !judgeRoom ||
        playerRoom.roomNumber != judgeRoom.roomNumber
      ) {
        throw new ForbiddenException(
          'Вы можете оставить отзыв только на судью из вашей комнаты',
        );
      }
    }

    const judgeFeedback = this.judgeFeedbackRepository.create({
      gameId,
      playerTelegramId,
      judgeTelegramId,
      score,
      feedback: feedback || null,
    });

    return this.judgeFeedbackRepository.save(judgeFeedback);
  }

  // Get judges in the same room as a player
  async getRoomJudges(
    gameId: string,
    playerTelegramId: number,
  ): Promise<
    { telegramId: number; username: string | null; firstName: string | null }[]
  > {
    const game = await this.getGameById(gameId);

    if (!game) {
      throw new NotFoundException('Игра не найдена');
    }

    const roomAllocations = game.roomAllocations;
    if (!roomAllocations || roomAllocations.length === 0) {
      return [];
    }

    // Find player's room
    const playerRoom = roomAllocations.find((room) =>
      room.participants.some((p) => p.telegramId === playerTelegramId),
    );

    if (!playerRoom) {
      return [];
    }

    // Get judge IDs from the room's judges array (judges are stored separately)
    const judgeIds = playerRoom.judges?.map((j) => j.telegramId) || [];

    // Get judge details from participants
    const judges =
      game.participants?.filter(
        (p) =>
          p.role === ParticipantRole.JUDGE &&
          judgeIds.includes(Number(p.telegramId)),
      ) || [];

    return judges.map((j) => ({
      telegramId: Number(j.telegramId),
      username: j.username,
      firstName: j.firstName,
    }));
  }

  // Get judges that player hasn't rated yet
  async getUnratedJudges(
    gameId: string,
    playerTelegramId: number,
  ): Promise<
    { telegramId: number; username: string | null; firstName: string | null }[]
  > {
    const allJudges = await this.getRoomJudges(gameId, playerTelegramId);

    // Get already rated judges
    const ratedFeedbacks = await this.judgeFeedbackRepository.find({
      where: { gameId, playerTelegramId },
    });

    const ratedJudgeIds = new Set(ratedFeedbacks.map((f) => f.judgeTelegramId));

    // Filter out rated judges
    return allJudges.filter((j) => !ratedJudgeIds.has(j.telegramId));
  }

  // Check if player has already rated a specific judge
  async hasPlayerRatedJudge(
    gameId: string,
    playerTelegramId: number,
    judgeTelegramId: number,
  ): Promise<boolean> {
    const feedback = await this.judgeFeedbackRepository.findOne({
      where: { gameId, playerTelegramId, judgeTelegramId },
    });
    return !!feedback;
  }

  // Get average rating for a judge
  async getJudgeAverageRating(
    judgeTelegramId: number,
  ): Promise<{ averageScore: number; totalFeedbacks: number }> {
    const feedbacks = await this.judgeFeedbackRepository.find({
      where: { judgeTelegramId },
    });

    if (feedbacks.length === 0) {
      return { averageScore: 0, totalFeedbacks: 0 };
    }

    const totalScore = feedbacks.reduce((sum, f) => sum + f.score, 0);
    return {
      averageScore: Number((totalScore / feedbacks.length).toFixed(1)),
      totalFeedbacks: feedbacks.length,
    };
  }

  // Get all feedback for a judge
  async getJudgeFeedbacks(judgeTelegramId: number): Promise<JudgeFeedback[]> {
    return this.judgeFeedbackRepository.find({
      where: { judgeTelegramId },
      order: { submittedAt: 'DESC' },
    });
  }

  // ==================== TEST: Fill with bots ====================

  /**
   * Fill a game with bot players and judges for testing purposes.
   * Bots have negative telegram IDs to avoid conflicts with real users.
   */
  async fillWithBots(
    gameId: string,
    initiatorTelegramId: number,
  ): Promise<Game> {
    const game = await this.getGameById(gameId);

    if (!game) {
      throw new NotFoundException('Игра не найдена');
    }

    if (game.status !== GameStatus.REGISTRATION) {
      throw new ForbiddenException('Игра не в статусе регистрации');
    }

    // Check if initiator is a participant OR the game creator
    const initiator = game.participants?.find(
      (p) => Number(p.telegramId) === initiatorTelegramId,
    );
    const isCreator = game.createdByTelegramId === initiatorTelegramId;
    if (!initiator && !isCreator) {
      throw new ForbiddenException(
        'Только участник или создатель игры может добавлять ботов',
      );
    }

    // Count current players
    const currentPlayers =
      game.participants?.filter((p) => p.role === ParticipantRole.PLAYER) || [];
    const playersNeeded = game.maxParticipants - currentPlayers.length;

    if (playersNeeded <= 0) {
      throw new BadRequestException('Игра уже заполнена');
    }

    // Generate unique base for negative telegram IDs (use timestamp to avoid collisions)
    const baseId = Date.now();

    // Bot name pools
    const firstNames = [
      'Alex',
      'Jordan',
      'Taylor',
      'Morgan',
      'Casey',
      'Riley',
      'Quinn',
      'Avery',
      'Blake',
      'Cameron',
      'Drew',
      'Emery',
      'Finley',
      'Harper',
      'Hayden',
      'Jamie',
      'Kendall',
      'Lane',
      'Marley',
      'Nico',
      'Parker',
      'Peyton',
      'Reese',
      'Sawyer',
      'Shannon',
      'Sidney',
      'Skyler',
      'Spencer',
      'Tatum',
      'Tristan',
      'Winter',
      'Zion',
    ];

    // Add bot players
    for (let i = 0; i < playersNeeded; i++) {
      const botTelegramId = -(baseId + i + 1); // Negative to avoid conflicts with real users
      const firstName = firstNames[i % firstNames.length];
      const botNumber = i + 1;

      // Create bot user if not exists
      let botUser = await this.userRepository.findOne({
        where: { telegramId: botTelegramId },
      });

      if (!botUser) {
        botUser = this.userRepository.create({
          telegramId: botTelegramId,
          username: `bot_player_${botNumber}`,
          firstName: `${firstName} (Bot)`,
          lastName: null,
          gamesPlayed: 0,
          speakerScores: [],
          totalPoints: 0,
        });
        await this.userRepository.save(botUser);
      }

      // Register bot as participant
      const participant = this.participantRepository.create({
        gameId,
        userId: botUser.id,
        telegramId: botTelegramId,
        username: `bot_player_${botNumber}`,
        firstName: `${firstName} (Bot)`,
        role: ParticipantRole.PLAYER,
        position: ParticipantPosition.NONE,
        isRegistered: true,
        metadata: { isBot: true },
      });

      await this.participantRepository.save(participant);
    }

    // Add 1-2 bot judges (always add at least 1 judge)
    const currentJudges =
      game.participants?.filter((p) => p.role === ParticipantRole.JUDGE) || [];
    const judgesToAdd = Math.max(1, 2 - currentJudges.length);

    const judgeNames = ['Victoria', 'Alexander', 'Catherine', 'Maximilian'];

    for (let i = 0; i < judgesToAdd; i++) {
      const botTelegramId = -(baseId + playersNeeded + i + 1);
      const firstName = judgeNames[i % judgeNames.length];
      const botNumber = i + 1;

      // Create bot user if not exists
      let botUser = await this.userRepository.findOne({
        where: { telegramId: botTelegramId },
      });

      if (!botUser) {
        botUser = this.userRepository.create({
          telegramId: botTelegramId,
          username: `bot_judge_${botNumber}`,
          firstName: `${firstName} (Bot Judge)`,
          lastName: null,
          gamesPlayed: 0,
          speakerScores: [],
          totalPoints: 0,
        });
        await this.userRepository.save(botUser);
      }

      // Register bot as judge
      const participant = this.participantRepository.create({
        gameId,
        userId: botUser.id,
        telegramId: botTelegramId,
        username: `bot_judge_${botNumber}`,
        firstName: `${firstName} (Bot Judge)`,
        role: ParticipantRole.JUDGE,
        position: ParticipantPosition.NONE,
        isRegistered: true,
        metadata: { isBot: true },
      });

      await this.participantRepository.save(participant);
    }

    // Return updated game
    const updatedGame = await this.getGameById(gameId);
    if (!updatedGame) {
      throw new NotFoundException('Не удалось загрузить обновлённую игру');
    }
    return updatedGame;
  }

  // ==================== New Feedback Flow Methods ====================

  // Get count of completed games for a user
  async getUserCompletedGamesCount(playerTelegramId: number): Promise<number> {
    const count = await this.participantRepository.count({
      where: {
        telegramId: playerTelegramId,
        role: ParticipantRole.PLAYER,
        game: {
          status: GameStatus.COMPLETED,
        },
      },
      relations: ['game'],
    });
    return count;
  }

  // Get all unrated judge-game pairs for a player
  // Returns judges who judged this player in completed games, along with game motion
  async getUnratedJudgesWithMotion(playerTelegramId: number): Promise<
    {
      gameId: string;
      judgeTelegramId: number;
      judgeName: string | null;
      motion: string | null;
      gameName: string;
      gameDate: Date;
    }[]
  > {
    // Get all games where this user was a player and game is completed
    // Use query builder to ensure proper loading
    const playerParticipations = await this.participantRepository.find({
      where: {
        telegramId: playerTelegramId,
        role: ParticipantRole.PLAYER,
      },
      relations: ['game'],
    });

    // Filter completed games and ensure game is loaded
    const completedGames = playerParticipations.filter(
      (p) => p.game && p.game.status === GameStatus.COMPLETED,
    );

    if (completedGames.length === 0) {
      return [];
    }

    const result: {
      gameId: string;
      judgeTelegramId: number;
      judgeName: string | null;
      motion: string | null;
      gameName: string;
      gameDate: Date;
    }[] = [];

    for (const participation of completedGames) {
      const game = participation.game;
      if (!game || !game.id) continue;

      // Get all judges in this game
      const judges = await this.participantRepository.find({
        where: {
          gameId: game.id,
          role: ParticipantRole.JUDGE,
        },
      });

      if (judges.length === 0) continue;

      // Get already rated judges for this game
      const ratedFeedbacks = await this.judgeFeedbackRepository.find({
        where: {
          gameId: game.id,
          playerTelegramId,
        },
      });

      // Convert to numbers to handle bigint type properly
      const ratedJudgeIds = new Set(
        ratedFeedbacks.map((f) => Number(f.judgeTelegramId)),
      );

      // Add unrated judges to result
      for (const judge of judges) {
        if (!ratedJudgeIds.has(Number(judge.telegramId))) {
          result.push({
            gameId: game.id,
            judgeTelegramId: Number(judge.telegramId),
            judgeName:
              judge.firstName || judge.username || `Судья ${judge.telegramId}`,
            motion: game.motion || null,
            gameName: game.name || 'Игра без названия',
            gameDate: game.updatedAt || game.createdAt || new Date(),
          });
        }
      }
    }

    // Sort by date (newest first)
    return result.sort((a, b) => b.gameDate.getTime() - a.gameDate.getTime());
  }

  // ==================== Import Game Result (for testing/historical data) ====================

  /**
   * Import a completed game result with players, judges, and scores.
   * Creates users if they don't exist. Supports short games and ironman.
   */
  async importGameResult(importDto: ImportGameResultDto): Promise<Game> {
    const { name, motion, players, judges, gameDate } = importDto;

    // Validate: at least 2 players (1 OG, 1 OO minimum)
    if (players.length < 2) {
      throw new BadRequestException(
        'Minimum 2 players required (at least 1 OG and 1 OO)',
      );
    }

    // Validate: at least 1 judge
    if (judges.length === 0) {
      throw new BadRequestException('At least 1 judge is required');
    }

    // Validate positions
    const positions = players.map((p) => p.position);
    const hasOG = positions.includes('OG');
    const hasOO = positions.includes('OO');

    if (!hasOG || !hasOO) {
      throw new BadRequestException('At least 1 OG and 1 OO player required');
    }

    // Get all users (players and judges) - they must be registered in bot
    const allUsers = new Map<number, User>();

    for (const player of players) {
      const user = await this.userRepository.findOne({
        where: { telegramId: player.telegramId },
      });

      if (!user) {
        throw new NotFoundException(
          `User with telegramId ${player.telegramId} is not registered in bot. Please register first.`,
        );
      }

      allUsers.set(player.telegramId, user);
    }

    for (const judge of judges) {
      const user = await this.userRepository.findOne({
        where: { telegramId: judge.telegramId },
      });

      if (!user) {
        throw new NotFoundException(
          `Judge with telegramId ${judge.telegramId} is not registered in bot. Please register first.`,
        );
      }

      allUsers.set(judge.telegramId, user);
    }

    // Create the game
    const game = this.gameRepository.create({
      name: name || `Imported Game ${new Date().toLocaleDateString()}`,
      description: 'Imported historical game result',
      status: GameStatus.COMPLETED,
      motion,
      startTime: gameDate ? new Date(gameDate) : new Date(),
      endTime: new Date(),
      totalRounds: 1,
      currentRound: 1,
      settings: {
        imported: true,
        maxParticipants: players.length,
      },
    });

    await this.gameRepository.save(game);

    // Create room allocation for feedback system
    const roomAllocation: RoomAllocation = {
      roomNumber: 1,
      participants: players.map((p) => ({
        telegramId: p.telegramId,
        position: p.position,
        isIronman: p.isIronman || false,
      })),
      judges: judges.map((j) => ({
        telegramId: j.telegramId,
      })),
    };

    // Update game with room allocation
    game.settings = {
      ...game.settings,
      roomAllocations: [roomAllocation],
      isAllocated: true,
    };
    await this.gameRepository.save(game);

    // Create participants using user's name from database
    for (const player of players) {
      const user = allUsers.get(player.telegramId)!;
      const participant = this.participantRepository.create({
        gameId: game.id,
        userId: user.id,
        telegramId: player.telegramId,
        username: user.username,
        firstName: user.firstName,
        role: ParticipantRole.PLAYER,
        position: this.mapPositionToEnum(player.position),
        isRegistered: true,
        metadata: { isIronman: player.isIronman || false, imported: true },
      });
      await this.participantRepository.save(participant);
    }

    for (const judge of judges) {
      const user = allUsers.get(judge.telegramId)!;
      const participant = this.participantRepository.create({
        gameId: game.id,
        userId: user.id,
        telegramId: judge.telegramId,
        username: user.username,
        firstName: user.firstName,
        role: ParticipantRole.JUDGE,
        position: ParticipantPosition.NONE,
        isRegistered: true,
        metadata: { imported: true },
      });
      await this.participantRepository.save(participant);
    }

    // Save speaker scores and update user stats
    // Use first judge as the one who submitted scores
    const submittingJudgeId = judges[0].telegramId;

    for (const player of players) {
      const scores = player.scores;
      const isIronman = player.isIronman || false;

      if (scores.length === 0) continue;

      // For ironman: save only the highest score
      // For normal: save both scores (or one if only provided)
      if (isIronman) {
        const highestScore = Math.max(...scores);
        await this.speakerScoreRepository.save({
          gameId: game.id,
          telegramId: player.telegramId,
          position: this.mapPositionToString(player.position),
          score: highestScore,
          isIronman: true,
          judgeTelegramId: submittingJudgeId,
        });
      } else {
        // Normal player - save each score
        for (const score of scores) {
          await this.speakerScoreRepository.save({
            gameId: game.id,
            telegramId: player.telegramId,
            position: this.mapPositionToString(player.position),
            score,
            isIronman: false,
            judgeTelegramId: submittingJudgeId,
          });
        }
      }

      // Update user stats
      const user = allUsers.get(player.telegramId)!;
      const avgScore = isIronman
        ? Math.max(...scores)
        : scores.reduce((a, b) => a + b, 0) / scores.length;

      user.speakerScores = [...(user.speakerScores || []), avgScore];
      user.gamesPlayed += 1;
      await this.userRepository.save(user);
    }

    // Return game with relations
    return this.getGameById(game.id) as Promise<Game>;
  }

  private mapPositionToEnum(
    position: 'OG' | 'OO' | 'CG' | 'CO',
  ): ParticipantPosition {
    switch (position) {
      case 'OG':
        return ParticipantPosition.OPENING_GOVERNMENT;
      case 'OO':
        return ParticipantPosition.OPENING_OPPOSITION;
      case 'CG':
        return ParticipantPosition.CLOSING_GOVERNMENT;
      case 'CO':
        return ParticipantPosition.CLOSING_OPPOSITION;
      default:
        return ParticipantPosition.NONE;
    }
  }

  private mapPositionToString(position: 'OG' | 'OO' | 'CG' | 'CO'): string {
    switch (position) {
      case 'OG':
        return 'opening_government';
      case 'OO':
        return 'opening_opposition';
      case 'CG':
        return 'closing_government';
      case 'CO':
        return 'closing_opposition';
      default:
        return 'none';
    }
  }
}
