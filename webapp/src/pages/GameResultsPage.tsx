import React, { useEffect, useState, useMemo } from 'react';
import { Layout } from '../components/Layout';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { SearchableSelect } from '../components/SearchableSelect';
import { adminApi } from '../api/admin';
import type {
  UserOption,
  CreateCompletedGameRequest,
  PositionResult,
} from '../types';
import './GameResultsPage.css';

interface PositionConfig {
  key:
    | 'openingGovernment'
    | 'openingOpposition'
    | 'closingGovernment'
    | 'closingOpposition';
  label: string;
  required: boolean;
}

const POSITIONS: PositionConfig[] = [
  {
    key: 'openingGovernment',
    label: 'Opening Government (OG)',
    required: true,
  },
  {
    key: 'openingOpposition',
    label: 'Opening Opposition (OO)',
    required: true,
  },
  {
    key: 'closingGovernment',
    label: 'Closing Government (CG)',
    required: false,
  },
  {
    key: 'closingOpposition',
    label: 'Closing Opposition (CO)',
    required: false,
  },
];

interface GameResultsPageProps {
  onLogout: () => void;
}

const createDefaultPosition = (): PositionResult => ({
  speaker1: { telegramId: null, score: 70 },
  speaker2: { telegramId: null, score: 70 },
  isIronman: false,
});

export const GameResultsPage: React.FC<GameResultsPageProps> = ({
  onLogout,
}) => {
  // Data state
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // Form state
  const [gameName, setGameName] = useState('');
  const [motion, setMotion] = useState('');
  const [selectedJudgeId, setSelectedJudgeId] = useState<number | null>(null);
  const [positionResults, setPositionResults] = useState<
    Record<string, PositionResult>
  >({
    openingGovernment: createDefaultPosition(),
    openingOpposition: createDefaultPosition(),
    closingGovernment: createDefaultPosition(),
    closingOpposition: createDefaultPosition(),
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const usersData = await adminApi.getUsers();
      setUsers(usersData);
    } catch (err) {
      setError('Ошибка загрузки данных');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleIronmanChange = (position: string, isIronman: boolean) => {
    setPositionResults((prev) => ({
      ...prev,
      [position]: {
        ...prev[position],
        isIronman,
        // When switching to ironman, sync speaker2 to speaker1 if speaker1 is selected
        speaker1:
          isIronman && prev[position].speaker1.telegramId
            ? prev[position].speaker1
            : prev[position].speaker1,
      },
    }));
  };

  const handleSpeakerChange = (
    position: string,
    speaker: 'speaker1' | 'speaker2',
    field: 'telegramId' | 'score',
    value: number | null,
  ) => {
    setPositionResults((prev) => {
      const currentPosition = prev[position];
      const isIronman = currentPosition.isIronman;

      // If ironman and changing speaker1, also update speaker2 to the same speaker
      if (isIronman && speaker === 'speaker1' && field === 'telegramId') {
        return {
          ...prev,
          [position]: {
            ...currentPosition,
            speaker1: { ...currentPosition.speaker1, telegramId: value },
            speaker2: { ...currentPosition.speaker2, telegramId: value },
          },
        };
      }

      return {
        ...prev,
        [position]: {
          ...currentPosition,
          [speaker]: {
            ...currentPosition[speaker],
            [field]: value,
          },
        },
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!gameName.trim()) {
      setError('Введите название игры');
      return;
    }

    if (!motion.trim()) {
      setError('Введите тему');
      return;
    }

    if (selectedJudgeId === null) {
      setError('Выберите судью');
      return;
    }

    // Validate required positions
    const og = positionResults.openingGovernment;
    const oo = positionResults.openingOpposition;

    if (!og.speaker1.telegramId || (!og.isIronman && !og.speaker2.telegramId)) {
      setError('Выберите обоих спикеров для Opening Government');
      return;
    }

    if (!oo.speaker1.telegramId || (!oo.isIronman && !oo.speaker2.telegramId)) {
      setError('Выберите обоих спикеров для Opening Opposition');
      return;
    }

    const data: CreateCompletedGameRequest = {
      gameName: gameName.trim(),
      motion: motion.trim(),
      openingGovernment: og,
      openingOpposition: oo,
      judgeTelegramId: selectedJudgeId,
    };

    // Add optional positions if both speakers are selected
    if (
      positionResults.closingGovernment.speaker1.telegramId &&
      (positionResults.closingGovernment.isIronman ||
        positionResults.closingGovernment.speaker2.telegramId)
    ) {
      data.closingGovernment = positionResults.closingGovernment;
    }

    if (
      positionResults.closingOpposition.speaker1.telegramId &&
      (positionResults.closingOpposition.isIronman ||
        positionResults.closingOpposition.speaker2.telegramId)
    ) {
      data.closingOpposition = positionResults.closingOpposition;
    }

    setSubmitting(true);
    setError(null);

    try {
      await adminApi.createCompletedGame(data);
      setSuccess(true);
      // Reset form
      setGameName('');
      setMotion('');
      setSelectedJudgeId(null);
      setPositionResults({
        openingGovernment: createDefaultPosition(),
        openingOpposition: createDefaultPosition(),
        closingGovernment: createDefaultPosition(),
        closingOpposition: createDefaultPosition(),
      });
    } catch (err) {
      setError('Ошибка сохранения результатов');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  // Memoize user options for searchable selects
  const userOptions = useMemo(() => {
    return users.map((user) => ({
      value: user.telegramId,
      label: getUserDisplayName(user),
    }));
  }, [users]);

  const getUserDisplayName = (user: UserOption) => {
    let name = user.firstName;
    if (user.lastName) {
      name += ` ${user.lastName}`;
    }
    if (user.username) {
      name += ` (@${user.username})`;
    }
    return name;
  };

  if (loading) {
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
            Игра с результатами успешно создана!
          </div>
        )}

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit} className="results-form">
          {/* Game Info */}
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
              />
            </div>

            <div className="form-group">
              <label className="form-label">Судья</label>
              <SearchableSelect
                value={selectedJudgeId}
                onChange={(value) => setSelectedJudgeId(value as number | null)}
                options={userOptions}
                placeholder="Выберите судью"
              />
            </div>
          </Card>

          {/* Positions */}
          <Card>
            <h2 className="section-title">Позиции и оценки</h2>

            {POSITIONS.map((pos) => {
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
                      />
                      <span className="checkbox-text">Ironman</span>
                    </label>
                  </div>

                  {/* Speaker 1 */}
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
                      />

                      {isIronman ? (
                        // Ironman: two score inputs for the same speaker
                        <>
                          <input
                            type="number"
                            min="0"
                            max="100"
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
                          />
                          <input
                            type="number"
                            min="0"
                            max="100"
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
                          />
                        </>
                      ) : (
                        // Normal: single score for speaker 1
                        <input
                          type="number"
                          min="0"
                          max="100"
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
                        />
                      )}
                    </div>
                  </div>

                  {/* Speaker 2 - only show if not ironman */}
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
                        >
                          <option value="">
                            {pos.required ? 'Выберите спикера' : 'Не выбрано'}
                          </option>
                          {users.map((user) => (
                            <option
                              key={user.telegramId}
                              value={user.telegramId}
                            >
                              {getUserDisplayName(user)}
                            </option>
                          ))}
                        </select>

                        <input
                          type="number"
                          min="0"
                          max="100"
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
            loading={submitting}
            disabled={submitting}
            size="lg"
          >
            Создать игру с результатами
          </Button>
        </form>
      </div>
    </Layout>
  );
};
