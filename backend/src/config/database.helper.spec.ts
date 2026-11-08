import { isPostgres, getDateTimeColumnType } from './database.helper';

describe('database.helper', () => {
  const originalEnv = process.env.DB_TYPE;

  afterEach(() => {
    process.env.DB_TYPE = originalEnv;
  });

  it('detects sqlite correctly by default or explicit', () => {
    process.env.DB_TYPE = 'sqlite';
    expect(isPostgres()).toBe(false);
    expect(getDateTimeColumnType()).toBe('datetime');
  });

  it('detects postgres correctly', () => {
    process.env.DB_TYPE = 'postgres';
    expect(isPostgres()).toBe(true);
    expect(getDateTimeColumnType()).toBe('timestamp');
  });
});

