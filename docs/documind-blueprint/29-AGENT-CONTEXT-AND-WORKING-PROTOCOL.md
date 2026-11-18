# 29 — Permanent Agent Context & Working Protocol

> **Document ID:** `DOC-29`  
> **Status:** **`DECIDED`** — Mandatory Operating Protocol for All Future AI Agents & Developers  
> **Related Documents:** [30-FINAL-SELECTED-ARCHITECTURE-AND-DECISIONS.md](file:///c:/Users/arief/Downloads/WAICY/docs/documind-blueprint/30-FINAL-SELECTED-ARCHITECTURE-AND-DECISIONS.md), [00-START-HERE.md](file:///c:/Users/arief/Downloads/WAICY/docs/documind-blueprint/00-START-HERE.md), [02-PRODUCT-REQUIREMENTS.md](file:///c:/Users/arief/Downloads/WAICY/docs/documind-blueprint/02-PRODUCT-REQUIREMENTS.md), [26-ARCHITECTURE-DECISIONS.md](file:///c:/Users/arief/Downloads/WAICY/docs/documind-blueprint/26-ARCHITECTURE-DECISIONS.md), [27-IMPLEMENTATION-ROADMAP.md](file:///c:/Users/arief/Downloads/WAICY/docs/documind-blueprint/27-IMPLEMENTATION-ROADMAP.md), [28-OPEN-QUESTIONS-AND-DECISIONS.md](file:///c:/Users/arief/Downloads/WAICY/docs/documind-blueprint/28-OPEN-QUESTIONS-AND-DECISIONS.md)

---

## 1. Purpose of This Document

This document is the **permanent operating manual and guardrail protocol** for any AI coding agent or software engineer working on **DocuMind** in future sessions.

Because future AI sessions will not have access to the original discovery conversation, **this protocol prevents context loss, architectural drift, security regressions, and hallucinated assumptions**.

---

## 2. Mandatory Pre-Flight Reading Order for Any New Session

Whenever a new AI agent session starts on this repository, **DO NOT immediately edit code or guess how the project works**. Execute this exact 4-step orientation sequence first:

1. **Step 1 — Read [30-FINAL-SELECTED-ARCHITECTURE-AND-DECISIONS.md](file:///c:/Users/arief/Downloads/WAICY/docs/documind-blueprint/30-FINAL-SELECTED-ARCHITECTURE-AND-DECISIONS.md) and [00-START-HERE.md](file:///c:/Users/arief/Downloads/WAICY/docs/documind-blueprint/00-START-HERE.md):**
   - Understand the finalized `DECIDED` target architecture, the Three Fundamental Product Pillars (**Pillar A: Document Repository**, **Pillar B: Personalized Dashboard**, **Pillar C: Document Intelligence**), the `AIGateway` provider-flexible abstraction, the Quality-Optimized OpenAI model routing table, and the Railway 4-service + Supabase Pro infrastructure topology.
2. **Step 2 — Check [27-IMPLEMENTATION-ROADMAP.md](file:///c:/Users/arief/Downloads/WAICY/docs/documind-blueprint/27-IMPLEMENTATION-ROADMAP.md) & Inspect Actual Code:**
   - Identify which Roadmap Stage (`Stage 1` through `Stage 6`) is currently being implemented or requested by the user, and verify what has already been built in `apps/api/`, `apps/web/`, and `supabase/migrations/`.
3. **Step 3 — Read the Specific Domain Specifications Before Modifying Any Component:**
   - *Working on Auth or Multi-Tenancy?* Read `07-AUTHENTICATION-AND-IDENTITY.md`, `08-MULTI-TENANCY-AND-DATA-ISOLATION.md`, and `22-SECURITY-AND-PRIVACY.md`.
   - *Working on Upload, Repository, or PDF Ingestion?* Read `09-DOCUMENT-REPOSITORY.md`, `10-DOCUMENT-INGESTION-PIPELINE.md`, and `24-FAILURE-RECOVERY-AND-RESILIENCE.md`.
   - *Working on Search, PDF Viewer, or AI Assistant?* Read `11-PDF-VIEWER-AND-CITATIONS.md`, `12-SEARCH-AND-RETRIEVAL.md`, and `13-AI-ASSISTANT.md`.
   - *Working on Personalized Dashboard or DuckDB Analytics?* Read `14-PERSONALIZED-DASHBOARD.md` and `15-DASHBOARD-GENERATION-ENGINE.md`.
   - *Working on Relationships or Cross-Document Synthesis?* Read `16-DOCUMENT-RELATIONSHIPS.md` and `17-INSIGHT-AND-CROSS-DOCUMENT-ANALYSIS.md`.
   - *Working on `AIGateway`, OpenAI Adapter, or Model Routing?* Read `18-OPENAI-AND-MODEL-STRATEGY.md`, `19-API-COST-AND-PERFORMANCE.md`, and `30-FINAL-SELECTED-ARCHITECTURE-AND-DECISIONS.md`.
   - *Working on Database Tables or API Payloads?* Read `20-DATA-MODEL-AND-ERD.md` and `21-API-AND-SYSTEM-CONTRACTS.md`.
4. **Step 4 — Check [26-ARCHITECTURE-DECISIONS.md](file:///c:/Users/arief/Downloads/WAICY/docs/documind-blueprint/26-ARCHITECTURE-DECISIONS.md) (`ADR-001`–`ADR-022`) and [28-OPEN-QUESTIONS-AND-DECISIONS.md](file:///c:/Users/arief/Downloads/WAICY/docs/documind-blueprint/28-OPEN-QUESTIONS-AND-DECISIONS.md).**

---

## 3. Ten Non-Negotiable Architectural & Security Invariants

A future agent **MUST NEVER VIOLATE** any of the following 10 rules under any circumstances:

### Invariant 1 — Never Trust Legacy `docs/ARCHITECTURE.md` Over Actual Code & `docs/documind-blueprint/`
- `docs/ARCHITECTURE.md` is `[DEPRECATED]` and describes files (`pdf_parser.py`, `rag_service.py`, `dashboard_agent.py`, LightRAG) that do not exist. Always verify actual files on disk and follow `docs/documind-blueprint/`.

### Invariant 2 — Enforce Dual-Layer Tenant Isolation (`ADR-003`, `PR-007`–`PR-010`)
- Remember that `SUPABASE_SERVICE_ROLE_KEY` has `BYPASSRLS` in PostgreSQL!
- Never rely on PostgreSQL RLS policies alone when querying with a service-role client. Every backend query, storage operation, vector search RPC (`match_document_chunks_hybrid`), and DuckDB hydration **must** require a verified `WorkspaceContext` (`Depends(get_verified_workspace_context)`) and explicitly filter by `.eq("workspace_id", ctx.workspace_id)`.

### Invariant 3 — Never Let an LLM Invent PDF Bounding-Box Coordinates (`ADR-009`, `PR-028`)
- LLMs must **never** output `x0, y0, x1, y1` float coordinates in any JSON schema (including Chat, Synthesis, Dashboard, or Quiz).
- LLMs may only output `chunk_id` (`[cite:CHUNK_ID]` or `source_chunk_id`), which the Python backend deterministically resolves against the retrieved `DocumentChunk` map to attach true PyMuPDF `page_number` and `bounding_boxes`.

### Invariant 4 — Never Let an LLM Invent Dashboard Chart Numbers (`ADR-011`, `ADR-012`, `PR-035`, `PR-036`)
- All numbers plotted on `/app/dashboard` or in KPI cards must come from deterministic **PostgreSQL** or **DuckDB** SQL queries.
- Never generate arbitrary charts when a user's document collection lacks structured data—render the appropriate Corpus Profile (`Profile 3: Qualitative Corpus`) or an honest `insufficient_data_card` (`PR-034`, `PR-038`).
- Always enforce the **Unit & Currency Homogeneity Gate (`Gate 4`)** so incompatible currencies/units (`USD` vs. `IDR`, `%` vs. counts) are never summed together.

### Invariant 5 — Always Lock Down DuckDB Before Running Any Query (`ADR-011`, `PR-040`)
- Never use a shared global `:memory:` DuckDB instance across tenants, and never run a query without first executing:
  ```sql
  SET enable_external_access = false;
  SET lock_configuration = true;
  ```
  plus Gate 1 AST/regex `SELECT`/`WITH`-only validation.

### Invariant 6 — Route All AI Calls Through `AIGateway` Using Verified OpenAI APIs (`POST /v1/responses` & `store: false`) (`ADR-007`, `ADR-008`, `ADR-016`, `ADR-017`, `PR-044`)
- Never import or call `openai` or `google-genai` directly inside FastAPI routers or domain services. Always call `AIGateway` (`apps/api/app/ai/gateway.py`) with a semantic `AITaskType`.
- Never use the shut-down Assistants API (`/v1/assistants`), shut-down `o1`/`o3-mini`/`o4-mini`, or retiring `gpt-5`/`gpt-4o` models.
- Inside `OpenAIProviderAdapter`, use `AsyncOpenAI` with `POST /v1/responses` (`gpt-6.1-terra` for Vision OCR, Stage 11 Understanding, and Standard Grounded Q&A; `gpt-6.1-sol` for Dashboard SQL Planning and Cross-Doc Synthesis; `gpt-6-luna` for fast query rewriting and compaction) and `POST /v1/embeddings` (`text-embedding-3-large`, `dimensions=1536`).
- Always pass `store=False` on `/v1/responses` calls so user documents and completions are never retained in OpenAI dashboard logs.

### Invariant 7 — Wrap All Extracted Document Text in `<untrusted_document_chunk>` Delimiters (`PR-045`)
- Treat all text extracted from uploaded PDFs/spreadsheets as untrusted external input. Place system instructions in the `instructions` (`developer`) field and wrap chunk text in `<untrusted_document_chunk>` XML tags.

### Invariant 8 — Abstain Honestly When Evidence Is Absent (`PR-029`)
- If `match_document_chunks_hybrid` returns zero chunks above the relevance threshold or the retrieved passages do not contain the answer, the AI Assistant must explicitly state that the information is not present in the selected documents—never fabricate answers or citations.

### Invariant 9 — Never Expose Secrets or Commit `.env` Files
- Never print, log, or return values from `apps/api/.env` or `apps/web/.env.local`. Ensure the root `.gitignore` is in place before any `git add` or `git commit`.

### Invariant 10 — Keep Documentation Synchronized with Implementation (`PR-048`)
- Whenever a stage or requirement in `02-PRODUCT-REQUIREMENTS.md` (`PR-001`–`PR-048`) is implemented:
  1. Update its status in `02-PRODUCT-REQUIREMENTS.md` and `27-IMPLEMENTATION-ROADMAP.md` from `[PROPOSED]` to `[VERIFIED] Implemented`.
  2. If a stakeholder resolves an open question in `28-OPEN-QUESTIONS-AND-DECISIONS.md` (`OQ-001`–`OQ-015`), update its label from `[NEEDS DECISION]` to `[VERIFIED] Approved` and record the corresponding update in `26-ARCHITECTURE-DECISIONS.md`.
  3. Never implement a feature that contradicts an approved `PR-*` or `ADR-*` without first documenting the technical conflict and obtaining approval.
