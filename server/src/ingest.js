import path from 'node:path';
import { PDFParse } from 'pdf-parse';
import { chunkText } from './chunker.js';
import { embed } from './embeddings.js';
import { addDocument } from './vectorStore.js';

const TEXT_EXTENSIONS = new Set(['.txt', '.md', '.markdown', '.csv', '.json', '.html']);

export class UnsupportedFileError extends Error {}

async function extractText({ originalname, buffer }) {
  const ext = path.extname(originalname).toLowerCase();

  if (ext === '.pdf') {
    const parser = new PDFParse({ data: buffer });
    try {
      return (await parser.getText()).text;
    } finally {
      await parser.destroy();
    }
  }
  if (TEXT_EXTENSIONS.has(ext)) return buffer.toString('utf8');

  throw new UnsupportedFileError(`Unsupported file type "${ext}". Use PDF or a text file (${[...TEXT_EXTENSIONS].join(', ')}).`);
}

// The ingestion pipeline: file -> text -> chunks -> embeddings -> vector store.
export async function ingestFile(file) {
  const text = await extractText(file);
  const chunks = chunkText(text);
  if (chunks.length === 0) throw new UnsupportedFileError('No text could be extracted from this file.');

  const embeddings = await embed(chunks);
  return addDocument({
    name: file.originalname,
    chunks: chunks.map((text, i) => ({ text, embedding: embeddings[i] })),
  });
}
