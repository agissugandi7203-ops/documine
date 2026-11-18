# 21 — API Responsibility Maps, System Contracts & Payload Schemas

> **Document ID:** `DOC-21`  
> **Status:** `[PROPOSED]` End-to-End API Specification (Master Task Section 9)  
> **Related Documents:** [07-AUTHENTICATION-AND-IDENTITY.md](file:///c:/Users/arief/Downloads/WAICY/docs/documind-blueprint/07-AUTHENTICATION-AND-IDENTITY.md), [13-AI-ASSISTANT.md](file:///c:/Users/arief/Downloads/WAICY/docs/documind-blueprint/13-AI-ASSISTANT.md), [15-DASHBOARD-GENERATION-ENGINE.md](file:///c:/Users/arief/Downloads/WAICY/docs/documind-blueprint/15-DASHBOARD-GENERATION-ENGINE.md), [20-DATA-MODEL-AND-ERD.md](file:///c:/Users/arief/Downloads/WAICY/docs/documind-blueprint/20-DATA-MODEL-AND-ERD.md)

---

## 1. Purpose & Responsibility Separation

This document defines the boundary and contracts between:
1. **Next.js App Router BFF Layer (`apps/web/app/api/*`):** Handles browser cookie session management, Origin CSRF enforcement, OAuth redirects, and transparent `Authorization: Bearer <access_token>` proxying (`/api/proxy/[...path]`).
2. **FastAPI Intelligence & Data Backend (`apps/api/app/routers/*`):** Enforces JWT & `WorkspaceContext` authorization, executes the 15-stage ingestion pipeline, runs Hybrid RRF search, orchestrates `OpenAIRouterService`, executes sandboxed DuckDB queries, and manages PostgreSQL persistence.

---

## 2. Complete Endpoint Responsibility Matrix

### 2.1 Next.js Auth & Proxy Routes (`apps/web/app/api/*`)

| Method & Route | Responsibility | Auth Requirement | Upstream Target |
|---|---|---|---|
| `POST /api/auth/signup` | Validate email/password, register user in Supabase Auth, trigger workspace provisioning. | Public + Origin CSRF check | Supabase Auth |
| `POST /api/auth/login` | Authenticate email/password, set HTTP-only session cookies. | Public + Origin CSRF check | Supabase Auth |
| `POST /api/auth/oauth/google` | Initiate Google OAuth 2.0 PKCE redirect flow. | Public + Origin CSRF check | Supabase Auth |
| `GET /api/auth/callback` | Exchange OAuth/Verification/Recovery `code` for session cookie; redirect to `/app/dashboard`. | Public | Supabase Auth |
| `POST /api/auth/forgot-password` | Trigger password reset email (`supabaseRecoverPassword`) with IP/email rate limiting (`[VERIFIED]` Implemented). | Public + Bot/Rate-Limit check | Supabase Auth |
| `GET/POST /api/auth/recovery-session` | Verify password recovery token/OTP/PKCE code and set `RECOVERY_COOKIE` (`[VERIFIED]` Implemented). | Public / Recovery Token | Supabase Auth |
| `POST /api/auth/reset-password` | Update user's password using `RECOVERY_COOKIE` and revoke recovery session (`[VERIFIED]` Implemented). | Recovery Session Cookie | Supabase Auth |
| `POST /api/auth/resend-verification` | Resend signup verification email with rate limiting (`[VERIFIED]` Implemented). | Public + Rate-Limit check | Supabase Auth |
| `POST /api/auth/logout` | Sign out and clear session cookies. | Session Cookie + CSRF check | Supabase Auth |
| `GET /api/auth/me` | Return current authenticated user profile + active `workspace_id`. | Session Cookie | Supabase Auth + FastAPI |
| `ALL /api/proxy/[...path]` | Extract `session.access_token` from cookie and forward request (including multipart uploads & SSE streams) to `FASTAPI_URL/api/{path}`. | Session Cookie (+ CSRF check on mutating methods) | FastAPI `/api/*` |

---

### 2.2 FastAPI Core Domain Endpoints (`apps/api/app/routers/*`)

All endpoints below (except `GET /health`) require `Depends(get_verified_workspace_context)` (`PR-001`, `PR-007`):

| Domain | Method & FastAPI Path | Purpose | Primary Request / Query Params | Response Contract |
|---|---|---|---|---|
| **Identity** | `GET /api/auth/session` | Verify JWT and return user + provisioned default `workspace_id`. | Header `Authorization: Bearer <JWT>` | `SessionResponse` |
| **Identity** | `DELETE /api/auth/account` | Atomic account, storage, and workspace deletion cascade (`PR-004`). | `{"confirmation": "DELETE"}` | `{"deleted": true}` |
| **Pillar A: Repository** | `GET /api/documents` | List, search, filter, and sort workspace documents (`PR-011`, `PR-015`). | `?q=&status=&category=&tags=&has_tables=&sort_by=created_at&sort_dir=desc&page=1&page_size=25` | `PaginatedDocumentsResponse` |
| **Pillar A: Repository** | `POST /api/documents/upload` | Validate, deduplicate (`SHA-256`), store in Supabase Storage, and queue 15-stage ingestion (`PR-012`, `PR-013`). | `multipart/form-data`: `file`, `on_duplicate` (`skip`\|`replace`) | `DocumentUploadResponse` (`202 Accepted` or `200 OK` if duplicate) |
| **Pillar A: Repository** | `GET /api/documents/{doc_id}` | Fetch full document metadata, executive summary, key findings, topics, entities, extracted table schemas, and job status (`PR-016`). | Path `doc_id: UUID` | `DocumentDetailResponse` |
| **Pillar A: Repository** | `GET /api/documents/{doc_id}/status` | Lightweight polling endpoint for active ingestion stage & progress percentage (`PR-014`). | Path `doc_id: UUID` | `DocumentJobStatusResponse` |
| **Pillar A: Repository** | `GET /api/documents/{doc_id}/file` | Stream original PDF binary (or return 60s signed URL) after verifying `workspace_id` ownership (`PR-008`). | Path `doc_id: UUID` | `application/pdf` stream |
| **Pillar A: Repository** | `POST /api/documents/{doc_id}/reprocess` | Retry failed ingestion from last checkpoint or force full re-index (`PR-018`, `PR-046`). | `{"force_full": false}` | `DocumentJobStatusResponse` |
| **Pillar A: Repository** | `PATCH /api/documents/{doc_id}` | Update user-editable title or `user_tags`. | `{"title": "...", "user_tags": [...]}` | `DocumentSummaryItem` |
| **Pillar A: Repository** | `DELETE /api/documents/{doc_id}` | Delete document, storage file, chunks, tables, relationships, and flag dependent dashboard widgets (`PR-018`). | Path `doc_id: UUID` | `DocumentDeleteResponse` |
| **Pillar C: Search** | `POST /api/search/hybrid` | Execute Hybrid RRF search (`pgvector` HNSW + GIN FTS) across single-doc, subset, or repository scope (`PR-025`). | `HybridSearchRequest` | `HybridSearchResponse` |
| **Pillar C: AI Assistant** | `POST /api/chat/stream` | SSE streaming grounded Q&A with deterministic citation resolution (`PR-027`–`PR-030`). | `ChatStreamRequest` | `text/event-stream` (`status`, `token_delta`, `citations_verified`, `error`) |
| **Pillar C: AI Assistant** | `POST /api/chat/message` | Non-streaming JSON alternative to `/api/chat/stream` (retains backward compatibility). | `ChatStreamRequest` | `ChatMessageResponse` |
| **Pillar C: AI Assistant** | `GET /api/chat/conversations` | List saved conversation threads for workspace (filterable by `doc_id`). | `?doc_id=&limit=20` | `list[ConversationSummary]` |
| **Pillar C: Relationships** | `GET /api/relationships` | Fetch document relationship edges (`shared_topics`, `shared_entities`, `semantic_similarity`, `contradictory_claims`) (`PR-031`). | `?doc_id=&min_confidence=0.30` | `RelationshipGraphResponse` |
| **Pillar C: Synthesis** | `POST /api/synthesis/compare` | Run `gpt-6.1-sol` Cross-Document Comparative Synthesis & Contradiction detection across 2–10 docs (`PR-032`). | `SynthesisCompareRequest` | `CrossDocumentSynthesisResponse` |
| **Pillar B: Dashboard** | `GET /api/dashboard/overview` | Fetch personalized dashboard: Corpus Profile, Tier-1 Telemetry, and active Tier-2/Tier-3 widgets (`PR-033`, `PR-034`). | `?category_filter=` | `PersonalizedDashboardResponse` |
| **Pillar B: Dashboard** | `POST /api/analytics/generate-dashboard` | Generate a new validated DuckDB + ECharts widget from a natural-language query or table ID (`PR-035`–`PR-038`). | `GenerateWidgetRequest` | `DashboardWidgetResponse` |
| **Pillar B: Dashboard** | `PATCH /api/dashboard/widgets/{widget_id}` | Pin/unpin, rename, resize, reorder, or refresh a saved dashboard widget (`PR-039`). | `UpdateWidgetRequest` | `DashboardWidgetResponse` |
| **Pillar B: Dashboard** | `DELETE /api/dashboard/widgets/{widget_id}` | Remove a widget from the user's Personalized Dashboard. | Path `widget_id: UUID` | `{"deleted": true}` |
| **P2 Studio Tools** | `POST /api/chat/quiz` | Generate comprehension quiz with deterministic `source_chunk_id` $\rightarrow$ `BoundingBox` lookup (`PR-047`). | `{"doc_id": "...", "num_questions": 5}` | `QuizResponse` |
| **P2 Studio Tools** | `POST /api/audio/briefing-script` | Generate dual-host conversational audio briefing script with per-turn citation pointers (`PR-047`). | `{"doc_id": "...", "language": "id"}` | `PodcastScriptResponse` |

---

## 3. Sample Payload Structures & Standard Error Envelope

### 3.1 Standardized Error Envelope (All 4xx / 5xx Responses)
Every error returned by FastAPI or the Next.js proxy uses a predictable JSON structure so the UI can render localized messages and retry buttons:

```json
{
  "error": {
    "code": "ERR_PDF_PASSWORD_PROTECTED",
    "message": "Dokumen PDF ini dilindungi kata sandi. Harap buka kunci PDF sebelum mengunggah.",
    "retryable": false,
    "request_id": "req_01JCP9X8A2...",
    "details": {
      "filename": "Confidential_Report.pdf"
    }
  }
}
```

### 3.2 Sample `GET /api/dashboard/overview` Response (`PersonalizedDashboardResponse`)
```json
{
  "workspace_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "detected_corpus_profile": "quantitative_corporate",
  "telemetry": {
    "total_documents": 10,
    "ready_documents": 10,
    "processing_documents": 0,
    "total_pages_indexed": 184,
    "total_tables_extracted": 16,
    "total_verified_kpis": 38,
    "categories_breakdown": [
      { "category": "financial_report", "count": 8 },
      { "category": "spreadsheet_dataset", "count": 2 }
    ],
    "top_topics": [
      { "name": "Operating Revenue", "doc_count": 8 },
      { "name": "CAPEX Efficiency", "doc_count": 6 }
    ]
  },
  "widgets": [
    {
      "id": "w_8812...",
      "title": "Quarterly Operating Revenue vs. Net Income (2026)",
      "subtitle": "Aggregated across Q1–Q4 Financial Filings",
      "widget_type": "echarts_chart",
      "status": "active",
      "is_auto_generated": true,
      "is_pinned": true,
      "unit_or_currency": "USD ($M)",
      "sql_query": "SELECT period_label AS quarter, SUM(CASE WHEN canonical_metric_key='operating_revenue' THEN numeric_value END) AS revenue_usd_m, SUM(CASE WHEN canonical_metric_key='net_income' THEN numeric_value END) AS net_income_usd_m FROM workspace_metrics WHERE unit_or_currency = 'USD ($M)' GROUP BY period_label ORDER BY period_label ASC",
      "narrative_insight": "Operating revenue grew 24.1% from Q1 ($11.4M) to Q4 ($14.15M), while net margin expanded by 320 bps [cite:chk_104].",
      "echarts_config": {
        "dataset": {
          "dimensions": ["quarter", "revenue_usd_m", "net_income_usd_m"],
          "source": [
            { "quarter": "2026-Q1", "revenue_usd_m": 11.4, "net_income_usd_m": 2.1 },
            { "quarter": "2026-Q2", "revenue_usd_m": 12.8, "net_income_usd_m": 2.5 },
            { "quarter": "2026-Q3", "revenue_usd_m": 13.5, "net_income_usd_m": 2.9 },
            { "quarter": "2026-Q4", "revenue_usd_m": 14.15, "net_income_usd_m": 3.4 }
          ]
        },
        "xAxis": { "type": "category" },
        "yAxis": { "type": "value", "name": "USD ($M)" },
        "series": [
          { "type": "bar", "name": "Operating Revenue ($M)", "encode": { "x": "quarter", "y": "revenue_usd_m" } },
          { "type": "line", "name": "Net Income ($M)", "encode": { "x": "quarter", "y": "net_income_usd_m" } }
        ]
      },
      "sources": [
        {
          "doc_id": "doc_01",
          "doc_title": "Q3_2026_Financial_Report.pdf",
          "page_number": 4,
          "chunk_id": "chk_104",
          "bounding_boxes": [{ "page_number": 4, "x0": 0.11, "y0": 0.25, "x1": 0.89, "y1": 0.52 }]
        }
      ]
    }
  ]
}
```
