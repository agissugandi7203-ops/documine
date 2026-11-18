# 02 — Master Product Requirements Catalog (`PR-001` – `PR-048`)

> **Document ID:** `DOC-02`  
> **Status:** `[PROPOSED]` Canonical Requirement Traceability Matrix  
> **Related Documents:** [01-PRODUCT-VISION.md](file:///c:/Users/arief/Downloads/WAICY/docs/documind-blueprint/01-PRODUCT-VISION.md), [04-PRODUCT-SCOPE-AND-PRIORITIES.md](file:///c:/Users/arief/Downloads/WAICY/docs/documind-blueprint/04-PRODUCT-SCOPE-AND-PRIORITIES.md), [25-TESTING-AND-ACCEPTANCE-CRITERIA.md](file:///c:/Users/arief/Downloads/WAICY/docs/documind-blueprint/25-TESTING-AND-ACCEPTANCE-CRITERIA.md), [26-ARCHITECTURE-DECISIONS.md](file:///c:/Users/arief/Downloads/WAICY/docs/documind-blueprint/26-ARCHITECTURE-DECISIONS.md), [27-IMPLEMENTATION-ROADMAP.md](file:///c:/Users/arief/Downloads/WAICY/docs/documind-blueprint/27-IMPLEMENTATION-ROADMAP.md)

---

## 1. Purpose & Traceability Rules

This document defines the **48 canonical Product Requirements (`PR-001` through `PR-048`)** for DocuMind. Every specification in `docs/documind-blueprint/`, every Architecture Decision Record (`ADR-*`), every Acceptance Criterion (`AC-*`), and every Implementation Stage (`Stage 1–6`) references these exact identifiers.

### Priority Legend
- **`P0 (Core Foundation & MVP)`:** Mandatory for initial production release; defines the core identity, security isolation, Pillar A, Pillar B, and Pillar C experience.
- **`P1 (Essential Intelligence)`:** High-value capabilities that complete the cross-document analysis, relationship discovery, and cost-optimization architecture.
- **`P2 (Secondary Persona Extensions)`:** Valuable domain-specific tools (e.g., Quiz Generation, Audio Briefings) scoped cleanly so they do not clutter P0 workflows.
- **`P3 (Future Expansion)`:** Architectural hooks designed now (e.g., organization-level workspace sharing) for future activation without schema rewrites.

---

## 2. Traceable Requirements Registry

### 2.1 Domain 1: Authentication & User Identity (`PR-001` – `PR-005`)

| ID | Priority | Requirement Statement | Primary Spec | Related ADR | Acceptance Criteria | Roadmap Stage |
|---|---|---|---|---|---|---|
| **`PR-001`** | **P0** | Every application page (`/app/*`) and every FastAPI backend endpoint (`/api/*`, except `/health`) **must** require a verified authenticated user identity. | `DOC-07` | `ADR-002` | `AC-001` | Stage 1 |
| **`PR-002`** | **P0** | The platform **must** support email/password registration, email verification, password reset recovery, and Google OAuth 2.0 sign-in via Supabase Auth. | `DOC-07` | `ADR-001`, `ADR-002` | `AC-002` | Stage 1 |
| **`PR-003`** | **P0** | User sessions **must** persist securely via HTTP-only cookies in Next.js and bridge automatically to `Authorization: Bearer <access_token>` via `/api/proxy/[...path]`. | `DOC-07` | `ADR-002` | `AC-003` | Stage 1 |
| **`PR-004`** | **P1** | Users **must** be able to delete their account, triggering an atomic cascade that purges all owned workspaces, storage files, PostgreSQL records, and cached state. | `DOC-07`, `DOC-22` | `ADR-003`, `ADR-016` | `AC-004` | Stage 1 |
| **`PR-005`** | **P3** | The identity and workspace schema **must** associate users with workspaces via an explicit ownership and membership model (`workspaces` + `workspace_members`) so future organization/team sharing requires zero breaking migrations. | `DOC-08`, `DOC-20` | `ADR-004` | `AC-005` | Stage 1 |

---

### 2.2 Domain 2: Multi-Tenancy & Data Isolation (`PR-006` – `PR-010`)

| ID | Priority | Requirement Statement | Primary Spec | Related ADR | Acceptance Criteria | Roadmap Stage |
|---|---|---|---|---|---|---|
| **`PR-006`** | **P0** | Upon registration or first login, every user **must** automatically be provisioned an isolated default personal workspace (`workspaces.owner_id = auth.uid()`). | `DOC-08` | `ADR-004` | `AC-006` | Stage 1 |
| **`PR-007`** | **P0** | All PostgreSQL tables **must** enforce tenant isolation via **both** PostgreSQL Row-Level Security (RLS) policies **and** mandatory backend service-layer `workspace_id` ownership verification (preventing `service_role` bypass). | `DOC-08`, `DOC-22` | `ADR-003` | `AC-007` | Stage 1 |
| **`PR-008`** | **P0** | Uploaded files in Supabase Storage **must** be stored under tenant-scoped paths (`documents/{workspace_id}/{doc_id}/{filename}`) and accessed exclusively via authenticated proxy streaming or short-lived signed URLs (`\le 15\text{ min}`). | `DOC-08`, `DOC-09`, `DOC-22` | `ADR-003` | `AC-008` | Stage 2 |
| **`PR-009`** | **P0** | Every vector search, keyword search, and hybrid retrieval query **must** enforce `workspace_id` filtering inside the database query before ranking or returning chunks to any AI prompt. | `DOC-08`, `DOC-12` | `ADR-003`, `ADR-006` | `AC-009` | Stage 3 |
| **`PR-010`** | **P0** | Every Personalized Dashboard query and DuckDB analytical execution **must** operate strictly over tables and metrics belonging to the authenticated user's active workspace. | `DOC-08`, `DOC-14`, `DOC-15` | `ADR-003`, `ADR-011` | `AC-010` | Stage 4 |

---

### 2.3 Domain 3: Pillar A — Centralized Document Repository (`PR-011` – `PR-018`)

| ID | Priority | Requirement Statement | Primary Spec | Related ADR | Acceptance Criteria | Roadmap Stage |
|---|---|---|---|---|---|---|
| **`PR-011`** | **P0** | Users **must** have a single, centralized Document Repository page (`/app/repository`) providing a complete overview of their uploaded documents with toggleable **Table View** and **Grid View**. | `DOC-05`, `DOC-09` | `ADR-001` | `AC-011` | Stage 2 |
| **`PR-012`** | **P0** | The upload pipeline **must** support single and multi-file drag-and-drop uploads for PDF (`.pdf`) as P0 and spreadsheets (`.csv`, `.xlsx`) as P1, enforcing strict MIME-type, magic-byte (`%PDF-`), corruption, password-protection, and size ($\le 50\text{ MB}$) validation. | `DOC-09`, `DOC-10`, `DOC-23` | `ADR-005` | `AC-012` | Stage 2 |
| **`PR-013`** | **P0** | On upload, the backend **must** compute a SHA-256 content hash (`file_sha256`) and detect duplicate documents within the same workspace, prompting the user to view the existing document, skip, or reprocess without burning duplicate API tokens. | `DOC-09`, `DOC-10`, `DOC-19` | `ADR-005` | `AC-013` | Stage 2 |
| **`PR-014`** | **P0** | Each document **must** expose a granular, real-time processing status (`queued`, `extracting_text`, `running_ocr`, `embedding`, `extracting_insights`, `ready`, `partial_ready`, `failed`) with human-readable progress and error recovery actions. | `DOC-09`, `DOC-10`, `DOC-24` | `ADR-014` | `AC-014` | Stage 2 |
| **`PR-015`** | **P0** | Users **must** be able to search, filter (by processing status, AI-inferred document category, user tags, date range, and presence of extracted tables), and sort (by upload date, title, page count, file size) their repository with pagination. | `DOC-09` | `ADR-001` | `AC-015` | Stage 2 |
| **`PR-016`** | **P1** | Clicking a document in the repository **must** support a slide-over **Quick Preview Drawer** showing executive summary, classification, key entities/topics, extracted table count, and processing log before opening the full PDF Studio. | `DOC-05`, `DOC-09` | `ADR-001` | `AC-016` | Stage 2 |
| **`PR-017`** | **P1** | The repository **must** support bulk selection actions: bulk launch Cross-Document Synthesis, bulk apply/remove tags, bulk retry failed processing, and bulk delete with confirmation. | `DOC-09` | `ADR-001` | `AC-017` | Stage 2 |
| **`PR-018`** | **P0** | Deleting or replacing a document **must** atomically remove its storage file, pages, chunks, embeddings, extracted tables/metrics, and relationship edges, and mark or refresh any Personalized Dashboard widgets derived from that document. | `DOC-09`, `DOC-15`, `DOC-20` | `ADR-011`, `ADR-016` | `AC-018` | Stage 2 & 4 |

---

### 2.4 Domain 4: PDF Processing & Ingestion Pipeline (`PR-019` – `PR-024`)

| ID | Priority | Requirement Statement | Primary Spec | Related ADR | Acceptance Criteria | Roadmap Stage |
|---|---|---|---|---|---|---|
| **`PR-019`** | **P0** | Digital PDF text and page-normalized bounding boxes (`[x0/w, y0/h, x1/w, y1/h]` in `0.0–1.0`) **must** be extracted deterministically using PyMuPDF (`fitz`) at zero LLM token cost. | `DOC-10`, `DOC-11` | `ADR-005`, `ADR-009` | `AC-019` | Stage 2 |
| **`PR-020`** | **P0** | Each PDF page **must** undergo deterministic scanned-page and visual-density detection; pages with `< 20` digital words or large embedded raster charts/diagrams **must** automatically route through `gpt-6.1-terra` Vision OCR. | `DOC-10`, `DOC-18` | `ADR-005`, `ADR-008` | `AC-020` | Stage 2 |
| **`PR-021`** | **P0** | Extracted page blocks **must** be grouped into layout-aware semantic chunks (target `300–600` tokens, `15%` overlap) while preserving an array of normalized `BoundingBox` coordinates (`bounding_boxes jsonb`) per chunk for multi-line/multi-column highlighting. | `DOC-10`, `DOC-11` | `ADR-005`, `ADR-009` | `AC-021` | Stage 2 |
| **`PR-022`** | **P0** | All chunks of a document **must** be embedded in batched requests using OpenAI `text-embedding-3-small` (`1536` dimensions) and indexed in PostgreSQL `pgvector` (HNSW cosine index) alongside a PostgreSQL GIN `tsvector` full-text search index. | `DOC-10`, `DOC-12` | `ADR-006`, `ADR-008` | `AC-022` | Stage 2 & 3 |
| **`PR-023`** | **P0** | Upon text/OCR completion, a single-pass `gpt-6-luna` Structured Output call (`DocumentMetadataExtraction`) **must** extract the document's executive summary, document category, primary topics, named entities, key dates, and standalone KPI metrics. | `DOC-10`, `DOC-18` | `ADR-007`, `ADR-008` | `AC-023` | Stage 2 |
| **`PR-024`** | **P0** | Structured tables inside PDFs (detected via PyMuPDF `page.find_tables()` and/or `gpt-6.1-terra` vision table extraction) and uploaded `.csv`/`.xlsx` sheets **must** be normalized, typed, and persisted in `public.document_tables` with provenance (`doc_id`, `page_number`, `bbox`). | `DOC-10`, `DOC-15` | `ADR-005`, `ADR-011` | `AC-024` | Stage 2 & 4 |

---

### 2.5 Domain 5: Pillar C — Search, AI Assistant, Citations, Relationships & Insights (`PR-025` – `PR-032`)

| ID | Priority | Requirement Statement | Primary Spec | Related ADR | Acceptance Criteria | Roadmap Stage |
|---|---|---|---|---|---|---|
| **`PR-025`** | **P0** | Users **must** be able to search across a single document, a selected subset, or their entire repository using keyword search, semantic vector search, or **Hybrid Reciprocal Rank Fusion (RRF)** with metadata filters and highlighted match snippets. | `DOC-12` | `ADR-006` | `AC-025` | Stage 3 |
| **`PR-026`** | **P0** | The Document Studio (`/app/documents/[docId]`) **must** render pages via PDF.js and support one-click citation navigation that scrolls smoothly to `page_number` and draws normalized `[x0, y0, x1, y1]` highlight overlays that remain aligned across zoom levels. | `DOC-11` | `ADR-001`, `ADR-009` | `AC-026` | Stage 3 |
| **`PR-027`** | **P0** | The AI Document Assistant **must** support single-document, multi-document subset, and repository-wide Q&A with real-time SSE token streaming (`POST /v1/responses`), grounded exclusively in retrieved document chunks. | `DOC-13` | `ADR-007`, `ADR-008` | `AC-027` | Stage 3 |
| **`PR-028`** | **P0** | Every factual claim in an AI Assistant response **must** include a `[cite:CHUNK_ID]` reference that the backend deterministically resolves against the retrieved chunk map to attach verified `doc_id`, `doc_title`, `page_number`, `bounding_boxes`, and `text_snippet`. | `DOC-11`, `DOC-13` | `ADR-009` | `AC-028` | Stage 3 |
| **`PR-029`** | **P0** | When retrieved chunks do not contain sufficient evidence to answer the user's question (or fall below the minimum relevance threshold), the AI Assistant **must** explicitly state that the information is not found in the selected documents and never fabricate an answer. | `DOC-12`, `DOC-13`, `DOC-23` | `ADR-007` | `AC-029` | Stage 3 |
| **`PR-030`** | **P1** | AI conversations **must** be persisted in PostgreSQL (`public.conversations`, `public.messages`, `public.message_citations`) scoped to the user's workspace, supporting multi-turn history compaction and dynamic follow-up question suggestions. | `DOC-13`, `DOC-20` | `ADR-007`, `ADR-016` | `AC-030` | Stage 3 |
| **`PR-031`** | **P1** | The system **must** automatically compute and store document-to-document relationships (`public.document_relationships`) based on shared topics, shared named entities, document-centroid vector similarity, explicit title/DOI references, and detected contradictions. | `DOC-16`, `DOC-20` | `ADR-013` | `AC-031` | Stage 5 |
| **`PR-032`** | **P1** | Users **must** be able to run Cross-Document Comparative Synthesis (`gpt-6.1-sol`) across 2–10 documents to generate structured comparison tables, consensus themes, research/operational gaps, and verified contradiction cards with dual bounding-box citations. | `DOC-17`, `DOC-18` | `ADR-007`, `ADR-008` | `AC-032` | Stage 5 |

---

### 2.6 Domain 6: Pillar B — Personalized Dashboard & Analytics Engine (`PR-033` – `PR-040`)

| ID | Priority | Requirement Statement | Primary Spec | Related ADR | Acceptance Criteria | Roadmap Stage |
|---|---|---|---|---|---|---|
| **`PR-033`** | **P0** | Every authenticated user **must** have a Personalized Dashboard (`/app/dashboard`) whose KPI cards, charts, topic distributions, and insights are dynamically generated from—and strictly isolated to—that user's own document repository. | `DOC-14`, `DOC-15` | `ADR-010` | `AC-033` | Stage 4 |
| **`PR-034`** | **P0** | The Personalized Dashboard **must** dynamically adapt its widget layout to the user's corpus profile: rendering quantitative DuckDB charts when structured tables/metrics exist, and rendering rich qualitative Corpus Intelligence widgets (topic clusters, entity networks, document categories, key findings) when documents are purely textual. | `DOC-14` | `ADR-010` | `AC-034` | Stage 4 |
| **`PR-035`** | **P0** | All numerical aggregations, averages, sums, growth rates, and chart series on the dashboard **must** be computed deterministically by DuckDB or PostgreSQL SQL queries—never calculated or guessed directly by an LLM. | `DOC-14`, `DOC-15` | `ADR-011`, `ADR-012` | `AC-035` | Stage 4 |
| **`PR-036`** | **P0** | Before rendering any numerical chart or KPI aggregation across multiple records or documents, the Dashboard Validation Layer **must** verify unit and currency consistency (preventing unnormalized mixing of e.g. `USD` and `IDR`, or `%` and absolute counts). | `DOC-15`, `DOC-23` | `ADR-011` | `AC-036` | Stage 4 |
| **`PR-037`** | **P0** | Every dashboard KPI card, chart widget, and insight card **must** store and display clickable source traceability (`source_doc_ids`, `source_chunk_ids`, `page_numbers`, `sql_query`) allowing one-click inspection of the underlying PDF evidence. | `DOC-14`, `DOC-15` | `ADR-009`, `ADR-010` | `AC-037` | Stage 4 |
| **`PR-038`** | **P0** | If a user requests a chart or metric for which the repository lacks sufficient structured data (e.g., fewer than 2 comparable data points) or contains irreconcilable contradictions, the system **must** refuse to render a misleading chart and instead display an honest explanation card with source references. | `DOC-14`, `DOC-15`, `DOC-23` | `ADR-010`, `ADR-012` | `AC-038` | Stage 4 |
| **`PR-039`** | **P1** | Users **must** be able to customize their Personalized Dashboard (generate new widgets via natural language, pin charts from exploration sessions, reorder/delete widgets) with state persisted in `public.dashboard_widgets` and automatically flagged/refreshed when underlying documents change. | `DOC-14`, `DOC-15`, `DOC-20` | `ADR-010`, `ADR-011` | `AC-039` | Stage 4 |
| **`PR-040`** | **P0** | The DuckDB analytical engine **must** run in a strictly sandboxed configuration (`SET enable_external_access = false`, `SET lock_configuration = true`, AST/regex `SELECT`/`WITH`-only enforcement) hydrated only with the authenticated workspace's tables. | `DOC-15`, `DOC-22` | `ADR-011` | `AC-040` | Stage 4 |

---

### 2.7 Domain 7: Cost Efficiency, Security, Resilience & Governance (`PR-041` – `PR-048`)

| ID | Priority | Requirement Statement | Primary Spec | Related ADR | Acceptance Criteria | Roadmap Stage |
|---|---|---|---|---|---|---|
| **`PR-041`** | **P0** | All AI operations **must** route through a centralized, cost-aware `OpenAIRouterService` that assigns `gpt-6-luna` to high-volume ingestion/standard Q&A, `gpt-6.1-terra` to Vision OCR/SQL planning/complex Q&A, `gpt-6.1-sol` to cross-document synthesis, and `text-embedding-3-small` to embeddings. | `DOC-18`, `DOC-19` | `ADR-008` | `AC-041` | Stage 1 & 6 |
| **`PR-042`** | **P1** | The OpenAI integration **must** enforce deterministic static-prefix prompt ordering and `prompt_cache_key` routing (targeting $\ge 60\%$ cache hits at 90%–95% discount) and utilize `service_tier="flex"` / Batch API (`/v1/batches`) for non-blocking background ingestion. | `DOC-18`, `DOC-19` | `ADR-008` | `AC-042` | Stage 6 |
| **`PR-043`** | **P1** | Every OpenAI API call **must** log token consumption (`input_tokens`, `cached_tokens`, `output_tokens`, `reasoning_tokens`, `estimated_cost_usd`, `latency_ms`) to `public.ai_usage_logs` for per-user and per-workspace cost governance. | `DOC-19`, `DOC-20` | `ADR-008` | `AC-043` | Stage 6 |
| **`PR-044`** | **P0** | Every `POST /v1/responses` call **must** explicitly pass `store: false` (unless overridden by an enterprise debug flag) and avoid stateful OpenAI Files/Vector Stores so zero user documents or completions are retained in OpenAI dashboard logs. | `DOC-18`, `DOC-22` | `ADR-007`, `ADR-016` | `AC-044` | Stage 1 |
| **`PR-045`** | **P0** | All prompts containing extracted document text **must** wrap untrusted content in `<untrusted_document_chunk>` XML delimiters, use OpenAI's `developer` role (`instructions`) for system rules, enforce `strict: true` JSON schemas, and never execute LLM-generated JavaScript in the browser. | `DOC-13`, `DOC-18`, `DOC-22` | `ADR-007`, `ADR-012` | `AC-045` | Stage 1 & 3 |
| **`PR-046`** | **P0** | Document ingestion **must** execute via a checkpointed, idempotent job state machine (`public.processing_jobs`) so transient OCR, embedding, or LLM timeouts can retry from the failed stage without re-running completed stages or duplicating chunks. | `DOC-10`, `DOC-24` | `ADR-014` | `AC-046` | Stage 2 & 6 |
| **`PR-047`** | **P2** | Secondary study capabilities—**Adaptive Quiz Generation** (with deterministic `source_chunk_id` $\rightarrow$ `BoundingBox` resolution) and **Audio Briefing / Podcast Generation**—**must** be available as modular tools inside the Document Studio without cluttering the primary Repository or Dashboard navigation. | `DOC-04`, `DOC-17` | `ADR-009`, `ADR-015` | `AC-047` | Stage 6 |
| **`PR-048`** | **P0** | All future AI agents and human engineers **must** follow the working protocol in `29-AGENT-CONTEXT-AND-WORKING-PROTOCOL.md`, updating `PR-*`, `ADR-*`, and `OQ-*` records whenever requirements or architectural decisions evolve. | `DOC-29` | `ADR-001`–`016` | `AC-048` | Continuous |
