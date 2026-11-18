# 28 — Finalized Decisions vs. Remaining Human Decisions

> **Document ID:** `DOC-28`  
> **Status:** **`DECIDED`** Governance Register (Autonomous Decision Mode, Master Task Section 6)  
> **Related Documents:** [00-START-HERE.md](file:///c:/Users/arief/Downloads/WAICY/docs/documind-blueprint/00-START-HERE.md), [26-ARCHITECTURE-DECISIONS.md](file:///c:/Users/arief/Downloads/WAICY/docs/documind-blueprint/26-ARCHITECTURE-DECISIONS.md), [30-FINAL-SELECTED-ARCHITECTURE-AND-DECISIONS.md](file:///c:/Users/arief/Downloads/WAICY/docs/documind-blueprint/30-FINAL-SELECTED-ARCHITECTURE-AND-DECISIONS.md)

---

## 1. Purpose & Three-Tier Classification Rule

Per Master Task Section 6 (**Distinguish Between Decisions and Genuine Open Questions**):
> *"I do not want an unnecessarily large list of questions waiting for my approval. Classify decisions into: **DECIDED**, **RECOMMENDED — AWAITING OPTIONAL APPROVAL**, and **HUMAN DECISION REQUIRED**. For technical choices, default to autonomous decision-making."*

We have reviewed all 15 previously open questions (`OQ-001`–`OQ-015`) and resolved **12 of them autonomously into `DECIDED` or `RECOMMENDED — AWAITING OPTIONAL APPROVAL`**, leaving only **3 genuine `HUMAN DECISION REQUIRED` items** that depend on external legal/commercial policy.

---

## 2. Tier 1: `DECIDED` (Autonomously Resolved Technical & Product Decisions)

These 10 former open questions have been **definitively resolved** through technical analysis and are baked into the target architecture (`DOC-26`, `DOC-30`). Implementation should proceed directly with these decisions:

| Former ID | Subject | Final Autonomous Decision (`DECIDED`) | Condition That Would Cause Reconsideration |
|---|---|---|---|
| **`OQ-002`** | **Frontend Consolidation (`apps/web` vs `index.html`)** | **`DECIDED` (`ADR-001`, `ADR-022`):** Consolidate 100% of the production UI in Next.js 14 App Router (`apps/web`) and archive root `index.html`/`main.js`. | None (maintaining two frontends is pure technical debt). |
| **`OQ-003`** | **Supported File Formats in Repository** | **`DECIDED` (`PR-012`):** Support `.pdf` (digital + scanned), `.csv`, and `.xlsx` in the ingestion pipeline starting in Stage 2. Reject `.docx`/`.pptx` initially with a prompt to upload as PDF. | If user telemetry shows high demand for native `.docx` uploads without PDF export, add `python-docx` converter in Stage 6. |
| **`OQ-004`** | **Personalized Dashboard Customization Model** | **`DECIDED` (`ADR-010`, `PR-039`):** Provide structured customization (Natural-Language Widget Creation, Pin/Unpin from Studio/Explore, Reorder, Half/Full-Width Toggle, Rename, Delete) persisted in `public.dashboard_widgets`. | Only add free-form 2D drag-and-drop (`react-grid-layout`) if users report structured cards are too rigid. |
| **`OQ-005`** | **Document Deletion Impact on Dashboard & Synthesis** | **`DECIDED` (`PR-018`, `PR-039`):** On document delete, automatically re-execute deterministic DuckDB SQL widgets (\$0 cost) if $\ge 1$ source doc remains; mark `stale_source_deleted` if 0 docs remain; mark saved `gpt-6.1-sol` synthesis cards as `"Source Updated — Click to Refresh"`. | None. |
| **`OQ-006`** | **Audio Briefing Playback Strategy** | **`DECIDED` (`ADR-015`):** Use `gpt-6-luna` script generation + free Browser Web Speech API (`window.speechSynthesis`) as the default playback mechanism inside the Document Studio `P2` tab, keeping `gpt-realtime-2.1-mini` server-side MP3 rendering behind an opt-in config flag (`ENABLE_STUDIO_TTS=False`). | Enable `ENABLE_STUDIO_TTS=True` if premium users request downloadable offline MP3 files. |
| **`OQ-008`** | **Upload Size & Page Limits** | **`DECIDED` (`PR-012`):** Enforce `MAX_UPLOAD_SIZE_MB=50` (50 MB) and `MAX_PDF_PAGES=300` (300 pages) per file via environment-configurable settings. | Increase via env var on Railway if specific institutional users upload 500-page textbooks. |
| **`OQ-009`** | **Multi-Currency & Multi-Unit Aggregation Handling** | **`DECIDED` (`ADR-011`, `PR-036`):** Never apply automatic currency exchange rates across financial documents. Validation Gate 4 enforces unit/currency homogeneity per series (grouping `USD` and `IDR` into separate labeled series). | None (auto-converting historical financial statements with spot FX rates is analytically invalid). |
| **`OQ-011`** | **Email Verification Handling** | **`DECIDED` (`DOC-07`):** Enforce email verification via `apps/web/middleware.ts` (`safe.emailVerified`) in production, with `/api/auth/resend-verification` already implemented. | In local development without SMTP, toggle Supabase `enable_confirmations = false` in local config. |
| **`OQ-012`** | **Task-to-Model Routing & `gpt-6-astra` Usage** | **`DECIDED` (`ADR-006`, `ADR-008`):** Use `text-embedding-3-large` (`dims=1536`) for embeddings, `gpt-6.1-terra` for Stage 11 Understanding, OCR & Standard Q&A, `gpt-6.1-sol` for Dashboard SQL Planning, Deep Q&A & Cross-Doc Synthesis, and `gpt-6-luna` for routing/rewriting. Keep `gpt-6-astra` disabled by default (`ENABLE_ASTRA_ESCALATION=False`). | Enable `gpt-6-astra` only if an enterprise legal/medical tier explicitly pays for 5x higher token rates. |
| **`OQ-014` & `OQ-015`** | **Automatic Relationship Indexing & `/dashboard` Routing** | **`DECIDED` (`ADR-001`, `ADR-013`):** Run Stage 13 SQL/`pgvector` relationship discovery automatically on every upload (\$0 LLM cost, `<50ms`), and keep `/dashboard` seamlessly aliased/redirected to `/app/dashboard`. | None. |

---

## 3. Tier 2: `RECOMMENDED — AWAITING OPTIONAL APPROVAL`

These 2 product-UX decisions have a clear, active engineering default selected so **implementation is NOT blocked**, but you may optionally override them at any time:

| ID | Subject | Selected Default Direction (`Active Unless Vetoed`) | Why Optional Stakeholder Input Is Useful |
|---|---|---|---|
| **`OQ-001`** | **Initial Workspace UI Mode (Personal Workspace Only vs. Team Invite UI in MVP)** | **Active Default:** Launch Stages 1–5 with **Personal Workspaces in the UI** (`1 user = 1 automatic isolated workspace`), while deploying the full `public.workspaces` + `public.workspace_members` database schema (`ADR-004`) in Stage 1. | If you want company users to share a workspace with colleagues in the very first release rather than `P3`, we can add the `"Invite Member"` modal in Stage 5 (~2 extra days). |
| **`OQ-007`** | **Default UI Language (English vs. Indonesian vs. Bilingual Toggle)** | **Active Default:** Provide a clean **English UI with an Indonesian (`ID / EN`) language toggle**, while the AI Assistant, Dashboard Insights, and Synthesis **automatically respond in the language the user types their question in**. | Confirms whether Indonesian (`ID`) or English (`EN`) should be the initial default before the user clicks the toggle. |

---

## 4. Tier 3: `HUMAN DECISION REQUIRED` (Business, Legal & Billing Policy Only)

Only these **3 non-technical business/policy questions** cannot be inferred from software architecture alone. **Note:** Even for these 3 items, safe technical defaults (`store=False`, configurable env vars) are already built into the design so **Stage 1–6 engineering can proceed immediately**:

| ID | Category | Business / Policy Question (`HUMAN DECISION REQUIRED`) | Safe Technical Default Built Into Architecture |
|---|---|---|---|
| **`HD-001`** *(formerly `OQ-010`)* | **Commercial / Per-User Quota Policy** | **What monthly AI spending cap (in USD) should a single user account be allowed to consume before being rate-limited or downgraded to `gpt-6-luna`?** | `config.py` defines `DEFAULT_WORKSPACE_MONTHLY_BUDGET_USD=5.00` (soft warning at `\$2.50`), enforced via `public.ai_usage_logs`. Changeable anytime via Railway env var. |
| **`HD-002`** *(formerly `OQ-013`)* | **Legal / Data Residency & ZDR Compliance** | **Do your target institutional/company customers require data to stay within a specific geographic OpenAI endpoint (e.g., Singapore `sg.api.openai.com` or EU `eu.api.openai.com` at +10% token cost) or require a signed HIPAA/Enterprise ZDR contract?** | `OpenAIResponsesAdapter` enforces `store=False` on all calls (`ADR-016`) and reads `OPENAI_BASE_URL` from env vars so switching to a regional endpoint requires zero code changes. |
| **`HD-003`** | **Infrastructure Account Provisioning** | **Which Railway project and Supabase Pro project credentials should be used when transitioning from local development to cloud staging/production?** | Local development uses `.env` / `.env.local`; production deployment on Railway simply injects the target `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `REDIS_URL`, and `OPENAI_API_KEY`. |
