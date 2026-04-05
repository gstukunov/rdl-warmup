import { cn } from '@/shared/lib';

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('animate-pulse rounded-md bg-telegram-secondary-bg', className)} {...props} />;
}

export { Skeleton };
