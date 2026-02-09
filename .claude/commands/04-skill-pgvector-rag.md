# SKILL - pgvector RAG (Indexing + Search)

## Objective
Implement RAG with pgvector in PostgreSQL/Supabase using reliable sync, consistent upserts, useful metadata, and efficient semantic search.

---

## Required principles
1. Relational PostgreSQL is the source of truth.
2. Keep vector sync reliable on product create/update.
3. Use structured markdown to improve retrieval.
4. Store metadata for filtering (`category`, `sale_price`, `weight`, `updated_at`).
5. Use proper vector indexing strategy.
6. Control query cost with `topK` limits.
7. Never index sensitive personal data.

---

## Suggested vector table
`rag_products`:
- `product_id uuid primary key`
- `content_markdown text not null`
- `embedding vector(<DIM>) not null`
- metadata fields

## Sync flow (relational -> vector)
1. Save relational product data.
2. Generate markdown content.
3. Generate embedding.
4. Upsert in `rag_products`.
5. If vector update fails, register out-of-sync status for retry.

## Semantic search flow
1. Generate query embedding.
2. Execute vector similarity search (`topK`).
3. Return ranked products + metadata/snippets.
4. Return user-facing feedback in pt-BR.

## Completion checklist
- [ ] No sensitive data indexed
- [ ] Upsert flow implemented
- [ ] Search endpoint returns ranked results
- [ ] User-facing messages remain pt-BR
