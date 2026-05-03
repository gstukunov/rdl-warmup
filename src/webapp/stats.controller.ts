import { Controller, Get } from '@nestjs/common';
import { WebAppService } from './webapp.service';
import type { ApiResponse, GameParticipationDto, GameMotionDto } from './dtos/webapp.dto';

interface SpeakerStatDto {
  telegramId: number;
  username: string | null;
  firstName: string;
  gamesPlayed: number;
  averageScore: number;
}

interface JudgeStatDto {
  telegramId: number;
  username: string | null;
  firstName: string;
  gamesJudged: number;
  averageScore: number;
}

interface StatsResponse {
  speakers: SpeakerStatDto[];
  judges: JudgeStatDto[];
}

@Controller('api/stats')
export class StatsController {
  constructor(private readonly webAppService: WebAppService) {}

  @Get()
  async getStats(): Promise<ApiResponse<StatsResponse>> {
    const stats = await this.webAppService.getPublicStats();
    return {
      success: true,
      data: stats,
    };
  }

  @Get('games')
  async getGameParticipations(): Promise<ApiResponse<GameParticipationDto[]>> {
    const data = await this.webAppService.getGameParticipations();
    return {
      success: true,
      data,
    };
  }

  @Get('motions')
  async getGameMotions(): Promise<ApiResponse<GameMotionDto[]>> {
    const data = await this.webAppService.getGameMotions();
    return {
      success: true,
      data,
    };
  }
}
