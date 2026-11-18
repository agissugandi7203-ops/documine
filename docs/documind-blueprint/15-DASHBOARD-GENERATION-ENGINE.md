# 15 — Personalized Dashboard Generation & DuckDB Analytical Engine

> **Document ID:** `DOC-15`  
> **Status:** **`DECIDED`** — Final Technical Engine Specification for Pillar B (`ADR-008`, `ADR-011`, `ADR-012`)  
> **Related Documents:** [30-FINAL-SELECTED-ARCHITECTURE-AND-DECISIONS.md](file:///c:/Users/arief/Downloads/WAICY/docs/documind-blueprint/30-FINAL-SELECTED-ARCHITECTURE-AND-DECISIONS.md), [10-DOCUMENT-INGESTION-PIPELINE.md](file:///c:/Users/arief/Downloads/WAICY/docs/documind-blueprint/10-DOCUMENT-INGESTION-PIPELINE.md), [14-PERSONALIZED-DASHBOARD.md](file:///c:/Users/arief/Downloads/WAICY/docs/documind-blueprint/14-PERSONALIZED-DASHBOARD.md), [18-OPENAI-AND-MODEL-STRATEGY.md](file:///c:/Users/arief/Downloads/WAICY/docs/documind-blueprint/18-OPENAI-AND-MODEL-STRATEGY.md), [22-SECURITY-AND-PRIVACY.md](file:///c:/Users/arief/Downloads/WAICY/docs/documind-blueprint/22-SECURITY-AND-PRIVACY.md), [26-ARCHITECTURE-DECISIONS.md](file:///c:/Users/arief/Downloads/WAICY/docs/documind-blueprint/26-ARCHITECTURE-DECISIONS.md)

---

## 1. Purpose & Architectural Separation of Concerns

Master Task Section 4.6 requires us to:
> *"Evaluate how AI should interpret information and how deterministic processing should calculate numerical metrics. AI-generated chart descriptions and numerical values must not be treated as automatically correct. Specify a validation layer."*

To guarantee **zero hallucinated numbers** and **strict multi-tenant isolation**, the Dashboard Generation Engine enforces a strict **Four-Stage Separation of Concerns (`ADR-008`, `ADR-011`, `ADR-012`)**:

1. **Stage A — Persistent Structured Extraction (At Ingestion):** Tables and standalone KPIs are extracted from PDFs/spreadsheets once during ingestion (`DOC-10` Stages 7, 11, 12), verified against source text, and persisted in PostgreSQL (`public.document_tables` and `public.extracted_metrics`).
2. **Stage B — Ephemeral Workspace-Scoped DuckDB Hydration:** When generating or refreshing a dashboard for `ctx.workspace_id`, the backend hydrates an isolated, sandboxed in-memory DuckDB cursor with **only** that workspace's tables and metrics.
3. **Stage C — AI Query & Visual Template Planning (`gpt-6.1-sol` via `AIGateway`):** `gpt-6.1-sol` (`AITaskType.DASHBOARD_SQL_PLANNING`, `reasoning="low"`/`"medium"`) inspects the DuckDB table schemas (`DESCRIBE`), sample rows, and units, and outputs a structured `DashboardGenerationPlan` containing a read-only DuckDB `SELECT` query and a declarative **Apache ECharts** template (`dataset`-driven, containing **zero hardcoded data points**).
4. **Stage D — Deterministic SQL Execution & Validation Gate:** DuckDB executes the SQL query deterministically (`<10ms`). A Python Validation Gate verifies row counts, numeric types, unit/currency homogeneity, and provenance before injecting the deterministic result rows into `echarts_config.dataset.source`.

---

## 2. End-to-End Dashboard Generation Pipeline

```mermaid
sequenceDiagram
    autonumber
    participant Client as Next.js (/app/dashboard)
    participant Engine as FastAPI DashboardGenerationEngine
    participant PG as Supabase PostgreSQL (RLS)
    participant Duck as Ephemeral Sandboxed DuckDB
    participant OAI as AIGateway (OpenAI gpt-6.1-sol)

    Client->>Engine: POST /api/analytics/generate-dashboard (prompt or auto_discover=True)
    Engine->>PG: Fetch document_tables & extracted_metrics WHERE workspace_id = ctx.workspace_id
    alt Zero Tables and < 2 Metrics in Workspace
        Engine-->>Client: Return Corpus Intelligence Widgets (Topics/Categories) + Insufficient Numerical Data Info
    else Quantitative Tables / Metrics Available
        Engine->>Duck: Open ephemeral cursor -> Register tables (t_doc_1, workspace_kpis)
        Engine->>Duck: SET enable_external_access = false; SET lock_configuration = true;
        Engine->>Duck: Extract DESCRIBE schemas, distinct units/currencies, and 3 sample rows
        Engine->>OAI: generate_structured(task=DASHBOARD_SQL_PLANNING, model=gpt-6.1-sol, schema=DashboardGenerationPlan)
        OAI-->>Engine: Plan (data_sufficient, sql_query, unit_currency, chart_type, echarts_template, cited_chunk_ids)

        Engine->>Engine: Validation Gate 1: AST/Regex SQL Safety Check (SELECT/WITH only)
        Engine->>Duck: Execute sql_query (timeout=2000ms)
        alt SQL Execution Error (e.g. column name typo)
            Engine->>OAI: 1-Step Self-Correction Retry with DuckDB error message
            OAI-->>Engine: Corrected sql_query
            Engine->>Duck: Execute corrected sql_query
        end
        Duck-->>Engine: Deterministic Result DataFrame (rows, columns)
        Engine->>Engine: Validation Gate 2: Check row_count >= 2, no NaN/Inf, single unit_currency per axis
        Engine->>Engine: Bind deterministic rows into echarts_template.dataset.source
        Engine->>PG: Resolve cited_chunk_ids -> page_number & bounding_boxes + Save widget to public.dashboard_widgets
        Engine-->>Client: Return verified DashboardWidget (echarts_config, kpi_summary, sql_query, citations)
    end
```

---

## 3. Why Ephemeral Workspace-Scoped DuckDB Beats Global `:memory:` (`ADR-011`)

In the existing repository (`apps/api/app/services/duckdb_service.py`), `duckdb_engine = DuckDBAnalyticsEngine()` creates a single global `duckdb.connect(':memory:')` instance when the FastAPI process starts.

### Three Fatal Flaws of a Global `:memory:` Singleton:
1. **Volatility Across Restarts:** Every time FastAPI restarts or deploys, `:memory:` is wiped clean, breaking every saved dashboard widget.
2. **Cross-Tenant Namespace Collisions & Leakage:** If User A and User B both upload `sales_data`, registering DataFrames into a single shared DuckDB connection risks overwriting or querying another tenant's table.
3. **Permanent Configuration Lock:** Once `SET lock_configuration = true` is executed after `SET enable_external_access = false`, configuration is locked for the lifetime of that DuckDB connection.

### The Target Solution: PostgreSQL Persistence + Ephemeral DuckDB Cursor
- **Storage of Record:** During ingestion (`DOC-10`), extracted tables are stored as typed JSONB rows in `public.document_tables` (`id`, `workspace_id`, `doc_id`, `table_name`, `page_number`, `bbox`, `columns_schema jsonb`, `rows_data jsonb`), and standalone KPIs are stored in `public.extracted_metrics` (`id`, `workspace_id`, `doc_id`, `chunk_id`, `metric_name`, `numeric_value`, `unit_or_currency`, `period_label`).
- **On-Demand Hydration (`<15ms`):** When a dashboard query runs for `ctx.workspace_id`:
  1. Instantiate a fresh `conn = duckdb.connect(':memory:')` inside a Python context manager (`with WorkspaceDuckDBSandbox(ctx.workspace_id) as sandbox:`).
  2. Register the workspace's `extracted_metrics` as table `workspace_metrics` and each relevant `document_tables` entry as `doc_table_{short_id}`.
  3. Immediately execute:
     ```sql
     SET enable_external_access = false;
     SET memory_limit = '256MB';
     SET threads = 2;
     SET lock_configuration = true;
     ```
  4. Run the validated `SELECT` query, extract the result rows, and close `conn`.

---

## 4. Structured Output Contract: `DashboardGenerationPlan`

```python
from pydantic import BaseModel, Field
from typing import Literal

class EChartsSeriesSpec(BaseModel):
    type: Literal["bar", "line", "pie", "scatter", "area"]
    name: str
    x_dimension: str = Field(description="Column name from SQL SELECT result for X axis / category")
    y_dimension: str = Field(description="Column name from SQL SELECT result for Y axis / numeric value")
    unit_label: str = Field(description="Unit or currency symbol for tooltips and axis, e.g. 'USD ($M)', '%'")

class DashboardGenerationPlan(BaseModel):
    data_sufficient: bool = Field(
        description="True ONLY if the available schema contains valid comparable data to answer the query."
    )
    insufficient_reason: str | None = Field(
        description="If data_sufficient is False, explain clearly what data is missing and what is available instead."
    )
    unit_consistency_verified: bool = Field(
        description="True if all aggregated numbers share the same unit/currency or are grouped separately by unit."
    )
    discrepancy_warning: str | None = Field(
        description="Populated if two source documents report conflicting values for the same metric/period."
    )
    widget_title: str
    widget_subtitle: str
    widget_type: Literal["echarts_chart", "kpi_card_group", "comparison_table", "insufficient_data_card"]
    sql_query: str | None = Field(
        description="Read-only DuckDB SELECT query. Must select explicit column aliases matching x_dimension and y_dimension, plus a proof unit column if applicable."
    )
    series_specs: list[EChartsSeriesSpec]
    narrative_insight: str = Field(
        description="Concise 2-sentence analytical explanation of what the query measures, with [cite:CHUNK_ID] or [table:TABLE_ID] references."
    )
    source_table_ids: list[str]
    source_chunk_ids: list[str]
```

> **Crucial Design Detail (`ADR-012`):** Notice that `DashboardGenerationPlan` **does not allow `gpt-6.1-sol` to output the chart's data array (`[120, 150, ...]`)**! `gpt-6.1-sol` only outputs `sql_query` and `series_specs` (`x_dimension`, `y_dimension`, `type`). The Python backend executes `sql_query` in DuckDB and populates the Apache ECharts `dataset.source` array directly from DuckDB's deterministic output!

---

## 5. Five-Gate Numerical & Security Validation Layer (`PR-035`, `PR-036`, `PR-040`)

Before any widget is returned to the frontend or saved to `public.dashboard_widgets`, it must pass **all 5 deterministic validation gates**:

| Gate | Check Performed | Action if Check Fails |
|---|---|---|
| **Gate 1: SQL AST & Keyword Sandbox Check** | 1. Strip whitespace; verify query starts with `SELECT` or `WITH`.<br/>2. Reject any `;` (multi-statement), `--`, or `/*`.<br/>3. Word-boundary regex check rejecting `\b(DROP|DELETE|INSERT|UPDATE|ALTER|CREATE|COPY|ATTACH|DETACH|PRAGMA|SET|INSTALL|LOAD|EXPORT|IMPORT|CALL|READ_CSV|READ_TEXT|READ_PARQUET|READ_JSON|GLOB)\b`. | Reject immediately (`ValueError("Unsafe SQL blocked")`); never execute in DuckDB. |
| **Gate 2: Deterministic DuckDB Execution & Self-Repair** | Execute query in the locked-down DuckDB cursor with a `2,000ms` execution timeout. | If DuckDB raises `BinderException` or `CatalogException`, run 1 automatic repair turn with `gpt-6.1-sol` (failing over to `gpt-6.1-terra` if needed). If repair fails, return an honest error card. |
| **Gate 3: Row Cardinality & NaN/Infinity Check** | Verify result set has `1 <= len(rows) <= 500` (for KPI cards, `len(rows) >= 1`; for charts, `len(rows) >= 2`). Verify numeric columns (`y_dimension`) are non-null, finite numbers (`not math.isnan(v) and not math.isinf(v)`). | If `len(rows) < 2` for a chart, downgrade widget to a `kpi_card` (if 1 row) or `insufficient_data_card` (if 0 rows) (`PR-038`). |
| **Gate 4: Unit & Currency Homogeneity Gate (`PR-036`)** | When querying `workspace_metrics`, verify that any `SUM()` or `AVG()` aggregation groups by `unit_or_currency` (or filters `WHERE unit_or_currency = 'USD'`). If the result rows mix incompatible units in a single series, block the aggregation. | Prevent plotting mixed currencies on one axis; split into unit-specific series or show unit conflict alert (`EC-031`). |
| **Gate 5: Source Provenance Verification (`PR-037`)** | Verify every ID in `source_table_ids` and `source_chunk_ids` belongs to `ctx.workspace_id`, and attach its verified `(doc_id, doc_title, page_number, bounding_boxes)` metadata. | Strip any unverified ID; require at least 1 valid source document reference per widget. |
