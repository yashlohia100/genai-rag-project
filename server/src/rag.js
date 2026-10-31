import { embed } from './embeddings.js';
import { search } from './vectorStore.js';

// RAG = Retrieval-Augmented Generation:
//   1. Retrieve: embed the question, find the most similar chunks.
//   2. Augment: paste those chunks into the prompt as numbered context.
//   3. Generate: the LLM answers from that context instead of from memory.

const TOP_K = 5;
// Chunks scoring below this are probably unrelated; tune it by watching /api/search.
const MIN_SCORE = 0.25;
const MAX_HISTORY_MESSAGES = 6;

const SYSTEM_PROMPT = `You are DocMind, an assistant that answers questions about the user's uploaded documents.

Rules:
- Answer ONLY using the numbered context passages provided with the question.
- Cite the passages you used inline, like [1] or [2][3].
- If the context does not contain the answer, say you couldn't find it in the uploaded documents. Do not make up an answer.
- Be concise and clear.`;

export async function retrieve(query, { k = TOP_K, minScore = MIN_SCORE, documentIds } = {}) {
  const [queryEmbedding] = await embed([query]);
  return search(queryEmbedding, { k, minScore, documentIds });
}

export function buildMessages(history, question, sources) {
  const context = sources.length
    ? sources.map((s, i) => `[${i + 1}] (from "${s.docName}")\n${s.text}`).join('\n\n')
    : '(no relevant passages found)';

  return [
    { role: 'system', content: SYSTEM_PROMPT },
    ...history.slice(-MAX_HISTORY_MESSAGES),
    { role: 'user', content: `Context:\n${context}\n\nQuestion: ${question}` },
  ];
}
