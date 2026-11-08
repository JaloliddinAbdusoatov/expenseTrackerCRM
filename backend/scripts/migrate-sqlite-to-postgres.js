/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3');
const { Client } = require('pg');

try {
  require('dotenv').config({ path: path.join(process.cwd(), '.env') });
} catch (error) {
  if (error.code !== 'MODULE_NOT_FOUND') {
    throw error;
  }
}

const SQLITE_PATH = process.env.SQLITE_PATH || path.join(process.cwd(), 'db.sqlite');
const PG_HOST = process.env.DB_HOST || 'localhost';
const PG_PORT = Number(process.env.DB_PORT || 5432);
const PG_USER = process.env.DB_USERNAME || 'postgres';
const PG_PASSWORD = process.env.DB_PASSWORD || 'postgres';
const PG_DATABASE = process.env.DB_NAME || 'emotionflow';

function quoteIdent(value) {
  return `"${String(value).replace(/"/g, '""')}"`;
}

function sqliteAll(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows || []);
    });
  });
}

function normalizeValue(value, dataType) {
  if (value === null || value === undefined) return null;
  if (dataType === 'boolean') {
    if (value === true || value === 'true' || value === 1 || value === '1') return true;
    if (value === false || value === 'false' || value === 0 || value === '0') return false;
  }
  return value;
}

async function main() {
  console.log(`Using sqlite source: ${SQLITE_PATH}`);
  console.log(`Using postgres target: ${PG_HOST}:${PG_PORT}/${PG_DATABASE}`);
  if (!fs.existsSync(SQLITE_PATH)) {
    throw new Error(
      `SQLite file not found at "${SQLITE_PATH}". Set SQLITE_PATH to the correct db.sqlite location.`,
    );
  }

  const sqliteDb = new sqlite3.Database(SQLITE_PATH, sqlite3.OPEN_READONLY);
  const pg = new Client({
    host: PG_HOST,
    port: PG_PORT,
    user: PG_USER,
    password: PG_PASSWORD,
    database: PG_DATABASE,
  });

  try {
    await pg.connect();

    const sqliteTables = (
      await sqliteAll(
        sqliteDb,
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
      )
    ).map((row) => row.name);

    if (!sqliteTables.length) {
      throw new Error('No SQLite tables found.');
    }

    const pgCols = await pg.query(
      `SELECT table_name, column_name, data_type
       FROM information_schema.columns
       WHERE table_schema = 'public'`,
    );

    const pgTables = new Map();
    for (const row of pgCols.rows) {
      if (!pgTables.has(row.table_name)) pgTables.set(row.table_name, new Map());
      pgTables.get(row.table_name).set(row.column_name, row.data_type);
    }

    const targetTables = sqliteTables.filter((t) => pgTables.has(t));
    if (!targetTables.length) {
      throw new Error(
        'No matching Postgres tables found. Start backend with DB_TYPE=postgres once to create schema.',
      );
    }

    console.log(`Found ${targetTables.length} tables to migrate.`);

    await pg.query('BEGIN');
    await pg.query("SET session_replication_role = 'replica'");

    const truncateSql = `TRUNCATE ${targetTables.map(quoteIdent).join(', ')} RESTART IDENTITY CASCADE`;
    await pg.query(truncateSql);

    for (const table of targetTables) {
      const rows = await sqliteAll(sqliteDb, `SELECT * FROM ${quoteIdent(table)}`);
      if (!rows.length) {
        console.log(`- ${table}: 0 rows`);
        continue;
      }

      const tableCols = pgTables.get(table);
      const cols = Object.keys(rows[0]).filter((col) => tableCols.has(col));
      if (!cols.length) {
        console.log(`- ${table}: skipped (no common columns)`);
        continue;
      }

      const chunkSize = 300;
      let inserted = 0;

      for (let i = 0; i < rows.length; i += chunkSize) {
        const chunk = rows.slice(i, i + chunkSize);
        const values = [];
        const tuples = [];

        chunk.forEach((row) => {
          const tuple = cols.map((col) => {
            const pgType = tableCols.get(col);
            const normalized = normalizeValue(row[col], pgType);
            values.push(normalized);
            return `$${values.length}`;
          });
          tuples.push(`(${tuple.join(', ')})`);
        });

        const insertSql = `INSERT INTO ${quoteIdent(table)} (${cols
          .map(quoteIdent)
          .join(', ')}) VALUES ${tuples.join(', ')}`;
        await pg.query(insertSql, values);
        inserted += chunk.length;
      }

      console.log(`- ${table}: ${inserted} rows`);
    }

    await pg.query("SET session_replication_role = 'origin'");
    await pg.query('COMMIT');
    console.log('SQLite -> PostgreSQL migration completed successfully.');
  } catch (error) {
    try {
      await pg.query("SET session_replication_role = 'origin'");
      await pg.query('ROLLBACK');
    } catch {
      // ignore rollback errors
    }
    console.error('Migration failed:', error.message);
    process.exitCode = 1;
  } finally {
    sqliteDb.close();
    await pg.end();
  }
}

main();
