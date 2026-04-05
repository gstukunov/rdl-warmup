import React from 'react';
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
}) => {
  const { theme, impactOccurred } = useTelegram();

  const handleClick = () => {
    if (!disabled && !loading && onClick) {
      impactOccurred('medium');
      onClick();
    }
  };

  const getBackgroundColor = () => {
    if (disabled) return theme.hintColor;
    switch (variant) {
      case 'primary':
        return theme.buttonColor;
      case 'secondary':
        return theme.secondaryBgColor;
      case 'danger':
        return '#e74c3c';
      default:
        return theme.buttonColor;
    }
  };

  const getTextColor = () => {
    if (variant === 'secondary') return theme.textColor;
    return variant === 'primary' ? theme.buttonTextColor : '#ffffff';
  };

  const getPadding = () => {
    switch (size) {
      case 'sm':
        return '8px 16px';
      case 'lg':
        return '16px 24px';
      default:
        return '12px 20px';
    }
  };

  const getFontSize = () => {
    switch (size) {
      case 'sm':
        return '14px';
      case 'lg':
        return '18px';
      default:
        return '16px';
    }
  };

  const style: React.CSSProperties = {
    backgroundColor: getBackgroundColor(),
    color: getTextColor(),
    border: 'none',
    borderRadius: '8px',
    padding: getPadding(),
    fontSize: getFontSize(),
    fontWeight: 600,
    cursor: disabled || loading ? 'not-allowed' : 'pointer',
    width: fullWidth ? '100%' : 'auto',
    opacity: disabled || loading ? 0.6 : 1,
    transition: 'opacity 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    ...customStyle,
  };

  return (
    <button type={type} style={style} onClick={handleClick} disabled={disabled || loading}>
      {loading && <span>⏳</span>}
      {children}
    </button>
  );
};
