import fs from 'node:fs/promises';
import path from 'node:path';
import pg from 'pg';

// Defaults to the container from docker-compose.yml; override with DATABASE_URL in .env.
const DATABASE_URL = process.env.DATABASE_URL || 'postgres://docmind:docmind@localhost:5434/docmind';
const SCHEMA_FILE = path.resolve(import.meta.dirname, '../schema.sql');

export const pool = new pg.Pool({ connectionString: DATABASE_URL });

export async function initDb() {
  const schema = await fs.readFile(SCHEMA_FILE, 'utf8');
  try {
    await pool.query(schema);
  } catch (err) {
    if (err.code === 'ECONNREFUSED') {
      throw new Error(`Could not connect to Postgres at ${new URL(DATABASE_URL).host}. Is the container running? Try: docker compose up -d`);
    }
    throw err;
  }
}
