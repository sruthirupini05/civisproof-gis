// Public application domain configuration
export const LIVE_BASE_URL = 'https://civisproof-gis.vercel.app';

/**
 * Returns the public URL to encode into QR codes.
 * If running on localhost, defaults to the live deployed URL so external
 * mobile phones scanning physical or screen QR codes open the real live application.
 */
export function getPublicAppUrl() {
  if (import.meta.env.VITE_APP_URL) {
    return import.meta.env.VITE_APP_URL;
  }
  if (
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ) {
    return LIVE_BASE_URL;
  }
  return typeof window !== 'undefined' ? window.location.origin : LIVE_BASE_URL;
}
