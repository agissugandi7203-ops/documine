export interface WorkspaceSessionResponse {
  authenticated: boolean;
  user: {
    id: string;
    email: string;
    username: string;
    email_verified: boolean;
  };
  workspace: {
    id: string;
    name: string;
    role: string;
  };
}

export interface DocumentItem {
  id: string;
  workspace_id?: string;
  title: string;
  original_filename?: string;
  file_type: string;
  page_count: number;
  file_size_bytes: number;
  processing_status: string;
  status?: string;
  category?: string;
  primary_domain?: string | null;
  summary?: string | null;
  main_topics?: string[];
  user_tags?: string[];
  has_tables?: boolean;
  table_count?: number;
  metric_count?: number;
  created_at?: string | null;
}

export interface DocumentsSummary {
  workspace_id: string;
  total_documents: number;
  ready_count: number;
  processing_count: number;
  failed_count: number;
  total_storage_bytes: number;
  storage_limit_bytes: number;
  categories: Record<string, number>;
  available_tags: string[];
}

export interface DocumentStatusInfo {
  document_id: string;
  status: string;
  current_stage: string;
  progress_pct: number;
  error_message?: string | null;
}

export interface SearchMatch {
  chunk_id?: string;
  id?: string;
  doc_id?: string;
  document_id?: string;
  doc_title?: string;
  page_number?: number;
  content?: string;
  text_content?: string;
  score?: number;
}

export interface SearchResponse {
  workspace_id: string;
  query: string;
  retrieval_status: string;
  total_matches: number;
  results: SearchMatch[];
}

export interface AnalyticsWidget {
  id?: string;
  title: string;
  subtitle?: string;
  description: string;
  widget_type: string;
  chart_type: string;
  unit_or_currency?: string;
  sql_query?: string | null;
  echarts_spec?: {
    title?: Record<string, unknown>;
    tooltip?: Record<string, unknown>;
    xAxis?: { type?: string; data?: string[] };
    yAxis?: { type?: string; name?: string };
    series?: Array<{ name?: string; type?: string; data?: Array<number | { name: string; value: number }> }>;
  };
  insight_summary: string;
}

export interface AnalyticsDashboardResponse {
  workspace_id: string;
  detected_corpus_profile: string;
  corpus_telemetry: {
    total_documents: number;
    total_pages: number;
    total_tables: number;
    total_verified_metrics: number;
    total_relationships: number;
  };
  auto_widgets: AnalyticsWidget[];
  saved_widgets: AnalyticsWidget[];
  widgets: AnalyticsWidget[];
}

export interface QuizResponse {
  document_id: string;
  title: string;
  questions: Array<{
    question_id: string;
    question_text: string;
    options: Array<{ label: string; text: string }>;
    correct_option: string;
    explanation: string;
    source_page: number;
    proof_quote: string;
  }>;
}

export interface SynthesisResponse {
  title: string;
  synthesis_headline: string;
  executive_summary: string;
  key_agreements: string[];
  matrix: Array<{
    concept: string;
    doc_a_stance: string;
    doc_b_stance: string;
    comparison_analysis: string;
    is_contradiction: boolean;
  }>;
  emergent_takeaways: string[];
}

export interface RelationshipGraphResponse {
  node_count: number;
  edge_count: number;
  nodes: Array<{
    id: string;
    title: string;
    category: string;
    page_count: number;
    table_count: number;
  }>;
  edges: Array<{
    id: string;
    source_doc_id: string;
    target_doc_id: string;
    source_doc_title?: string;
    target_doc_title?: string;
    relationship_type?: string;
    composite_confidence?: number;
    explanation?: string;
  }>;
}

export interface AudioBriefingResponse {
  title: string;
  duration_estimate: string;
  script: Array<{
    speaker: string;
    text: string;
    source_chunk_id?: string | null;
  }>;
  takeaway_summary: string;
}

async function proxyFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api/proxy/${path.replace(/^\/+/, "")}`, {
    ...init,
    credentials: "include",
    cache: "no-store",
  });

  if (!res.ok) {
    let detail = `Request failed (${res.status})`;
    try {
      const data = (await res.json()) as { detail?: string | { message?: string } };
      if (typeof data.detail === "string") {
        detail = data.detail;
      } else if (data.detail && typeof data.detail.message === "string") {
        detail = data.detail.message;
      }
    } catch {
      // keep default error detail
    }
    throw new Error(detail);
  }

  return (await res.json()) as T;
}

export const dashboardApi = {
  getSession: () => proxyFetch<WorkspaceSessionResponse>("auth/session"),
  getDocumentsSummary: () => proxyFetch<DocumentsSummary>("documents/summary"),
  listDocuments: () => proxyFetch<DocumentItem[]>("documents"),
  uploadDocument: async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return proxyFetch<DocumentItem>("documents/upload", {
      method: "POST",
      body: formData,
    });
  },
  getDocumentStatus: (id: string) =>
    proxyFetch<DocumentStatusInfo>(`documents/${encodeURIComponent(id)}/status`),
  deleteDocument: (id: string) =>
    proxyFetch<{ deleted: boolean; id: string }>(
      `documents/${encodeURIComponent(id)}`,
      { method: "DELETE" }
    ),
  search: (q: string, limit = 6) =>
    proxyFetch<SearchResponse>(
      `search?q=${encodeURIComponent(q)}&limit=${limit}`
    ),
  getAnalyticsDashboard: () =>
    proxyFetch<AnalyticsDashboardResponse>("analytics/dashboard"),
  generateAnalyticsWidget: (payload: {
    prompt?: string;
    document_id?: string;
    chart_type?: string;
  }) =>
    proxyFetch<AnalyticsWidget>("analytics/generate-dashboard", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  getRelationships: () =>
    proxyFetch<RelationshipGraphResponse>("relationships"),
  recomputeRelationships: () =>
    proxyFetch<RelationshipGraphResponse>("relationships/recompute", {
      method: "POST",
    }),
  compareSynthesis: (documentIds: string[]) =>
    proxyFetch<SynthesisResponse>("synthesis/compare", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ document_ids: documentIds }),
    }),
  generateQuiz: (documentId: string, numQuestions = 3) =>
    proxyFetch<QuizResponse>(
      `chat/quiz?document_id=${encodeURIComponent(
        documentId
      )}&num_questions=${numQuestions}`,
      { method: "POST" }
    ),
  generateAudioBriefing: (documentId?: string) =>
    proxyFetch<AudioBriefingResponse>("audio/briefing-script", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(documentId ? { document_id: documentId } : {}),
    }),
};
