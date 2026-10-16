const DEV_APP_URL = 'http://localhost:3000';

export function getAppUrl() {
  const appUrl = process.env.AUTH_URL;

  if (appUrl) {
    return appUrl;
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('AUTH_URL is not set');
  }

  return DEV_APP_URL;
}
