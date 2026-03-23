import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  HttpException,
  HttpStatus,
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
import {
  GameResponseDto,
  GameParticipantSimpleResponseDto,
} from './dto/game-response.dto';
import { ParticipantRole } from './entities/game-participant.entity';
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
