import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

// Ensure .env is loaded before TypeORM entity decorators are evaluated
function loadEnvFile() {
  const envPath = join(process.cwd(), '.env');
  if (existsSync(envPath)) {
    const content = readFileSync(envPath, 'utf8');
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx !== -1) {
        const key = trimmed.slice(0, eqIdx).trim();
        let value = trimmed.slice(eqIdx + 1).trim();
        // Remove enclosing quotes if present
        if (
          (value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))
        ) {
          value = value.slice(1, -1);
        }
        if (process.env[key] === undefined) {
          process.env[key] = value;
        }
      }
    }
  }
}

loadEnvFile();

export const isPostgres = (): boolean =>
  (process.env.DB_TYPE || 'sqlite').toLowerCase() === 'postgres';

export const getDateTimeColumnType = (): 'timestamp' | 'datetime' =>
  isPostgres() ? 'timestamp' : 'datetime';
