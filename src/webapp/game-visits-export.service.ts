import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Workbook } from 'exceljs';
import { Game, GameStatus } from '../game/entities/game.entity';
import {
  GameParticipant,
  ParticipantRole,
} from '../game/entities/game-participant.entity';
import { SpeakerScore } from '../game/entities/speaker-score.entity';
import { JudgeFeedback } from '../game/entities/judge-feedback.entity';
import { User } from '../user/entities/user.entity';

type VisitRole = 'player' | 'judge';

interface VisitKey {
  gameId: string;
  telegramId: number;
}

interface ExportUser {
  telegramId: number;
  fullName: string;
  username: string | null;
}

const STATUS_LABELS: Record<GameStatus, string> = {
  [GameStatus.REGISTRATION]: 'регистрация',
  [GameStatus.ALLOCATING]: 'распределение',
  [GameStatus.IN_PROGRESS]: 'идёт',
  [GameStatus.COMPLETED]: 'завершена',
  [GameStatus.CANCELLED]: 'отменена',
};

const PLAYER_LABEL = 'Игрок';
const JUDGE_LABEL = 'Судья';
const BOTH_LABEL = 'Игрок/Судья';

const solidFill = (argb: string) =>
  ({ type: 'pattern', pattern: 'solid', fgColor: { argb } }) as const;

const HEADER_FILL = solidFill('FFE8EEF5');
const PLAYER_FILL = solidFill('FFDCE9FB');
const JUDGE_FILL = solidFill('FFFCEBD1');
const BOTH_FILL = solidFill('FFE3DCF5');

/**
 * Builds an Excel workbook with a "participants × games" attendance matrix.
 *
 * Every game in the `games` table is exported, whatever its status.
 * A person counts as having visited a game if they appear for it in ANY of:
 *   - game_participants (registrations, incl. room allocations that reference them)
 *   - speaker_scores (as the scored speaker, or as the judge who scored)
 *   - judge_feedback (as the player who left feedback, or the judge it was about)
 *   - the legacy `games.settings.roomAllocations` JSON
 */
@Injectable()
export class GameVisitsExportService {
  constructor(
    @InjectRepository(Game)
    private readonly gameRepository: Repository<Game>,
    @InjectRepository(GameParticipant)
    private readonly participantRepository: Repository<GameParticipant>,
    @InjectRepository(SpeakerScore)
    private readonly speakerScoreRepository: Repository<SpeakerScore>,
    @InjectRepository(JudgeFeedback)
    private readonly judgeFeedbackRepository: Repository<JudgeFeedback>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async buildWorkbook(): Promise<Buffer> {
    const games = (await this.gameRepository.find()).sort(
      (a, b) => this.gameDate(a).getTime() - this.gameDate(b).getTime(),
    );

    const visits = await this.collectVisits(games);
    const users = await this.resolveUsers(visits);

    const workbook = new Workbook();
    workbook.creator = 'RDL Warmup';
    workbook.created = new Date();

    this.writeVisitsSheet(workbook, games, users, visits);
    this.writeGamesSheet(workbook, games, visits);

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer as ArrayBuffer);
  }

  // ---------------------------------------------------------------------------
  // Data collection
  // ---------------------------------------------------------------------------

  /**
   * Returns a map "gameId|telegramId" -> set of roles the person had in that game,
   * merged from every table that records participation.
   */
  private async collectVisits(
    games: Game[],
  ): Promise<Map<string, Set<VisitRole>>> {
    const visits = new Map<string, Set<VisitRole>>();
    if (games.length === 0) {
      return visits;
    }

    const gameIds = games.map((g) => g.id);
    const add = (key: VisitKey, role: VisitRole) => {
      if (!key.telegramId) return;
      const id = this.visitKey(key.gameId, key.telegramId);
      const roles = visits.get(id) ?? new Set<VisitRole>();
      roles.add(role);
      visits.set(id, roles);
    };

    const [participants, scores, feedbacks] = await Promise.all([
      this.participantRepository.find({ where: { gameId: In(gameIds) } }),
      this.speakerScoreRepository.find({ where: { gameId: In(gameIds) } }),
      this.judgeFeedbackRepository.find({ where: { gameId: In(gameIds) } }),
    ]);

    for (const p of participants) {
      const telegramId = Number(p.telegramId);
      for (const role of this.participantRoles(p.role)) {
        add({ gameId: p.gameId, telegramId }, role);
      }
    }

    for (const s of scores) {
      add({ gameId: s.gameId, telegramId: Number(s.telegramId) }, 'player');
      add({ gameId: s.gameId, telegramId: Number(s.judgeTelegramId) }, 'judge');
    }

    for (const f of feedbacks) {
      add(
        { gameId: f.gameId, telegramId: Number(f.playerTelegramId) },
        'player',
      );
      add({ gameId: f.gameId, telegramId: Number(f.judgeTelegramId) }, 'judge');
    }

    for (const game of games) {
      for (const room of game.legacyRoomAllocations) {
        room.participants?.forEach((p) =>
          add({ gameId: game.id, telegramId: Number(p.telegramId) }, 'player'),
        );
        room.judges?.forEach((j) =>
          add({ gameId: game.id, telegramId: Number(j.telegramId) }, 'judge'),
        );
        room.wings?.forEach((w) =>
          add({ gameId: game.id, telegramId: Number(w.telegramId) }, 'judge'),
        );
      }
    }

    return visits;
  }

  private participantRoles(role: ParticipantRole): VisitRole[] {
    switch (role) {
      case ParticipantRole.PLAYER:
        return ['player'];
      case ParticipantRole.JUDGE:
      case ParticipantRole.WING:
        return ['judge'];
      case ParticipantRole.BOTH:
        return ['player', 'judge'];
      default:
        return ['player'];
    }
  }

  /**
   * Resolves display names for every telegram id seen in the visits.
   * Prefers the users table; falls back to names stored on game_participants.
   */
  private async resolveUsers(
    visits: Map<string, Set<VisitRole>>,
  ): Promise<ExportUser[]> {
    const telegramIds = new Set<number>();
    for (const key of visits.keys()) {
      telegramIds.add(this.telegramIdFromKey(key));
    }
    if (telegramIds.size === 0) {
      return [];
    }

    const ids = Array.from(telegramIds);
    const [users, participants] = await Promise.all([
      this.userRepository.find({ where: { telegramId: In(ids) } }),
      this.participantRepository.find({ where: { telegramId: In(ids) } }),
    ]);

    const userMap = new Map(users.map((u) => [Number(u.telegramId), u]));
    const participantMap = new Map<number, GameParticipant>();
    for (const p of participants) {
      const id = Number(p.telegramId);
      if (!participantMap.has(id)) participantMap.set(id, p);
    }

    return ids
      .map((telegramId) => {
        const user = userMap.get(telegramId);
        const participant = participantMap.get(telegramId);
        const fullName =
          `${user?.firstName ?? participant?.firstName ?? ''} ${user?.lastName ?? ''}`.trim();
        return {
          telegramId,
          fullName: fullName || `ID ${telegramId}`,
          username: user?.username ?? participant?.username ?? null,
        };
      })
      .sort((a, b) =>
        a.fullName.toLowerCase().localeCompare(b.fullName.toLowerCase(), 'ru'),
      );
  }

  // ---------------------------------------------------------------------------
  // Sheet: participants × games
  // ---------------------------------------------------------------------------

  private writeVisitsSheet(
    workbook: Workbook,
    games: Game[],
    users: ExportUser[],
    visits: Map<string, Set<VisitRole>>,
  ): void {
    const sheet = workbook.addWorksheet('Посещения', {
      views: [{ state: 'frozen', xSplit: 2, ySplit: 1 }],
    });

    const firstGameCol = 3;
    const playerTotalCol = firstGameCol + games.length;
    const judgeTotalCol = playerTotalCol + 1;
    const totalCol = judgeTotalCol + 1;

    const header = sheet.addRow([
      'Участник',
      'Username',
      ...this.gameColumnTitles(games),
      PLAYER_LABEL,
      JUDGE_LABEL,
      'Всего',
    ]);
    header.font = { bold: true };
    header.height = 48;
    header.eachCell((cell) => {
      cell.fill = HEADER_FILL;
      cell.border = { bottom: { style: 'thin' } };
      cell.alignment = {
        vertical: 'middle',
        horizontal: 'center',
        wrapText: true,
      };
    });
    header.getCell(1).alignment = { vertical: 'middle', horizontal: 'left' };
    header.getCell(2).alignment = { vertical: 'middle', horizontal: 'left' };

    for (const user of users) {
      let asPlayer = 0;
      let asJudge = 0;
      const cells: (string | number | null)[] = [
        user.fullName,
        user.username ? `@${user.username}` : '',
      ];

      for (const game of games) {
        const roles = visits.get(this.visitKey(game.id, user.telegramId));
        if (!roles) {
          cells.push(null);
          continue;
        }
        const isPlayer = roles.has('player');
        const isJudge = roles.has('judge');
        if (isPlayer) asPlayer += 1;
        if (isJudge) asJudge += 1;
        cells.push(
          isPlayer && isJudge
            ? BOTH_LABEL
            : isPlayer
              ? PLAYER_LABEL
              : JUDGE_LABEL,
        );
      }

      cells.push(asPlayer, asJudge, asPlayer + asJudge);

      const row = sheet.addRow(cells);
      row.alignment = { vertical: 'middle', horizontal: 'center' };
      row.getCell(1).alignment = { vertical: 'middle', horizontal: 'left' };
      row.getCell(2).alignment = { vertical: 'middle', horizontal: 'left' };
      row.getCell(totalCol).font = { bold: true };

      for (let col = firstGameCol; col < playerTotalCol; col++) {
        const cell = row.getCell(col);
        if (cell.value === PLAYER_LABEL) cell.fill = PLAYER_FILL;
        else if (cell.value === JUDGE_LABEL) cell.fill = JUDGE_FILL;
        else if (cell.value === BOTH_LABEL) cell.fill = BOTH_FILL;
      }
    }

    sheet.getColumn(1).width = 30;
    sheet.getColumn(2).width = 18;
    for (let col = firstGameCol; col < playerTotalCol; col++) {
      sheet.getColumn(col).width = 18;
    }
    [playerTotalCol, judgeTotalCol, totalCol].forEach((col) => {
      sheet.getColumn(col).width = 10;
    });

    sheet.eachRow((row) => {
      row.getCell(playerTotalCol).border = {
        ...row.getCell(playerTotalCol).border,
        left: { style: 'thin' },
      };
    });

    sheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: totalCol },
    };
  }

  /**
   * Column titles are the game names from the `games` table plus the game date,
   * so two games with the same name stay distinguishable. Games that are not
   * completed get their status appended.
   */
  private gameColumnTitles(games: Game[]): string[] {
    return games.map((game) => {
      const lines = [game.name];
      const date = this.formatDate(this.gameDate(game));
      const status =
        game.status === GameStatus.COMPLETED
          ? ''
          : ` (${STATUS_LABELS[game.status]})`;
      if (date || status) lines.push(`${date}${status}`.trim());
      return lines.join('\n');
    });
  }

  // ---------------------------------------------------------------------------
  // Sheet: list of games
  // ---------------------------------------------------------------------------

  private writeGamesSheet(
    workbook: Workbook,
    games: Game[],
    visits: Map<string, Set<VisitRole>>,
  ): void {
    const sheet = workbook.addWorksheet('Игры', {
      views: [{ state: 'frozen', ySplit: 1 }],
    });

    const header = sheet.addRow([
      'Игра',
      'Дата',
      'Статус',
      'Тема',
      'Игроков',
      'Судей',
      'Всего участников',
    ]);
    header.font = { bold: true };
    header.eachCell((cell) => {
      cell.fill = HEADER_FILL;
      cell.border = { bottom: { style: 'thin' } };
      cell.alignment = {
        vertical: 'middle',
        horizontal: 'center',
        wrapText: true,
      };
    });
    header.getCell(1).alignment = { vertical: 'middle', horizontal: 'left' };
    header.getCell(4).alignment = { vertical: 'middle', horizontal: 'left' };

    for (const game of games) {
      let players = 0;
      let judges = 0;
      let total = 0;
      for (const [key, roles] of visits) {
        if (!key.startsWith(`${game.id}|`)) continue;
        total += 1;
        if (roles.has('player')) players += 1;
        if (roles.has('judge')) judges += 1;
      }

      const row = sheet.addRow([
        game.name,
        this.formatDate(this.gameDate(game)),
        STATUS_LABELS[game.status] ?? game.status,
        game.motion ?? '',
        players,
        judges,
        total,
      ]);
      row.alignment = {
        vertical: 'middle',
        horizontal: 'center',
        wrapText: true,
      };
      row.getCell(1).alignment = {
        vertical: 'middle',
        horizontal: 'left',
        wrapText: true,
      };
      row.getCell(4).alignment = {
        vertical: 'middle',
        horizontal: 'left',
        wrapText: true,
      };
    }

    sheet.getColumn(1).width = 32;
    sheet.getColumn(2).width = 12;
    sheet.getColumn(3).width = 16;
    sheet.getColumn(4).width = 60;
    sheet.getColumn(5).width = 10;
    sheet.getColumn(6).width = 10;
    sheet.getColumn(7).width = 12;

    sheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: 7 },
    };
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private visitKey(gameId: string, telegramId: number): string {
    return `${gameId}|${telegramId}`;
  }

  private telegramIdFromKey(key: string): number {
    return Number(key.slice(key.indexOf('|') + 1));
  }

  private gameDate(game: Game): Date {
    return game.startTime ?? game.createdAt;
  }

  private formatDate(date: Date | null | undefined): string {
    if (!date) return '';
    const d = date instanceof Date ? date : new Date(date);
    if (Number.isNaN(d.getTime())) return '';
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return `${dd}.${mm}.${d.getFullYear()}`;
  }
}
