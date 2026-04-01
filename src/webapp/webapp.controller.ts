import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { WebAppService } from './webapp.service';
import { WebAppAuthGuard, type WebAppRequest } from './guards/webapp-auth.guard';
import type {
  ApiResponse,
  WebAppConfigResponse,
  GameListItemDto,
  GameDetailsDto,
  UserProfileDto,
  JudgeStatsDto,
  RoomAllocationDto,
  JoinGameRequestDto,
} from './dtos/webapp.dto';

@Controller('webapp')
@UseGuards(WebAppAuthGuard)
export class WebAppController {
  constructor(private readonly webAppService: WebAppService) {}

  @Get('config')
  async getConfig(): Promise<ApiResponse<WebAppConfigResponse>> {
    return {
      success: true,
      data: this.webAppService.getConfig(),
    };
  }

  @Get('games')
  async getOpenGames(
    @Req() req: Request & WebAppRequest,
  ): Promise<ApiResponse<GameListItemDto[]>> {
    const games = await this.webAppService.getOpenGames(req.telegramUser.id);
    return {
      success: true,
      data: games,
    };
  }

  @Get('games/my')
  async getMyGame(
    @Req() req: Request & WebAppRequest,
  ): Promise<ApiResponse<GameDetailsDto | null>> {
    const game = await this.webAppService.getMyGame(req.telegramUser.id);
    return {
      success: true,
      data: game,
    };
  }

  @Get('games/:id')
  async getGameById(
    @Param('id') id: string,
    @Req() req: Request & WebAppRequest,
  ): Promise<ApiResponse<GameDetailsDto>> {
    const game = await this.webAppService.getGameById(id, req.telegramUser.id);
    return {
      success: true,
      data: game,
    };
  }

  @Post('games/:id/join')
  @HttpCode(HttpStatus.OK)
  async joinGame(
    @Param('id') id: string,
    @Body() body: JoinGameRequestDto,
    @Req() req: Request & WebAppRequest,
  ): Promise<ApiResponse<void>> {
    await this.webAppService.joinGame(
      id,
      req.telegramUser.id,
      body.role as import('../game/entities/game-participant.entity').ParticipantRole,
    );
    return {
      success: true,
    };
  }

  @Post('games/:id/leave')
  @HttpCode(HttpStatus.OK)
  async leaveGame(
    @Param('id') id: string,
    @Req() req: Request & WebAppRequest,
  ): Promise<ApiResponse<void>> {
    await this.webAppService.leaveGame(id, req.telegramUser.id);
    return {
      success: true,
    };
  }

  @Get('games/:id/rooms')
  async getRoomAllocations(
    @Param('id') id: string,
  ): Promise<ApiResponse<RoomAllocationDto[]>> {
    const rooms = await this.webAppService.getRoomAllocations(id);
    return {
      success: true,
      data: rooms,
    };
  }

  @Get('profile')
  async getProfile(
    @Req() req: Request & WebAppRequest,
  ): Promise<ApiResponse<UserProfileDto>> {
    const profile = await this.webAppService.getUserProfile(req.telegramUser.id);
    return {
      success: true,
      data: profile,
    };
  }

  @Get('profile/judge-stats')
  async getJudgeStats(
    @Req() req: Request & WebAppRequest,
  ): Promise<ApiResponse<JudgeStatsDto>> {
    const stats = await this.webAppService.getJudgeStats(req.telegramUser.id);
    return {
      success: true,
      data: stats,
    };
  }
}
