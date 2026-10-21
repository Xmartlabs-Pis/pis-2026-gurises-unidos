import { config as loadEnvFiles } from 'dotenv';

loadEnvFiles({
  path: ['.env.development.local', '.env.local', '.env.development', '.env'],
  quiet: true,
});

function databaseName(url: string) {
  try {
    return decodeURIComponent(new URL(url).pathname).replace(/^\/+/, '');
  } catch {
    return url;
  }
}

export function e2eDatabaseUrl() {
  const url = process.env.E2E_DATABASE_URL;

  if (!url) {
    throw new Error(
      'E2E_DATABASE_URL environment variable is required: the e2e scripts truncate and delete rows, so they refuse to fall back to DATABASE_URL'
    );
  }

  const name = databaseName(url);
  if (!name) {
    throw new Error(
      `E2E_DATABASE_URL must name a database, "${url}" has none: without one the e2e scripts would truncate the server's default database`
    );
  }

  const developmentUrl = process.env.DATABASE_URL;
  if (developmentUrl && name === databaseName(developmentUrl)) {
    throw new Error(
      `E2E_DATABASE_URL must name a different database than DATABASE_URL, both are "${name}": the e2e scripts truncate and delete rows, and the same name on the same server is the same database however the host is spelled`
    );
  }

  return url;
}
