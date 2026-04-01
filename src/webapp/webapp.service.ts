import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Game, GameStatus } from '../game/entities/game.entity';
import { GameParticipant, ParticipantRole } from '../game/entities/game-participant.entity';
import { RoomPosition } from '../game/entities/room-participant.entity';
import { User } from '../user/entities/user.entity';
import { SpeakerScore } from '../game/entities/speaker-score.entity';
import { JudgeFeedback } from '../game/entities/judge-feedback.entity';
import { RoomAllocation } from '../game/entities/room-allocation.entity';
import { RoomParticipant } from '../game/entities/room-participant.entity';
import { RoomJudge } from '../game/entities/room-judge.entity';
import type {
  WebAppConfigResponse,
  GameListItemDto,
  GameDetailsDto,
  UserProfileDto,
  JudgeStatsDto,
  RoomAllocationDto,
  GameParticipantDto,
} from './dtos/webapp.dto';

interface SpeakerStat {
  telegramId: number;
  username: string | null;
  firstName: string;
  gamesPlayed: number;
  averageScore: number;
}

interface JudgeStat {
  telegramId: number;
  username: string | null;
  firstName: string;
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
      environment: this.configService.get<'development' | 'production'>('nodeEnv') || 'development',
    };
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

    // Get user details for speakers
    const speakerTelegramIds = speakerScores.map((s) => Number(s.telegramId));
    const speakerUsers = await this.userRepository.find({
      where: speakerTelegramIds.map((id) => ({ telegramId: id })),
    });

    const speakers: SpeakerStat[] = speakerScores.map((score) => {
      const user = speakerUsers.find((u) => u.telegramId === Number(score.telegramId));
      return {
        telegramId: Number(score.telegramId),
        username: user?.username || null,
        firstName: user?.firstName || 'Unknown',
        gamesPlayed: parseInt(score.gamesPlayed, 10),
        averageScore: score.averageScore ? parseFloat(parseFloat(score.averageScore).toFixed(1)) : 0,
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
    const judgeTelegramIds = judgeFeedbacks.map((j) => Number(j.telegramId));
    const judgeUsers = await this.userRepository.find({
      where: judgeTelegramIds.map((id) => ({ telegramId: id })),
    });

    const judges: JudgeStat[] = judgeFeedbacks.map((feedback) => {
      const user = judgeUsers.find((u) => u.telegramId === Number(feedback.telegramId));
      return {
        telegramId: Number(feedback.telegramId),
        username: user?.username || null,
        firstName: user?.firstName || 'Unknown',
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
      isUserRegistered: game.participants?.some(
        (p) => Number(p.telegramId) === telegramId,
      ) || false,
      createdAt: game.createdAt.toISOString(),
    }));
  }

  async getGameById(gameId: string, telegramId: number): Promise<GameDetailsDto> {
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
      averageScore: result?.average ? parseFloat(parseFloat(result.average).toFixed(1)) : 0,
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
      throw new ForbiddenException('Cannot leave game after registration is closed');
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
        game.participants?.some((p) => Number(p.telegramId) === telegramId) || false,
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
