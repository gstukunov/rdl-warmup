import React from 'react';
import { cn } from '@/shared/lib';

interface UserAvatarProps {
  name: string;
  size?: number;
  className?: string;
}

export const UserAvatar: React.FC<UserAvatarProps> = ({ name, size = 64, className }) => {
  return (
    <div
      className={cn(
        'rounded-full flex items-center justify-center font-semibold bg-telegram-button text-telegram-button-text',
        className
      )}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.44,
      }}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
};
