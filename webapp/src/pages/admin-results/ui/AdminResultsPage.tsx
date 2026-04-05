import React, { useState, useMemo } from 'react';
import { Layout } from '@/widgets/layout';
import { Card, Button, SearchableSelect } from '@/shared/ui';
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
import './AdminResultsPage.css';

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
        header={<h1 className="page-title">Создание игры с результатами</h1>}
      >
        <div className="loading-container">
          <div className="loading">Загрузка...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout
      header={
        <div className="page-header">
          <h1 className="page-title">Создание игры с результатами</h1>
          <Button onClick={onLogout} variant="secondary" size="sm">
            Выйти
          </Button>
        </div>
      }
    >
      <div className="results-container">
        {success && (
          <div className="success-message">
            {VALIDATION_MESSAGES.SAVE_SUCCESS}
          </div>
        )}

        {formError && <div className="error-message">{formError}</div>}

        <form onSubmit={handleSubmit} className="results-form">
          <Card>
            <h2 className="section-title">Информация об игре</h2>
            <div className="form-group">
              <label className="form-label">Название игры</label>
              <input
                type="text"
                value={gameName}
                onChange={(e) => setGameName(e.target.value)}
                className="form-input"
                placeholder="Введите название игры"
                disabled={isSubmitting}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Тема</label>
              <input
                type="text"
                value={motion}
                onChange={(e) => setMotion(e.target.value)}
                className="form-input"
                placeholder="Введите тему дебатов"
                disabled={isSubmitting}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Судья</label>
              <SearchableSelect
                value={selectedJudgeId}
                onChange={(value) => setSelectedJudgeId(value as number | null)}
                options={userOptions}
                placeholder="Выберите судью"
                disabled={isSubmitting}
              />
            </div>
          </Card>

          <Card>
            <h2 className="section-title">Позиции и оценки</h2>

            {RESULTS_POSITION_CONFIG.map((pos) => {
              const positionData = positionResults[pos.key];
              const isIronman = positionData.isIronman;

              return (
                <div key={pos.key} className="position-section">
                  <div className="position-header">
                    <h3 className="position-title">
                      {pos.label}
                      {!pos.required && (
                        <span className="optional"> (опционально)</span>
                      )}
                    </h3>
                    <label className="checkbox-label ironman-checkbox">
                      <input
                        type="checkbox"
                        checked={isIronman}
                        onChange={(e) =>
                          handleIronmanChange(pos.key, e.target.checked)
                        }
                        className="checkbox-input"
                        disabled={isSubmitting}
                      />
                      <span className="checkbox-text">Ironman</span>
                    </label>
                  </div>

                  <div className="speaker-row">
                    <span className="speaker-label">
                      {isIronman ? 'Спикер (обе речи)' : 'Спикер 1'}
                    </span>
                    <div className="speaker-fields">
                      <SearchableSelect
                        value={positionData.speaker1.telegramId}
                        onChange={(value) =>
                          handleSpeakerChange(
                            pos.key,
                            'speaker1',
                            'telegramId',
                            value as number | null,
                          )
                        }
                        options={userOptions}
                        placeholder={pos.required ? 'Выберите спикера' : 'Не выбрано'}
                        className="speaker-select"
                        disabled={isSubmitting}
                      />

                      {isIronman ? (
                        <>
                          <input
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
                            className="form-input score-input"
                            placeholder="Балл 1"
                            disabled={isSubmitting}
                          />
                          <input
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
                            className="form-input score-input"
                            placeholder="Балл 2"
                            disabled={isSubmitting}
                          />
                        </>
                      ) : (
                        <input
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
                          className="form-input score-input"
                          placeholder="Балл"
                          disabled={isSubmitting}
                        />
                      )}
                    </div>
                  </div>

                  {!isIronman && (
                    <div className="speaker-row">
                      <span className="speaker-label">Спикер 2</span>
                      <div className="speaker-fields">
                        <select
                          value={positionData.speaker2.telegramId || ''}
                          onChange={(e) =>
                            handleSpeakerChange(
                              pos.key,
                              'speaker2',
                              'telegramId',
                              e.target.value ? Number(e.target.value) : null,
                            )
                          }
                          className="form-select speaker-select"
                          disabled={isSubmitting}
                        >
                          <option value="">
                            {pos.required ? 'Выберите спикера' : 'Не выбрано'}
                          </option>
                          {users.map((user: UserOption) => (
                            <option
                              key={user.telegramId}
                              value={user.telegramId}
                            >
                              {formatUserOptionDisplayName(user)}
                            </option>
                          ))}
                        </select>

                        <input
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
                          className="form-input score-input"
                          placeholder="Балл"
                          disabled={isSubmitting}
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </Card>

          <Button
            type="submit"
            fullWidth
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
