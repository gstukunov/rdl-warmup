import React, { useState } from 'react';
import { useStats } from '@/entities/stats';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import { Button, Skeleton, ThemeToggle } from '@/shared/ui';
import { cn } from '@/shared/lib';

export const StatsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'speakers' | 'judges'>('speakers');
  
  const { data, isLoading, isError, refetch } = useStats();

  const speakers = data?.speakers ?? [];
  const judges = data?.judges ?? [];

  if (isLoading) {
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
        <h1 className="text-xl font-bold text-telegram-text">RDL статистика тренировочных</h1>
        <ThemeToggle />
      </header>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'speakers' | 'judges')} className="w-full">
        <div className="px-4 py-3 border-b border-telegram-secondary-bg">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="speakers">
              Спикеры ({speakers.length})
            </TabsTrigger>
            <TabsTrigger value="judges">
              Судьи ({judges.length})
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
      </Tabs>
    </div>
  );
};
