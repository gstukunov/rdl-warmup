import { Workbook } from 'exceljs';
import type { Repository } from 'typeorm';
import { GameVisitsExportService } from './game-visits-export.service';
import { Game, GameStatus } from '../game/entities/game.entity';
import {
  GameParticipant,
  ParticipantRole,
} from '../game/entities/game-participant.entity';
import { SpeakerScore } from '../game/entities/speaker-score.entity';
import { JudgeFeedback } from '../game/entities/judge-feedback.entity';
import { User } from '../user/entities/user.entity';

/**
 * Minimal in-memory stand-in for a TypeORM repository.
 * Supports `find()` and `find({ where: { field: In([...]) } })`.
 */
function fakeRepository<T extends object>(rows: T[]): Repository<T> {
  return {
    find: jest.fn((options?: { where?: Record<string, unknown> }) => {
      const where = options?.where;
      if (!where) return Promise.resolve(rows);
      const filtered = rows.filter((row) =>
        Object.entries(where).every(([field, condition]) => {
          const value = String((row as Record<string, unknown>)[field]);
          if (
            condition &&
            typeof condition === 'object' &&
            'value' in condition
          ) {
            const allowed = (condition as { value: unknown[] }).value;
            return allowed.map(String).includes(value);
          }
          return String(condition) === value;
        }),
      );
      return Promise.resolve(filtered);
    }),
  } as unknown as Repository<T>;
}

const ALICE = 1001; // registered player, has a users row
const BOB = 1002; // registered judge, also judge in scores/feedback
const CAROL = 1003; // registered player, NO users row -> name from participant
const DAVE = 1004; // appears ONLY in speaker_scores
const ERIN = 1005; // appears ONLY in legacy settings.roomAllocations (player)
const FRANK = 1006; // appears ONLY in legacy settings.roomAllocations (judge)
const GRACE = 1007; // appears ONLY in judge_feedback as the judge

function game(partial: Partial<Game>): Game {
  return Object.assign(new Game(), {
    description: null,
    gamePassword: null,
    motion: null,
    startTime: null,
    endTime: null,
    totalRounds: 1,
    currentRound: 0,
    maxParticipants: 8,
    createdByTelegramId: null,
    isAllocated: false,
    isFeedbackHidden: false,
    settings: {},
    updatedAt: new Date('2026-01-01'),
    ...partial,
  });
}

function participant(
  gameId: string,
  telegramId: number,
  role: ParticipantRole,
  firstName: string | null = null,
): GameParticipant {
  return Object.assign(new GameParticipant(), {
    id: `${gameId}-${telegramId}`,
    gameId,
    telegramId,
    userId: null,
    username: null,
    firstName,
    role,
    teamName: null,
    isRegistered: true,
    metadata: {},
    registeredAt: new Date(),
  });
}

describe('GameVisitsExportService', () => {
  const games: Game[] = [
    game({
      id: 'g-completed-1',
      name: 'Разминка',
      status: GameStatus.COMPLETED,
      startTime: new Date('2026-05-01T18:00:00Z'),
      createdAt: new Date('2026-04-30T10:00:00Z'),
      motion: 'ЭП запретила бы соцсети',
    }),
    // Same name as the first game, later date: header must stay distinguishable
    game({
      id: 'g-completed-2',
      name: 'Разминка',
      status: GameStatus.COMPLETED,
      startTime: new Date('2026-05-15T18:00:00Z'),
      createdAt: new Date('2026-05-14T10:00:00Z'),
    }),
    // Not completed: still exported (all games), with status in the header
    game({
      id: 'g-registration',
      name: 'Новая игра',
      status: GameStatus.REGISTRATION,
      createdAt: new Date('2026-05-20T10:00:00Z'),
    }),
    // Cancelled legacy game whose only participation record is the settings JSON
    game({
      id: 'g-legacy',
      name: 'Старая игра',
      status: GameStatus.CANCELLED,
      startTime: new Date('2026-04-10T18:00:00Z'),
      createdAt: new Date('2026-04-09T10:00:00Z'),
      settings: {
        roomAllocations: [
          {
            roomNumber: 1,
            participants: [
              { telegramId: ERIN, position: 'OG', isIronman: false },
            ],
            judges: [{ telegramId: FRANK }],
          },
        ],
      },
    }),
  ];

  const participants: GameParticipant[] = [
    participant('g-completed-1', ALICE, ParticipantRole.PLAYER),
    participant('g-completed-1', BOB, ParticipantRole.JUDGE),
    participant('g-registration', CAROL, ParticipantRole.PLAYER, 'Кэрол'),
  ];

  const scores: SpeakerScore[] = [
    Object.assign(new SpeakerScore(), {
      id: 's1',
      gameId: 'g-completed-2',
      telegramId: DAVE,
      position: 'opening_government',
      score: 75,
      isIronman: false,
      judgeTelegramId: BOB,
      submittedAt: new Date(),
    }),
  ];

  const feedbacks: JudgeFeedback[] = [
    Object.assign(new JudgeFeedback(), {
      id: 'f1',
      gameId: 'g-completed-2',
      playerTelegramId: DAVE,
      judgeTelegramId: GRACE,
      score: 7,
      feedback: null,
      submittedAt: new Date(),
    }),
  ];

  const users: User[] = [
    Object.assign(new User(), {
      id: 'u1',
      telegramId: ALICE,
      username: 'alice',
      firstName: 'Алиса',
      lastName: 'Иванова',
    }),
    Object.assign(new User(), {
      id: 'u2',
      telegramId: BOB,
      username: null,
      firstName: 'Боб',
      lastName: null,
    }),
    Object.assign(new User(), {
      id: 'u3',
      telegramId: GRACE,
      username: 'grace',
      firstName: 'Грейс',
      lastName: 'Судейская',
    }),
  ];

  let visits: Record<string, (string | number | null)[]>;
  let headers: string[];
  let gamesSheetRows: (string | number | null)[][];

  beforeAll(async () => {
    const service = new GameVisitsExportService(
      fakeRepository(games),
      fakeRepository(participants),
      fakeRepository(scores),
      fakeRepository(feedbacks),
      fakeRepository(users),
    );

    const buffer = await service.buildWorkbook();
    const workbook = new Workbook();
    await workbook.xlsx.load(buffer as unknown as ArrayBuffer);

    const sheet = workbook.getWorksheet('Посещения');
    if (!sheet) throw new Error('Sheet "Посещения" missing');

    // exceljs returns a sparse 1-based array; blank cells are holes, so
    // normalise them to null and fill the row up to the header width.
    const rowValues = (row: import('exceljs').Row, width: number) => {
      const raw = (row.values as (string | number | null | undefined)[]).slice(
        1,
      );
      return Array.from({ length: width }, (_, i) => raw[i] ?? null);
    };

    headers = rowValues(sheet.getRow(1), sheet.columnCount) as string[];
    visits = {};
    sheet.eachRow((row, index) => {
      if (index === 1) return;
      const values = rowValues(row, headers.length);
      visits[String(values[0])] = values;
    });

    const gamesSheet = workbook.getWorksheet('Игры');
    if (!gamesSheet) throw new Error('Sheet "Игры" missing');
    gamesSheetRows = [];
    gamesSheet.eachRow((row) =>
      gamesSheetRows.push(rowValues(row, gamesSheet.columnCount)),
    );
  });

  it('exports every game as a column, ordered by date, whatever its status', () => {
    expect(headers.slice(0, 2)).toEqual(['Участник', 'Username']);
    expect(headers.slice(2, 6)).toEqual([
      'Старая игра\n10.04.2026 (отменена)',
      'Разминка\n01.05.2026',
      'Разминка\n15.05.2026',
      'Новая игра\n20.05.2026 (регистрация)',
    ]);
    expect(headers.slice(6)).toEqual(['Игрок', 'Судья', 'Всего']);
  });

  it('lists people from every participation source, sorted by name', () => {
    expect(Object.keys(visits)).toEqual([
      'Алиса Иванова',
      'Боб',
      'Грейс Судейская',
      'Кэрол',
      `ID ${DAVE}`,
      `ID ${ERIN}`,
      `ID ${FRANK}`,
    ]);
  });

  it('marks registered participants with their role', () => {
    const [, username, legacy, first, second, registration, p, j, total] =
      visits['Алиса Иванова'];
    expect(username).toBe('@alice');
    expect([legacy, first, second, registration]).toEqual([
      null,
      'Игрок',
      null,
      null,
    ]);
    expect([p, j, total]).toEqual([1, 0, 1]);
  });

  it('counts a judge from registrations and from speaker scores', () => {
    const [, , legacy, first, second, registration, p, j, total] =
      visits['Боб'];
    expect([legacy, first, second, registration]).toEqual([
      null,
      'Судья',
      'Судья',
      null,
    ]);
    expect([p, j, total]).toEqual([0, 2, 2]);
  });

  it('includes a player known only from speaker scores / judge feedback', () => {
    const [, , legacy, first, second, registration, p, j, total] =
      visits[`ID ${DAVE}`];
    expect([legacy, first, second, registration]).toEqual([
      null,
      null,
      'Игрок',
      null,
    ]);
    expect([p, j, total]).toEqual([1, 0, 1]);
  });

  it('includes a judge known only from judge feedback', () => {
    const [, , , , second, , p, j] = visits['Грейс Судейская'];
    expect(second).toBe('Судья');
    expect([p, j]).toEqual([0, 1]);
  });

  it('includes people known only from the legacy roomAllocations JSON', () => {
    expect(visits[`ID ${ERIN}`][2]).toBe('Игрок');
    expect(visits[`ID ${FRANK}`][2]).toBe('Судья');
  });

  it('falls back to the participant first name when there is no users row', () => {
    const [, , , , , registration] = visits['Кэрол'];
    expect(registration).toBe('Игрок');
  });

  it('writes a games sheet with one row per game and headcounts', () => {
    expect(gamesSheetRows[0]).toEqual([
      'Игра',
      'Дата',
      'Статус',
      'Тема',
      'Игроков',
      'Судей',
      'Всего участников',
    ]);
    expect(gamesSheetRows).toHaveLength(1 + games.length);
    expect(gamesSheetRows[2]).toEqual([
      'Разминка',
      '01.05.2026',
      'завершена',
      'ЭП запретила бы соцсети',
      1,
      1,
      2,
    ]);
    // Dave (player) + Bob (judge via scores) + Grace (judge via feedback)
    expect(gamesSheetRows[3].slice(4)).toEqual([1, 2, 3]);
  });
});
