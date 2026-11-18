# 18 — OpenAI-First, Provider-Flexible AI Architecture & Model Strategy

> **Document ID:** `DOC-18`  
> **Status:** **`DECIDED`** — Authoritative AI Orchestration & Model Selection Specification (Master Task Sections 4 & 6)  
> **Related Documents:** [10-DOCUMENT-INGESTION-PIPELINE.md](file:///c:/Users/arief/Downloads/WAICY/docs/documind-blueprint/10-DOCUMENT-INGESTION-PIPELINE.md), [13-AI-ASSISTANT.md](file:///c:/Users/arief/Downloads/WAICY/docs/documind-blueprint/13-AI-ASSISTANT.md), [15-DASHBOARD-GENERATION-ENGINE.md](file:///c:/Users/arief/Downloads/WAICY/docs/documind-blueprint/15-DASHBOARD-GENERATION-ENGINE.md), [19-API-COST-AND-PERFORMANCE.md](file:///c:/Users/arief/Downloads/WAICY/docs/documind-blueprint/19-API-COST-AND-PERFORMANCE.md), [26-ARCHITECTURE-DECISIONS.md](file:///c:/Users/arief/Downloads/WAICY/docs/documind-blueprint/26-ARCHITECTURE-DECISIONS.md), [30-FINAL-SELECTED-ARCHITECTURE-AND-DECISIONS.md](file:///c:/Users/arief/Downloads/WAICY/docs/documind-blueprint/30-FINAL-SELECTED-ARCHITECTURE-AND-DECISIONS.md)

---

## 1. Purpose & Core Architectural Mandate

Per Master Task Section 4 (**OpenAI-First, Provider-Flexible AI Architecture**):
> *"OpenAI is currently my primary AI provider, and I already have an OpenAI API key. I want DocuMind to leverage the official OpenAI ecosystem as its primary intelligence layer. However, I do not want DocuMind to become permanently dependent on a single AI provider... Do not sacrifice important product quality merely to save a few dollars."*

This document specifies:
1. The **Provider-Flexible `AIGateway` & Adapter Architecture (`apps/api/app/ai/`, `ADR-017`)** that keeps OpenAI-specific implementation details completely out of domain services.
2. The **`[VERIFIED]` Official OpenAI Model Catalog (November 2026 Baseline)**.
3. The **`DECIDED` Quality-Optimized Model Selection & Task Routing Table (`ADR-006`, `ADR-008`)**.
4. How to switch models or introduce a secondary provider in the future with zero business-logic rewrites.

---

## 2. The Provider-Flexible AI Abstraction Layer (`apps/api/app/ai/`)

### 2.1 Why a Practical Custom Gateway Beats Direct SDK Calls AND Heavy Frameworks
- **Why NOT scatter `AsyncOpenAI` calls across routers (`gemini_service.py` anti-pattern):** Tightly couples business logic (`chat.py`, `documents.py`, `analytics.py`, `synthesis.py`) to one vendor's SDK signatures, making model swaps, unified retry policies, prompt caching, and cost logging brittle.
- **Why NOT use heavy universal frameworks (LangChain / LlamaIndex):** Adds 50+ transitive dependencies, obscures native OpenAI `/v1/responses` features (`prompt_cache_key`, `reasoning.effort`, `service_tier="flex"`, strict Pydantic parsing), and complicates deterministic PDF bounding-box resolution.
- **Selected Solution (`DECIDED`, `ADR-017`):** A clean, ~250-line internal package `apps/api/app/ai/` with clear separation of responsibilities:

| Module in `apps/api/app/ai/` | Exact Responsibility |
|---|---|
| **`contracts.py`** | Defines `AITaskType` enum, `TaskRouteSpec`, `NormalizedUsage`, and the two provider protocols: `LLMProviderAdapter` and `EmbeddingProviderAdapter`. |
| **`routing.py`** | Holds the declarative `TASK_ROUTING_TABLE: dict[AITaskType, TaskRouteSpec]`, allowing per-task provider, model, `reasoning_effort`, `service_tier`, and fallback model overrides via environment variables. |
| **`prompts.py`** | Centralizes static-prefix prompt assembly, `<untrusted_document_chunk>` XML wrapping (`PR-045`), and deterministic `prompt_cache_key` generation. |
| **`gateway.py`** | The single entry point (`AIGateway`) injected into domain services (`execute_structured`, `stream_text`, `embed_texts`). Handles retries, exponential backoff, automatic failover to `fallback_model_id`, and dispatches usage records. |
| **`telemetry.py`** | Calculates exact USD cost per call from verified token rates and writes asynchronously to `public.ai_usage_logs` (`ADR-020`). |
| **`adapters/openai_adapter.py`** | Concrete default implementation wrapping `AsyncOpenAI` (`POST /v1/responses` with `store=False` and `POST /v1/embeddings` with `dimensions=1536`). |

---

## 3. `[VERIFIED]` Official OpenAI Developer API Catalog (November 2026)

| Official API Model ID (Alias & Snapshot) | Release & Status | Context / Max Out | Standard Pricing ($\le 272\text{K}$, per 1M tokens) | Cached Input | Flex / Batch (50% Off) | Selected Role in DocuMind (`DECIDED`) |
|---|---|---|---|---|---|---|
| **`text-embedding-3-large`** *(configured with `dimensions=1536`)* | **`[VERIFIED]` GA** | 8,191 tokens | **\$0.13** in | N/A | **\$0.065** in | **Primary Vector Embedding Model (`ADR-006`):** Superior multilingual (ID/EN) & tabular retrieval precision while fitting `vector(1536)`. |
| **`gpt-6.1-terra`** (`gpt-6.1-terra-2026-10-02`) | Oct 26, 2026 **`[VERIFIED]` GA** | 1.05M / 128K | **\$1.00** in / **\$5.00** out | **\$0.05** (95% off) | **\$0.50** in / **\$2.50** out | **Primary Multimodal, Ingestion Understanding & Standard Q&A Model:** Stage 6 Vision OCR, Stage 11 Document Understanding & KPI Extraction, Standard Grounded Chat Q&A, & Study Quizzes. |
| **`gpt-6.1-sol`** (`gpt-6.1-sol-2026-10-08`) | Sept 29, 2026 **`[VERIFIED]` GA** | 1.05M / 128K | **\$2.00** in / **\$10.00** out | **\$0.10** (95% off) | **\$1.00** in / **\$5.00** out | **Primary Analytical & Reasoning Model:** Dashboard DuckDB SQL + ECharts Planning, Deep/Multi-Doc Chat Q&A, & Cross-Document Synthesis / Contradiction Detection. |
| **`gpt-6-luna`** (`gpt-6-luna-2026-09-09`) | Sept 22, 2026 **`[VERIFIED]` GA** | 1.05M / 128K | **\$0.10** in / **\$0.50** out | **\$0.01** (90% off) | **\$0.05** in / **\$0.25** out | **High-Speed Utility & Auxiliary Model:** Query complexity classification, multi-turn query rewriting, conversation history compaction, & P2 Audio Briefing script drafting. |
| **`gpt-6-astra`** (`gpt-6-astra-2026-09-03`) | Sept 3, 2026 **`[VERIFIED]` GA** | 1.05M / 128K | **\$10.00** in / **\$50.00** out | **\$1.00** (90% off) | **\$5.00** in / **\$25.00** out | **Frontier Flagship:** Disabled by default (`ENABLE_ASTRA_ESCALATION=False`); available via config flag for specialized enterprise audits. |

*(Retired/Deprecated APIs never to be used: Assistants API `/v1/assistants` [shut down Aug 26, 2026], `o1`/`o3-mini`/`o4-mini` [shut down Oct 23, 2026], `gpt-5`/`o3` [shutting down Dec 11, 2026], `gpt-4o`/`gpt-4.1` [shutting down Jan 14, 2027]).*

---

## 4. Finalized Task-by-Task Model Selection & Rationale (`DECIDED`, `ADR-008`)

Why did we upgrade **Embeddings**, **Stage 11 Document Understanding**, **Standard Q&A**, and **Dashboard SQL Planning** compared to a bare-minimum budget configuration?

| Task (`AITaskType`) | Selected Model (`DECIDED`) | Why We Selected This Model Over a Cheaper Alternative | Cost per Execution |
|---|---|---|---|
| **1. Document & Query Embeddings** (`EMBEDDING_DOCUMENT`, `EMBEDDING_QUERY`) | **`text-embedding-3-large` (`dimensions=1536`)** | `text-embedding-3-small` saves only \$0.0008 per 15-page PDF, whereas `3-large` (truncated natively to 1,536 dims) significantly reduces missed retrievals on dense scientific/financial tables and bilingual Indonesian-English queries. | **\$0.00098 / 15-page doc**<br/>**\$0.000004 / query** |
| **2. Scanned Page & Chart Vision OCR** (`VISION_OCR_AND_TABLES`) | **`gpt-6.1-terra`** (`flex` tier $\rightarrow$ `auto` fallback) | Purpose-built late-2026 multimodal vision/OCR model. Accurately transcribes two-column layouts, equations, and raster charts where local OCR fails. | **\$0.0028 / 15-page doc** *(at 10% scanned pages)* |
| **3. Single-Pass Document Understanding, Classification, Summary & KPI Extraction** (`DOCUMENT_UNDERSTANDING`) | **`gpt-6.1-terra`** (`flex` tier $\rightarrow$ `auto` fallback) | **Crucial Quality Upgrade:** Stage 11 runs **only once** per uploaded document, and its output populates Pillar A previews, Pillar B KPI cards, and Pillar C topic/entity graphs. Using `gpt-6.1-terra` instead of `gpt-6-luna` costs only **\$0.0029 on `flex`** while preventing missed KPIs or misclassified units. | **\$0.0029 / doc** *(on `flex`)* |
| **4. Standard Single-Doc & Repo Grounded Q&A** (`GROUNDED_CHAT_STANDARD`) | **`gpt-6.1-terra`** (`auto` tier, SSE streaming, `reasoning="low"`) | **Crucial Quality Upgrade:** With 95% prompt caching (`$0.05/1M` cached input!), `gpt-6.1-terra` costs only **~\$0.0038 per question** while providing markedly stronger citation accuracy (`[cite:CHUNK_ID]`), table reading, and instruction adherence than `gpt-6-luna`. | **\$0.0038 / question** *(with 60% cache hit)* |
| **5. Deep / Multi-Document Comparative Q&A** (`GROUNDED_CHAT_DEEP`) | **`gpt-6.1-sol`** (`auto` tier, SSE streaming, `reasoning="medium"`) | Triggered when comparing $\ge 3$ documents or answering multi-hop analytical questions in chat. | **\$0.0108 / question** |
| **6. Personalized Dashboard SQL & ECharts Planning** (`DASHBOARD_SQL_PLANNING`) | **`gpt-6.1-sol`** (`auto` tier, `reasoning="low"`/`"medium"`) | **Crucial Quality Upgrade:** Writing bug-free DuckDB SQL across multiple extracted tables while deduplicating overlapping periods and enforcing currency/unit homogeneity is a reasoning-intensive code generation task where `gpt-6.1-sol` shines. | **\$0.0084 / new widget** *(cached in DB thereafter at \$0)* |
| **7. Cross-Document Comparative Synthesis & Contradiction Detection** (`CROSS_DOC_SYNTHESIS`) | **`gpt-6.1-sol`** (`auto` tier, `reasoning="medium"`) | Comparing 2–10 documents across multiple dimensions and verifying whether conflicting claims are true contradictions requires `gpt-6.1-sol`. | **\$0.0219 / synthesis** |
| **8. Query Routing, Coreference Rewrite, History Compaction & Audio Script** | **`gpt-6-luna`** (`auto` tier, `reasoning="none"`) | High-frequency, lightweight internal transformations where `<350ms` latency and \$0.10/1M pricing are optimal. | **\$0.00005 – \$0.00070** |

---

## 5. How to Switch Models or Add a New AI Provider in the Future

Because domain services interact exclusively with `AIGateway` (`ADR-017`):
1. **Changing a Model Within OpenAI (Zero Code Change):**
   - Update environment variable e.g. `AI_ROUTE_GROUNDED_CHAT_STANDARD="openai:gpt-6.1-sol:low:auto"` in Railway variables.
2. **Adding a Second LLM Provider (e.g., Anthropic Claude or Google Gemini for a Specific Task):**
   - Create `apps/api/app/ai/adapters/anthropic_adapter.py` implementing the 2-method `LLMProviderAdapter` protocol (`generate_structured` and `stream_text`).
   - Register `"anthropic": AnthropicAdapter()` in `AIGateway.providers`.
   - Set `AI_ROUTE_CROSS_DOC_SYNTHESIS="anthropic:claude-..."`. Zero files in `routers/` or `services/` change.
3. **Switching Embedding Providers Safely:**
   - Every row in `public.chunks` records `embedding_model` (default `'openai:text-embedding-3-large:1536'`). If an embedding provider is ever changed, an `arq` background migration job re-embeds chunks in the background and atomically swaps the active vector column/index.
