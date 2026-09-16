import { downloadFile } from '@telegram-apps/sdk';

/**
 * Triggers a file download that works both inside the Telegram Mini App and
 * in a regular browser.
 *
 * - Telegram (Mini Apps v8.0+): uses the native download prompt via the SDK.
 * - Everywhere else (or if Telegram refuses): a plain anchor click, which the
 *   browser turns into a download thanks to the server's Content-Disposition.
 */
export async function downloadFileFromUrl(
  url: string,
  fileName: string,
): Promise<void> {
  if (downloadFile.isAvailable()) {
    try {
      await downloadFile(url, fileName);
      return;
    } catch (error) {
      console.warn('[export] Telegram downloadFile failed, falling back:', error);
    }
  }

  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
