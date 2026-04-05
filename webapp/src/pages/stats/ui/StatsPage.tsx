import React, { useEffect, useState } from 'react';
import { statsApi, type SpeakerStat, type JudgeStat } from '@/entities/stats';
import './StatsPage.css';

export const StatsPage: React.FC = () => {
  console.log('[StatsPage] Rendering');

  const [speakers, setSpeakers] = useState<SpeakerStat[]>([]);
  const [judges, setJudges] = useState<JudgeStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'speakers' | 'judges'>('speakers');

  useEffect(() => {
    console.log('[StatsPage] useEffect running');

    const loadStats = async () => {
      try {
        console.log('[StatsPage] Loading stats...');
        setLoading(true);
        setError(null);

        const data = await statsApi.getStats();
        console.log('[StatsPage] Stats loaded:', data);

        setSpeakers(data.speakers || []);
        setJudges(data.judges || []);
      } catch (err) {
        console.error('[StatsPage] Error loading stats:', err);
        setError('Failed to load statistics. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, []);

  if (loading) {
    return (
      <div className="stats-page">
        <div className="loading-container">
          <div className="loading">Грузим статистику...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="stats-page">
        <div className="error-container">
          <div className="error">{error}</div>
          <button onClick={() => window.location.reload()} className="retry-button">
            Обновить страницу
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="stats-page">
      <header className="stats-header">
        <h1>RDL статистика тренировочных</h1>
      </header>

      <div className="tabs">
        <button
          className={`tab ${activeTab === 'speakers' ? 'active' : ''}`}
          onClick={() => setActiveTab('speakers')}
        >
          Спикеры ({speakers.length})
        </button>
        <button
          className={`tab ${activeTab === 'judges' ? 'active' : ''}`}
          onClick={() => setActiveTab('judges')}
        >
          Судьи ({judges.length})
        </button>
      </div>

      <div className="stats-content">
        {activeTab === 'speakers' ? (
          <div className="table-container">
            <h2>Тэб Спикеров</h2>
            {speakers.length === 0 ? (
              <div className="empty-state">Пока нет данных о спикерах</div>
            ) : (
              <table className="stats-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Имя</th>
                    <th>Игры</th>
                    <th>Ср. спик</th>
                  </tr>
                </thead>
                <tbody>
                  {speakers.map((speaker, index) => (
                    <tr key={speaker.telegramId}>
                      <td className="rank">{index + 1}</td>
                      <td className="name">
                        {speaker.firstName}
                        &nbsp;
                        {speaker.lastName}
                        {speaker.username && (
                          <span className="username">@{speaker.username}</span>
                        )}
                      </td>
                      <td className="number">{speaker.gamesPlayed}</td>
                      <td className="number score">{speaker.averageScore}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ) : (
          <div className="table-container">
            <h2>Статистика оценок судейства</h2>
            {judges.length === 0 ? (
              <div className="empty-state">Пока нет данных о судьях</div>
            ) : (
              <table className="stats-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Имя</th>
                    <th>Оценок</th>
                    <th>Ср. оценка</th>
                  </tr>
                </thead>
                <tbody>
                  {judges.map((judge, index) => (
                    <tr key={judge.telegramId}>
                      <td className="rank">{index + 1}</td>
                      <td className="name">
                        {judge.firstName}
                        &nbsp;
                        {judge.lastName}
                        {judge.username && (
                          <span className="username">@{judge.username}</span>
                        )}
                      </td>
                      <td className="number">{judge.gamesJudged}</td>
                      <td className="number score">{judge.averageScore}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
