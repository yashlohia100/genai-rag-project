# DocMind

Chat with your own documents. Upload PDFs or text files, ask questions, and get answers that cite the passages they came from.

Built to learn LLMs, embeddings, vector search and RAG from first principles.

## Setup

1. Get a free Groq API key at https://console.groq.com/keys
2. Configure the server:
   ```bash
   cd server
   cp .env.example .env    # then paste your key into .env
   npm install
   ```
3. Install the client:
   ```bash
   cd client
   npm install
   ```

## Run

In two terminals:

```bash
cd server && npm run dev     # http://localhost:3001
cd client && npm run dev     # http://localhost:5173  <- open this
```

The first server start downloads the embedding model (~23MB). After that it's cached.

Try it with [samples/zephyr-handbook.md](samples/zephyr-handbook.md). Ask "How much is the learning budget?" or "Can I work from Spain?"

## How it works

```
Upload:  file -> extract text -> split into chunks -> embed each chunk -> save to vectors.json
Ask:     question -> embed -> find most similar chunks -> put them in the prompt -> LLM answers with citations
```

| File | Concept |
|---|---|
| [server/src/chunker.js](server/src/chunker.js) | Splitting text into overlapping chunks |
| [server/src/embeddings.js](server/src/embeddings.js) | Turning text into vectors (local model via transformers.js) |
| [server/src/vectorStore.js](server/src/vectorStore.js) | A from-scratch vector DB: JSON file + cosine similarity |
| [server/src/ingest.js](server/src/ingest.js) | The ingestion pipeline |
| [server/src/rag.js](server/src/rag.js) | Retrieval + prompt building (the "RAG" part) |
| [server/src/llm.js](server/src/llm.js) | Streaming chat completions from Groq |
| [server/src/index.js](server/src/index.js) | Express API |

### API

- `GET /api/documents` — list documents
- `POST /api/documents` — upload (multipart, field `file`)
- `DELETE /api/documents/:id`
- `POST /api/search` `{ "query": "...", "k": 5 }` — **debug retrieval**: see which chunks match and their scores
- `POST /api/chat` `{ "messages": [{ "role": "user", "content": "..." }] }` — streams newline-delimited JSON

## Next steps

- Move from `vectors.json` to **pgvector** in Postgres
- Hybrid search (keyword + vector), re-ranking
- Rewrite follow-up questions ("what about the second one?") into standalone queries before retrieval
- An evaluation set of questions to measure answer quality
