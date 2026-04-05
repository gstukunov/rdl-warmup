import React from 'react';
import { useTelegram } from '@/shared/telegram';

interface CardProps {
  children: React.ReactNode;
  onClick?: () => void;
  padding?: boolean;
  style?: React.CSSProperties;
}

export const Card: React.FC<CardProps> = ({
  children,
  onClick,
  padding = true,
  style: customStyle,
}) => {
  const { theme, impactOccurred } = useTelegram();

  const handleClick = () => {
    if (onClick) {
      impactOccurred('light');
      onClick();
    }
  };

  const style: React.CSSProperties = {
    backgroundColor: theme.secondaryBgColor,
    borderRadius: '12px',
    padding: padding ? '16px' : 0,
    cursor: onClick ? 'pointer' : 'default',
    transition: 'transform 0.1s ease, opacity 0.1s ease',
    ...customStyle,
  };

  return (
    <div
      style={style}
      onClick={onClick ? handleClick : undefined}
      onTouchStart={(e) => {
        if (onClick) {
          e.currentTarget.style.transform = 'scale(0.98)';
          e.currentTarget.style.opacity = '0.9';
        }
      }}
      onTouchEnd={(e) => {
        if (onClick) {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.opacity = '1';
        }
      }}
    >
      {children}
    </div>
  );
};
