-- DOCUMIND Initial Schema Migration
-- Enables pgvector, creates documents, chunks with normalized bounding boxes, topics, and dashboard widgets

create extension if not exists vector with schema extensions;
create extension if not exists "uuid-ossp";

-- 1. Workspaces
create table if not exists public.workspaces (
    id uuid primary key default uuid_generate_v4(),
    name text not null,
    created_at timestamptz not null default now()
);

-- 2. Documents
create table if not exists public.documents (
    id uuid primary key default uuid_generate_v4(),
    workspace_id uuid not null references public.workspaces(id) on delete cascade,
    title text not null,
    storage_path text not null,
    file_type text not null default 'pdf',
    page_count integer not null default 1,
    file_size_bytes bigint,
    processing_status text not null default 'pending', -- pending, processing, completed, failed
    metadata jsonb default '{}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- 3. Document Chunks with Normalized Bounding Boxes
create table if not exists public.chunks (
    id uuid primary key default uuid_generate_v4(),
    document_id uuid not null references public.documents(id) on delete cascade,
    workspace_id uuid not null references public.workspaces(id) on delete cascade,
    chunk_index integer not null,
    content text not null,
    page_number integer not null, -- 1-indexed
    -- Array of normalized coordinates: [{"left": 0.12, "top": 0.34, "width": 0.76, "height": 0.08}]
    bounding_boxes jsonb not null default '[]'::jsonb,
    embedding vector(1536), -- compatible with text-embedding-3-small or Gemini embeddings
    token_count integer,
    metadata jsonb default '{}'::jsonb,
    created_at timestamptz not null default now()
);

-- HNSW Vector Index for fast similarity search
create index if not exists idx_chunks_embedding_hnsw on public.chunks 
using hnsw (embedding vector_cosine_ops)
with (m = 16, ef_construction = 64);

-- Full-text search index for hybrid search
create index if not exists idx_chunks_fts on public.chunks using gin (to_tsvector('indonesian', content));
create index if not exists idx_chunks_doc_page on public.chunks (document_id, page_number);

-- 4. Extracted Topics & Entities (LightRAG Layer)
create table if not exists public.topics (
    id uuid primary key default uuid_generate_v4(),
    workspace_id uuid not null references public.workspaces(id) on delete cascade,
    name text not null,
    description text,
    category text default 'concept',
    created_at timestamptz not null default now()
);

create table if not exists public.chunk_topics (
    chunk_id uuid not null references public.chunks(id) on delete cascade,
    topic_id uuid not null references public.topics(id) on delete cascade,
    confidence real default 1.0,
    primary key (chunk_id, topic_id)
);

-- 5. Dynamic Dashboard Widgets
create table if not exists public.dashboard_widgets (
    id uuid primary key default uuid_generate_v4(),
    workspace_id uuid not null references public.workspaces(id) on delete cascade,
    document_id uuid references public.documents(id) on delete cascade,
    title text not null,
    description text,
    chart_type text not null, -- 'bar', 'line', 'pie', 'radar', 'timeline'
    sql_query text,           -- DuckDB deterministic SQL
    echarts_spec jsonb not null default '{}'::jsonb,
    layout_position jsonb not null default '{"x": 0, "y": 0, "w": 6, "h": 4}'::jsonb,
    created_at timestamptz not null default now()
);

-- 6. High-Performance Hybrid Vector Search Function (RPC)
create or replace function public.match_document_chunks (
    query_embedding vector(1536),
    match_threshold float,
    match_count int,
    filter_workspace_id uuid,
    filter_document_id uuid default null
)
returns table (
    id uuid,
    document_id uuid,
    chunk_index integer,
    content text,
    page_number integer,
    bounding_boxes jsonb,
    similarity float
)
language plpgsql
as $$
begin
    return query
    select
        c.id,
        c.document_id,
        c.chunk_index,
        c.content,
        c.page_number,
        c.bounding_boxes,
        1 - (c.embedding <=> query_embedding) as similarity
    from public.chunks c
    where c.workspace_id = filter_workspace_id
      and (filter_document_id is null or c.document_id = filter_document_id)
      and (1 - (c.embedding <=> query_embedding)) > match_threshold
    order by c.embedding <=> query_embedding
    limit match_count;
end;
$$;
