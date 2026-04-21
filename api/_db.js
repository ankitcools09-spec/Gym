import { sql } from '@vercel/postgres';

export async function query(text, params) {
  try {
    const result = await sql.query(text, params);
    return result.rows;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

export { sql };
