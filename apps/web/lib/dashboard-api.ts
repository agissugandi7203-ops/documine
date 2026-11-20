import { refreshAuthSession } from "@/lib/supabase";

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
  is_duplicate?: boolean;
  mime_type?: string;
  error_message?: string | null;
  created_at?: string | null;
}

export interface DocumentDetailResponse extends DocumentItem {
  extracted_tables?: Array<{
    id?: string;
    table_name?: string;
    page_number?: number;
    headers?: string[];
    rows?: unknown[][];
    data?: unknown[];
    [key: string]: unknown;
  }>;
  extracted_metrics?: Array<{
    id?: string;
    metric_name?: string;
    metric_value?: string | number;
    unit?: string;
    page_number?: number;
    [key: string]: unknown;
  }>;
  processing_job?: {
    current_stage?: string;
    progress_pct?: number;
    status?: string;
    last_error_message?: string | null;
  } | null;
}

export interface DocumentChunkItem {
  id: string;
  document_id: string;
  chunk_index: number;
  content: string;
  text_content?: string;
  page_number: number;
  has_table?: boolean;
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

export type DynamicChartType =
  | "bar"
  | "horizontal_bar"
  | "line"
  | "area"
  | "stacked_area"
  | "pie"
  | "donut"
  | "grouped_bar"
  | "heatmap"
  | "radar";

export interface DynamicAnalyticsChartSpec {
  id: string;
  title: string;
  subtitle: string;
  chart_type: DynamicChartType;
  unit: string;
  labels: string[];
  series: Array<{ name: string; data: number[] }>;
  rows: Array<Record<string, string | number | null>>;
  takeaway: string;
  source_docs: string[];
  source_labels: string[];
  sql_query?: string | null;
}

export interface AnalyticsReportInsight {
  tag: string;
  title: string;
  detail: string;
  doc_id?: string;
  doc_title?: string;
  page_number?: number;
}

export interface AnalyticsReportFileDigest {
  id: string;
  title: string;
  folder: string;
  file_type: string;
  domain_label: string;
  page_count: number;
  table_count: number;
  metric_count: number;
  link_count: number;
  has_quant_data: boolean;
  summary: string;
  top_topics: string[];
}

export interface DynamicAnalyticsReport {
  scope_mode: "single_file" | "all_files" | "folder";
  scope_label: string;
  folder_name?: string | null;
  focus_prompt?: string | null;
  presentation_mode: "charts_and_insights" | "insights_only" | "empty";
  has_quantitative_data: boolean;
  no_chart_reason?: string | null;
  domain: {
    domain_id: string;
    domain_label: string;
    domain_tagline: string;
  };
  executive_summary: string;
  what_is_inside: string[];
  kpis: Array<{
    label: string;
    value: string;
    sub: string;
    tone: "accent" | "ink" | "sage" | "neutral";
  }>;
  charts: DynamicAnalyticsChartSpec[];
  insights: AnalyticsReportInsight[];
  steps_or_sections: Array<{
    title: string;
    detail: string;
    doc_id?: string;
    doc_title?: string;
    page_number?: number;
  }>;
  top_topics: Array<{ label: string; mentions: number; weight: number }>;
  file_digests: AnalyticsReportFileDigest[];
  suggested_questions: string[];
  target_doc_ids: string[];
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

export interface RelationshipEvidenceSummary {
  shared_topics?: string[];
  shared_entity_count?: number;
  semantic_similarity?: number;
  [key: string]: unknown;
}

export interface RelationshipGraphNode {
  id: string;
  title: string;
  category: string;
  primary_domain?: string | null;
  status?: string;
  main_topics?: string[];
  page_count: number;
  table_count: number;
  metric_count?: number;
}

export interface RelationshipGraphEdge {
  id: string;
  source_doc_id: string;
  target_doc_id: string;
  source_doc_title?: string;
  target_doc_title?: string;
  relationship_type?: string;
  composite_confidence?: number;
  explanation?: string;
  evidence_summary?: RelationshipEvidenceSummary;
  created_at?: string;
}

export interface RelationshipGraphResponse {
  workspace_id?: string;
  node_count: number;
  edge_count: number;
  nodes: RelationshipGraphNode[];
  edges: RelationshipGraphEdge[];
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

export interface ChatCitation {
  citation_id?: string;
  chunk_id: string;
  document_id?: string;
  doc_id?: string;
  document_title?: string | null;
  doc_title?: string;
  page_number: number;
  quote?: string;
  text_excerpt?: string;
  bounding_boxes?: Array<{
    left: number;
    top: number;
    width: number;
    height: number;
    page_number: number;
  }>;
}

export interface ChatQueryResponse {
  conversation_id: string;
  message_id: string;
  answer: string;
  retrieval_status: string;
  model_used: string;
  citations: ChatCitation[];
  suggested_followups: string[];
}

export interface ConversationSummary {
  id: string;
  workspace_id?: string;
  title: string;
  scope_mode?: string;
  scoped_doc_ids?: string[];
  created_at?: string;
  updated_at?: string;
}

export interface ConversationMessageRow {
  id: string;
  conversation_id: string;
  role: "user" | "assistant";
  content: string;
  model_used?: string | null;
  citations?: ChatCitation[];
  suggested_followups?: string[];
  created_at?: string;
}

export interface ChatStreamStatusEvent {
  stage?: string;
  orbState?: string;
  variant?: string;
  label?: string;
  chunks_found?: number;
  docs_searched?: number;
  retrieval_status?: string;
  model?: string;
}

export interface ChatStreamDoneEvent {
  conversation_id: string;
  message_id: string;
  answer?: string;
  model_used?: string;
  retrieval_status?: string;
  citations: ChatCitation[];
  suggested_followups: string[];
  elapsed_ms?: number;
}

export interface ChatStreamHandlers {
  signal?: AbortSignal;
  onStatus?: (status: ChatStreamStatusEvent) => void;
  onTokenDelta?: (delta: string) => void;
  onCitationsVerified?: (done: ChatStreamDoneEvent) => void;
  onError?: (err: Error) => void;
}

function parseSseFrame(rawFrame: string): { event: string; data: unknown } | null {
  const trimmed = rawFrame.trim();
  if (!trimmed) return null;

  let event = "message";
  const dataLines: string[] = [];

  for (const line of trimmed.split("\n")) {
    if (!line || line.startsWith(":")) continue;
    if (line.startsWith("event:")) {
      event = line.slice(6).trim() || "message";
    } else if (line.startsWith("data:")) {
      dataLines.push(line.slice(5).trimStart());
    }
  }

  if (dataLines.length === 0) return null;
  const rawData = dataLines.join("\n");
  try {
    return { event, data: JSON.parse(rawData) };
  } catch {
    return { event, data: rawData };
  }
}

function handleExpiredSessionRedirect() {
  if (
    typeof window !== "undefined" &&
    !window.location.pathname.startsWith("/login")
  ) {
    window.location.replace("/login?reason=session_expired");
  }
}

const INTERNAL_ERROR_HINTS = [
  "openai",
  "api key",
  "api_key",
  "kadaluarsa",
  "invalid_api_key",
  "insufficient_quota",
  "rate_limit_exceeded",
  "error code: 401",
  "error code: 429",
  "error code: 500",
  "traceback",
  "supabase",
  "postgrest",
  "duckdb",
  "econnrefused",
  "fetch failed",
  "failed to fetch",
  "sk-",
  "aigateway",
];

/**
 * Logs full technical error details to developer console while returning a calm,
 * warm, user-friendly message for UI rendering. Never shows API key expiration or stack traces.
 */
export function toFriendlyErrorMessage(
  raw: unknown,
  status?: number,
  fallback = "Temporary service interruption. Please try again in a moment."
): string {
  const rawMsg =
    raw instanceof Error
      ? raw.message
      : typeof raw === "string"
      ? raw
      : String(raw ?? "");
  const trimmed = rawMsg.trim();
  const lower = trimmed.toLowerCase();

  const looksTechnical =
    !trimmed ||
    trimmed.length > 220 ||
    (status !== undefined && status >= 500) ||
    INTERNAL_ERROR_HINTS.some((hint) => lower.includes(hint));

  if (looksTechnical) {
    if (typeof console !== "undefined") {
      console.error("[DocuMind Technical Error]", { status, raw: trimmed || raw });
    }
    if (status === 429 || lower.includes("too many") || lower.includes("rate_limit") || lower.includes("quota")) {
      return "Requests are briefly at capacity. Please wait a few seconds and try again.";
    }
    if (status === 413 || lower.includes("exceeds") || lower.includes("too large")) {
      return "File size exceeds the allowed workspace limit. Try uploading a smaller file.";
    }
    if (status === 401 || lower.includes("session expired")) {
      return "Your session has expired. Please sign in again to continue.";
    }
    if (lower.includes("openai") || lower.includes("api key") || lower.includes("api_key") || lower.includes("aigateway")) {
      return "The AI assistant is undergoing a brief configuration update. Your documents remain safe; please try again shortly.";
    }
    if (lower.includes("econnrefused") || lower.includes("fetch failed") || lower.includes("failed to fetch") || lower.includes("network")) {
      return "Network connection interrupted. Please verify your connection and try again.";
    }
    return fallback;
  }

  return trimmed;
}

async function proxyFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const targetUrl = `/api/proxy/${path.replace(/^\/+/, "")}`;
  let res: Response;
  try {
    res = await fetch(targetUrl, {
      ...init,
      credentials: "include",
      cache: "no-store",
    });
  } catch (networkErr) {
    throw new Error(toFriendlyErrorMessage(networkErr, 0));
  }

  if (res.status === 401) {
    const refreshed = await refreshAuthSession(true);
    if (refreshed.authenticated) {
      res = await fetch(targetUrl, {
        ...init,
        credentials: "include",
        cache: "no-store",
      });
    }
    if (res.status === 401) {
      handleExpiredSessionRedirect();
      throw new Error("Your session has expired. Please sign in again.");
    }
  }

  if (!res.ok) {
    let detail = "";
    try {
      const data = (await res.json()) as { detail?: string | { message?: string } };
      if (typeof data.detail === "string") {
        detail = data.detail;
      } else if (data.detail && typeof data.detail.message === "string") {
        detail = data.detail.message;
      }
    } catch {
      // keep empty so friendly fallback applies
    }
    throw new Error(toFriendlyErrorMessage(detail, res.status));
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
  uploadDocumentWithProgress: (
    file: File,
    options?: {
      forceReplace?: boolean;
      onProgress?: (pct: number) => void;
      signal?: AbortSignal;
    }
  ): Promise<DocumentItem> =>
    new Promise((resolve, reject) => {
      const runUpload = (hasRetriedAuth: boolean) => {
        const xhr = new XMLHttpRequest();
        const formData = new FormData();
        formData.append("file", file);
        if (options?.forceReplace) {
          formData.append("force_replace", "true");
        }

        const handleAbort = () => {
          xhr.abort();
        };

        if (options?.signal) {
          if (options.signal.aborted) {
            reject(new Error("Upload cancelled."));
            return;
          }
          options.signal.addEventListener("abort", handleAbort, { once: true });
        }

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable && event.total > 0) {
            const pct = Math.min(99, Math.round((event.loaded / event.total) * 100));
            options?.onProgress?.(pct);
          }
        };

        xhr.onload = async () => {
          options?.signal?.removeEventListener("abort", handleAbort);
          if (xhr.status === 401 && !hasRetriedAuth) {
            const refreshed = await refreshAuthSession(true);
            if (refreshed.authenticated) {
              runUpload(true);
              return;
            }
            handleExpiredSessionRedirect();
            reject(new Error("Session expired. Please sign in again."));
            return;
          }
          if (xhr.status === 401) {
            handleExpiredSessionRedirect();
            reject(new Error("Session expired. Please sign in again."));
            return;
          }
          if (xhr.status >= 200 && xhr.status < 300) {
            options?.onProgress?.(100);
            try {
              resolve(JSON.parse(xhr.responseText) as DocumentItem);
            } catch {
              reject(new Error("Invalid server response after upload."));
            }
            return;
          }
          let detail = `Upload failed (${xhr.status})`;
          try {
            const parsed = JSON.parse(xhr.responseText) as {
              detail?: string | { message?: string };
            };
            if (typeof parsed.detail === "string") {
              detail = parsed.detail;
            } else if (parsed.detail && typeof parsed.detail.message === "string") {
              detail = parsed.detail.message;
            }
          } catch {
            // keep status detail
          }
          reject(new Error(detail));
        };

        xhr.onerror = () => {
          options?.signal?.removeEventListener("abort", handleAbort);
          reject(new Error("Network error while uploading file. Check connection."));
        };

        xhr.ontimeout = () => {
          options?.signal?.removeEventListener("abort", handleAbort);
          reject(new Error("Upload timed out while waiting for server."));
        };

        xhr.onabort = () => {
          options?.signal?.removeEventListener("abort", handleAbort);
          reject(new Error("Upload cancelled."));
        };

        xhr.open("POST", "/api/proxy/documents/upload", true);
        xhr.withCredentials = true;
        xhr.timeout = 180_000;
        xhr.send(formData);
      };

      runUpload(false);
    }),
  getDocumentDetail: (id: string) =>
    proxyFetch<DocumentDetailResponse>(`documents/${encodeURIComponent(id)}`),
  getDocumentChunks: (id: string) =>
    proxyFetch<DocumentChunkItem[]>(`documents/${encodeURIComponent(id)}/chunks`),
  updateDocument: (
    id: string,
    payload: { title?: string; category?: string; user_tags?: string[] }
  ) =>
    proxyFetch<DocumentItem>(`documents/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  fetchDocumentText: async (id: string): Promise<string> => {
    const res = await fetch(`/api/proxy/documents/${encodeURIComponent(id)}/file`, {
      credentials: "include",
      cache: "no-store",
    });
    if (!res.ok) {
      throw new Error(`Unable to read document content (${res.status})`);
    }
    return res.text();
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
  buildAnalyticsReport: (payload: {
    scope_mode: "single_file" | "all_files" | "folder";
    document_id?: string;
    document_ids?: string[];
    folder_name?: string;
    focus_prompt?: string;
    force_refresh?: boolean;
  }) =>
    proxyFetch<DynamicAnalyticsReport>("analytics/build-report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  getRelationships: (minConfidence = 0.45) =>
    proxyFetch<RelationshipGraphResponse>(
      `relationships?min_confidence=${encodeURIComponent(String(minConfidence))}`
    ),
  recomputeRelationships: () =>
    proxyFetch<RelationshipGraphResponse>("relationships/recompute", {
      method: "POST",
    }),
  dismissRelationship: (relationshipId: string) =>
    proxyFetch<{ status: string; relationship: RelationshipGraphEdge }>(
      `relationships/${encodeURIComponent(relationshipId)}/dismiss`,
      { method: "PATCH" }
    ),
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
  queryChat: (payload: {
    message: string;
    document_id?: string | null;
    document_ids?: string[];
    conversation_id?: string | null;
    deep_analysis?: boolean;
    conversation_history?: Array<{ role: string; content: string }>;
  }) =>
    proxyFetch<ChatQueryResponse>("chat/query", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  listConversations: () =>
    proxyFetch<{
      workspace_id: string;
      count: number;
      conversations: ConversationSummary[];
    }>("chat/conversations"),
  getConversationMessages: (conversationId: string) =>
    proxyFetch<{
      workspace_id: string;
      conversation_id: string;
      messages: ConversationMessageRow[];
    }>(`chat/conversations/${encodeURIComponent(conversationId)}/messages`),
  streamChat: async (
    payload: {
      message: string;
      document_id?: string | null;
      document_ids?: string[];
      conversation_id?: string | null;
      scope_mode?: "single_doc" | "multi_doc" | "repository";
      deep_analysis?: boolean;
      conversation_history?: Array<{ role: string; content: string }>;
    },
    handlers: ChatStreamHandlers = {}
  ): Promise<ChatStreamDoneEvent | null> => {
    const openStream = () =>
      fetch("/api/proxy/chat/stream", {
        method: "POST",
        credentials: "include",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/event-stream",
        },
        body: JSON.stringify(payload),
        signal: handlers.signal,
      });

    let res = await openStream();
    if (res.status === 401) {
      const refreshed = await refreshAuthSession(true);
      if (refreshed.authenticated) {
        res = await openStream();
      }
      if (res.status === 401) {
        handleExpiredSessionRedirect();
        throw new Error("Session expired. Please sign in again.");
      }
    }

    if (!res.ok) {
      let detail = "";
      try {
        const errData = (await res.json()) as {
          detail?: string | { message?: string };
        };
        if (typeof errData.detail === "string") {
          detail = errData.detail;
        } else if (errData.detail && typeof errData.detail.message === "string") {
          detail = errData.detail.message;
        }
      } catch {
        // keep empty so friendly fallback applies
      }
      throw new Error(
        toFriendlyErrorMessage(
          detail,
          res.status,
          "The AI assistant is briefly busy. Please resend your message."
        )
      );
    }

    let finalDone: ChatStreamDoneEvent | null = null;
    let streamError: Error | null = null;

    const dispatch = (parsed: { event: string; data: unknown } | null) => {
      if (!parsed) return;
      const { event, data } = parsed;
      if (event === "status" && data && typeof data === "object") {
        handlers.onStatus?.(data as ChatStreamStatusEvent);
      } else if (event === "token_delta" && data && typeof data === "object") {
        const delta = (data as { delta?: string }).delta;
        if (typeof delta === "string" && delta.length > 0) {
          handlers.onTokenDelta?.(delta);
        }
      } else if (
        event === "citations_verified" &&
        data &&
        typeof data === "object"
      ) {
        finalDone = data as ChatStreamDoneEvent;
        handlers.onCitationsVerified?.(finalDone);
      } else if (event === "error") {
        const rawMsg =
          data && typeof data === "object" && "message" in data
            ? String((data as { message?: string }).message || "")
            : "";
        streamError = new Error(
          toFriendlyErrorMessage(
            rawMsg,
            500,
            "AI response was briefly interrupted. Please resend your message."
          )
        );
        handlers.onError?.(streamError);
      }
    };

    if (res.body && typeof res.body.getReader === "function") {
      const reader = res.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";
      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder
            .decode(value, { stream: true })
            .replace(/\r\n/g, "\n");
          const frames = buffer.split("\n\n");
          buffer = frames.pop() ?? "";
          for (const frame of frames) {
            dispatch(parseSseFrame(frame));
          }
        }
        buffer += decoder.decode().replace(/\r\n/g, "\n");
        if (buffer.trim()) {
          for (const frame of buffer.split("\n\n")) {
            dispatch(parseSseFrame(frame));
          }
        }
      } finally {
        try {
          reader.releaseLock();
        } catch {
          // ignore
        }
      }
    } else {
      const fullText = (await res.text()).replace(/\r\n/g, "\n");
      for (const frame of fullText.split("\n\n")) {
        dispatch(parseSseFrame(frame));
      }
    }

    if (streamError) {
      throw streamError;
    }

    return finalDone;
  },
};
