import React, { useEffect, useState } from 'react';
import { statsApi, type SpeakerStat, type JudgeStat } from '../api/stats';
import './StatsPage.css';

export const StatsPage: React.FC = () => {
  const [speakers, setSpeakers] = useState<SpeakerStat[]>([]);
  const [judges, setJudges] = useState<JudgeStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'speakers' | 'judges'>('speakers');

  useEffect(() => {
    const loadStats = async () => {
      try {
        setLoading(true);
        const data = await statsApi.getStats();
        setSpeakers(data.speakers);
        setJudges(data.judges);
      } catch (err) {
        setError('Failed to load statistics');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, []);

  if (loading) {
    return (
      <div className="stats-page">
        <div className="loading">Loading statistics...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="stats-page">
        <div className="error">{error}</div>
      </div>
    );
  }

  return (
    <div className="stats-page">
      <header className="stats-header">
        <h1>RDL Warmup Statistics</h1>
      </header>

      <div className="tabs">
        <button
          className={`tab ${activeTab === 'speakers' ? 'active' : ''}`}
          onClick={() => setActiveTab('speakers')}
        >
          Speakers ({speakers.length})
        </button>
        <button
          className={`tab ${activeTab === 'judges' ? 'active' : ''}`}
          onClick={() => setActiveTab('judges')}
        >
          Judges ({judges.length})
        </button>
      </div>

      <div className="stats-content">
        {activeTab === 'speakers' ? (
          <div className="table-container">
            <h2>Speaker Rankings</h2>
            <table className="stats-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Name</th>
                  <th>Games</th>
                  <th>Avg Score</th>
                </tr>
              </thead>
              <tbody>
                {speakers.map((speaker, index) => (
                  <tr key={speaker.telegramId}>
                    <td className="rank">{index + 1}</td>
                    <td className="name">
                      {speaker.firstName}
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
          </div>
        ) : (
          <div className="table-container">
            <h2>Judge Rankings</h2>
            <table className="stats-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Name</th>
                  <th>Games</th>
                  <th>Avg Rating</th>
                </tr>
              </thead>
              <tbody>
                {judges.map((judge, index) => (
                  <tr key={judge.telegramId}>
                    <td className="rank">{index + 1}</td>
                    <td className="name">
                      {judge.firstName}
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
          </div>
        )}
      </div>
    </div>
  );
};
