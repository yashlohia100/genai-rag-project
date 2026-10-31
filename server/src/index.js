import express from 'express';
import multer from 'multer';
import { initDb } from './db.js';
import { warmUp } from './embeddings.js';
import { ingestFile, UnsupportedFileError } from './ingest.js';
import { streamChat } from './llm.js';
import { buildMessages, retrieve } from './rag.js';
import * as vectorStore from './vectorStore.js';

const PORT = process.env.PORT || 3001;

const app = express();
app.use(express.json());
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isValidDocumentIds = (ids) => ids === undefined || (Array.isArray(ids) && ids.every((id) => UUID_RE.test(id)));

app.get('/api/documents', async (req, res) => {
  res.json(await vectorStore.listDocuments());
});

app.post('/api/documents', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded (expected form field "file").' });
  const started = Date.now();
  const doc = await ingestFile(req.file);
  console.log(`Ingested "${doc.name}": ${doc.chunkCount} chunks in ${Date.now() - started}ms`);
  res.status(201).json(doc);
});

app.delete('/api/documents/:id', async (req, res) => {
  const deleted = UUID_RE.test(req.params.id) && (await vectorStore.deleteDocument(req.params.id));
  if (!deleted) return res.status(404).json({ error: 'Document not found.' });
  res.status(204).end();
});

// Debug endpoint: see exactly which chunks a query retrieves and their scores.
app.post('/api/search', async (req, res) => {
  const { query, k = 5, documentIds } = req.body ?? {};
  if (!query) return res.status(400).json({ error: '"query" is required.' });
  if (!isValidDocumentIds(documentIds)) return res.status(400).json({ error: '"documentIds" must be an array of document ids.' });
  res.json(await retrieve(query, { k, minScore: 0, documentIds }));
});

// Streams newline-delimited JSON events: sources, then tokens, then done (or error).
// Optional `documentIds` limits retrieval to those documents.
app.post('/api/chat', async (req, res) => {
  const { messages, documentIds } = req.body ?? {};
  const question = messages?.at(-1);
  if (!Array.isArray(messages) || question?.role !== 'user' || !question.content) {
    return res.status(400).json({ error: '"messages" must be an array ending with a user message.' });
  }
  if (!isValidDocumentIds(documentIds)) return res.status(400).json({ error: '"documentIds" must be an array of document ids.' });

  const sources = await retrieve(question.content, { documentIds });
  const llmMessages = buildMessages(messages.slice(0, -1), question.content, sources);

  res.setHeader('Content-Type', 'application/x-ndjson');
  const send = (event) => res.write(JSON.stringify(event) + '\n');

  send({
    type: 'sources',
    sources: sources.map(({ docName, index, text, score }) => ({ docName, chunkIndex: index, text, score })),
  });
  try {
    for await (const text of streamChat(llmMessages)) send({ type: 'token', text });
    send({ type: 'done' });
  } catch (err) {
    console.error(err);
    send({ type: 'error', message: err.message });
  }
  res.end();
});

app.use((err, req, res, next) => {
  const status = err instanceof UnsupportedFileError || err instanceof multer.MulterError ? 400 : 500;
  if (status === 500) console.error(err);
  res.status(status).json({ error: err.message });
});

try {
  await initDb();
} catch (err) {
  console.error(err.message);
  process.exit(1);
}
app.listen(PORT, () => console.log(`DocMind server running on http://localhost:${PORT}`));

console.log('Loading embedding model (first run downloads ~23MB)...');
warmUp().then(() => console.log('Embedding model ready.'));
