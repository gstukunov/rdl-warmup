import React, { useState, useMemo } from 'react';
import { useStats, useGameParticipations } from '@/entities/stats';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import { Button, Skeleton, ThemeToggle } from '@/shared/ui';
import { cn } from '@/shared/lib';

type TabValue = 'speakers' | 'judges' | 'games';

export const StatsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabValue>('speakers');

  const { data, isLoading, isError, refetch } = useStats();
  const {
    data: gamesData,
    isLoading: gamesLoading,
    isError: gamesError,
    refetch: refetchGames,
  } = useGameParticipations();

  const speakers = data?.speakers ?? [];
  const judges = data?.judges ?? [];

  // Build user participation matrix for games tab
  const { users, games } = useMemo(() => {
    if (!gamesData || gamesData.length === 0) {
      return { users: [], games: [] };
    }

    // Collect all unique users
    const userMap = new Map<number, { telegramId: number; firstName: string; lastName: string | null }>();
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

  const isPageLoading = activeTab !== 'games' ? isLoading : false;

  if (isPageLoading) {
    return (
      <div className="min-h-screen bg-telegram-bg">
        <header className="px-4 py-4 border-b border-telegram-secondary-bg">
          <h1 className="text-xl font-bold text-telegram-text">RDL статистика тренировочных</h1>
        </header>
        <div className="p-4 space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen bg-telegram-bg p-4">
        <div className="flex flex-col items-center justify-center gap-4 py-12">
          <div className="text-destructive">Failed to load statistics. Please try again later.</div>
          <Button onClick={() => refetch()}>
            Попробовать снова
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-telegram-bg">
      <header className="px-4 py-4 border-b border-telegram-secondary-bg flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src="logo-raccoon.png" alt="RDL Logo" className="h-10 w-10 object-contain" />
          <h1 className="text-xl font-bold text-telegram-text">RDL статистика тренировочных</h1>
        </div>
        <ThemeToggle />
      </header>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabValue)} className="w-full">
        <div className="px-4 py-3 border-b border-telegram-secondary-bg">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="speakers">
              Спикеры ({speakers.length})
            </TabsTrigger>
            <TabsTrigger value="judges">
              Судьи ({judges.length})
            </TabsTrigger>
            <TabsTrigger value="games">
              Игры ({games.length})
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="speakers" className="p-4">
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-telegram-text">Тэб Спикеров</h2>
            {speakers.length === 0 ? (
              <div className="text-center py-8 text-telegram-hint">Пока нет данных о спикерах</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-telegram-secondary-bg">
                      <th className="text-left py-2 px-2 text-sm font-semibold text-telegram-text w-12">#</th>
                      <th className="text-left py-2 px-2 text-sm font-semibold text-telegram-text">Имя</th>
                      <th className="text-center py-2 px-2 text-sm font-semibold text-telegram-text w-16">Игры</th>
                      <th className="text-center py-2 px-2 text-sm font-semibold text-telegram-text w-20">Ср. спик</th>
                    </tr>
                  </thead>
                  <tbody>
                    {speakers.map((speaker, index) => (
                      <tr key={speaker.telegramId} className="border-b border-telegram-secondary-bg/50 last:border-0">
                        <td className={cn(
                          "py-3 px-2 text-sm font-bold",
                          index === 0 ? "text-yellow-500" :
                          index === 1 ? "text-gray-400" :
                          index === 2 ? "text-amber-600" :
                          "text-telegram-hint"
                        )}>{index + 1}</td>
                        <td className="py-3 px-2">
                          <div className="font-medium text-telegram-text">
                            {speaker.firstName} {speaker.lastName}
                          </div>
                          {speaker.username && (
                            <div className="text-xs text-telegram-hint">@{speaker.username}</div>
                          )}
                        </td>
                        <td className="py-3 px-2 text-center text-sm text-telegram-text">{speaker.gamesPlayed}</td>
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
        </TabsContent>

        <TabsContent value="judges" className="p-4">
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-telegram-text">Статистика оценок судейства</h2>
            {judges.length === 0 ? (
              <div className="text-center py-8 text-telegram-hint">Пока нет данных о судьях</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-telegram-secondary-bg">
                      <th className="text-left py-2 px-2 text-sm font-semibold text-telegram-text w-12">#</th>
                      <th className="text-left py-2 px-2 text-sm font-semibold text-telegram-text">Имя</th>
                      <th className="text-center py-2 px-2 text-sm font-semibold text-telegram-text w-16">Оценок</th>
                      <th className="text-center py-2 px-2 text-sm font-semibold text-telegram-text w-24">Ср. оценка</th>
                    </tr>
                  </thead>
                  <tbody>
                    {judges.map((judge, index) => (
                      <tr key={judge.telegramId} className="border-b border-telegram-secondary-bg/50 last:border-0">
                        <td className={cn(
                          "py-3 px-2 text-sm font-bold",
                          index === 0 ? "text-yellow-500" :
                          index === 1 ? "text-gray-400" :
                          index === 2 ? "text-amber-600" :
                          "text-telegram-hint"
                        )}>{index + 1}</td>
                        <td className="py-3 px-2">
                          <div className="font-medium text-telegram-text">
                            {judge.firstName} {judge.lastName}
                          </div>
                          {judge.username && (
                            <div className="text-xs text-telegram-hint">@{judge.username}</div>
                          )}
                        </td>
                        <td className="py-3 px-2 text-center text-sm text-telegram-text">{judge.gamesJudged}</td>
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
        </TabsContent>

        <TabsContent value="games" className="p-4">
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-telegram-text">Участие в играх</h2>
            {gamesLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-64 w-full" />
              </div>
            ) : gamesError ? (
              <div className="flex flex-col items-center justify-center gap-4 py-12">
                <div className="text-destructive">Не удалось загрузить данные об играх.</div>
                <Button onClick={() => refetchGames()}>
                  Попробовать снова
                </Button>
              </div>
            ) : games.length === 0 ? (
              <div className="text-center py-8 text-telegram-hint">Пока нет завершённых игр</div>
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
                          <div className="max-w-[120px] mx-auto whitespace-normal break-words leading-tight">{game.gameName}</div>
                        </th>
                      ))}
                      <th className="text-center py-2 px-2 text-xs font-semibold text-telegram-text min-w-[60px] border-l border-telegram-secondary-bg">Игрок</th>
                      <th className="text-center py-2 px-2 text-xs font-semibold text-telegram-text min-w-[60px]">Судья</th>
                      <th className="text-center py-2 px-2 text-xs font-bold text-telegram-text min-w-[60px]">Всего</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.telegramId} className="border-b border-telegram-secondary-bg/50 last:border-0">
                        <td className="py-3 px-2 sticky left-0 bg-telegram-bg z-10">
                          <div className="font-medium text-telegram-text whitespace-nowrap">
                            {user.firstName} {user.lastName}
                          </div>
                        </td>
                        {games.map((game) => {
                          const participates = game.participants.some(
                            (p) => p.telegramId === user.telegramId
                          );
                          return (
                            <td key={game.gameId} className="py-3 px-2 text-center text-sm">
                              <span
                                className={cn(
                                  'inline-flex items-center justify-center rounded-full px-2 py-0.5 text-xs font-medium',
                                  participates
                                    ? 'bg-green-500/15 text-green-600'
                                    : 'bg-telegram-secondary-bg text-telegram-hint'
                                )}
                              >
                                {participates ? 'Да' : 'Нет'}
                              </span>
                            </td>
                          );
                        })}
                        {(() => {
                          const playerCount = games.filter((g) =>
                            g.participants.some((p) => p.telegramId === user.telegramId && p.role === 'player')
                          ).length;
                          const judgeCount = games.filter((g) =>
                            g.participants.some((p) => p.telegramId === user.telegramId && (p.role === 'judge' || p.role === 'wing'))
                          ).length;
                          const totalCount = games.filter((g) =>
                            g.participants.some((p) => p.telegramId === user.telegramId)
                          ).length;
                          return (
                            <>
                              <td className="py-3 px-2 text-center text-sm font-semibold text-telegram-text border-l border-telegram-secondary-bg">{playerCount}</td>
                              <td className="py-3 px-2 text-center text-sm font-semibold text-telegram-text">{judgeCount}</td>
                              <td className="py-3 px-2 text-center text-sm font-bold text-telegram-text">{totalCount}</td>
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
        </TabsContent>
      </Tabs>
    </div>
  );
};
