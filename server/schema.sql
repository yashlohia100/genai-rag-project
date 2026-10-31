-- Runs on every server start; IF NOT EXISTS makes it safe to re-run.

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS documents (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  chunk_count integer NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS chunks (
  id          bigserial PRIMARY KEY,
  document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  chunk_index integer NOT NULL,
  content     text NOT NULL,
  -- 384 = output size of all-MiniLM-L6-v2. Switching embedding models means
  -- changing this and re-embedding every document.
  embedding   vector(384) NOT NULL
);

-- HNSW is an approximate nearest-neighbour index: a layered graph that lets a
-- search jump to similar vectors without comparing against every row.
-- vector_cosine_ops makes it serve queries ordered by cosine distance (<=>).
CREATE INDEX IF NOT EXISTS chunks_embedding_idx ON chunks USING hnsw (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS chunks_document_id_idx ON chunks (document_id);
