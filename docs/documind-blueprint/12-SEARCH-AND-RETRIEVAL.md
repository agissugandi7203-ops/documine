# 12 — Intelligent Search & Hybrid Retrieval Architecture

> **Document ID:** `DOC-12`  
> **Status:** **`DECIDED`** — Final Search & Retrieval Specification (`ADR-006`)  
> **Related Documents:** [30-FINAL-SELECTED-ARCHITECTURE-AND-DECISIONS.md](file:///c:/Users/arief/Downloads/WAICY/docs/documind-blueprint/30-FINAL-SELECTED-ARCHITECTURE-AND-DECISIONS.md), [08-MULTI-TENANCY-AND-DATA-ISOLATION.md](file:///c:/Users/arief/Downloads/WAICY/docs/documind-blueprint/08-MULTI-TENANCY-AND-DATA-ISOLATION.md), [10-DOCUMENT-INGESTION-PIPELINE.md](file:///c:/Users/arief/Downloads/WAICY/docs/documind-blueprint/10-DOCUMENT-INGESTION-PIPELINE.md), [11-PDF-VIEWER-AND-CITATIONS.md](file:///c:/Users/arief/Downloads/WAICY/docs/documind-blueprint/11-PDF-VIEWER-AND-CITATIONS.md), [13-AI-ASSISTANT.md](file:///c:/Users/arief/Downloads/WAICY/docs/documind-blueprint/13-AI-ASSISTANT.md), [26-ARCHITECTURE-DECISIONS.md](file:///c:/Users/arief/Downloads/WAICY/docs/documind-blueprint/26-ARCHITECTURE-DECISIONS.md)

---

## 1. Purpose & Scope

This specification defines how DocuMind retrieves information across a single document, a selected subset of documents, or an entire user repository (`PR-009`, `PR-025`, `ADR-006`). It serves two consumers simultaneously:
1. **Direct User Search (`/app/explore` & `Cmd+K` Global Search):** Returning ranked, highlighted document passages and matching files.
2. **RAG Context Retrieval (`RetrievalService`):** Supplying high-precision, coordinate-preserving evidence chunks to the AI Assistant (`DOC-13`) and Cross-Document Synthesis Engine (`DOC-17`).

---

## 2. Why Hybrid Retrieval (`pgvector` HNSW + PostgreSQL GIN FTS) Is Required

Neither pure vector search nor pure keyword search is sufficient on its own for academic and corporate document collections:
- **Where Pure Vector Search Excels (and Fails):**
  - *Excels:* Conceptual, cross-lingual, and paraphrased queries (e.g., *"cara meningkatkan efisiensi baterai"* matching an English paragraph about *"improving coulombic efficiency via solid electrolytes"*).
  - *Fails:* Exact chemical formulas (`Li6PS5Cl`, `R-134a`), invoice/contract clause numbers (`Pasal 14 Ayat 2`, `ISO-27001`), error codes, or specific author names.
- **Where Pure Keyword Search (BM25 / FTS) Excels (and Fails):**
  - *Excels:* Exact acronyms, codes, serial numbers, proper nouns, and numerical figures.
  - *Fails:* Synonyms, conceptual questions, or bilingual Indonesian-English queries where the user asks in Indonesian about an English PDF.
- **The DocuMind Hybrid Solution (`ADR-006`):**
  - Combine **Dense Vector Retrieval** (`text-embedding-3-large` truncated to `dimensions=1536`, cosine similarity via `pgvector` HNSW index) with **Sparse Lexical Retrieval** (PostgreSQL GIN `tsvector` + `websearch_to_tsquery` + `ts_rank_cd`) using **Reciprocal Rank Fusion (RRF, $k=60$)** inside a single PostgreSQL RPC call (`match_document_chunks_hybrid`).

---

## 3. Retrieval Scopes & Permission Filtering (`PR-009`, `PR-025`)

Every search or retrieval call must specify one of **three explicit scopes**, and all three are hard-bounded by `filter_workspace_id`:

| Scope Mode | API Filter Parameters | Retrieval Behavior & Stratified Balancing |
|---|---|---|
| **1. Single-Document Scope** | `workspace_id = ctx.workspace_id`, `doc_ids = [doc_id]` | Searches only chunks of `doc_id`. Returns top $K=8$ chunks ranked by Hybrid RRF score, plus optionally injects the document's `executive_summary` for global context. |
| **2. Multi-Document Subset Scope** | `workspace_id = ctx.workspace_id`, `doc_ids = [id_1, ..., id_m]` ($2 \le m \le 15$) | Uses **Stratified Per-Document Quota + Global RRF**: guarantees at least $k_{\min}=2$ top chunks from *each* selected document (so one verbose 100-page PDF cannot crowd out a concise 5-page report) plus top global RRF chunks up to $K_{\text{total}}=16$. |
| **3. Repository-Wide Scope** | `workspace_id = ctx.workspace_id`, `doc_ids = NULL`, optional metadata filters (`category`, `tags`, `date_from`, `date_to`, `has_tables`) | Filters `public.documents` by metadata predicates first, then executes Hybrid RRF across all matching documents in the workspace (returning top $K=12$ chunks across up to 8 distinct documents). |

---

## 4. Complete SQL Specification: `match_document_chunks_hybrid`

This production PostgreSQL function replaces the basic vector-only `match_document_chunks` in `supabase/migrations/20261113000001_initial_schema.sql`:

```sql
CREATE OR REPLACE FUNCTION public.match_document_chunks_hybrid(
    filter_workspace_id uuid,
    query_embedding vector(1536),
    query_text text,
    match_count int DEFAULT 10,
    filter_doc_ids uuid[] DEFAULT NULL,
    filter_category text DEFAULT NULL,
    filter_tags text[] DEFAULT NULL,
    min_vector_similarity float DEFAULT 0.28,
    rrf_k int DEFAULT 60
)
RETURNS TABLE (
    chunk_id uuid,
    doc_id uuid,
    doc_title text,
    doc_category text,
    page_number int,
    chunk_index int,
    text_content text,
    bounding_boxes jsonb,
    vector_similarity float,
    fts_rank float,
    rrf_score float,
    match_explanation text
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    -- Mandatory tenant guard
    IF filter_workspace_id IS NULL THEN
        RAISE EXCEPTION 'filter_workspace_id is required for tenant isolation';
    END IF;

    RETURN QUERY
    WITH eligible_docs AS (
        SELECT d.id, d.title, d.category
        FROM public.documents d
        WHERE d.workspace_id = filter_workspace_id
          AND d.status IN ('ready', 'partial_ready')
          AND (filter_doc_ids IS NULL OR d.id = ANY(filter_doc_ids))
          AND (filter_category IS NULL OR d.category = filter_category)
          AND (filter_tags IS NULL OR d.user_tags && filter_tags)
    ),
    vector_candidates AS (
        SELECT
            c.id AS cid,
            (1.0 - (c.embedding <=> query_embedding))::float AS v_sim,
            ROW_NUMBER() OVER (ORDER BY c.embedding <=> query_embedding ASC) AS v_rank
        FROM public.chunks c
        INNER JOIN eligible_docs ed ON ed.id = c.doc_id
        WHERE c.workspace_id = filter_workspace_id
          AND (1.0 - (c.embedding <=> query_embedding)) >= min_vector_similarity
        ORDER BY c.embedding <=> query_embedding ASC
        LIMIT match_count * 4
    ),
    fts_candidates AS (
        SELECT
            c.id AS cid,
            ts_rank_cd(
                to_tsvector('simple', c.text_content),
                websearch_to_tsquery('simple', query_text)
            )::float AS f_score,
            ROW_NUMBER() OVER (
                ORDER BY ts_rank_cd(
                    to_tsvector('simple', c.text_content),
                    websearch_to_tsquery('simple', query_text)
                ) DESC
            ) AS f_rank
        FROM public.chunks c
        INNER JOIN eligible_docs ed ON ed.id = c.doc_id
        WHERE c.workspace_id = filter_workspace_id
          AND length(trim(query_text)) > 0
          AND to_tsvector('simple', c.text_content) @@ websearch_to_tsquery('simple', query_text)
        LIMIT match_count * 4
    ),
    fused AS (
        SELECT
            COALESCE(v.cid, f.cid) AS cid,
            COALESCE(v.v_sim, 0.0)::float AS v_sim,
            COALESCE(f.f_score, 0.0)::float AS f_score,
            (
                COALESCE(1.0 / (rrf_k + v.v_rank), 0.0) +
                COALESCE(1.0 / (rrf_k + f.f_rank), 0.0)
            )::float AS combined_rrf,
            CASE
                WHEN v.cid IS NOT NULL AND f.cid IS NOT NULL THEN 'hybrid_semantic_and_keyword'
                WHEN f.cid IS NOT NULL THEN 'exact_keyword_match'
                ELSE 'semantic_conceptual_match'
            END AS explanation
        FROM vector_candidates v
        FULL OUTER JOIN fts_candidates f ON v.cid = f.cid
    )
    SELECT
        c.id AS chunk_id,
        c.doc_id,
        ed.title AS doc_title,
        ed.category AS doc_category,
        c.page_number,
        c.chunk_index,
        c.text_content,
        c.bounding_boxes,
        fu.v_sim AS vector_similarity,
        fu.f_score AS fts_rank,
        fu.combined_rrf AS rrf_score,
        fu.explanation AS match_explanation
    FROM fused fu
    INNER JOIN public.chunks c ON c.id = fu.cid
    INNER JOIN eligible_docs ed ON ed.id = c.doc_id
    ORDER BY fu.combined_rrf DESC, fu.v_sim DESC
    LIMIT match_count;
END;
$$;
```

### Why `'simple'` Configuration Is Used for `to_tsvector`
Because DocuMind users frequently work with **bilingual Indonesian and English documents** (plus scientific formulas and technical codes), PostgreSQL's `'simple'` text search dictionary tokenizes on whitespace/punctuation and lowercases terms without applying English-only snowball stemming that would mangle Indonesian words (e.g., *pembelajaran*, *efisiensi*) or chemical codes (`Li6PS5Cl`). Meanings and morphological synonyms are simultaneously captured by **`text-embedding-3-large` (`dimensions=1536`)** (which provides OpenAI's strongest multilingual and technical retrieval accuracy across 100+ languages including Indonesian and English).

---

## 5. Retrieval Quality Gate, Low-Confidence Handling & Result Explanations

1. **Relevance Confidence Thresholding (`min_vector_similarity = 0.28`):**
   - Each retrieved chunk is classified into a confidence tier before being passed to the UI or AI Assistant:
     - **`High Confidence`:** `vector_similarity >= 0.48` OR `match_explanation == 'hybrid_semantic_and_keyword'`.
     - **`Medium Confidence`:** `0.32 <= vector_similarity < 0.48` OR `match_explanation == 'exact_keyword_match'`.
     - **`Low Confidence`:** `vector_similarity < 0.32` and no keyword match.
   - If **zero chunks** meet at least `Medium Confidence` (or `0` rows are returned), `RetrievalService` sets `retrieval_status = "insufficient_evidence"`. In this state, the AI Assistant is instructed to abstain from guessing (`PR-029`, `EC-021`) or, on broad overview questions (*"Summarize this document"*), falls back to the document's pre-computed `executive_summary` and `key_findings` from `public.documents`.
2. **Search Result Explanation Badges (`match_explanation`):**
   - In `/app/explore`, every search hit displays a transparent explanation badge:
     - `Hybrid Match (Exact Term + Semantic)`
     - `Exact Keyword Match ("Pasal 14")`
     - `Conceptual Match (84% similarity)`
   - Keyword hits are highlighted using PostgreSQL `ts_headline('simple', text_content, websearch_to_tsquery('simple', query_text))` so users immediately see why the passage matched.
