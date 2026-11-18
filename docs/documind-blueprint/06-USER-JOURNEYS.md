# 06 — End-to-End User Journeys & System Interaction Flows

> **Document ID:** `DOC-06`  
> **Status:** `[PROPOSED]` End-to-End Behavioral Specification (Master Task Section 5)  
> **Related Documents:** [05-INFORMATION-ARCHITECTURE.md](file:///c:/Users/arief/Downloads/WAICY/docs/documind-blueprint/05-INFORMATION-ARCHITECTURE.md), [09-DOCUMENT-REPOSITORY.md](file:///c:/Users/arief/Downloads/WAICY/docs/documind-blueprint/09-DOCUMENT-REPOSITORY.md), [10-DOCUMENT-INGESTION-PIPELINE.md](file:///c:/Users/arief/Downloads/WAICY/docs/documind-blueprint/10-DOCUMENT-INGESTION-PIPELINE.md), [14-PERSONALIZED-DASHBOARD.md](file:///c:/Users/arief/Downloads/WAICY/docs/documind-blueprint/14-PERSONALIZED-DASHBOARD.md), [23-UI-STATES-AND-EDGE-CASES.md](file:///c:/Users/arief/Downloads/WAICY/docs/documind-blueprint/23-UI-STATES-AND-EDGE-CASES.md)

---

## 1. Purpose

This document traces **five complete end-to-end user journeys (`Journey A` through `Journey E`)** across the user interface, Next.js BFF proxy, FastAPI backend, Supabase PostgreSQL/Storage, DuckDB analytical engine, and OpenAI APIs. Every journey specifies its **Main Flow**, **Alternative Flows**, **Error Conditions**, **Loading & Feedback Behavior**, **Data Mutations**, **Security Controls**, and **AI Operations**.

---

## 2. Journey A — New User Onboarding to First Personalized Dashboard

**Scenario:** A new user registers an account, verifies their identity, lands on an empty Personalized Dashboard, uploads their first PDF document, watches it process, and sees both their Repository and Personalized Dashboard come alive.

### 2.1 End-to-End Sequence Diagram

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant Web as Next.js (/ & /app/*)
    participant Auth as Supabase Auth
    participant API as FastAPI (/api/*)
    participant DB as Supabase PostgreSQL + Storage
    participant OAI as OpenAI API (embed-3-small + luna + terra)

    User->>Web: Submit Sign Up (email, password, name)
    Web->>Auth: supabase.auth.signUp()
    Auth-->>User: Send verification email (or auto-confirm in dev)
    User->>Web: Click verification link -> /api/auth/callback
    Web->>API: GET /api/auth/session (Bearer JWT)
    API->>DB: Ensure default Personal Workspace exists (PR-006)
    DB-->>API: workspace_id = ws_101
    API-->>Web: Session + workspace_id
    Web-->>User: Redirect to /app/dashboard (Empty Onboarding State)

    User->>Web: Drag & Drop "Q3_Financial_Report.pdf" (18 pages)
    Web->>API: POST /api/proxy/documents/upload (Multipart + Bearer JWT)
    API->>API: Validate %PDF- magic bytes, size <= 50MB, compute SHA-256
    API->>DB: Upload binary to Storage: documents/ws_101/doc_01/Q3.pdf
    API->>DB: INSERT public.documents (status='extracting_text') & processing_jobs
    API-->>Web: 202 Accepted (doc_id=doc_01, status='extracting_text')

    par Background Ingestion Pipeline (FastAPI Worker)
        API->>API: PyMuPDF extracts digital text, normalized bboxes & tables
        API->>OAI: POST /v1/responses (gpt-6.1-terra) on 2 scanned chart pages
        API->>OAI: POST /v1/embeddings (text-embedding-3-small, 1536-d)
        API->>OAI: POST /v1/responses (gpt-6-luna, DocumentMetadataExtraction)
        API->>DB: INSERT chunks, document_tables, extracted_metrics, topics
        API->>DB: UPDATE public.documents SET status='ready'
    and Frontend Progress Polling / Realtime Subscription
        Web->>API: GET /api/proxy/documents/doc_01/status (every 2s)
        API-->>Web: Progress: 25% -> 60% -> 90% -> 100% (ready)
    end

    Web->>API: GET /api/proxy/dashboard/overview
    API->>DB: Fetch Tier-1 Corpus Telemetry + Tier-2 Extracted KPIs/Tables
    API-->>Web: Personalized Dashboard Payload (KPIs, Revenue Chart, Summary)
    Web-->>User: Render populated Personalized Dashboard & Repository badge
```

### 2.2 Journey A Specification Matrix

| Aspect | Specification |
|---|---|
| **Alternative Flows** | • **Google OAuth Sign-In:** Skips manual email verification (`email_confirmed_at` already verified by Google); immediately provisions `ws_101` and redirects to `/app/dashboard`.<br/>• **Purely Qualitative First Document (e.g., Literature Review PDF with 0 tables):** Dashboard initializes with Tier-1 Corpus Stats, Topic Distribution Chart, Extracted Key Findings Cards, and Entities list—without rendering empty numerical charts (`PR-034`). |
| **Error Conditions** | • **Invalid/Corrupted PDF or Password-Protected PDF:** Rejected synchronously with `400 Bad Request` (`ERR_PDF_ENCRYPTED` or `ERR_INVALID_FORMAT`) before consuming storage or OpenAI tokens.<br/>• **Transient OpenAI Timeout During Ingestion:** `processing_jobs` retries stage from checkpoint up to 3 times; if Vision OCR fails on 1 scanned page while 17 digital pages succeed, document enters `partial_ready` state so user is not blocked (`EC-011`). |
| **Loading & User Feedback** | • Upload progress bar (`0–100%` network transfer) transitions smoothly into a 5-step ingestion stepper (`Validating` $\rightarrow$ `Extracting Layout & Text` $\rightarrow$ `Vision OCR (2 pages)` $\rightarrow$ `Generating Embeddings` $\rightarrow$ `Synthesizing Insights & Dashboard`). |
| **Data Changes** | • Creates `auth.users` row, `public.workspaces` row (`owner_id = user.id`), `public.workspace_members` row (`role='owner'`), Storage object, `public.documents` row, `public.document_pages`, `public.chunks`, `public.document_tables`, `public.extracted_metrics`, `public.topics`, `public.chunk_topics`, and `public.dashboards`. |
| **Security Requirements** | • Origin CSRF check on `/api/auth/signup`; JWT verification on `/api/documents/upload`; Storage path prefixed by `ws_101/doc_01/`. |
| **AI Operations** | • `gpt-6.1-terra` (only on pages with `< 20` words or charts), `text-embedding-3-small` (1 batch call for all chunks), `gpt-6-luna` (1 structured metadata/summary/KPI call). |

---

## 3. Journey B — Document Exploration, Hybrid Search & Cited Q&A

**Scenario:** A user opens `/app/repository`, searches for a specific concept across their library, opens a matching PDF in the **Document Studio** (`/app/documents/[docId]`), asks the AI Assistant a detailed question, receives a streamed answer with citations, clicks a citation badge to verify the exact paragraph on the PDF canvas, and asks a follow-up question.

### 3.1 End-to-End Sequence Diagram

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant Studio as Next.js Document Studio (/app/documents/[id])
    participant API as FastAPI (/api/chat & /api/search)
    participant DB as Supabase PostgreSQL (pgvector + FTS)
    participant OAI as OpenAI API (embed-3-small + gpt-6-luna/terra)

    User->>Studio: Open Document Studio for doc_01 ("Solid_State_Battery.pdf")
    Studio->>API: GET /api/proxy/documents/doc_01 & /file
    API-->>Studio: Metadata, Chunks + Streamed PDF Binary (rendered in PDF.js)

    User->>Studio: Ask AI: "Why did dendrite formation occur at 5 mA/cm²?"
    Studio->>API: POST /api/proxy/chat/stream (doc_ids=[doc_01], message, conv_id)
    API->>OAI: POST /v1/embeddings (text-embedding-3-small on user query)
    OAI-->>API: query_embedding (1536-d vector)
    API->>DB: RPC match_document_chunks_hybrid (workspace_id, doc_ids, query_embedding, query_text, top_k=8)
    DB-->>API: Top 8 Chunks with chunk_id, page_number, bounding_boxes, rrf_score

    API->>OAI: POST /v1/responses (stream=True, store=False, model=gpt-6-luna,<br/>prompt_cache_key="documind:ws_101:doc_01")
    loop SSE Token Streaming
        OAI-->>API: response.output_text.delta ("Dendrite growth at 5 mA/cm² was driven by... [cite:chk_88]")
        API-->>Studio: event: token_delta
        Studio-->>User: Render streaming markdown text
    end
    OAI-->>API: response.completed
    API->>API: Resolve [cite:chk_88] -> page_number=7, bounding_boxes=[[0.12, 0.44, 0.88, 0.59]]
    API->>DB: INSERT public.messages & public.message_citations
    API-->>Studio: event: citations_verified (citations array + suggested_followups)

    User->>Studio: Click Citation Pill "[Page 7 • Para 3]"
    Studio->>Studio: PDF.js scrolls smoothly to Page 7 & draws pulsing highlight box at [0.12, 0.44, 0.88, 0.59]
```

### 3.2 Journey B Specification Matrix

| Aspect | Specification |
|---|---|
| **Alternative Flows** | • **Escalation to `gpt-6.1-terra`:** If the query classifier detects complex multi-step mathematical derivation or cross-table comparison inside the document, `OpenAIRouterService` routes the call to `gpt-6.1-terra` (`reasoning={"effort": "medium"}`).<br/>• **Unsupported Question / Missing Evidence (`PR-029`):** User asks *"What was the manufacturing cost in Berlin?"* when the paper never mentions Berlin or manufacturing costs. The assistant responds: *"Based on 'Solid_State_Battery.pdf', there is no mention of manufacturing costs or facilities in Berlin. The document only covers laboratory cell fabrication metrics on Pages 3–4 [cite:chk_14]."* |
| **Error Conditions** | • **LLM Outputs Invalid `[cite:chk_999]` ID:** Backend citation verifier strips unverified chunk IDs so the UI never crashes or highlights a wrong page (`EC-024`).<br/>• **SSE Stream Interrupted Mid-Response:** Frontend retains partial streamed text and displays `"Connection interrupted — Retry response"`. |
| **Loading & User Feedback** | • Displays subtle stage pill (`"Searching document..."` $\rightarrow$ `"Reading 8 passages on pages 4, 7, 11..."` $\rightarrow$ live token stream). |
| **Data Changes** | • Creates/updates `public.conversations`, inserts `public.messages` (user + assistant), inserts `public.message_citations`, and logs token usage in `public.ai_usage_logs`. |
| **Security Requirements** | • `match_document_chunks_hybrid` enforces `c.workspace_id = verified_workspace_id` and `c.doc_id = ANY(permitted_doc_ids)`. Document chunks wrapped in `<untrusted_document_chunk>` tags. |
| **AI Operations** | • 1 embedding call (`text-embedding-3-small`, ~30 tokens) + 1 streamed `/v1/responses` call (`gpt-6-luna` or `gpt-6.1-terra` with `prompt_cache_key` hitting cached document prefix). |

---

## 4. Journey C — Personalized Dashboard Discovery, Custom Charting & Source Verification

**Scenario:** A user opens `/app/dashboard`, reviews automatically discovered KPIs and charts from their uploaded financial/research documents, requests a custom comparative chart in natural language, inspects the underlying DuckDB SQL and PDF table sources, and saves the widget to their dashboard.

### 4.1 End-to-End Flowchart

```mermaid
flowchart TD
    Start(["User Opens /app/dashboard"]) --> Load["Fetch Workspace Dashboard & Available Schemas<br/>(GET /api/proxy/dashboard/overview)"]
    Load --> CheckCorpus{"Does Workspace Have<br/>Documents?"}
    CheckCorpus -->|"0 Docs"| Empty["Render Onboarding Dropzone State"]
    CheckCorpus -->|">= 1 Docs"| RenderAuto["Render Tier-1 Corpus Telemetry +<br/>Tier-2 Auto-Discovered Widgets"]

    RenderAuto --> UserPrompt["User Prompts: 'Chart R&D Spend vs Revenue across Q1–Q4 reports'"]
    UserPrompt --> InspectSchema["Backend Loads Workspace Tables & Metrics from PostgreSQL<br/>into Sandboxed Ephemeral DuckDB (enable_external_access=false)"]
    InspectSchema --> Plan["gpt-6.1-terra Generates DashboardGenerationPlan<br/>(data_sufficient, unit_check, sql_query, echarts_template)"]

    Plan --> CheckSuff{"Is Data Sufficient &<br/>Units Compatible?"}
    CheckSuff -->|"No (e.g. Missing Data or Mixed Currencies without FX)"| HonestCard["Render Honest Insufficient/Conflict Explanation Card<br/>with Citations to Available Data (PR-036, PR-038)"]
    CheckSuff -->|"Yes"| ExecSQL["Execute Validated SELECT Query in DuckDB (<10ms)"]
    ExecSQL --> Bind["Inject Deterministic DuckDB Rows into ECharts dataset.source"]
    Bind --> RenderWidget["Render Interactive Chart + KPI Summary + Source Badges"]
    RenderWidget --> Inspect["User Clicks 'Inspect Source Evidence' -> View SQL & Click PDF Page Citation"]
    RenderWidget --> Pin["User Clicks 'Pin to Dashboard' -> Persist in public.dashboard_widgets"]
```

### 4.2 Journey C Specification Matrix

| Aspect | Specification |
|---|---|
| **Alternative Flows** | • **Auto-SQL Self-Correction:** If `gpt-6.1-terra` generates a SQL query with a minor column alias syntax error in DuckDB, the backend catches the `duckdb.Error`, feeds the error + `DESCRIBE` schema back to `gpt-6.1-terra` once (max 1 retry), and executes the corrected SQL transparently. |
| **Error Conditions** | • **Currency / Unit Mismatch (`EC-031`):** Document A reports revenue in `USD ($)` and Document B reports revenue in `IDR (Rp)`. The validation gate blocks summing them into a single bar series and either plots them on separate grouped series labeled by currency or displays a unit-mismatch warning. |
| **Data Changes** | • Persists validated widget configuration (`title`, `widget_type`, `sql_query`, `echarts_config`, `source_doc_ids`, `source_chunk_ids`) in `public.dashboard_widgets`. |
| **Security Requirements** | • Ephemeral DuckDB connection executes `SET enable_external_access = false; SET lock_configuration = true;` before running any SQL, and only hydrates rows from `public.document_tables` / `public.extracted_metrics` where `workspace_id = user.workspace_id`. |

---

## 5. Journey D — Cross-Document Comparative Synthesis & Contradiction Analysis

**Scenario:** A user selects 4 documents in `/app/repository` (or `/app/explore`), clicks **"Compare & Synthesize"**, and asks DocuMind to identify common conclusions, methodological differences, and contradictory claims across the 4 PDFs.

### 5.1 Execution Flow
1. **Selection & Scope Validation:** User selects `doc_01`, `doc_02`, `doc_03`, `doc_04` and clicks `"Synthesize Selected"`. Frontend routes to `/app/explore?mode=synthesis&docs=doc_01,doc_02,doc_03,doc_04`.
2. **Multi-Document Context Assembly:**
   - Backend verifies all 4 `doc_id`s belong to `user.workspace_id` and have `status IN ('ready', 'partial_ready')`.
   - Fetches each document's pre-computed executive summary, metadata, and top topics from `public.documents` and `public.topics` (**never** just the filenames as in the broken `synthesis.py:43` prototype!).
   - Executes stratified hybrid retrieval (`match_document_chunks_hybrid`) to pull the top $K=4$ most relevant evidence chunks per document (16 chunks total, ~6,400 tokens).
3. **Deep Comparative Reasoning (`gpt-6.1-sol`):**
   - Calls `POST /v1/responses` with `model="gpt-6.1-sol"`, `reasoning={"effort": "medium"}`, `store=False`, and `text_format=CrossDocumentSynthesisResponse`.
4. **Deterministic Dual-Citation Verification:**
   - Every row in the comparison matrix and every **Contradiction Alert Card** contains `claim_a_chunk_id` and `claim_b_chunk_id`.
   - Backend resolves both chunk IDs to their exact `(doc_id, doc_title, page_number, bounding_boxes)` coordinates.
5. **Interactive Exploration:**
   - User sees the structured synthesis matrix and contradiction cards. Clicking `Claim A [Paper 1 • p.5]` and `Claim B [Paper 3 • p.11]` opens a side-by-side evidence drawer or opens the PDF Studio at the exact highlighted lines.

---

## 6. Journey E — Complete Document Lifecycle (Upload $\rightarrow$ Replace $\rightarrow$ Reprocess $\rightarrow$ Delete)

```mermaid
stateDiagram-v2
    [*] --> Uploading: User selects/drops PDF
    Uploading --> Validating: Multipart stream complete
    Validating --> Rejected: Invalid MIME / Encrypted / Corrupted
    Validating --> DuplicateDetected: SHA-256 matches existing doc in workspace
    DuplicateDetected --> Ready: User chooses "Use Existing"
    DuplicateDetected --> Queued: User chooses "Replace & Reprocess"
    Validating --> Queued: New unique SHA-256
    Queued --> ExtractingText: Worker claims job
    ExtractingText --> RunningOCR: Scanned pages detected (<20 words/page)
    ExtractingText --> Embedding: All pages digital
    RunningOCR --> Embedding: Vision OCR (gpt-6.1-terra) complete
    Embedding --> ExtractingInsights: pgvector + FTS indexed
    ExtractingInsights --> Ready: Summary, Topics, Tables & Relationships saved
    ExtractingInsights --> PartialReady: Non-critical stage warning (e.g. 1 page OCR failed)
    ExtractingText --> Failed: Unrecoverable parse error
    RunningOCR --> Failed: Max retries exhausted
    Failed --> Queued: User clicks "Retry Processing"
    PartialReady --> Queued: User clicks "Reprocess Failed Pages"
    Ready --> Queued: User uploads replacement version
    Ready --> Deleting: User clicks "Delete Document"
    Deleting --> [*]: Storage + Chunks + Tables + Relationships purged & Dashboard widgets refreshed
```

### Key Lifecycle Guarantees (`PR-018`, `PR-039`, `PR-046`)
- **Zero Orphaned Vectors or Files:** Deleting a document executes inside a database transaction (`ON DELETE CASCADE` on `document_pages`, `chunks`, `chunk_topics`, `document_tables`, `extracted_metrics`, `document_relationships`, `message_citations`) paired with Supabase Storage object removal.
- **Dashboard Consistency on Deletion:** Any `dashboard_widgets` row whose `source_doc_ids` array contained the deleted `doc_id` is either automatically re-evaluated against remaining documents (if a multi-document widget) or marked `status = 'stale_source_deleted'` with a 1-click remove/update prompt on `/app/dashboard`.
