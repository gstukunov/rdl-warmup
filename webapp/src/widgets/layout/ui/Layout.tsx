import React from 'react';
import { useTelegram } from '@/shared/telegram';
import { cn } from '@/shared/lib';

interface LayoutProps {
  children: React.ReactNode;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  padding?: boolean;
  className?: string;
}

export const Layout: React.FC<LayoutProps> = ({
  children,
  header,
  footer,
  padding = true,
  className,
}) => {
  const { viewportHeight } = useTelegram();

  return (
    <div 
      className={cn('flex flex-col bg-telegram-bg text-telegram-text', className)}
      style={{ minHeight: `${viewportHeight}px` }}
    >
      {header && (
        <header className="sticky top-0 z-10 px-4 py-4 border-b border-telegram-secondary-bg bg-telegram-bg">
          {header}
        </header>
      )}
      <main className={cn('flex-1 overflow-y-auto', padding && 'p-4')}>
        {children}
      </main>
      {footer && (
        <footer className="px-4 py-4 border-t border-telegram-secondary-bg bg-telegram-bg">
          {footer}
        </footer>
      )}
    </div>
  );
};
