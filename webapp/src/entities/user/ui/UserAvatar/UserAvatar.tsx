import React from 'react';
import { useTelegram } from '@/shared/telegram';

interface UserAvatarProps {
  name: string;
  size?: number;
}

export const UserAvatar: React.FC<UserAvatarProps> = ({ name, size = 64 }) => {
  const { theme } = useTelegram();

  const style: React.CSSProperties = {
    width: size,
    height: size,
    borderRadius: '50%',
    backgroundColor: theme.buttonColor,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: size * 0.44,
    color: theme.buttonTextColor,
    fontWeight: 600,
  };

  return <div style={style}>{name.charAt(0).toUpperCase()}</div>;
};
