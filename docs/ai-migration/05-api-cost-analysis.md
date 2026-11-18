# Phase 6: OpenAI API Cost Modeling & Optimization Strategy

> **Verified Pricing Baseline:** November 14, 2026 (Official OpenAI Developer API Standard, Cached, Flex, and Batch Pricing)  
> **Scope:** Task-level model routing, token & caching economics, and 3-scenario monthly cost modeling for DocuMind.

---

## 1. Executive Summary

One of the primary risks of migrating a document intelligence platform to frontier LLMs is **unbounded token expenditure**: naively sending full PDF texts through a flagship reasoning model (`gpt-6-astra` at \$10.00/1M input and \$50.00/1M output) or invoking OpenAI's hosted `file_search` tool (\$2.50 per 1,000 tool calls + \$0.10/GB/day storage) on every chat message would make unit economics unsustainable for students and educational institutions.

By implementing a **Four-Tier Model Routing Strategy** (`text-embedding-3-small`, `gpt-6-luna`, `gpt-6.1-terra`, and `gpt-6.1-sol`) combined with **Compute-Once Ingestion**, **Local Hybrid Retrieval (`pgvector` + PostgreSQL FTS)**, **Prompt Caching (90%–95% input discount)**, and **Flex/Batch Processing (50% discount)**, DocuMind reduces monthly OpenAI API expenditure by **91% to 95%** compared to a naive flagship + hosted Vector Store architecture—bringing total AI infrastructure cost down to **~\$0.04–\$0.11 per active user per month**.

---

## 2. Task-Level Model Routing Strategy (Phase 6.1)

DocuMind must **never** use a single model for every operation. The `OpenAIRouterService` (`apps/api/app/services/openai_service.py`) dynamically selects the model, reasoning effort, and service tier (`auto`, `flex`, or `batch`) based on task complexity:

| Task / Pipeline Stage | Recommended OpenAI Model | API Endpoint & Service Tier | Reasoning Effort | Input / Cached / Output Price (per 1M tokens, $\le 272\text{K}$) | Technical & Economic Justification |
|---|---|---|---|---|---|
| **1. Vector Embedding Generation** | `text-embedding-3-small` (`1536` dims) | `POST /v1/embeddings` (`auto` interactive / `batch` archive) | N/A | **\$0.02** standard / **\$0.01** Batch | 6.5x cheaper than `text-embedding-3-large` (\$0.13/1M); native `vector(1536)` match for `supabase/migrations/20261113000001_initial_schema.sql`. |
| **2. Single-Pass Ingestion Metadata, Classification, Summary & Topic Graph Extraction** | `gpt-6-luna` (`gpt-6-luna-2026-09-09`) | `POST /v1/responses` (`flex` background or `auto`) | `none` or `low` | **\$0.10** in / **\$0.01** cached / **\$0.50** out (**\$0.05** in / **\$0.25** out on `flex`) | High-throughput, ultra-low-cost model (\$0.10/1M). Extracting `DocumentMetadataExtraction` (title, domain, entities, topics, summary, candidate numeric metrics) for a 7,500-token PDF costs **\$0.0011** standard or **\$0.00055** on `flex`. |
| **3. Standard Single-Document RAG Q&A** | `gpt-6-luna` (`gpt-6-luna-2026-09-09`) | `POST /v1/responses` (`auto`, SSE streaming) | `low` | **\$0.10** in / **\$0.01** cached / **\$0.50** out | When top-8 hybrid chunks (~3,200 tokens) are already retrieved by `pgvector` + FTS, grounded synthesis with `[cite:CHUNK_ID]` markers is straightforward. `gpt-6-luna` delivers sub-second TTFT at **\$0.00057 per query**. |
| **4. Complex / Academic Multi-Hop Single-Doc Q&A** | `gpt-6.1-terra` (`gpt-6.1-terra-2026-10-02`) | `POST /v1/responses` (`auto`, SSE streaming) | `medium` | **\$1.00** in / **\$0.05** cached (95% off) / **\$5.00** out | Triggered when query classifier detects multi-step mathematical, legal, or scientific reasoning, or when retrieved chunks contain complex tables/charts. |
| **5. Scanned PDF Page OCR & Visual Chart/Diagram Extraction** | `gpt-6.1-terra` (`gpt-6.1-terra-2026-10-02`) | `POST /v1/responses` (`auto` or `flex`) | `low` | **\$1.00** in / **\$0.05** cached / **\$5.00** out | OpenAI's dedicated multimodal/vision & OCR specialist. Invoked **only** on pages where PyMuPDF detects `word_count < 20` or embedded raster charts (`detail: "high"`). |
| **6. Adaptive Quiz Generation (`QuizResponse`)** | `gpt-6.1-terra` (`gpt-6.1-terra-2026-10-02`) | `POST /v1/responses` (`auto`) | `low` | **\$1.00** in / **\$0.05** cached / **\$5.00** out | Generates pedagogically sound multiple-choice distractors, explanations, and `source_chunk_id` references via Structured Outputs (`text.format`). |
| **7. Podcast / Audio Briefing Script (`PodcastScript`)** | `gpt-6-luna` (`gpt-6-luna-2026-09-09`) | `POST /v1/responses` (`auto` or `flex`) | `none` | **\$0.10** in / **\$0.01** cached / **\$0.50** out | Conversational dialogue generation from pre-computed document summaries and key insights does not require expensive reasoning tokens. |
| **8. DuckDB SQL Generation & ECharts Planning (`DashboardGenerationPlan`)** | `gpt-6.1-terra` (`gpt-6.1-terra-2026-10-02`) | `POST /v1/responses` (`auto`) | `medium` | **\$1.00** in / **\$0.05** cached / **\$5.00** out | Translating DuckDB table schemas (`DESCRIBE`) into valid analytical SQL and ECharts configurations requires strong structured code generation at 1/10th the cost of `gpt-6-astra`. |
| **9. Cross-Document Synthesis & Contradiction Matrix (`SynthesisResponse`)** | `gpt-6.1-sol` (`gpt-6.1-sol-2026-10-08`) | `POST /v1/responses` (`auto` or `flex`) | `medium` or `high` | **\$2.00** in / **\$0.10** cached (95% off) / **\$10.00** out (**\$1.00** / **\$5.00** on `flex`) | Cross-document synthesis across 2–10 documents requires deep comparative reasoning to uncover subtle methodological or factual contradictions without hallucinating. |
| **10. Bulk Archive Backfill & Institutional Onboarding** | `gpt-6-luna` + `text-embedding-3-small` | `POST /v1/batches` (`24h` completion window) | `none` | **\$0.05** in / **\$0.25** out (`luna` Batch); **\$0.01** in (`embed-3-small` Batch) | Asynchronous 50% Batch discount with separate quota pools, ideal for universities or companies importing thousands of legacy PDFs overnight. |
| **11. Deep Frontier Audit (Optional Premium Escalation Only)** | `gpt-6-astra` (`gpt-6-astra-2026-09-03`) | `POST /v1/responses` (`auto` or `flex`) | `high` | **\$10.00** in / **\$1.00** cached / **\$50.00** out | **Not used in default workflows.** Reserved strictly as an opt-in enterprise tier for complex legal contract redlining or multi-paper systematic review verification. |

---

## 3. Seven Concrete Cost Reduction Techniques (Phase 6.2)

### 3.1 Compute-Once Ingestion & SHA-256 Deduplication
- **Problem in Naive Architectures:** Re-extracting summaries, topics, or entities on the fly every time a user opens a document or requests a synthesis matrix.
- **DocuMind Solution:**
  1. Compute `file_sha256` on upload in [documents.py](file:///c:/Users/arief/Downloads/WAICY/apps/api/app/routers/documents.py). If `(workspace_id, file_sha256)` already exists in `public.documents` with `status = 'ready'`, return the cached document immediately (**\$0.00 API cost**).
  2. Run a **single** `gpt-6-luna` Structured Output call at ingestion time that simultaneously extracts:
     - Executive summary (`documents.summary`)
     - Document category & domain classification (`documents.metadata`)
     - Topic entities (`public.topics` and `public.chunk_topics`)
     - Extracted KPI metrics (`doc_<id>_metrics` table in DuckDB)
  3. Subsequent UI views, relationship graph renders, and dashboard opens read directly from PostgreSQL (`public.documents`, `public.topics`, `public.dashboard_widgets`) at **zero LLM cost**.

### 3.2 Prompt Caching Optimization (90% to 95% Input Discount)
OpenAI's GPT-6 family provides massive discounts on cached input tokens:
- **`gpt-6-luna`:** \$0.10/1M $\rightarrow$ **\$0.01/1M** (90% discount; free `in_memory` cache)
- **`gpt-6.1-terra`:** \$1.00/1M $\rightarrow$ **\$0.05/1M** (95% discount; free `in_memory` cache)
- **`gpt-6.1-sol`:** \$2.00/1M $\rightarrow$ **\$0.10/1M** (95% discount; free `in_memory` cache)

To maximize automatic prefix cache hits ($\ge 1,024$ tokens, billed in 128-token increments):
1. **Strict Static-Prefix Ordering:** Every `POST /v1/responses` request places content in this exact deterministic order:
   - `[1] Static System Instructions & JSON Schema Definition`
   - `[2] Document Executive Summary & Stable Top-Level Metadata`
   - `[3] Retrieved Coordinate-Preserving Context Chunks (sorted deterministically by chunk_index)`
   - `[4] Multi-turn Conversation Summary / History`
   - `[5] Dynamic User Question (always at the very end)`
2. **Deterministic `prompt_cache_key` Routing:** Pass `prompt_cache_key=f"documind:ws:{workspace_id}:doc:{doc_id}"` on every single-document request (or `f"documind:ws:{workspace_id}:synth:{sorted_doc_ids_hash}"` on multi-document requests). OpenAI uses `prompt_cache_key` to route requests from the same study session to the same physical inference host, raising `in_memory` cache hit rates from ~30% to **75%–85%** during active Q&A/quiz sessions.
3. **`in_memory` (Free) vs. Extended `30m`/`12h` (Paid Write) Policy:**
   - Because extended cache writes (`30m` at 1.25x input price; `12h` at 2.5x input price) carry an upfront write surcharge, they only break even when the exact same static prefix is queried **$\ge 2$ times** (`30m`) or **$\ge 3$ times** (`12h`).
   - **Rule:** Default all standard requests to `prompt_cache_retention="in_memory"` (**\$0.00 write surcharge**, 5–10 min sliding TTL, up to 1 hour). Only enable `prompt_cache_retention="30m"` when a document's static context exceeds 15,000 tokens and the user enters an interactive multi-turn "Deep Study Session".

### 3.3 Avoiding OpenAI Hosted `file_search` Surcharges (1,250x Retrieval Savings)
- OpenAI's hosted `file_search` tool charges **\$2.50 per 1,000 tool calls** (\$0.0025 per query) **plus** \$0.10/GB/day vector storage above 1 GB, in addition to the input tokens injected into the model context.
- By executing retrieval via `text-embedding-3-small` (~50 tokens per user query = **\$0.000001**) and querying DocuMind's existing Supabase `pgvector` HNSW + GIN FTS index (`match_document_chunks_hybrid`), retrieval costs **1,250x less per query** while preserving PDF bounding boxes.

### 3.4 Selective Vision OCR Gate (`word_count < 20`)
- Passing every PDF page as a high-resolution image (`detail: "high"`, ~1,100 image tokens/page) to a vision model multiplies ingestion token volume by 2x–3x.
- Instead, [pdf_service.py](file:///c:/Users/arief/Downloads/WAICY/apps/api/app/services/pdf_service.py) extracts native digital text and bounding boxes via PyMuPDF (`fitz`) at **\$0.00 API cost** for ~90% of pages, and only invokes `gpt-6.1-terra` Vision OCR on pages where `len(words) < 20` (scanned pages) or where large embedded figures/charts are detected.

### 3.5 Flex Processing (`service_tier="flex"`) & Batch API (`/v1/batches`)
- **Flex Processing (`service_tier="flex"`):** Newly available across the GPT-6 family in 2026, `flex` processes synchronous `/v1/responses` calls at **50% off standard input and output token prices** in exchange for slightly higher latency (seconds instead of sub-second) and occasional `429 Resource Unavailable` retries.
  - **Where DocuMind uses `flex`:** Background post-upload metadata/summary extraction (`gpt-6-luna` at \$0.05/1M in, \$0.25/1M out), background scanned-page OCR (`gpt-6.1-terra` at \$0.50/1M in, \$2.50/1M out), and non-streaming podcast script generation.
- **Batch API (`/v1/batches`):** Used when a user or organization uploads a bulk folder/ZIP archive ($\ge 10$ documents) for asynchronous indexing, cutting both `text-embedding-3-small` (\$0.01/1M) and `gpt-6-luna` (\$0.05/1M in, \$0.25/1M out) costs by **50%**.

### 3.6 Strict Retrieval Top-$K$ & Output Token Budgets
- Cap RAG context injection to **Top-8 chunks** (~3,200 tokens max) for single-document Q&A and **Top-12 chunks** (~4,800 tokens max) + pre-computed document summaries for cross-document synthesis, rather than stuffing entire 50-page PDFs into every prompt.
- Set explicit `max_output_tokens` caps on every endpoint:
  - Standard Chat Q&A: `max_output_tokens=800`
  - Quiz Generation: `max_output_tokens=1,200`
  - Dashboard SQL & ECharts Plan: `max_output_tokens=1,000`
  - Cross-Document Synthesis: `max_output_tokens=2,000`

### 3.7 Pre-Aggregated DuckDB Execution (Zero-LLM Data Processing)
- When a user uploads a 50,000-row CSV/Excel file or a PDF with financial tables, the raw rows are **never** sent to OpenAI during analytics queries.
- `gpt-6.1-terra` only sees the compact DuckDB schema summary (~400 tokens) and generates a SQL query (~250 output tokens). DuckDB executes the aggregation locally in $<10\text{ ms}$, costing **~\$0.002 per dashboard widget**.

---

## 4. Unit Cost Breakdown per Core Operation

Before modeling monthly deployment scenarios, here is the exact token and dollar math for each individual user action in DocuMind under the proposed architecture:

### A. Ingesting 1 Document (Average 15-page PDF = 7,500 text tokens; 10% scanned pages = 1.5 pages)
1. **Embeddings (`text-embedding-3-small`):**
   - 7,500 tokens $\times$ (\$0.02 / 1,000,000) = **\$0.000150**
2. **Single-Pass Metadata, Summary, Topic & KPI Extraction (`gpt-6-luna` on `flex` tier):**
   - Input: 7,500 tokens $\times$ (\$0.05 / 1,000,000) = \$0.000375
   - Output: 800 structured tokens $\times$ (\$0.25 / 1,000,000) = \$0.000200
   - Subtotal = **\$0.000575**
3. **Selective Vision OCR on 10% Scanned Pages (`gpt-6.1-terra` on `flex` tier):**
   - 1.5 pages $\times$ 1,200 image+prompt tokens = 1,800 input tokens $\times$ (\$0.50 / 1,000,000) = \$0.000900
   - 1.5 pages $\times$ 500 extracted output tokens = 750 output tokens $\times$ (\$2.50 / 1,000,000) = \$0.001875
   - Subtotal = **\$0.002775**
- **Total Ingestion Cost per 15-Page Document:** **\$0.00350** (0.35 cents per document; or **\$0.00073** for a purely digital PDF!).

### B. 1 Interactive Document Q&A Query (85% `gpt-6-luna`, 15% `gpt-6.1-terra`; 60% Prompt Cache Hit Rate)
- **Average Input per Query:** 4,000 tokens (500 system/schema + 3,000 retrieved chunks/summary + 500 history/query). With 60% cached input: 1,600 uncached input tokens + 2,400 cached input tokens.
- **Average Output per Query:** 400 tokens.
- **Query Embedding (`text-embedding-3-small`):** 50 tokens = **\$0.000001**
- **Standard Q&A (`gpt-6-luna`, 85% of queries):**
  - Input: $(1,600 \times \$0.10 + 2,400 \times \$0.01) / 10^6 = \$0.000184$
  - Output: $400 \times \$0.50 / 10^6 = \$0.000200$
  - Cost per `luna` query = **\$0.000385**
- **Complex/Academic Q&A (`gpt-6.1-terra`, 15% of queries):**
  - Input: $(1,600 \times \$1.00 + 2,400 \times \$0.05) / 10^6 = \$0.001720$
  - Output: $500 \times \$5.00 / 10^6 = \$0.002500$
  - Cost per `terra` query = **\$0.004220**
- **Blended Average Cost per Q&A Turn:** $(0.85 \times \$0.000385) + (0.15 \times \$0.004220) + \$0.000001 =$ **\$0.000961** (< 0.1 cents per question).

### C. 1 Adaptive Quiz or Audio Briefing Script Generation
- **Quiz Generation (`gpt-6.1-terra`, 4,500 input tokens [50% cached], 900 output tokens):**
  - Input: $(2,250 \times \$1.00 + 2,250 \times \$0.05) / 10^6 = \$0.002363$
  - Output: $900 \times \$5.00 / 10^6 = \$0.004500$
  - Cost per Quiz = **\$0.00686** (0.69 cents).
- **Audio Briefing Script (`gpt-6-luna`, 3,000 input tokens, 800 output tokens):**
  - Input: $3,000 \times \$0.10 / 10^6 = \$0.000300$
  - Output: $800 \times \$0.50 / 10^6 = \$0.000400$
  - Cost per Script = **\$0.00070** (0.07 cents). *(If optional server-side audio synthesis via `gpt-realtime-2.1-mini` is used for a 2-minute briefing [~3,000 audio output tokens at \$20/1M], add **\$0.060** per rendered audio file; browser Web Speech API synthesis remains **\$0.00**).*

### D. 1 Automated Dashboard Generation (`gpt-6.1-terra` + Local DuckDB)
- **Input:** 1,200 tokens (system prompt + `duckdb_engine.get_table_schema_summary()` + sample rows + user query).
- **Output:** 600 tokens (`DashboardGenerationPlan`: validated SQL + ECharts config + insight narrative).
- **Cost per Dashboard Generation:** $(1,200 \times \$1.00 + 600 \times \$5.00) / 10^6 =$ **\$0.00420** (0.42 cents).

### E. 1 Cross-Document Synthesis & Contradiction Analysis (`gpt-6.1-sol`)
- **Input:** Comparing 4 documents = 8,000 tokens (pre-computed document summaries + top-12 cross-document chunks; 40% cached).
  - Uncached: $4,800 \times \$2.00 / 10^6 = \$0.00960$
  - Cached: $3,200 \times \$0.10 / 10^6 = \$0.00032$
- **Output:** 1,200 tokens (`SynthesisResponse` JSON + reasoning tokens) $\times \$10.00 / 10^6 = \$0.01200$
- **Cost per Multi-Document Synthesis:** **\$0.02192** (2.19 cents).

---

## 5. Three-Scenario Monthly Cost Model (Phase 6.3)

### 5.1 Shared Baseline Assumptions
- **Average Document Size:** 15 pages $\times$ 500 tokens/page = **7,500 tokens/document**.
- **Scanned / Image-Heavy Page Ratio:** **10%** of uploaded pages require `gpt-6.1-terra` Vision OCR (`detail: "high"`).
- **SHA-256 Deduplication Hit Rate:** **10%** of uploaded documents are duplicates across shared study groups/workspaces (costing \$0.00).
- **Q&A Routing Split:** **85%** handled by `gpt-6-luna`, **15%** escalated to `gpt-6.1-terra`.
- **Prompt Cache Hit Rate:** **60%** on Q&A context tokens; **50%** on Quiz context tokens; **40%** on Synthesis context tokens.

| Workload Parameter | Scenario 1: Small Deployment (Student Group / Pilot Lab) | Scenario 2: Medium Deployment (College Dept / Mid-Size Co.) | Scenario 3: High-Usage Deployment (University / Enterprise Archive) |
|---|---:|---:|---:|
| **Active Monthly Users (MAU)** | **100** | **1,000** | **10,000** |
| **Documents Uploaded / Month** | **500** (450 net unique) | **5,000** (4,500 net unique) | **50,000** (45,000 net unique) |
| **Total Pages Processed / Month** | 7,500 pages (675 scanned) | 75,000 pages (6,750 scanned) | 750,000 pages (67,500 scanned) |
| **Net Document Text Tokens Ingested** | 3.375M tokens | 33.75M tokens | 337.5M tokens |
| **RAG Q&A Queries / Month** | **3,000** (30/user) | **40,000** (40/user) | **500,000** (50/user) |
| **Quizzes + Briefing Scripts / Month** | **400** (200 quiz + 200 script) | **5,000** (2,500 quiz + 2,500 script) | **60,000** (30K quiz + 30K script) |
| **Dashboard Generations / Month** | **300** (3/user) | **4,000** (4/user) | **50,000** (5/user) |
| **Cross-Document Syntheses / Month** | **150** (1.5/user) | **2,000** (2/user) | **25,000** (2.5/user) |

---

### 5.2 Scenario 1: Small Deployment (100 Active Users, 500 Docs/Mo)

| Cost Component | Model & Tier | Monthly Token / Unit Volume | Monthly Cost (USD) |
|---|---|---|---:|
| **1. Document & Query Embeddings** | `text-embedding-3-small` | 3.38M doc tokens + 0.15M query tokens = **3.53M tokens** | **\$0.07** |
| **2. Ingestion Metadata, Summary & Topics** | `gpt-6-luna` (`flex`) | 3.38M input tokens (\$0.05/1M) + 0.36M output tokens (\$0.25/1M) | **\$0.26** |
| **3. Selective Vision OCR (10% pages)** | `gpt-6.1-terra` (`flex`) | 675 scanned pages: 0.81M input (\$0.50/1M) + 0.34M output (\$2.50/1M) | **\$1.26** |
| **4. Standard Q&A (85% = 2,550 queries)** | `gpt-6-luna` (`auto`) | 4.08M uncached in (\$0.10/1M) + 6.12M cached in (\$0.01/1M) + 1.02M out (\$0.50/1M) | **\$0.98** |
| **5. Complex Q&A (15% = 450 queries)** | `gpt-6.1-terra` (`auto`) | 0.72M uncached in (\$1.00/1M) + 1.08M cached in (\$0.05/1M) + 0.225M out (\$5.00/1M) | **\$1.90** |
| **6. Adaptive Quizzes (200) & Scripts (200)** | `gpt-6.1-terra` & `gpt-6-luna` | Quiz: 0.45M uncached / 0.45M cached in / 0.18M out (\$1.37) + Script (\$0.14) | **\$1.51** |
| **7. DuckDB Dashboard Generation (300)** | `gpt-6.1-terra` (`auto`) | 0.36M input (\$1.00/1M) + 0.18M output (\$5.00/1M) | **\$1.26** |
| **8. Cross-Document Synthesis (150)** | `gpt-6.1-sol` (`auto`) | 0.72M uncached in (\$2.00/1M) + 0.48M cached in (\$0.10/1M) + 0.18M out (\$10.00/1M) | **\$3.29** |
| **Total Monthly OpenAI API Cost (Proposed)** | **Multi-Model Routed** | **~20.5M total tokens across all tiers** | **\$10.53 / month** |
| *Cost per Active User / Month* | | | ***\$0.105 / user*** |
| *Comparison: Naive All-`gpt-6-astra` + Hosted `file_search`* | `gpt-6-astra` + Vector Store | 20.5M tokens at \$10/\$50 + 3,150 `file_search` calls (\$7.88) | *\$246.40 / month (95.7% more expensive)* |

---

### 5.3 Scenario 2: Medium Deployment (1,000 Active Users, 5,000 Docs/Mo)

| Cost Component | Model & Tier | Monthly Token / Unit Volume | Monthly Cost (USD) |
|---|---|---|---:|
| **1. Document & Query Embeddings** | `text-embedding-3-small` | 33.75M doc tokens + 2.0M query tokens = **35.75M tokens** | **\$0.72** |
| **2. Ingestion Metadata, Summary & Topics** | `gpt-6-luna` (`flex`) | 33.75M input tokens (\$0.05/1M) + 3.60M output tokens (\$0.25/1M) | **\$2.59** |
| **3. Selective Vision OCR (10% pages)** | `gpt-6.1-terra` (`flex`) | 6,750 scanned pages: 8.10M input (\$0.50/1M) + 3.38M output (\$2.50/1M) | **\$12.50** |
| **4. Standard Q&A (85% = 34,000 queries)** | `gpt-6-luna` (`auto`) | 54.4M uncached in (\$0.10/1M) + 81.6M cached in (\$0.01/1M) + 13.6M out (\$0.50/1M) | **\$13.06** |
| **5. Complex Q&A (15% = 6,000 queries)** | `gpt-6.1-terra` (`auto`) | 9.6M uncached in (\$1.00/1M) + 14.4M cached in (\$0.05/1M) + 3.0M out (\$5.00/1M) | **\$25.32** |
| **6. Adaptive Quizzes (2.5K) & Scripts (2.5K)** | `gpt-6.1-terra` & `gpt-6-luna` | Quiz: 5.63M uncached / 5.63M cached in / 2.25M out (\$17.16) + Script (\$1.75) | **\$18.91** |
| **7. DuckDB Dashboard Generation (4,000)** | `gpt-6.1-terra` (`auto`) | 4.80M input (\$1.00/1M) + 2.40M output (\$5.00/1M) | **\$16.80** |
| **8. Cross-Document Synthesis (2,000)** | `gpt-6.1-sol` (`auto`) | 9.60M uncached in (\$2.00/1M) + 6.40M cached in (\$0.10/1M) + 2.40M out (\$10.00/1M) | **\$43.84** |
| **Total Monthly OpenAI API Cost (Proposed)** | **Multi-Model Routed** | **~255M total tokens across all tiers** | **\$133.74 / month** |
| *Cost per Active User / Month* | | | ***\$0.134 / user*** |
| *Comparison: Naive All-`gpt-6-astra` + Hosted `file_search`* | `gpt-6-astra` + Vector Store | 255M tokens at \$10/\$50 + 42,000 `file_search` calls (\$105) + storage | *\$3,185.00 / month (95.8% more expensive)* |

---

### 5.4 Scenario 3: High-Usage Deployment (10,000 Active Users, 50,000 Docs/Mo)

| Cost Component | Model & Tier | Monthly Token / Unit Volume | Monthly Cost (USD) |
|---|---|---|---:|
| **1. Document & Query Embeddings** | `text-embedding-3-small` (`batch` + `auto`) | 337.5M doc tokens (50% Batch) + 25M query tokens = **362.5M tokens** | **\$5.56** |
| **2. Ingestion Metadata, Summary & Topics** | `gpt-6-luna` (`flex` / `batch`) | 337.5M input tokens (\$0.05/1M) + 36.0M output tokens (\$0.25/1M) | **\$25.88** |
| **3. Selective Vision OCR (10% pages)** | `gpt-6.1-terra` (`flex` / `batch`) | 67,500 scanned pages: 81.0M input (\$0.50/1M) + 33.75M output (\$2.50/1M) | **\$124.88** |
| **4. Standard Q&A (85% = 425,000 queries)** | `gpt-6-luna` (`auto`) | 680M uncached in (\$0.10/1M) + 1,020M cached in (\$0.01/1M) + 170M out (\$0.50/1M) | **\$163.20** |
| **5. Complex Q&A (15% = 75,000 queries)** | `gpt-6.1-terra` (`auto`) | 120M uncached in (\$1.00/1M) + 180M cached in (\$0.05/1M) + 37.5M out (\$5.00/1M) | **\$316.50** |
| **6. Adaptive Quizzes (30K) & Scripts (30K)** | `gpt-6.1-terra` & `gpt-6-luna` | Quiz: 67.5M uncached / 67.5M cached in / 27M out (\$205.88) + Script (\$21.00) | **\$226.88** |
| **7. DuckDB Dashboard Generation (50,000)** | `gpt-6.1-terra` (`auto`) | 60.0M input (\$1.00/1M) + 30.0M output (\$5.00/1M) | **\$210.00** |
| **8. Cross-Document Synthesis (25,000)** | `gpt-6.1-sol` (50% `auto`, 50% `flex`) | 120M uncached in (\$1.50 blended) + 80M cached (\$0.10) + 30M out (\$7.50 blended) | **\$413.00** |
| **Total Monthly OpenAI API Cost (Proposed)** | **Multi-Model Routed** | **~3.14 Billion tokens across all tiers** | **\$1,485.90 / month** |
| *Cost per Active User / Month* | | | ***\$0.149 / user*** |
| *Comparison: Naive All-`gpt-6-astra` + Hosted `file_search`* | `gpt-6-astra` + Vector Store | 3.14B tokens at \$10/\$50 + 525,000 `file_search` calls (\$1,312.50) + storage | *\$39,420.00 / month (96.2% more expensive)* |

---

## 6. Optional Audio & Voice Add-On Cost Sensitivity

If DocuMind enables optional server-side voice features beyond browser-native Web Speech API:
1. **Voice Note / Lecture Transcription (`gpt-transcribe` at \$0.0045 / minute):**
   - If 10% of users upload a 30-minute lecture recording each month (300 mins in Scenario 1; 3,000 mins in Scenario 2; 30,000 mins in Scenario 3):
   - Adds **\$1.35/mo** (Scenario 1), **\$13.50/mo** (Scenario 2), or **\$135.00/mo** (Scenario 3).
2. **Server-Side Podcast Audio Generation (`gpt-realtime-2.1-mini` at \$0.60/1M text in, \$20.00/1M audio out, ~\$0.03/minute of generated audio):**
   - Generating a 2-minute downloadable MP3 podcast costs **~\$0.06 per briefing**.
   - Recommendation: Keep **Browser Web Speech API (`window.speechSynthesis`)** as the free default for all users, and gate downloadable `gpt-realtime-2.1-mini` studio audio behind a per-user daily quota (e.g., 3 studio downloads/day) or caching by `doc_id` in Supabase Storage so a generated MP3 is shared across all viewers of that document.
