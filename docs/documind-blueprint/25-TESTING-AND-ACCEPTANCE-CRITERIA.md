# 25 — Testing Strategy & Traceable Acceptance Criteria (`AC-001` – `AC-048`)

> **Document ID:** `DOC-25`  
> **Status:** `[PROPOSED]` Quality Assurance & Acceptance Specification (Master Task Sections 12 & 17)  
> **Related Documents:** [02-PRODUCT-REQUIREMENTS.md](file:///c:/Users/arief/Downloads/WAICY/docs/documind-blueprint/02-PRODUCT-REQUIREMENTS.md), [22-SECURITY-AND-PRIVACY.md](file:///c:/Users/arief/Downloads/WAICY/docs/documind-blueprint/22-SECURITY-AND-PRIVACY.md), [23-UI-STATES-AND-EDGE-CASES.md](file:///c:/Users/arief/Downloads/WAICY/docs/documind-blueprint/23-UI-STATES-AND-EDGE-CASES.md), [27-IMPLEMENTATION-ROADMAP.md](file:///c:/Users/arief/Downloads/WAICY/docs/documind-blueprint/27-IMPLEMENTATION-ROADMAP.md)

---

## 1. Purpose & Testing Pyramid

In the current repository (`[OBSERVED]`), `apps/api/test_all_endpoints.py` only tests whether unauthenticated endpoints return HTTP 200—passing even when every endpoint returns hardcoded Carnot thermodynamics fallback strings!

To ensure genuine production readiness across all Three Product Pillars, DocuMind enforces a **Five-Layer Verification Pyramid**:

1. **Layer 1 — Deterministic Unit Tests (`pytest`):** Coordinate normalization math (`[0.0, 1.0]`), layout chunk merging, `CitationResolver` stripping of invalid chunk IDs, DuckDB SQL Gate 1–5 validators, and currency/unit homogeneity checks.
2. **Layer 2 — Multi-Tenant Security & Isolation Tests (`pytest` + Test Supabase):** Verifies that User A can never access User B's documents, storage files, vector chunks, conversations, or DuckDB tables (`TM-01`–`TM-07`).
3. **Layer 3 — Pipeline & Database Integration Tests:** Verifies the 15-stage ingestion checkpoint machine, SHA-256 deduplication, `match_document_chunks_hybrid` RRF ranking, and cascade deletion cleanup.
4. **Layer 4 — AI Grounding, Citation & Abstention Evaluations:** Golden test suite of academic and financial PDFs verifying that `[cite:CHUNK_ID]` points to the true source page/bbox, that unsupported questions trigger explicit abstention (`PR-029`), and that DuckDB chart values match ground-truth table sums 100%.
5. **Layer 5 — End-to-End UI & User Journey Tests (`Playwright`):** Verifies Journeys A through E across `/app/dashboard`, `/app/repository`, `/app/documents/[docId]`, and `/app/explore`.

---

## 2. Master Acceptance Criteria Registry (`AC-001` – `AC-048`)

Every Product Requirement (`PR-001`–`PR-048` in `02-PRODUCT-REQUIREMENTS.md`) has a corresponding verifiable Acceptance Criterion below:

### 2.1 Identity & Multi-Tenant Isolation (`AC-001` – `AC-010`)
- **`AC-001` (`PR-001`):** Sending an unauthenticated request (missing or invalid Bearer JWT) to any FastAPI endpoint under `/api/documents`, `/api/chat`, `/api/search`, `/api/analytics`, `/api/synthesis`, `/api/relationships`, `/api/dashboard`, or `/api/audio` returns `401 Unauthorized`. Accessing `/app/*` in Next.js without a valid session redirects to `/?next=...`.
- **`AC-002` (`PR-002`):** Users can register with email/password, verify email, log in, reset a forgotten password via `/forgot-password` $\rightarrow$ `/reset-password`, and sign in with Google OAuth.
- **`AC-003` (`PR-003`):** Requests from the browser to `/api/proxy/[...path]` automatically attach the user's Supabase `access_token` as `Authorization: Bearer <token>` and refresh expired access tokens transparently via the refresh cookie.
- **`AC-004` (`PR-004`):** Executing `DELETE /api/auth/account` deletes all files in `workspaces/{ws_id}/*` in Supabase Storage, deletes all workspace rows in PostgreSQL, and removes the user from `auth.users`.
- **`AC-005` (`PR-005`) & `AC-006` (`PR-006`):** Registering a new user automatically creates 1 personal row in `public.workspaces` (`owner_id = user.id`, `is_personal = true`), 1 row in `public.workspace_members` (`role = 'owner'`), and 1 row in `public.dashboards`.
- **`AC-007` (`PR-007`):** With two test accounts (`User A` and `User B`), `User A` calling `GET`, `PATCH`, `DELETE`, or `/reprocess` with `User B`'s `doc_id` or `widget_id` receives `404 Not Found` (enforced by both PostgreSQL RLS and backend `.eq("workspace_id", ctx.workspace_id)`).
- **`AC-008` (`PR-008`):** Direct unauthenticated HTTP requests to Supabase Storage object paths fail (`400`/`403`); `GET /api/proxy/documents/{doc_id}/file` streams the PDF only when `doc_id` belongs to `ctx.workspace_id`.
- **`AC-009` (`PR-009`):** Calling `match_document_chunks_hybrid` for `User A` returns `0` chunks belonging to `User B`, even when `User B` has uploaded a document containing the exact query phrase.
- **`AC-010` (`PR-010`):** Executing a dashboard analytics query for `User A` hydrates an ephemeral DuckDB instance containing **only** `User A`'s `document_tables` and `extracted_metrics` rows.

---

### 2.2 Pillar A — Document Repository & Ingestion (`AC-011` – `AC-024`)
- **`AC-011` (`PR-011`):** `/app/repository` displays all documents in the user's workspace and supports switching between **Table View** and **Grid View** without losing active search/filter state.
- **`AC-012` (`PR-012`):** Uploading a valid `.pdf`, `.csv`, or `.xlsx` ($\le 50\text{ MB}$) succeeds (`202 Accepted`), whereas uploading a password-protected PDF, corrupted PDF, 0-byte file, or renamed `.exe` is rejected synchronously (`400`/`422`/`415`) with a specific error code.
- **`AC-013` (`PR-013`):** Uploading a file whose `file_sha256` already exists in the same workspace returns `duplicate_detected: true` and the existing `doc_id` without invoking any OpenAI API calls.
- **`AC-014` (`PR-014`):** During ingestion, polling `GET /api/documents/{id}/status` reflects real stage transitions (`queued` $\rightarrow$ `extracting_text` $\rightarrow$ `running_ocr` [if applicable] $\rightarrow$ `embedding` $\rightarrow$ `extracting_insights` $\rightarrow$ `ready`) with progress percentage.
- **`AC-015` (`PR-015`):** `/app/repository` filters accurately by `status`, AI `category`, `user_tags`, `has_tables`, and date range, searches by title/summary keyword (`?q=`), and sorts by date, title, page count, and size.
- **`AC-016` (`PR-016`):** Clicking a repository row opens the slide-over **Quick Preview Drawer** displaying the AI summary, category, topics, entities, extracted table count, and related documents.
- **`AC-017` (`PR-017`):** Selecting multiple rows in `/app/repository` enables bulk tagging, bulk deletion, and launching Cross-Document Synthesis across the selected `doc_ids`.
- **`AC-018` (`PR-018`):** Deleting a document removes its Supabase Storage blob, deletes its `documents` row and all cascaded child rows (`chunks`, `document_tables`, `extracted_metrics`, `document_relationships`), and updates any dependent `dashboard_widgets`.
- **`AC-019` (`PR-019`):** Digital PDF pages are extracted via PyMuPDF with normalized bounding boxes satisfying $0.0 \le x_0 < x_1 \le 1.0$ and $0.0 \le y_0 < y_1 \le 1.0$ at \$0 LLM cost.
- **`AC-020` (`PR-020`):** Pages with `< 20` digital words and image coverage $> 35\%$ automatically invoke `gpt-6.1-terra` Vision OCR and produce searchable chunks in `public.chunks`.
- **`AC-021` (`PR-021`):** Extracted text blocks are merged into semantic chunks of `300–600` tokens while preserving an array of constituent `bounding_boxes jsonb` per chunk.
- **`AC-022` (`PR-022`):** Every chunk receives a 1,536-dim `text-embedding-3-small` vector in `public.chunks.embedding` indexed by `chunks_embedding_idx` (HNSW) and `chunks_fts_idx` (GIN).
- **`AC-023` (`PR-023`):** Stage 11 (`gpt-6-luna`) populates `summary`, `category`, `primary_domain`, `key_findings`, `topics`, `entities`, and `extracted_metrics` in a single structured call.
- **`AC-024` (`PR-024`):** Tables in PDFs and uploaded `.csv`/`.xlsx` files are stored as typed schemas and rows in `public.document_tables` with page and bbox provenance.

---

### 2.3 Pillar C — Search, PDF Viewer, AI Assistant & Synthesis (`AC-025` – `AC-032`)
- **`AC-025` (`PR-025`):** `match_document_chunks_hybrid` retrieves both exact code/formula matches (via GIN FTS) and conceptual/bilingual matches (via `pgvector` HNSW), returning ranked chunks with `match_explanation`.
- **`AC-026` (`PR-026`):** Clicking any citation pill in `/app/documents/[docId]` scrolls the PDF.js canvas to `page_number` and renders SVG highlight boxes matching `bounding_boxes` that stay aligned when zooming between `50%` and `200%`.
- **`AC-027` (`PR-027`) & `AC-028` (`PR-028`):** `POST /api/chat/stream` streams tokens via SSE and emits an `event: citations_verified` payload where every `[cite:CHUNK_ID]` is resolved deterministically to its real `doc_id`, `page_number`, and `bounding_boxes` (stripping any non-existent chunk IDs).
- **`AC-029` (`PR-029`):** Asking a question about a topic completely absent from the selected document(s) produces an explicit abstention statement rather than a hallucinated answer.
- **`AC-030` (`PR-030`):** Conversations and verified citations persist in `public.conversations`, `public.messages`, and `public.message_citations` and reload accurately on page refresh.
- **`AC-031` (`PR-031`):** Uploading 2+ documents that share topics, entities, or high vector similarity ($\ge 0.78$) automatically populates `public.document_relationships` with confidence scores and human-readable explanations.
- **`AC-032` (`PR-032`):** Selecting 2–10 documents and running `POST /api/synthesis/compare` invokes `gpt-6.1-sol` over actual retrieved chunks and summaries from all selected documents, returning a structured comparison matrix and dual-cited contradiction cards.

---

### 2.4 Pillar B — Personalized Dashboard & Governance (`AC-033` – `AC-048`)
- **`AC-033` (`PR-033`) & `AC-034` (`PR-034`):** `/app/dashboard` renders zero hardcoded demo data; it adapts automatically to `Profile 0` (Empty), `Profile 1/2` (Quantitative Corporate/Research), or `Profile 3` (Qualitative Corpus).
- **`AC-035` (`PR-035`):** Every number plotted in an ECharts series or KPI card on `/app/dashboard` equals the deterministic output of the widget's DuckDB/PostgreSQL `sql_query`.
- **`AC-036` (`PR-036`):** Attempting to aggregate metrics with mixed `unit_or_currency` values (e.g., `USD` and `IDR`) in a single ungrouped sum is blocked by Validation Gate 4 and separated by unit/currency.
- **`AC-037` (`PR-037`):** Clicking `"Inspect Source & SQL"` on any dashboard widget displays the exact SQL query, result table, and clickable PDF page citations.
- **`AC-038` (`PR-038`):** Requesting a quantitative chart when `< 2` comparable data points exist returns an honest `insufficient_data_card` rather than a fabricated chart.
- **`AC-039` (`PR-039`):** Pinned and custom dashboard widgets persist in `public.dashboard_widgets` and update or transition to `stale_source_deleted` when underlying documents change.
- **`AC-040` (`PR-040`):** Executing `SELECT * FROM read_text('.env')` or `COPY ...` inside `WorkspaceDuckDBSandbox` is blocked by both Gate 1 regex validation and DuckDB's `SET enable_external_access = false`.
- **`AC-041`–`AC-048` (`PR-041`–`PR-048`):** Verified by unit/integration tests confirming model routing (`luna`/`terra`/`sol`), `prompt_cache_key` attachment, `ai_usage_logs` recording, `store=False` enforcement on `/v1/responses`, `<untrusted_document_chunk>` prompt wrapping, checkpointed job retry in `processing_jobs`, deterministic `source_chunk_id` resolution in `QuizResponse`, and zero modifications outside authorized files.
