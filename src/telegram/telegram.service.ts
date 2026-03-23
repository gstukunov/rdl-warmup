import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Telegraf, Context, Markup } from 'telegraf';
import { User } from './entities/user.entity';
import { GameService } from '../game/game.service';
import { Game, GameStatus } from '../game/entities/game.entity';
import { ParticipantRole } from '../game/entities/game-participant.entity';

// Session state for multi-step interactions
interface UserSession {
  awaitingPassword?: boolean;
  selectedGameId?: string;
  awaitingRoleSelection?: boolean;
  isCreatingGame?: boolean;
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
  private getMainMenuKeyboard() {
    return Markup.keyboard([
      ['🎮 Игры', '📊 Профиль'],
      ['❓ Помощь'],
    ]).resize();
  }

  // Create games submenu keyboard
  private getGamesMenuKeyboard(hasActiveGame: boolean) {
    if (hasActiveGame) {
      return Markup.keyboard([
        ['📋 Моя игра', '📊 Профиль'],
        ['◀️ Назад в меню'],
      ]).resize();
    }
    return Markup.keyboard([
      ['➕ Создать игру', '🎯 Присоединиться к игре'],
      ['📋 Список игр', '◀️ Назад в меню'],
    ]).resize();
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
      await ctx.reply('Главное меню:', this.getMainMenuKeyboard());
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

    // Handle text messages (for password input)
    this.bot.on('text', async (ctx) => {
      await this.handleTextMessage(ctx);
    });
  }

  private async handleStart(ctx: Context) {
    try {
      const telegramUser = ctx.from;
      
      if (!telegramUser) {
        await ctx.reply('Не удалось идентифицировать пользователя. Попробуйте ещё раз.');
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
          this.getMainMenuKeyboard(),
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
          this.getMainMenuKeyboard(),
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
          this.getMainMenuKeyboard(),
        );
        return;
      }

      const avgScore = this.calculateAverageScore(user.speakerScores);

      await ctx.reply(
        `📊 Ваш профиль\n\n` +
        `Имя: ${user.firstName || ''} ${user.lastName || ''}\n` +
        `Юзернейм: ${user.username ? '@' + user.username : 'Не указан'}\n\n` +
        `🏆 Статистика:\n` +
        `• Игр сыграно: ${user.gamesPlayed}\n` +
        `• Средний спикерский балл: ${avgScore}\n` +
        `• Всего оценок: ${user.speakerScores.length}\n` +
        `• Общие баллы: ${user.totalPoints}`,
        this.getMainMenuKeyboard(),
      );
    } catch (error) {
      this.logger.error('Error in profile command:', error);
      await ctx.reply('Произошла ошибка. Попробуйте позже.');
    }
  }

  private async handleHelp(ctx: Context) {
    await ctx.reply(
      `🤖 Британский парламентский дебатный бот\n\n` +
      `Главное меню:\n` +
      `🎮 Игры — Создать или присоединиться к игре\n` +
      `📊 Профиль — Ваша статистика\n` +
      `❓ Помощь — Эта справка\n\n` +
      `В меню игр:\n` +
      `➕ Создать игру — Требуется пароль организатора\n` +
      `🎯 Присоединиться — Выбрать роль (спикер/судья)\n` +
      `📋 Список игр — Открытые игры для регистрации`,
      this.getMainMenuKeyboard(),
    );
  }

  private async handleGamesMenu(ctx: Context) {
    if (!ctx.from) return;

    const activeGame = await this.gameService.getUserActiveGame(ctx.from.id);
    
    await ctx.reply(
      '🎮 Меню игр\n\n' +
      (activeGame 
        ? `У вас есть активная игра: "${activeGame.name}"` 
        : 'Выберите действие:'),
      this.getGamesMenuKeyboard(!!activeGame),
    );
  }

  private async handleCreateGameStart(ctx: Context) {
    if (!ctx.from) return;

    // Check if user already has an active game
    const activeGame = await this.gameService.getUserActiveGame(ctx.from.id);
    if (activeGame) {
      await ctx.reply(
        'У вас уже есть активная игра. Завершите её перед созданием новой.',
        this.getGamesMenuKeyboard(true),
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
        this.getGamesMenuKeyboard(false),
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
      openGames.map(g => 
        `• ${g.name}\n  Участников: ${g.participants?.length || 0}/${g.maxParticipants}`,
      ).join('\n\n'),
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
        this.getGamesMenuKeyboard(false),
      );
      return;
    }

    const gamesList = openGames.map((game) => {
      const participantCount = game.participants?.length || 0;
      return `🎮 ${game.name}\n` +
        `   Описание: ${game.description || 'Нет описания'}\n` +
        `   Участников: ${participantCount}/${game.maxParticipants}\n` +
        `   Статус: ${this.getStatusText(game.status)}`;
    }).join('\n\n');

    await ctx.reply(
      '📋 Открытые игры:\n\n' + gamesList,
      this.getGamesMenuKeyboard(false),
    );
  }

  private async handleMyGame(ctx: Context) {
    if (!ctx.from) return;

    const activeGame = await this.gameService.getUserActiveGame(ctx.from.id);
    
    if (!activeGame) {
      await ctx.reply(
        'У вас нет активных игр.',
        this.getGamesMenuKeyboard(false),
      );
      return;
    }

    const participantCount = activeGame.participants?.length || 0;
    const myParticipation = activeGame.participants?.find(
      p => p.telegramId === ctx.from!.id,
    );

    await ctx.reply(
      `📋 Ваша активная игра:\n\n` +
      `🎮 ${activeGame.name}\n` +
      `Описание: ${activeGame.description || 'Нет описания'}\n` +
      `Участников: ${participantCount}/${activeGame.maxParticipants}\n` +
      `Статус: ${this.getStatusText(activeGame.status)}\n` +
      `Ваша роль: ${myParticipation?.role === ParticipantRole.JUDGE ? '⚖️ Судья' : '🎤 Спикер'}`,
      this.getGamesMenuKeyboard(true),
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
        await ctx.editMessageText(
          '✅ Вы уже зарегистрированы в этой игре.',
          { reply_markup: undefined },
        );
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

  private async handleRoleSelection(
    ctx: Context,
    role: ParticipantRole,
  ) {
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
        this.getGamesMenuKeyboard(true),
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
    await ctx.reply('Меню игр:', this.getGamesMenuKeyboard(false));
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

    // Default response
    await ctx.reply(
      'Используйте меню для навигации.',
      this.getMainMenuKeyboard(),
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
        this.getGamesMenuKeyboard(false),
      );
    }
  }

  private getStatusText(status: GameStatus): string {
    const statusMap: Record<GameStatus, string> = {
      [GameStatus.REGISTRATION]: '📝 Регистрация',
      [GameStatus.IN_PROGRESS]: '▶️ В процессе',
      [GameStatus.COMPLETED]: '✅ Завершена',
      [GameStatus.CANCELLED]: '❌ Отменена',
    };
    return statusMap[status] || status;
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
}
