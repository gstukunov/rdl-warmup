import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { userApi } from '../api/user';
import { useTelegram } from '../hooks/useTelegram';
import { Layout } from '../components/Layout';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import type { UserProfile, JudgeStats } from '../types';

export const Profile: React.FC = () => {
  const navigate = useNavigate();
  const { theme, user, hideBackButton, showBackButton, notificationOccurred } = useTelegram();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [judgeStats, setJudgeStats] = useState<JudgeStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    showBackButton(() => navigate('/'));
    loadProfile();
    return () => hideBackButton();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const [profileData, judgeData] = await Promise.all([
        userApi.getProfile(),
        userApi.getJudgeStats(),
      ]);
      setProfile(profileData);
      setJudgeStats(judgeData);
    } catch (err) {
      notificationOccurred('error');
    } finally {
      setLoading(false);
    }
  };

  const handleEditProfile = () => {
    // Could open a modal or navigate to edit page
    notificationOccurred('error');
    alert('Profile editing coming soon!');
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
          Loading profile...
        </div>
      </Layout>
    );
  }

  if (!profile) {
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
          <p style={{ color: theme.hintColor }}>Failed to load profile</p>
          <Button onClick={loadProfile} variant="secondary">
            Try Again
          </Button>
        </div>
      </Layout>
    );
  }

  const displayName =
    profile.user.firstName || profile.user.username || user?.first_name || 'User';
  const fullName = [profile.user.firstName, profile.user.lastName]
    .filter(Boolean)
    .join(' ');

  const header = (
    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
      <div
        style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          backgroundColor: theme.buttonColor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '28px',
          color: theme.buttonTextColor,
          fontWeight: 600,
        }}
      >
        {displayName.charAt(0).toUpperCase()}
      </div>
      <div style={{ flex: 1 }}>
        <h1 style={{ margin: '0 0 4px 0', fontSize: '20px', fontWeight: 700 }}>
          {fullName || displayName}
        </h1>
        {profile.user.username && (
          <p style={{ margin: 0, fontSize: '14px', color: theme.hintColor }}>
            @{profile.user.username}
          </p>
        )}
      </div>
    </div>
  );

  return (
    <Layout header={header}>
      {/* Speaker Stats */}
      <Card style={{ marginBottom: '16px' }}>
        <h2
          style={{
            fontSize: '14px',
            fontWeight: 600,
            color: theme.hintColor,
            textTransform: 'uppercase',
            marginBottom: '16px',
            letterSpacing: '0.5px',
          }}
        >
          🏆 Speaker Stats
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <StatItem
            value={profile.gamesPlayed}
            label="Games Played"
            icon="🎮"
          />
          <StatItem
            value={profile.averageSpeakerScore.toFixed(1)}
            label="Avg Score"
            icon="⭐"
          />
        </div>
      </Card>

      {/* Judge Stats */}
      {judgeStats && judgeStats.totalFeedbacks > 0 && (
        <Card style={{ marginBottom: '16px' }}>
          <h2
            style={{
              fontSize: '14px',
              fontWeight: 600,
              color: theme.hintColor,
              textTransform: 'uppercase',
              marginBottom: '16px',
              letterSpacing: '0.5px',
            }}
          >
            ⚖️ Judge Stats
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <StatItem
              value={judgeStats.averageScore.toFixed(1)}
              label="Avg Rating"
              icon="⭐"
              suffix="/7"
            />
            <StatItem
              value={judgeStats.totalFeedbacks}
              label="Feedbacks"
              icon="💬"
            />
          </div>
        </Card>
      )}

      {/* Account Info */}
      <Card style={{ marginBottom: '16px' }}>
        <h2
          style={{
            fontSize: '14px',
            fontWeight: 600,
            color: theme.hintColor,
            textTransform: 'uppercase',
            marginBottom: '16px',
            letterSpacing: '0.5px',
          }}
        >
          Account Info
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <InfoRow label="Telegram ID" value={profile.user.telegramId} />
          <InfoRow
            label="Member Since"
            value={new Date(profile.user.createdAt).toLocaleDateString()}
          />
          <InfoRow
            label="Status"
            value={profile.user.isActive ? '✅ Active' : '❌ Inactive'}
          />
        </div>
      </Card>

      {/* Quick Actions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <Button onClick={() => navigate('/')} fullWidth>
          🎮 View Games
        </Button>
        <Button onClick={handleEditProfile} variant="secondary" fullWidth>
          ✏️ Edit Profile
        </Button>
      </div>
    </Layout>
  );
};

const StatItem: React.FC<{
  value: string | number;
  label: string;
  icon: string;
  suffix?: string;
}> = ({ value, label, icon, suffix }) => {
  const { theme } = useTelegram();

  return (
    <div
      style={{
        textAlign: 'center',
        padding: '16px',
        backgroundColor: `${theme.buttonColor}10`,
        borderRadius: '12px',
      }}
    >
      <div style={{ fontSize: '24px', marginBottom: '4px' }}>{icon}</div>
      <div
        style={{
          fontSize: '28px',
          fontWeight: 700,
          color: theme.buttonColor,
          lineHeight: 1,
        }}
      >
        {value}
        {suffix && (
          <span style={{ fontSize: '16px', fontWeight: 400, color: theme.hintColor }}>
            {suffix}
          </span>
        )}
      </div>
      <div style={{ fontSize: '12px', color: theme.hintColor, marginTop: '4px' }}>
        {label}
      </div>
    </div>
  );
};

const InfoRow: React.FC<{ label: string; value: string }> = ({ label, value }) => {
  const { theme } = useTelegram();

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '8px 0',
        borderBottom: `1px solid ${theme.secondaryBgColor}`,
      }}
    >
      <span style={{ fontSize: '14px', color: theme.hintColor }}>{label}</span>
      <span style={{ fontSize: '14px', fontWeight: 500 }}>{value}</span>
    </div>
  );
};
