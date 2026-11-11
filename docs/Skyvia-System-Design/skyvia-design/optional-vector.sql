-- Run only on a database with pgvector installed. Match dimension to embedding configuration.
BEGIN;
CREATE EXTENSION IF NOT EXISTS vector;
ALTER TABLE assistant.knowledge_chunks ADD COLUMN embedding vector(1536);
ALTER TABLE assistant.knowledge_chunks ADD COLUMN embedding_model text;
CREATE INDEX knowledge_embedding_idx ON assistant.knowledge_chunks USING hnsw (embedding vector_cosine_ops);
COMMIT;
-- 1536 is this design's configured dimension, not a universal model default.
-- Re-embed all chunks when changing model/dimensions; filter published/audience/effective dates in retrieval.
