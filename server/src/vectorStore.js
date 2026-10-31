import { pool } from './db.js';

// The same job as the old JSON store (see git history), now done by Postgres + pgvector:
// vectors live in a `vector(384)` column and similarity is computed inside the database.

// pgvector accepts vectors as text like '[0.12,-0.5,...]', which is exactly JSON array syntax.
const toVector = (embedding) => JSON.stringify(embedding);

const DOCUMENT_COLUMNS = 'id, name, chunk_count AS "chunkCount", created_at AS "createdAt"';

export async function listDocuments() {
  const { rows } = await pool.query(`SELECT ${DOCUMENT_COLUMNS} FROM documents ORDER BY created_at`);
  return rows;
}

export async function addDocument({ name, chunks }) {
  const client = await pool.connect();
  try {
    // A transaction: either the document and all its chunks are saved, or nothing is.
    await client.query('BEGIN');
    const {
      rows: [doc],
    } = await client.query(`INSERT INTO documents (name, chunk_count) VALUES ($1, $2) RETURNING ${DOCUMENT_COLUMNS}`, [
      name,
      chunks.length,
    ]);
    // unnest() turns parallel arrays into rows, so all chunks go in with one query.
    await client.query(
      `INSERT INTO chunks (document_id, chunk_index, content, embedding)
       SELECT $1, t.idx, t.content, t.embedding::vector
         FROM unnest($2::int[], $3::text[], $4::text[]) AS t(idx, content, embedding)`,
      [doc.id, chunks.map((_, i) => i), chunks.map((c) => c.text), chunks.map((c) => toVector(c.embedding))],
    );
    await client.query('COMMIT');
    return doc;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function deleteDocument(id) {
  // Chunks are removed automatically by ON DELETE CASCADE.
  const { rowCount } = await pool.query('DELETE FROM documents WHERE id = $1', [id]);
  return rowCount > 0;
}

/**
 * Nearest-neighbour search.
 * `<=>` is pgvector's cosine *distance* operator: 0 = identical, so similarity = 1 - distance.
 * `ORDER BY distance LIMIT k` is the query shape the HNSW index can accelerate.
 *
 * `documentIds` is a metadata filter: undefined searches everything, an array restricts
 * the search to those documents. (At large scale, filtering + HNSW needs care: the index
 * finds ~40 candidates first and the WHERE clause can discard most of them. pgvector's
 * `hnsw.iterative_scan` setting addresses that. With small data, Postgres skips the
 * index and scans exactly.)
 */
export async function search(queryEmbedding, { k = 5, minScore = 0, documentIds } = {}) {
  const { rows } = await pool.query(
    `SELECT c.document_id AS "docId", d.name AS "docName", c.chunk_index AS index, c.content AS text,
            1 - (c.embedding <=> $1::vector) AS score
       FROM chunks c
       JOIN documents d ON d.id = c.document_id
      WHERE $3::uuid[] IS NULL OR c.document_id = ANY($3::uuid[])
      ORDER BY c.embedding <=> $1::vector
      LIMIT $2`,
    [toVector(queryEmbedding), k, documentIds ?? null],
  );
  return rows.filter((r) => r.score >= minScore);
}
