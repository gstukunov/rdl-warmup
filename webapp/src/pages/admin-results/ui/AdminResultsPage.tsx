import React, { useState, useMemo } from 'react';
import { Layout } from '@/widgets/layout';
import { Card, CardContent } from '@/shared/ui/card';
import { Button, Input, Label } from '@/shared/ui';
import { SearchableSelect } from '@/shared/ui/SearchableSelect';
import { useUsers, useCreateCompletedGame } from '@/entities/admin';
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

interface AdminResultsPageProps {
  onLogout: () => void;
}

export const AdminResultsPage: React.FC<AdminResultsPageProps> = ({
  onLogout,
}) => {
  // Form state
  const [gameName, setGameName] = useState('');
  const [motion, setMotion] = useState('');
  const [selectedJudgeId, setSelectedJudgeId] = useState<number | null>(null);
  const [positionResults, setPositionResults] = useState<PositionResultsRecord>(
    createDefaultPositionResults()
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Queries and mutations
  const { data: users = [], isLoading: isLoadingUsers } = useUsers();
  const createGameMutation = useCreateCompletedGame();

  const handleIronmanChange = (position: keyof PositionResultsRecord, isIronman: boolean) => {
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
      positionResults
    );

    if (!validation.isValid) {
      setFormError(validation.error);
      return;
    }

    const data = buildCreateGameRequest(
      gameName,
      motion,
      selectedJudgeId!,
      positionResults
    );

    createGameMutation.mutate(data, {
      onSuccess: () => {
        setSuccess(true);
        // Reset form
        setGameName('');
        setMotion('');
        setSelectedJudgeId(null);
        setPositionResults(createDefaultPositionResults());
      },
      onError: () => {
        setFormError(VALIDATION_MESSAGES.SAVE_ERROR);
      },
    });
  };

  const userOptions = useMemo(() => {
    return users.map((user: UserOption) => ({
      value: user.telegramId,
      label: formatUserOptionDisplayName(user),
    }));
  }, [users]);

  const isSubmitting = createGameMutation.isPending;

  if (isLoadingUsers) {
    return (
      <Layout
        header={<h1 className="text-lg font-semibold">Создание игры с результатами</h1>}
      >
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-telegram-hint">Загрузка...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout
      header={
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold">Создание игры с результатами</h1>
          <Button onClick={onLogout} variant="secondary" size="sm">
            Выйти
          </Button>
        </div>
      }
    >
      <div className="p-4 space-y-4 pb-24">
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
                  type="text"
                  value={gameName}
                  onChange={(e) => setGameName(e.target.value)}
                  placeholder="Введите название игры"
                  disabled={isSubmitting}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="motion">Тема</Label>
                <Input
                  id="motion"
                  type="text"
                  value={motion}
                  onChange={(e) => setMotion(e.target.value)}
                  placeholder="Введите тему дебатов"
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
                  <div key={pos.key} className="space-y-3 pb-6 border-b border-telegram-secondary-bg last:border-0 last:pb-0">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">
                        {pos.label}
                        {!pos.required && (
                          <span className="text-telegram-hint font-normal text-sm"> (опционально)</span>
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
                          placeholder={pos.required ? 'Выберите спикера' : 'Не выбрано'}
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
                        <span className="text-sm text-telegram-hint w-20 shrink-0">Спикер 2</span>
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
                          placeholder={pos.required ? 'Выберите спикера' : 'Не выбрано'}
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
    </Layout>
  );
};
