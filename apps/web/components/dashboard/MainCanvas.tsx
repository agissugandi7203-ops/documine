"use client";

import React, { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import {
  AlertTriangle,
  Clock,
  FileText,
  Globe,
  Layers,
  RefreshCw,
  Upload,
} from "lucide-react";
import {
  type AnalyticsDashboardResponse,
  type AnalyticsWidget,
  type AudioBriefingResponse,
  type DocumentItem,
  type DocumentsSummary,
  type QuizResponse,
  type RelationshipGraphResponse,
  type SearchMatch,
  type SynthesisResponse,
} from "@/lib/dashboard-api";
import { SynthesisWorkspacePanel } from "./SynthesisWorkspacePanel";
import { StudioWorkspacePanel } from "./StudioWorkspacePanel";
import {
  AnalyticsWorkspaceSkeleton,
  ChatWorkspaceSkeleton,
  ExecutiveHomeSkeleton,
  HeroChartSkeleton,
  RepositoryIdeSkeleton,
} from "./DashboardSkeletons";
import { GlobalSearchBar } from "./GlobalSearchBar";
import type { ChartWindow } from "./HomesCharts";
import type { ChatLaunchRequest } from "./chat/ChatWorkspace";
import { type DashboardSectionId } from "./types";

const EChartsKpiMini = dynamic(
  () => import("./HomesCharts").then((m) => m.EChartsKpiMini),
  { ssr: false, loading: () => <span className="db-skel-block db-skel-pill" /> }
);

const HeroActivityChart = dynamic(
  () => import("./HomesCharts").then((m) => m.HeroActivityChart),
  { ssr: false, loading: () => <HeroChartSkeleton /> }
);

const RepositoryIdeWorkspace = dynamic(
  () =>
    import("./RepositoryIdeWorkspace").then((m) => m.RepositoryIdeWorkspace),
  { ssr: false, loading: () => <RepositoryIdeSkeleton /> }
);

const ChatWorkspace = dynamic(
  () => import("./chat/ChatWorkspace").then((m) => m.ChatWorkspace),
  { ssr: false, loading: () => <ChatWorkspaceSkeleton /> }
);

const AnalyticsWorkspace = dynamic(
  () =>
    import("./analytics/AnalyticsWorkspace").then((m) => m.AnalyticsWorkspace),
  { ssr: false, loading: () => <AnalyticsWorkspaceSkeleton /> }
);

const ExecutiveDashboardHome = dynamic(
  () =>
    import("./ExecutiveDashboardHome").then((m) => m.ExecutiveDashboardHome),
  { ssr: false, loading: () => <ExecutiveHomeSkeleton /> }
);

interface LocalCrudItem {
  id: string;
  title: string;
  category: string;
  pages: number;
  status: string;
  isBackend?: boolean;
}

const CRUD_CATEGORIES = ["All", "Finance", "Engineering", "Research"] as const;

function getCategoryTone(category: string): "terracotta" | "sage" | "lime" | "ink" {
  const c = category.toLowerCase();
  if (c.includes("fin") || c.includes("rev") || c.includes("tax")) return "terracotta";
  if (c.includes("eng") || c.includes("tech") || c.includes("arch")) return "sage";
  if (c.includes("res") || c.includes("mark") || c.includes("brief")) return "lime";
  return "ink";
}

interface MainCanvasProps {
  activeNavId: DashboardSectionId;
  userName: string;
  workspaceName: string;
  workspaceId?: string;
  loadingData: boolean;
  uploading: boolean;
  uploadError: string | null;
  summary: DocumentsSummary | null;
  documents: DocumentItem[];
  selectedDocId: string | null;
  openRepoDocRequest?: { docId: string; nonce: number } | null;
  analytics: AnalyticsDashboardResponse | null;
  generatedWidget: AnalyticsWidget | null;
  analyticsGenerating: boolean;
  searchQuery: string;
  searchLoading: boolean;
  searchResultCount: number | null;
  searchMatches: SearchMatch[];
  relationships: RelationshipGraphResponse | null;
  synthesisResult: SynthesisResponse | null;
  synthesisLoading: boolean;
  quizResult: QuizResponse | null;
  quizLoading: boolean;
  audioResult: AudioBriefingResponse | null;
  audioLoading: boolean;
  onSelectNav: (section: DashboardSectionId) => void;
  onSelectDoc: (docId: string) => void;
  onOpenSearchResultDoc: (docId: string) => void;
  onAskDocInChat: (docId: string) => void;
  onSearchChange: (q: string) => void;
  onSearchClear: () => void;
  onTriggerUpload: (targetFolder?: string) => void;
  onUploadFilesToRepo: (
    files: File[],
    targetFolder?: string
  ) => Promise<Array<{ filename: string; doc?: DocumentItem; error?: string }>>;
  onRequestDeleteDoc: (doc: DocumentItem) => void;
  onUpdateDocumentMeta: (
    docId: string,
    payload: {
      title?: string;
      category?: string;
      summary?: string;
      user_tags?: string[];
    }
  ) => Promise<void>;
  onFocusSearch?: () => void;
  onDropFile: (file: File) => void;
  onDeleteDoc: (docId: string) => void;
  onRefreshData: () => void;
  onGenerateWidget: (chartType: "bar" | "line" | "pie", prompt: string) => void;
  onRunSynthesis: (docIds: string[], focusQuery?: string) => void;
  onRecomputeRelationships: () => void;
  onGenerateQuiz: (docId: string, numQuestions?: number) => void;
  onGenerateAudio: (docId?: string, style?: string) => void;
  onDropPreviewCardOnCanvas: (previewIndex: number) => void;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Elevated Editorial Dashboard Canvas:
 * - Refined greeting header with inline tactile stat chips
 * - Top Row: Overlapping Calescence-style tactile folder cards + Hatch-Decal ECharts & Oripio Rhythm chart
 * - Bottom Row: Filterable Document CRUD Table with category monograms + Full-bleed Risograph AI Studio poster card
 */
export function MainCanvas({
  activeNavId,
  userName,
  workspaceName,
  workspaceId,
  loadingData,
  uploading,
  uploadError,
  summary,
  documents,
  selectedDocId,
  openRepoDocRequest,
  analytics,
  generatedWidget,
  analyticsGenerating,
  searchQuery,
  searchLoading,
  searchResultCount,
  searchMatches,
  relationships,
  synthesisResult,
  synthesisLoading,
  quizResult,
  quizLoading,
  audioResult,
  audioLoading,
  onSelectNav,
  onSelectDoc,
  onOpenSearchResultDoc,
  onAskDocInChat,
  onSearchChange,
  onSearchClear,
  onTriggerUpload,
  onUploadFilesToRepo,
  onRequestDeleteDoc,
  onUpdateDocumentMeta,
  onFocusSearch,
  onDropFile,
  onDeleteDoc,
  onRefreshData,
  onGenerateWidget,
  onRunSynthesis,
  onRecomputeRelationships,
  onGenerateQuiz,
  onGenerateAudio,
  onDropPreviewCardOnCanvas,
}: MainCanvasProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const chartWindow: ChartWindow = "7d";
  const [selectedSynthIds, setSelectedSynthIds] = useState<string[]>([]);

  // Interactive CRUD Table state
  const [localEntries, setLocalEntries] = useState<LocalCrudItem[]>([]);
  const [docEdits, setDocEdits] = useState<
    Record<string, { title: string; category: string }>
  >({});
  const [crudCategoryFilter, setCrudCategoryFilter] = useState<string>("All");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [addingNewRow, setAddingNewRow] = useState(false);
  const [newRowTitle, setNewRowTitle] = useState("");
  const [newRowCategory, setNewRowCategory] = useState("Research");

  // Chat scope & launch request from Analytics / Repository / Homes ("Ask about this file")
  const [chatScopeDocId, setChatScopeDocId] = useState<string>("all");
  const [chatLaunchRequest, setChatLaunchRequest] =
    useState<ChatLaunchRequest | null>(null);

  useEffect(() => {
    if (documents.length >= 2 && selectedSynthIds.length === 0) {
      setSelectedSynthIds([documents[0].id, documents[1].id]);
    }
  }, [documents, selectedSynthIds.length]);

  useEffect(() => {
    if (activeNavId !== "homes") return;
    const handleQuickRowShortcut = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      if (
        tag === "input" ||
        tag === "textarea" ||
        tag === "select" ||
        target?.isContentEditable
      ) {
        return;
      }
      if (e.key.toLowerCase() === "n") {
        e.preventDefault();
        setAddingNewRow(true);
      }
    };
    window.addEventListener("keydown", handleQuickRowShortcut);
    return () => window.removeEventListener("keydown", handleQuickRowShortcut);
  }, [activeNavId]);

  const activeDoc =
    documents.find((d) => d.id === selectedDocId) ?? documents[0] ?? null;

  const primaryWidget =
    generatedWidget ??
    analytics?.widgets?.[0] ??
    analytics?.auto_widgets?.[0] ??
    null;

  const totalDocs =
    summary?.total_documents ??
    analytics?.corpus_telemetry?.total_documents ??
    (documents.length > 0 ? documents.length : localEntries.length);
  const readyDocs =
    summary?.ready_count ??
    (documents.length > 0
      ? documents.filter((d) =>
          ["ready", "partial_ready", "completed"].includes(
            d.status || d.processing_status
          )
        ).length
      : localEntries.length);
  const totalPages =
    analytics?.corpus_telemetry?.total_pages ??
    (documents.length > 0
      ? documents.reduce((acc, d) => acc + (d.page_count || 1), 0)
      : localEntries.reduce((acc, d) => acc + d.pages, 0));
  const totalMetrics =
    analytics?.corpus_telemetry?.total_verified_metrics ?? 0;
  const totalTables = analytics?.corpus_telemetry?.total_tables ?? 0;
  const totalRelationships =
    analytics?.corpus_telemetry?.total_relationships ??
    relationships?.edge_count ??
    0;
  const isWorkspaceEmpty = documents.length === 0 && localEntries.length === 0;

  const docSpark = useMemo(() => [14, 20, 17, 25, 22, 28, 32], []);

  const crudRows: LocalCrudItem[] = useMemo(() => {
    const backendMapped: LocalCrudItem[] = documents.map((d) => {
      const override = docEdits[d.id];
      return {
        id: d.id,
        title: override?.title ?? d.title,
        category: override?.category ?? (d.category || "Document"),
        pages: d.page_count || 1,
        status: d.status || d.processing_status || "Ready",
        isBackend: true,
      };
    });
    const combined =
      backendMapped.length > 0
        ? [
            ...backendMapped,
            ...localEntries.filter((l) => l.id.startsWith("user-")),
          ]
        : localEntries;

    const byCat =
      crudCategoryFilter === "All"
        ? combined
        : combined.filter(
            (r) =>
              r.category.toLowerCase() === crudCategoryFilter.toLowerCase()
          );

    if (!searchQuery.trim()) return byCat;
    const q = searchQuery.toLowerCase();
    return byCat.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q)
    );
  }, [documents, docEdits, localEntries, searchQuery, crudCategoryFilter]);

  const startEditRow = (row: LocalCrudItem) => {
    setEditingId(row.id);
    setEditTitle(row.title);
    setEditCategory(row.category);
  };

  const saveEditRow = (row: LocalCrudItem) => {
    const cleanTitle = editTitle.trim() || row.title;
    const cleanCat = editCategory.trim() || row.category;
    if (row.isBackend) {
      setDocEdits((prev) => ({
        ...prev,
        [row.id]: { title: cleanTitle, category: cleanCat },
      }));
      void onUpdateDocumentMeta(row.id, { title: cleanTitle, category: cleanCat });
    } else {
      setLocalEntries((prev) =>
        prev.map((item) =>
          item.id === row.id
            ? { ...item, title: cleanTitle, category: cleanCat }
            : item
        )
      );
    }
    setEditingId(null);
  };

  const handleDeleteCrudRow = (row: LocalCrudItem) => {
    if (row.isBackend) {
      const targetDoc = documents.find((d) => d.id === row.id);
      if (targetDoc) {
        onRequestDeleteDoc(targetDoc);
      } else {
        onDeleteDoc(row.id);
      }
    } else {
      setLocalEntries((prev) => prev.filter((item) => item.id !== row.id));
    }
  };

  const handleCreateCrudRow = (e: React.FormEvent) => {
    e.preventDefault();
    const title = newRowTitle.trim();
    if (!title) return;
    const created: LocalCrudItem = {
      id: `user-${Date.now()}`,
      title: title.endsWith(".pdf") ? title : `${title}.pdf`,
      category: newRowCategory.trim() || "Research",
      pages: 8,
      status: "Ready",
    };
    setLocalEntries((prev) => [created, ...prev]);
    setNewRowTitle("");
    setAddingNewRow(false);
    setCrudCategoryFilter("All");
  };

  const filteredDocs = searchQuery.trim()
    ? documents.filter(
        (d) =>
          d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (d.category || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
          (d.summary || "").toLowerCase().includes(searchQuery.toLowerCase())
      )
    : documents;

  const handleCanvasDrop = (e: React.DragEvent<HTMLElement>) => {
    e.preventDefault();
    setIsDragOver(false);

    const previewIdx = e.dataTransfer.getData("application/x-documind-preview");
    if (previewIdx) {
      onDropPreviewCardOnCanvas(Number(previewIdx));
      return;
    }

    const file = e.dataTransfer.files?.[0];
    if (file) {
      onDropFile(file);
    }
  };

  const toggleSynthDoc = (docId: string) => {
    setSelectedSynthIds((prev) =>
      prev.includes(docId)
        ? prev.filter((id) => id !== docId)
        : prev.length < 6
        ? [...prev, docId]
        : prev
    );
  };

  return (
    <section
      className={`db-main-workspace ${
        isDragOver ? "db-main-workspace--dragover" : ""
      }`}
      aria-label="Main Workspace"
      onDragOver={(e) => {
        e.preventDefault();
        if (!isDragOver) setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleCanvasDrop}
    >
      {/* Global Top Workspace Header (Scoped controls per view; Search always global) */}
      <header
        className={`db-greeting-row ${
          activeNavId === "chat" ? "db-greeting-row--minimal" : ""
        } ${activeNavId === "repository" ? "db-greeting-row--compact" : ""}`}
      >
        <div className="db-greeting-left">
          <div className="db-greeting-title-stack">
            <span className="db-greeting-kicker">{workspaceName}</span>
            <h1 className="db-greeting-title">
              {(activeNavId === "homes" || activeNavId === "chat") &&
                `Hello, ${userName}`}
              {activeNavId === "repository" && "Document Repository"}
              {activeNavId === "layers" && "Layers & Inspector"}
              {activeNavId === "analytics" && "Analytics Studio"}
              {activeNavId === "synthesis" && "Synthesis"}
              {activeNavId === "studio" && "Studio"}
            </h1>
          </div>

          {activeNavId === "homes" && (
            <div className="db-inline-header-stats">
              <div className="db-inline-stat">
                <span className="db-inline-stat-ring">
                  <Clock size={13} />
                </span>
                <div className="db-inline-stat-text">
                  <strong className="db-inline-stat-val">{totalPages}</strong>
                  <span className="db-inline-stat-lbl">Pages</span>
                </div>
              </div>

              <div className="db-inline-stat">
                <span className="db-inline-stat-ring db-inline-stat-ring--sage">
                  <Globe size={13} />
                </span>
                <div className="db-inline-stat-text">
                  <strong className="db-inline-stat-val">{totalDocs}</strong>
                  <span className="db-inline-stat-lbl">Docs</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="db-header-controls">
          <GlobalSearchBar
            query={searchQuery}
            loading={searchLoading}
            resultCount={searchResultCount}
            matches={searchMatches}
            documents={documents}
            onChange={onSearchChange}
            onClear={onSearchClear}
            onOpenDocument={onOpenSearchResultDoc}
            onAskDocument={onAskDocInChat}
          />

          {activeNavId !== "chat" && (
            <button
              type="button"
              className="db-quick-btn db-quick-btn--accent"
              onClick={() => onTriggerUpload()}
              disabled={uploading}
            >
              <Upload size={13} />
              <span>
                {uploading
                  ? "Uploading..."
                  : activeNavId === "homes"
                  ? "Upload PDF"
                  : "Upload File"}
              </span>
            </button>
          )}

          {activeNavId !== "chat" && (
            <button
              type="button"
              className="db-stage-icon-btn"
              aria-label="Refresh workspace"
              onClick={onRefreshData}
              disabled={loadingData}
            >
              <RefreshCw
                size={14}
                className={loadingData ? "db-spin" : undefined}
              />
            </button>
          )}
        </div>
      </header>

      {uploadError && (
        <div className="db-stage-banner">
          <AlertTriangle size={14} />
          <span>{uploadError}</span>
        </div>
      )}

      {/* Main Stage (Locked 100vh only on Repository & Chat; scrollable BI canvas on Homes & Analytics) */}
      <div
        className={`db-stage-scroll ${
          activeNavId === "repository" ? "db-stage-scroll--locked" : ""
        } ${activeNavId === "chat" ? "db-stage-scroll--chat" : ""}`}
      >
        {activeNavId === "homes" && (
          <ExecutiveDashboardHome
            documents={documents}
            summary={summary}
            analytics={analytics}
            relationships={relationships}
            uploading={uploading}
            onSelectNav={onSelectNav}
            onTriggerUpload={() => onTriggerUpload()}
            onOpenDocInRepository={(docId) => onOpenSearchResultDoc(docId)}
            onAskDocInChat={(docId, prompt) => {
              setChatScopeDocId(docId || "all");
              if (prompt) {
                setChatLaunchRequest({
                  scopeDocId: docId || "all",
                  prompt,
                  autoSend: false,
                  nonce: Date.now(),
                });
              }
              onSelectNav("chat");
            }}
            onUpdateDocumentMeta={onUpdateDocumentMeta}
            onRequestDeleteDoc={onRequestDeleteDoc}
          />
        )}

        {/* Streaming AI Chat Workspace */}
        {activeNavId === "chat" && (
          <ChatWorkspace
            userName={userName}
            documents={documents}
            initialScopeDocId={chatScopeDocId}
            launchRequest={chatLaunchRequest}
            onNavigateToInspector={(docId) => onOpenSearchResultDoc(docId)}
            onRefreshDocuments={onRefreshData}
            onUploadFilesToRepo={onUploadFilesToRepo}
            onOpenUploadModal={() => onTriggerUpload()}
          />
        )}

        {/* VS Code-Style Document Repository & Embedded AI IDE */}
        {activeNavId === "repository" && (
          <RepositoryIdeWorkspace
            workspaceName={workspaceName}
            workspaceId={workspaceId}
            userName={userName}
            documents={documents}
            selectedDocId={selectedDocId}
            openDocRequest={openRepoDocRequest}
            uploading={uploading}
            onSelectDoc={onSelectDoc}
            onOpenUploadModal={(folder) => onTriggerUpload(folder)}
            onUploadFilesToRepo={onUploadFilesToRepo}
            onRequestDeleteDoc={onRequestDeleteDoc}
            onUpdateDocumentMeta={onUpdateDocumentMeta}
            onRefreshDocuments={onRefreshData}
          />
        )}

        {activeNavId === "layers" && (
          <div className="db-homes-split">
            <div className="db-panel-box">
              <div className="db-panel-box-head">
                <div className="db-panel-box-title">
                  Layers ({filteredDocs.length})
                </div>
                <button
                  type="button"
                  className="db-mini-pill-btn db-mini-pill-btn--accent"
                  onClick={() => onTriggerUpload()}
                  disabled={uploading}
                >
                  <Upload size={12} />
                  <span>{uploading ? "Uploading..." : "Add PDF"}</span>
                </button>
              </div>

              {filteredDocs.length > 0 ? (
                <ul className="db-doc-list">
                  {filteredDocs.map((doc) => (
                    <li key={doc.id} className="db-doc-list-item">
                      <button
                        type="button"
                        className={`db-doc-row ${
                          activeDoc?.id === doc.id ? "db-doc-row--selected" : ""
                        }`}
                        onClick={() => onSelectDoc(doc.id)}
                      >
                        <span className="db-doc-avatar">
                          <FileText size={14} />
                        </span>
                        <div className="db-doc-row-meta">
                          <span className="db-doc-row-title">{doc.title}</span>
                          <span className="db-doc-row-sub">
                            {doc.page_count}p ·{" "}
                            {formatBytes(doc.file_size_bytes)}
                          </span>
                        </div>
                        <span className="db-doc-status-chip">
                          {doc.status || doc.processing_status}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="db-empty-dash-box">
                  <Layers size={24} className="db-empty-icon" />
                  <p>
                    No document layers yet. Start by uploading your first PDF.
                  </p>
                  <button
                    type="button"
                    className="db-mini-pill-btn db-mini-pill-btn--accent"
                    onClick={() => onTriggerUpload()}
                  >
                    <Upload size={12} />
                    <span>Start Upload</span>
                  </button>
                </div>
              )}
            </div>

            <div className="db-panel-box">
              <div className="db-panel-box-head">
                <div className="db-panel-box-title">
                  {activeDoc ? activeDoc.title : "Inspector"}
                </div>
                {activeDoc && (
                  <span className="db-doc-status-chip">
                    {activeDoc.file_type.toUpperCase()}
                  </span>
                )}
              </div>

              {activeDoc ? (
                <div className="db-inspector-body">
                  <p className="db-inspector-summary">
                    {activeDoc.summary || "Indexed in workspace."}
                  </p>
                  <div className="db-inspector-stats">
                    <span>Tables: {activeDoc.table_count ?? 0}</span>
                    <span>Metrics: {activeDoc.metric_count ?? 0}</span>
                  </div>
                </div>
              ) : (
                <div className="db-empty-dash-box">
                  <p>Select a document to inspect its layer details.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeNavId === "analytics" && (
          <AnalyticsWorkspace
            workspaceId={workspaceId}
            documents={documents}
            uploading={uploading}
            onTriggerUpload={() => onTriggerUpload()}
            onAskInChat={({ scopeDocId, prompt, autoSend }) => {
              setChatScopeDocId(scopeDocId || "all");
              setChatLaunchRequest({
                scopeDocId: scopeDocId || "all",
                prompt,
                autoSend,
                nonce: Date.now(),
              });
              onSelectNav("chat");
            }}
          />
        )}

        {activeNavId === "synthesis" && (
          <SynthesisWorkspacePanel
            documents={documents}
            selectedSynthIds={selectedSynthIds}
            synthesisResult={synthesisResult}
            synthesisLoading={synthesisLoading}
            relationships={relationships}
            onToggleDoc={toggleSynthDoc}
            onRunSynthesis={onRunSynthesis}
            onRecomputeRelationships={onRecomputeRelationships}
            onTriggerUpload={() => onTriggerUpload()}
            onOpenDocument={(docId) => onOpenSearchResultDoc(docId)}
          />
        )}

        {activeNavId === "studio" && (
          <StudioWorkspacePanel
            documents={documents}
            activeDoc={activeDoc}
            quizResult={quizResult}
            quizLoading={quizLoading}
            audioResult={audioResult}
            audioLoading={audioLoading}
            onSelectDoc={onSelectDoc}
            onGenerateQuiz={onGenerateQuiz}
            onGenerateAudio={onGenerateAudio}
            onTriggerUpload={() => onTriggerUpload()}
          />
        )}
      </div>
    </section>
  );
}
