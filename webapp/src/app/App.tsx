import React, { useState, useEffect, useMemo } from 'react';
import { QueryProvider } from './providers';
import { useStats, useGameParticipations, useGameMotions } from '@/entities/stats';
import { useMe } from '@/entities/user';
import {
  Button,
  Skeleton,
  ThemeToggle,
  Card,
  CardContent,
  Input,
  Label,
  SearchableSelect,
} from '@/shared/ui';
import { useAdminLogin } from '@/features/admin-auth';
import { useUsers, useCreateCompletedGame } from '@/entities/admin';
import { adminApi } from '@/entities/admin';
import {
  createDefaultPositionResults,
  updatePositionIronman,
  updatePositionSpeaker,
  validateGameResultsForm,
  buildCreateGameRequest,
  RESULTS_POSITION_CONFIG,
  VALIDATION_MESSAGES,
  SCORE_CONSTRAINTS,
  type PositionResultsRecord,
} from '@/entities/admin';
import { formatUserOptionDisplayName } from '@/entities/admin';
import type { UserOption } from '@/entities/admin';
import { cn } from '@/shared/lib';
import './styles/App.css';

console.log('[APP] Module loaded');

type Tab = 'speakers' | 'judges' | 'games' | 'motions' | 'admin';

// Speakers Content
const SpeakersContent: React.FC = () => {
  const { data, isLoading, isError, refetch } = useStats();
  const speakers = data?.speakers ?? [];

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-4 flex flex-col items-center justify-center gap-4 py-12">
        <div className="text-destructive">Failed to load statistics.</div>
        <Button onClick={() => refetch()}>Попробовать снова</Button>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-lg font-semibold text-telegram-text">Тэб Спикеров</h2>
      {speakers.length === 0 ? (
        <div className="text-center py-8 text-telegram-hint">
          Пока нет данных о спикерах
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-telegram-secondary-bg">
                <th className="text-left py-2 px-2 text-sm font-semibold text-telegram-text w-12">
                  #
                </th>
                <th className="text-left py-2 px-2 text-sm font-semibold text-telegram-text">
                  Имя
                </th>
                <th className="text-center py-2 px-2 text-sm font-semibold text-telegram-text w-16">
                  Игры
                </th>
                <th className="text-center py-2 px-2 text-sm font-semibold text-telegram-text w-20">
                  Ср. спик
                </th>
              </tr>
            </thead>
            <tbody>
              {speakers.map((speaker, index) => (
                <tr
                  key={speaker.telegramId}
                  className="border-b border-telegram-secondary-bg/50 last:border-0"
                >
                  <td
                    className={cn(
                      'py-3 px-2 text-sm font-bold',
                      index === 0
                        ? 'text-yellow-500'
                        : index === 1
                          ? 'text-gray-400'
                          : index === 2
                            ? 'text-amber-600'
                            : 'text-telegram-hint',
                    )}
                  >
                    {index + 1}
                  </td>
                  <td className="py-3 px-2">
                    <div className="font-medium text-telegram-text">
                      {speaker.firstName} {speaker.lastName}
                    </div>
                    {speaker.username && (
                      <div className="text-xs text-telegram-hint">
                        @{speaker.username}
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-2 text-center text-sm text-telegram-text">
                    {speaker.gamesPlayed}
                  </td>
                  <td className="py-3 px-2 text-center text-sm font-semibold text-telegram-text">
                    {speaker.averageScore}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// Games Content
const GamesContent: React.FC = () => {
  const {
    data: gamesData,
    isLoading: gamesLoading,
    isError: gamesError,
    refetch: refetchGames,
  } = useGameParticipations();

  const { users, games } = useMemo(() => {
    if (!gamesData || gamesData.length === 0) {
      return { users: [], games: [] };
    }

    const userMap = new Map<
      number,
      { telegramId: number; firstName: string; lastName: string | null }
    >();
    gamesData.forEach((game) => {
      game.participants.forEach((p) => {
        if (!userMap.has(p.telegramId)) {
          userMap.set(p.telegramId, p);
        }
      });
    });

    const allUsers = Array.from(userMap.values()).sort((a, b) => {
      const nameA = `${a.firstName} ${a.lastName ?? ''}`.trim().toLowerCase();
      const nameB = `${b.firstName} ${b.lastName ?? ''}`.trim().toLowerCase();
      return nameA.localeCompare(nameB);
    });

    return { users: allUsers, games: gamesData };
  }, [gamesData]);

  if (gamesLoading) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (gamesError) {
    return (
      <div className="p-4 flex flex-col items-center justify-center gap-4 py-12">
        <div className="text-destructive">
          Не удалось загрузить данные об играх.
        </div>
        <Button onClick={() => refetchGames()}>Попробовать снова</Button>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-lg font-semibold text-telegram-text">
        Участие в играх
      </h2>
      {games.length === 0 ? (
        <div className="text-center py-8 text-telegram-hint">
          Пока нет завершённых игр
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead>
              <tr className="border-b border-telegram-secondary-bg">
                <th className="text-left py-2 px-2 text-sm font-semibold text-telegram-text sticky left-0 bg-telegram-bg z-10 min-w-[140px]">
                  Имя
                </th>
                {games.map((game) => (
                  <th
                    key={game.gameId}
                    className="text-center py-2 px-2 text-xs font-semibold text-telegram-text min-w-[80px]"
                  >
                    <div className="max-w-[120px] mx-auto whitespace-normal break-words leading-tight">
                      {game.gameName}
                    </div>
                  </th>
                ))}
                <th className="text-center py-2 px-2 text-xs font-semibold text-telegram-text min-w-[60px] border-l border-telegram-secondary-bg">
                  Игрок
                </th>
                <th className="text-center py-2 px-2 text-xs font-semibold text-telegram-text min-w-[60px]">
                  Судья
                </th>
                <th className="text-center py-2 px-2 text-xs font-bold text-telegram-text min-w-[60px]">
                  Всего
                </th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr
                  key={user.telegramId}
                  className="border-b border-telegram-secondary-bg/50 last:border-0"
                >
                  <td className="py-3 px-2 sticky left-0 bg-telegram-bg z-10">
                    <div className="font-medium text-telegram-text whitespace-nowrap">
                      {user.firstName} {user.lastName}
                    </div>
                  </td>
                  {games.map((game) => {
                    const participant = game.participants.find(
                      (p) => p.telegramId === user.telegramId,
                    );
                    const roleLabel = participant
                      ? participant.role === 'player'
                        ? 'Игрок'
                        : 'Судья'
                      : 'Не участвовал';
                    return (
                      <td
                        key={game.gameId}
                        className="py-3 px-2 text-center text-sm"
                      >
                        <span
                          className={cn(
                            'inline-flex items-center justify-center rounded-full px-2 py-0.5 text-xs font-medium',
                            participant
                              ? participant.role === 'player'
                                ? 'bg-blue-500/15 text-blue-600'
                                : 'bg-amber-500/15 text-amber-600'
                              : 'bg-telegram-secondary-bg text-telegram-hint',
                          )}
                        >
                          {roleLabel}
                        </span>
                      </td>
                    );
                  })}
                  {(() => {
                    const playerCount = games.filter((g) =>
                      g.participants.some(
                        (p) =>
                          p.telegramId === user.telegramId &&
                          p.role === 'player',
                      ),
                    ).length;
                    const judgeCount = games.filter((g) =>
                      g.participants.some(
                        (p) =>
                          p.telegramId === user.telegramId &&
                          (p.role === 'judge' || p.role === 'wing'),
                      ),
                    ).length;
                    const totalCount = games.filter((g) =>
                      g.participants.some(
                        (p) => p.telegramId === user.telegramId,
                      ),
                    ).length;
                    return (
                      <>
                        <td className="py-3 px-2 text-center text-sm font-semibold text-telegram-text border-l border-telegram-secondary-bg">
                          {playerCount}
                        </td>
                        <td className="py-3 px-2 text-center text-sm font-semibold text-telegram-text">
                          {judgeCount}
                        </td>
                        <td className="py-3 px-2 text-center text-sm font-bold text-telegram-text">
                          {totalCount}
                        </td>
                      </>
                    );
                  })()}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// Motions Content
const MotionsContent: React.FC = () => {
  const {
    data: motionsData,
    isLoading: motionsLoading,
    isError: motionsError,
    refetch: refetchMotions,
  } = useGameMotions();

  const motions = motionsData ?? [];

  if (motionsLoading) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (motionsError) {
    return (
      <div className="p-4 flex flex-col items-center justify-center gap-4 py-12">
        <div className="text-destructive">
          Не удалось загрузить данные о темах.
        </div>
        <Button onClick={() => refetchMotions()}>Попробовать снова</Button>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-lg font-semibold text-telegram-text">Темы игр</h2>
      {motions.length === 0 ? (
        <div className="text-center py-8 text-telegram-hint">
          Пока нет завершённых игр с темами
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-telegram-secondary-bg">
                <th className="text-left py-2 px-2 text-sm font-semibold text-telegram-text w-12">
                  #
                </th>
                <th className="text-left py-2 px-2 text-sm font-semibold text-telegram-text">
                  Игра
                </th>
                <th className="text-left py-2 px-2 text-sm font-semibold text-telegram-text">
                  Тема
                </th>
              </tr>
            </thead>
            <tbody>
              {motions.map((motion, index) => (
                <tr
                  key={motion.gameId}
                  className="border-b border-telegram-secondary-bg/50 last:border-0"
                >
                  <td className="py-3 px-2 text-sm font-bold text-telegram-hint">
                    {index + 1}
                  </td>
                  <td className="py-3 px-2 font-medium text-telegram-text">
                    {motion.gameName}
                  </td>
                  <td className="py-3 px-2 text-sm text-telegram-text">
                    {motion.motion ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// Judges Content
const JudgesContent: React.FC = () => {
  const { data, isLoading, isError, refetch } = useStats();
  const judges = data?.judges ?? [];

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-4 flex flex-col items-center justify-center gap-4 py-12">
        <div className="text-destructive">Failed to load statistics.</div>
        <Button onClick={() => refetch()}>Попробовать снова</Button>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-lg font-semibold text-telegram-text">
        Статистика оценок судейства
      </h2>
      {judges.length === 0 ? (
        <div className="text-center py-8 text-telegram-hint">
          Пока нет данных о судьях
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-telegram-secondary-bg">
                <th className="text-left py-2 px-2 text-sm font-semibold text-telegram-text w-12">
                  #
                </th>
                <th className="text-left py-2 px-2 text-sm font-semibold text-telegram-text">
                  Имя
                </th>
                <th className="text-center py-2 px-2 text-sm font-semibold text-telegram-text w-16">
                  Оценок
                </th>
                <th className="text-center py-2 px-2 text-sm font-semibold text-telegram-text w-24">
                  Ср. оценка
                </th>
              </tr>
            </thead>
            <tbody>
              {judges.map((judge, index) => (
                <tr
                  key={judge.telegramId}
                  className="border-b border-telegram-secondary-bg/50 last:border-0"
                >
                  <td
                    className={cn(
                      'py-3 px-2 text-sm font-bold',
                      index === 0
                        ? 'text-yellow-500'
                        : index === 1
                          ? 'text-gray-400'
                          : index === 2
                            ? 'text-amber-600'
                            : 'text-telegram-hint',
                    )}
                  >
                    {index + 1}
                  </td>
                  <td className="py-3 px-2">
                    <div className="font-medium text-telegram-text">
                      {judge.firstName} {judge.lastName}
                    </div>
                    {judge.username && (
                      <div className="text-xs text-telegram-hint">
                        @{judge.username}
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-2 text-center text-sm text-telegram-text">
                    {judge.gamesJudged}
                  </td>
                  <td className="py-3 px-2 text-center text-sm font-semibold text-telegram-text">
                    {judge.averageScore}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// Admin Login Content
const AdminLoginContent: React.FC<{ onLogin: () => void }> = ({ onLogin }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const loginMutation = useAdminLogin();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setError('Введите пароль');
      return;
    }
    setError(null);
    loginMutation.mutate(password, {
      onSuccess: () => onLogin(),
      onError: () => setError('Неверный пароль'),
    });
  };

  return (
    <div className="p-4">
      <Card className="max-w-md mx-auto">
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Пароль администратора</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Введите пароль"
                disabled={loginMutation.isPending}
              />
            </div>
            {error && (
              <div className="text-sm text-destructive font-medium">
                {error}
              </div>
            )}
            <Button
              type="submit"
              className="w-full"
              loading={loginMutation.isPending}
              disabled={loginMutation.isPending}
            >
              Войти
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

// Admin Results Content
const AdminResultsContent: React.FC<{ onLogout: () => void }> = ({
  onLogout,
}) => {
  const [gameName, setGameName] = useState('');
  const [motion, setMotion] = useState('');
  const [selectedJudgeId, setSelectedJudgeId] = useState<number | null>(null);
  const [positionResults, setPositionResults] = useState<PositionResultsRecord>(
    createDefaultPositionResults(),
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const { data: users = [], isLoading: isLoadingUsers } = useUsers();
  const createGameMutation = useCreateCompletedGame();

  const userOptions = React.useMemo(() => {
    return users.map((user: UserOption) => ({
      value: user.telegramId,
      label: formatUserOptionDisplayName(user),
    }));
  }, [users]);

  const handleIronmanChange = (
    position: keyof PositionResultsRecord,
    isIronman: boolean,
  ) => {
    setPositionResults((prev) => ({
      ...prev,
      [position]: updatePositionIronman(prev[position], isIronman),
    }));
  };

  const handleSpeakerChange = (
    position: keyof PositionResultsRecord,
    speaker: 'speaker1' | 'speaker2',
    field: 'telegramId' | 'score',
    value: number | null,
  ) => {
    setPositionResults((prev) => ({
      ...prev,
      [position]: updatePositionSpeaker(prev[position], speaker, field, value),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSuccess(false);

    const validation = validateGameResultsForm(
      gameName,
      motion,
      selectedJudgeId,
      positionResults,
    );
    if (!validation.isValid) {
      setFormError(validation.error);
      return;
    }

    const data = buildCreateGameRequest(
      gameName,
      motion,
      selectedJudgeId!,
      positionResults,
    );
    createGameMutation.mutate(data, {
      onSuccess: () => {
        setSuccess(true);
        setGameName('');
        setMotion('');
        setSelectedJudgeId(null);
        setPositionResults(createDefaultPositionResults());
      },
      onError: () => setFormError(VALIDATION_MESSAGES.SAVE_ERROR),
    });
  };

  const isSubmitting = createGameMutation.isPending;

  if (isLoadingUsers) {
    return (
      <div className="p-4 flex items-center justify-center min-h-[50vh]">
        <div className="text-telegram-hint">Загрузка...</div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 pb-24">
      <div className="flex items-center justify-end gap-2">
        <Button onClick={onLogout} variant="secondary" size="sm">
          Выйти
        </Button>
      </div>

      {success && (
        <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20 text-green-500 text-sm font-medium">
          {VALIDATION_MESSAGES.SAVE_SUCCESS}
        </div>
      )}
      {formError && (
        <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm font-medium">
          {formError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Card>
          <CardContent className="p-4 space-y-4">
            <h2 className="text-lg font-semibold">Информация об игре</h2>
            <div className="space-y-2">
              <Label htmlFor="gameName">Название игры</Label>
              <Input
                id="gameName"
                value={gameName}
                onChange={(e) => setGameName(e.target.value)}
                placeholder="Введите название"
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="motion">Тема</Label>
              <Input
                id="motion"
                value={motion}
                onChange={(e) => setMotion(e.target.value)}
                placeholder="Введите тему"
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-2">
              <Label>Судья</Label>
              <SearchableSelect
                value={selectedJudgeId}
                onChange={(value) => setSelectedJudgeId(value as number | null)}
                options={userOptions}
                placeholder="Выберите судью"
                disabled={isSubmitting}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 space-y-6">
            <h2 className="text-lg font-semibold">Позиции и оценки</h2>
            {RESULTS_POSITION_CONFIG.map((pos) => {
              const positionData = positionResults[pos.key];
              const isIronman = positionData.isIronman;
              return (
                <div
                  key={pos.key}
                  className="space-y-3 pb-6 border-b border-telegram-secondary-bg last:border-0 last:pb-0"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">
                      {pos.label}
                      {!pos.required && (
                        <span className="text-telegram-hint font-normal text-sm">
                          {' '}
                          (опционально)
                        </span>
                      )}
                    </h3>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isIronman}
                        onChange={(e) =>
                          handleIronmanChange(pos.key, e.target.checked)
                        }
                        className="w-4 h-4 rounded border-telegram-hint"
                        disabled={isSubmitting}
                      />
                      <span className="text-sm">Ironman</span>
                    </label>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm text-telegram-hint w-20 shrink-0">
                        {isIronman ? 'Спикер (обе речи)' : 'Спикер 1'}
                      </span>
                      <SearchableSelect
                        value={positionData.speaker1.telegramId}
                        onChange={(value: number | null) =>
                          handleSpeakerChange(
                            pos.key,
                            'speaker1',
                            'telegramId',
                            value,
                          )
                        }
                        options={userOptions}
                        placeholder={
                          pos.required ? 'Выберите спикера' : 'Не выбрано'
                        }
                        disabled={isSubmitting}
                        className="flex-1 min-w-[200px]"
                      />
                      {isIronman ? (
                        <>
                          <Input
                            type="number"
                            min={SCORE_CONSTRAINTS.min}
                            max={SCORE_CONSTRAINTS.max}
                            value={positionData.speaker1.score}
                            onChange={(e) =>
                              handleSpeakerChange(
                                pos.key,
                                'speaker1',
                                'score',
                                Number(e.target.value),
                              )
                            }
                            className="w-20"
                            placeholder="Балл 1"
                            disabled={isSubmitting}
                          />
                          <Input
                            type="number"
                            min={SCORE_CONSTRAINTS.min}
                            max={SCORE_CONSTRAINTS.max}
                            value={positionData.speaker2.score}
                            onChange={(e) =>
                              handleSpeakerChange(
                                pos.key,
                                'speaker2',
                                'score',
                                Number(e.target.value),
                              )
                            }
                            className="w-20"
                            placeholder="Балл 2"
                            disabled={isSubmitting}
                          />
                        </>
                      ) : (
                        <Input
                          type="number"
                          min={SCORE_CONSTRAINTS.min}
                          max={SCORE_CONSTRAINTS.max}
                          value={positionData.speaker1.score}
                          onChange={(e) =>
                            handleSpeakerChange(
                              pos.key,
                              'speaker1',
                              'score',
                              Number(e.target.value),
                            )
                          }
                          className="w-20"
                          placeholder="Балл"
                          disabled={isSubmitting}
                        />
                      )}
                    </div>
                  </div>
                  {!isIronman && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm text-telegram-hint w-20 shrink-0">
                        Спикер 2
                      </span>
                      <SearchableSelect
                        value={positionData.speaker2.telegramId}
                        onChange={(value: number | null) =>
                          handleSpeakerChange(
                            pos.key,
                            'speaker2',
                            'telegramId',
                            value,
                          )
                        }
                        options={userOptions}
                        placeholder={
                          pos.required ? 'Выберите спикера' : 'Не выбрано'
                        }
                        disabled={isSubmitting}
                        className="flex-1 min-w-[200px]"
                      />
                      <Input
                        type="number"
                        min={SCORE_CONSTRAINTS.min}
                        max={SCORE_CONSTRAINTS.max}
                        value={positionData.speaker2.score}
                        onChange={(e) =>
                          handleSpeakerChange(
                            pos.key,
                            'speaker2',
                            'score',
                            Number(e.target.value),
                          )
                        }
                        className="w-20"
                        placeholder="Балл"
                        disabled={isSubmitting}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Button
          type="submit"
          className="w-full"
          loading={isSubmitting}
          disabled={isSubmitting}
          size="lg"
        >
          Создать игру с результатами
        </Button>
      </form>
    </div>
  );
};

// Main App Content
const AppContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('speakers');
  const [isAdmin, setIsAdmin] = useState(false);
  const [checking, setChecking] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const { data: meData } = useMe();

  useEffect(() => {
    try {
      const token = adminApi.getToken();
      if (token) setIsAdmin(true);
    } catch (err) {
      console.error('[APP] Error checking auth:', err);
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    if (meData?.isAdmin) {
      setIsAdmin(true);
    }
  }, [meData]);

  useEffect(() => {
    const handler = () => {
      adminApi.clearToken();
      setIsAdmin(false);
    };
    window.addEventListener('admin:session-expired', handler);
    return () => window.removeEventListener('admin:session-expired', handler);
  }, []);

  const handleLogin = () => setIsAdmin(true);
  const handleLogout = () => {
    adminApi.clearToken();
    setIsAdmin(false);
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-telegram-bg flex items-center justify-center">
        <div className="text-telegram-hint">Загрузка...</div>
      </div>
    );
  }

  const tabs = [
    { id: 'speakers' as Tab, label: 'Спикеры' },
    { id: 'motions' as Tab, label: 'Темы' },
    { id: 'judges' as Tab, label: 'Судьи' },
    { id: 'games' as Tab, label: 'Игры' },
    { id: 'admin' as Tab, label: 'Админка' },
  ];

  return (
    <div className="min-h-screen bg-telegram-bg">
      {/* Header with Logo and Tabs */}
      <header className="px-4 py-4 border-b border-telegram-secondary-bg relative">
        <div className="flex items-center gap-3 mb-4">
          <img
            src="logo-raccoon.png"
            alt="RDL Logo"
            className="h-10 w-10 object-contain"
          />
          <h1 className="text-xl font-bold text-telegram-text">
            RDL Статистика
          </h1>
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            {/* Mobile menu button */}
            <button
              className="md:hidden p-2 rounded-lg bg-telegram-secondary-bg text-telegram-text"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Menu"
            >
              {mobileMenuOpen ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Desktop Tabs */}
        <div className="hidden md:flex gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors',
                activeTab === tab.id
                  ? 'bg-telegram-button text-telegram-button-text'
                  : 'bg-telegram-secondary-bg text-telegram-text hover:opacity-80',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Mobile Menu Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden absolute right-4 top-16 z-50 bg-telegram-bg border border-telegram-secondary-bg rounded-lg shadow-lg p-2 space-y-1 min-w-[160px]">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setMobileMenuOpen(false);
                }}
                className={cn(
                  'w-full text-left py-2 px-3 rounded-md text-sm font-medium transition-colors',
                  activeTab === tab.id
                    ? 'bg-telegram-button text-telegram-button-text'
                    : 'text-telegram-text hover:bg-telegram-secondary-bg',
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}
      </header>

      {/* Content */}
      <main>
        {activeTab === 'speakers' && <SpeakersContent />}
        {activeTab === 'judges' && <JudgesContent />}
        {activeTab === 'games' && <GamesContent />}
        {activeTab === 'motions' && <MotionsContent />}
        {activeTab === 'admin' &&
          (isAdmin ? (
            <AdminResultsContent onLogout={handleLogout} />
          ) : (
            <AdminLoginContent onLogin={handleLogin} />
          ))}
      </main>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <QueryProvider>
      <AppContent />
    </QueryProvider>
  );
};

export default App;
