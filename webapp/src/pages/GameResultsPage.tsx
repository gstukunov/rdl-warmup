import React, { useEffect, useState } from 'react';
import { Layout } from '../components/Layout';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { adminApi } from '../api/admin';
import type {
  UserOption,
  CompletedGame,
  SubmitGameResultsRequest,
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

export const GameResultsPage: React.FC<GameResultsPageProps> = ({
  onLogout,
}) => {
  // Data state
  const [games, setGames] = useState<CompletedGame[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // Form state
  const [selectedGameId, setSelectedGameId] = useState<string>('');
  const [motion, setMotion] = useState('');
  const [selectedJudgeId, setSelectedJudgeId] = useState<string>('');
  const [positionResults, setPositionResults] = useState<
    Record<string, PositionResult>
  >({
    openingGovernment: { telegramId: null, isIronman: false, score: 70 },
    openingOpposition: { telegramId: null, isIronman: false, score: 70 },
    closingGovernment: { telegramId: null, isIronman: false, score: 70 },
    closingOpposition: { telegramId: null, isIronman: false, score: 70 },
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [gamesData, usersData] = await Promise.all([
        adminApi.getCompletedGames(),
        adminApi.getUsers(),
      ]);
      setGames(gamesData);
      setUsers(usersData);
    } catch (err) {
      setError('Ошибка загрузки данных');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePositionChange = (
    position: string,
    field: keyof PositionResult,
    value: number | boolean | null,
  ) => {
    setPositionResults((prev) => ({
      ...prev,
      [position]: {
        ...prev[position],
        [field]: value,
      },
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedGameId) {
      setError('Выберите игру');
      return;
    }

    if (!motion.trim()) {
      setError('Введите моцию');
      return;
    }

    if (!selectedJudgeId) {
      setError('Выберите судью');
      return;
    }

    // Validate required positions
    const og = positionResults.openingGovernment;
    const oo = positionResults.openingOpposition;

    if (!og.telegramId) {
      setError('Выберите игрока для Opening Government');
      return;
    }

    if (!oo.telegramId) {
      setError('Выберите игрока для Opening Opposition');
      return;
    }

    const data: SubmitGameResultsRequest = {
      gameId: selectedGameId,
      motion: motion.trim(),
      openingGovernment: og,
      openingOpposition: oo,
      judgeTelegramId: Number(selectedJudgeId),
    };

    // Add optional positions if selected
    if (positionResults.closingGovernment.telegramId) {
      data.closingGovernment = positionResults.closingGovernment;
    }

    if (positionResults.closingOpposition.telegramId) {
      data.closingOpposition = positionResults.closingOpposition;
    }

    setSubmitting(true);
    setError(null);

    try {
      await adminApi.submitGameResults(data);
      setSuccess(true);
      // Reset form
      setSelectedGameId('');
      setMotion('');
      setSelectedJudgeId('');
      setPositionResults({
        openingGovernment: { telegramId: null, isIronman: false, score: 70 },
        openingOpposition: { telegramId: null, isIronman: false, score: 70 },
        closingGovernment: { telegramId: null, isIronman: false, score: 70 },
        closingOpposition: { telegramId: null, isIronman: false, score: 70 },
      });
      // Refresh games list
      loadData();
    } catch (err) {
      setError('Ошибка сохранения результатов');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

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
      <Layout header={<h1 className="page-title">Внесение результатов</h1>}>
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
          <h1 className="page-title">Внесение результатов</h1>
          <Button onClick={onLogout} variant="secondary" size="sm">
            Выйти
          </Button>
        </div>
      }
    >
      <div className="results-container">
        {success && (
          <div className="success-message">Результаты успешно сохранены!</div>
        )}

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit} className="results-form">
          {/* Game Selection */}
          <Card>
            <h2 className="section-title">Выбор игры</h2>
            <div className="form-group">
              <label className="form-label">Игра</label>
              <select
                value={selectedGameId}
                onChange={(e) => {
                  setSelectedGameId(e.target.value);
                  const game = games.find((g) => g.id === e.target.value);
                  if (game?.motion) {
                    setMotion(game.motion);
                  }
                }}
                className="form-select"
              >
                <option value="">Выберите игру</option>
                {games.map((game) => (
                  <option key={game.id} value={game.id}>
                    {game.name} {game.hasResults ? '(✓ результаты)' : ''}
                  </option>
                ))}
              </select>
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
              <select
                value={selectedJudgeId}
                onChange={(e) => setSelectedJudgeId(e.target.value)}
                className="form-select"
              >
                <option value="">Выберите судью</option>
                {users.map((user) => (
                  <option key={user.telegramId} value={user.telegramId}>
                    {getUserDisplayName(user)}
                  </option>
                ))}
              </select>
            </div>
          </Card>

          {/* Positions */}
          <Card>
            <h2 className="section-title">Позиции и оценки</h2>

            {POSITIONS.map((pos) => (
              <div key={pos.key} className="position-section">
                <h3 className="position-title">
                  {pos.label}
                  {!pos.required && (
                    <span className="optional"> (опционально)</span>
                  )}
                </h3>

                <div className="position-row">
                  <div className="position-field">
                    <label className="field-label">Спикер</label>
                    <select
                      value={positionResults[pos.key].telegramId || ''}
                      onChange={(e) =>
                        handlePositionChange(
                          pos.key,
                          'telegramId',
                          e.target.value ? Number(e.target.value) : null,
                        )
                      }
                      className="form-select"
                    >
                      <option value="">
                        {pos.required ? 'Выберите спикера' : 'Не выбрано'}
                      </option>
                      {users.map((user) => (
                        <option key={user.telegramId} value={user.telegramId}>
                          {getUserDisplayName(user)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="position-field score-field">
                    <label className="field-label">Балл</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={positionResults[pos.key].score}
                      onChange={(e) =>
                        handlePositionChange(
                          pos.key,
                          'score',
                          Number(e.target.value),
                        )
                      }
                      className="form-input score-input"
                    />
                  </div>

                  <div className="position-field checkbox-field">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={positionResults[pos.key].isIronman}
                        onChange={(e) =>
                          handlePositionChange(
                            pos.key,
                            'isIronman',
                            e.target.checked,
                          )
                        }
                        className="checkbox-input"
                      />
                      <span className="checkbox-text">Ironman</span>
                    </label>
                  </div>
                </div>
              </div>
            ))}
          </Card>

          <Button
            type="submit"
            fullWidth
            loading={submitting}
            disabled={submitting}
            size="lg"
          >
            Сохранить результаты
          </Button>
        </form>
      </div>
    </Layout>
  );
};
