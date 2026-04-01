import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { gamesApi } from '../api/games';
import { userApi } from '../api/user';
import { useTelegram } from '../hooks/useTelegram';
import { Layout } from '../components/Layout';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { GameStatusBadge } from '../components/GameStatus';
import type { Game, GameDetails, UserProfile } from '../types';

export const GamesList: React.FC = () => {
  const navigate = useNavigate();
  const { theme, notificationOccurred, hideBackButton, isReady } = useTelegram();
  const [games, setGames] = useState<Game[]>([]);
  const [myGame, setMyGame] = useState<GameDetails | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    hideBackButton();
  }, []);

  useEffect(() => {
    if (isReady) {
      // Small delay to ensure initData is set
      setTimeout(() => {
        loadData();
      }, 100);
    }
  }, [isReady]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [gamesData, myGameData, profileData] = await Promise.all([
        gamesApi.getOpenGames(),
        gamesApi.getMyGame(),
        userApi.getProfile(),
      ]);
      setGames(gamesData);
      setMyGame(myGameData);
      setProfile(profileData);
    } catch (err) {
      setError('Failed to load games');
      notificationOccurred('error');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinGame = (gameId: string) => {
    navigate(`/games/${gameId}`);
  };

  const handleViewMyGame = () => {
    if (myGame) {
      navigate(`/games/${myGame.id}`);
    }
  };

  const header = (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      <span style={{ fontSize: '24px' }}>🎮</span>
      <div>
        <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 700 }}>Games</h1>
        <p style={{ margin: 0, fontSize: '13px', color: theme.hintColor }}>
          {profile ? `${profile.gamesPlayed} games played` : 'Loading...'}
        </p>
      </div>
    </div>
  );

  if (loading) {
    return (
      <Layout header={header}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '200px',
            color: theme.hintColor,
          }}
        >
          Loading games...
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout header={header}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px',
            padding: '40px 16px',
          }}
        >
          <span style={{ fontSize: '48px' }}>😕</span>
          <p style={{ color: theme.hintColor, textAlign: 'center' }}>{error}</p>
          <Button onClick={loadData} variant="secondary">
            Try Again
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout header={header}>
      {/* My Active Game Section */}
      {myGame && (
        <div style={{ marginBottom: '24px' }}>
          <h2
            style={{
              fontSize: '14px',
              fontWeight: 600,
              color: theme.hintColor,
              textTransform: 'uppercase',
              marginBottom: '12px',
              letterSpacing: '0.5px',
            }}
          >
            My Active Game
          </h2>
          <Card onClick={handleViewMyGame}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h3 style={{ margin: '0 0 8px 0', fontSize: '17px' }}>{myGame.name}</h3>
                <p
                  style={{
                    margin: 0,
                    fontSize: '14px',
                    color: theme.hintColor,
                    lineHeight: 1.4,
                  }}
                >
                  {myGame.description || 'No description'}
                </p>
              </div>
              <GameStatusBadge status={myGame.status} />
            </div>
            <div
              style={{
                marginTop: '12px',
                paddingTop: '12px',
                borderTop: `1px solid ${theme.bgColor}`,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span style={{ fontSize: '14px', color: theme.hintColor }}>
                👥 {myGame.participantCount}/{myGame.maxParticipants} participants
              </span>
              <span style={{ fontSize: '13px', color: theme.linkColor }}>View →</span>
            </div>
          </Card>
        </div>
      )}

      {/* Available Games Section */}
      <div>
        <h2
          style={{
            fontSize: '14px',
            fontWeight: 600,
            color: theme.hintColor,
            textTransform: 'uppercase',
            marginBottom: '12px',
            letterSpacing: '0.5px',
          }}
        >
          Available Games
        </h2>

        {games.length === 0 ? (
          <Card padding style={{ textAlign: 'center', padding: '40px 20px' }}>
            <span style={{ fontSize: '48px' }}>🎲</span>
            <p style={{ color: theme.hintColor, marginTop: '12px' }}>
              No open games available right now.
            </p>
          </Card>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {games.map((game) => (
              <Card key={game.id} onClick={() => handleJoinGame(game.id)}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <h3 style={{ margin: '0 0 8px 0', fontSize: '17px' }}>{game.name}</h3>
                    <p
                      style={{
                        margin: 0,
                        fontSize: '14px',
                        color: theme.hintColor,
                        lineHeight: 1.4,
                      }}
                    >
                      {game.description || 'No description'}
                    </p>
                  </div>
                  <GameStatusBadge status={game.status} />
                </div>
                <div
                  style={{
                    marginTop: '12px',
                    paddingTop: '12px',
                    borderTop: `1px solid ${theme.bgColor}`,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span style={{ fontSize: '14px', color: theme.hintColor }}>
                    👥 {game.participantCount}/{game.maxParticipants} participants
                  </span>
                  {game.isUserRegistered ? (
                    <span
                      style={{
                        fontSize: '13px',
                        color: '#27ae60',
                        fontWeight: 600,
                      }}
                    >
                      ✓ Joined
                    </span>
                  ) : (
                    <span style={{ fontSize: '13px', color: theme.linkColor }}>
                      Join →
                    </span>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};
