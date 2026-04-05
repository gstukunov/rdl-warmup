import React from 'react';
import { useTelegram } from '@/shared/telegram';

interface LayoutProps {
  children: React.ReactNode;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  padding?: boolean;
}

export const Layout: React.FC<LayoutProps> = ({
  children,
  header,
  footer,
  padding = true,
}) => {
  const { theme, viewportHeight } = useTelegram();

  const layoutStyle: React.CSSProperties = {
    minHeight: `${viewportHeight}px`,
    backgroundColor: theme.bgColor,
    color: theme.textColor,
    display: 'flex',
    flexDirection: 'column',
  };

  const contentStyle: React.CSSProperties = {
    flex: 1,
    overflowY: 'auto',
    padding: padding ? '16px' : 0,
  };

  return (
    <div style={layoutStyle}>
      {header && (
        <header
          style={{
            padding: '16px',
            borderBottom: `1px solid ${theme.secondaryBgColor}`,
            backgroundColor: theme.bgColor,
            position: 'sticky',
            top: 0,
            zIndex: 10,
          }}
        >
          {header}
        </header>
      )}
      <main style={contentStyle}>{children}</main>
      {footer && (
        <footer
          style={{
            padding: '16px',
            borderTop: `1px solid ${theme.secondaryBgColor}`,
            backgroundColor: theme.bgColor,
          }}
        >
          {footer}
        </footer>
      )}
    </div>
  );
};
