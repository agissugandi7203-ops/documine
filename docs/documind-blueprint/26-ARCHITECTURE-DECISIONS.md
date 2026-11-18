# 26 — Final Architecture Decision Records (`ADR-001` – `ADR-022`)

> **Document ID:** `DOC-26`  
> **Status:** **`DECIDED`** — Authoritative Architecture Decision Log (Autonomous Decision Mode, Master Task Sections 3 & 7)  
> **Related Documents:** [00-START-HERE.md](file:///c:/Users/arief/Downloads/WAICY/docs/documind-blueprint/00-START-HERE.md), [18-OPENAI-AND-MODEL-STRATEGY.md](file:///c:/Users/arief/Downloads/WAICY/docs/documind-blueprint/18-OPENAI-AND-MODEL-STRATEGY.md), [19-API-COST-AND-PERFORMANCE.md](file:///c:/Users/arief/Downloads/WAICY/docs/documind-blueprint/19-API-COST-AND-PERFORMANCE.md), [30-FINAL-SELECTED-ARCHITECTURE-AND-DECISIONS.md](file:///c:/Users/arief/Downloads/WAICY/docs/documind-blueprint/30-FINAL-SELECTED-ARCHITECTURE-AND-DECISIONS.md)

---

## 1. Purpose & Decision Authority

All 22 Architecture Decision Records (`ADR-001` through `ADR-022`) in this document have been **resolved and finalized (`DECIDED`)**. Each record documents all 11 required dimensions: Title, Status, Context, Chosen Solution, Alternatives Considered, Reasons for Selection, Cost Implications, Technical Consequences, Dependencies, Implementation Requirements, and Revisit Conditions.

---

## 2. Finalized Architecture Decision Catalog

### `ADR-001`: Consolidated Next.js 14 App Router Frontend (`apps/web`) Over Dual Standalone `index.html`
- **Status:** **`DECIDED`**
- **Context:** `[OBSERVED]` The repository currently contains two disconnected UIs: root `index.html` + `main.js` (vanilla JS prototype calling `localhost:8000` directly without cookie auth) and `apps/web/` (Next.js 14 App Router with 10 working Supabase Auth routes and `/api/proxy/[...path]`, but rendering a fake graphic-design mockup in `apps/web/app/dashboard/page.tsx`).
- **Chosen Solution:** Consolidate 100% of the production user interface inside `apps/web/` (Next.js 14 App Router, TypeScript, Tailwind CSS, `pdfjs-dist`, `echarts-for-react`) organized around a 4-View Workspace Shell (`/app/dashboard`, `/app/repository`, `/app/documents/[docId]`, `/app/explore`) with `/dashboard` aliased seamlessly. Archive root `index.html` and `main.js`.
- **Alternatives Considered:** (1) Maintain both `index.html` and `apps/web/`; (2) Drop Next.js and use `index.html`.
- **Reasons for Selection:** Eliminates dual-frontend maintenance, ensures all API calls pass through the authenticated Next.js BFF proxy, and leverages the existing production auth pages (`apps/web/app/(auth)/*`) and installed charting libraries.
- **Cost Implications:** Zero extra hosting cost (single `documind-web` service on Railway). Saves ~40% ongoing frontend engineering time.
- **Technical Consequences:** The fake layer studio components in `apps/web/components/dashboard/*` are replaced by real Pillar A/B/C components, and the PDF.js bounding-box overlay from `main.js` is ported into a typed React component (`PdfCitationViewer.tsx`).
- **Dependencies:** `pdfjs-dist` added to `apps/web/package.json`.
- **Implementation Requirements:** Update `PROTECTED_PREFIXES` in `apps/web/middleware.ts` to protect `/app` and `/dashboard`.
- **Conditions to Revisit:** None anticipated; Next.js App Router is the permanent web foundation.

---

### `ADR-002`: Next.js BFF Proxy (`/api/proxy/[...path]`) + Internal-Only FastAPI with Mandatory JWT Verification
- **Status:** **`DECIDED`**
- **Context:** `[OBSERVED]` Five of the six FastAPI routers (`documents`, `chat`, `analytics`, `synthesis`, `audio`) currently lack authentication guards, while `apps/web/app/api/proxy/[...path]/route.ts` already bridges HTTP-only auth cookies (`ACCESS_COOKIE`) to `Authorization: Bearer <token>`.
- **Chosen Solution:** Route all browser-to-backend traffic through `/api/proxy/[...path]`, deploy `documind-api` on Railway's private internal network (`http://documind-api.railway.internal:8000`), and attach `Depends(get_verified_workspace_context)` globally across all FastAPI routers.
- **Alternatives Considered:** Expose FastAPI publicly with browser CORS and `localStorage` JWTs.
- **Reasons for Selection:** Keeps session tokens in HTTP-only cookies immune to XSS theft, eliminates public network exposure of FastAPI, and enforces cryptographic JWT validation at the API boundary.
- **Cost Implications:** \$0 (Railway internal private networking is free and zero-latency).
- **Technical Consequences:** All Next.js client components call `/api/proxy/...` (including multipart uploads and SSE streams).
- **Dependencies:** `apps/api/app/core/security.py` and `apps/web/app/api/proxy/[...path]/route.ts`.
- **Implementation Requirements:** Configure `FASTAPI_URL=http://documind-api.railway.internal:8000` in Railway production and `http://localhost:8000` in local dev; disable response buffering on SSE proxy responses (`X-Accel-Buffering: no`).
- **Conditions to Revisit:** Revisit only if a native mobile app (iOS/Android) is introduced that needs to call FastAPI directly with Bearer JWTs.

---

### `ADR-003`: Dual-Layer Multi-Tenant Isolation (PostgreSQL RLS + Mandatory Backend `WorkspaceContext` Guards)
- **Status:** **`DECIDED`**
- **Context:** `[VERIFIED]` `supabase_client.py` initializes with `SUPABASE_SERVICE_ROLE_KEY`, which carries PostgreSQL's `BYPASSRLS` privilege. Relying solely on SQL RLS policies while querying via a `service_role` client would expose all users' data.
- **Chosen Solution:** Enforce **two independent isolation barriers**: (1) Enable PostgreSQL RLS (`is_workspace_member(workspace_id)`) on all 19 tables and bind the user's JWT (`postgrest.auth(user_jwt)`) on interactive requests; AND (2) Require `ctx: WorkspaceContext` in every backend repository method and SQL RPC, explicitly filtering `.eq("workspace_id", ctx.workspace_id)`.
- **Alternatives Considered:** (1) SQL RLS only; (2) Application-layer `WHERE` clauses only.
- **Reasons for Selection:** True defense-in-depth (`PR-007`–`PR-010`). Even if a developer writes a bug in a query or a service key is used in a worker, tenant boundaries cannot be crossed.
- **Cost Implications:** Negligible (<1ms indexed B-tree filter on `workspace_id`).
- **Technical Consequences:** All 19 tables include `workspace_id uuid not null references public.workspaces(id) on delete cascade`.
- **Dependencies:** `ADR-002`, `ADR-004`.
- **Implementation Requirements:** Implement `WorkspaceContext` in `apps/api/app/core/workspace.py` and run cross-tenant isolation tests (`DOC-25`) on every PR.
- **Conditions to Revisit:** Never—strict tenant isolation is a permanent invariant.

---

### `ADR-004`: Personal Workspace Default with Organization-Ready Membership Schema
- **Status:** **`DECIDED`**
- **Context:** DocuMind serves individual students/researchers and corporate professionals. Every user needs an isolated environment immediately without forcing complex team setup screens during initial onboarding.
- **Chosen Solution:** Scope all resources to `public.workspaces` (`id`, `owner_id`, `name`, `is_personal`) joined with `public.workspace_members` (`workspace_id`, `user_id`, `role`). Automatically provision a default Personal Workspace (`is_personal = true`, `role = 'owner'`) via a database trigger on `auth.users` signup (`PR-005`, `PR-006`).
- **Alternatives Considered:** (1) Direct `user_id` ownership without a `workspaces` table; (2) Full multi-org team management UI in Stage 1.
- **Reasons for Selection:** Gives every user an instant friction-free Personal Workspace on Day 1 while ensuring the database schema, storage paths, and vector RPCs are 100% ready for shared organization workspaces (`P3`) without future schema migrations.
- **Cost Implications:** \$0.
- **Technical Consequences:** `GET /api/auth/session` returns the user's active `workspace_id`.
- **Dependencies:** `public.workspaces` and `public.workspace_members` tables (`DOC-20`).
- **Implementation Requirements:** Add PostgreSQL trigger `handle_new_user_workspace()` + idempotent Python fallback on first login.
- **Conditions to Revisit:** When activating `P3` Team Collaboration UI, add workspace switcher and member invite endpoints on top of this exact schema.

---

### `ADR-005`: Deterministic PyMuPDF Coordinate Extraction + Selective `gpt-6.1-terra` Vision OCR Gate
- **Status:** **`DECIDED`**
- **Context:** Users upload both born-digital PDFs and scanned PDFs/charts. Extracting digital PDFs via Vision LLMs wastes money and loses exact text coordinates, while PyMuPDF alone returns 0 text on scanned pages.
- **Chosen Solution:** Extract all pages first with PyMuPDF (`fitz`) to capture exact digital text and `[x0/w, y0/h, x1/w, y1/h]` normalized coordinates (`0.0–1.0`). Evaluate each page deterministically: if `word_count < 20` or `image_area_ratio > 0.35`, render that specific page at `150 DPI` PNG and send it to `gpt-6.1-terra` Vision OCR (`DOC-10` Stages 4–6).
- **Alternatives Considered:** (1) PyMuPDF only; (2) Tesseract/PaddleOCR local CPU models; (3) Vision LLM on every page.
- **Reasons for Selection:** Local Tesseract/PaddleOCR bloats container images by >1.5 GB, struggles with scientific formulas and two-column layouts, and cannot interpret embedded charts. `gpt-6.1-terra` handles complex layouts, handwritten lab notes, and charts in one pass while the `<20` word gate keeps 90% of digital pages at \$0 cost.
- **Cost Implications:** \$0.00 for digital pages; ~\$0.0018 per scanned page on `flex` tier.
- **Technical Consequences:** Keeps `documind-worker` Docker image lightweight (`<300 MB`) and fast to deploy on Railway.
- **Dependencies:** `PyMuPDF` (`fitz`) + `AIGateway` (`AITaskType.VISION_OCR_AND_TABLES`).
- **Implementation Requirements:** Implement per-page heuristic gate in `pdf_service.py` and batch concurrent Vision OCR calls (4 pages/batch).
- **Conditions to Revisit:** If an enterprise tenant uploads >100,000 scanned pages/month, evaluate adding a bulk OCR pre-processor alongside `gpt-6.1-terra`.

---

### `ADR-006`: High-Precision Hybrid RRF Retrieval (`text-embedding-3-large` at 1,536 Dims + `pgvector` HNSW + PostgreSQL GIN FTS)
- **Status:** **`DECIDED`**
- **Context:** DocuMind requires semantic search across Indonesian and English, exact keyword/formula matching, strict tenant filtering, and preservation of custom `bounding_boxes jsonb` per chunk.
- **Chosen Solution:**
  1. Generate embeddings using OpenAI **`text-embedding-3-large` with `dimensions=1536`** (native Matryoshka truncation).
  2. Store vectors in `public.chunks.embedding vector(1536)` (HNSW index) alongside `embedding_model text` and a GIN `tsvector` index (`'simple'` dictionary).
  3. Retrieve via `match_document_chunks_hybrid` (Reciprocal Rank Fusion, $k=60$) inside PostgreSQL (`DOC-12`).
- **Alternatives Considered:** (1) OpenAI Hosted `file_search` / Vector Stores; (2) `text-embedding-3-small`; (3) External Pinecone/Qdrant.
- **Reasons for Selection:**
  - *Why not Hosted `file_search`?* Hosted `file_search` strips custom PDF bounding-box coordinates, charges \$2.50/1,000 calls + \$0.10/GB/day, and persists files outside ZDR.
  - *Why `text-embedding-3-large` (`dims=1536`) over `3-small`?* Under our quality-first mandate, `text-embedding-3-large` at 1,536 dims delivers superior cross-lingual (Indonesian $\leftrightarrow$ English) and dense tabular retrieval accuracy while fitting the exact same `vector(1536)` column and costing less than **\$0.001 per 15-page document**.
- **Cost Implications:** \$0.00098 per 15-page document (\$0.49 per 500 documents); \$0.000004 per search query.
- **Technical Consequences:** Compatible with the existing `vector(1536)` definition in `supabase/migrations/20261113000001_initial_schema.sql`.
- **Dependencies:** PostgreSQL `vector` extension (`pgvector`) + `OpenAIEmbeddingsAdapter`.
- **Implementation Requirements:** Deploy `match_document_chunks_hybrid` SQL RPC and pass `dimensions=1536` in `OpenAIEmbeddingsAdapter`.
- **Conditions to Revisit:** If a future embedding model surpasses `text-embedding-3-large`, the `chunks.embedding_model` column enables background re-indexing without downtime.

---

### `ADR-007`: Standardize on OpenAI Responses API (`POST /v1/responses`) with Strict Structured Outputs
- **Status:** **`DECIDED`**
- **Context:** `[VERIFIED]` OpenAI shut down the Assistants API (`/v1/assistants`) on August 26, 2026, and GPT-6 reasoning models (`gpt-6.1-sol`, `gpt-6-astra`) require `POST /v1/responses`.
- **Chosen Solution:** Execute all OpenAI text/multimodal calls inside `OpenAIResponsesAdapter` via `AsyncOpenAI.responses.create()` and `AsyncOpenAI.responses.parse()` with strict Pydantic JSON Schemas (`strict: true`) and `store=False`.
- **Alternatives Considered:** Legacy `/v1/chat/completions`.
- **Reasons for Selection:** `/v1/responses` is OpenAI's primary active standard, supports reasoning token controls (`reasoning.effort`), native prompt caching (`prompt_cache_key`), and guaranteed JSON schema adherence.
- **Cost Implications:** Standard token rates; supports 90%–95% cached input discounts.
- **Technical Consequences:** Zero fragile regex JSON parsing in backend services.
- **Dependencies:** `openai>=1.65.0` Python SDK.
- **Implementation Requirements:** Implement in `apps/api/app/ai/adapters/openai_adapter.py`.
- **Conditions to Revisit:** Only when adding an additional provider adapter alongside `OpenAIResponsesAdapter` (`ADR-017`).

---

### `ADR-008`: Quality-Optimized Task-Based Model Routing (`gpt-6.1-terra`, `gpt-6.1-sol`, `gpt-6-luna`)
- **Status:** **`DECIDED`**
- **Context:** A single model is either too weak for complex synthesis/SQL planning or unnecessarily expensive for trivial query rewriting. Conversely, over-using the cheapest nano model (`gpt-6-luna`) for core document extraction or user Q&A degrades product quality to save pennies.
- **Chosen Solution:** Route tasks based on quality impact (`DOC-30` Section 3.3):
  - **`gpt-6.1-terra` (\$1.00/1M in, \$0.05 cached):** Stage 6 Vision OCR, Stage 11 Single-Pass Document Understanding & KPI Extraction, Standard Grounded Chat Q&A, and Study Quizzes.
  - **`gpt-6.1-sol` (\$2.00/1M in, \$0.10 cached):** Dashboard SQL + ECharts Planning (`DashboardGenerationPlan`), Deep/Multi-Document Chat Q&A, and Cross-Document Comparative Synthesis & Contradiction Detection.
  - **`gpt-6-luna` (\$0.10/1M in, \$0.01 cached):** Query complexity classification, multi-turn query rewriting, conversation compaction, and P2 Audio Briefing script drafting.
- **Alternatives Considered:** (1) `gpt-6-luna` for all ingestion and 85% of chat (sacrifices extraction/grounding precision); (2) `gpt-6-astra` (\$10/\$50) for everything (5x–10x higher cost without proportional gain over `sol`/`terra`).
- **Reasons for Selection:** Places `gpt-6.1-terra` and `gpt-6.1-sol` on every accuracy-critical path while keeping total AI cost around **~\$0.25–\$0.36 per active user/month** thanks to 95% prompt cache discounts (`$0.05/1M` on `terra`, `$0.10/1M` on `sol`) and `flex` background tiers.
- **Cost Implications:** ~\$0.0067 per ingested document; ~\$0.0038 per standard cached Q&A; ~\$0.0084 per generated dashboard widget; ~\$0.0219 per 4-document synthesis.
- **Technical Consequences:** Routing map lives in `apps/api/app/ai/routing.py` and can be tuned via environment variables without code changes.
- **Dependencies:** `ADR-007`, `ADR-017`.
- **Implementation Requirements:** Configure `TaskModelRouter` with automatic fallback (`sol` $\leftrightarrow$ `terra`).
- **Conditions to Revisit:** Revisit when new model snapshots release or if cost telemetry (`ai_usage_logs`) shows a specific task can be downgraded/upgraded.

---

### `ADR-009`: Deterministic Citation Resolution (`chunk_id` $\rightarrow$ `BoundingBox`) Over LLM-Generated Coordinates
- **Status:** **`DECIDED`**
- **Context:** `[OBSERVED]` The prototype asked the LLM to output `BoundingBox` floats directly in `QuizResponse` and hardcoded `context_chunks[:2]` in `chat.py`, resulting in broken/hallucinated highlights.
- **Chosen Solution:** Prohibit LLMs from ever outputting coordinate floats. LLMs output only `chunk_id` references (`[cite:CHUNK_ID]` or `source_chunk_id`). The backend `CitationResolver` deterministically maps `chunk_id` to the true PyMuPDF `page_number` and `bounding_boxes` array stored in `public.chunks` (`DOC-11`).
- **Alternatives Considered:** Prompting LLMs with coordinate lists and asking them to echo floats back.
- **Reasons for Selection:** 100% mathematical precision, smaller output token payloads, and zero possibility of hallucinated page regions.
- **Cost Implications:** Saves ~150 output tokens per response by omitting float arrays from LLM generation.
- **Technical Consequences:** Any `chunk_id` not present in the retrieved chunk map is stripped before reaching the UI (`EC-024`).
- **Dependencies:** `DOC-10` Stage 8 (`bounding_boxes jsonb`) and `DOC-11`.
- **Implementation Requirements:** Implement `CitationResolver` in `apps/api/app/services/citation_resolver.py`.
- **Conditions to Revisit:** Never—deterministic coordinate resolution is a core invariant.

---

### `ADR-010`: Corpus-Adaptive Three-Tier Personalized Dashboard Architecture (Pillar B)
- **Status:** **`DECIDED`**
- **Context:** Users upload diverse document collections (corporate financial reports with tables vs. qualitative academic/legal PDFs). A static dashboard template fails on qualitative collections or shows fake data.
- **Chosen Solution:** Classify each workspace into one of 5 Corpus Profiles (`DOC-14`) and render a **Three-Tier Dashboard**:
  - **Tier 1:** Deterministic PostgreSQL Corpus Telemetry (Document/Page/Table counts, Categories, Topics).
  - **Tier 2:** Auto-discovered quantitative DuckDB KPI/Chart widgets (when tables/metrics exist) OR qualitative Corpus Intelligence widgets (Topic clusters, Entity frequency, Key Findings when documents are purely textual).
  - **Tier 3:** User-created and pinned custom widgets.
- **Alternatives Considered:** Static fixed chart templates; forcing LLM-guessed charts on qualitative PDFs.
- **Reasons for Selection:** Guarantees every user has a meaningful, honest Personalized Dashboard (`PR-033`, `PR-034`, `PR-038`).
- **Cost Implications:** Tier 1 and saved Tier 2/3 widgets load from PostgreSQL in `<100ms` at **\$0.00 LLM cost**.
- **Technical Consequences:** Requires `public.dashboards` and `public.dashboard_widgets` persistence (`DOC-20`).
- **Dependencies:** `ADR-011`, `ADR-012`.
- **Implementation Requirements:** Build `DashboardService` in `apps/api/app/services/dashboard_service.py` and `/app/dashboard` UI.
- **Conditions to Revisit:** None.

---

### `ADR-011`: Persisted PostgreSQL `document_tables`/`extracted_metrics` + Ephemeral Sandboxed DuckDB Engine
- **Status:** **`DECIDED`**
- **Context:** `[OBSERVED]` `duckdb_service.py` used a single global `:memory:` connection (volatile on restart, shared across all users) with external file access enabled (`read_text('.env')` vulnerability) and a bypassable `.split()` keyword check.
- **Chosen Solution:** Persist extracted tables and verified KPIs in PostgreSQL (`public.document_tables`, `public.extracted_metrics`). For analytical queries, hydrate an **ephemeral, workspace-scoped in-memory DuckDB cursor (`WorkspaceDuckDBSandbox`)** locked with `SET enable_external_access = false; SET memory_limit = '256MB'; SET lock_configuration = true;` and guarded by the **5-Gate Validation Layer** (AST/Regex `SELECT`-only check, execution + 1-step self-repair, row cardinality check, unit/currency homogeneity check, and citation verification, `DOC-15`).
- **Alternatives Considered:** (1) Global `:memory:` DuckDB; (2) OpenAI Hosted Code Interpreter (\$0.03+/session); (3) Pure PostgreSQL JSONB queries without DuckDB.
- **Reasons for Selection:** Combines durable multi-tenant PostgreSQL storage with DuckDB's `<10ms` columnar OLAP speed and completely closes the local filesystem read vulnerability (`TM-02`).
- **Cost Implications:** \$0.00 execution cost (runs in-process inside `documind-api`).
- **Technical Consequences:** Every widget stores its verified `sql_query` and `source_table_ids`/`source_chunk_ids`.
- **Dependencies:** `duckdb>=1.1.0`, `public.document_tables`, `public.extracted_metrics`.
- **Implementation Requirements:** Replace `DuckDBAnalyticsEngine` in `apps/api/app/services/duckdb_service.py` with `WorkspaceDuckDBSandbox`.
- **Conditions to Revisit:** If a single tenant uploads CSVs exceeding 1,000,000 rows, store large sheets as Parquet files in Supabase Storage and load them into the workspace sandbox before setting `enable_external_access = false`.

---

### `ADR-012`: Declarative JSON Apache ECharts Spec + Deterministic SQL Data Binding
- **Status:** **`DECIDED`**
- **Context:** Allowing LLMs to generate raw JavaScript chart code or output chart data arrays directly creates XSS vulnerabilities and numerical hallucinations.
- **Chosen Solution:** `gpt-6.1-sol` outputs a structured `DashboardGenerationPlan` (`sql_query` + `series_specs` + `unit_label`), and the Python backend injects the deterministic DuckDB result rows directly into `echarts_config.dataset.source` (`DOC-15`).
- **Alternatives Considered:** LLM generating full ECharts JSON including data arrays; Recharts/Chart.js.
- **Reasons for Selection:** Zero LLM-invented chart numbers (`PR-035`), zero arbitrary JS execution (`PR-045`), and `echarts-for-react` is already installed in `apps/web/package.json`.
- **Cost Implications:** Reduces LLM output tokens per chart by ~60% (no data arrays in LLM output).
- **Technical Consequences:** Frontend renders `<ReactECharts option={widget.echarts_config} />` safely.
- **Dependencies:** `ADR-011`, `echarts-for-react`.
- **Implementation Requirements:** Implement ECharts dataset binder in `dashboard_service.py`.
- **Conditions to Revisit:** None.

---

### `ADR-013`: PostgreSQL Relational + `pgvector` Centroid Graph Over External Graph Databases
- **Status:** **`DECIDED`**
- **Context:** DocuMind needs to discover relationships between documents (`shared_topics`, `shared_entities`, `semantic_similarity`, `explicit_reference`, `shared_metric_lineage`, `contradictory_claims`, `DOC-16`).
- **Chosen Solution:** Store normalized `topics`, `entities`, `document_entities`, `documents.centroid_embedding vector(1536)`, and materialized edges in `public.document_relationships` inside Supabase PostgreSQL, computed via `compute_document_relationships_for_doc()`.
- **Alternatives Considered:** Neo4j / Memgraph; file-based LightRAG in RAM.
- **Reasons for Selection:** Avoids running and paying for a second database cluster, preserves single-database ACID cascade deletes (`ON DELETE CASCADE`) and RLS tenant isolation, and executes 1–2 hop relationship queries in `<30ms`.
- **Cost Implications:** \$0 extra infrastructure cost; \$0 marginal LLM cost for Stage 13 relationship linking.
- **Technical Consequences:** All relationship edges carry `composite_confidence` and `evidence_summary jsonb`.
- **Dependencies:** `DOC-20` schema (`topics`, `entities`, `document_relationships`).
- **Implementation Requirements:** Add `compute_document_relationships_for_doc` SQL RPC in Stage 1/5.
- **Conditions to Revisit:** Only if a future enterprise feature requires 6+ hop graph centrality algorithms over millions of nodes.

---

### `ADR-014`: Managed Redis + Python `arq` Worker Queue + PostgreSQL 6-Stage Checkpoints for Ingestion
- **Status:** **`DECIDED`**
- **Context:** Under Section 2.B, Railway infrastructure is available. Relying on in-process FastAPI `BackgroundTasks` for 15-stage PDF ingestion risks losing jobs on container deploys and blocking HTTP/SSE event loops during PyMuPDF/OCR processing.
- **Chosen Solution:** Use **Managed Redis on Railway (`documind-redis`)** + **Python `arq` (AsyncIO Redis Queue)** running in a dedicated **`documind-worker`** service, backed by durable **6-stage checkpoints in `public.processing_jobs`** (`DOC-24`) and optimistic `ingestion_version` fencing.
- **Alternatives Considered:** (1) FastAPI `BackgroundTasks` only; (2) Heavy Celery + RabbitMQ + Flower stack; (3) External SaaS queues (Inngest/Trigger.dev).
- **Reasons for Selection:** `arq` is a lightweight, pure-`asyncio` Python queue that reuses our exact `async def` services without Celery's serialization/broker bloat, while Redis on Railway costs ~\$2–\$5/month and gives us real-time progress pub/sub and distributed rate limiting for free!
- **Cost Implications:** ~\$2–\$5/month for Redis + ~\$5–\$10/month for `documind-worker` container on Railway.
- **Technical Consequences:** Uploading a PDF enqueues `await arq_redis.enqueue_job("process_document_job", doc_id, workspace_id, ingestion_version)` and returns `202 Accepted` in `<150ms`.
- **Dependencies:** `arq>=0.26.0`, `redis>=5.0.0`, and `public.processing_jobs` table.
- **Implementation Requirements:** Create `apps/api/app/workers/ingestion_worker.py` with startup orphan-job recovery (`EC-018`).
- **Conditions to Revisit:** Scale `documind-worker` replicas horizontally on Railway when concurrent upload volume exceeds 50 PDFs/minute.

---

### `ADR-015`: Scope Quiz Generation and Audio Briefings as Modular P2 Studio Tabs
- **Status:** **`DECIDED`**
- **Context:** Quiz and Audio Briefing routes exist in the prototype (`chat.py`, `audio.py`), and are valuable for Student/Academic users, but should not clutter the primary Repository or Personalized Dashboard navigation.
- **Chosen Solution:** Place **Study Quiz** (`gpt-6.1-terra` with deterministic `source_chunk_id` $\rightarrow$ `BoundingBox` lookup) and **Audio Briefing** (`gpt-6-luna` script + Browser Web Speech API default playback) as modular tabs inside the right-hand Copilot pane of `/app/documents/[docId]` (`PR-047`).
- **Alternatives Considered:** Deleting Quiz/Audio completely; putting Quiz/Audio in top-level main sidebar navigation.
- **Reasons for Selection:** Preserves full educational value for student personas while keeping the main workspace navigation clean for corporate users.
- **Cost Implications:** \$0.0068 per quiz; \$0.0007 per audio briefing script.
- **Technical Consequences:** Fixes the hallucinated quiz bounding-box bug (`ADR-009`).
- **Dependencies:** `DOC-11` (`CitationResolver`).
- **Implementation Requirements:** Refactor `chat.py` (`/quiz`) and `audio.py` (`/briefing-script`) in Stage 6.
- **Conditions to Revisit:** If users request downloadable studio MP3s, enable optional `gpt-realtime-2.1-mini` audio rendering behind a per-user daily quota.

---

### `ADR-016`: Stateless OpenAI Data Governance (`store: false`, Zero Hosted Files/Vector Stores)
- **Status:** **`DECIDED`**
- **Context:** `[VERIFIED]` OpenAI's `POST /v1/responses` defaults to `store: true` (retaining completions indefinitely in the OpenAI Dashboard), and OpenAI `Files` / `Vector Stores` are excluded from Zero Data Retention (ZDR).
- **Chosen Solution:** Hardcode `store=False` (configurable via `OPENAI_STORE_RESPONSES=False`) in `OpenAIResponsesAdapter` on every `/v1/responses` call, and store 100% of files and vectors inside DocuMind's own Supabase Storage and PostgreSQL database (`PR-044`).
- **Alternatives Considered:** Using OpenAI `store: true` or `Conversations API` for server-side thread state.
- **Reasons for Selection:** Ensures zero user documents or AI completions are persisted in OpenAI's application state logs and keeps full conversation/citation state under DocuMind's PostgreSQL RLS control.
- **Cost Implications:** \$0.
- **Technical Consequences:** Multi-turn conversation history is stored in `public.conversations` and `public.messages`.
- **Dependencies:** `OpenAIResponsesAdapter` and `public.conversations`.
- **Implementation Requirements:** Enforce `store=False` in `apps/api/app/ai/adapters/openai_adapter.py`.
- **Conditions to Revisit:** Never for production user data.

---

### `ADR-017`: OpenAI-First, Provider-Flexible AI Gateway & Adapter Layer (`apps/api/app/ai/`)
- **Status:** **`DECIDED`**
- **Context:** Per Master Task Section 4, OpenAI is the primary intelligence provider, but DocuMind must never have OpenAI-specific SDK calls scattered across domain services or be permanently locked into a single AI vendor.
- **Chosen Solution:** Implement a clean **Task-Based `AIGateway` (`apps/api/app/ai/gateway.py`)** backed by two minimal Python `Protocol` interfaces (`LLMProviderAdapter` and `EmbeddingProviderAdapter`) and a declarative `TaskModelRouter` (`apps/api/app/ai/routing.py`). Ship `OpenAIResponsesAdapter` and `OpenAIEmbeddingsAdapter` as the active default implementations (`DOC-30` Section 3).
- **Alternatives Considered:** (1) Direct `AsyncOpenAI` calls inside every router (`gemini_service.py` style); (2) Heavy third-party frameworks like LangChain or LlamaIndex.
- **Reasons for Selection:** LangChain/LlamaIndex add massive dependency bloat, obscure prompt caching (`prompt_cache_key`) and native `/v1/responses` parameters, and complicate deterministic coordinate citation resolution. Our ~250-line typed `AIGateway` + `Protocol` adapter layer provides 100% provider decoupling with zero framework overhead.
- **Cost Implications:** \$0 runtime overhead; enables instant switching of individual tasks to cheaper or stronger providers in the future.
- **Technical Consequences:** Domain services only import `AIGateway` and `AITaskType`. `public.chunks` tracks `embedding_model` to support future embedding migrations.
- **Dependencies:** Pydantic v2, `openai>=1.65.0`.
- **Implementation Requirements:** Build `apps/api/app/ai/` package (`contracts.py`, `routing.py`, `gateway.py`, `prompts.py`, `telemetry.py`, `adapters/openai_adapter.py`) in Stage 1.
- **Conditions to Revisit:** When adding a second provider (e.g., Anthropic or Gemini for a specific task), implement a new `Adapter` class in `apps/api/app/ai/adapters/` and update `routing.py`.

---

### `ADR-018`: Railway 4-Service Private-Network Topology + Supabase Pro Managed Persistence
- **Status:** **`DECIDED`**
- **Context:** Under Section 2.B, Railway and Supabase are available. We need a production deployment architecture that is reliable, secure, easy to maintain, and free of Kubernetes/AWS DevOps complexity.
- **Chosen Solution:** Deploy 4 services in a single **Railway Project** (`documind-web`, `documind-api`, `documind-worker`, `documind-redis`) communicating over Railway's private internal network (`*.railway.internal`), paired with **Supabase Pro** for Managed PostgreSQL 16 (`pgvector` + FTS), Auth, and Private Storage (`DOC-30` Section 4).
- **Alternatives Considered:** (1) Single monolithic container running Next.js + FastAPI + Redis together; (2) AWS ECS/EKS + RDS + S3 + Cognito.
- **Reasons for Selection:** Gives clean process isolation (heavy PDF/OCR workers never starve web/API requests) and private backend networking (`documind-api` has no public URL) with zero DevOps maintenance overhead.
- **Cost Implications:** ~\$39/mo at Launch scale (100 MAU); ~\$95/mo at Growth scale (1,000 MAU).
- **Technical Consequences:** `apps/api` includes a single `Dockerfile` used by both `documind-api` and `documind-worker`.
- **Dependencies:** Railway account + Supabase project.
- **Implementation Requirements:** Configure Railway service start commands and internal environment variables.
- **Conditions to Revisit:** Only if scale exceeds 50,000+ MAU where dedicated bare-metal vector nodes become economical.

---

### `ADR-019`: Three-Layer Caching Strategy (OpenAI Prefix Cache + PostgreSQL Artifacts + Redis Hot State)
- **Status:** **`DECIDED`**
- **Context:** Repeatedly re-computing summaries, re-running dashboard LLM planners on every page load, or sending uncached document prefixes on multi-turn chat wastes both time and money.
- **Chosen Solution:**
  1. **Layer 1 (LLM Token Cache):** Deterministic static-prefix ordering + `prompt_cache_key="dm:ws:{ws_id}:doc:{doc_id}"` (`in_memory` retention default; `30m` retention for multi-document synthesis sessions) yielding 90%–95% input token discounts.
  2. **Layer 2 (Persistent Artifact Cache in PostgreSQL):** SHA-256 file deduplication, pre-computed Stage 11 summaries/topics/metrics, and persisted `dashboard_widgets`.
  3. **Layer 3 (Redis Hot Cache):** 60-second TTL cache on `GET /api/dashboard/overview` telemetry and workspace membership lookups (`workspace_members`), invalidated immediately on document upload/delete.
- **Alternatives Considered:** No Redis cache; paid `12h` OpenAI cache writes on all single-turn requests.
- **Reasons for Selection:** Delivers `<80ms` dashboard/repository loads and 60%–85% OpenAI prompt cache hit rates without paying upfront cache-write surcharges on short sessions.
- **Cost Implications:** Cuts OpenAI input token spend by >60%.
- **Technical Consequences:** Mutation endpoints (`upload`, `delete`, `patch widget`) publish cache invalidation keys to `documind-redis`.
- **Dependencies:** `documind-redis` (`ADR-014`).
- **Implementation Requirements:** Implement cache helper in `apps/api/app/core/cache.py`.
- **Conditions to Revisit:** Tune TTLs based on production hit-rate metrics.

---

### `ADR-020`: Observability, Cost Telemetry (`public.ai_usage_logs`) & Workspace Quota Guardrails
- **Status:** **`DECIDED`**
- **Context:** Operating a multi-model AI platform requires exact visibility into how many tokens and dollars each feature, model, and workspace consumes.
- **Chosen Solution:** Record every `AIGateway` invocation in `public.ai_usage_logs` (`workspace_id`, `user_id`, `task_type`, `provider`, `model`, `service_tier`, `input_tokens`, `cached_tokens`, `output_tokens`, `reasoning_tokens`, `estimated_cost_usd`, `latency_ms`), emit structured JSON logs via `structlog` (with request correlation IDs and zero raw PII/document text), and enforce configurable per-workspace monthly cost guardrails (`PR-043`).
- **Alternatives Considered:** Relying solely on the aggregate monthly invoice in the OpenAI billing dashboard.
- **Reasons for Selection:** OpenAI's billing dashboard cannot attribute costs to individual DocuMind users, workspaces, or features, nor can it stop a runaway user script.
- **Cost Implications:** \$0 (stored in PostgreSQL).
- **Technical Consequences:** Enables the AI Usage & Cost transparency card in `/app/settings`.
- **Dependencies:** `public.ai_usage_logs` (`DOC-20`) and `AIGateway` (`ADR-017`).
- **Implementation Requirements:** Implement `UsageRecorder` in `apps/api/app/ai/telemetry.py`.
- **Conditions to Revisit:** None.

---

### `ADR-021`: Five-Layer Automated Testing & Security Verification Gate
- **Status:** **`DECIDED`**
- **Context:** `[OBSERVED]` Existing tests (`test_all_endpoints.py`) passed even when all endpoints were unauthenticated and returning hardcoded thermodynamics fallbacks.
- **Chosen Solution:** Enforce the 5-Layer Verification Suite (`DOC-25`: Unit, Multi-Tenant Isolation, Pipeline Integration, AI Grounding/Citation Eval, and Playwright E2E) before any stage is marked complete.
- **Alternatives Considered:** Manual QA only.
- **Reasons for Selection:** Automated cross-tenant isolation tests and DuckDB sandbox tests are the only way to guarantee zero security regressions over time.
- **Cost Implications:** Minimal CI compute time; mocked `LLMProviderAdapter` used for fast deterministic CI runs, with live OpenAI smoke evals run on release branches.
- **Technical Consequences:** Because `AIGateway` uses `LLMProviderAdapter` (`ADR-017`), unit and integration tests can inject a deterministic `MockProviderAdapter` cleanly!
- **Dependencies:** `pytest`, `pytest-asyncio`, `httpx`, `Playwright`.
- **Implementation Requirements:** Build `apps/api/tests/` suite starting in Stage 1.
- **Conditions to Revisit:** None.

---

### `ADR-022`: Retire Legacy Prototype Artifacts (`gemini_service.py`, Fake Mockups, Hardcoded Carnot Fallbacks)
- **Status:** **`DECIDED`**
- **Context:** `[OBSERVED]` The repository contains dead/broken prototype artifacts: `gemini_service.py` (with fake `gemini-3.8-*` models and Carnot/R-134a hardcoded strings), `DOCUMENTS_STORE`/`CHUNKS_STORE` RAM dicts in `documents.py`, `demo_data` in `analytics.py`, filename-only prompts in `synthesis.py`, and the `"Layer 01–03 / Shadow Pass"` graphic-design mockup in `apps/web/components/dashboard/*`.
- **Chosen Solution:** Completely remove these prototype artifacts during Stages 1–4 as their production replacements go live, and archive root `index.html`/`main.js`.
- **Alternatives Considered:** Keeping `gemini_service.py` or Carnot fallbacks as "offline demo mode".
- **Reasons for Selection:** Returning fake Carnot thermodynamics text when a user asks about a financial report is a severe product bug that destroys user trust (`PR-029`). Real errors must surface honestly via the Standardized Error Envelope (`DOC-21`).
- **Cost Implications:** Reduces codebase maintenance burden.
- **Technical Consequences:** Clean, single-purpose production codebase.
- **Dependencies:** Stages 1–4 implementation.
- **Implementation Requirements:** Remove dead files per Stage checklist in `DOC-27`.
- **Conditions to Revisit:** Never.
