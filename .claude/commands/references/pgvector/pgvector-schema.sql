-- pgvector basic schema (adjust DIM to your embedding model)
-- NOTE: This is a reference snippet; integrate with your migration tool.

create extension if not exists vector;

create table if not exists rag_products (
  product_id uuid primary key,
  content_markdown text not null,
  embedding vector(1536) not null,
  category text,
  sale_price numeric(12,2),
  weight numeric(12,3),
  updated_at timestamptz not null default now()
);

-- Example index (choose HNSW or IVFFLAT depending on your environment/support)
-- create index rag_products_embedding_hnsw on rag_products using hnsw (embedding vector_cosine_ops);
