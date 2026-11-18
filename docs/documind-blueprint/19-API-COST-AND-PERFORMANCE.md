# 19 — Final Operating Cost Profile, Infrastructure Budget & Performance SLAs

> **Document ID:** `DOC-19`  
> **Status:** **`DECIDED`** — Quality-Optimized Financial & Performance Model (Master Task Sections 2.A, 2.B & 7)  
> **Related Documents:** [18-OPENAI-AND-MODEL-STRATEGY.md](file:///c:/Users/arief/Downloads/WAICY/docs/documind-blueprint/18-OPENAI-AND-MODEL-STRATEGY.md), [26-ARCHITECTURE-DECISIONS.md](file:///c:/Users/arief/Downloads/WAICY/docs/documind-blueprint/26-ARCHITECTURE-DECISIONS.md), [30-FINAL-SELECTED-ARCHITECTURE-AND-DECISIONS.md](file:///c:/Users/arief/Downloads/WAICY/docs/documind-blueprint/30-FINAL-SELECTED-ARCHITECTURE-AND-DECISIONS.md)

---

## 1. Purpose & Financial Philosophy

Per Master Task Section 2.A (**Budget and Cost Tolerance**):
> *"Do not sacrifice important product quality merely to save a few dollars. At the same time, do not justify expensive infrastructure or models without demonstrating their value. The goal is a sensible balance between cost, performance, quality, and maintainability."*

In our finalized architecture (`DOC-30`, `ADR-006`, `ADR-008`, `ADR-018`), we deliberately upgraded four quality-critical components over the bare-minimum budget configuration:
1. **Embeddings:** Upgraded from `text-embedding-3-small` (\$0.02/1M) to **`text-embedding-3-large` (`dimensions=1536`, \$0.13/1M)** for superior bilingual and tabular retrieval precision.
2. **Stage 11 Document Understanding & KPI Extraction:** Upgraded from `gpt-6-luna` to **`gpt-6.1-terra`** (`flex` tier, \$0.50/1M in, \$2.50/1M out) so summaries, classifications, and dashboard KPIs are extracted with high accuracy.
3. **Default Interactive Chat Q&A:** Upgraded from `gpt-6-luna` to **`gpt-6.1-terra`** (\$1.00/1M in, **\$0.05/1M cached**, \$5.00/1M out) for rock-solid grounding and citation discipline, with **`gpt-6.1-sol`** handling deep multi-document questions (20% of chat).
4. **Dashboard SQL & ECharts Planning:** Upgraded from `gpt-6.1-terra` to **`gpt-6.1-sol`** (\$2.00/1M in, \$10.00/1M out) for reliable multi-table DuckDB SQL generation and unit validation.

As proven below, these quality upgrades transform output reliability while keeping total OpenAI API expenditure at **~\$0.25 to \$0.36 per active user per month**—still **>90% cheaper** than a naive all-`gpt-6-astra` + hosted Vector Store setup!

---

## 2. Finalized Unit Cost Per Operation (`DECIDED` Quality-Optimized Profile)

### 2.1 Baseline Workload Assumptions (`ASM-001`–`ASM-005`)
- **Average Document:** 15 pages $\times$ 500 tokens/page = **7,500 tokens/doc** (~18 chunks).
- **Scanned / Chart Pages:** **10% of pages** (1.5 pages/doc) invoke `gpt-6.1-terra` Vision OCR (`flex` tier).
- **Workspace Duplicate Upload Rate:** **10%** caught by SHA-256 deduplication (\$0 cost).
- **Prompt Cache Hit Rate (`in_memory` via `prompt_cache_key`):** **60%** on Q&A context tokens (saving **95%** on `gpt-6.1-terra` and `gpt-6.1-sol` cached input tokens!).

### 2.2 Unit Economics Table

| Operation | Selected Model(s) & Tier | Exact Token Math | Unit Cost (USD) | Operations per \$1.00 |
|---|---|---|---|---|
| **1a. Ingest 15-Page Pure Digital PDF** | `text-embedding-3-large` (`1536d`) + `gpt-6.1-terra` (`flex` Stage 11) | • Embeddings: $7,500 \times \$0.13/10^6 = \$0.000975$<br/>• Stage 11 Understanding (`terra` `flex`): $7,500 \text{ in} \times \$0.50/10^6 + 800 \text{ out} \times \$2.50/10^6 = \$0.005750$<br/>• Stage 13 Relationships: PostgreSQL SQL (\$0) | **\$0.006725 / doc** *(0.67 cents)* | **148 digital PDFs per \$1.00** |
| **1b. Ingest 15-Page Blended PDF (10% Scanned Pages)** | Above + `gpt-6.1-terra` (`flex`) Vision OCR on 1.5 pages | • Digital base: $\$0.006725$<br/>• Vision OCR (1.5 pages on `flex`): $1,800 \text{ in} \times \$0.50/10^6 + 750 \text{ out} \times \$2.50/10^6 = \$0.002775$ | **\$0.009500 / doc** *(0.95 cents)* | **105 blended PDFs per \$1.00** |
| **2. Direct Hybrid Search (`match_document_chunks_hybrid`)** | `text-embedding-3-large` (`1536d`) + PostgreSQL RRF | • Query embed: $35 \text{ tokens} \times \$0.13/10^6 = \$0.0000045$ | **\$0.000005 / search** | **220,000 searches per \$1.00** |
| **3a. Standard Grounded AI Chat Q&A (`80%` of queries)** | `gpt-6.1-terra` (`auto`) + `gpt-6-luna` (router) + `embed-3-large` | • Input (4,000 tokens, 60% cached): $1,600 \times \$1.00/10^6 + 2,400 \times \$0.05/10^6 = \$0.001720$<br/>• Output (400 tokens): $400 \times \$5.00/10^6 = \$0.002000$<br/>• Query rewrite/embed: $\$0.000055$ | **\$0.003775 / question** *(0.38 cents)* | **265 `terra` Q&A turns per \$1.00** |
| **3b. Deep / Multi-Doc AI Chat Q&A (`20%` of queries)** | `gpt-6.1-sol` (`auto`, `reasoning="medium"`) | • Input (5,000 tokens, 50% cached): $2,500 \times \$2.00/10^6 + 2,500 \times \$0.10/10^6 = \$0.005250$<br/>• Output (550 tokens): $550 \times \$10.00/10^6 = \$0.005500$ | **\$0.010750 / question** *(1.08 cents)* | **93 `sol` Q&A turns per \$1.00** |
| **3c. Blended Average AI Question Cost** | 80% `gpt-6.1-terra` / 20% `gpt-6.1-sol` | $0.80(\$0.003775) + 0.20(\$0.010750)$ | **\$0.005170 / question** *(0.52 cents)* | **193 blended Q&A turns per \$1.00** |
| **4. Personalized Dashboard New Widget Generation** | `gpt-6.1-sol` (`auto`) + Sandboxed DuckDB | • Input (1,200 schema/sample tokens): $1,200 \times \$2.00/10^6 = \$0.00240$<br/>• Output (600 plan tokens): $600 \times \$10.00/10^6 = \$0.00600$<br/>• Subsequent opens from DB: **\$0.00** | **\$0.008400 / new widget** *(0.84 cents)* | **119 new dashboard charts per \$1.00** |
| **5. Cross-Document Comparative Synthesis (4 Docs)** | `gpt-6.1-sol` (`auto`, `reasoning="medium"`) | • Input (8,000 tokens, 40% cached): $\$0.00992$<br/>• Output (1,200 tokens): $\$0.01200$ | **\$0.021920 / synthesis** *(2.19 cents)* | **45 multi-doc syntheses per \$1.00** |

---

## 3. Monthly Total Cost of Ownership (TCO): OpenAI API + Railway + Supabase

| Cost Component | Scenario 1: Launch Profile (100 Active Users, 500 Docs/Mo, 3,000 Q&A, 300 New Charts, 150 Syntheses) | Scenario 2: Growth Profile (1,000 Active Users, 5,000 Docs/Mo, 40,000 Q&A, 4,000 New Charts, 2,000 Syntheses) | Scenario 3: Institutional Scale (10,000 Active Users, 50,000 Docs/Mo, 500,000 Q&A, 50,000 New Charts, 25,000 Syntheses) |
|---|---:|---:|---:|
| **A. OpenAI API Expenditure (Quality-Optimized)** | | | |
| • Ingestion (`embed-3-large` + `terra` Stage 11 + 10% `terra` OCR on `flex`, 450/4.5K/45K unique docs) | \$4.28 | \$42.75 | \$427.50 |
| • Grounded AI Assistant Q&A (80% `gpt-6.1-terra` / 20% `gpt-6.1-sol`) | \$15.51 | \$206.80 | \$2,585.00 |
| • Personalized Dashboard New Widget Planning (`gpt-6.1-sol`) | \$2.52 | \$33.60 | \$420.00 |
| • Cross-Document Comparative Synthesis (`gpt-6.1-sol`) | \$3.29 | \$43.84 | \$413.00 *(with 50% `flex`)* |
| • Optional P2 Studio Tools (Quizzes `terra` + Scripts `luna`) | \$1.51 | \$18.91 | \$226.88 |
| **Subtotal: Monthly OpenAI API Cost** | **\$27.11 / mo** | **\$345.90 / mo** | **\$4,072.38 / mo** |
| ***OpenAI Cost per Active User / Month*** | ***\$0.27 / user*** | ***\$0.35 / user*** | ***\$0.41 / user*** |
| **B. Managed Cloud Infrastructure (Railway + Supabase)** | | | |
| • **Supabase Pro** (Managed PostgreSQL 16 + `pgvector` HNSW + Auth + Private Storage) | **\$25.00 / mo** *(Pro base includes 8GB DB + 100GB Storage)* | **\$45.00 / mo** *(Pro + Medium Compute add-on)* | **\$280.00 / mo** *(Pro + Large 8GB RAM Compute + 250GB Storage)* |
| • **Railway: `documind-web`** (Next.js 14 App Router) | **\$4.00 / mo** *(0.5 vCPU / 512MB RAM)* | **\$12.00 / mo** *(2x 1 vCPU / 1GB RAM)* | **\$55.00 / mo** *(Auto-scaled replicas)* |
| • **Railway: `documind-api`** (FastAPI HTTP/SSE + Ephemeral DuckDB) | **\$5.00 / mo** *(1 vCPU / 1GB RAM)* | **\$18.00 / mo** *(2x 2 vCPU / 2GB RAM)* | **\$95.00 / mo** *(Auto-scaled replicas)* |
| • **Railway: `documind-worker`** (ARQ Ingestion + PyMuPDF Worker) | **\$3.00 / mo** *(1 vCPU / 1GB RAM)* | **\$15.00 / mo** *(2x 2 vCPU / 2GB RAM)* | **\$70.00 / mo** *(4x 2 vCPU / 4GB RAM)* |
| • **Railway: `documind-redis`** (Managed Redis 7 for ARQ + Rate Limits + Cache) | **\$2.00 / mo** *(256MB RAM)* | **\$5.00 / mo** *(1GB RAM)* | **\$20.00 / mo** *(4GB RAM)* |
| **Subtotal: Monthly Infrastructure Cost** | **\$39.00 / mo** | **\$95.00 / mo** | **\$520.00 / mo** |
| **TOTAL COMBINED MONTHLY OPERATING COST (A + B)** | **\$66.11 / mo** | **\$440.90 / mo** | **\$4,592.38 / mo** |
| ***Total All-In Cost per Active User / Month*** | ***\$0.66 / user*** | ***\$0.44 / user*** | ***\$0.46 / user*** |

### Why This Operating Profile Is the Sweet Spot
- **At Launch (100 Active Users):** Operating the entire production stack—including `text-embedding-3-large`, `gpt-6.1-terra`, `gpt-6.1-sol`, managed Supabase Pro, and 4 isolated Railway services—costs **~\$66/month total** (\$27 OpenAI + \$39 infrastructure).
- **At Growth (1,000 Active Users):** Total all-in cost is **\$0.44 per user per month**, easily supporting student freemium/pro tiers or institutional licensing while delivering frontier `terra`/`sol` intelligence.
