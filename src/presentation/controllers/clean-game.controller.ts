/**
 * Clean Game Controller
 * 
 * REST API controller using Clean Architecture.
 * This demonstrates the new architecture alongside the existing code.
 */

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
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { CreateGameCommand } from '../../application/commands/create-game.command';
import { GetGameByIdQuery } from '../../application/queries/get-game-by-id.query';
import { GetOpenGamesQuery } from '../../application/queries/get-open-games.query';
import { mapGameToDto, GameDto } from '../../application/dtos/game.dto';
import { CreateGameDto } from '../../game/dto/create-game.dto';

@ApiTags('games-v2 (Clean Architecture)')
@Controller('games-v2')
export class CleanGameController {
  constructor(
    private readonly createGameCommand: CreateGameCommand,
    private readonly getGameByIdQuery: GetGameByIdQuery,
    private readonly getOpenGamesQuery: GetOpenGamesQuery,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get all open games (Clean Architecture)' })
  @ApiResponse({ status: 200, description: 'List of open games', type: [Object] })
  async getOpenGames(): Promise<GameDto[]> {
    const result = await this.getOpenGamesQuery.execute();

    if (!result.success) {
      throw new HttpException(
        result.error || 'Failed to fetch games',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    return result.games.map(game => mapGameToDto(game));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get game by ID (Clean Architecture)' })
  @ApiParam({ name: 'id', description: 'Game UUID' })
  @ApiResponse({ status: 200, description: 'Game found' })
  @ApiResponse({ status: 404, description: 'Game not found' })
  async getGameById(@Param('id') id: string): Promise<GameDto> {
    const result = await this.getGameByIdQuery.execute({ gameId: id });

    if (!result.success) {
      throw new HttpException(
        result.error || 'Game not found',
        HttpStatus.NOT_FOUND,
      );
    }

    return mapGameToDto(result.game!);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new game (Clean Architecture)' })
  @ApiQuery({ name: 'telegramId', required: true, description: 'Creator Telegram ID' })
  @ApiResponse({ status: 201, description: 'Game created' })
  async createGame(
    @Body() createGameDto: CreateGameDto,
    @Query('telegramId') telegramId: string,
  ): Promise<GameDto> {
    if (!telegramId) {
      throw new HttpException('telegramId is required', HttpStatus.BAD_REQUEST);
    }

    const result = await this.createGameCommand.execute({
      name: createGameDto.name,
      description: createGameDto.description,
      maxParticipants: createGameDto.maxParticipants,
      creatorTelegramId: parseInt(telegramId, 10),
    });

    if (!result.success) {
      throw new HttpException(
        result.error || 'Failed to create game',
        HttpStatus.BAD_REQUEST,
      );
    }

    return mapGameToDto(result.game!);
  }
}
