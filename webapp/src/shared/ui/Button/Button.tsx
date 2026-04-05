import React from 'react';
import { Button as ShadcnButton } from '@/shared/ui/button';
import { useTelegram } from '@/shared/telegram';

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  size?: 'sm' | 'md' | 'lg';
  style?: React.CSSProperties;
  className?: string;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  onClick,
  type = 'button',
  variant = 'primary',
  disabled = false,
  loading = false,
  fullWidth = false,
  size = 'md',
  style: customStyle,
  className,
}) => {
  const { impactOccurred } = useTelegram();

  const handleClick = () => {
    if (!disabled && !loading && onClick) {
      impactOccurred('medium');
      onClick();
    }
  };

  // Map old variant names to shadcn variants
  const variantMap: Record<string, 'default' | 'secondary' | 'destructive' | 'outline' | 'ghost' | 'link'> = {
    primary: 'default',
    secondary: 'secondary',
    danger: 'destructive',
  };

  // Map old size names to shadcn sizes
  const sizeMap: Record<string, 'default' | 'sm' | 'lg' | 'icon'> = {
    sm: 'sm',
    md: 'default',
    lg: 'lg',
  };

  return (
    <ShadcnButton
      type={type}
      onClick={handleClick}
      disabled={disabled}
      loading={loading}
      variant={variantMap[variant]}
      size={sizeMap[size]}
      className={`${fullWidth ? 'w-full' : ''} ${className || ''}`}
      style={customStyle}
    >
      {children}
    </ShadcnButton>
  );
};
