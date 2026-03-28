import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Telegraf, Context, Markup } from 'telegraf';
import { User } from './entities/user.entity';
import { GameService, AllocatedRoom } from '../game/game.service';
import { Game, GameStatus } from '../game/entities/game.entity';
import { ParticipantRole } from '../game/entities/game-participant.entity';

// Session state for multi-step interactions
interface UserSession {
  awaitingPassword?: boolean;
  selectedGameId?: string;
  awaitingRoleSelection?: boolean;
  isCreatingGame?: boolean;
  awaitingMotion?: boolean;
  awaitingScores?: boolean;
  scoresStep?: number;
  scoresData?: {
    openingGovernment?: string;
    openingOpposition?: string;
    closingGovernment?: string;
    closingOpposition?: string;
  };
  positionsToScore?: string[]; // List of positions that need scores (e.g., ['OG', 'OO'])
  awaitingJudgeFeedback?: boolean;
  judgeFeedbackStep?: 'select_judge' | 'enter_score' | 'enter_feedback';
  selectedJudgeId?: number;
  judgeFeedbackScore?: number;
  // Old judge feedback flow fields (kept for compatibility)
  waitingFor?: 'judge_feedback_judge' | 'judge_feedback_comment';
  feedbackGameId?: string;
  judgesToRate?: number[];
  judgeNames?: Record<number, string>; // judgeId -> name
  currentJudgeIndex?: number;
  feedbackData?: Record<number, number>; // judgeId -> score
  // New feedback flow fields
  feedbackStep?: 'select_judge' | 'enter_score' | 'enter_comment';
  selectedFeedbackItem?: {
    gameId: string;
    judgeTelegramId: number;
    judgeName: string;
    motion: string | null;
    gameName: string;
  };
}

@Injectable()
export class TelegramService implements OnModuleInit {
  private bot: Telegraf<Context>;
  private readonly logger = new Logger(TelegramService.name);
  private userSessions: Map<number, UserSession> = new Map();

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly gameService: GameService,
  ) {}

  onModuleInit() {
    const botToken = this.configService.get<string>('telegram.botToken');

    if (!botToken) {
      this.logger.error('Telegram bot token is not configured');
      return;
    }

    this.bot = new Telegraf(botToken);
    this.registerHandlers();
    this.bot.launch();

    this.logger.log('Telegram bot started');

    // Enable graceful stop
    process.once('SIGINT', () => this.bot.stop('SIGINT'));
    process.once('SIGTERM', () => this.bot.stop('SIGTERM'));
  }

  // Create main menu keyboard
  private async getMainMenuKeyboard(telegramId: number) {
    // Check if user has completed games and unrated judges
    const unratedJudges = await this.gameService.getUnratedJudgesWithMotion(telegramId);
    
    if (unratedJudges.length > 0) {
      return Markup.keyboard([
        ['🎮 Игры', '📊 Профиль'],
        [`⭐ Оставить отзыв (${unratedJudges.length})`, '❓ Помощь'],
      ]).resize();
    }
    
    return Markup.keyboard([['🎮 Игры', '📊 Профиль'], ['❓ Помощь']]).resize();
  }

  // Create games submenu keyboard
  private async getGamesMenuKeyboard(telegramId: number) {
    const activeGame = await this.gameService.getUserActiveGame(telegramId);

    if (!activeGame) {
      return Markup.keyboard([
        ['➕ Создать игру', '🎯 Присоединиться к игре'],
        ['📋 Список игр', '◀️ Назад в меню'],
      ]).resize();
    }

    // Show different buttons based on game status
    if (activeGame.status === GameStatus.REGISTRATION) {
      const isParticipant = await this.gameService.isUserRegistered(
        activeGame.id,
        telegramId,
      );
      const isCreator = activeGame.createdByTelegramId === telegramId;

      if (isParticipant) {
        const buttons: string[][] = [
          ['🎲 Распределить позиции', '📋 Состав комнат'],
          ['📋 Моя игра', '❌ Покинуть игру'],
        ];

        // Add cancel button only for creator
        if (isCreator) {
          buttons.push(['🚫 Отменить игру']);
        }

        buttons.push(['◀️ Назад в меню']);
        return Markup.keyboard(buttons).resize();
      } else {
        // User is not a participant in this game - show join button
        return Markup.keyboard([
          ['🎯 Присоединиться к игре'],
          ['📋 Состав комнат'],
          ['◀️ Назад в меню'],
        ]).resize();
      }
    } else if (activeGame.status === GameStatus.ALLOCATING) {
      // Reload game with participants to check role
      const freshGame = await this.gameService.getGameById(activeGame.id);
      const participant = freshGame?.participants?.find(
        (p) => Number(p.telegramId) === telegramId,
      );
      const isJudge = participant?.role === ParticipantRole.JUDGE;

      if (isJudge) {
        return Markup.keyboard([
          ['📝 Установить тему'],
          ['📋 Состав комнат', '📋 Моя игра'],
          ['◀️ Назад в меню'],
        ]).resize();
      } else if (participant) {
        // Regular player
        return Markup.keyboard([
          ['📋 Состав комнат', '📋 Моя игра'],
          ['◀️ Назад в меню'],
        ]).resize();
      } else {
        // Not a participant
        return Markup.keyboard([
          ['📋 Состав комнат'],
          ['◀️ Назад в меню'],
        ]).resize();
      }
    } else if (activeGame.status === GameStatus.IN_PROGRESS) {
      // Check if user is a judge
      const isJudge = activeGame.participants?.some(
        (p) =>
          Number(p.telegramId) === telegramId &&
          p.role === ParticipantRole.JUDGE,
      );

      if (isJudge) {
        return Markup.keyboard([
          ['🎯 Ввести оценки', '🏆 Завершить игру'],
          ['📋 Состав комнат', '📋 Моя игра'],
          ['◀️ Назад в меню'],
        ]).resize();
      }

      return Markup.keyboard([
        ['📋 Состав комнат', '📋 Моя игра'],
        ['◀️ Назад в меню'],
      ]).resize();
    } else if (activeGame.status === GameStatus.COMPLETED) {
      // Game is completed - show minimal options
      // Feedback is now handled from main menu via "⭐ Оставить отзыв" button
      return Markup.keyboard([
        ['📋 Состав комнат', '📋 Моя игра'],
        ['◀️ Назад в меню'],
      ]).resize();
    }

    return Markup.keyboard([['📋 Моя игра'], ['◀️ Назад в меню']]).resize();
  }

  // Create role selection keyboard
  private getRoleSelectionKeyboard() {
    return Markup.inlineKeyboard([
      [
        Markup.button.callback('🎤 Спикер (игрок)', 'role_player'),
        Markup.button.callback('⚖️ Судья', 'role_judge'),
      ],
      [Markup.button.callback('❌ Отмена', 'cancel_registration')],
    ]);
  }

  private registerHandlers() {
    // Handle menu button clicks
    this.bot.hears('🚀 Старт', async (ctx) => {
      await this.handleStart(ctx);
    });

    this.bot.hears('📊 Профиль', async (ctx) => {
      await this.handleProfile(ctx);
    });

    this.bot.hears('❓ Помощь', async (ctx) => {
      await this.handleHelp(ctx);
    });

    // Games menu
    this.bot.hears('🎮 Игры', async (ctx) => {
      await this.handleGamesMenu(ctx);
    });

    this.bot.hears('◀️ Назад в меню', async (ctx) => {
      if (!ctx.from) return;
      await ctx.reply('Главное меню:', await this.getMainMenuKeyboard(ctx.from.id));
    });

    // Game actions
    this.bot.hears('➕ Создать игру', async (ctx) => {
      await this.handleCreateGameStart(ctx);
    });

    this.bot.hears('🎯 Присоединиться к игре', async (ctx) => {
      await this.handleJoinGame(ctx);
    });

    this.bot.hears('📋 Список игр', async (ctx) => {
      await this.handleListGames(ctx);
    });

    this.bot.hears('📋 Моя игра', async (ctx) => {
      await this.handleMyGame(ctx);
    });

    this.bot.hears('❌ Покинуть игру', async (ctx) => {
      await this.handleLeaveGame(ctx);
    });

    this.bot.hears('🚫 Отменить игру', async (ctx) => {
      await this.handleCancelGame(ctx);
    });

    // New allocation actions
    this.bot.hears('🎲 Распределить позиции', async (ctx) => {
      await this.handleAllocatePositions(ctx);
    });

    this.bot.hears('📋 Состав комнат', async (ctx) => {
      await this.handleShowRoomComposition(ctx);
    });

    this.bot.hears('📝 Установить тему', async (ctx) => {
      await this.handleSetMotionStart(ctx);
    });

    // Score submission
    this.bot.hears('🎯 Ввести оценки', async (ctx) => {
      await this.handleSubmitScoresStart(ctx);
    });

    this.bot.hears('🏆 Завершить игру', async (ctx) => {
      await this.handleCompleteGame(ctx);
    });

    // Callback queries for inline buttons
    this.bot.action('role_player', async (ctx) => {
      await this.handleRoleSelection(ctx, ParticipantRole.PLAYER);
    });

    this.bot.action('role_judge', async (ctx) => {
      await this.handleRoleSelection(ctx, ParticipantRole.JUDGE);
    });

    this.bot.action('cancel_registration', async (ctx) => {
      await this.handleCancelRegistration(ctx);
    });

    this.bot.action(/^join_game:(.+)$/, async (ctx) => {
      const gameId = ctx.match[1];
      await this.handleGameRegistration(ctx, gameId);
    });

    // Start command
    this.bot.start(async (ctx) => {
      await this.handleStart(ctx);
    });

    this.bot.command('profile', async (ctx) => {
      await this.handleProfile(ctx);
    });

    this.bot.command('help', async (ctx) => {
      await this.handleHelp(ctx);
    });

    // Game-related commands
    this.bot.command('games', async (ctx) => {
      await this.handleGamesMenu(ctx);
    });

    this.bot.command('creategame', async (ctx) => {
      await this.handleCreateGameStart(ctx);
    });

    this.bot.command('joingame', async (ctx) => {
      await this.handleJoinGame(ctx);
    });

    this.bot.command('listgames', async (ctx) => {
      await this.handleListGames(ctx);
    });

    this.bot.command('mygame', async (ctx) => {
      await this.handleMyGame(ctx);
    });

    this.bot.command('allocate', async (ctx) => {
      await this.handleAllocatePositions(ctx);
    });

    this.bot.command('rooms', async (ctx) => {
      await this.handleShowRoomComposition(ctx);
    });

    this.bot.command('motion', async (ctx) => {
      await this.handleSetMotionStart(ctx);
    });

    this.bot.command('scores', async (ctx) => {
      await this.handleSubmitScoresStart(ctx);
    });

    this.bot.command('endgame', async (ctx) => {
      await this.handleCompleteGame(ctx);
    });

    this.bot.command('leave', async (ctx) => {
      await this.handleLeaveGame(ctx);
    });

    this.bot.command('cancelgame', async (ctx) => {
      await this.handleCancelGame(ctx);
    });

    this.bot.command('feedback', async (ctx) => {
      await this.handleFeedbackMenu(ctx);
    });

    this.bot.command('rate', async (ctx) => {
      await this.handleFeedbackMenu(ctx);
    });

    // Russian text command equivalents
    this.bot.hears(['игры', 'games', '🎮 игры'], async (ctx) => {
      await this.handleGamesMenu(ctx);
    });

    this.bot.hears(['профиль', 'profile', '📊 профиль'], async (ctx) => {
      await this.handleProfile(ctx);
    });

    this.bot.hears(['помощь', 'help', '❓ помощь'], async (ctx) => {
      await this.handleHelp(ctx);
    });

    this.bot.hears(
      ['создать игру', 'creategame', '➕ создать игру'],
      async (ctx) => {
        await this.handleCreateGameStart(ctx);
      },
    );

    this.bot.hears(
      ['присоединиться', 'joingame', '🎯 присоединиться к игре'],
      async (ctx) => {
        await this.handleJoinGame(ctx);
      },
    );

    this.bot.hears(
      ['список игр', 'listgames', '📋 список игр'],
      async (ctx) => {
        await this.handleListGames(ctx);
      },
    );

    this.bot.hears(['моя игра', 'mygame', '📋 моя игра'], async (ctx) => {
      await this.handleMyGame(ctx);
    });

    this.bot.hears(
      ['распределить', 'allocate', '🎲 распределить позиции'],
      async (ctx) => {
        await this.handleAllocatePositions(ctx);
      },
    );

    this.bot.hears(['комнаты', 'rooms', '📋 состав комнат'], async (ctx) => {
      await this.handleShowRoomComposition(ctx);
    });

    this.bot.hears(['тема', 'motion', '📝 установить тему'], async (ctx) => {
      await this.handleSetMotionStart(ctx);
    });

    this.bot.hears(['оценки', 'scores', '🎯 ввести оценки'], async (ctx) => {
      await this.handleSubmitScoresStart(ctx);
    });

    this.bot.hears(
      ['завершить', 'endgame', '🏆 завершить игру'],
      async (ctx) => {
        await this.handleCompleteGame(ctx);
      },
    );

    this.bot.hears(['покинуть', 'leave', '❌ покинуть игру'], async (ctx) => {
      await this.handleLeaveGame(ctx);
    });

    this.bot.hears(
      ['отменить игру', 'cancelgame', '🚫 отменить игру'],
      async (ctx) => {
        await this.handleCancelGame(ctx);
      },
    );

    // Judge feedback - redirect all to new flow
    this.bot.hears(
      ['⭐ Оценить судей', 'оценить судей', 'ratejudges', '⭐ Оставить отзыв'],
      async (ctx) => {
        await this.handleFeedbackMenu(ctx);
      },
    );

    // Button with count: "⭐ Оставить отзыв (N)"
    this.bot.hears(/^⭐ Оставить отзыв \(\d+\)$/, async (ctx) => {
      await this.handleFeedbackMenu(ctx);
    });

    this.bot.hears(['оставить отзыв', 'feedback', 'отзыв'], async (ctx) => {
      await this.handleFeedbackMenu(ctx);
    });

    // Callback for judge selection in new feedback flow (short prefix due to 64-byte limit)
    this.bot.action(/^fb:(.+):(.+)$/, async (ctx) => {
      try {
        const gameId = ctx.match[1];
        const judgeTelegramId = parseInt(ctx.match[2], 10);
        await this.handleJudgeSelection(ctx, gameId, judgeTelegramId);
      } catch (error) {
        // Ignore callback errors (query expired, etc.)
      }
    });

    // Cancel feedback selection
    this.bot.action('cancel_feedback', async (ctx) => {
      try {
        await ctx.answerCbQuery();
      } catch (error) {
        // Callback query expired, ignore
      }
      try {
        await ctx.deleteMessage();
      } catch (error) {
        // Message already deleted or expired, ignore
      }
      if (ctx.from) {
        await ctx.reply(
          'Оценка отменена.',
          await this.getMainMenuKeyboard(ctx.from.id),
        );
      }
    });

    // Handle text messages (for password, motion, scores, and judge feedback input)
    this.bot.on('text', async (ctx) => {
      await this.handleTextMessage(ctx);
    });
  }

  private async handleStart(ctx: Context) {
    try {
      const telegramUser = ctx.from;

      if (!telegramUser) {
        await ctx.reply(
          'Не удалось идентифицировать пользователя. Попробуйте ещё раз.',
        );
        return;
      }

      // Check if user already exists
      let user = await this.userRepository.findOne({
        where: { telegramId: telegramUser.id },
      });

      if (user) {
        const avgScore = this.calculateAverageScore(user.speakerScores);
        await ctx.reply(
          `С возвращением, ${user.firstName || user.username || 'спикер'}! 🎉\n\n` +
            `Ваша статистика:\n` +
            `• Игр сыграно: ${user.gamesPlayed}\n` +
            `• Средний спикерский балл: ${avgScore}`,
          await this.getMainMenuKeyboard(telegramUser.id),
        );
      } else {
        // Create new user
        user = this.userRepository.create({
          telegramId: telegramUser.id,
          username: telegramUser.username || null,
          firstName: telegramUser.first_name || null,
          lastName: telegramUser.last_name || null,
          gamesPlayed: 0,
          speakerScores: [],
          totalPoints: 0,
        });

        await this.userRepository.save(user);

        await ctx.reply(
          `Добро пожаловать в британский парламентский дебатный бот, ${telegramUser.first_name || 'спикер'}! 🎉\n\n` +
            `Вы успешно зарегистрированы.\n\n` +
            `Используйте меню ниже для навигации:`,
          await this.getMainMenuKeyboard(telegramUser.id),
        );
      }
    } catch (error) {
      this.logger.error('Error in start command:', error);
      await ctx.reply('Произошла ошибка. Попробуйте позже.');
    }
  }

  private async handleProfile(ctx: Context) {
    try {
      const telegramUser = ctx.from;

      if (!telegramUser) {
        await ctx.reply('Не удалось идентифицировать пользователя.');
        return;
      }

      const user = await this.userRepository.findOne({
        where: { telegramId: telegramUser.id },
      });

      if (!user) {
        await ctx.reply(
          'Вы ещё не зарегистрированы. Нажмите "🚀 Старт" для регистрации.',
          await this.getMainMenuKeyboard(telegramUser.id),
        );
        return;
      }

      const avgScore = this.calculateAverageScore(user.speakerScores);
      
      // Get judge rating if user has been a judge
      const judgeStats = await this.gameService.getJudgeAverageRating(user.telegramId);
      const hasJudgeStats = judgeStats.totalFeedbacks > 0;

      let message = `📊 Ваш профиль\n\n` +
        `Имя: ${user.firstName || ''} ${user.lastName || ''}\n` +
        `Юзернейм: ${user.username ? '@' + user.username : 'Не указан'}\n\n` +
        `🏆 Статистика спикера:\n` +
        `• Игр сыграно: ${user.gamesPlayed}\n` +
        `• Средний спикерский балл: ${avgScore}\n`;

      if (hasJudgeStats) {
        message += `\n⚖️ Статистика судьи:\n` +
          `• Средняя оценка: ${judgeStats.averageScore}/10\n` +
          `• Получено отзывов: ${judgeStats.totalFeedbacks}\n`;
      }

      await ctx.reply(message, await this.getMainMenuKeyboard(telegramUser.id));
    } catch (error) {
      this.logger.error('Error in profile command:', error);
      await ctx.reply('Произошла ошибка. Попробуйте позже.');
    }
  }

  private async handleHelp(ctx: Context) {
    await ctx.reply(
      `🤖 Британский парламентский дебатный бот\n\n` +
        `📋 Доступные команды:\n\n` +
        `Общие команды:\n` +
        `/start — Регистрация/приветствие\n` +
        `/profile (или "профиль") — Ваша статистика\n` +
        `/help (или "помощь") — Эта справка\n\n` +
        `🎮 Управление играми:\n` +
        `/games (или "игры") — Меню игр\n` +
        `/creategame (или "создать игру") — Создать новую игру\n` +
        `/joingame (или "присоединиться") — Присоединиться к игре\n` +
        `/listgames (или "список игр") — Список открытых игр\n` +
        `/mygame (или "моя игра") — Ваша активная игра\n` +
        `/leave (или "покинуть") — Покинуть игру (до начала)\n` +
        `/cancelgame (или "отменить игру") — Отменить игру (организатор)\n\n` +
        `🎲 Управление игрой:\n` +
        `/allocate (или "распределить") — Распределить позиции\n` +
        `/rooms (или "комнаты") — Показать состав комнат\n` +
        `/motion (или "тема") — Установить тему (судья)\n\n` +
        `📝 После игры (только для судей):\n` +
        `/scores (или "оценки") — Ввести оценки спикеров\n` +
        `/endgame (или "завершить") — Завершить игру\n\n` +
        `⭐ После игры (только для игроков):\n` +
        `/feedback (или "оценить судей") — Оценить судей (оценка 1-10)\n\n` +
        `💡 Можно использовать как кнопки меню, так и текстовые команды!`,
      await this.getMainMenuKeyboard(ctx.from!.id),
    );
  }

  private async handleGamesMenu(ctx: Context) {
    if (!ctx.from) return;

    await ctx.reply(
      '🎮 Меню игр\n\nВыберите действие:',
      await this.getGamesMenuKeyboard(ctx.from.id),
    );
  }

  private async handleCreateGameStart(ctx: Context) {
    if (!ctx.from) return;

    // Check if user already has an active game
    const activeGame = await this.gameService.getUserActiveGame(ctx.from.id);
    if (activeGame) {
      await ctx.reply(
        'У вас уже есть активная игра. Завершите её перед созданием новой.',
        await this.getGamesMenuKeyboard(ctx.from.id),
      );
      return;
    }

    // Start password verification flow
    this.userSessions.set(ctx.from.id, { awaitingPassword: true });

    await ctx.reply(
      '🔐 Для создания игры введите пароль организатора:',
      Markup.removeKeyboard(),
    );
  }

  private async handleJoinGame(ctx: Context) {
    if (!ctx.from) return;

    // Get open games
    const openGames = await this.gameService.getOpenGames();

    if (openGames.length === 0) {
      await ctx.reply(
        '❌ Сейчас нет открытых игр для регистрации.',
        await this.getGamesMenuKeyboard(ctx.from.id),
      );
      return;
    }

    // Build inline keyboard with games
    const gameButtons = openGames.map((game) => [
      Markup.button.callback(
        `${game.name} (${game.participants?.length || 0}/${game.maxParticipants})`,
        `join_game:${game.id}`,
      ),
    ]);

    await ctx.reply(
      '🎯 Выберите игру для регистрации:\n\n' +
        openGames
          .map(
            (g) =>
              `• ${g.name}\n  Участников: ${g.participants?.length || 0}/${g.maxParticipants}`,
          )
          .join('\n\n'),
      Markup.inlineKeyboard([
        ...gameButtons,
        [Markup.button.callback('❌ Отмена', 'cancel_registration')],
      ]),
    );
  }

  private async handleListGames(ctx: Context) {
    const openGames = await this.gameService.getOpenGames();

    if (openGames.length === 0) {
      await ctx.reply(
        '📋 Сейчас нет открытых игр.',
        await this.getGamesMenuKeyboard(ctx.from?.id || 0),
      );
      return;
    }

    const gamesList = openGames
      .map((game) => {
        const participantCount = game.participants?.length || 0;
        return (
          `🎮 ${game.name}\n` +
          `   Описание: ${game.description || 'Нет описания'}\n` +
          `   Участников: ${participantCount}/${game.maxParticipants}\n` +
          `   Статус: ${this.getStatusText(game.status)}`
        );
      })
      .join('\n\n');

    await ctx.reply(
      '📋 Открытые игры:\n\n' + gamesList,
      await this.getGamesMenuKeyboard(ctx.from?.id || 0),
    );
  }

  private async handleMyGame(ctx: Context) {
    if (!ctx.from) return;

    const activeGame = await this.gameService.getUserActiveGame(ctx.from.id);

    if (!activeGame) {
      await ctx.reply(
        'У вас нет активных игр.',
        await this.getGamesMenuKeyboard(ctx.from.id),
      );
      return;
    }

    // Reload game with fresh data to avoid stale cache
    const freshGame = await this.gameService.getGameById(activeGame.id);
    if (!freshGame) {
      await ctx.reply(
        'Не удалось загрузить данные игры.',
        await this.getGamesMenuKeyboard(ctx.from.id),
      );
      return;
    }

    const participantCount = freshGame.participants?.length || 0;
    const myParticipation = freshGame.participants?.find(
      (p) => Number(p.telegramId) === ctx.from!.id,
    );

    let message =
      `📋 Ваша активная игра:\n\n` +
      `🎮 ${freshGame.name}\n` +
      `Описание: ${freshGame.description || 'Нет описания'}\n` +
      `Участников: ${participantCount}/${freshGame.maxParticipants}\n` +
      `Статус: ${this.getStatusText(freshGame.status)}\n` +
      `Ваша роль: ${myParticipation?.role === ParticipantRole.JUDGE ? '⚖️ Судья' : '🎤 Спикер'}`;

    if (freshGame.motion) {
      message += `\n\n📝 Тема: ${freshGame.motion}`;
    }

    if (myParticipation?.position && myParticipation.position !== 'none') {
      message += `\n🎯 Ваша позиция: ${this.getPositionText(myParticipation.position)}`;
    }

    await ctx.reply(message, await this.getGamesMenuKeyboard(ctx.from.id));
  }

  private async handleAllocatePositions(ctx: Context) {
    if (!ctx.from) return;

    try {
      const activeGame = await this.gameService.getUserActiveGame(ctx.from.id);

      if (!activeGame) {
        await ctx.reply(
          'У вас нет активных игр.',
          await this.getGamesMenuKeyboard(ctx.from.id),
        );
        return;
      }

      if (activeGame.status !== GameStatus.REGISTRATION) {
        await ctx.reply(
          'Распределение уже выполнено или игра уже началась.',
          await this.getGamesMenuKeyboard(ctx.from.id),
        );
        return;
      }

      const rooms = await this.gameService.allocatePlayers(
        activeGame.id,
        ctx.from.id,
      );

      // Reload game with fresh data
      const freshGame = await this.gameService.getGameById(activeGame.id);

      let message = '🎲 Распределение позиций завершено!\n\n';

      for (const room of rooms) {
        message += `📍 Комната #${room.roomNumber}\n\n`;

        if (room.openingGovernment.length > 0) {
          message += `🏛️ Opening Government (OG):\n`;
          room.openingGovernment.forEach((p) => {
            message += `  ${p.isIronman ? '💪 ' : ''}${p.firstName || p.username || 'Игрок'}${p.isIronman ? ' (Ironman)' : ''}\n`;
          });
        }

        if (room.openingOpposition.length > 0) {
          message += `🏛️ Opening Opposition (OO):\n`;
          room.openingOpposition.forEach((p) => {
            message += `  ${p.isIronman ? '💪 ' : ''}${p.firstName || p.username || 'Игрок'}${p.isIronman ? ' (Ironman)' : ''}\n`;
          });
        }

        if (room.closingGovernment.length > 0) {
          message += `🏛️ Closing Government (CG):\n`;
          room.closingGovernment.forEach((p) => {
            message += `  ${p.isIronman ? '💪 ' : ''}${p.firstName || p.username || 'Игрок'}${p.isIronman ? ' (Ironman)' : ''}\n`;
          });
        }

        if (room.closingOpposition.length > 0) {
          message += `🏛️ Closing Opposition (CO):\n`;
          room.closingOpposition.forEach((p) => {
            message += `  ${p.isIronman ? '💪 ' : ''}${p.firstName || p.username || 'Игрок'}${p.isIronman ? ' (Ironman)' : ''}\n`;
          });
        }

        if (room.judges.length > 0) {
          message += `⚖️ Судьи:\n`;
          room.judges.forEach((j) => {
            message += `  ${j.firstName || j.username || 'Судья'}\n`;
          });
        }

        message += '\n';
      }

      message += 'Судьи могут нажать "📝 Установить тему" для начала игры.';

      await ctx.reply(message, await this.getGamesMenuKeyboard(ctx.from.id));

      // Notify all participants about allocation
      await this.notifyParticipantsAboutAllocation(activeGame.id, rooms);
    } catch (error: any) {
      this.logger.error('Error allocating positions:', error);
      await ctx.reply(
        `❌ ${error.message || 'Не удалось распределить позиции.'}`,
        await this.getGamesMenuKeyboard(ctx.from.id),
      );
    }
  }

  private async notifyParticipantsAboutAllocation(
    gameId: string,
    rooms: AllocatedRoom[],
  ): Promise<void> {
    const game = await this.gameService.getGameById(gameId);
    if (!game) return;

    for (const room of rooms) {
      const allParticipants = [
        ...room.openingGovernment,
        ...room.openingOpposition,
        ...room.closingGovernment,
        ...room.closingOpposition,
      ];

      // Build full room composition message
      let fullComposition = `🎲 Распределение в игре "${game.name}" завершено!\n\n`;
      fullComposition += `📍 Комната #${room.roomNumber}\n\n`;

      if (room.openingGovernment.length > 0) {
        fullComposition += `🏛️ Opening Government (OG):\n`;
        room.openingGovernment.forEach((p) => {
          fullComposition += `  ${p.isIronman ? '💪 ' : ''}${p.firstName || p.username || 'Игрок'}${p.isIronman ? ' (Ironman)' : ''}\n`;
        });
      }

      if (room.openingOpposition.length > 0) {
        fullComposition += `🏛️ Opening Opposition (OO):\n`;
        room.openingOpposition.forEach((p) => {
          fullComposition += `  ${p.isIronman ? '💪 ' : ''}${p.firstName || p.username || 'Игрок'}${p.isIronman ? ' (Ironman)' : ''}\n`;
        });
      }

      if (room.closingGovernment.length > 0) {
        fullComposition += `🏛️ Closing Government (CG):\n`;
        room.closingGovernment.forEach((p) => {
          fullComposition += `  ${p.isIronman ? '💪 ' : ''}${p.firstName || p.username || 'Игрок'}${p.isIronman ? ' (Ironman)' : ''}\n`;
        });
      }

      if (room.closingOpposition.length > 0) {
        fullComposition += `🏛️ Closing Opposition (CO):\n`;
        room.closingOpposition.forEach((p) => {
          fullComposition += `  ${p.isIronman ? '💪 ' : ''}${p.firstName || p.username || 'Игрок'}${p.isIronman ? ' (Ironman)' : ''}\n`;
        });
      }

      if (room.judges.length > 0) {
        fullComposition += `⚖️ Судьи:\n`;
        room.judges.forEach((j) => {
          fullComposition += `  ${j.firstName || j.username || 'Судья'}\n`;
        });
      }

      // Send personalized message to each participant
      for (const participant of allParticipants) {
        const participantId = Number(participant.telegramId);
        let position = '';
        if (
          room.openingGovernment.find(
            (p) => Number(p.telegramId) === participantId,
          )
        ) {
          position = 'Opening Government (OG)';
        } else if (
          room.openingOpposition.find(
            (p) => Number(p.telegramId) === participantId,
          )
        ) {
          position = 'Opening Opposition (OO)';
        } else if (
          room.closingGovernment.find(
            (p) => Number(p.telegramId) === participantId,
          )
        ) {
          position = 'Closing Government (CG)';
        } else if (
          room.closingOpposition.find(
            (p) => Number(p.telegramId) === participantId,
          )
        ) {
          position = 'Closing Opposition (CO)';
        }

        const personalizedMessage =
          fullComposition +
          `\n🎯 Ваша позиция: ${position}${participant.isIronman ? ' (Ironman)' : ''}\n\n` +
          `Ожидайте установки темы судьёй для начала игры.`;

        try {
          await this.bot.telegram.sendMessage(
            participant.telegramId!,
            personalizedMessage,
          );
        } catch (e) {
          this.logger.warn(`Could not notify user ${participant.telegramId}`);
        }
      }

      // Also notify judges with full composition
      for (const judge of room.judges) {
        const judgeMessage =
          fullComposition +
          `\n🎯 Вы — судья\n\n` +
          `Нажмите "📝 Установить тему" для начала игры.`;

        try {
          await this.bot.telegram.sendMessage(judge.telegramId!, judgeMessage);
        } catch (e) {
          this.logger.warn(`Could not notify judge ${judge.telegramId}`);
        }
      }
    }
  }

  private async handleShowRoomComposition(ctx: Context) {
    if (!ctx.from) return;

    const activeGame = await this.gameService.getUserActiveGame(ctx.from.id);

    if (!activeGame) {
      await ctx.reply(
        'У вас нет активных игр.',
        await this.getGamesMenuKeyboard(ctx.from.id),
      );
      return;
    }

    // Reload game with fresh data
    const freshGame = await this.gameService.getGameById(activeGame.id);
    if (!freshGame) {
      await ctx.reply(
        'Не удалось загрузить данные игры.',
        await this.getGamesMenuKeyboard(ctx.from.id),
      );
      return;
    }

    if (!freshGame.isAllocated) {
      await ctx.reply(
        'Распределение ещё не выполнено. Нажмите "🎲 Распределить позиции".',
        await this.getGamesMenuKeyboard(ctx.from.id),
      );
      return;
    }

    const participants = await this.gameService.getGameParticipants(
      freshGame.id,
    );

    let message = `📋 Состав комнат для игры "${freshGame.name}":\n\n`;

    // Group by position
    const og = participants.filter((p) => p.position === 'opening_government');
    const oo = participants.filter((p) => p.position === 'opening_opposition');
    const cg = participants.filter((p) => p.position === 'closing_government');
    const co = participants.filter((p) => p.position === 'closing_opposition');
    const judges = participants.filter((p) => p.role === 'judge');

    if (og.length > 0) {
      message += `🏛️ Opening Government (OG):\n`;
      og.forEach(
        (p) => (message += `  ${p.firstName || p.username || 'Игрок'}\n`),
      );
    }

    if (oo.length > 0) {
      message += `🏛️ Opening Opposition (OO):\n`;
      oo.forEach(
        (p) => (message += `  ${p.firstName || p.username || 'Игрок'}\n`),
      );
    }

    if (cg.length > 0) {
      message += `🏛️ Closing Government (CG):\n`;
      cg.forEach(
        (p) => (message += `  ${p.firstName || p.username || 'Игрок'}\n`),
      );
    }

    if (co.length > 0) {
      message += `🏛️ Closing Opposition (CO):\n`;
      co.forEach(
        (p) => (message += `  ${p.firstName || p.username || 'Игрок'}\n`),
      );
    }

    if (judges.length > 0) {
      message += `⚖️ Судьи:\n`;
      judges.forEach(
        (j) => (message += `  ${j.firstName || j.username || 'Судья'}\n`),
      );
    }

    if (activeGame.motion) {
      message += `\n📝 Тема: ${activeGame.motion}`;
    }

    await ctx.reply(message, await this.getGamesMenuKeyboard(ctx.from.id));
  }

  private async handleSetMotionStart(ctx: Context) {
    if (!ctx.from) return;

    const activeGame = await this.gameService.getUserActiveGame(ctx.from.id);

    if (!activeGame) {
      await ctx.reply(
        'У вас нет активных игр.',
        await this.getGamesMenuKeyboard(ctx.from.id),
      );
      return;
    }

    // Reload game with fresh participants data
    const freshGame = await this.gameService.getGameById(activeGame.id);
    if (!freshGame) {
      await ctx.reply(
        'Не удалось загрузить данные игры.',
        await this.getGamesMenuKeyboard(ctx.from.id),
      );
      return;
    }

    console.log(
      `[handleSetMotionStart] Game: ${freshGame.id}, status: ${freshGame.status}`,
    );
    console.log(
      `[handleSetMotionStart] Participants:`,
      JSON.stringify(
        freshGame.participants?.map((p) => ({
          telegramId: p.telegramId,
          role: p.role,
        })),
      ),
    );

    // Check if user is a judge
    const participant = freshGame.participants?.find(
      (p) => Number(p.telegramId) === ctx.from?.id,
    );
    console.log(`[handleSetMotionStart] Found participant:`, participant);

    if (!participant || participant.role !== ParticipantRole.JUDGE) {
      await ctx.reply(
        'Только судья может установить тему.',
        await this.getGamesMenuKeyboard(ctx.from.id),
      );
      return;
    }

    if (freshGame.status !== GameStatus.ALLOCATING) {
      await ctx.reply(
        'Игра ещё не готова к установке темы. Сначала нужно распределить позиции.',
        await this.getGamesMenuKeyboard(ctx.from.id),
      );
      return;
    }

    this.userSessions.set(ctx.from.id, {
      awaitingMotion: true,
      selectedGameId: freshGame.id,
    });

    await ctx.reply(
      '📝 Введите тему (тему дебатов):\n\n' +
        'Например: "This house would ban artificial intelligence"',
      Markup.removeKeyboard(),
    );
  }

  private async handleGameRegistration(ctx: Context, gameId: string) {
    if (!ctx.from || !('callbackQuery' in ctx)) return;

    try {
      // Check if already registered
      const isRegistered = await this.gameService.isUserRegistered(
        gameId,
        ctx.from.id,
      );

      if (isRegistered) {
        await ctx.answerCbQuery('Вы уже зарегистрированы в этой игре!');
        await ctx.editMessageText('✅ Вы уже зарегистрированы в этой игре.', {
          reply_markup: undefined,
        });
        return;
      }

      // Store game selection and ask for role
      this.userSessions.set(ctx.from.id, {
        selectedGameId: gameId,
        awaitingRoleSelection: true,
      });

      await ctx.answerCbQuery();
      await ctx.editMessageText(
        '🎭 Выберите вашу роль в игре:',
        this.getRoleSelectionKeyboard(),
      );
    } catch (error) {
      this.logger.error('Error in game registration:', error);
      await ctx.answerCbQuery('Произошла ошибка');
      await ctx.editMessageText('❌ Произошла ошибка. Попробуйте позже.');
    }
  }

  private async handleRoleSelection(ctx: Context, role: ParticipantRole) {
    if (!ctx.from || !('callbackQuery' in ctx)) return;

    const session = this.userSessions.get(ctx.from.id);
    if (!session?.selectedGameId) {
      await ctx.answerCbQuery('Сессия истекла');
      return;
    }

    try {
      const game = await this.gameService.getGameById(session.selectedGameId);
      if (!game) {
        await ctx.answerCbQuery('Игра не найдена');
        await ctx.editMessageText('❌ Игра не найдена.');
        return;
      }

      await this.gameService.registerForGame(
        session.selectedGameId,
        ctx.from.id,
        ctx.from.username || null,
        ctx.from.first_name || null,
        role,
      );

      // Clear session
      this.userSessions.delete(ctx.from.id);

      await ctx.answerCbQuery('Успешно!');
      await ctx.editMessageText(
        `✅ Вы успешно зарегистрированы!\n\n` +
          `🎮 Игра: ${game.name}\n` +
          `🎭 Роль: ${role === ParticipantRole.JUDGE ? '⚖️ Судья' : '🎤 Спикер'}`,
      );

      // Show games menu
      await ctx.reply(
        'Меню игр:',
        await this.getGamesMenuKeyboard(ctx.from.id),
      );
    } catch (error: any) {
      this.logger.error('Error in role selection:', error);
      await ctx.answerCbQuery('Ошибка регистрации');
      await ctx.editMessageText(
        `❌ ${error.message || 'Не удалось зарегистрироваться.'}`,
      );
    }
  }

  private async handleCancelRegistration(ctx: Context) {
    if (!ctx.from || !('callbackQuery' in ctx)) return;

    this.userSessions.delete(ctx.from.id);
    await ctx.answerCbQuery('Отменено');
    await ctx.editMessageText('❌ Действие отменено.');
    await ctx.reply('Меню игр:', await this.getGamesMenuKeyboard(ctx.from.id));
  }

  private getSession(telegramId: number): UserSession {
    if (!this.userSessions.has(telegramId)) {
      this.userSessions.set(telegramId, {});
    }
    return this.userSessions.get(telegramId)!;
  }

  private async handleTextMessage(ctx: Context) {
    if (!ctx.from || !('text' in ctx.message!)) return;

    const session = this.userSessions.get(ctx.from.id);
    const text = ctx.message.text;

    // Handle password input for game creation
    if (session?.awaitingPassword) {
      await this.handlePasswordInput(ctx, text);
      return;
    }

    // Handle motion input
    if (session?.awaitingMotion && session.selectedGameId) {
      await this.handleMotionInput(ctx, text, session.selectedGameId);
      return;
    }

    // Handle scores input
    if (session?.awaitingScores && session.selectedGameId) {
      await this.handleScoresInput(ctx, text, session);
      return;
    }

    // Handle new judge feedback flow - rating judges
    if (session?.waitingFor === 'judge_feedback_judge') {
      await this.handleJudgeRatingInput(ctx, text);
      return;
    }

    // Handle new judge feedback flow - comment
    if (session?.waitingFor === 'judge_feedback_comment') {
      await this.handleJudgeFeedbackComment(ctx, text);
      return;
    }

    // Handle NEW feedback flow - score input
    if (session?.feedbackStep === 'enter_score' && session.selectedFeedbackItem) {
      await this.handleNewFeedbackScoreInput(ctx, text);
      return;
    }

    // Handle NEW feedback flow - comment input
    if (session?.feedbackStep === 'enter_comment' && session.selectedFeedbackItem) {
      await this.handleNewFeedbackCommentInput(ctx, text);
      return;
    }

    // Default response
    if (!ctx.from) return;
    await ctx.reply(
      'Используйте меню для навигации.',
      await this.getMainMenuKeyboard(ctx.from.id),
    );
  }

  private async handlePasswordInput(ctx: Context, password: string) {
    if (!ctx.from) return;

    const gamePassword = this.configService.get<string>('GAME_PASSWORD');

    if (password !== gamePassword) {
      await ctx.reply(
        '❌ Неверный пароль. Попробуйте ещё раз или вернитесь в меню.',
      );
      return;
    }

    // Password correct, create game automatically with generated name
    try {
      const gameNumber = Math.floor(Math.random() * 10000);
      const gameName = `Игра #${gameNumber}`;

      const game = await this.gameService.createGame(
        { name: gameName, maxParticipants: 8 },
        ctx.from.id,
      );

      // Clear password session
      this.userSessions.delete(ctx.from.id);

      // Now ask creator to choose their role
      this.userSessions.set(ctx.from.id, {
        selectedGameId: game.id,
        awaitingRoleSelection: true,
        isCreatingGame: true,
      });

      await ctx.reply(
        `✅ Игра "${game.name}" создана!\n\n` +
          `Теперь выберите вашу роль в игре:`,
        this.getRoleSelectionKeyboard(),
      );
    } catch (error) {
      this.logger.error('Error creating game:', error);
      this.userSessions.delete(ctx.from.id);
      await ctx.reply(
        '❌ Не удалось создать игру. Попробуйте позже.',
        await this.getGamesMenuKeyboard(ctx.from.id),
      );
    }
  }

  private async handleMotionInput(
    ctx: Context,
    motion: string,
    gameId: string,
  ) {
    if (!ctx.from) return;

    try {
      const game = await this.gameService.setMotionAndStart(
        gameId,
        motion,
        ctx.from.id,
      );

      this.userSessions.delete(ctx.from.id);

      await ctx.reply(
        `🎉 Игра началась!\n\n` +
          `📝 Тема: ${game.motion}\n\n` +
          `Удачных дебатов!`,
        await this.getGamesMenuKeyboard(ctx.from.id),
      );

      // Notify all participants that game started
      await this.notifyParticipantsGameStarted(gameId, motion);
    } catch (error: any) {
      this.logger.error('Error setting motion:', error);
      await ctx.reply(
        `❌ ${error.message || 'Не удалось установить тему.'}`,
        await this.getGamesMenuKeyboard(ctx.from.id),
      );
    }
  }

  private async notifyParticipantsGameStarted(
    gameId: string,
    motion: string,
  ): Promise<void> {
    const game = await this.gameService.getGameById(gameId);
    if (!game) return;

    for (const participant of game.participants || []) {
      if (!participant.telegramId) continue;

      try {
        await this.bot.telegram.sendMessage(
          participant.telegramId,
          `🎉 Игра "${game.name}" началась!\n\n` +
            `📝 Тема: ${motion}\n\n` +
            `Удачных дебатов!`,
        );
      } catch (e) {
        this.logger.warn(`Could not notify user ${participant.telegramId}`);
      }
    }
  }

  private getStatusText(status: GameStatus): string {
    const statusMap: Record<GameStatus, string> = {
      [GameStatus.REGISTRATION]: '📝 Регистрация',
      [GameStatus.ALLOCATING]: '🎲 Распределение',
      [GameStatus.IN_PROGRESS]: '▶️ В процессе',
      [GameStatus.COMPLETED]: '✅ Завершена',
      [GameStatus.CANCELLED]: '❌ Отменена',
    };
    return statusMap[status] || status;
  }

  private getPositionText(position: string): string {
    const positionMap: Record<string, string> = {
      opening_government: 'Opening Government (OG) - Открывающее Правительство',
      opening_opposition: 'Opening Opposition (OO) - Открывающая Оппозиция',
      closing_government: 'Closing Government (CG) - Закрывающее Правительство',
      closing_opposition: 'Closing Opposition (CO) - Закрывающая Оппозиция',
      none: 'Не назначена',
    };
    return positionMap[position] || position;
  }

  // Calculate average speaker score rounded to 1 decimal place
  private calculateAverageScore(scores: number[]): string {
    if (!scores || scores.length === 0) {
      return '—';
    }
    const sum = scores.reduce((acc, score) => acc + score, 0);
    const average = sum / scores.length;
    return average.toFixed(1).replace('.', ',');
  }

  // Method to get user by telegram ID (for future use in API)
  async getUserByTelegramId(telegramId: number): Promise<User | null> {
    return this.userRepository.findOne({ where: { telegramId } });
  }

  // Method to get all users with stats (for API)
  async getAllUsersWithStats(): Promise<User[]> {
    return this.userRepository.find({
      order: { totalPoints: 'DESC' },
    });
  }

  // ========== LEAVE GAME HANDLER ==========

  private async handleLeaveGame(ctx: Context) {
    if (!ctx.from) return;

    const activeGame = await this.gameService.getUserActiveGame(ctx.from.id);

    if (!activeGame) {
      await ctx.reply(
        'У вас нет активных игр.',
        await this.getGamesMenuKeyboard(ctx.from.id),
      );
      return;
    }

    // Check if user is registered
    const isRegistered = await this.gameService.isUserRegistered(
      activeGame.id,
      ctx.from.id,
    );
    if (!isRegistered) {
      await ctx.reply(
        'Вы не зарегистрированы в этой игре.',
        await this.getGamesMenuKeyboard(ctx.from.id),
      );
      return;
    }

    try {
      await this.gameService.leaveGame(activeGame.id, ctx.from.id);

      await ctx.reply(
        '✅ Вы покинули игру.',
        await this.getGamesMenuKeyboard(ctx.from.id),
      );
    } catch (error: any) {
      this.logger.error('Error leaving game:', error);
      await ctx.reply(
        `❌ ${error.message || 'Не удалось покинуть игру.'}`,
        await this.getGamesMenuKeyboard(ctx.from.id),
      );
    }
  }

  // ========== CANCEL GAME HANDLER ==========

  private async handleCancelGame(ctx: Context) {
    if (!ctx.from) return;

    const activeGame = await this.gameService.getUserActiveGame(ctx.from.id);

    if (!activeGame) {
      await ctx.reply(
        'У вас нет активных игр.',
        await this.getGamesMenuKeyboard(ctx.from.id),
      );
      return;
    }

    try {
      const game = await this.gameService.cancelGame(
        activeGame.id,
        ctx.from.id,
      );

      await ctx.reply(
        `✅ Игра "${game.name}" отменена.`,
        await this.getGamesMenuKeyboard(ctx.from.id),
      );

      // Notify all participants
      await this.notifyParticipantsGameCancelled(activeGame.id);
    } catch (error: any) {
      this.logger.error('Error cancelling game:', error);
      await ctx.reply(
        `❌ ${error.message || 'Не удалось отменить игру.'}`,
        await this.getGamesMenuKeyboard(ctx.from.id),
      );
    }
  }

  private async notifyParticipantsGameCancelled(gameId: string): Promise<void> {
    const game = await this.gameService.getGameById(gameId);
    if (!game) return;

    for (const participant of game.participants || []) {
      if (!participant.telegramId) continue;

      try {
        await this.bot.telegram.sendMessage(
          participant.telegramId,
          `🚫 Игра "${game.name}" была отменена организатором.`,
        );
      } catch (e) {
        this.logger.warn(`Could not notify user ${participant.telegramId}`);
      }
    }
  }

  // ========== SCORE SUBMISSION HANDLERS ==========

  private async handleSubmitScoresStart(ctx: Context) {
    if (!ctx.from) return;

    const activeGame = await this.gameService.getUserActiveGame(ctx.from.id);

    if (!activeGame) {
      await ctx.reply(
        'У вас нет активных игр.',
        await this.getGamesMenuKeyboard(ctx.from.id),
      );
      return;
    }

    // Reload game with fresh participants data
    const freshGame = await this.gameService.getGameById(activeGame.id);
    if (!freshGame) {
      await ctx.reply(
        'Не удалось загрузить данные игры.',
        await this.getGamesMenuKeyboard(ctx.from.id),
      );
      return;
    }

    // Check if user is a judge
    const participant = freshGame.participants?.find(
      (p) => Number(p.telegramId) === ctx.from?.id,
    );
    if (!participant || participant.role !== ParticipantRole.JUDGE) {
      await ctx.reply(
        'Только судья может вводить оценки.',
        await this.getGamesMenuKeyboard(ctx.from.id),
      );
      return;
    }

    if (freshGame.status !== GameStatus.IN_PROGRESS) {
      await ctx.reply(
        'Игра ещё не началась. Дождитесь установки темы.',
        await this.getGamesMenuKeyboard(ctx.from.id),
      );
      return;
    }

    // Check if judge already submitted scores
    const hasSubmitted = await this.gameService.hasJudgeSubmittedScores(
      freshGame.id,
      ctx.from.id,
    );
    if (hasSubmitted) {
      await ctx.reply(
        'Вы уже ввели оценки для этой игры.',
        await this.getGamesMenuKeyboard(ctx.from.id),
      );
      return;
    }

    // Determine which positions exist in the game
    const roomAllocations = freshGame.roomAllocations;
    const positionsToScore: string[] = [];

    if (roomAllocations && roomAllocations.length > 0) {
      const room = roomAllocations[0]; // Use first room
      if (room.participants.some((p) => p.position === 'OG'))
        positionsToScore.push('OG');
      if (room.participants.some((p) => p.position === 'OO'))
        positionsToScore.push('OO');
      if (room.participants.some((p) => p.position === 'CG'))
        positionsToScore.push('CG');
      if (room.participants.some((p) => p.position === 'CO'))
        positionsToScore.push('CO');
    }

    if (positionsToScore.length === 0) {
      await ctx.reply(
        'Не удалось определить позиции в игре.',
        await this.getGamesMenuKeyboard(ctx.from.id),
      );
      return;
    }

    // Start score submission flow
    this.userSessions.set(ctx.from.id, {
      awaitingScores: true,
      selectedGameId: freshGame.id,
      scoresStep: 1,
      scoresData: {},
      positionsToScore,
    });

    const positionNames: Record<string, string> = {
      OG: 'Opening Government (OG)',
      OO: 'Opening Opposition (OO)',
      CG: 'Closing Government (CG)',
      CO: 'Closing Opposition (CO)',
    };

    await ctx.reply(
      `🎯 Ввод оценок спикеров\n\n` +
        `Введите оценки в формате "число/число" (например: 75/78)\n\n` +
        `Шаг 1/${positionsToScore.length}: Оценки для ${positionNames[positionsToScore[0]]}:`,
      Markup.removeKeyboard(),
    );
  }

  private async handleScoresInput(
    ctx: Context,
    text: string,
    session: UserSession,
  ) {
    if (
      !ctx.from ||
      !session.scoresStep ||
      !session.selectedGameId ||
      !session.positionsToScore
    )
      return;

    // Validate format
    const scoreRegex = /^\d{1,3}\/\d{1,3}$/;
    if (!scoreRegex.test(text)) {
      await ctx.reply(
        '❌ Неверный формат. Используйте формат "число/число" (например: 75/78)',
      );
      return;
    }

    // Parse and validate scores
    const parts = text.split('/');
    const score1 = parseInt(parts[0], 10);
    const score2 = parseInt(parts[1], 10);

    if (
      isNaN(score1) ||
      isNaN(score2) ||
      score1 < 0 ||
      score1 > 100 ||
      score2 < 0 ||
      score2 > 100
    ) {
      await ctx.reply('❌ Оценки должны быть числами от 0 до 100');
      return;
    }

    const positionNames: Record<string, string> = {
      OG: 'Opening Government (OG)',
      OO: 'Opening Opposition (OO)',
      CG: 'Closing Government (CG)',
      CO: 'Closing Opposition (CO)',
    };

    const currentStep = session.scoresStep;
    const totalSteps = session.positionsToScore.length;
    const currentPosition = session.positionsToScore[currentStep - 1];

    // Save score for current position
    if (!session.scoresData) session.scoresData = {};

    switch (currentPosition) {
      case 'OG':
        session.scoresData.openingGovernment = text;
        break;
      case 'OO':
        session.scoresData.openingOpposition = text;
        break;
      case 'CG':
        session.scoresData.closingGovernment = text;
        break;
      case 'CO':
        session.scoresData.closingOpposition = text;
        break;
    }

    // Check if there are more positions
    if (currentStep < totalSteps) {
      session.scoresStep = currentStep + 1;
      const nextPosition = session.positionsToScore[currentStep];
      await ctx.reply(
        `Шаг ${currentStep + 1}/${totalSteps}: Оценки для ${positionNames[nextPosition]}:`,
      );
    } else {
      // All scores collected, save them
      await this.saveScores(ctx, session);
    }
  }

  private async saveScores(ctx: Context, session: UserSession) {
    if (!ctx.from || !session.selectedGameId || !session.scoresData) return;

    try {
      const {
        openingGovernment,
        openingOpposition,
        closingGovernment,
        closingOpposition,
      } = session.scoresData;

      await this.gameService.submitScores(
        session.selectedGameId,
        ctx.from.id,
        openingGovernment,
        openingOpposition,
        closingGovernment,
        closingOpposition,
      );

      // Build confirmation message with only scored positions
      let confirmationMessage = '✅ Оценки успешно сохранены!\n\n';
      if (openingGovernment)
        confirmationMessage += `Opening Government: ${openingGovernment}\n`;
      if (openingOpposition)
        confirmationMessage += `Opening Opposition: ${openingOpposition}\n`;
      if (closingGovernment)
        confirmationMessage += `Closing Government: ${closingGovernment}\n`;
      if (closingOpposition)
        confirmationMessage += `Closing Opposition: ${closingOpposition}\n`;
      confirmationMessage +=
        '\nКогда все судьи введут оценки, можно завершить игру.';

      // Clear session
      this.userSessions.delete(ctx.from.id);

      await ctx.reply(
        confirmationMessage,
        await this.getGamesMenuKeyboard(ctx.from.id),
      );
    } catch (error: any) {
      this.logger.error('Error saving scores:', error);
      await ctx.reply(
        `❌ ${error.message || 'Не удалось сохранить оценки.'}`,
        await this.getGamesMenuKeyboard(ctx.from.id),
      );
      this.userSessions.delete(ctx.from.id);
    }
  }

  private async handleCompleteGame(ctx: Context) {
    if (!ctx.from) return;

    const activeGame = await this.gameService.getUserActiveGame(ctx.from.id);

    if (!activeGame) {
      await ctx.reply(
        'У вас нет активных игр.',
        await this.getGamesMenuKeyboard(ctx.from.id),
      );
      return;
    }

    // Reload game with fresh participants data
    const freshGame = await this.gameService.getGameById(activeGame.id);
    if (!freshGame) {
      await ctx.reply(
        'Не удалось загрузить данные игры.',
        await this.getGamesMenuKeyboard(ctx.from.id),
      );
      return;
    }

    // Check if user is a judge
    const participant = freshGame.participants?.find(
      (p) => Number(p.telegramId) === ctx.from?.id,
    );
    if (!participant || participant.role !== ParticipantRole.JUDGE) {
      await ctx.reply(
        'Только судья может завершить игру.',
        await this.getGamesMenuKeyboard(ctx.from.id),
      );
      return;
    }

    if (freshGame.status !== GameStatus.IN_PROGRESS) {
      await ctx.reply(
        'Игра ещё не началась или уже завершена.',
        await this.getGamesMenuKeyboard(ctx.from.id),
      );
      return;
    }

    try {
      await this.gameService.completeGame(freshGame.id, ctx.from.id);

      await ctx.reply(
        '✅ Игра завершена!\n\n' +
          'Спасибо за участие! Статистика участников обновлена.',
        await this.getGamesMenuKeyboard(ctx.from.id),
      );

      // Notify all participants
      await this.notifyParticipantsGameCompleted(freshGame.id);
    } catch (error: any) {
      this.logger.error('Error completing game:', error);
      await ctx.reply(
        `❌ ${error.message || 'Не удалось завершить игру.'}`,
        await this.getGamesMenuKeyboard(ctx.from.id),
      );
    }
  }

  private async notifyParticipantsGameCompleted(gameId: string): Promise<void> {
    const game = await this.gameService.getGameById(gameId);
    if (!game) return;

    for (const participant of game.participants || []) {
      if (!participant.telegramId) continue;

      try {
        await this.bot.telegram.sendMessage(
          participant.telegramId,
          `🏁 Игра "${game.name}" завершена!\n\n` +
            'Спасибо за участие! Ваша статистика обновлена.',
        );
      } catch (e) {
        this.logger.warn(`Could not notify user ${participant.telegramId}`);
      }
    }
  }

  // ==================== Judge Feedback ====================

  private async handleRateJudgesStart(ctx: Context) {
    if (!ctx.from) return;
    const telegramId = ctx.from.id;

    try {
      // Get user's active game and reload to get participants
      const activeGame = await this.gameService.getUserActiveGame(telegramId);
      if (!activeGame) {
        await ctx.reply(
          '❌ У вас нет активной игры.',
          await this.getGamesMenuKeyboard(telegramId),
        );
        return;
      }

      // Reload game to get fresh data with participants
      const freshGame = await this.gameService.getGameById(activeGame.id);
      if (!freshGame) {
        await ctx.reply(
          '❌ Игра не найдена.',
          await this.getGamesMenuKeyboard(telegramId),
        );
        return;
      }

      // Check game is completed
      if (freshGame.status !== GameStatus.COMPLETED) {
        await ctx.reply(
          '❌ Игра еще не завершена. Оценивать судей можно только после завершения игры.',
          await this.getGamesMenuKeyboard(telegramId),
        );
        return;
      }

      // Check user is a player (not judge)
      const participant = freshGame.participants?.find(
        p => Number(p.telegramId) === telegramId,
      );
      if (!participant || participant.role !== 'player') {
        await ctx.reply(
          '❌ Только игроки могут оценивать судей.',
          await this.getGamesMenuKeyboard(telegramId),
        );
        return;
      }

      // Get unrated judges for this player
      const unratedJudges = await this.gameService.getUnratedJudges(
        freshGame.id,
        telegramId,
      );
      
      if (unratedJudges.length === 0) {
        await ctx.reply(
          '✅ Вы уже оценили всех судей этой игры.',
          await this.getGamesMenuKeyboard(telegramId),
        );
        return;
      }

      // Store in session
      const session = this.getSession(telegramId);
      session.waitingFor = 'judge_feedback_judge';
      session.feedbackGameId = freshGame.id;
      session.judgesToRate = unratedJudges.map(j => j.telegramId);
      session.judgeNames = {};
      for (const j of unratedJudges) {
        session.judgeNames[j.telegramId] = j.firstName || j.username || `Судья ${j.telegramId}`;
      }
      session.currentJudgeIndex = 0;
      session.feedbackData = {};

      // Show first judge
      const firstJudge = unratedJudges[0];
      const judgeName = firstJudge.firstName || firstJudge.username || `Судья ${firstJudge.telegramId}`;

      await ctx.reply(
        `⭐ Оценка судей (шаг 1/${unratedJudges.length})\n\n` +
          `Судья: ${judgeName}\n\n` +
          `Отправьте оценку от 1 до 10:`,
        Markup.keyboard([
          ['◀️ Отмена'],
          ['◀️ Назад в меню'],
        ]).resize(),
      );
    } catch (error: any) {
      this.logger.error('Error starting judge feedback:', error);
      await ctx.reply(
        '❌ Произошла ошибка.',
        await this.getGamesMenuKeyboard(telegramId),
      );
    }
  }

  private async handleJudgeRatingInput(ctx: Context, text: string) {
    if (!ctx.from) return;
    const telegramId = ctx.from.id;
    const session = this.getSession(telegramId);

    if (!session.feedbackGameId || !session.judgesToRate) {
      await ctx.reply('❌ Ошибка сессии. Попробуйте снова.');
      return;
    }

    // Handle cancel
    if (text === '◀️ Отмена' || text === '◀️ Назад в меню') {
      session.waitingFor = undefined;
      session.feedbackGameId = undefined;
      session.judgesToRate = undefined;
      session.judgeNames = undefined;
      session.currentJudgeIndex = undefined;
      session.feedbackData = undefined;
      await ctx.reply(
        'Оценка отменена.',
        await this.getGamesMenuKeyboard(telegramId),
      );
      return;
    }

    // Parse score
    const score = parseInt(text.trim(), 10);
    if (isNaN(score) || score < 1 || score > 10) {
      await ctx.reply(
        '❌ Некорректная оценка. Введите число от 1 до 10:',
        Markup.keyboard([
          ['◀️ Отмена'],
          ['◀️ Назад в меню'],
        ]).resize(),
      );
      return;
    }

    // Store score for current judge
    const currentJudgeId = session.judgesToRate[session.currentJudgeIndex!];
    if (!session.feedbackData) session.feedbackData = {};
    session.feedbackData[currentJudgeId] = score;

    // Move to next judge or ask for comment
    session.currentJudgeIndex!++;

    if (session.currentJudgeIndex! < session.judgesToRate!.length) {
      // Show next judge
      const nextJudgeId = session.judgesToRate![session.currentJudgeIndex!];
      const judgeName = session.judgeNames?.[nextJudgeId] || `Судья ${nextJudgeId}`;

      await ctx.reply(
        `⭐ Оценка судей (шаг ${session.currentJudgeIndex! + 1}/${session.judgesToRate!.length})\n\n` +
          `Судья: ${judgeName}\n\n` +
          `Отправьте оценку от 1 до 10:`,
        Markup.keyboard([
          ['◀️ Отмена'],
          ['◀️ Назад в меню'],
        ]).resize(),
      );
    } else {
      // All judges rated, ask for optional comment
      session.waitingFor = 'judge_feedback_comment';
      await ctx.reply(
        '💬 Хотите добавить комментарий? (необязательно)\n\n' +
          'Отправьте текст комментария или "Пропустить":',
        Markup.keyboard([
          ['Пропустить'],
          ['◀️ Назад в меню'],
        ]).resize(),
      );
    }
  }

  private async handleJudgeFeedbackComment(ctx: Context, text: string) {
    if (!ctx.from) return;
    const telegramId = ctx.from.id;
    const session = this.getSession(telegramId);

    if (!session.feedbackGameId || !session.feedbackData) {
      await ctx.reply('❌ Ошибка сессии. Попробуйте снова.');
      return;
    }

    // Handle skip or cancel
    if (text === '◀️ Назад в меню') {
      session.waitingFor = undefined;
      session.feedbackGameId = undefined;
      session.judgesToRate = undefined;
      session.judgeNames = undefined;
      session.currentJudgeIndex = undefined;
      session.feedbackData = undefined;
      await ctx.reply(
        'Оценка отменена.',
        await this.getGamesMenuKeyboard(telegramId),
      );
      return;
    }

    const comment = text === 'Пропустить' ? undefined : text.trim();

    try {
      // Submit feedback for all judges
      const feedbackData = session.feedbackData;
      for (const judgeIdStr of Object.keys(feedbackData)) {
        const judgeId = parseInt(judgeIdStr, 10);
        await this.gameService.submitJudgeFeedback(
          session.feedbackGameId!,
          telegramId,
          judgeId,
          feedbackData[judgeId],
          comment,
        );
      }

      // Clear session
      session.waitingFor = undefined;
      session.feedbackGameId = undefined;
      session.judgesToRate = undefined;
      session.judgeNames = undefined;
      session.currentJudgeIndex = undefined;
      session.feedbackData = undefined;

      await ctx.reply(
        '✅ Спасибо за оценку! Ваш отзыв сохранен.',
        await this.getGamesMenuKeyboard(telegramId),
      );
    } catch (error: any) {
      this.logger.error('Error submitting judge feedback:', error);
      await ctx.reply(
        `❌ ${error.message || 'Не удалось сохранить отзыв.'}`,
        await this.getGamesMenuKeyboard(telegramId),
      );
    }
  }

  // ==================== New Feedback Flow ====================

  // Show list of unrated judges to the user
  private async handleFeedbackMenu(ctx: Context) {
    if (!ctx.from) return;
    const telegramId = ctx.from.id;

    try {
      // Get all unrated judges with motion info
      const unratedJudges = await this.gameService.getUnratedJudgesWithMotion(telegramId);

      if (unratedJudges.length === 0) {
        await ctx.reply(
          '✅ У вас нет неоцененных судей. Вы оставили отзывы на всех судей, которые вас судили!',
          await this.getMainMenuKeyboard(telegramId),
        );
        return;
      }

      // Build inline keyboard with judge buttons
      // Format: "Judge Name - Motion (truncated)"
      // Callback data limited to 64 bytes in Telegram, use short prefix and encode IDs compactly
      const buttons = unratedJudges.map((item) => {
        const motionText = item.motion 
          ? (item.motion.length > 25 ? item.motion.substring(0, 25) + '...' : item.motion)
          : 'Тема не указана';
        // Truncate judge name if needed to fit button text limit (64 chars)
        let judgeName = item.judgeName || `Судья ${item.judgeTelegramId}`;
        if (judgeName.length > 30) {
          judgeName = judgeName.substring(0, 27) + '...';
        }
        const buttonText = `${judgeName} - ${motionText}`;
        // Use compact callback data: fb:<gameId>:<judgeId> (fb = feedback)
        return [Markup.button.callback(buttonText, `fb:${item.gameId}:${item.judgeTelegramId}`)];
      });

      // Add cancel button
      buttons.push([Markup.button.callback('❌ Отмена', 'cancel_feedback')]);

      await ctx.reply(
        `⭐ Оставить отзыв судье\n\n` +
        `Выберите судью и игру для оценки:\n` +
        `(${unratedJudges.length} ожидают оценки)`,
        Markup.inlineKeyboard(buttons),
      );
    } catch (error: any) {
      this.logger.error('Error showing feedback menu:', error);
      await ctx.reply(
        '❌ Произошла ошибка при загрузке списка судей.',
        await this.getMainMenuKeyboard(telegramId),
      );
    }
  }

  // Handle judge selection
  private async handleJudgeSelection(ctx: Context, gameId: string, judgeTelegramId: number) {
    if (!ctx.from) return;
    const telegramId = ctx.from.id;

    try {
      // Get the unrated judges list again to find the selected one
      const unratedJudges = await this.gameService.getUnratedJudgesWithMotion(telegramId);
      const selectedItem = unratedJudges.find(
        j => j.gameId === gameId && j.judgeTelegramId === judgeTelegramId
      );

      if (!selectedItem) {
        try {
          await ctx.answerCbQuery('Этот судья уже оценен или недоступен');
        } catch (e) {
          // Callback expired
        }
        return;
      }

      // Store in session
      const session = this.getSession(telegramId);
      session.feedbackStep = 'enter_score';
      session.selectedFeedbackItem = {
        gameId: selectedItem.gameId,
        judgeTelegramId: selectedItem.judgeTelegramId,
        judgeName: selectedItem.judgeName || `Судья ${selectedItem.judgeTelegramId}`,
        motion: selectedItem.motion,
        gameName: selectedItem.gameName,
      };

      try {
        await ctx.answerCbQuery();
      } catch (e) {
        // Callback expired, continue
      }
      
      await ctx.editMessageText(
        `⭐ Оценка судьи: ${session.selectedFeedbackItem.judgeName}\n\n` +
        `📝 Тема дебатов: ${session.selectedFeedbackItem.motion || 'Не указана'}\n` +
        `🎮 Игра: ${session.selectedFeedbackItem.gameName}\n\n` +
        `Отправьте оценку от 1 до 10:`,
      );
      await ctx.reply(
        'Введите число от 1 до 10:',
        Markup.keyboard([['◀️ Отмена']]).resize(),
      );
    } catch (error: any) {
      this.logger.error('Error selecting judge:', error);
      try {
        await ctx.answerCbQuery('Произошла ошибка');
      } catch (e) {
        // Callback expired
      }
    }
  }

  // Handle score input for new feedback flow
  private async handleNewFeedbackScoreInput(ctx: Context, text: string) {
    if (!ctx.from) return;
    const telegramId = ctx.from.id;
    const session = this.getSession(telegramId);

    // Handle cancel
    if (text === '◀️ Отмена' || text === '◀️ Назад в меню') {
      session.feedbackStep = undefined;
      session.selectedFeedbackItem = undefined;
      await ctx.reply(
        'Оценка отменена.',
        await this.getMainMenuKeyboard(telegramId),
      );
      return;
    }

    // Parse score
    const score = parseInt(text.trim(), 10);
    if (isNaN(score) || score < 1 || score > 10) {
      await ctx.reply(
        '❌ Некорректная оценка. Введите число от 1 до 10:',
        Markup.keyboard([['◀️ Отмена']]).resize(),
      );
      return;
    }

    // Store score and move to comment step
    session.feedbackStep = 'enter_comment';
    // Store score temporarily in the session
    (session as any).tempScore = score;

    await ctx.reply(
      '💬 Хотите добавить комментарий? (необязательно)\n\n' +
      'Отправьте текст комментария или "Пропустить":',
      Markup.keyboard([
        ['Пропустить'],
        ['◀️ Отмена'],
      ]).resize(),
    );
  }

  // Handle comment input for new feedback flow
  private async handleNewFeedbackCommentInput(ctx: Context, text: string) {
    if (!ctx.from) return;
    const telegramId = ctx.from.id;
    const session = this.getSession(telegramId);

    // Handle cancel
    if (text === '◀️ Отмена' || text === '◀️ Назад в меню') {
      session.feedbackStep = undefined;
      session.selectedFeedbackItem = undefined;
      (session as any).tempScore = undefined;
      await ctx.reply(
        'Оценка отменена.',
        await this.getMainMenuKeyboard(telegramId),
      );
      return;
    }

    const comment = text === 'Пропустить' ? undefined : text.trim();
    const score = (session as any).tempScore as number;
    const item = session.selectedFeedbackItem!;

    try {
      // Submit feedback
      await this.gameService.submitJudgeFeedback(
        item.gameId,
        telegramId,
        item.judgeTelegramId,
        score,
        comment,
      );

      // Clear session
      session.feedbackStep = undefined;
      session.selectedFeedbackItem = undefined;
      (session as any).tempScore = undefined;

      await ctx.reply(
        `✅ Спасибо за оценку!\n\n` +
        `Судья: ${item.judgeName}\n` +
        `Оценка: ${score}/10\n` +
        `${comment ? `Комментарий: ${comment}` : 'Без комментария'}`,
        await this.getMainMenuKeyboard(telegramId),
      );
    } catch (error: any) {
      this.logger.error('Error submitting judge feedback:', error);
      await ctx.reply(
        `❌ ${error.message || 'Не удалось сохранить отзыв.'}`,
        await this.getMainMenuKeyboard(telegramId),
      );
    }
  }
}
