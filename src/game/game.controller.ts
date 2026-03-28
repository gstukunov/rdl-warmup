import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  HttpException,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBody,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiConflictResponse,
  ApiForbiddenResponse,
} from '@nestjs/swagger';
import { GameService } from './game.service';
import { CreateGameDto } from './dto/create-game.dto';
import { RegisterForGameDto } from './dto/register-for-game.dto';
import { SetMotionDto } from './dto/set-motion.dto';
import { SubmitScoresDto } from './dto/submit-scores.dto';
import { ImportGameResultDto } from './dto/import-game-result.dto';
import {
  GameResponseDto,
  GameParticipantSimpleResponseDto,
} from './dto/game-response.dto';
import { RoomAllocationResponseDto } from './dto/room-allocation-response.dto';
import { ParticipantRole, ParticipantPosition } from './entities/game-participant.entity';
import { GameStatus } from './entities/game.entity';

@ApiTags('games')
@Controller('games')
export class GameController {
  constructor(private readonly gameService: GameService) {}

  @Get()
  @ApiOperation({
    summary: 'Get all open games',
    description: 'Returns a list of games that are currently open for registration',
  })
  @ApiResponse({
    status: 200,
    description: 'List of open games retrieved successfully',
    type: [GameResponseDto],
  })
  async getOpenGames(): Promise<GameResponseDto[]> {
    const games = await this.gameService.getOpenGames();
    return games.map((game) => this.mapGameToResponse(game));
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get game by ID',
    description: 'Returns detailed information about a specific game including participants',
  })
  @ApiParam({
    name: 'id',
    description: 'Game UUID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Game found and returned successfully',
    type: GameResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Game not found',
  })
  async getGameById(@Param('id') id: string): Promise<GameResponseDto> {
    const game = await this.gameService.getGameById(id);
    if (!game) {
      throw new HttpException('Game not found', HttpStatus.NOT_FOUND);
    }
    return this.mapGameToResponse(game);
  }

  @Post()
  @ApiOperation({
    summary: 'Create a new game',
    description: 'Creates a new debate game. Requires telegramId as query parameter. The creator must choose their role separately via registration.',
  })
  @ApiQuery({
    name: 'telegramId',
    description: 'Telegram ID of the user creating the game',
    required: true,
    example: '123456789',
  })
  @ApiBody({
    description: 'Game creation data',
    type: CreateGameDto,
  })
  @ApiResponse({
    status: 201,
    description: 'Game created successfully',
    type: GameResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data or missing telegramId',
  })
  async createGame(
    @Body() createGameDto: CreateGameDto,
    @Query('telegramId') telegramId: string,
  ): Promise<GameResponseDto> {
    if (!telegramId) {
      throw new HttpException('telegramId is required', HttpStatus.BAD_REQUEST);
    }
    const game = await this.gameService.createGame(
      createGameDto,
      parseInt(telegramId, 10),
    );
    return this.mapGameToResponse(game);
  }

  @Post(':id/register')
  @ApiOperation({
    summary: 'Register for a game',
    description: 'Register a user for a specific game as either a player or judge',
  })
  @ApiParam({
    name: 'id',
    description: 'Game UUID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiQuery({
    name: 'telegramId',
    description: 'Telegram ID of the user registering',
    required: true,
    example: '123456789',
  })
  @ApiQuery({
    name: 'username',
    description: 'Telegram username (optional)',
    required: false,
    example: 'john_doe',
  })
  @ApiQuery({
    name: 'firstName',
    description: 'First name from Telegram (optional)',
    required: false,
    example: 'John',
  })
  @ApiBody({
    description: 'Registration data',
    type: RegisterForGameDto,
  })
  @ApiResponse({
    status: 201,
    description: 'Successfully registered for the game',
    type: GameParticipantSimpleResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data or missing required fields',
  })
  @ApiNotFoundResponse({
    description: 'Game not found',
  })
  @ApiConflictResponse({
    description: 'User is already registered for this game',
  })
  @ApiForbiddenResponse({
    description: 'Registration is closed or game is full',
  })
  async registerForGame(
    @Param('id') gameId: string,
    @Body() registerDto: RegisterForGameDto,
    @Query('telegramId') telegramId: string,
    @Query('username') username: string,
    @Query('firstName') firstName: string,
  ): Promise<GameParticipantSimpleResponseDto> {
    if (!telegramId) {
      throw new HttpException('telegramId is required', HttpStatus.BAD_REQUEST);
    }

    try {
      const participant = await this.gameService.registerForGame(
        gameId,
        parseInt(telegramId, 10),
        username || null,
        firstName || null,
        registerDto.role,
      );

      return this.mapParticipantToResponse(participant);
    } catch (error: any) {
      throw new HttpException(
        error.message || 'Registration failed',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post(':id/allocate')
  @ApiOperation({
    summary: 'Allocate players to positions',
    description: 'Allocates all registered players to BP debate positions (OG, OO, CG, CO). Converts judges to players if needed. Creates multiple rooms if necessary.',
  })
  @ApiParam({
    name: 'id',
    description: 'Game UUID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiQuery({
    name: 'telegramId',
    description: 'Telegram ID of the participant initiating allocation',
    required: true,
    example: '123456789',
  })
  @ApiResponse({
    status: 201,
    description: 'Players allocated successfully',
    type: [RoomAllocationResponseDto],
  })
  @ApiBadRequestResponse({
    description: 'Not enough players or invalid game state',
  })
  @ApiNotFoundResponse({
    description: 'Game not found',
  })
  @ApiForbiddenResponse({
    description: 'Only participants can initiate allocation',
  })
  async allocatePlayers(
    @Param('id') gameId: string,
    @Query('telegramId') telegramId: string,
  ): Promise<RoomAllocationResponseDto[]> {
    if (!telegramId) {
      throw new HttpException('telegramId is required', HttpStatus.BAD_REQUEST);
    }

    try {
      const rooms = await this.gameService.allocatePlayers(
        gameId,
        parseInt(telegramId, 10),
      );
      return rooms;
    } catch (error: any) {
      throw new HttpException(
        error.message || 'Allocation failed',
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post(':id/motion')
  @ApiOperation({
    summary: 'Set motion and start game',
    description: 'Sets the debate motion and starts the game. Only judges can perform this action.',
  })
  @ApiParam({
    name: 'id',
    description: 'Game UUID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiQuery({
    name: 'telegramId',
    description: 'Telegram ID of the judge setting the motion',
    required: true,
    example: '123456789',
  })
  @ApiBody({
    description: 'Motion data',
    type: SetMotionDto,
  })
  @ApiResponse({
    status: 200,
    description: 'Motion set and game started successfully',
    type: GameResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid input or game not in allocating state',
  })
  @ApiNotFoundResponse({
    description: 'Game not found',
  })
  @ApiForbiddenResponse({
    description: 'Only judges can set the motion',
  })
  async setMotion(
    @Param('id') gameId: string,
    @Body() setMotionDto: SetMotionDto,
    @Query('telegramId') telegramId: string,
  ): Promise<GameResponseDto> {
    if (!telegramId) {
      throw new HttpException('telegramId is required', HttpStatus.BAD_REQUEST);
    }

    try {
      const game = await this.gameService.setMotionAndStart(
        gameId,
        setMotionDto.motion,
        parseInt(telegramId, 10),
      );
      return this.mapGameToResponse(game);
    } catch (error: any) {
      throw new HttpException(
        error.message || 'Failed to set motion',
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }

  // Helper method to map Game entity to response DTO
  private mapGameToResponse(game: any): GameResponseDto {
    return {
      id: game.id,
      name: game.name,
      description: game.description,
      status: game.status as GameStatus,
      maxParticipants: game.maxParticipants || 8,
      participantCount: game.participants?.length || 0,
      startTime: game.startTime || null,
      endTime: game.endTime || null,
      motion: game.motion || null,
      totalRounds: game.totalRounds || 1,
      currentRound: game.currentRound || 0,
      createdAt: game.createdAt,
      updatedAt: game.updatedAt,
      participants: game.participants?.map((p: any) => this.mapParticipantToResponse(p)),
    };
  }

  @Post(':id/fill-with-bots')
  @ApiOperation({
    summary: '[TEST] Fill game with bot players and judges',
    description: 'Adds fake bot participants to fill all player positions (8) and adds 1-2 judges. Bots have negative telegram IDs to avoid conflicts with real users.',
  })
  @ApiParam({
    name: 'id',
    description: 'Game UUID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiQuery({
    name: 'telegramId',
    description: 'Telegram ID of the user triggering this (must be a participant)',
    required: true,
    example: '123456789',
  })
  @ApiResponse({
    status: 201,
    description: 'Bots added successfully',
    type: GameResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Game not found or not in registration',
  })
  @ApiForbiddenResponse({
    description: 'Only participants can trigger this',
  })
  async fillWithBots(
    @Param('id') gameId: string,
    @Query('telegramId') telegramId: string,
  ): Promise<GameResponseDto> {
    if (!telegramId) {
      throw new HttpException('telegramId is required', HttpStatus.BAD_REQUEST);
    }

    try {
      const game = await this.gameService.fillWithBots(
        gameId,
        parseInt(telegramId, 10),
      );
      return this.mapGameToResponse(game);
    } catch (error: any) {
      throw new HttpException(
        error.message || 'Failed to add bots',
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post(':id/scores')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Submit speaker scores',
    description: 'Submit speaker scores for each position (format: "score1/score2", e.g., "75/78"). Only judges can submit scores. Each judge can submit only once.',
  })
  @ApiParam({
    name: 'id',
    description: 'Game UUID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiQuery({
    name: 'telegramId',
    description: 'Telegram ID of the judge submitting scores',
    required: true,
    example: '123456789',
  })
  @ApiBody({
    description: 'Scores for each position',
    type: SubmitScoresDto,
  })
  @ApiResponse({
    status: 200,
    description: 'Scores submitted successfully',
  })
  @ApiBadRequestResponse({
    description: 'Invalid score format or game not active',
  })
  @ApiNotFoundResponse({
    description: 'Game not found',
  })
  @ApiForbiddenResponse({
    description: 'Only judges can submit scores',
  })
  @ApiConflictResponse({
    description: 'Judge already submitted scores',
  })
  async submitScores(
    @Param('id') gameId: string,
    @Query('telegramId') telegramId: string,
    @Body() submitScoresDto: SubmitScoresDto,
  ): Promise<{ message: string }> {
    if (!telegramId) {
      throw new HttpException('telegramId is required', HttpStatus.BAD_REQUEST);
    }

    try {
      await this.gameService.submitScores(
        gameId,
        parseInt(telegramId, 10),
        submitScoresDto.openingGovernment,
        submitScoresDto.openingOpposition,
        submitScoresDto.closingGovernment,
        submitScoresDto.closingOpposition,
      );
      return { message: 'Scores submitted successfully' };
    } catch (error: any) {
      throw new HttpException(
        error.message || 'Failed to submit scores',
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post(':id/complete')
  @ApiOperation({
    summary: 'Complete/end the game',
    description: 'Ends the game and sets status to COMPLETED. Only judges can complete the game.',
  })
  @ApiParam({
    name: 'id',
    description: 'Game UUID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiQuery({
    name: 'telegramId',
    description: 'Telegram ID of the judge completing the game',
    required: true,
    example: '123456789',
  })
  @ApiResponse({
    status: 200,
    description: 'Game completed successfully',
    type: GameResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Game not in progress',
  })
  @ApiNotFoundResponse({
    description: 'Game not found',
  })
  @ApiForbiddenResponse({
    description: 'Only judges can complete the game',
  })
  async completeGame(
    @Param('id') gameId: string,
    @Query('telegramId') telegramId: string,
  ): Promise<GameResponseDto> {
    if (!telegramId) {
      throw new HttpException('telegramId is required', HttpStatus.BAD_REQUEST);
    }

    try {
      const game = await this.gameService.completeGame(
        gameId,
        parseInt(telegramId, 10),
      );
      return this.mapGameToResponse(game);
    } catch (error: any) {
      throw new HttpException(
        error.message || 'Failed to complete game',
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post('import-result')
  @ApiOperation({
    summary: '[TEST/ADMIN] Import game result',
    description: 'Import a completed game result with players, judges, and scores. Useful for adding historical games or testing. Supports short games (OG+OO only) and ironman positions.',
  })
  @ApiBody({
    description: 'Game result data',
    type: ImportGameResultDto,
  })
  @ApiResponse({
    status: 201,
    description: 'Game imported successfully',
    type: GameResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data',
  })
  async importGameResult(
    @Body() importDto: ImportGameResultDto,
  ): Promise<GameResponseDto> {
    try {
      const game = await this.gameService.importGameResult(importDto);
      return this.mapGameToResponse(game);
    } catch (error: any) {
      throw new HttpException(
        error.message || 'Failed to import game result',
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }

  // Helper method to map Participant entity to response DTO
  private mapParticipantToResponse(participant: any): GameParticipantSimpleResponseDto {
    return {
      id: participant.id,
      gameId: participant.gameId,
      telegramId: participant.telegramId,
      username: participant.username,
      firstName: participant.firstName,
      role: participant.role as ParticipantRole,
      registeredAt: participant.registeredAt,
    };
  }
}
