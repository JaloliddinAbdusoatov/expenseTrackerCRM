/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { Client } = require('pg');

try {
  require('dotenv').config({ path: path.join(process.cwd(), '.env') });
} catch (error) {
  if (error.code !== 'MODULE_NOT_FOUND') {
    throw error;
  }
}

const DEFAULT_REQUIRED_TABLES = [
  'user',
  'income',
  'expense',
  'goal',
  'shared_goal',
  'shared_goal_invitation',
  'challenge',
  'challenge_participant',
  'achievement',
  'budget',
];

function parseBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
}

function resolveSqlitePath() {
  const candidates = [
    process.env.SQLITE_PATH,
    path.join(process.cwd(), 'bootstrap', 'db.sqlite'),
    path.join(process.cwd(), 'db.sqlite'),
  ].filter(Boolean);

  return candidates.find((candidate) => fs.existsSync(candidate)) || null;
}

function ensureUploadsDirectory() {
  const uploadsPath = path.join(process.cwd(), 'uploads', 'photos');
  fs.mkdirSync(uploadsPath, { recursive: true });
  console.log(`Prepared uploads directory: ${uploadsPath}`);
}

async function waitForPostgres() {
  const maxAttempts = Number(process.env.POSTGRES_WAIT_MAX_ATTEMPTS || 30);
  const delayMs = Number(process.env.POSTGRES_WAIT_DELAY_MS || 2000);

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const client = new Client({
      host: process.env.DB_HOST || 'postgres',
      port: Number(process.env.DB_PORT || 5432),
      user: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_NAME || 'emotionflow',
    });

    try {
      await client.connect();
      await client.query('SELECT 1');
      await client.end();
      console.log(`Postgres is ready after ${attempt} attempt(s).`);
      return;
    } catch (error) {
      try {
        await client.end();
      } catch {
        // ignore close errors
      }

      if (attempt === maxAttempts) {
        throw new Error(`Postgres did not become ready in time: ${error.message}`);
      }

      console.log(
        `Waiting for Postgres (${attempt}/${maxAttempts}): ${error.message}. Retrying in ${delayMs}ms...`,
      );
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

async function ensureSchema() {
  require('reflect-metadata');
  const { DataSource } = require('typeorm');
  const { getTypeOrmConfig } = require(path.join(process.cwd(), 'dist', 'config', 'typeorm.config.js'));

  const dataSource = new DataSource(getTypeOrmConfig());

  try {
    await dataSource.initialize();
    console.log('TypeORM schema synchronization completed.');
  } finally {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  }
}

async function isDatabaseEmpty() {
  const requiredTables = (process.env.MIGRATION_REQUIRED_TABLES || DEFAULT_REQUIRED_TABLES.join(','))
    .split(',')
    .map((table) => table.trim())
    .filter(Boolean);

  const client = new Client({
    host: process.env.DB_HOST || 'postgres',
    port: Number(process.env.DB_PORT || 5432),
    user: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'emotionflow',
  });

  try {
    await client.connect();

    let totalRows = 0;
    for (const table of requiredTables) {
      const result = await client.query(`SELECT COUNT(*)::int AS count FROM "${table}"`);
      totalRows += Number(result.rows[0]?.count || 0);
    }

    console.log(`Detected ${totalRows} rows across ${requiredTables.length} bootstrap table(s).`);
    return totalRows === 0;
  } finally {
    await client.end();
  }
}

function runMigration(sqlitePath) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['scripts/migrate-sqlite-to-postgres.js'], {
      stdio: 'inherit',
      env: {
        ...process.env,
        SQLITE_PATH: sqlitePath,
      },
    });

    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`SQLite to Postgres migration exited with code ${code}`));
    });

    child.on('error', reject);
  });
}

async function countArtificialUsers() {
  const client = new Client({
    host: process.env.DB_HOST || 'postgres',
    port: Number(process.env.DB_PORT || 5432),
    user: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'emotionflow',
  });
  try {
    await client.connect();
    const result = await client.query(
      `SELECT COUNT(*)::int AS c FROM "user" WHERE email LIKE '%@artificial.local'`,
    );
    return Number(result.rows[0]?.c ?? 0);
  } finally {
    await client.end();
  }
}

async function runPostgresArtificialUsersSeed() {
  const seedPath = path.join(process.cwd(), 'scripts', 'seed-artificial-users.postgres.sql');
  if (!fs.existsSync(seedPath)) {
    console.warn(`Artificial users seed file not found: ${seedPath}`);
    return;
  }
  let sql = fs.readFileSync(seedPath, 'utf8');
  sql = sql.replace(/^--[^\n]*\n/gm, '').trim();
  const client = new Client({
    host: process.env.DB_HOST || 'postgres',
    port: Number(process.env.DB_PORT || 5432),
    user: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'emotionflow',
  });
  await client.connect();
  try {
    const chunks = sql
      .split(/;\s*\n/g)
      .map((s) => s.trim())
      .filter(Boolean);
    for (const chunk of chunks) {
      await client.query(`${chunk};`);
    }
    console.log('Artificial users Postgres seed completed.');
  } finally {
    await client.end();
  }
}

function startBackend() {
  const child = spawn(process.execPath, ['dist/main.js'], {
    stdio: 'inherit',
    env: process.env,
  });

  const forwardSignal = (signal) => {
    if (!child.killed) {
      child.kill(signal);
    }
  };

  process.on('SIGINT', forwardSignal);
  process.on('SIGTERM', forwardSignal);

  child.on('exit', (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }

    process.exit(code ?? 0);
  });
}

async function main() {
  ensureUploadsDirectory();

  const dbType = String(process.env.DB_TYPE || 'sqlite').toLowerCase();
  if (dbType !== 'postgres') {
    console.log(`DB_TYPE=${dbType}; bootstrap migration is skipped.`);
    startBackend();
    return;
  }

  await waitForPostgres();
  await ensureSchema();

  const dbEmpty = await isDatabaseEmpty();
  const autoMigrate = parseBoolean(process.env.AUTO_MIGRATE_SQLITE_TO_POSTGRES, true);
  const failOnEmpty = parseBoolean(process.env.FAIL_ON_EMPTY_POSTGRES, false);
  const sqlitePath = resolveSqlitePath();

  if (dbEmpty) {
    if (autoMigrate && sqlitePath) {
      console.log(`Postgres is empty. Importing data from SQLite: ${sqlitePath}`);
      await runMigration(sqlitePath);
    } else if (failOnEmpty) {
      throw new Error(
        'Postgres is empty and bootstrap data was not imported. Provide SQLite data or disable FAIL_ON_EMPTY_POSTGRES.',
      );
    } else if (autoMigrate) {
      console.log('Postgres is empty, but no SQLite source was found. Backend will start with an empty database.');
    } else {
      console.log('Postgres is empty and AUTO_MIGRATE_SQLITE_TO_POSTGRES=false. Backend will start with an empty database.');
    }
  } else {
    console.log('Postgres already contains data. Bootstrap migration skipped.');
  }

  const autoSeedArtificial = parseBoolean(process.env.AUTO_SEED_ARTIFICIAL_USERS, true);
  if (autoSeedArtificial) {
    const artificialCount = await countArtificialUsers();
    if (artificialCount === 0) {
      console.log('No @artificial.local users found; running Postgres artificial-users seed.');
      await runPostgresArtificialUsersSeed();
    } else {
      console.log(
        `Artificial user seed skipped (${artificialCount} @artificial.local user(s) already present).`,
      );
    }
  } else {
    console.log('AUTO_SEED_ARTIFICIAL_USERS=false; skipping artificial user seed.');
  }

  startBackend();
}

main().catch((error) => {
  console.error('Docker bootstrap failed:', error);
  process.exit(1);
});
