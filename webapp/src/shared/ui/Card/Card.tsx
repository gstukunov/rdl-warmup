import React from 'react';
import { Card as ShadcnCard, CardContent } from '@/shared/ui/card';
import { useTelegram } from '@/shared/telegram';
import { cn } from '@/shared/lib';

interface CardProps {
  children: React.ReactNode;
  onClick?: () => void;
  padding?: boolean;
  style?: React.CSSProperties;
  className?: string;
}

export const Card: React.FC<CardProps> = ({
  children,
  onClick,
  padding = true,
  style: customStyle,
  className,
}) => {
  const { impactOccurred } = useTelegram();

  const handleClick = () => {
    if (onClick) {
      impactOccurred('light');
      onClick();
    }
  };

  return (
    <ShadcnCard
      onClick={onClick ? handleClick : undefined}
      className={cn(
        'transition-all duration-100',
        onClick && 'cursor-pointer active:scale-[0.98] active:opacity-90',
        !padding && '[&>div]:p-0',
        className
      )}
      style={customStyle}
    >
      <CardContent className={cn(!padding && 'p-0')}>{children}</CardContent>
    </ShadcnCard>
  );
};
