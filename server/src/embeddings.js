import { pipeline } from '@huggingface/transformers';

// all-MiniLM-L6-v2 is a small (~23MB), fast sentence-embedding model that turns
// any text into a list of 384 numbers. Texts with similar *meaning* end up with
// similar numbers. It runs locally — downloaded once from Hugging Face, then cached.
const MODEL = process.env.EMBEDDING_MODEL || 'onnx-community/all-MiniLM-L6-v2-ONNX';
const BATCH_SIZE = 32;

let extractorPromise;

function getExtractor() {
  extractorPromise ??= pipeline('feature-extraction', MODEL, { dtype: 'fp32' });
  return extractorPromise;
}

export function warmUp() {
  return getExtractor();
}

/**
 * Embed an array of strings. Returns one vector (array of numbers) per string.
 * `pooling: 'mean'` averages the per-token vectors into one vector per text;
 * `normalize: true` scales every vector to length 1.
 */
export async function embed(texts) {
  const extractor = await getExtractor();
  const vectors = [];
  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    const output = await extractor(batch, { pooling: 'mean', normalize: true });
    vectors.push(...output.tolist());
  }
  return vectors;
}
