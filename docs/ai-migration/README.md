# DocuMind — System Audit, OpenAI Ecosystem Research & Modernization Blueprint

> **Audit & Research Verification Date:** November 14, 2026  
> **Execution Mode:** Phase 10 — Strict Analysis-Only Mode (Zero application code or configuration files modified)

---

## 1. Documentation Suite Index (Phase 9)

This directory (`docs/ai-migration/`) contains the complete architectural investigation, codebase audit, verified November 2026 OpenAI ecosystem research, capability evaluation, target system design, API cost model, security & governance analysis, and staged migration roadmap for **DocuMind**:

| Document | Phase Covered | Summary of Contents |
|---|---|---|
| **[01-current-system-audit.md](file:///c:/Users/arief/Downloads/WAICY/docs/ai-migration/01-current-system-audit.md)** | **Phase 1** | Complete line-by-line audit of `apps/api/`, `apps/web/`, `supabase/migrations/`, and root prototype files (`index.html`, `main.js`). Documents the gap between `docs/ARCHITECTURE.md` and reality, maps all 13 AI capabilities, and catalogs critical bugs (broken `gemini-3.8-*` model IDs, Carnot thermodynamics hardcoded fallbacks, volatile in-memory stores, unauthenticated FastAPI endpoints, fake RAG citations, hallucinated quiz bounding boxes, filename-only synthesis, and mocked DuckDB dashboards). |
| **[02-openai-model-research.md](file:///c:/Users/arief/Downloads/WAICY/docs/ai-migration/02-openai-model-research.md)** | **Phase 2** | Verified November 14, 2026 OpenAI Developer API catalog: the **GPT-6 family** (`gpt-6-astra`, `gpt-6.1-sol`, `gpt-6.1-terra`, `gpt-6-luna`), embeddings (`text-embedding-3-small`/`large`), Realtime & Audio (`gpt-live-1`, `gpt-realtime-2.1`, `gpt-realtime-2.1-mini`, `gpt-audio-1.5`, `gpt-transcribe`, `gpt-live-transcribe`), core platform APIs (`POST /v1/responses`, `/v1/conversations`, Structured Outputs, Prompt Caching, Flex & Batch tiers), and 2026–2027 model/API deprecations (Assistants API shut down Aug 26, 2026; `o1`/`o4-mini` shut down Oct 23, 2026; `gpt-5`/`o3` shutting down Dec 11, 2026). |
| **[03-capability-comparison.md](file:///c:/Users/arief/Downloads/WAICY/docs/ai-migration/03-capability-comparison.md)** | **Phases 3 & 4** | Head-to-head comparison of DocuMind's current implementation vs. Native OpenAI APIs vs. Hybrid Custom + OpenAI architecture across all 12 capabilities. Includes the rigorous technical and financial tradeoff analysis proving why **Local PyMuPDF + `text-embedding-3-small` + Supabase `pgvector` HNSW + PostgreSQL FTS** outperforms OpenAI Hosted `file_search` (preserving PDF bounding-box coordinates at **1,250x lower per-query retrieval cost**). |
| **[04-proposed-architecture.md](file:///c:/Users/arief/Downloads/WAICY/docs/ai-migration/04-proposed-architecture.md)** | **Phase 5** | End-to-end target architecture with Mermaid system/sequence diagrams, concrete Pydantic Structured Output schemas (`DocumentMetadataExtraction`, `GroundedAnswer`, `QuizResponse`, `SynthesisResponse`, `DashboardGenerationPlan`), the Reciprocal Rank Fusion (RRF) SQL RPC `match_document_chunks_hybrid`, deterministic DuckDB-to-ECharts orchestration, and the unified `OpenAIRouterService` design. |
| **[05-api-cost-analysis.md](file:///c:/Users/arief/Downloads/WAICY/docs/ai-migration/05-api-cost-analysis.md)** | **Phase 6** | Task-level model routing matrix, 7 concrete cost-reduction mechanisms (SHA-256 deduplication, compute-once ingestion, 90%–95% Prompt Caching with `prompt_cache_key`, `service_tier="flex"`, Batch API, selective Vision OCR), unit cost math per action, and 3-scenario monthly financial projections (**\$10.53/mo** for 100 MAU; **\$133.74/mo** for 1,000 MAU; **\$1,485.90/mo** for 10,000 MAU — a **95%+ reduction** vs. naive flagship + hosted Vector Store architectures). |
| **[06-security-and-data-governance.md](file:///c:/Users/arief/Downloads/WAICY/docs/ai-migration/06-security-and-data-governance.md)** | **Phase 7** | OpenAI API privacy & retention analysis (`store: false` requirement on `/v1/responses`, 30-day abuse monitoring vs. ZDR, stateful API exclusions from ZDR) paired with an actionable remediation blueprint for DocuMind's application-level security flaws (enforcing `require_authenticated_user` on all FastAPI routers, adding PostgreSQL `user_id` & RLS policies, locking down DuckDB `SET enable_external_access = false`, and defending against indirect PDF prompt injection). |
| **[07-migration-roadmap.md](file:///c:/Users/arief/Downloads/WAICY/docs/ai-migration/07-migration-roadmap.md)** | **Phase 8** | Staged 6-phase implementation plan specifying exact files to modify, components to reuse/remove, OpenAI APIs required, risks, and complexity estimates, plus a clear separation between **Low-Risk Immediate Changes** and **Architectural Decisions Requiring Stakeholder Approval**. |

---

## 2. Direct Answers to the 10 Core Architectural Questions (Final Expectations)

### 1. What does DocuMind currently do, and how does it work?
DocuMind is currently split between two partially disconnected prototypes:
- **Backend (`apps/api/`):** A FastAPI service where **only two components work genuinely**:
  1. `PDFService` ([pdf_service.py](file:///c:/Users/arief/Downloads/WAICY/apps/api/app/services/pdf_service.py)), which uses PyMuPDF (`fitz`) to extract text blocks and normalize bounding boxes (`[x0/w, y0/h, x1/w, y1/h]` in `0.0–1.0` range).
  2. `require_authenticated_user` ([security.py](file:///c:/Users/arief/Downloads/WAICY/apps/api/app/core/security.py)), which verifies Supabase JWTs (but is only attached to `/api/auth/session`, leaving all document and AI endpoints unauthenticated).
  - **What is broken/mocked in the backend:** `config.py` specifies fictional model IDs (`gemini-3.8-flash`, `gemini-3.5-flash-lite`, `gemini-3.8-live`) with an empty `GEMINI_API_KEY`. Every AI endpoint (`chat.py`, `synthesis.py`, `audio.py`) fails and returns hardcoded Indonesian fallback text about **Carnot thermodynamic cycles and R-134a refrigeration**. The Supabase PostgreSQL database (`supabase_db` in `supabase_client.py`) is **never imported anywhere**; all uploaded files and chunks live in volatile in-memory Python dictionaries (`DOCUMENTS_STORE`, `CHUNKS_STORE`). Zero embeddings are computed, RAG just slices `doc_chunks[:15]`, citations hardcode `context_chunks[:2]`, `synthesis.py` sends only filenames (`Dokumen 1 (doc_a)`) to the LLM without any document text, and `analytics.py` runs a hardcoded SQL query over a 5-row mock array (`[120, 150, 180, 140, 210]`).
- **Frontend (`apps/web/` vs. root `index.html`):**
  - `apps/web/` has a solid Next.js 14 + Supabase SSR authentication & proxy layer (`/api/auth/*`, `/api/proxy/[...path]`), but `/dashboard` ([apps/web/app/dashboard/page.tsx](file:///c:/Users/arief/Downloads/WAICY/apps/web/app/dashboard/page.tsx)) is an offline visual mockup ("Layer 01–03", `650ms` `setTimeout`) that makes **zero network calls**.
  - Meanwhile, the root [index.html](file:///c:/Users/arief/Downloads/WAICY/index.html) and [main.js](file:///c:/Users/arief/Downloads/WAICY/main.js) contain a working PDF.js canvas viewer, bounding-box highlighter, chat panel, quiz modal, synthesis view, and browser Web Speech API audio player talking directly to `http://localhost:8000/api/*`.

### 2. Which parts of the current system should be kept, improved, or replaced?
- **KEEP (Retain as-is):**
  - Next.js Supabase Auth & Security Proxy (`apps/web/lib/server/supabase-auth.ts`, `security.ts`, `middleware.ts`, `app/api/proxy/[...path]/route.ts`).
  - FastAPI JWT verification logic (`apps/api/app/core/security.py`).
  - Core Pydantic API response schemas (`apps/api/app/models/schemas.py`).
- **IMPROVE (Refactor & Wire Up):**
  - `PDFService` (`pdf_service.py`): Keep PyMuPDF coordinate extraction; add layout-aware chunk merging (300–600 tokens), `.csv`/`.xlsx` parsing, and selective Vision OCR (`gpt-6.1-terra`) when a page has `< 20` words.
  - Supabase PostgreSQL schema (`20261113000001_initial_schema.sql`) & `supabase_client.py`: Keep the `vector(1536)` HNSW and GIN FTS tables, add `user_id`/RLS policies, add the `match_document_chunks_hybrid` RRF function, and wire it into all routers.
  - `DuckDBAnalyticsEngine` (`duckdb_service.py`): Keep in-memory DataFrame registration and schema inspection; lock down `SET enable_external_access = false` and replace the bypassable `.split()` SQL filter.
- **REPLACE (Retire Completely):**
  - Replace `gemini_service.py`, `google-genai`, and all hardcoded Carnot/R-134a fallback strings with `openai_service.py` (`AsyncOpenAI` + `/v1/responses` + `/v1/embeddings`).
  - Replace global in-memory `DOCUMENTS_STORE` and `CHUNKS_STORE` in `documents.py` with Supabase PostgreSQL + Supabase Storage.
  - Replace hardcoded 5-row `demo_data` in `analytics.py`, filename-only prompt in `synthesis.py`, and fake `setTimeout` simulation in `apps/web/app/dashboard/page.tsx`.

### 3. Which OpenAI models and APIs are actually available as of November 14, 2026, and relevant to DocuMind?
- **GPT-6 Model Family (1.05M Context Window, 128K Max Output, Native Multimodal Input, Adaptive Reasoning):**
  - **`gpt-6-luna` (`gpt-6-luna-2026-09-09`):** **\$0.10/1M** input, **\$0.01/1M** cached (90% off), **\$0.50/1M** output (**\$0.05/\$0.25** on `flex`/Batch). Ultra-fast workhorse for single-pass ingestion extraction, standard single-doc Q&A, and podcast script generation.
  - **`gpt-6.1-terra` (`gpt-6.1-terra-2026-10-02`):** **\$1.00/1M** input, **\$0.05/1M** cached (95% off), **\$5.00/1M** output (**\$0.50/\$2.50** on `flex`/Batch). Official spelling is **`terra`** (double `r`). Multimodal vision, scanned PDF OCR, chart reading, adaptive quiz generation, and DuckDB SQL/ECharts planning specialist.
  - **`gpt-6.1-sol` (`gpt-6.1-sol-2026-10-08`):** **\$2.00/1M** input, **\$0.10/1M** cached (95% off), **\$10.00/1M** output (**\$1.00/\$5.00** on `flex`/Batch). Deep comparative reasoning model for multi-document synthesis and contradiction matrices.
  - **`gpt-6-astra` (`gpt-6-astra-2026-09-03`):** **\$10.00/1M** input, **\$1.00/1M** cached, **\$50.00/1M** output. Frontier flagship (reserved only for optional premium escalation).
- **Embeddings:** **`text-embedding-3-small`** (`1536` dims, **\$0.02/1M** standard, **\$0.01/1M** Batch) and `text-embedding-3-large` (`3072` dims, truncatable to `1536`, **\$0.13/1M**).
- **Audio & Realtime:** **`gpt-transcribe`** (\$0.0045/min STT), **`gpt-live-transcribe`** (\$0.017/min streaming STT), **`gpt-realtime-2.1-mini`** (Audio \$10/1M in, \$0.30/1M cached, \$20/1M out; Text \$0.60/1M in, \$2.40/1M out), and **`gpt-live-1`** (\$0.05/min session orchestration).
- **Core Platform APIs:** **Responses API (`POST /v1/responses`)** with `text.format` (`json_schema`, `strict: true`), **Prompt Caching** (`prompt_cache_key`, `in_memory`), **Flex Processing** (`service_tier="flex"`), and **Batch API** (`POST /v1/batches`). *(Note: The legacy Assistants API `/v1/assistants` was permanently shut down on August 26, 2026).*

### 4. Which capabilities should use native OpenAI tools, and which should remain custom?
- **Use Native OpenAI APIs (`POST /v1/responses`, `POST /v1/embeddings`, Structured Outputs):**
  - Vector embedding generation (`text-embedding-3-small`), scanned page Vision OCR (`gpt-6.1-terra`), metadata/summary/topic extraction (`gpt-6-luna`), RAG answer generation (`gpt-6-luna`/`terra`), quiz generation (`gpt-6.1-terra`), cross-document synthesis (`gpt-6.1-sol`), and SQL/ECharts query planning (`gpt-6.1-terra`).
- **Keep Custom (Do NOT Replace with OpenAI Hosted `file_search` or `code_interpreter`):**
  - **PDF Text & Bounding-Box Extraction (`PDFService` + PyMuPDF):** Must stay local to preserve normalized `[x0, y0, x1, y1]` highlight coordinates.
  - **Vector + Full-Text Hybrid Retrieval (Supabase `pgvector` HNSW + GIN FTS):** Must stay in PostgreSQL to retain chunk-to-bounding-box mapping, enforce multi-tenant RLS, and avoid OpenAI's \$2.50/1,000 `file_search` tool call fee + \$0.10/GB/day storage fee.
  - **Analytical SQL Execution (`DuckDBAnalyticsEngine`):** Must stay in local in-memory DuckDB (`<10ms`, \$0.00 execution cost) rather than paying per-container session fees for OpenAI Hosted Code Interpreter.

### 5. How should document ingestion, retrieval, RAG, summarization, insight extraction, and dashboard generation be architected?
- **Ingestion (Compute-Once):** Upload $\rightarrow$ SHA-256 deduplication check $\rightarrow$ PyMuPDF coordinate block extraction (+ selective `gpt-6.1-terra` Vision OCR only on pages with `< 20` words) $\rightarrow$ single batch `text-embedding-3-small` call $\rightarrow$ single `gpt-6-luna` Structured Output call extracting summary, classification, topic graph, and KPI metrics $\rightarrow$ persist to Supabase PostgreSQL & DuckDB.
- **Retrieval & RAG:** Embed query (`text-embedding-3-small`) $\rightarrow$ call `match_document_chunks_hybrid` (Reciprocal Rank Fusion of `pgvector` HNSW cosine similarity + PostgreSQL GIN full-text search) $\rightarrow$ inject top-8 chunks into `/v1/responses` (`gpt-6-luna` or `gpt-6.1-terra`) with static prefix ordering and `prompt_cache_key` $\rightarrow$ deterministically resolve cited `chunk_id`s back to PyMuPDF `BoundingBox` coordinates.
- **Dashboard Generation:** Inspect DuckDB table schemas (`get_table_schema_summary()`) $\rightarrow$ `gpt-6.1-terra` outputs a `DashboardGenerationPlan` (validated `SELECT` SQL + ECharts JSON template) $\rightarrow$ hardened DuckDB executes the SQL deterministically $\rightarrow$ real result rows are bound into the ECharts config and saved to `public.dashboard_widgets`.

### 6. How can we minimize OpenAI API costs without sacrificing capability?
By combining **7 architectural controls** detailed in [05-api-cost-analysis.md](file:///c:/Users/arief/Downloads/WAICY/docs/ai-migration/05-api-cost-analysis.md):
1. **Task-Level Model Tiering:** Route 85% of standard Q&A and ingestion extraction to `gpt-6-luna` (\$0.10/1M in, \$0.50/1M out), reserve `gpt-6.1-terra` (\$1/\$5) for Vision OCR, quizzes, and SQL planning, and reserve `gpt-6.1-sol` (\$2/\$10) strictly for multi-document synthesis.
2. **Compute-Once Ingestion & SHA-256 Deduplication:** Compute summaries, topics, and KPI tables once at upload time; serve subsequent views from PostgreSQL at \$0.00 LLM cost.
3. **Prompt Caching (90%–95% Input Discount):** Place static instructions, document summaries, and sorted chunks before dynamic user questions and pass a deterministic `prompt_cache_key`.
4. **Local Hybrid Search over Hosted `file_search`:** Reduces per-query retrieval cost by **1,250x** (\$0.000002 vs. \$0.002500).
5. **Selective Vision OCR Gate (`word_count < 20`):** Avoids image token charges on the ~90% of PDF pages that already contain digital text.
6. **Flex Processing (`service_tier="flex"`) & Batch API (`/v1/batches`):** Cuts background ingestion and archive indexing token costs by **50%**.
7. **Local DuckDB Aggregation:** Avoids passing raw tabular rows into LLM prompts.

### 7. What are the privacy and security implications of the migration?
- **OpenAI Layer:** OpenAI does not train models on API data by default. However, `POST /v1/responses` defaults to **`store: true`** (retaining response logs indefinitely in the OpenAI Dashboard). DocuMind must explicitly set **`store: false`** on every `/v1/responses` call and avoid stateful OpenAI `Files`/`Vector Stores` so zero user documents persist on OpenAI servers.
- **Application Layer (Critical Fixes Required):** Before production deployment, DocuMind must (1) attach `Depends(require_authenticated_user)` to all 5 unauthenticated FastAPI routers, (2) add `user_id`/`owner_id` columns and Row-Level Security (RLS) to Supabase PostgreSQL, (3) delete the shared in-memory `DOCUMENTS_STORE`/`CHUNKS_STORE` dicts, (4) lock down DuckDB with `SET enable_external_access = false` and regex validation to prevent local filesystem reads (`read_text('.env')`), and (5) create a root `.gitignore`.

### 8. What is the safest and most effective step-by-step migration plan?
Follow the **6-Stage Migration Roadmap** in [07-migration-roadmap.md](file:///c:/Users/arief/Downloads/WAICY/docs/ai-migration/07-migration-roadmap.md):
- **Stage 1:** Foundation, root `.gitignore`, FastAPI router auth (`require_authenticated_user`), PostgreSQL RLS + Hybrid RRF SQL migration, and `openai_service.py` (`store=False`).
- **Stage 2:** Persistent Supabase document/chunk ingestion, `text-embedding-3-small` batch vectors, `gpt-6-luna` single-pass metadata/summary/topic extraction, and `gpt-6.1-terra` selective Vision OCR.
- **Stage 3:** Hybrid retrieval service (`pgvector` HNSW + GIN FTS) and deterministic `chunk_id` $\rightarrow$ `BoundingBox` citation resolver.
- **Stage 4:** Migrate `chat.py` (with SSE streaming and hallucination-free quiz coordinates) and `audio.py` to `openai_service.py`, retiring `gemini_service.py`.
- **Stage 5:** Harden DuckDB (`enable_external_access=false`), wire real table extraction and `gpt-6.1-terra` SQL/ECharts generation in `analytics.py`, wire real multi-document context into `synthesis.py` (`gpt-6.1-sol`), and connect `apps/web/app/dashboard/page.tsx` to `/api/proxy/*`.
- **Stage 6:** Enable `prompt_cache_key` routing, `service_tier="flex"` background processing, `/v1/batches` bulk archive imports, and token cost telemetry (`ai_usage_logs`).

### 9. What technical debt and bugs in the current codebase should be cleaned up during this transition?
1. Non-existent `gemini-3.8-*` model defaults in `config.py` and hardcoded Carnot/R-134a fallback strings across `gemini_service.py`, `chat.py`, `synthesis.py`, and `audio.py`.
2. Unimported dead database client (`supabase_db` in `supabase_client.py`) and volatile global memory dicts (`DOCUMENTS_STORE`, `CHUNKS_STORE`) in `documents.py`.
3. Unauthenticated FastAPI endpoints (`documents.py`, `chat.py`, `analytics.py`, `synthesis.py`, `audio.py`).
4. Missing `user_id`/`owner_id` columns and missing Row-Level Security (RLS) policies in `supabase/migrations/20261113000001_initial_schema.sql`.
5. Fake citation slicing (`context_chunks[:2]`) in `gemini_service.py` and hallucinated `BoundingBox` floats in `QuizItem`.
6. Broken synthesis prompt in `synthesis.py:43` that passes only document titles/IDs (`Dokumen 1 (doc_a)`) without document text.
7. Hardcoded 5-row `demo_data` in `analytics.py` and the `.split()` SQL blacklist bypass / external file read vulnerability in `duckdb_service.py`.
8. Disconnected Next.js `/dashboard` UI (`apps/web/app/dashboard/page.tsx`) running a fake `650ms` `setTimeout` instead of calling `/api/proxy/*`.
9. Missing root `.gitignore` file.

### 10. What is the recommended target architecture for making DocuMind significantly stronger?
A **Hybrid Local-First + Multi-Model OpenAI Responses API Architecture** (detailed in [04-proposed-architecture.md](file:///c:/Users/arief/Downloads/WAICY/docs/ai-migration/04-proposed-architecture.md)):
- **Local/Deterministic Layer:** PyMuPDF (`fitz`) for zero-cost digital text & normalized `[x0, y0, x1, y1]` coordinate extraction, Supabase PostgreSQL (`pgvector` HNSW + GIN FTS + RLS) for multi-tenant hybrid retrieval and persistent knowledge graphs, and locked-down in-memory DuckDB for `<10ms` deterministic SQL analytics.
- **OpenAI Intelligence Layer (`POST /v1/responses` with `store: false` & `POST /v1/embeddings`):** `text-embedding-3-small` for 1,536-d vectors, `gpt-6-luna` for ultra-low-cost ingestion intelligence and fast RAG Q&A, `gpt-6.1-terra` for scanned-page Vision OCR, quizzes, and DuckDB-to-ECharts planning, and `gpt-6.1-sol` for deep cross-document synthesis and contradiction discovery.
