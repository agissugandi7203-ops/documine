"use client";

import React, { useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  BookOpen,
  CheckCircle2,
  Database,
  FileText,
  GitCompare,
  Headphones,
  Layers,
  Network,
  RefreshCw,
  Share2,
  Trash2,
  Upload,
} from "lucide-react";
import type {
  AnalyticsDashboardResponse,
  AnalyticsWidget,
  AudioBriefingResponse,
  DocumentItem,
  DocumentsSummary,
  QuizResponse,
  RelationshipGraphResponse,
  SearchMatch,
  SynthesisResponse,
} from "@/lib/dashboard-api";
import { MonochromeChart } from "./MonochromeChart";
import { QuickActionsBar } from "./QuickActionsBar";
import { NAV_ITEMS, type DashboardSectionId } from "./types";

interface MainCanvasProps {
  activeNavId: DashboardSectionId;
  userName: string;
  workspaceName: string;
  backendOnline: boolean;
  loadingData: boolean;
  uploading: boolean;
  uploadError: string | null;
  summary: DocumentsSummary | null;
  documents: DocumentItem[];
  selectedDocId: string | null;
  analytics: AnalyticsDashboardResponse | null;
  generatedWidget: AnalyticsWidget | null;
  analyticsGenerating: boolean;
  searchQuery: string;
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
  onTriggerUpload: () => void;
  onDropFile: (file: File) => void;
  onDeleteDoc: (docId: string) => void;
  onRefreshData: () => void;
  onGenerateWidget: (chartType: "bar" | "line" | "pie", prompt: string) => void;
  onRunSynthesis: (docIds: string[]) => void;
  onRecomputeRelationships: () => void;
  onGenerateQuiz: (docId: string) => void;
  onGenerateAudio: (docId?: string) => void;
  onDropPreviewCardOnCanvas: (previewIndex: number) => void;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Free-form Atelier Bento Workspace blending clean alabaster surfaces,
 * obsidian contrast card, terracotta accents, and original vector assets.
 */
export function MainCanvas({
  activeNavId,
  userName,
  workspaceName,
  backendOnline,
  loadingData,
  uploading,
  uploadError,
  summary,
  documents,
  selectedDocId,
  analytics,
  generatedWidget,
  analyticsGenerating,
  searchQuery,
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
  onTriggerUpload,
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
  const [selectedSynthIds, setSelectedSynthIds] = useState<string[]>([]);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({});

  useEffect(() => {
    if (documents.length >= 2 && selectedSynthIds.length === 0) {
      setSelectedSynthIds([documents[0].id, documents[1].id]);
    }
  }, [documents, selectedSynthIds.length]);

  const activeDoc =
    documents.find((d) => d.id === selectedDocId) ?? documents[0] ?? null;

  const primaryWidget =
    generatedWidget ?? analytics?.widgets?.[0] ?? analytics?.auto_widgets?.[0] ?? null;

  const totalDocs =
    summary?.total_documents ??
    analytics?.corpus_telemetry?.total_documents ??
    documents.length;
  const readyDocs =
    summary?.ready_count ??
    documents.filter((d) =>
      ["ready", "partial_ready", "completed"].includes(
        d.status || d.processing_status
      )
    ).length;
  const totalPages =
    analytics?.corpus_telemetry?.total_pages ??
    documents.reduce((acc, d) => acc + (d.page_count || 1), 0);
  const totalMetrics = analytics?.corpus_telemetry?.total_verified_metrics ?? 0;
  const totalTables = analytics?.corpus_telemetry?.total_tables ?? 0;
  const totalRelationships =
    analytics?.corpus_telemetry?.total_relationships ??
    relationships?.edge_count ??
    0;
  const corpusProfile = (
    analytics?.detected_corpus_profile || "empty_corpus"
  ).replace(/_/g, " ");

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
      {/* Top Pill Navigation Header */}
      <header className="db-top-header">
        <div className="db-top-brand-meta">
          <span className="db-brand-wordmark">DocuMind</span>
          <span className="db-workspace-chip">{workspaceName}</span>
        </div>

        <nav className="db-top-tabs" aria-label="Workspace Sections">
          {NAV_ITEMS.map((tab) => {
            const isActive = activeNavId === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                className={`db-top-tab ${isActive ? "db-top-tab--active" : ""}`}
                onClick={() => onSelectNav(tab.id)}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>

        <div className="db-top-status-group">
          <span
            className={`db-status-pill ${
              backendOnline ? "db-status-pill--online" : "db-status-pill--offline"
            }`}
          >
            <span className="db-status-dot" aria-hidden="true" />
            {backendOnline ? "API Online" : "Standby"}
          </span>
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
        </div>
      </header>

      {/* Hero Greeting + Quick Actions Row (Zero AI input bar) */}
      <div className="db-greeting-row">
        <div className="db-greeting-copy">
          <h1 className="db-greeting-title">
            {activeNavId === "homes" && `Welcome back, ${userName}!`}
            {activeNavId === "layers" && "Document Repository & Layers"}
            {activeNavId === "analytics" && "DuckDB Verified Analytics"}
            {activeNavId === "synthesis" && "Cross-Document Synthesis"}
            {activeNavId === "studio" && "Adaptive Learning Studio"}
          </h1>
          <p className="db-greeting-sub">
            {activeDoc
              ? `Active source: ${activeDoc.title} · Corpus: ${corpusProfile}`
              : `Manage your documents, verified metrics, and synthesis · ${corpusProfile}`}
          </p>
        </div>

        <QuickActionsBar
          activeNavId={activeNavId}
          uploading={uploading}
          onTriggerUpload={onTriggerUpload}
          onNavigate={onSelectNav}
        />
      </div>

      {uploadError && (
        <div className="db-stage-banner">
          <AlertTriangle size={14} />
          <span>{uploadError}</span>
        </div>
      )}

      {searchQuery.trim() && searchMatches.length > 0 && (
        <div className="db-search-results-strip">
          <div className="db-search-strip-label">
            Matches for &ldquo;{searchQuery}&rdquo; ({searchMatches.length})
          </div>
          <div className="db-search-hits">
            {searchMatches.slice(0, 3).map((m, idx) => (
              <button
                key={`${m.chunk_id || m.id || idx}`}
                type="button"
                className="db-search-hit-chip"
                onClick={() => {
                  const targetId = m.doc_id || m.document_id;
                  if (targetId) {
                    onSelectDoc(targetId);
                    onSelectNav("layers");
                  }
                }}
              >
                <span className="db-hit-title">
                  {m.doc_title || "Document"} · p.{m.page_number || 1}
                </span>
                <span className="db-hit-snippet">
                  {(m.text_content || m.content || "").slice(0, 88)}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main Scrollable Bento Content */}
      <div className="db-stage-scroll">
        {activeNavId === "homes" && (
          <div className="db-homes-layout">
            {/* 3-Card Asymmetric KPI Strip (Light + Light + Dark Obsidian Contrast) */}
            <div className="db-kpi-row">
              <div className="db-kpi-card">
                <div className="db-kpi-head">
                  <span className="db-kpi-badge">
                    <FileText size={13} />
                    <span>Documents</span>
                  </span>
                  <button
                    type="button"
                    className="db-kpi-arrow"
                    aria-label="Open document layers"
                    onClick={() => onSelectNav("layers")}
                  >
                    <ArrowUpRight size={14} />
                  </button>
                </div>
                <div className="db-kpi-value">{totalDocs}</div>
                <div className="db-kpi-footer">
                  <span className="db-kpi-pill">{readyDocs} ready</span>
                  <span className="db-kpi-muted">
                    {summary?.processing_count ?? 0} queued
                  </span>
                </div>
              </div>

              <div className="db-kpi-card">
                <div className="db-kpi-head">
                  <span className="db-kpi-badge db-kpi-badge--sage">
                    <BookOpen size={13} />
                    <span>Pages & Metrics</span>
                  </span>
                  <button
                    type="button"
                    className="db-kpi-arrow"
                    aria-label="Open analytics"
                    onClick={() => onSelectNav("analytics")}
                  >
                    <ArrowUpRight size={14} />
                  </button>
                </div>
                <div className="db-kpi-value">{totalPages}</div>
                <div className="db-kpi-footer">
                  <span className="db-kpi-pill">{totalMetrics} metrics</span>
                  <span className="db-kpi-muted">{totalTables} tables</span>
                </div>
              </div>

              <div className="db-kpi-card db-kpi-card--dark">
                <div className="db-kpi-head">
                  <span className="db-kpi-badge db-kpi-badge--dark">
                    <Share2 size={13} />
                    <span>Knowledge Graph</span>
                  </span>
                  <button
                    type="button"
                    className="db-kpi-arrow db-kpi-arrow--dark"
                    aria-label="Open synthesis graph"
                    onClick={() => onSelectNav("synthesis")}
                  >
                    <ArrowUpRight size={14} />
                  </button>
                </div>
                <div className="db-kpi-value">{totalRelationships}</div>
                <div className="db-kpi-spark-row">
                  <span className="db-kpi-dark-sub">{corpusProfile}</span>
                  <svg
                    className="db-mini-sparkline"
                    viewBox="0 0 96 26"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path
                      d="M2 21L18 15L32 18L48 9L64 13L78 5L94 8"
                      stroke="#e85a24"
                      strokeWidth="2.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              </div>
            </div>

            {/* Middle Bento Grid: Chart / Original Asset + Recent Documents Table */}
            <div className="db-homes-split">
              <div className="db-panel-box db-panel-box--chart">
                <div className="db-panel-box-head">
                  <div>
                    <div className="db-panel-box-title">
                      {primaryWidget
                        ? primaryWidget.title
                        : "Repository Telemetry"}
                    </div>
                    <div className="db-panel-box-sub">
                      {primaryWidget
                        ? primaryWidget.insight_summary
                        : "Visual overview of your indexed documents & DuckDB metrics"}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="db-mini-pill-btn"
                    onClick={() => onSelectNav("analytics")}
                  >
                    <span>Explore</span>
                    <ArrowUpRight size={12} />
                  </button>
                </div>

                {primaryWidget &&
                primaryWidget.echarts_spec &&
                (primaryWidget.echarts_spec.series?.[0]?.data?.length ?? 0) >
                  0 ? (
                  <MonochromeChart widget={primaryWidget} height={210} />
                ) : (
                  <div className="db-asset-empty-card">
                    <img
                      src="/assets/workspace-emblem.svg"
                      alt="DocuMind analytical layers illustration"
                      className="db-emblem-illustration"
                    />
                    <div className="db-asset-empty-copy">
                      <div className="db-asset-empty-title">
                        Ready for your first document
                      </div>
                      <p>
                        Drop any PDF, spreadsheet, or note here to unlock DuckDB
                        telemetry, grounded citations, and synthesis.
                      </p>
                      <button
                        type="button"
                        className="db-mini-pill-btn db-mini-pill-btn--accent"
                        onClick={onTriggerUpload}
                      >
                        <Upload size={12} />
                        <span>Upload Document</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="db-panel-box">
                <div className="db-panel-box-head">
                  <div>
                    <div className="db-panel-box-title">Recent Documents</div>
                    <div className="db-panel-box-sub">
                      {filteredDocs.length} document(s) in workspace
                    </div>
                  </div>
                  <button
                    type="button"
                    className="db-mini-pill-btn"
                    onClick={() => onSelectNav("layers")}
                  >
                    <span>View All</span>
                    <ArrowUpRight size={12} />
                  </button>
                </div>

                {filteredDocs.length > 0 ? (
                  <ul className="db-doc-list">
                    {filteredDocs.slice(0, 5).map((doc) => {
                      const isSelected = activeDoc?.id === doc.id;
                      const st = (
                        doc.status ||
                        doc.processing_status ||
                        "ready"
                      ).toLowerCase();
                      const isReady = ["ready", "completed", "partial_ready"].includes(
                        st
                      );

                      return (
                        <li key={doc.id}>
                          <button
                            type="button"
                            className={`db-doc-row ${
                              isSelected ? "db-doc-row--selected" : ""
                            }`}
                            onClick={() => onSelectDoc(doc.id)}
                          >
                            <span className="db-doc-avatar">
                              <FileText size={14} />
                            </span>
                            <div className="db-doc-row-meta">
                              <span className="db-doc-row-title">
                                {doc.title}
                              </span>
                              <span className="db-doc-row-sub">
                                {doc.page_count}p ·{" "}
                                {formatBytes(doc.file_size_bytes)} ·{" "}
                                {doc.category || "document"}
                              </span>
                            </div>
                            <span
                              className={`db-doc-status-chip ${
                                isReady
                                  ? "db-doc-status-chip--ready"
                                  : "db-doc-status-chip--pending"
                              }`}
                            >
                              {st}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <div className="db-empty-dash-box">
                    <Layers size={22} className="db-empty-icon" />
                    <p>No documents uploaded yet.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeNavId === "layers" && (
          <div className="db-homes-split">
            <div className="db-panel-box">
              <div className="db-panel-box-head">
                <div className="db-panel-box-title">
                  Repository Files ({filteredDocs.length})
                </div>
                <button
                  type="button"
                  className="db-mini-pill-btn db-mini-pill-btn--accent"
                  onClick={onTriggerUpload}
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
                            {doc.page_count} pages ·{" "}
                            {formatBytes(doc.file_size_bytes)}
                          </span>
                        </div>
                        <span className="db-doc-status-chip">
                          {doc.status || doc.processing_status}
                        </span>
                      </button>
                      <button
                        type="button"
                        className="db-doc-delete-btn"
                        aria-label={`Delete ${doc.title}`}
                        onClick={() => onDeleteDoc(doc.id)}
                      >
                        <Trash2 size={13} />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="db-empty-dash-box">
                  <p>No matching documents in this workspace.</p>
                </div>
              )}
            </div>

            <div className="db-panel-box">
              <div className="db-panel-box-head">
                <div className="db-panel-box-title">
                  {activeDoc ? activeDoc.title : "Layer Inspector"}
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
                    {activeDoc.summary ||
                      "Document indexed in workspace. Use Analytics, Synthesis, or Studio to extract insights."}
                  </p>
                  <div className="db-inspector-stats">
                    <span>Tables: {activeDoc.table_count ?? 0}</span>
                    <span>Metrics: {activeDoc.metric_count ?? 0}</span>
                    <span>
                      Domain:{" "}
                      {activeDoc.primary_domain || activeDoc.category || "General"}
                    </span>
                  </div>
                  {(activeDoc.main_topics?.length ?? 0) > 0 && (
                    <div className="db-topic-chips">
                      {activeDoc.main_topics?.slice(0, 6).map((topic) => (
                        <span key={topic} className="db-topic-chip">
                          {topic}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="db-empty-dash-box">
                  <p>Select a document on the left to inspect its metadata.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeNavId === "analytics" && (
          <div className="db-analytics-layout">
            <div className="db-analytics-toolbar">
              <span className="db-panel-box-sub">
                Deterministic DuckDB SQL Engine
              </span>
              <div className="db-analytics-presets">
                <button
                  type="button"
                  className="db-mini-pill-btn db-mini-pill-btn--accent"
                  disabled={analyticsGenerating}
                  onClick={() =>
                    onGenerateWidget("bar", "Compare key metrics across documents")
                  }
                >
                  {analyticsGenerating ? "Running..." : "Bar Summary"}
                </button>
                <button
                  type="button"
                  className="db-mini-pill-btn"
                  disabled={analyticsGenerating}
                  onClick={() =>
                    onGenerateWidget("line", "Show trend across categories or periods")
                  }
                >
                  Line Trend
                </button>
                <button
                  type="button"
                  className="db-mini-pill-btn"
                  disabled={analyticsGenerating}
                  onClick={() =>
                    onGenerateWidget("pie", "Show proportion breakdown of metrics")
                  }
                >
                  Pie Share
                </button>
              </div>
            </div>

            {primaryWidget ? (
              <div className="db-panel-box">
                <div className="db-panel-box-head">
                  <div>
                    <div className="db-panel-box-title">{primaryWidget.title}</div>
                    <div className="db-panel-box-sub">
                      {primaryWidget.insight_summary}
                    </div>
                  </div>
                </div>
                {primaryWidget.echarts_spec &&
                  (primaryWidget.echarts_spec.series?.[0]?.data?.length ?? 0) >
                    0 && <MonochromeChart widget={primaryWidget} height={240} />}
                {primaryWidget.sql_query && (
                  <div className="db-sql-preview">
                    <Database size={12} />
                    <code>{primaryWidget.sql_query}</code>
                  </div>
                )}
              </div>
            ) : (
              <div className="db-empty-dash-box">
                <p>Upload documents first to unlock DuckDB SQL analytics.</p>
              </div>
            )}
          </div>
        )}

        {activeNavId === "synthesis" && (
          <div className="db-homes-split">
            <div className="db-panel-box">
              <div className="db-panel-box-head">
                <div className="db-panel-box-title">
                  Compare Documents ({selectedSynthIds.length}/10)
                </div>
                <button
                  type="button"
                  className="db-mini-pill-btn db-mini-pill-btn--accent"
                  disabled={synthesisLoading || selectedSynthIds.length < 2}
                  onClick={() => onRunSynthesis(selectedSynthIds)}
                >
                  <GitCompare size={12} />
                  <span>{synthesisLoading ? "Synthesizing..." : "Compare"}</span>
                </button>
              </div>

              {documents.length >= 2 ? (
                <div className="db-synth-checklist">
                  {documents.map((doc) => {
                    const checked = selectedSynthIds.includes(doc.id);
                    return (
                      <button
                        key={doc.id}
                        type="button"
                        className={`db-doc-row ${
                          checked ? "db-doc-row--selected" : ""
                        }`}
                        onClick={() => toggleSynthDoc(doc.id)}
                      >
                        <CheckCircle2 size={14} />
                        <span className="db-doc-row-title">{doc.title}</span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="db-empty-dash-box">
                  <p>Upload at least 2 documents to run Cross-Document Synthesis.</p>
                </div>
              )}

              {relationships && (
                <div className="db-rel-footer">
                  <span className="db-panel-box-sub">
                    <Network size={12} /> {relationships.node_count} nodes ·{" "}
                    {relationships.edge_count} edges
                  </span>
                  <button
                    type="button"
                    className="db-mini-pill-btn"
                    onClick={onRecomputeRelationships}
                  >
                    Recompute Graph
                  </button>
                </div>
              )}
            </div>

            <div className="db-panel-box">
              <div className="db-panel-box-head">
                <div className="db-panel-box-title">
                  {synthesisResult
                    ? synthesisResult.synthesis_headline
                    : "Synthesis Matrix"}
                </div>
              </div>

              {synthesisResult ? (
                <div className="db-synth-results">
                  <p className="db-inspector-summary">
                    {synthesisResult.executive_summary}
                  </p>
                  {synthesisResult.matrix.map((row, idx) => (
                    <div key={idx} className="db-synth-row">
                      <div className="db-synth-row-title">
                        <span>{row.concept}</span>
                        {row.is_contradiction && (
                          <span className="db-doc-status-chip">Conflict</span>
                        )}
                      </div>
                      <p className="db-synth-row-analysis">
                        {row.comparison_analysis}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="db-empty-dash-box">
                  <p>Select 2 or more documents and click Compare.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeNavId === "studio" && (
          <div className="db-homes-split">
            <div className="db-panel-box">
              <div className="db-panel-box-head">
                <div className="db-panel-box-title">Adaptive Quiz</div>
                <button
                  type="button"
                  className="db-mini-pill-btn db-mini-pill-btn--accent"
                  disabled={!activeDoc || quizLoading}
                  onClick={() => activeDoc && onGenerateQuiz(activeDoc.id)}
                >
                  <BookOpen size={12} />
                  <span>{quizLoading ? "Generating..." : "Generate Quiz"}</span>
                </button>
              </div>

              {quizResult ? (
                <div className="db-quiz-list">
                  {quizResult.questions.map((q) => {
                    const picked = quizAnswers[q.question_id];
                    return (
                      <div key={q.question_id} className="db-quiz-card">
                        <div className="db-quiz-q">{q.question_text}</div>
                        <div className="db-quiz-opts">
                          {q.options.map((opt) => (
                            <button
                              key={opt.label}
                              type="button"
                              className={`db-quiz-opt ${
                                picked === opt.label
                                  ? opt.label === q.correct_option
                                    ? "db-quiz-opt--correct"
                                    : "db-quiz-opt--wrong"
                                  : ""
                              }`}
                              onClick={() =>
                                setQuizAnswers((prev) => ({
                                  ...prev,
                                  [q.question_id]: opt.label,
                                }))
                              }
                            >
                              <strong>{opt.label}.</strong> {opt.text}
                            </button>
                          ))}
                        </div>
                        {picked && (
                          <div className="db-quiz-proof">
                            Page {q.source_page}: {q.explanation}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="db-empty-dash-box">
                  <p>
                    {activeDoc
                      ? `Generate grounded questions for "${activeDoc.title}".`
                      : "Upload a document first to generate an adaptive quiz."}
                  </p>
                </div>
              )}
            </div>

            <div className="db-panel-box">
              <div className="db-panel-box-head">
                <div className="db-panel-box-title">Audio Briefing Script</div>
                <button
                  type="button"
                  className="db-mini-pill-btn db-mini-pill-btn--accent"
                  disabled={!activeDoc || audioLoading}
                  onClick={() => onGenerateAudio(activeDoc?.id)}
                >
                  <Headphones size={12} />
                  <span>{audioLoading ? "Writing..." : "Generate Script"}</span>
                </button>
              </div>

              {audioResult ? (
                <div className="db-audio-script">
                  <div className="db-panel-box-sub">
                    {audioResult.title} · {audioResult.duration_estimate}
                  </div>
                  {audioResult.script.map((turn, idx) => (
                    <div key={idx} className="db-audio-turn">
                      <span className="db-audio-speaker">{turn.speaker}:</span>{" "}
                      <span>{turn.text}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="db-empty-dash-box">
                  <p>
                    Create a 2-host audio briefing script from your active
                    document.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
