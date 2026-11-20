"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  BarChart3,
  BookOpen,
  CheckCircle2,
  FileSpreadsheet,
  FileText,
  FolderOpen,
  Layers,
  Lightbulb,
  MessageSquare,
  RefreshCw,
  Search,
  Upload,
} from "lucide-react";
import {
  dashboardApi,
  type DocumentItem,
  type DynamicAnalyticsChartSpec,
  type DynamicAnalyticsReport,
} from "@/lib/dashboard-api";
import { ThinkingOrbStage } from "../chat/ThinkingOrbStage";
import { DynamicAnalyticsChart } from "./DynamicAnalyticsChart";

type BuilderMode = "single_file" | "all_repo";

interface SavedReportEntry {
  key: string;
  createdAt: number;
  report: DynamicAnalyticsReport;
}

interface AnalyticsWorkspaceProps {
  workspaceId?: string;
  documents: DocumentItem[];
  uploading: boolean;
  onTriggerUpload: () => void;
  onAskInChat: (opts: {
    scopeDocId: string;
    prompt?: string;
    autoSend?: boolean;
  }) => void;
}

function normalizeFolder(raw?: string | null): string {
  if (!raw || !raw.trim()) return "General";
  const cleaned = raw.trim();
  if (cleaned.toLowerCase() === "general_document" || cleaned.toLowerCase() === "general") {
    return "General";
  }
  return cleaned
    .replace(/_/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

export function AnalyticsWorkspace({
  workspaceId,
  documents,
  uploading,
  onTriggerUpload,
  onAskInChat,
}: AnalyticsWorkspaceProps) {
  const storageKey = `documind:analytics:reports:${workspaceId || "default"}`;

  // Default: Builder / Selector view (never auto-builds charts on first open)
  const [view, setView] = useState<"builder" | "report">("builder");
  const [builderMode, setBuilderMode] = useState<BuilderMode>("single_file");
  const [selectedDocId, setSelectedDocId] = useState<string>("");
  const [selectedFolder, setSelectedFolder] = useState<string>("__ALL__");
  const [fileFilterFolder, setFileFilterFolder] = useState<string>("All");
  const [fileSearch, setFileSearch] = useState("");
  const [focusPrompt, setFocusPrompt] = useState("");

  const [building, setBuilding] = useState(false);
  const [buildError, setBuildError] = useState<string | null>(null);
  const [activeReport, setActiveReport] = useState<DynamicAnalyticsReport | null>(
    null
  );
  const [savedReports, setSavedReports] = useState<SavedReportEntry[]>([]);

  // Restore user's previously generated reports list (never auto-opens or auto-creates!)
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as SavedReportEntry[];
        if (Array.isArray(parsed)) {
          setSavedReports(parsed.slice(0, 6));
        }
      }
    } catch {
      // ignore storage errors
    }
  }, [storageKey]);

  // Pre-highlight first document in picker for convenient 1-click Create (still waits for explicit Create Analytics click!)
  useEffect(() => {
    if (documents.length > 0 && !documents.some((d) => d.id === selectedDocId)) {
      setSelectedDocId(documents[0].id);
    }
  }, [documents, selectedDocId]);

  const foldersSummary = useMemo(() => {
    const map = new Map<
      string,
      { name: string; count: number; pages: number; tables: number; metrics: number }
    >();
    for (const doc of documents) {
      const folder = normalizeFolder(doc.category);
      const cur = map.get(folder) ?? {
        name: folder,
        count: 0,
        pages: 0,
        tables: 0,
        metrics: 0,
      };
      cur.count += 1;
      cur.pages += doc.page_count || 1;
      cur.tables += doc.table_count || 0;
      cur.metrics += doc.metric_count || 0;
      map.set(folder, cur);
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [documents]);

  const filteredSingleDocs = useMemo(() => {
    const q = fileSearch.trim().toLowerCase();
    return documents.filter((d) => {
      if (
        fileFilterFolder !== "All" &&
        normalizeFolder(d.category) !== fileFilterFolder
      ) {
        return false;
      }
      if (!q) return true;
      return (
        d.title.toLowerCase().includes(q) ||
        normalizeFolder(d.category).toLowerCase().includes(q) ||
        (d.summary || "").toLowerCase().includes(q)
      );
    });
  }, [documents, fileFilterFolder, fileSearch]);

  const totalStats = useMemo(() => {
    let pages = 0;
    let tables = 0;
    let metrics = 0;
    for (const d of documents) {
      pages += d.page_count || 1;
      tables += d.table_count || 0;
      metrics += d.metric_count || 0;
    }
    return { docs: documents.length, pages, tables, metrics };
  }, [documents]);

  const persistReport = useCallback(
    (report: DynamicAnalyticsReport) => {
      const key =
        report.scope_mode === "single_file"
          ? `single:${report.target_doc_ids[0] || report.scope_label}`
          : report.scope_mode === "folder"
          ? `folder:${report.folder_name || report.scope_label}`
          : "all_files";

      setSavedReports((prev) => {
        const next: SavedReportEntry[] = [
          { key, createdAt: Date.now(), report },
          ...prev.filter((item) => item.key !== key),
        ].slice(0, 6);
        try {
          window.localStorage.setItem(storageKey, JSON.stringify(next));
        } catch {
          // ignore quota errors
        }
        return next;
      });
    },
    [storageKey]
  );

  const runBuildReport = useCallback(
    async (override?: {
      scope_mode: "single_file" | "all_files" | "folder";
      document_id?: string;
      folder_name?: string;
      focus_prompt?: string;
      force_refresh?: boolean;
    }) => {
      if (building || documents.length === 0) return;

      const payload = override ?? (
        builderMode === "single_file"
          ? {
              scope_mode: "single_file" as const,
              document_id: selectedDocId || documents[0]?.id,
              focus_prompt: focusPrompt.trim() || undefined,
            }
          : selectedFolder === "__ALL__"
          ? {
              scope_mode: "all_files" as const,
              focus_prompt: focusPrompt.trim() || undefined,
            }
          : {
              scope_mode: "folder" as const,
              folder_name: selectedFolder,
              focus_prompt: focusPrompt.trim() || undefined,
            }
      );

      setBuilding(true);
      setBuildError(null);

      try {
        const report = await dashboardApi.buildAnalyticsReport(payload);
        setActiveReport(report);
        setView("report");
        persistReport(report);
      } catch (err) {
        setBuildError(
          err instanceof Error
            ? err.message
            : "Failed to build analytics. Please try again."
        );
      } finally {
        setBuilding(false);
      }
    },
    [
      builderMode,
      building,
      documents,
      focusPrompt,
      persistReport,
      selectedDocId,
      selectedFolder,
    ]
  );

  const handleAskPrimary = () => {
    if (!activeReport) return;
    const isSingle = activeReport.scope_mode === "single_file";
    const docId = isSingle ? activeReport.target_doc_ids[0] || "all" : "all";
    onAskInChat({
      scopeDocId: docId,
      prompt: isSingle
        ? `Explore the key findings and metrics inside "${activeReport.scope_label}" in greater detail`
        : "Explore the overarching insights and cross-document comparisons across my entire repository",
      autoSend: false,
    });
  };

  const handleAskAboutChart = (chart: DynamicAnalyticsChartSpec) => {
    const scopeDocId =
      chart.source_docs?.length === 1
        ? chart.source_docs[0]
        : activeReport?.scope_mode === "single_file"
        ? activeReport.target_doc_ids[0] || "all"
        : "all";
    onAskInChat({
      scopeDocId,
      prompt: `Explain the data in chart "${chart.title}" in detail: what drives the trends and what are the key takeaways?`,
      autoSend: true,
    });
  };

  // =========================================================================
  // EMPTY WORKSPACE STATE (0 DOCUMENTS UPLOADED)
  // =========================================================================
  if (documents.length === 0) {
    return (
      <div className="an-workspace an-workspace--empty">
        <div className="an-empty-card">
          <div className="an-empty-icon">
            <BarChart3 size={30} strokeWidth={1.7} />
          </div>
          <h2 className="an-empty-title">No files available to analyze yet</h2>
          <p className="an-empty-sub">
            Upload PDF, CSV, or TXT documents first, then select a single file
            or your entire repository to generate dynamic charts &amp; structured
            insights.
          </p>
          <button
            type="button"
            className="an-primary-cta"
            onClick={onTriggerUpload}
            disabled={uploading}
          >
            <Upload size={15} />
            <span>{uploading ? "Uploading..." : "Upload First Document"}</span>
          </button>
        </div>
      </div>
    );
  }

  // =========================================================================
  // BUILDING LOADING STAGE (WITH LIVE THINKING ORB)
  // =========================================================================
  if (building) {
    return (
      <div className="an-workspace an-workspace--loading">
        <div className="an-loading-card">
          <ThinkingOrbStage
            mode="hero"
            state="reasoning"
            variant="twins"
            size={48}
            label="Building Dynamic Analytics"
          />
          <h2 className="an-loading-title">Building Dynamic Analytics...</h2>
          <p className="an-loading-sub">
            Reading document contents, detecting topics &amp; domains, extracting
            tables and metrics, and designing the best charts or structured insights.
          </p>
          <div className="an-loading-steps">
            <span className="an-loading-pill">1. Detect Domain &amp; Content</span>
            <span className="an-loading-pill">2. Extract Data &amp; Charts</span>
            <span className="an-loading-pill">3. Synthesize Insights</span>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // STATE 1: BUILDER / SCOPE SELECTOR (DEFAULT, NO AUTO-BUILD)
  // =========================================================================
  if (view === "builder" || !activeReport) {
    const selectedDocObj = documents.find((d) => d.id === selectedDocId) ?? null;
    const canCreate =
      builderMode === "all_repo" || Boolean(selectedDocObj);

    return (
      <div className="an-workspace">
        <div className="an-builder">
          {/* Builder Hero Header */}
          <div className="an-builder-head">
            <div className="an-builder-kicker">
              <BarChart3 size={13} />
              <span>Dynamic Document Analytics Studio</span>
            </div>
            <h2 className="an-builder-title">
              Choose a data source to build Analytics
            </h2>
            <p className="an-builder-sub">
              Automatically adapts to your document domain (finance, research,
              SOPs, datasets, and more), generating tailored charts for numeric
              tables or deep qualitative insights for narrative files.
            </p>
          </div>

          {buildError && (
            <div className="an-error-banner" role="alert">
              <span>{buildError}</span>
            </div>
          )}

          {/* 2 Primary Scope Cards: Single File vs All Repo */}
          <div className="an-mode-grid" role="tablist" aria-label="Choose analytics scope">
            <button
              type="button"
              role="tab"
              aria-selected={builderMode === "single_file"}
              className={`an-mode-card ${
                builderMode === "single_file" ? "is-selected" : ""
              }`}
              onClick={() => setBuilderMode("single_file")}
            >
              <div className="an-mode-card__top">
                <span className="an-mode-icon">
                  <FileText size={18} />
                </span>
                <span className="an-mode-check">
                  {builderMode === "single_file" && <CheckCircle2 size={16} />}
                </span>
              </div>
              <h3 className="an-mode-card__title">Single File Analysis</h3>
              <p className="an-mode-card__desc">
                Deep dive into one specific document with tailored data charts or
                structured takeaways when narrative-based.
              </p>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={builderMode === "all_repo"}
              className={`an-mode-card ${
                builderMode === "all_repo" ? "is-selected" : ""
              }`}
              onClick={() => setBuilderMode("all_repo")}
            >
              <div className="an-mode-card__top">
                <span className="an-mode-icon an-mode-icon--sage">
                  <Layers size={18} />
                </span>
                <span className="an-mode-check">
                  {builderMode === "all_repo" && <CheckCircle2 size={16} />}
                </span>
              </div>
              <h3 className="an-mode-card__title">Full Repository Analysis</h3>
              <p className="an-mode-card__desc">
                Combine all files ({totalStats.docs} docs ·{" "}
                {totalStats.pages} pages) or target one folder for
                cross-document charts &amp; synthesis.
              </p>
            </button>
          </div>

          {/* Dynamic Scope Picker */}
          <section className="an-picker-panel">
            {builderMode === "single_file" ? (
              <>
                <div className="an-picker-bar">
                  <div className="an-picker-folders">
                    <button
                      type="button"
                      className={`an-folder-pill ${
                        fileFilterFolder === "All" ? "is-active" : ""
                      }`}
                      onClick={() => setFileFilterFolder("All")}
                    >
                      All ({documents.length})
                    </button>
                    {foldersSummary.map((f) => (
                      <button
                        key={f.name}
                        type="button"
                        className={`an-folder-pill ${
                          fileFilterFolder === f.name ? "is-active" : ""
                        }`}
                        onClick={() => setFileFilterFolder(f.name)}
                      >
                        <FolderOpen size={12} />
                        <span>
                          {f.name} ({f.count})
                        </span>
                      </button>
                    ))}
                  </div>

                  <div className="an-picker-search">
                    <Search size={13} />
                    <input
                      type="text"
                      value={fileSearch}
                      onChange={(e) => setFileSearch(e.target.value)}
                      placeholder="Search file name..."
                      aria-label="Search file to analyze"
                    />
                  </div>
                </div>

                <div className="an-file-grid">
                  {filteredSingleDocs.map((doc) => {
                    const isPicked = selectedDocId === doc.id;
                    const isCsv =
                      (doc.file_type || "").toLowerCase().includes("csv") ||
                      (doc.file_type || "").toLowerCase().includes("xls");
                    return (
                      <button
                        key={doc.id}
                        type="button"
                        className={`an-file-option ${isPicked ? "is-picked" : ""}`}
                        onClick={() => setSelectedDocId(doc.id)}
                      >
                        <div className="an-file-option__head">
                          <span className="an-file-option__icon">
                            {isCsv ? (
                              <FileSpreadsheet size={15} />
                            ) : (
                              <FileText size={15} />
                            )}
                          </span>
                          <span className="an-file-option__folder">
                            {normalizeFolder(doc.category)}
                          </span>
                          {isPicked && (
                            <CheckCircle2
                              size={15}
                              className="an-file-option__check"
                            />
                          )}
                        </div>
                        <div className="an-file-option__name" title={doc.title}>
                          {doc.title}
                        </div>
                        <div className="an-file-option__meta">
                          <span>{doc.page_count || 1} pg</span>
                          <span>·</span>
                          <span>{doc.table_count || 0} tables</span>
                          <span>·</span>
                          <span>{doc.metric_count || 0} metrics</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="an-repo-selector">
                <div className="an-repo-grid">
                  <button
                    type="button"
                    className={`an-repo-option ${
                      selectedFolder === "__ALL__" ? "is-picked" : ""
                    }`}
                    onClick={() => setSelectedFolder("__ALL__")}
                  >
                    <div className="an-repo-option__top">
                      <span className="an-repo-option__badge">All Repo</span>
                      {selectedFolder === "__ALL__" && (
                        <CheckCircle2 size={15} className="an-file-option__check" />
                      )}
                    </div>
                    <div className="an-repo-option__name">
                      Entire Workspace Repository
                    </div>
                    <div className="an-repo-option__meta">
                      {totalStats.docs} files · {totalStats.pages} pages ·{" "}
                      {totalStats.tables} tables · {totalStats.metrics} metrics
                    </div>
                  </button>

                  {foldersSummary.map((folder) => {
                    const isPicked = selectedFolder === folder.name;
                    return (
                      <button
                        key={folder.name}
                        type="button"
                        className={`an-repo-option ${isPicked ? "is-picked" : ""}`}
                        onClick={() => setSelectedFolder(folder.name)}
                      >
                        <div className="an-repo-option__top">
                          <span className="an-repo-option__badge is-folder">
                            <FolderOpen size={11} />
                            <span>Repo</span>
                          </span>
                          {isPicked && (
                            <CheckCircle2
                              size={15}
                              className="an-file-option__check"
                            />
                          )}
                        </div>
                        <div className="an-repo-option__name">{folder.name}</div>
                        <div className="an-repo-option__meta">
                          {folder.count} files · {folder.pages} pg ·{" "}
                          {folder.tables} tables · {folder.metrics} metrics
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Optional Focus + Primary Create CTA */}
            <div className="an-builder-footer">
              <div className="an-focus-input-wrap">
                <Search size={14} className="an-focus-icon" />
                <input
                  type="text"
                  className="an-focus-input"
                  value={focusPrompt}
                  onChange={(e) => setFocusPrompt(e.target.value)}
                  placeholder="Analysis focus (optional), e.g., revenue trends, key risks, summary metrics..."
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && canCreate) {
                      void runBuildReport();
                    }
                  }}
                />
              </div>

              <button
                type="button"
                className="an-primary-cta"
                disabled={!canCreate}
                onClick={() => void runBuildReport()}
              >
                <BarChart3 size={16} />
                <span>
                  {builderMode === "single_file"
                    ? "Create Analytics (1 File)"
                    : selectedFolder === "__ALL__"
                    ? "Create Analytics (All Repo)"
                    : `Create Analytics (${selectedFolder})`}
                </span>
              </button>
            </div>
          </section>

          {/* Previously Built Reports (Manual Re-open Only) */}
          {savedReports.length > 0 && (
            <section className="an-recent-strip">
              <span className="an-recent-label">Previously Built Reports</span>
              <div className="an-recent-list">
                {savedReports.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    className="an-recent-chip"
                    onClick={() => {
                      setActiveReport(item.report);
                      setView("report");
                    }}
                  >
                    <span className="an-recent-chip__mode">
                      {item.report.scope_mode === "single_file"
                        ? "1 File"
                        : "All Repo"}
                    </span>
                    <span className="an-recent-chip__title">
                      {item.report.scope_label}
                    </span>
                    <span className="an-recent-chip__domain">
                      {item.report.domain.domain_label}
                    </span>
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    );
  }

  // =========================================================================
  // STATE 2: DYNAMIC ANALYTICS REPORT VIEW
  // =========================================================================
  const isSingle = activeReport.scope_mode === "single_file";
  const singleDocId = isSingle ? activeReport.target_doc_ids[0] || "all" : "all";
  const hasCharts = activeReport.charts.length > 0;

  return (
    <div className="an-workspace">
      <div className="an-report">
        {/* Sticky Report Action Header */}
        <header className="an-report-bar">
          <div className="an-report-bar__left">
            <button
              type="button"
              className="an-ghost-btn"
              onClick={() => setView("builder")}
            >
              <ArrowLeft size={14} />
              <span>Change Scope</span>
            </button>

            <div className="an-scope-pills">
              <span className="an-scope-badge">
                {isSingle ? "1 File" : "All Repo"}
              </span>
              <span className="an-domain-badge">
                {activeReport.domain.domain_label}
              </span>
            </div>
          </div>

          <div className="an-report-bar__right">
            <button
              type="button"
              className="an-ghost-btn"
              onClick={() =>
                void runBuildReport({
                  scope_mode: activeReport.scope_mode,
                  document_id: isSingle ? activeReport.target_doc_ids[0] : undefined,
                  folder_name: activeReport.folder_name || undefined,
                  focus_prompt: activeReport.focus_prompt || undefined,
                  force_refresh: true,
                })
              }
            >
              <RefreshCw size={13} />
              <span>Rebuild</span>
            </button>

            <button
              type="button"
              className="an-ask-hero-btn"
              onClick={handleAskPrimary}
            >
              <MessageSquare size={14} />
              <span>
                {isSingle
                  ? "Ask about this File"
                  : "Ask AI about All Files"}
              </span>
              <ArrowUpRight size={13} />
            </button>
          </div>
        </header>

        {/* Executive Overview Banner */}
        <section className="an-exec-hero">
          <div className="an-exec-hero__main">
            <span className="an-exec-kicker">
              {isSingle
                ? "File Summary & Profile"
                : "Repository-Wide Synthesis"}
            </span>
            <h2 className="an-exec-title">{activeReport.scope_label}</h2>
            <p className="an-exec-summary">{activeReport.executive_summary}</p>
            <div className="an-inside-chips">
              {activeReport.what_is_inside.map((chip) => (
                <span key={chip} className="an-inside-chip">
                  {chip}
                </span>
              ))}
            </div>
          </div>

          <div className="an-kpi-grid">
            {activeReport.kpis.map((kpi, idx) => (
              <div key={idx} className={`an-kpi-card tone-${kpi.tone}`}>
                <span className="an-kpi-label">{kpi.label}</span>
                <strong className="an-kpi-value">{kpi.value}</strong>
                <span className="an-kpi-sub">{kpi.sub}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ADAPTIVE ENGINE: CHARTS WHEN DATA EXISTS, OR DEEP INSIGHT REPLACEMENT WHEN NO CHART DATA */}
        {hasCharts ? (
          <section className="an-section">
            <div className="an-section-head">
              <div>
                <h3 className="an-section-title">
                  Dynamic Data Visualizations ({activeReport.charts.length}{" "}
                  {activeReport.charts.length === 1 ? "Chart" : "Charts"})
                </h3>
                <p className="an-section-sub">
                  Generated directly from tables, metrics, and structured values in{" "}
                  {isSingle ? "this document" : "all selected files"}. Switch
                  chart types or click Ask AI on any chart.
                </p>
              </div>
            </div>

            <div className="an-charts-grid">
              {activeReport.charts.map((chart, idx) => (
                <DynamicAnalyticsChart
                  key={chart.id}
                  spec={chart}
                  featured={
                    activeReport.charts.length === 1 ||
                    (activeReport.charts.length >= 3 && idx === 0)
                  }
                  onAskAboutChart={handleAskAboutChart}
                />
              ))}
            </div>
          </section>
        ) : (
          <section className="an-no-chart-banner">
            <div className="an-no-chart-banner__icon">
              <Lightbulb size={20} />
            </div>
            <div>
              <h3 className="an-no-chart-banner__title">
                Deep Insight Mode (Narrative Focus)
              </h3>
              <p className="an-no-chart-banner__desc">
                {activeReport.no_chart_reason ||
                  "This file contains no numeric series or quantitative tables to plot, so analytics highlights structured summaries, dominant themes, and cited key points."}
              </p>
            </div>
          </section>
        )}

        {/* Deep Insights & Qualitative Takeaways Grid (ALWAYS shown; hero focus when insights_only!) */}
        <section className="an-section">
          <div className="an-section-head">
            <div>
              <h3 className="an-section-title">
                {hasCharts
                  ? "Key Insights & Findings"
                  : "In-Depth Insight Analysis"}
              </h3>
              <p className="an-section-sub">
                Essential takeaways extracted directly from document content with
                page references.
              </p>
            </div>
          </div>

          <div className="an-insights-layout">
            {/* Primary Insights Cards */}
            <div className="an-insight-grid">
              {activeReport.insights.map((ins, idx) => (
                <article key={idx} className="an-insight-card">
                  <div className="an-insight-card__top">
                    <span className="an-insight-tag">{ins.tag}</span>
                    {ins.page_number && (
                      <span className="an-insight-page">
                        p. {ins.page_number}
                      </span>
                    )}
                  </div>
                  <h4 className="an-insight-title">{ins.title}</h4>
                  <p className="an-insight-detail">{ins.detail}</p>
                  <div className="an-insight-foot">
                    <span className="an-insight-src" title={ins.doc_title}>
                      {ins.doc_title || activeReport.scope_label}
                    </span>
                    <button
                      type="button"
                      className="an-inline-ask"
                      onClick={() =>
                        onAskInChat({
                          scopeDocId: ins.doc_id || singleDocId,
                          prompt: `Explain this finding in detail: "${ins.detail.slice(
                            0,
                            140
                          )}"`,
                          autoSend: true,
                        })
                      }
                    >
                      <MessageSquare size={11} />
                      <span>Ask AI</span>
                    </button>
                  </div>
                </article>
              ))}
            </div>

            {/* Side Column: Steps/Sections + Dominant Topics */}
            <div className="an-side-insights">
              {activeReport.top_topics.length > 0 && (
                <div className="an-side-card">
                  <div className="an-side-card__head">
                    <BookOpen size={14} />
                    <h4>Dominant Topics &amp; Concepts</h4>
                  </div>
                  <div className="an-topic-bars">
                    {activeReport.top_topics.slice(0, 7).map((tp) => (
                      <div key={tp.label} className="an-topic-bar-row">
                        <div className="an-topic-bar-head">
                          <span>{tp.label}</span>
                          <span className="an-topic-bar-count">
                            {tp.mentions}×
                          </span>
                        </div>
                        <div className="an-topic-track">
                          <div
                            className="an-topic-fill"
                            style={{ width: `${Math.max(14, tp.weight)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeReport.steps_or_sections.length > 0 && (
                <div className="an-side-card">
                  <div className="an-side-card__head">
                    <Lightbulb size={14} />
                    <h4>Structured Sections &amp; Points</h4>
                  </div>
                  <ol className="an-steps-list">
                    {activeReport.steps_or_sections.slice(0, 6).map((st, idx) => (
                      <li key={idx} className="an-step-item">
                        <span className="an-step-num">{idx + 1}</span>
                        <div className="an-step-body">
                          <p>{st.detail}</p>
                          {st.page_number && (
                            <span className="an-step-meta">
                              {st.doc_title} · p. {st.page_number}
                            </span>
                          )}
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ALL FILES ONLY: Complete Per-File Digest Matrix */}
        {!isSingle && activeReport.file_digests.length > 0 && (
          <section className="an-section">
            <div className="an-section-head">
              <div>
                <h3 className="an-section-title">
                  Per-File Breakdown ({activeReport.file_digests.length}{" "}
                  {activeReport.file_digests.length === 1
                    ? "Document"
                    : "Documents"}
                  )
                </h3>
                <p className="an-section-sub">
                  Quick breakdown of each file in this scope; click Single File
                  Analytics to inspect one document or ask AI directly.
                </p>
              </div>
            </div>

            <div className="an-digest-grid">
              {activeReport.file_digests.map((fd) => (
                <article key={fd.id} className="an-digest-card">
                  <div className="an-digest-card__top">
                    <span className="an-digest-domain">{fd.domain_label}</span>
                    <span className="an-digest-ext">{fd.file_type}</span>
                  </div>
                  <h4 className="an-digest-title" title={fd.title}>
                    {fd.title}
                  </h4>
                  <p className="an-digest-sum">{fd.summary}</p>
                  <div className="an-digest-stats">
                    <span>{fd.page_count} pg</span>
                    <span>·</span>
                    <span>{fd.table_count} tables</span>
                    <span>·</span>
                    <span>{fd.metric_count} metrics</span>
                    <span>·</span>
                    <span>{fd.link_count} links</span>
                  </div>
                  <div className="an-digest-actions">
                    <button
                      type="button"
                      className="an-digest-btn"
                      onClick={() => {
                        setBuilderMode("single_file");
                        setSelectedDocId(fd.id);
                        void runBuildReport({
                          scope_mode: "single_file",
                          document_id: fd.id,
                        });
                      }}
                    >
                      <BarChart3 size={12} />
                      <span>Single File Analytics</span>
                    </button>
                    <button
                      type="button"
                      className="an-digest-btn is-primary"
                      onClick={() =>
                        onAskInChat({
                          scopeDocId: fd.id,
                          prompt: `Summarize the key findings and important metrics in "${fd.title}"`,
                          autoSend: false,
                        })
                      }
                    >
                      <MessageSquare size={12} />
                      <span>Ask AI</span>
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {/* Direct Ask-AI Suggested Questions Footer */}
        {activeReport.suggested_questions.length > 0 && (
          <section className="an-ask-footer">
            <div className="an-ask-footer__head">
              <MessageSquare size={15} />
              <div>
                <h4>Continue Exploring in AI Chat</h4>
                <p>
                  Click any question below to open Chat with{" "}
                  {isSingle ? "this document" : "the full repository"} scoped.
                </p>
              </div>
            </div>
            <div className="an-ask-q-list">
              {activeReport.suggested_questions.map((q) => (
                <button
                  key={q}
                  type="button"
                  className="an-ask-q-chip"
                  onClick={() =>
                    onAskInChat({
                      scopeDocId: singleDocId,
                      prompt: q,
                      autoSend: true,
                    })
                  }
                >
                  <span>{q}</span>
                  <ArrowUpRight size={13} />
                </button>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

export default AnalyticsWorkspace;
