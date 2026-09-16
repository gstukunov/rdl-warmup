import { Controller, Get, StreamableFile } from '@nestjs/common';
import { WebAppService } from './webapp.service';
import { GameVisitsExportService } from './game-visits-export.service';
import type {
  ApiResponse,
  GameParticipationDto,
  GameMotionDto,
} from './dtos/webapp.dto';

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

const XLSX_MIME_TYPE =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

@Controller('api/stats')
export class StatsController {
  constructor(
    private readonly webAppService: WebAppService,
    private readonly gameVisitsExportService: GameVisitsExportService,
  ) {}

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

  /**
   * Excel export of every game with the people who took part in it.
   * Sheet "Посещения": participants × games matrix (role in each game + totals).
   * Sheet "Игры": one row per game with date, status, motion and headcounts.
   */
  @Get('games/export')
  async exportGameVisits(): Promise<StreamableFile> {
    const buffer = await this.gameVisitsExportService.buildWorkbook();
    const date = new Date().toISOString().slice(0, 10);

    return new StreamableFile(buffer, {
      type: XLSX_MIME_TYPE,
      disposition: `attachment; filename="game-visits-${date}.xlsx"`,
      length: buffer.length,
    });
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
