"use client";

import React, { useState } from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  FileText,
  GitCompare,
  Layers,
  Network,
  RefreshCw,
  Upload,
} from "lucide-react";
import type {
  DocumentItem,
  RelationshipGraphResponse,
  SynthesisResponse,
} from "@/lib/dashboard-api";

interface SynthesisWorkspacePanelProps {
  documents: DocumentItem[];
  selectedSynthIds: string[];
  synthesisResult: SynthesisResponse | null;
  synthesisLoading: boolean;
  relationships: RelationshipGraphResponse | null;
  onToggleDoc: (docId: string) => void;
  onRunSynthesis: (docIds: string[], focusQuery?: string) => void;
  onRecomputeRelationships: () => void;
  onTriggerUpload: () => void;
  onOpenDocument: (docId: string) => void;
}

export function SynthesisWorkspacePanel({
  documents,
  selectedSynthIds,
  synthesisResult,
  synthesisLoading,
  relationships,
  onToggleDoc,
  onRunSynthesis,
  onRecomputeRelationships,
  onTriggerUpload,
  onOpenDocument,
}: SynthesisWorkspacePanelProps) {
  const [focusQuery, setFocusQuery] = useState("");

  const docTitleById = Object.fromEntries(documents.map((d) => [d.id, d.title]));
  const docAId = selectedSynthIds[0] || "";
  const docBId = selectedSynthIds[1] || "";

  const handleRun = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (selectedSynthIds.length < 2 || synthesisLoading) return;
    onRunSynthesis(selectedSynthIds, focusQuery);
  };

  return (
    <div className="db-homes-split db-synth-layout">
      {/* Left Selection & Focus Panel */}
      <div className="db-panel-box">
        <div className="db-panel-box-head">
          <div>
            <div className="db-panel-box-title">
              Compare Files ({selectedSynthIds.length})
            </div>
            <p className="db-panel-box-sub" style={{ margin: "2px 0 0" }}>
              Select 2 to 10 documents to audit agreements, contrasts &amp; metrics
            </p>
          </div>
          <button
            type="button"
            className="db-mini-pill-btn db-mini-pill-btn--accent"
            disabled={synthesisLoading || selectedSynthIds.length < 2}
            onClick={() => handleRun()}
          >
            <GitCompare size={12} />
            <span>{synthesisLoading ? "Synthesizing..." : "Compare"}</span>
          </button>
        </div>

        <form className="db-synth-focus-row" onSubmit={handleRun}>
          <input
            type="text"
            className="db-synth-focus-input"
            value={focusQuery}
            onChange={(e) => setFocusQuery(e.target.value)}
            placeholder="Optional comparison focus (e.g. schedules, roles, costs)..."
            aria-label="Comparison focus question"
          />
        </form>

        {documents.length >= 2 ? (
          <div className="db-synth-checklist">
            {documents.map((doc) => {
              const checked = selectedSynthIds.includes(doc.id);
              return (
                <button
                  key={doc.id}
                  type="button"
                  className={`db-doc-row ${checked ? "db-doc-row--selected" : ""}`}
                  onClick={() => onToggleDoc(doc.id)}
                >
                  <CheckCircle2 size={14} />
                  <div className="db-doc-row-meta">
                    <span className="db-doc-row-title">{doc.title}</span>
                    <span className="db-doc-row-sub">
                      {doc.page_count || 1}p · {doc.category || "General"}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="db-empty-dash-box">
            <Layers size={22} className="db-empty-icon" />
            <p>Upload at least 2 documents to compare insights side by side.</p>
            <button
              type="button"
              className="db-mini-pill-btn db-mini-pill-btn--accent"
              onClick={onTriggerUpload}
            >
              <Upload size={12} />
              <span>Upload PDF</span>
            </button>
          </div>
        )}

        {relationships && (
          <div className="db-rel-footer">
            <span className="db-panel-box-sub">
              <Network size={12} /> {relationships.node_count} nodes ·{" "}
              {relationships.edge_count} links
            </span>
            <button
              type="button"
              className="db-mini-pill-btn"
              onClick={onRecomputeRelationships}
            >
              <RefreshCw size={11} />
              <span>Recompute</span>
            </button>
          </div>
        )}
      </div>

      {/* Right Comparative Synthesis Results */}
      <div className="db-panel-box">
        <div className="db-panel-box-head">
          <div className="db-panel-box-title">
            {synthesisResult
              ? synthesisResult.synthesis_headline
              : "Cross-Document Comparative Matrix"}
          </div>
        </div>

        {synthesisResult ? (
          <div className="db-synth-results">
            <div className="db-synth-exec-card">
              <span className="db-synth-section-kicker">Executive Synthesis</span>
              <p className="db-inspector-summary" style={{ whiteSpace: "pre-line", margin: 0 }}>
                {synthesisResult.executive_summary}
              </p>
            </div>

            {synthesisResult.key_agreements && synthesisResult.key_agreements.length > 0 && (
              <div className="db-synth-agreements">
                <span className="db-synth-section-kicker">Key Agreements &amp; Shared Context</span>
                <div className="db-synth-chip-list">
                  {synthesisResult.key_agreements.map((item, idx) => (
                    <span key={idx} className="db-synth-agree-pill">
                      <CheckCircle2 size={12} />
                      <span>{item}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="db-synth-matrix-list">
              {synthesisResult.matrix.map((row, idx) => (
                <div
                  key={idx}
                  className={`db-synth-row ${row.is_contradiction ? "is-conflict" : ""}`}
                >
                  <div className="db-synth-row-title">
                    <span>{row.concept}</span>
                    {row.is_contradiction && (
                      <span className="db-synth-conflict-pill">
                        <AlertTriangle size={11} />
                        <span>Conflict / Variance</span>
                      </span>
                    )}
                  </div>

                  <div className="db-synth-stance-grid">
                    <div className="db-synth-stance-box">
                      <span className="db-synth-stance-doc">
                        {docTitleById[docAId] || "Document A"}
                      </span>
                      <p>{row.doc_a_stance}</p>
                    </div>
                    <div className="db-synth-stance-box">
                      <span className="db-synth-stance-doc">
                        {docTitleById[docBId] || "Document B"}
                      </span>
                      <p>{row.doc_b_stance}</p>
                    </div>
                  </div>

                  <p className="db-synth-row-analysis">{row.comparison_analysis}</p>
                </div>
              ))}
            </div>

            {synthesisResult.emergent_takeaways && synthesisResult.emergent_takeaways.length > 0 && (
              <div className="db-synth-takeaways">
                <span className="db-synth-section-kicker">Emergent Takeaways</span>
                <ul>
                  {synthesisResult.emergent_takeaways.map((tk, idx) => (
                    <li key={idx}>{tk}</li>
                  ))}
                </ul>
              </div>
            )}

            {synthesisResult.citations && synthesisResult.citations.length > 0 && (
              <div className="db-synth-cites">
                <span className="db-synth-section-kicker">
                  Verified Source Evidence ({synthesisResult.citations.length})
                </span>
                <div className="db-synth-chip-list">
                  {synthesisResult.citations.map((cit, idx) => {
                    const targetId = cit.doc_id || cit.document_id || "";
                    const title =
                      cit.doc_title ||
                      cit.document_title ||
                      docTitleById[targetId] ||
                      "Source Document";
                    return (
                      <button
                        key={`${cit.chunk_id}-${idx}`}
                        type="button"
                        className="db-synth-cite-btn"
                        disabled={!targetId}
                        onClick={() => targetId && onOpenDocument(targetId)}
                      >
                        <FileText size={11} />
                        <span>
                          {title} · p. {cit.page_number || 1}
                        </span>
                        <ArrowUpRight size={11} />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="db-empty-dash-box">
            <GitCompare size={24} className="db-empty-icon" />
            <p>
              Select 2 or more documents on the left, enter an optional focus angle,
              and click Compare.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
