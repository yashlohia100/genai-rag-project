import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

// A "vector database" in its simplest form: a list of { text, embedding } records
// kept in memory, persisted to a JSON file, searched by comparing every vector.
// Real vector DBs (pgvector, Qdrant, ...) do the same job but use indexes (HNSW)
// so they don't have to compare against every single record.

const DATA_FILE = path.resolve(import.meta.dirname, '../data/vectors.json');

let store = { documents: [], chunks: [] };
let saving = Promise.resolve();

export async function load() {
  try {
    store = JSON.parse(await fs.readFile(DATA_FILE, 'utf8'));
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
  }
}

// Writes are queued so two uploads finishing together can't corrupt the file.
function save() {
  saving = saving.then(async () => {
    await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
    const tmp = `${DATA_FILE}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(store));
    await fs.rename(tmp, DATA_FILE);
  });
  return saving;
}

/**
 * Cosine similarity: how closely two vectors point in the same direction.
 * 1 = same meaning, ~0 = unrelated. (Our vectors are normalized to length 1,
 * so this equals the dot product, but the full formula is shown for learning.)
 */
export function cosineSimilarity(a, b) {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export function listDocuments() {
  return store.documents;
}

export async function addDocument({ name, chunks }) {
  const doc = {
    id: crypto.randomUUID(),
    name,
    chunkCount: chunks.length,
    createdAt: new Date().toISOString(),
  };
  store.documents.push(doc);
  chunks.forEach(({ text, embedding }, index) => {
    store.chunks.push({ id: crypto.randomUUID(), docId: doc.id, docName: name, index, text, embedding });
  });
  await save();
  return doc;
}

export async function deleteDocument(id) {
  const before = store.documents.length;
  store.documents = store.documents.filter((d) => d.id !== id);
  if (store.documents.length === before) return false;
  store.chunks = store.chunks.filter((c) => c.docId !== id);
  await save();
  return true;
}

/** Brute-force nearest-neighbour search: score every chunk, return the top k. */
export function search(queryEmbedding, { k = 5, minScore = 0 } = {}) {
  return store.chunks
    .map(({ embedding, ...chunk }) => ({ ...chunk, score: cosineSimilarity(queryEmbedding, embedding) }))
    .filter((c) => c.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
}
