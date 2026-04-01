import { Controller, Get } from '@nestjs/common';
import { WebAppService } from './webapp.service';
import type { ApiResponse } from './dtos/webapp.dto';

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
}
