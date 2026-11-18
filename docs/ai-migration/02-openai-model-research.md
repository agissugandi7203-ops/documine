# Phase 2 — Latest Official OpenAI Ecosystem Research

**Verification Date:** November 14, 2026  
**Scope:** Official OpenAI Developer API Models, Platform Tools, Pricing, Rate Limits, and Deprecations

---

## 2.1 Verified OpenAI Developer API Model Catalog (As of November 2026)

### Executive Verification of User Research Leads

Every model name and codename lead specified in the project brief was verified against OpenAI's official API documentation, release notes, and pricing schedules as of **November 14, 2026**:

1. **GPT-6 Family (`gpt-6-*` / `gpt-6.1-*`) — VERIFIED & GENERALLY AVAILABLE IN API:**
   - OpenAI rolled out the **GPT-6** generation across September–October 2026 as the primary flagship and production model family in the OpenAI API, superseding the earlier GPT-5, GPT-4.1, and standalone `o3`/`o4-mini` lines.
2. **Astra (`gpt-6-astra`) — VERIFIED:**
   - Released **September 3, 2026**. OpenAI's frontier flagship model for the most demanding scientific reasoning, multi-step synthesis, agentic orchestration, and complex coding.
3. **Sol (`gpt-6.1-sol` / `gpt-6-sol`) — VERIFIED:**
   - `gpt-6-sol` launched **September 22, 2026**, followed by the upgraded **`gpt-6.1-sol`** on **September 29, 2026** (OpenAI DevDay). Serves as the high-intelligence workhorse delivering near-Astra reasoning at 80% lower cost ($2.00/1M input vs $10.00/1M).
4. **Luna (`gpt-6-luna`) — VERIFIED:**
   - Released **September 22, 2026**. High-throughput, low-latency, ultra-cost-efficient model ($0.10/1M input, $0.50/1M output) purpose-built for classification, metadata extraction, summarization, and high-volume RAG Q&A.
5. **Tera / Terra (`gpt-6.1-terra`) — VERIFIED (Official API Spelling: `terra` with double 'r'):**
   - Released **October 26, 2026**. Note that while often spelled colloquially as "Tera", the official OpenAI model identifier is **`gpt-6.1-terra`**. It sits between `gpt-6-luna` and `gpt-6.1-sol` ($1.00/1M input, $5.00/1M output) and is specifically optimized for **visual reasoning, dense document/PDF layout & chart interpretation, and grounded writing**.
6. **GPT Realtime & Audio Models (`gpt-realtime-2`, `gpt-realtime-2.1-mini`, `gpt-transcribe`, `gpt-live-transcribe`) — VERIFIED:**
   - OpenAI's speech-to-speech Realtime API is powered by **`gpt-realtime-2` / `gpt-realtime-2.1`** and **`gpt-realtime-2.1-mini`** (which also replaces the deprecated `/v1/audio/speech` `gpt-4o-mini-tts` endpoint retiring January 6, 2027). Dedicated speech-to-text transcription is handled by **`gpt-transcribe`** (batch/recorded) and **`gpt-live-transcribe`** (streaming), replacing `gpt-4o-transcribe` (retiring February 26, 2027).

---

### Complete Verified Model Specifications & Pricing Table

#### A. Current Primary Generation: GPT-6 Text & Multimodal Models

All GPT-6 family models share a **1,050,000-token (1.05M) context window** and up to **128,000 max output tokens**, support native multimodal inputs (text, images, and PDF pages), Structured Outputs (`json_schema` with `strict: true`), built-in tools (`file_search`, `web_search`, `code_interpreter`, custom function calling), and configurable `reasoning.effort`.

Pricing is split into **Default Context ($\le 272\text{K}$ input tokens)** and **Long Context ($> 272\text{K}$ input tokens)** per 1 Million tokens:

| Model Name | Official API Model ID | Release Date | Context Window / Max Output | Reasoning Effort Tiers | Standard Input ($\le 272\text{K}$ / $>272\text{K}$) | Cached Input ($\le 272\text{K}$ / $>272\text{K}$) | Cache Write ($\le 272\text{K}$ / $>272\text{K}$) | Standard Output ($\le 272\text{K}$ / $>272\text{K}$) | Batch API (50% Off Standard) | Primary DocuMind Fit |
|---|---|---|---|---|---|---|---|---|---|---|
| **GPT-6 Astra** | `gpt-6-astra` | Sept 3, 2026 | 1,050,000 / 128,000 | `low`, `medium`, `high`, `xhigh`, `max` | $10.00 / $20.00 | $1.00 / $2.00 (90% off) | $12.50 / $25.00 | $50.00 / $75.00 | $5.00 in / $25.00 out | Reserve only for extreme multi-document research escalation; too expensive for routine traffic. |
| **GPT-6.1 Sol** | `gpt-6.1-sol` *(supersedes `gpt-6-sol`)* | Sept 29, 2026 | 1,050,000 / 128,000 | `low`, `medium`, `high`, `xhigh`, `max` | $2.00 / $4.00 | $0.10 / $0.20 (95% off) | $2.50 / $5.00 | $10.00 / $15.00 | $1.00 in / $5.00 out | **Complex cross-document synthesis, contradiction detection, HOTS reasoning, and complex SQL/dashboard planning.** |
| **GPT-6.1 Terra** | `gpt-6.1-terra` | Oct 26, 2026 | 1,050,000 / 128,000 | `none`, `low`, `medium`, `high`, `xhigh`, `max` | $1.00 / $2.00 | $0.05 / $0.10 (95% off) | $1.25 / $2.50 | $5.00 / $7.50 | $0.50 in / $2.50 out | **Scanned PDF/image OCR, visual table/figure extraction, academic Q&A, adaptive quiz generation, and standard dashboard spec generation.** |
| **GPT-6 Luna** | `gpt-6-luna` | Sept 22, 2026 | 1,050,000 / 128,000 | `none`, `low`, `medium`, `high`, `xhigh`, `max` | $0.10 / $0.20 | $0.01 / $0.02 (90% off) | $0.125 / $0.25 | $0.50 / $0.75 | $0.05 in / $0.25 out | **Default high-volume workhorse: document classification, metadata/entity extraction, ingestion summarization, podcast script generation, and standard single-doc Q&A.** |

> [!IMPORTANT]
> **GPT-6 Prompt Caching Mechanics:** In the GPT-6 family, cached input reads receive a **90% to 95% discount** ($0.01/1M on `gpt-6-luna`, $0.05/1M on `gpt-6.1-terra`, $0.10/1M on `gpt-6.1-sol`), while writing new prefixes to the cache bills a explicit **Cache Write** rate (+25% over standard input). Therefore, prompt caching is highly profitable whenever the same document context or system prompt is queried $\ge 2$ times within the cache TTL.

---

#### B. Embeddings, Audio, Realtime & Specialized API Models

| Category | Official API Model ID | Status (Nov 2026) | Modalities | Key Specifications | Official Pricing | DocuMind Suitability |
|---|---|---|---|---|---|---|
| **Embeddings (Efficiency)** | `text-embedding-3-small` | **Active (Recommended Default)** | Text $\rightarrow$ Float Vector | Default **1,536 dims** (supports native `dimensions` truncation, e.g., 512/1536); 8,191 token input per item | **$0.02 / 1M tokens** (Standard)<br>**$0.01 / 1M tokens** (Batch API) | **Primary Embedding Model.** Matches existing `vector(1536)` column in `public.chunks` (`20261113000001_initial_schema.sql:39`) with zero schema dimension changes. |
| **Embeddings (High Precision)** | `text-embedding-3-large` | **Active** | Text $\rightarrow$ Float Vector | Default **3,072 dims** (supports `dimensions=1536` truncation via MRL); 8,191 token input | **$0.13 / 1M tokens** (Standard)<br>**$0.065 / 1M tokens** (Batch API) | Optional upgrade (using `dimensions=1536`) if multilingual/academic retrieval benchmarks require higher recall, at 6.5x the embedding cost (still pennies per 1,000 docs). |
| **Realtime Voice / TTS (Mini)** | `gpt-realtime-2.1-mini` *(and `gpt-realtime-mini`)* | **Active (Recommended for Voice/TTS)** | Audio, Text, Image $\leftrightarrow$ Audio, Text | Full-duplex WebRTC/WebSocket streaming or synthesized audio output; replaces deprecated `gpt-4o-mini-tts` | Text In: **$0.60/1M** ($0.06 cached)<br>Text Out: **$2.40/1M**<br>Audio In: **$10.00/1M** ($0.30 cached)<br>Audio Out: **$20.00/1M** | Best choice if DocuMind adds synthesized audio playback for `/api/audio/briefing-script` or live voice tutoring. |
| **Realtime Voice (Flagship)** | `gpt-realtime-2` / `gpt-realtime-2.1` | **Active** | Audio, Text, Image $\leftrightarrow$ Audio, Text | Flagship speech-to-speech intelligence with barge-in and tool calling | Text In: **$4.00/1M** ($0.40 cached)<br>Text Out: **$24.00/1M**<br>Audio In: **$32.00/1M** ($0.40 cached)<br>Audio Out: **$64.00/1M** | Overkill for basic TTS; reserve only for premium interactive voice tutoring if required later. |
| **Speech-to-Text (Batch/Recorded)** | `gpt-transcribe` | **Active (Recommended STT)** | Audio $\rightarrow$ Text | Asynchronous & recorded audio transcription | **$0.0045 / minute** (~$0.27 / hour) | Ideal if DocuMind expands ingestion to allow students/companies to upload recorded lectures or meeting `.mp3`/`.wav`/`.m4a` files. |
| **Speech-to-Text (Streaming)** | `gpt-live-transcribe` | **Active** | Streaming Audio $\rightarrow$ Text | Low-latency live speech transcription | **$0.017 / minute** (~$1.02 / hour) | Suitable only for live microphone dictation into the chat bar. |
| **Moderation** | `omni-moderation-latest` | **Active** | Text, Image $\rightarrow$ Safety Categories | Multimodal safety & policy classification | **Free** ($0.00) | Optional free guardrail if needed for public/educational deployments. |

---

#### C. ChatGPT vs. Developer API vs. Legacy/Deprecated Models Distinction

To prevent architectural mistakes, the table below distinguishes current API models from legacy/deprecated checkpoints and ChatGPT consumer tiers:

| Model / API Surface | Availability Category | Current Status (Nov 2026) | Migration Guidance for DocuMind |
|---|---|---|---|
| `gpt-6-luna`, `gpt-6.1-terra`, `gpt-6.1-sol`, `gpt-6-astra` | **Developer API & Enterprise (Active Generation)** | Generally Available | **Use these models** via `/v1/responses`. |
| `gpt-5`, `gpt-5-mini`, `gpt-5-nano`, `gpt-4.1`, `gpt-4.1-mini`, `gpt-4.1-nano`, `o3`, `o4-mini` | **Prior Generation Developer API Models (Legacy)** | Superseded by GPT-6 family (many older snapshots scheduled for 2027 retirement) | Do not build new 2026 greenfield architectures on GPT-4.1/GPT-5/o3 when `gpt-6-luna`, `gpt-6.1-terra`, and `gpt-6.1-sol` offer superior context (1.05M), speed, and price-performance. |
| `gpt-4o-mini-tts`, `tts-1`, `tts-1-hd` (`/v1/audio/speech`) | **Deprecated API Models** | **Scheduled Shutdown: January 6, 2027** | Do **not** integrate `/v1/audio/speech` or `gpt-4o-mini-tts`; use `gpt-realtime-2.1-mini` if audio output is needed. |
| `gpt-4o-transcribe`, `gpt-4o-mini-transcribe` | **Deprecated API Models** | **Scheduled Shutdown: February 26, 2027** | Do **not** integrate; use `gpt-transcribe` ($0.0045/min) instead. |
| **Assistants API** (`/v1/assistants`, `/v1/threads`, `/v1/runs`) | **Shut Down / Retired API** | **Shut Down on August 26, 2026** | **Never use Assistants API.** Use the **Responses API** (`/v1/responses`) and **Conversations API**. |
| `gpt-3.5-turbo-*`, `gpt-4-0613` | **Retired API Models** | **Shut Down in October 2026** | Completely unavailable. |
| ChatGPT Plus / Pro / Team UI features (e.g., consumer Canvas, custom GPTs) | **ChatGPT Consumer Product Only** | Not accessible via API keys | Cannot be called programmatically; DocuMind must use `/v1/responses` + Structured Outputs. |

---

## 2.2 Official OpenAI APIs and Platform Capabilities Evaluation

### 1. Core Model Interaction: Responses API (`/v1/responses`)
- **What It Is:** OpenAI's unified primary API endpoint (`client.responses.create(...)`), which replaced the legacy Assistants API (shut down August 26, 2026) and supersedes Chat Completions (`/v1/chat/completions`) for stateful, multimodal, reasoning, and tool-using workflows.
- **Key Features Verified (2026):**
  - **Unified Multimodal & Reasoning Input:** Accepts text, images, and files (`input_text`, `input_image`, `input_file`) plus `reasoning={"effort": "none" | "low" | "medium" | "high" | "xhigh" | "max"}` in a single schema.
  - **Conversation State Management:** Supports either stateless array inputs, lightweight chaining via `previous_response_id` (with `store=True` or `store=False`), or persistent server-side `Conversations` objects.
  - **Native Streaming (SSE):** Emits typed semantic events (`response.output_text.delta`, `response.completed`, tool call deltas) ideal for streaming chat answers to the Next.js frontend.
  - **Structured Outputs (`text.format` / `client.responses.parse`):** Enforces 100% adherence to a supplied Pydantic v2 model or JSON Schema (`strict: true`) via constrained decoding.
  - **2026 Advanced Tooling:** Supports **Async Tool Calling** and **Mid-turn Steering**, plus native hosted tools (`file_search`, `web_search`, `code_interpreter`).
- **Value for DocuMind:** **High (Core Foundation).** Every LLM call in DocuMind (`chat`, `quiz`, `synthesis`, `analytics` SQL/ECharts generation, and `ingestion` metadata extraction) should standardize on `client.responses.create` / `client.responses.parse`.

---

### 2. Document Intelligence: Files API, Vector Stores & File Search vs. Custom `pgvector`
- **How OpenAI Hosted File Search Works:**
  - Upload files via `/v1/files` (`purpose="assistants"` / `"user_data"`), attach them to a `/v1/vector_stores` object, and enable `tools=[{"type": "file_search", "vector_store_ids": [...]}]` in the Responses API.
  - **Supported Formats:** `.pdf`, `.docx`, `.doc`, `.pptx`, `.txt`, `.md`, `.html`, `.tex`, `.json`, and code files (UTF-8/UTF-16/ASCII). **Note: `.xlsx` / `.csv` are NOT supported by File Search** (they require Code Interpreter or local DuckDB parsing!).
  - **Limits:** Max 512 MB per file, max 5,000,000 tokens per file, max 10,000 files per vector store, customizable `max_chunk_size_tokens` (100–4,096, default 800) and `chunk_overlap_tokens` (default 400).
  - **Metadata Filtering:** Supports key-value attribute filtering on files.
  - **Pricing:**
    - **Storage:** **$0.10 / GB / day** (first 1 GB free).
    - **Tool Call Fee:** **$2.50 per 1,000 `file_search` tool calls** (in addition to all model input tokens injected by the retrieved chunks!).
- **Critical Limitations of OpenAI File Search for DocuMind:**
  1. **No Bounding Box Coordinate Preservation:** When OpenAI's hosted Vector Store parses and chunks a PDF, it strips PDF spatial coordinates (`x0, y0, x1, y1`). It only returns text snippets and file-level citations—meaning **DocuMind's signature NotebookLM-style PDF page scroll + animated bounding-box highlight overlay (`BoundingBox` in `schemas.py:10-20`) CANNOT work if retrieval relies solely on OpenAI Vector Stores!**
  2. **$2.50 / 1,000 Tool Call Surcharge + Daily Storage Cost:** Every single user question invoking `file_search` costs an extra **$0.0025** purely for the tool call, before counting model tokens. By contrast, querying a 100-token question via `text-embedding-3-small` ($0.02/1M tokens) against DocuMind's existing Supabase `pgvector` HNSW index costs **$0.000002**—**1,250x cheaper per search!**
  3. **No `.xlsx` / Tabular OLAP Support:** File Search cannot run deterministic SQL aggregations over spreadsheets or extracted PDF tables.
  4. **Data Governance & ZDR Exclusion:** OpenAI Vector Stores persist data outside Zero Data Retention (ZDR) until manually deleted, and per-user access control relies on metadata filters or creating thousands of separate vector stores.
- **Architectural Verdict for DocuMind:**
  - **Do NOT use OpenAI Vector Stores / File Search as DocuMind's primary database.**
  - Instead, **use OpenAI `text-embedding-3-small` + DocuMind's own Supabase PostgreSQL (`pgvector` HNSW + GIN Full-Text Search) + PyMuPDF local coordinate extraction.** This preserves 100% of visual bounding boxes, enforces database-level tenant/user isolation, eliminates the $2.50/1k tool call fee and $0.10/GB/day storage fee, and keeps all chunks and coordinates in a single transactional store.

---

### 3. Multimodal Processing: Native PDF & Image Vision Input
- **How It Works:** When a PDF page is scanned (image-only) or contains complex visual diagrams, charts, or multi-column tables that local text extraction misses, `gpt-6.1-terra` and `gpt-6-luna` accept either:
  1. Rendered page images (`input_image` via base64 data URL from PyMuPDF `page.get_pixmap(dpi=150)`), or
  2. Direct PDF file inputs (`input_file`), where OpenAI extracts both text and page image representations.
- **Value for DocuMind:** **High (Selective Fallback).** Rather than sending every page of a 100-page digital textbook to Vision (which wastes input tokens), DocuMind should extract digital text locally with PyMuPDF for $0, and **selectively invoke `gpt-6.1-terra` Vision only on pages where `word_count < 20` (scanned pages) or where complex visual charts/tables are detected.**

---

### 4. Structured Outputs (`json_schema` with `strict: true`)
- **How It Works:** Using `client.responses.parse(..., text_format=MyPydanticModel)` guarantees that the model's output conforms strictly to the Pydantic schema—no missing required keys, no invalid enum values, and no markdown code-fence parsing errors.
- **Schema Rules:** All fields in strict schemas must be required (optional fields use `Optional[T]` / union with `null`, e.g., `str | None = None`), and `additionalProperties: false` is automatically set by the OpenAI Python SDK's Pydantic helper.
- **Value for DocuMind:** **Critical.** Directly powers:
  1. `ChatResponse` (structured answer + cited `chunk_id`s + dynamic `suggested_followups`),
  2. `QuizResponse` (structured questions + `source_chunk_id` + `proof_quote`),
  3. `DashboardGenerationPlan` (structured DuckDB `sql_query` + `EChartsOption` + `insight_summary`),
  4. `SynthesisMatrixResponse` (cross-document comparison matrix + contradiction flags),
  5. `DocumentIngestionMetadata` (document classification, summary, extracted entities/topics, and extracted quantitative tables).

---

### 5. Cost Optimization Platform Capabilities: Prompt Caching, Flex Processing & Batch API
- **Prompt Caching (Automatic Prefix Caching & `prompt_cache_key`):**
  - Enabled automatically on prompts $\ge 1,024$ tokens (billed in 128-token increments) when static content (system instructions, schema definitions, and document context chunks) is placed at the **beginning** of the prompt and dynamic content (the user's question) is placed at the **end**.
  - Passing a deterministic `prompt_cache_key` (e.g., `documind:ws:{workspace_id}:doc:{doc_id}`) routes requests from the same document session to the same physical inference host, raising cache hit rates to 75%–85%.
  - **Retention Tiers:** `prompt_cache_retention="in_memory"` is **free to write** (5–10 min sliding TTL, max 1h, ZDR-compliant). Extended cache retention (`30m` at 1.25x input write surcharge; `12h` at 2.5x input write surcharge) persists KV tensors across longer intervals.
  - Provides **90%–95% input token discounts** on GPT-6 models (`$0.01/1M` on `gpt-6-luna`, `$0.05/1M` on `gpt-6.1-terra`, `$0.10/1M` on `gpt-6.1-sol`).
- **Flex Processing (`service_tier="flex"`):**
  - Processes synchronous `POST /v1/responses` calls at a **50% discount** on both input and output tokens (matching Batch API pricing: e.g., `$0.05/1M` in / `$0.25/1M` out on `gpt-6-luna`; `$0.50/1M` in / `$2.50/1M` out on `gpt-6.1-terra`) in exchange for slightly higher latency and occasional `429 Resource Unavailable` retries. Ideal for non-blocking post-upload metadata extraction and background Vision OCR.
- **Batch API (`/v1/batches`):**
  - Processes JSONL batches asynchronously within a 24-hour window (often completing in minutes/hours) at a flat **50% discount** across both token generation (`gpt-6-*`) and embeddings (`text-embedding-3-small` drops to **$0.01 / 1M tokens**), with separate dedicated rate-limit pools.
  - Ideal for bulk institutional archive ingestion, overnight cross-document relationship discovery, and bulk re-indexing.

---

### 6. Additional 2026 Ecosystem Capabilities & Rate Limit Tiers
- **Additional Audio, Live & Image Models in the Late-2026 Catalog:**
  - **`gpt-live-1` (`/v1/live/sessions`):** Multimodal live session orchestrator with continuous audio/video/screen streaming, native barge-in, and voice conversion (**$0.05 / minute** session fee + underlying model token rates).
  - **`gpt-audio-1.5` (`gpt-audio-1.5-2026-02-17`):** Asynchronous audio-in/audio-out model for `/v1/chat/completions` (**$2.50/1M** text in, **$10.00/1M** text out; **$32.00/1M** audio in, **$64.00/1M** audio out).
  - **`gpt-image-2.6-sunburst` & `gpt-image-2.6-flare`:** Late-2026 image generation models replacing `gpt-image-1` (which shut down Oct 23, 2026). Not required for DocuMind's core document intelligence workflows.
- **2026 API Rate Limit Tiers (`Build` $\rightarrow$ `Launch` $\rightarrow$ `Grow` $\rightarrow$ `Scale`):**
  - **`Build` (Entry Paid Tier, $5+ paid):** `gpt-6.1-sol` / `gpt-6.1-terra` at **1,000 RPM / 2,000,000 TPM**; `gpt-6-luna` at **3,000 RPM / 4,000,000 TPM**; `gpt-6-astra` at **500 RPM / 500,000 TPM**.
  - **`Launch` ($50+ paid, 7+ days):** `gpt-6.1-sol` / `terra` at **2,000 RPM / 3,000,000 TPM**; `gpt-6-luna` at **5,000 RPM / 10,000,000 TPM**.
  - **`Grow` ($250+ paid, 14+ days):** `gpt-6.1-sol` / `terra` at **5,000 RPM / 6,000,000 TPM**; `gpt-6-luna` at **10,000 RPM / 20,000,000 TPM**.
  - **`Scale` ($1,000+ paid, 30+ days):** `gpt-6.1-sol` / `terra` at **10,000 RPM / 15,000,000 TPM**; `gpt-6-luna` at **30,000 RPM / 150,000,000 TPM**.
  - **Key Rate-Limit Advantage:** Cached input tokens (`cached_tokens`) are **not deducted** against input TPM rate limits on `gpt-6.1-sol`, `gpt-6.1-terra`, and `gpt-6-luna`, meaning high cache hit rates simultaneously multiply effective throughput capacity.

---

## 2.3 Official Research Sources & Verification Log

All specifications, model identifiers, deprecation dates, and pricing figures in this document were verified on **November 14, 2026** against the following sources:

1. **OpenAI Models Documentation & GPT-6 Lineup (`gpt-6-astra`, `gpt-6.1-sol`, `gpt-6.1-terra`, `gpt-6-luna`):**
   - Official OpenAI Platform Models Guide: `https://platform.openai.com/docs/models` (Verified Nov 14, 2026)
   - OpenAI API Pricing Schedule (Standard, Long Context $>272\text{K}$, Cached Input, Cache Write, Batch): `https://platform.openai.com/docs/pricing` and `https://openai.com/api/pricing/` (Verified Nov 14, 2026)
   - Release Timeline Verification:
     - `gpt-6-astra`: Released September 3, 2026 (`https://openai.com/index/` & API Changelog)
     - `gpt-6-sol` & `gpt-6-luna`: Released September 22, 2026
     - `gpt-6.1-sol`: Released September 29, 2026 (OpenAI DevDay)
     - `gpt-6.1-terra`: Released October 26, 2026
2. **OpenAI Responses API, Conversations API & Assistants API Deprecation:**
   - Responses API Reference: `https://platform.openai.com/docs/api-reference/responses` (Verified Nov 14, 2026)
   - Assistants API Sunset & Migration Guide (Assistants API shut down August 26, 2026): `https://platform.openai.com/docs/assistants/migration` and `https://platform.openai.com/docs/deprecations` (Verified Nov 14, 2026)
3. **OpenAI File Search, Vector Stores & Embeddings:**
   - File Search & Vector Stores Guide (512MB limit, 5M tokens/file, 10,000 files/store, supported MIME types, $0.10/GB/day + $2.50/1k calls): `https://platform.openai.com/docs/guides/tools-file-search` and `https://platform.openai.com/docs/api-reference/vector-stores` (Verified Nov 14, 2026)
   - Embeddings Guide (`text-embedding-3-small` at $0.02/1M, `text-embedding-3-large` at $0.13/1M, native `dimensions` parameter): `https://platform.openai.com/docs/guides/embeddings` (Verified Nov 14, 2026)
4. **OpenAI Realtime & Audio Transcription Models & Deprecations:**
   - Realtime API Guide (`gpt-realtime-2`, `gpt-realtime-2.1-mini`): `https://platform.openai.com/docs/guides/realtime` (Verified Nov 14, 2026)
   - Speech-to-Text (`gpt-transcribe` at $0.0045/min, `gpt-live-transcribe` at $0.017/min) & Audio Deprecations (`gpt-4o-mini-tts` retiring Jan 6, 2027; `gpt-4o-transcribe` retiring Feb 26, 2027): `https://platform.openai.com/docs/guides/speech-to-text` and `https://platform.openai.com/docs/deprecations` (Verified Nov 14, 2026)
5. **OpenAI Enterprise Privacy, API Data Usage & Zero Data Retention (ZDR):**
   - Enterprise Privacy at OpenAI & API Data Usage Policies (No training on API data by default; 30-day abuse monitoring log retention; ZDR exclusions for stateful Files/Vector Stores): `https://openai.com/enterprise-privacy/` and `https://platform.openai.com/docs/guides/your-data` (Verified Nov 14, 2026)
