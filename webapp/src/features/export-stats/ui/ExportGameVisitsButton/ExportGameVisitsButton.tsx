import React, { useState } from 'react';
import { Button } from '@/shared/ui';
import { statsApi } from '@/entities/stats';
import { downloadFileFromUrl } from '../../lib';
import { buildGameVisitsFileName } from '../../model';

interface ExportGameVisitsButtonProps {
  className?: string;
}

/**
 * Downloads the "participants × games" attendance matrix as an Excel file
 * from GET /api/stats/games/export.
 */
export const ExportGameVisitsButton: React.FC<ExportGameVisitsButtonProps> = ({
  className,
}) => {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleClick = async () => {
    if (isDownloading) return;
    setIsDownloading(true);
    try {
      await downloadFileFromUrl(
        statsApi.getGameVisitsExportUrl(),
        buildGameVisitsFileName(),
      );
    } catch (error) {
      console.error('[export] Failed to download game visits:', error);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      className={className}
      onClick={handleClick}
      loading={isDownloading}
      aria-label="Скачать посещения игр в Excel"
      title="Скачать посещения игр в Excel"
    >
      {!isDownloading && (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
      )}
      Скачать Excel
    </Button>
  );
};
