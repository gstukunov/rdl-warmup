import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { gamesApi } from '../api/games';
import { useTelegram } from '../hooks/useTelegram';
import { Layout } from '../components/Layout';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { GameStatusBadge } from '../components/GameStatus';
import type { GameDetails, ParticipantRole, GameParticipant } from '../types';

export const GameDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    theme,
    showBackButton,
    hideBackButton,
    showMainButton,
    hideMainButton,
    notificationOccurred,
    impactOccurred,
  } = useTelegram();

  const [game, setGame] = useState<GameDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [selectedRole, setSelectedRole] = useState<ParticipantRole | null>(null);

  useEffect(() => {
    showBackButton(() => navigate('/'));
    if (id) {
      loadGame();
    }
    return () => {
      hideBackButton();
      hideMainButton();
    };
  }, [id]);

  useEffect(() => {
    if (game && !game.isUserRegistered && game.status === 'registration') {
      showMainButton('Join Game', handleJoinClick);
    } else {
      hideMainButton();
    }
  }, [game]);

  const loadGame = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await gamesApi.getGameById(id);
      setGame(data);
    } catch (err) {
      setError('Failed to load game details');
      notificationOccurred('error');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinClick = () => {
    impactOccurred('medium');
    if (!selectedRole) {
      // Show role selection
      return;
    }
    performJoin();
  };

  const performJoin = async () => {
    if (!id || !selectedRole) return;
    try {
      setJoining(true);
      await gamesApi.joinGame(id, selectedRole);
      notificationOccurred('success');
      await loadGame();
    } catch (err: any) {
      notificationOccurred('error');
      alert(err.response?.data?.error || 'Failed to join game');
    } finally {
      setJoining(false);
    }
  };

  const handleLeaveGame = async () => {
    if (!id || !game?.isUserRegistered) return;
    if (!confirm('Are you sure you want to leave this game?')) return;

    try {
      await gamesApi.leaveGame(id);
      notificationOccurred('success');
      await loadGame();
    } catch (err: any) {
      notificationOccurred('error');
      alert(err.response?.data?.error || 'Failed to leave game');
    }
  };

  if (loading) {
    return (
      <Layout>
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '300px',
            color: theme.hintColor,
          }}
        >
          Loading game details...
        </div>
      </Layout>
    );
  }

  if (error || !game) {
    return (
      <Layout>
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
          <p style={{ color: theme.hintColor }}>{error || 'Game not found'}</p>
          <Button onClick={() => navigate('/')} variant="secondary">
            Back to Games
          </Button>
        </div>
      </Layout>
    );
  }

  const players = game.participants.filter((p) => p.role === 'player');
  const judges = game.participants.filter((p) => p.role === 'judge');
  const wings = game.participants.filter((p) => p.role === 'wing');

  const header = (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '8px',
        }}
      >
        <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 700 }}>{game.name}</h1>
        <GameStatusBadge status={game.status} />
      </div>
      {game.description && (
        <p style={{ margin: 0, fontSize: '14px', color: theme.hintColor }}>
          {game.description}
        </p>
      )}
    </div>
  );

  return (
    <Layout header={header}>
      {/* Game Info */}
      <Card style={{ marginBottom: '16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <p style={{ margin: 0, fontSize: '12px', color: theme.hintColor }}>Participants</p>
            <p style={{ margin: '4px 0 0 0', fontSize: '16px', fontWeight: 600 }}>
              {game.participantCount}/{game.maxParticipants}
            </p>
          </div>
          <div>
            <p style={{ margin: 0, fontSize: '12px', color: theme.hintColor }}>Players</p>
            <p style={{ margin: '4px 0 0 0', fontSize: '16px', fontWeight: 600 }}>
              {players.length}
            </p>
          </div>
          <div>
            <p style={{ margin: 0, fontSize: '12px', color: theme.hintColor }}>Judges</p>
            <p style={{ margin: '4px 0 0 0', fontSize: '16px', fontWeight: 600 }}>
              {judges.length}
            </p>
          </div>
          {wings.length > 0 && (
            <div>
              <p style={{ margin: 0, fontSize: '12px', color: theme.hintColor }}>Wings</p>
              <p style={{ margin: '4px 0 0 0', fontSize: '16px', fontWeight: 600 }}>
                {wings.length}
              </p>
            </div>
          )}
        </div>
      </Card>

      {/* Motion */}
      {game.motion && (
        <Card style={{ marginBottom: '16px', backgroundColor: 'rgba(36, 129, 204, 0.1)' }}>
          <p style={{ margin: 0, fontSize: '12px', color: theme.hintColor }}>Motion</p>
          <p style={{ margin: '8px 0 0 0', fontSize: '16px', fontWeight: 500 }}>{game.motion}</p>
        </Card>
      )}

      {/* Role Selection (if not registered and registration is open) */}
      {!game.isUserRegistered && game.status === 'registration' && (
        <Card style={{ marginBottom: '16px' }}>
          <p
            style={{
              margin: 0,
              fontSize: '14px',
              fontWeight: 600,
              marginBottom: '12px',
            }}
          >
            Select your role:
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {(['player', 'judge', 'wing'] as ParticipantRole[]).map((role) => (
              <button
                key={role}
                onClick={() => setSelectedRole(role)}
                style={{
                  padding: '12px 16px',
                  borderRadius: '8px',
                  border: '2px solid',
                  borderColor: selectedRole === role ? theme.buttonColor : theme.secondaryBgColor,
                  backgroundColor:
                    selectedRole === role
                      ? `${theme.buttonColor}20`
                      : theme.secondaryBgColor,
                  color: theme.textColor,
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontSize: '15px',
                  fontWeight: selectedRole === role ? 600 : 400,
                  textTransform: 'capitalize',
                }}
              >
                {role === 'player' && '🎤 '}
                {role === 'judge' && '⚖️ '}
                {role === 'wing' && '🪶 '}
                {role}
              </button>
            ))}
          </div>
          {selectedRole && (
            <Button
              onClick={performJoin}
              loading={joining}
              fullWidth
              style={{ marginTop: '12px' }}
            >
              Join as {selectedRole}
            </Button>
          )}
        </Card>
      )}

      {/* Leave Game Button (if registered) */}
      {game.isUserRegistered && game.status === 'registration' && (
        <Button onClick={handleLeaveGame} variant="danger" fullWidth style={{ marginBottom: '16px' }}>
          Leave Game
        </Button>
      )}

      {/* Participants List */}
      <div>
        <h3
          style={{
            fontSize: '14px',
            fontWeight: 600,
            color: theme.hintColor,
            textTransform: 'uppercase',
            marginBottom: '12px',
          }}
        >
          Participants ({game.participants.length})
        </h3>

        {game.participants.length === 0 ? (
          <Card style={{ textAlign: 'center', padding: '24px' }}>
            <p style={{ color: theme.hintColor, margin: 0 }}>No participants yet</p>
          </Card>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {game.participants.map((participant) => (
              <ParticipantItem key={participant.id} participant={participant} />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

const ParticipantItem: React.FC<{ participant: GameParticipant }> = ({ participant }) => {
  const { theme } = useTelegram();

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'player':
        return '🎤';
      case 'judge':
        return '⚖️';
      case 'wing':
        return '🪶';
      default:
        return '👤';
    }
  };

  const getPositionShort = (position: string) => {
    switch (position) {
      case 'opening_government':
        return 'OG';
      case 'opening_opposition':
        return 'OO';
      case 'closing_government':
        return 'CG';
      case 'closing_opposition':
        return 'CO';
      default:
        return '';
    }
  };

  const name = participant.firstName || participant.username || 'Anonymous';

  return (
    <Card padding style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      <span style={{ fontSize: '20px' }}>{getRoleIcon(participant.role)}</span>
      <div style={{ flex: 1 }}>
        <p style={{ margin: 0, fontSize: '15px', fontWeight: 500 }}>{name}</p>
        <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: theme.hintColor, textTransform: 'capitalize' }}>
          {participant.role}
        </p>
      </div>
      {participant.position && participant.position !== 'none' && (
        <span
          style={{
            padding: '4px 8px',
            backgroundColor: theme.buttonColor,
            color: theme.buttonTextColor,
            borderRadius: '4px',
            fontSize: '12px',
            fontWeight: 600,
          }}
        >
          {getPositionShort(participant.position)}
        </span>
      )}
    </Card>
  );
};
