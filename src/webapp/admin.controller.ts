import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { WebAppService } from './webapp.service';
import { AdminAuthGuard } from './guards/admin-auth.guard';
import type {
  ApiResponse,
  AdminLoginResponseDto,
  UserOptionDto,
  CompletedGameListItemDto,
  GameDetailsDto,
  SubmitGameResultsRequestDto,
} from './dtos/webapp.dto';

@Controller('api/admin')
export class AdminController {
  constructor(private readonly webAppService: WebAppService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async adminLogin(
    @Body('password') password: string,
  ): Promise<ApiResponse<AdminLoginResponseDto>> {
    const token = await this.webAppService.adminLogin(password);
    return {
      success: true,
      data: { token },
    };
  }

  @Get('users')
  @UseGuards(AdminAuthGuard)
  async getUsersForAdmin(): Promise<ApiResponse<UserOptionDto[]>> {
    const users = await this.webAppService.getUsersForAdmin();
    return {
      success: true,
      data: users,
    };
  }

  @Get('games/completed')
  @UseGuards(AdminAuthGuard)
  async getCompletedGamesForAdmin(): Promise<ApiResponse<CompletedGameListItemDto[]>> {
    const games = await this.webAppService.getCompletedGamesForAdmin();
    return {
      success: true,
      data: games,
    };
  }

  @Get('games/:id/details')
  @UseGuards(AdminAuthGuard)
  async getGameDetailsForAdmin(
    @Param('id') id: string,
  ): Promise<ApiResponse<GameDetailsDto>> {
    const game = await this.webAppService.getGameDetailsForAdmin(id);
    return {
      success: true,
      data: game,
    };
  }

  @Post('games/results')
  @UseGuards(AdminAuthGuard)
  @HttpCode(HttpStatus.OK)
  async submitGameResults(
    @Body() body: SubmitGameResultsRequestDto,
  ): Promise<ApiResponse<void>> {
    await this.webAppService.submitGameResults(body);
    return {
      success: true,
    };
  }
}
