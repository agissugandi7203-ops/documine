-- =============================================================================
-- DOCUMIND COMPLETE 19-ENTITY PRODUCTION SCHEMA & MULTI-TENANT RLS MIGRATION
-- Document References: DOC-08, DOC-12, DOC-16, DOC-20, ADR-002, ADR-003, ADR-006, ADR-013
-- Self-contained, 100% idempotent migration safe to run on a fresh Supabase DB
-- or on top of any existing initial schema.
-- =============================================================================

set search_path = public, extensions;

create extension if not exists vector;
create extension if not exists "uuid-ossp";

-- -----------------------------------------------------------------------------
-- 1. WORKSPACES & WORKSPACE MEMBERS (Tenant Isolation Boundary - ADR-003)
-- -----------------------------------------------------------------------------
create table if not exists public.workspaces (
    id uuid primary key default gen_random_uuid(),
    name text not null default 'Personal Workspace',
    created_at timestamptz not null default now()
);

alter table public.workspaces
    add column if not exists owner_id uuid references auth.users(id) on delete cascade,
    add column if not exists is_personal boolean not null default true,
    add column if not exists settings jsonb not null default '{}'::jsonb,
    add column if not exists created_at timestamptz not null default now(),
    add column if not exists updated_at timestamptz not null default now();

create index if not exists idx_workspaces_owner_id on public.workspaces(owner_id);

create table if not exists public.workspace_members (
    workspace_id uuid not null references public.workspaces(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade,
    role text not null default 'owner' check (role in ('owner', 'editor', 'viewer')),
    joined_at timestamptz not null default now(),
    primary key (workspace_id, user_id)
);

create index if not exists idx_workspace_members_user_id on public.workspace_members(user_id);

-- Security-definer helper for Row-Level Security (RLS)
create or replace function public.is_workspace_member(ws_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public, extensions
as $$
    select exists (
        select 1
        from public.workspace_members wm
        where wm.workspace_id = ws_id
          and wm.user_id = auth.uid()
    )
    or exists (
        select 1
        from public.workspaces w
        where w.id = ws_id
          and w.owner_id = auth.uid()
    );
$$;

-- -----------------------------------------------------------------------------
-- 2. DOCUMENTS & DOCUMENT PAGES (Pillar A: Document Repository - DOC-09, DOC-10)
-- -----------------------------------------------------------------------------
create table if not exists public.documents (
    id uuid primary key default gen_random_uuid(),
    workspace_id uuid not null references public.workspaces(id) on delete cascade,
    title text not null,
    storage_path text not null,
    file_type text not null default 'pdf',
    page_count integer not null default 1,
    file_size_bytes bigint,
    processing_status text not null default 'pending',
    metadata jsonb default '{}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

alter table public.documents
    add column if not exists workspace_id uuid references public.workspaces(id) on delete cascade,
    add column if not exists uploaded_by uuid references auth.users(id) on delete set null,
    add column if not exists title text,
    add column if not exists original_filename text,
    add column if not exists storage_path text,
    add column if not exists file_type text default 'pdf',
    add column if not exists file_sha256 text,
    add column if not exists mime_type text default 'application/pdf',
    add column if not exists page_count integer not null default 1,
    add column if not exists file_size_bytes bigint,
    add column if not exists processing_status text not null default 'pending',
    add column if not exists status text not null default 'queued',
    add column if not exists category text default 'general_document',
    add column if not exists primary_domain text,
    add column if not exists language_code text default 'id',
    add column if not exists summary text,
    add column if not exists key_findings jsonb not null default '[]'::jsonb,
    add column if not exists main_topics text[] not null default '{}'::text[],
    add column if not exists key_dates text[] not null default '{}'::text[],
    add column if not exists user_tags text[] not null default '{}'::text[],
    add column if not exists has_tables boolean not null default false,
    add column if not exists table_count integer not null default 0,
    add column if not exists metric_count integer not null default 0,
    add column if not exists ingestion_version integer not null default 1,
    add column if not exists centroid_embedding vector(1536),
    add column if not exists metadata jsonb default '{}'::jsonb,
    add column if not exists error_message text,
    add column if not exists created_at timestamptz not null default now(),
    add column if not exists updated_at timestamptz not null default now(),
    add column if not exists processed_at timestamptz;

create unique index if not exists idx_documents_workspace_sha256
    on public.documents(workspace_id, file_sha256)
    where file_sha256 is not null;

create index if not exists idx_documents_workspace_status
    on public.documents(workspace_id, status, created_at desc);

create index if not exists idx_documents_workspace_category
    on public.documents(workspace_id, category);

create index if not exists idx_documents_user_tags_gin
    on public.documents using gin (user_tags);

create table if not exists public.document_pages (
    id uuid primary key default gen_random_uuid(),
    workspace_id uuid not null references public.workspaces(id) on delete cascade,
    doc_id uuid not null references public.documents(id) on delete cascade,
    page_number integer not null,
    width_pt double precision not null default 612.0,
    height_pt double precision not null default 792.0,
    digital_word_count integer not null default 0,
    image_area_ratio double precision not null default 0.0,
    needs_ocr boolean not null default false,
    ocr_status text not null default 'not_needed' check (ocr_status in ('not_needed', 'pending', 'completed', 'failed')),
    created_at timestamptz not null default now(),
    unique (doc_id, page_number)
);

alter table public.document_pages
    add column if not exists created_at timestamptz not null default now();

create index if not exists idx_document_pages_doc_id on public.document_pages(doc_id, page_number);

-- -----------------------------------------------------------------------------
-- 3. CHUNKS (Coordinate-Preserving Passages + 1536-d Embeddings - DOC-11, DOC-12)
-- -----------------------------------------------------------------------------
create table if not exists public.chunks (
    id uuid primary key default gen_random_uuid(),
    document_id uuid references public.documents(id) on delete cascade,
    doc_id uuid references public.documents(id) on delete cascade,
    workspace_id uuid not null references public.workspaces(id) on delete cascade,
    chunk_index integer not null default 0,
    content text,
    text_content text,
    page_number integer not null default 1,
    bounding_boxes jsonb not null default '[]'::jsonb,
    embedding vector(1536),
    embedding_model text not null default 'openai:text-embedding-3-large:1536',
    token_count integer,
    has_table boolean not null default false,
    metadata jsonb default '{}'::jsonb,
    created_at timestamptz not null default now()
);

alter table public.chunks
    add column if not exists document_id uuid references public.documents(id) on delete cascade,
    add column if not exists doc_id uuid references public.documents(id) on delete cascade,
    add column if not exists workspace_id uuid references public.workspaces(id) on delete cascade,
    add column if not exists chunk_index integer not null default 0,
    add column if not exists content text,
    add column if not exists text_content text,
    add column if not exists page_number integer not null default 1,
    add column if not exists bounding_boxes jsonb not null default '[]'::jsonb,
    add column if not exists embedding vector(1536),
    add column if not exists embedding_model text not null default 'openai:text-embedding-3-large:1536',
    add column if not exists token_count integer,
    add column if not exists has_table boolean not null default false,
    add column if not exists metadata jsonb default '{}'::jsonb,
    add column if not exists created_at timestamptz not null default now();

-- Backfill doc_id and text_content from initial schema columns if present
update public.chunks
set doc_id = document_id
where doc_id is null and document_id is not null;

update public.chunks
set text_content = content
where text_content is null and content is not null;

-- Keep legacy (document_id, content) and canonical (doc_id, text_content) synchronized automatically
create or replace function public.sync_chunks_compatibility_columns()
returns trigger
language plpgsql
as $$
begin
    if new.doc_id is null and new.document_id is not null then
        new.doc_id := new.document_id;
    elsif new.document_id is null and new.doc_id is not null then
        new.document_id := new.doc_id;
    end if;

    if new.text_content is null and new.content is not null then
        new.text_content := new.content;
    elsif new.content is null and new.text_content is not null then
        new.content := new.text_content;
    end if;

    return new;
end;
$$;

drop trigger if exists trg_sync_chunks_compatibility on public.chunks;
create trigger trg_sync_chunks_compatibility
before insert or update on public.chunks
for each row execute function public.sync_chunks_compatibility_columns();

create index if not exists idx_chunks_embedding_hnsw on public.chunks
using hnsw (embedding vector_cosine_ops)
with (m = 16, ef_construction = 64);

create index if not exists idx_chunks_workspace_doc
    on public.chunks(workspace_id, doc_id, chunk_index);

create index if not exists idx_chunks_fts_simple
    on public.chunks using gin (to_tsvector('simple', coalesce(text_content, content, '')));

-- -----------------------------------------------------------------------------
-- 4. DOCUMENT TABLES & EXTRACTED METRICS (Pillar B: Analytical Data - DOC-15)
-- -----------------------------------------------------------------------------
create table if not exists public.document_tables (
    id uuid primary key default gen_random_uuid(),
    workspace_id uuid not null references public.workspaces(id) on delete cascade,
    doc_id uuid not null references public.documents(id) on delete cascade,
    table_name text not null,
    table_title text not null,
    page_number integer not null default 1,
    bbox jsonb not null default '{}'::jsonb,
    columns_schema jsonb not null default '[]'::jsonb,
    rows_data jsonb not null default '[]'::jsonb,
    row_count integer not null default 0,
    extraction_method text not null default 'pymupdf' check (extraction_method in ('pymupdf', 'vision_terra', 'spreadsheet')),
    created_at timestamptz not null default now()
);

alter table public.document_tables
    add column if not exists created_at timestamptz not null default now();

create index if not exists idx_document_tables_workspace_doc
    on public.document_tables(workspace_id, doc_id);

create table if not exists public.extracted_metrics (
    id uuid primary key default gen_random_uuid(),
    workspace_id uuid not null references public.workspaces(id) on delete cascade,
    doc_id uuid not null references public.documents(id) on delete cascade,
    source_chunk_id uuid references public.chunks(id) on delete cascade,
    metric_name text not null,
    canonical_metric_key text not null,
    numeric_value double precision not null,
    unit_or_currency text not null,
    period_label text,
    verbatim_quote text,
    created_at timestamptz not null default now()
);

alter table public.extracted_metrics
    add column if not exists created_at timestamptz not null default now();

create index if not exists idx_extracted_metrics_workspace_doc
    on public.extracted_metrics(workspace_id, doc_id);

-- -----------------------------------------------------------------------------
-- 5. TOPICS, ENTITIES & DOCUMENT RELATIONSHIPS (Pillar C - DOC-16, ADR-013)
-- -----------------------------------------------------------------------------
create table if not exists public.topics (
    id uuid primary key default gen_random_uuid(),
    workspace_id uuid not null references public.workspaces(id) on delete cascade,
    name text not null,
    slug text,
    description text,
    category text default 'concept',
    doc_count integer not null default 1,
    created_at timestamptz not null default now()
);

alter table public.topics
    add column if not exists workspace_id uuid references public.workspaces(id) on delete cascade,
    add column if not exists slug text,
    add column if not exists description text,
    add column if not exists category text default 'concept',
    add column if not exists doc_count integer not null default 1,
    add column if not exists created_at timestamptz not null default now();

update public.topics
set slug = lower(regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g'))
where slug is null;

create unique index if not exists idx_topics_workspace_slug
    on public.topics(workspace_id, slug)
    where slug is not null;

create table if not exists public.chunk_topics (
    chunk_id uuid not null references public.chunks(id) on delete cascade,
    topic_id uuid not null references public.topics(id) on delete cascade,
    workspace_id uuid references public.workspaces(id) on delete cascade,
    doc_id uuid references public.documents(id) on delete cascade,
    confidence real default 1.0,
    relevance_score real default 1.0,
    primary key (chunk_id, topic_id)
);

alter table public.chunk_topics
    add column if not exists workspace_id uuid references public.workspaces(id) on delete cascade,
    add column if not exists doc_id uuid references public.documents(id) on delete cascade,
    add column if not exists confidence real default 1.0,
    add column if not exists relevance_score real default 1.0;

create table if not exists public.entities (
    id uuid primary key default gen_random_uuid(),
    workspace_id uuid not null references public.workspaces(id) on delete cascade,
    name text not null,
    canonical_name text not null,
    entity_type text not null default 'other',
    created_at timestamptz not null default now(),
    unique (workspace_id, canonical_name, entity_type)
);

alter table public.entities
    add column if not exists created_at timestamptz not null default now();

create index if not exists idx_entities_workspace on public.entities(workspace_id, entity_type);

create table if not exists public.document_entities (
    workspace_id uuid not null references public.workspaces(id) on delete cascade,
    doc_id uuid not null references public.documents(id) on delete cascade,
    entity_id uuid not null references public.entities(id) on delete cascade,
    representative_chunk_id uuid references public.chunks(id) on delete set null,
    mention_count integer not null default 1,
    primary key (doc_id, entity_id)
);

create index if not exists idx_document_entities_workspace on public.document_entities(workspace_id, entity_id);

create table if not exists public.document_relationships (
    id uuid primary key default gen_random_uuid(),
    workspace_id uuid not null references public.workspaces(id) on delete cascade,
    source_doc_id uuid not null references public.documents(id) on delete cascade,
    target_doc_id uuid not null references public.documents(id) on delete cascade,
    relationship_type text not null check (
        relationship_type in (
            'shared_topics',
            'shared_entities',
            'semantic_similarity',
            'explicit_reference',
            'shared_metric_lineage',
            'contradiction_detected',
            'composite_related'
        )
    ),
    composite_confidence double precision not null default 0.5,
    explanation text not null,
    evidence_summary jsonb not null default '{}'::jsonb,
    is_dismissed boolean not null default false,
    created_at timestamptz not null default now(),
    unique (workspace_id, source_doc_id, target_doc_id, relationship_type)
);

alter table public.document_relationships
    add column if not exists created_at timestamptz not null default now();

create index if not exists idx_doc_relationships_workspace
    on public.document_relationships(workspace_id, source_doc_id, target_doc_id);

-- -----------------------------------------------------------------------------
-- 6. CONVERSATIONS, MESSAGES & CITATIONS (Pillar C: AI Assistant - DOC-13)
-- -----------------------------------------------------------------------------
create table if not exists public.conversations (
    id uuid primary key default gen_random_uuid(),
    workspace_id uuid not null references public.workspaces(id) on delete cascade,
    user_id uuid references auth.users(id) on delete cascade,
    title text not null default 'New Document Conversation',
    scope_mode text not null default 'single_doc' check (scope_mode in ('single_doc', 'multi_doc', 'repository')),
    scoped_doc_ids uuid[] not null default '{}'::uuid[],
    compacted_summary text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

alter table public.conversations
    add column if not exists created_at timestamptz not null default now(),
    add column if not exists updated_at timestamptz not null default now();

create index if not exists idx_conversations_workspace_user
    on public.conversations(workspace_id, user_id, updated_at desc);

create table if not exists public.messages (
    id uuid primary key default gen_random_uuid(),
    workspace_id uuid not null references public.workspaces(id) on delete cascade,
    conversation_id uuid not null references public.conversations(id) on delete cascade,
    role text not null check (role in ('user', 'assistant', 'system')),
    content text not null,
    model_used text,
    suggested_followups jsonb not null default '[]'::jsonb,
    created_at timestamptz not null default now()
);

alter table public.messages
    add column if not exists created_at timestamptz not null default now();

create index if not exists idx_messages_conversation
    on public.messages(conversation_id, created_at asc);

create table if not exists public.message_citations (
    id uuid primary key default gen_random_uuid(),
    workspace_id uuid not null references public.workspaces(id) on delete cascade,
    message_id uuid not null references public.messages(id) on delete cascade,
    citation_index integer not null,
    doc_id uuid not null references public.documents(id) on delete cascade,
    chunk_id uuid not null references public.chunks(id) on delete cascade,
    page_number integer not null,
    bounding_boxes jsonb not null default '[]'::jsonb,
    verbatim_snippet text,
    created_at timestamptz not null default now()
);

alter table public.message_citations
    add column if not exists created_at timestamptz not null default now();

create index if not exists idx_message_citations_message on public.message_citations(message_id);

-- -----------------------------------------------------------------------------
-- 7. DASHBOARDS & DASHBOARD WIDGETS (Pillar B: Personalized Dashboard - DOC-14)
-- -----------------------------------------------------------------------------
create table if not exists public.dashboards (
    id uuid primary key default gen_random_uuid(),
    workspace_id uuid not null references public.workspaces(id) on delete cascade,
    user_id uuid references auth.users(id) on delete cascade,
    detected_corpus_profile text not null default 'empty_corpus',
    layout_preferences jsonb not null default '{}'::jsonb,
    last_refreshed_at timestamptz not null default now(),
    created_at timestamptz not null default now(),
    unique (workspace_id, user_id)
);

alter table public.dashboards
    add column if not exists created_at timestamptz not null default now();

create table if not exists public.dashboard_widgets (
    id uuid primary key default gen_random_uuid(),
    workspace_id uuid not null references public.workspaces(id) on delete cascade,
    document_id uuid references public.documents(id) on delete cascade,
    dashboard_id uuid references public.dashboards(id) on delete cascade,
    title text not null,
    subtitle text,
    description text,
    chart_type text not null default 'bar',
    widget_type text not null default 'echarts_chart',
    is_auto_generated boolean not null default true,
    is_pinned boolean not null default false,
    status text not null default 'active' check (status in ('active', 'stale_source_deleted', 'needs_refresh')),
    display_order integer not null default 0,
    grid_span integer not null default 6,
    sql_query text,
    unit_or_currency text,
    echarts_spec jsonb not null default '{}'::jsonb,
    echarts_config jsonb not null default '{}'::jsonb,
    kpi_payload jsonb not null default '{}'::jsonb,
    narrative_insight text,
    source_doc_ids uuid[] not null default '{}'::uuid[],
    source_table_ids uuid[] not null default '{}'::uuid[],
    source_chunk_ids uuid[] not null default '{}'::uuid[],
    layout_position jsonb not null default '{"x": 0, "y": 0, "w": 6, "h": 4}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

alter table public.dashboard_widgets
    add column if not exists dashboard_id uuid references public.dashboards(id) on delete cascade,
    add column if not exists subtitle text,
    add column if not exists widget_type text not null default 'echarts_chart',
    add column if not exists is_auto_generated boolean not null default true,
    add column if not exists is_pinned boolean not null default false,
    add column if not exists status text not null default 'active' check (status in ('active', 'stale_source_deleted', 'needs_refresh')),
    add column if not exists display_order integer not null default 0,
    add column if not exists grid_span integer not null default 6,
    add column if not exists unit_or_currency text,
    add column if not exists echarts_config jsonb not null default '{}'::jsonb,
    add column if not exists kpi_payload jsonb not null default '{}'::jsonb,
    add column if not exists narrative_insight text,
    add column if not exists source_doc_ids uuid[] not null default '{}'::uuid[],
    add column if not exists source_table_ids uuid[] not null default '{}'::uuid[],
    add column if not exists source_chunk_ids uuid[] not null default '{}'::uuid[],
    add column if not exists created_at timestamptz not null default now(),
    add column if not exists updated_at timestamptz not null default now();

create index if not exists idx_dashboard_widgets_workspace
    on public.dashboard_widgets(workspace_id, status, display_order);

-- -----------------------------------------------------------------------------
-- 8. PROCESSING JOBS & AI USAGE LOGS (Resilience & Telemetry - DOC-19, DOC-24)
-- -----------------------------------------------------------------------------
create table if not exists public.processing_jobs (
    id uuid primary key default gen_random_uuid(),
    workspace_id uuid not null references public.workspaces(id) on delete cascade,
    doc_id uuid not null references public.documents(id) on delete cascade,
    status text not null default 'queued' check (status in ('queued', 'running', 'completed', 'failed', 'cancelled')),
    current_stage text not null default 'stage_1_validation',
    progress_pct integer not null default 0,
    attempt_count integer not null default 1,
    last_error_code text,
    last_error_message text,
    checkpoint_state jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),
    started_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    completed_at timestamptz
);

alter table public.processing_jobs
    add column if not exists created_at timestamptz not null default now(),
    add column if not exists started_at timestamptz not null default now(),
    add column if not exists updated_at timestamptz not null default now(),
    add column if not exists completed_at timestamptz;

create index if not exists idx_processing_jobs_doc_id on public.processing_jobs(doc_id, created_at desc);
create index if not exists idx_processing_jobs_status on public.processing_jobs(status, updated_at);

create table if not exists public.ai_usage_logs (
    id uuid primary key default gen_random_uuid(),
    workspace_id uuid not null references public.workspaces(id) on delete cascade,
    user_id uuid references auth.users(id) on delete set null,
    task_type text not null,
    provider text not null default 'openai',
    model text not null,
    service_tier text not null default 'auto',
    input_tokens integer not null default 0,
    cached_tokens integer not null default 0,
    output_tokens integer not null default 0,
    reasoning_tokens integer not null default 0,
    estimated_cost_usd numeric(10, 6) not null default 0.0,
    latency_ms integer not null default 0,
    created_at timestamptz not null default now()
);

alter table public.ai_usage_logs
    add column if not exists created_at timestamptz not null default now();

create index if not exists idx_ai_usage_logs_workspace_date
    on public.ai_usage_logs(workspace_id, created_at desc);

-- -----------------------------------------------------------------------------
-- 9. AUTOMATIC PERSONAL WORKSPACE PROVISIONING TRIGGER (PR-006, ADR-003)
-- -----------------------------------------------------------------------------
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
    new_ws_id uuid;
    display_name text;
begin
    display_name := coalesce(
        new.raw_user_meta_data->>'username',
        new.raw_user_meta_data->>'full_name',
        split_part(coalesce(new.email, 'User'), '@', 1)
    );

    insert into public.workspaces (owner_id, name, is_personal)
    values (new.id, display_name || '''s Workspace', true)
    returning id into new_ws_id;

    insert into public.workspace_members (workspace_id, user_id, role)
    values (new_ws_id, new.id, 'owner')
    on conflict do nothing;

    insert into public.dashboards (workspace_id, user_id, detected_corpus_profile)
    values (new_ws_id, new.id, 'empty_corpus')
    on conflict do nothing;

    return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

-- -----------------------------------------------------------------------------
-- 10. HYBRID RRF SEARCH RPC (match_document_chunks_hybrid - DOC-12, ADR-006)
-- -----------------------------------------------------------------------------
create or replace function public.match_document_chunks_hybrid(
    filter_workspace_id uuid,
    query_embedding vector(1536),
    query_text text,
    match_count int default 10,
    filter_doc_ids uuid[] default null,
    filter_category text default null,
    filter_tags text[] default null,
    min_vector_similarity float default 0.28,
    rrf_k int default 60
)
returns table (
    chunk_id uuid,
    doc_id uuid,
    doc_title text,
    doc_category text,
    page_number int,
    chunk_index int,
    text_content text,
    bounding_boxes jsonb,
    vector_similarity float,
    fts_rank float,
    rrf_score float,
    match_explanation text
)
language plpgsql
stable
set search_path = public, extensions
as $$
begin
    if filter_workspace_id is null then
        raise exception 'filter_workspace_id is required for tenant isolation';
    end if;

    return query
    with eligible_docs as (
        select d.id, d.title, d.category
        from public.documents d
        where d.workspace_id = filter_workspace_id
          and coalesce(d.status, d.processing_status) in ('ready', 'partial_ready', 'completed')
          and (filter_doc_ids is null or d.id = any(filter_doc_ids))
          and (filter_category is null or d.category = filter_category)
          and (filter_tags is null or d.user_tags && filter_tags)
    ),
    vector_candidates as (
        select
            c.id as cid,
            (1.0 - (c.embedding <=> query_embedding))::float as v_sim,
            row_number() over (order by c.embedding <=> query_embedding asc) as v_rank
        from public.chunks c
        inner join eligible_docs ed on ed.id = coalesce(c.doc_id, c.document_id)
        where c.workspace_id = filter_workspace_id
          and c.embedding is not null
          and (1.0 - (c.embedding <=> query_embedding)) >= min_vector_similarity
        order by c.embedding <=> query_embedding asc
        limit match_count * 4
    ),
    fts_candidates as (
        select
            c.id as cid,
            ts_rank_cd(
                to_tsvector('simple', coalesce(c.text_content, c.content, '')),
                websearch_to_tsquery('simple', query_text)
            )::float as f_score,
            row_number() over (
                order by ts_rank_cd(
                    to_tsvector('simple', coalesce(c.text_content, c.content, '')),
                    websearch_to_tsquery('simple', query_text)
                ) desc
            ) as f_rank
        from public.chunks c
        inner join eligible_docs ed on ed.id = coalesce(c.doc_id, c.document_id)
        where c.workspace_id = filter_workspace_id
          and length(trim(coalesce(query_text, ''))) > 0
          and to_tsvector('simple', coalesce(c.text_content, c.content, '')) @@ websearch_to_tsquery('simple', query_text)
        limit match_count * 4
    ),
    fused as (
        select
            coalesce(v.cid, f.cid) as cid,
            coalesce(v.v_sim, 0.0)::float as v_sim,
            coalesce(f.f_score, 0.0)::float as f_score,
            (
                coalesce(1.0 / (rrf_k + v.v_rank), 0.0) +
                coalesce(1.0 / (rrf_k + f.f_rank), 0.0)
            )::float as combined_rrf,
            case
                when v.cid is not null and f.cid is not null then 'hybrid_semantic_and_keyword'
                when f.cid is not null then 'exact_keyword_match'
                else 'semantic_conceptual_match'
            end as explanation
        from vector_candidates v
        full outer join fts_candidates f on v.cid = f.cid
    )
    select
        c.id as chunk_id,
        coalesce(c.doc_id, c.document_id) as doc_id,
        ed.title as doc_title,
        ed.category as doc_category,
        c.page_number,
        c.chunk_index,
        coalesce(c.text_content, c.content, '') as text_content,
        c.bounding_boxes,
        fu.v_sim as vector_similarity,
        fu.f_score as fts_rank,
        fu.combined_rrf as rrf_score,
        fu.explanation as match_explanation
    from fused fu
    inner join public.chunks c on c.id = fu.cid
    inner join eligible_docs ed on ed.id = coalesce(c.doc_id, c.document_id)
    order by fu.combined_rrf desc, fu.v_sim desc
    limit match_count;
end;
$$;

-- -----------------------------------------------------------------------------
-- 11. ROW-LEVEL SECURITY (RLS) ENFORCEMENT ACROSS ALL TENANT TABLES (ADR-003)
-- -----------------------------------------------------------------------------
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.documents enable row level security;
alter table public.document_pages enable row level security;
alter table public.chunks enable row level security;
alter table public.document_tables enable row level security;
alter table public.extracted_metrics enable row level security;
alter table public.topics enable row level security;
alter table public.chunk_topics enable row level security;
alter table public.entities enable row level security;
alter table public.document_entities enable row level security;
alter table public.document_relationships enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.message_citations enable row level security;
alter table public.dashboards enable row level security;
alter table public.dashboard_widgets enable row level security;
alter table public.processing_jobs enable row level security;
alter table public.ai_usage_logs enable row level security;

drop policy if exists workspaces_member_access on public.workspaces;
create policy workspaces_member_access on public.workspaces
    for all using (public.is_workspace_member(id));

drop policy if exists workspace_members_access on public.workspace_members;
create policy workspace_members_access on public.workspace_members
    for all using (public.is_workspace_member(workspace_id));

drop policy if exists documents_workspace_isolation on public.documents;
create policy documents_workspace_isolation on public.documents
    for all using (public.is_workspace_member(workspace_id));

drop policy if exists document_pages_workspace_isolation on public.document_pages;
create policy document_pages_workspace_isolation on public.document_pages
    for all using (public.is_workspace_member(workspace_id));

drop policy if exists chunks_workspace_isolation on public.chunks;
create policy chunks_workspace_isolation on public.chunks
    for all using (public.is_workspace_member(workspace_id));

drop policy if exists document_tables_workspace_isolation on public.document_tables;
create policy document_tables_workspace_isolation on public.document_tables
    for all using (public.is_workspace_member(workspace_id));

drop policy if exists extracted_metrics_workspace_isolation on public.extracted_metrics;
create policy extracted_metrics_workspace_isolation on public.extracted_metrics
    for all using (public.is_workspace_member(workspace_id));

drop policy if exists topics_workspace_isolation on public.topics;
create policy topics_workspace_isolation on public.topics
    for all using (public.is_workspace_member(workspace_id));

drop policy if exists chunk_topics_workspace_isolation on public.chunk_topics;
create policy chunk_topics_workspace_isolation on public.chunk_topics
    for all using (workspace_id is null or public.is_workspace_member(workspace_id));

drop policy if exists entities_workspace_isolation on public.entities;
create policy entities_workspace_isolation on public.entities
    for all using (public.is_workspace_member(workspace_id));

drop policy if exists document_entities_workspace_isolation on public.document_entities;
create policy document_entities_workspace_isolation on public.document_entities
    for all using (public.is_workspace_member(workspace_id));

drop policy if exists document_relationships_workspace_isolation on public.document_relationships;
create policy document_relationships_workspace_isolation on public.document_relationships
    for all using (public.is_workspace_member(workspace_id));

drop policy if exists conversations_workspace_isolation on public.conversations;
create policy conversations_workspace_isolation on public.conversations
    for all using (public.is_workspace_member(workspace_id));

drop policy if exists messages_workspace_isolation on public.messages;
create policy messages_workspace_isolation on public.messages
    for all using (public.is_workspace_member(workspace_id));

drop policy if exists message_citations_workspace_isolation on public.message_citations;
create policy message_citations_workspace_isolation on public.message_citations
    for all using (public.is_workspace_member(workspace_id));

drop policy if exists dashboards_workspace_isolation on public.dashboards;
create policy dashboards_workspace_isolation on public.dashboards
    for all using (public.is_workspace_member(workspace_id));

drop policy if exists dashboard_widgets_workspace_isolation on public.dashboard_widgets;
create policy dashboard_widgets_workspace_isolation on public.dashboard_widgets
    for all using (public.is_workspace_member(workspace_id));

drop policy if exists processing_jobs_workspace_isolation on public.processing_jobs;
create policy processing_jobs_workspace_isolation on public.processing_jobs
    for all using (public.is_workspace_member(workspace_id));

drop policy if exists ai_usage_logs_workspace_isolation on public.ai_usage_logs;
create policy ai_usage_logs_workspace_isolation on public.ai_usage_logs
    for all using (public.is_workspace_member(workspace_id));
