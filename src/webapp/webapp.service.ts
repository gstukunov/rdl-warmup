import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Game, GameStatus } from '../game/entities/game.entity';
import {
  GameParticipant,
  ParticipantRole,
  ParticipantPosition,
} from '../game/entities/game-participant.entity';
import { RoomPosition } from '../game/entities/room-participant.entity';
import { User } from '../user/entities/user.entity';
import { SpeakerScore } from '../game/entities/speaker-score.entity';
import { JudgeFeedback } from '../game/entities/judge-feedback.entity';
import { RoomAllocation } from '../game/entities/room-allocation.entity';
import { RoomParticipant } from '../game/entities/room-participant.entity';
import { RoomJudge } from '../game/entities/room-judge.entity';
import { AdminTokenService } from './admin-token.service';
import type {
  WebAppConfigResponse,
  GameListItemDto,
  GameDetailsDto,
  UserProfileDto,
  JudgeStatsDto,
  RoomAllocationDto,
  GameParticipantDto,
  UserOptionDto,
  CompletedGameListItemDto,
  SubmitGameResultsRequestDto,
  CreateCompletedGameRequestDto,
  PositionResultDto,
} from './dtos/webapp.dto';

interface SpeakerStat {
  telegramId: number;
  username: string | null;
  firstName: string;
  lastName: string;
  gamesPlayed: number;
  averageScore: number;
}

interface JudgeStat {
  telegramId: number;
  username: string | null;
  firstName: string;
  lastName: string;
  gamesJudged: number;
  averageScore: number;
}

export interface PublicStats {
  speakers: SpeakerStat[];
  judges: JudgeStat[];
}

@Injectable()
export class WebAppService {
  constructor(
    private readonly configService: ConfigService,
    private readonly tokenService: AdminTokenService,
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
    @InjectRepository(RoomAllocation)
    private readonly roomAllocationRepository: Repository<RoomAllocation>,
    @InjectRepository(RoomParticipant)
    private readonly roomParticipantRepository: Repository<RoomParticipant>,
    @InjectRepository(RoomJudge)
    private readonly roomJudgeRepository: Repository<RoomJudge>,
  ) {}

  getConfig(): WebAppConfigResponse {
    return {
      botUsername: this.configService.get<string>('telegram.botUsername') || '',
      apiBaseUrl: this.configService.get<string>('telegram.webAppUrl') || '',
      environment:
        this.configService.get<'development' | 'production'>('nodeEnv') ||
        'development',
    };
  }

  async getGameParticipations(): Promise<import('./dtos/webapp.dto').GameParticipationDto[]> {
    const games = await this.gameRepository.find({
      where: { status: GameStatus.COMPLETED },
      relations: ['participants'],
      order: { createdAt: 'ASC' },
    });

    // Collect all participant telegram IDs to fetch user details
    const telegramIds = new Set<number>();
    games.forEach((game) => {
      game.participants?.forEach((p) => {
        if (p.telegramId) telegramIds.add(Number(p.telegramId));
      });
    });

    // Fetch users to get last names
    const users =
      telegramIds.size > 0
        ? await this.userRepository.find({
            where: { telegramId: In(Array.from(telegramIds)) },
          })
        : [];

    const userMap = new Map(users.map((u) => [Number(u.telegramId), u]));

    return games.map((game) => ({
      gameId: game.id,
      gameName: game.name,
      participants:
        game.participants?.map((p) => {
          const user = p.telegramId ? userMap.get(Number(p.telegramId)) : undefined;
          return {
            telegramId: Number(p.telegramId),
            firstName: user?.firstName ?? p.firstName ?? '',
            lastName: user?.lastName ?? null,
            role: p.role,
          };
        }) || [],
    }));
  }

  async getPublicStats(): Promise<PublicStats> {
    // Get speaker statistics - users with at least 1 game
    const speakerScores = await this.speakerScoreRepository
      .createQueryBuilder('score')
      .select('score.telegramId', 'telegramId')
      .addSelect('COUNT(DISTINCT score.gameId)', 'gamesPlayed')
      .addSelect('AVG(score.score)', 'averageScore')
      .groupBy('score.telegramId')
      .having('COUNT(DISTINCT score.gameId) > 0')
      .orderBy('AVG(score.score)', 'DESC')
      .getRawMany();

    // Get user details for speakers using In operator
    const speakerTelegramIds = speakerScores.map((s) => String(s.telegramId));
    const speakerUsers =
      speakerTelegramIds.length > 0
        ? await this.userRepository.find({
            where: { telegramId: In(speakerTelegramIds) },
          })
        : [];

    // Create a map for quick lookup
    const userMap = new Map(speakerUsers.map((u) => [String(u.telegramId), u]));

    const speakers: SpeakerStat[] = speakerScores.map((score) => {
      const user = userMap.get(String(score.telegramId));
      return {
        telegramId: Number(score.telegramId),
        username: user?.username ?? null,
        firstName: user?.firstName ?? '',
        lastName: user?.lastName ?? '',
        gamesPlayed: parseInt(score.gamesPlayed, 10),
        averageScore: score.averageScore
          ? parseFloat(parseFloat(score.averageScore).toFixed(1))
          : 0,
      };
    });

    // Get judge statistics
    const judgeFeedbacks = await this.judgeFeedbackRepository
      .createQueryBuilder('feedback')
      .select('feedback.judgeTelegramId', 'telegramId')
      .addSelect('COUNT(*)', 'gamesJudged')
      .addSelect('AVG(feedback.score)', 'averageScore')
      .groupBy('feedback.judgeTelegramId')
      .having('COUNT(*) > 0')
      .orderBy('AVG(feedback.score)', 'DESC')
      .getRawMany();

    // Get user details for judges
    const judgeTelegramIds = judgeFeedbacks.map((j) => String(j.telegramId));
    const judgeUsers =
      judgeTelegramIds.length > 0
        ? await this.userRepository.find({
            where: { telegramId: In(judgeTelegramIds) },
          })
        : [];

    // Create a map for quick lookup
    const judgeUserMap = new Map(
      judgeUsers.map((u) => [String(u.telegramId), u]),
    );

    const judges: JudgeStat[] = judgeFeedbacks.map((feedback) => {
      const user = judgeUserMap.get(String(feedback.telegramId));
      return {
        telegramId: Number(feedback.telegramId),
        username: user?.username ?? null,
        firstName: user?.firstName ?? '',
        lastName: user?.lastName ?? '',
        gamesJudged: parseInt(feedback.gamesJudged, 10),
        averageScore: feedback.averageScore
          ? parseFloat(parseFloat(feedback.averageScore).toFixed(1))
          : 0,
      };
    });

    return { speakers, judges };
  }

  async getOpenGames(telegramId: number): Promise<GameListItemDto[]> {
    const games = await this.gameRepository.find({
      where: [
        { status: GameStatus.REGISTRATION },
        { status: GameStatus.ALLOCATING },
      ],
      relations: ['participants'],
      order: { createdAt: 'DESC' },
    });

    return games.map((game) => ({
      id: game.id,
      name: game.name,
      description: game.description,
      status: game.status,
      maxParticipants: game.maxParticipants,
      participantCount: game.participants?.length || 0,
      isUserRegistered:
        game.participants?.some((p) => Number(p.telegramId) === telegramId) ||
        false,
      createdAt: game.createdAt.toISOString(),
    }));
  }

  async getGameById(
    gameId: string,
    telegramId: number,
  ): Promise<GameDetailsDto> {
    const game = await this.gameRepository.findOne({
      where: { id: gameId },
      relations: ['participants'],
    });

    if (!game) {
      throw new NotFoundException('Game not found');
    }

    return this.mapGameToDetailsDto(game, telegramId);
  }

  async getMyGame(telegramId: number): Promise<GameDetailsDto | null> {
    const participant = await this.participantRepository.findOne({
      where: { telegramId: telegramId },
      relations: ['game', 'game.participants'],
      order: { registeredAt: 'DESC' },
    });

    if (!participant || !participant.game) {
      return null;
    }

    // Only return if game is not completed or cancelled
    if (
      participant.game.status === GameStatus.COMPLETED ||
      participant.game.status === GameStatus.CANCELLED
    ) {
      return null;
    }

    return this.mapGameToDetailsDto(participant.game, telegramId);
  }

  async getUserProfile(telegramId: number): Promise<UserProfileDto> {
    const user = await this.userRepository.findOne({
      where: { telegramId: telegramId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Get games played count from speaker scores
    const gamesPlayed = await this.speakerScoreRepository
      .createQueryBuilder('score')
      .select('COUNT(DISTINCT score.gameId)', 'count')
      .where('score.telegramId = :telegramId', { telegramId })
      .getRawOne()
      .then((result) => parseInt(result.count, 10) || 0);

    // Get average speaker score
    const avgScoreResult = await this.speakerScoreRepository
      .createQueryBuilder('score')
      .select('AVG(score.score)', 'average')
      .where('score.telegramId = :telegramId', { telegramId })
      .getRawOne();

    const averageSpeakerScore = avgScoreResult?.average
      ? parseFloat(parseFloat(avgScoreResult.average).toFixed(1))
      : 0;

    return {
      user: {
        id: user.id,
        telegramId: user.telegramId,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        isActive: user.isActive,
        createdAt: user.createdAt.toISOString(),
      },
      gamesPlayed,
      averageSpeakerScore,
    };
  }

  async getJudgeStats(telegramId: number): Promise<JudgeStatsDto> {
    const result = await this.judgeFeedbackRepository
      .createQueryBuilder('feedback')
      .select('AVG(feedback.score)', 'average')
      .addSelect('COUNT(*)', 'count')
      .where('feedback.judgeTelegramId = :telegramId', { telegramId })
      .getRawOne();

    return {
      averageScore: result?.average
        ? parseFloat(parseFloat(result.average).toFixed(1))
        : 0,
      totalFeedbacks: result?.count ? parseInt(result.count, 10) : 0,
    };
  }

  async joinGame(
    gameId: string,
    telegramId: number,
    role: ParticipantRole,
  ): Promise<void> {
    const game = await this.gameRepository.findOne({
      where: { id: gameId },
      relations: ['participants'],
    });

    if (!game) {
      throw new NotFoundException('Game not found');
    }

    if (game.status !== GameStatus.REGISTRATION) {
      throw new ForbiddenException('Game is not open for registration');
    }

    // Check if user is already registered
    const existingParticipant = game.participants?.find(
      (p) => Number(p.telegramId) === telegramId,
    );

    if (existingParticipant) {
      throw new ForbiddenException('You are already registered for this game');
    }

    // Get user info
    const user = await this.userRepository.findOne({
      where: { telegramId: telegramId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if game is full
    if (game.participants && game.participants.length >= game.maxParticipants) {
      throw new ForbiddenException('Game is full');
    }

    // Create participant
    const participant = this.participantRepository.create({
      gameId: game.id,
      userId: user.id,
      telegramId: telegramId,
      username: user.username,
      firstName: user.firstName,
      role,
      position: 'none' as any,
      isRegistered: true,
      registeredAt: new Date(),
    });

    await this.participantRepository.save(participant);
  }

  async leaveGame(gameId: string, telegramId: number): Promise<void> {
    const game = await this.gameRepository.findOne({
      where: { id: gameId },
    });

    if (!game) {
      throw new NotFoundException('Game not found');
    }

    if (game.status !== GameStatus.REGISTRATION) {
      throw new ForbiddenException(
        'Cannot leave game after registration is closed',
      );
    }

    const participant = await this.participantRepository.findOne({
      where: {
        game: { id: gameId },
        telegramId: telegramId,
      },
    });

    if (!participant) {
      throw new NotFoundException('You are not registered for this game');
    }

    await this.participantRepository.remove(participant);
  }

  async getRoomAllocations(gameId: string): Promise<RoomAllocationDto[]> {
    const allocations = await this.roomAllocationRepository.find({
      where: { game: { id: gameId } },
      relations: ['participants', 'judges'],
      order: { roomNumber: 'ASC' },
    });

    return Promise.all(
      allocations.map(async (allocation) => {
        // Get room participants with positions
        const roomParticipants = await this.roomParticipantRepository.find({
          where: { room: { id: allocation.id } },
          relations: ['participant'],
        });

        // Get room judges
        const roomJudges = await this.roomJudgeRepository.find({
          where: { room: { id: allocation.id } },
          relations: ['participant'],
        });

        const openingGovernment = roomParticipants
          .filter((rp) => rp.position === RoomPosition.OPENING_GOVERNMENT)
          .map((rp) => ({
            telegramId: rp.participant.telegramId,
            username: rp.participant.username,
            firstName: rp.participant.firstName,
            isIronman: rp.isIronman,
          }));

        const openingOpposition = roomParticipants
          .filter((rp) => rp.position === RoomPosition.OPENING_OPPOSITION)
          .map((rp) => ({
            telegramId: rp.participant.telegramId,
            username: rp.participant.username,
            firstName: rp.participant.firstName,
            isIronman: rp.isIronman,
          }));

        const closingGovernment = roomParticipants
          .filter((rp) => rp.position === RoomPosition.CLOSING_GOVERNMENT)
          .map((rp) => ({
            telegramId: rp.participant.telegramId,
            username: rp.participant.username,
            firstName: rp.participant.firstName,
            isIronman: rp.isIronman,
          }));

        const closingOpposition = roomParticipants
          .filter((rp) => rp.position === RoomPosition.CLOSING_OPPOSITION)
          .map((rp) => ({
            telegramId: rp.participant.telegramId,
            username: rp.participant.username,
            firstName: rp.participant.firstName,
            isIronman: rp.isIronman,
          }));

        const judges = roomJudges
          .filter((rj) => rj.role === 'chair')
          .map((rj) => ({
            telegramId: rj.participant.telegramId,
            username: rj.participant.username,
            firstName: rj.participant.firstName,
            role: 'chair' as const,
          }));

        const wings = roomJudges
          .filter((rj) => rj.role === 'wing')
          .map((rj) => ({
            telegramId: rj.participant.telegramId,
            username: rj.participant.username,
            firstName: rj.participant.firstName,
            role: 'wing' as const,
          }));

        return {
          roomNumber: allocation.roomNumber,
          openingGovernment,
          openingOpposition,
          closingGovernment,
          closingOpposition,
          judges,
          wings,
        };
      }),
    );
  }

  // Admin methods

  async adminLogin(password: string): Promise<string> {
    if (!this.tokenService.validatePassword(password)) {
      throw new UnauthorizedException('Invalid admin password');
    }

    // Create and return a proper token
    return this.tokenService.createToken();
  }

  async getUsersForAdmin(): Promise<UserOptionDto[]> {
    const users = await this.userRepository.find({
      where: { isActive: true },
      order: { firstName: 'ASC' },
    });

    return users.map((user) => ({
      telegramId: user.telegramId,
      username: user.username,
      firstName: user.firstName ?? '',
      lastName: user.lastName,
    }));
  }

  async getCompletedGamesForAdmin(): Promise<CompletedGameListItemDto[]> {
    const games = await this.gameRepository.find({
      where: [
        { status: GameStatus.IN_PROGRESS },
        { status: GameStatus.COMPLETED },
      ],
      relations: ['participants'],
      order: { createdAt: 'DESC' },
    });

    // Check which games have results
    const gameIds = games.map((g) => g.id);
    const existingScores = await this.speakerScoreRepository
      .createQueryBuilder('score')
      .select('score.gameId', 'gameId')
      .addSelect('COUNT(*)', 'count')
      .where('score.gameId IN (:...gameIds)', { gameIds })
      .groupBy('score.gameId')
      .getRawMany();

    const scoresMap = new Map(
      existingScores.map((s) => [s.gameId, parseInt(s.count, 10) > 0]),
    );

    return games.map((game) => ({
      id: game.id,
      name: game.name,
      description: game.description,
      motion: game.motion,
      startTime: game.startTime?.toISOString() || null,
      endTime: game.endTime?.toISOString() || null,
      createdAt: game.createdAt.toISOString(),
      participantCount: game.participants?.length || 0,
      hasResults: scoresMap.get(game.id) || false,
    }));
  }

  async getGameDetailsForAdmin(gameId: string): Promise<GameDetailsDto> {
    const game = await this.gameRepository.findOne({
      where: { id: gameId },
      relations: ['participants'],
    });

    if (!game) {
      throw new NotFoundException('Game not found');
    }

    return this.mapGameToDetailsDto(game, 0);
  }

  async submitGameResults(data: SubmitGameResultsRequestDto): Promise<void> {
    const game = await this.gameRepository.findOne({
      where: { id: data.gameId },
    });

    if (!game) {
      throw new NotFoundException('Game not found');
    }

    // Update game motion if provided
    if (data.motion && !game.motion) {
      game.motion = data.motion;
      await this.gameRepository.save(game);
    }

    const scores: SpeakerScore[] = [];

    // Helper function to create score
    const createScore = (
      telegramId: number | null,
      position: string,
      scoreValue: number,
      isIronman: boolean,
    ) => {
      if (!telegramId) return;
      
      const score = this.speakerScoreRepository.create({
        gameId: data.gameId,
        telegramId,
        position,
        score: scoreValue,
        isIronman,
        judgeTelegramId: data.judgeTelegramId,
        submittedAt: new Date(),
      });
      scores.push(score);
    };

    // Helper to save position scores (handles ironman logic)
    const savePositionScores = (
      positionData: PositionResultDto,
      position: string,
    ) => {
      if (!positionData) return;

      if (positionData.isIronman) {
        // Ironman: one player, take the highest score
        const speaker = positionData.speaker1;
        if (speaker.telegramId) {
          const highestScore = Math.max(
            positionData.speaker1.score,
            positionData.speaker2.score,
          );
          createScore(speaker.telegramId, position, highestScore, true);
        }
      } else {
        // Normal: two separate speakers
        if (positionData.speaker1.telegramId) {
          createScore(
            positionData.speaker1.telegramId,
            position,
            positionData.speaker1.score,
            false,
          );
        }
        if (positionData.speaker2.telegramId) {
          createScore(
            positionData.speaker2.telegramId,
            position,
            positionData.speaker2.score,
            false,
          );
        }
      }
    };

    // Add scores for each position
    savePositionScores(data.openingGovernment, 'opening_government');
    savePositionScores(data.openingOpposition, 'opening_opposition');

    if (data.closingGovernment) {
      savePositionScores(data.closingGovernment, 'closing_government');
    }

    if (data.closingOpposition) {
      savePositionScores(data.closingOpposition, 'closing_opposition');
    }

    // Save all scores
    if (scores.length > 0) {
      await this.speakerScoreRepository.save(scores);
    }

    // Update game status to completed
    game.status = GameStatus.COMPLETED;
    game.endTime = new Date();
    await this.gameRepository.save(game);
  }

  async createCompletedGame(data: CreateCompletedGameRequestDto): Promise<string> {
    // Create a new game with COMPLETED status
    const game = this.gameRepository.create({
      name: data.gameName,
      description: null,
      motion: data.motion,
      status: GameStatus.COMPLETED,
      maxParticipants: 8,
      isAllocated: true,
      startTime: new Date(),
      endTime: new Date(),
      gamePassword: null,
      createdByTelegramId: null,
      totalRounds: 1,
      currentRound: 1,
      isFeedbackHidden: false,
      settings: {},
    });

    await this.gameRepository.save(game);

    const scores: SpeakerScore[] = [];

    // Helper function to create score
    const createScore = (
      telegramId: number | null,
      position: string,
      scoreValue: number,
      isIronman: boolean,
    ) => {
      if (!telegramId) return;
      
      const score = this.speakerScoreRepository.create({
        gameId: game.id,
        telegramId,
        position,
        score: scoreValue,
        isIronman,
        judgeTelegramId: data.judgeTelegramId,
        submittedAt: new Date(),
      });
      scores.push(score);
    };

    // Helper to save position scores (handles ironman logic)
    const savePositionScores = (
      positionData: PositionResultDto,
      position: string,
    ) => {
      if (!positionData) return;

      if (positionData.isIronman) {
        // Ironman: one player, take the highest score
        const speaker = positionData.speaker1;
        if (speaker.telegramId) {
          const highestScore = Math.max(
            positionData.speaker1.score,
            positionData.speaker2.score,
          );
          createScore(speaker.telegramId, position, highestScore, true);
        }
      } else {
        // Normal: two separate speakers
        if (positionData.speaker1.telegramId) {
          createScore(
            positionData.speaker1.telegramId,
            position,
            positionData.speaker1.score,
            false,
          );
        }
        if (positionData.speaker2.telegramId) {
          createScore(
            positionData.speaker2.telegramId,
            position,
            positionData.speaker2.score,
            false,
          );
        }
      }
    };

    // Add scores for each position
    savePositionScores(data.openingGovernment, 'opening_government');
    savePositionScores(data.openingOpposition, 'opening_opposition');

    if (data.closingGovernment) {
      savePositionScores(data.closingGovernment, 'closing_government');
    }

    if (data.closingOpposition) {
      savePositionScores(data.closingOpposition, 'closing_opposition');
    }

    // Save all scores
    if (scores.length > 0) {
      await this.speakerScoreRepository.save(scores);
    }

    // Create game participants so players can leave feedback for judges
    const playerPositionMap = new Map<number, ParticipantPosition>();

    const addPlayer = (
      telegramId: number | null,
      position: ParticipantPosition,
    ) => {
      if (telegramId) playerPositionMap.set(telegramId, position);
    };

    if (data.openingGovernment) {
      addPlayer(
        data.openingGovernment.speaker1.telegramId,
        ParticipantPosition.OPENING_GOVERNMENT,
      );
      if (!data.openingGovernment.isIronman) {
        addPlayer(
          data.openingGovernment.speaker2.telegramId,
          ParticipantPosition.OPENING_GOVERNMENT,
        );
      }
    }

    if (data.openingOpposition) {
      addPlayer(
        data.openingOpposition.speaker1.telegramId,
        ParticipantPosition.OPENING_OPPOSITION,
      );
      if (!data.openingOpposition.isIronman) {
        addPlayer(
          data.openingOpposition.speaker2.telegramId,
          ParticipantPosition.OPENING_OPPOSITION,
        );
      }
    }

    if (data.closingGovernment) {
      addPlayer(
        data.closingGovernment.speaker1.telegramId,
        ParticipantPosition.CLOSING_GOVERNMENT,
      );
      if (!data.closingGovernment.isIronman) {
        addPlayer(
          data.closingGovernment.speaker2.telegramId,
          ParticipantPosition.CLOSING_GOVERNMENT,
        );
      }
    }

    if (data.closingOpposition) {
      addPlayer(
        data.closingOpposition.speaker1.telegramId,
        ParticipantPosition.CLOSING_OPPOSITION,
      );
      if (!data.closingOpposition.isIronman) {
        addPlayer(
          data.closingOpposition.speaker2.telegramId,
          ParticipantPosition.CLOSING_OPPOSITION,
        );
      }
    }

    const allTelegramIds = [
      ...playerPositionMap.keys(),
      data.judgeTelegramId,
    ];

    const users =
      allTelegramIds.length > 0
        ? await this.userRepository.find({
            where: { telegramId: In(allTelegramIds) },
          })
        : [];

    const userMap = new Map(users.map((u) => [Number(u.telegramId), u]));

    const participants: GameParticipant[] = [];

    for (const [telegramId, position] of playerPositionMap) {
      const user = userMap.get(telegramId);
      if (!user) continue;

      participants.push(
        this.participantRepository.create({
          gameId: game.id,
          userId: user.id,
          telegramId,
          username: user.username,
          firstName: user.firstName,
          role: ParticipantRole.PLAYER,
          position,
          isRegistered: true,
          registeredAt: new Date(),
        }),
      );
    }

    const judgeUser = userMap.get(data.judgeTelegramId);
    if (judgeUser) {
      participants.push(
        this.participantRepository.create({
          gameId: game.id,
          userId: judgeUser.id,
          telegramId: data.judgeTelegramId,
          username: judgeUser.username,
          firstName: judgeUser.firstName,
          role: ParticipantRole.JUDGE,
          position: ParticipantPosition.NONE,
          isRegistered: true,
          registeredAt: new Date(),
        }),
      );
    }

    if (participants.length > 0) {
      await this.participantRepository.save(participants);
    }

    return game.id;
  }

  private mapGameToDetailsDto(game: Game, telegramId: number): GameDetailsDto {
    const participants: GameParticipantDto[] =
      game.participants?.map((p) => ({
        id: p.id,
        telegramId: p.telegramId,
        username: p.username,
        firstName: p.firstName,
        lastName: null,
        role: p.role,
        position: p.position,
        teamName: p.teamName,
        isRegistered: p.isRegistered,
        registeredAt: p.registeredAt?.toISOString() || new Date().toISOString(),
      })) || [];

    return {
      id: game.id,
      name: game.name,
      description: game.description,
      status: game.status,
      maxParticipants: game.maxParticipants,
      participantCount: game.participants?.length || 0,
      isUserRegistered:
        game.participants?.some((p) => Number(p.telegramId) === telegramId) ||
        false,
      motion: game.motion,
      startTime: game.startTime?.toISOString() || null,
      endTime: game.endTime?.toISOString() || null,
      createdByTelegramId: game.createdByTelegramId,
      isAllocated: game.isAllocated,
      participants,
      createdAt: game.createdAt.toISOString(),
    };
  }
}
