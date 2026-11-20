"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUpRight,
  FileSpreadsheet,
  FileText,
  Loader2,
  MessageSquare,
  Search,
  X,
} from "lucide-react";
import type { DocumentItem, SearchMatch } from "@/lib/dashboard-api";

interface GlobalSearchBarProps {
  query: string;
  loading: boolean;
  resultCount: number | null;
  matches: SearchMatch[];
  documents: DocumentItem[];
  onChange: (q: string) => void;
  onClear: () => void;
  onOpenDocument: (docId: string) => void;
  onAskDocument?: (docId: string) => void;
}

/**
 * Global Workspace Search Bar (decoupled from the right sidebar)
 * - Available across all dashboard pages
 * - Floating spotlight popover on focus + query (never pushes layout down)
 */
export function GlobalSearchBar({
  query,
  loading,
  resultCount,
  matches,
  documents,
  onChange,
  onClear,
  onOpenDocument,
  onAskDocument,
}: GlobalSearchBarProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);

  const trimmed = query.trim();
  const isOpen = focused && trimmed.length > 0;

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) {
        setFocused(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setFocused(false);
        inputRef.current?.blur();
      }
    };
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("keydown", handleEsc);
    };
  }, []);

  const docHits = useMemo(() => {
    if (!trimmed) return [];
    const q = trimmed.toLowerCase();
    return documents
      .filter(
        (d) =>
          d.title.toLowerCase().includes(q) ||
          (d.category || "").toLowerCase().includes(q) ||
          (d.main_topics || []).some((t) => t.toLowerCase().includes(q))
      )
      .slice(0, 4);
  }, [trimmed, documents]);

  const chunkHits = useMemo(() => matches.slice(0, 4), [matches]);

  const handleOpenHit = (docId: string) => {
    setFocused(false);
    onOpenDocument(docId);
  };

  return (
    <div className="db-global-search-wrap" ref={wrapRef}>
      <div
        className={`db-global-search-pill ${
          focused ? "db-global-search-pill--focused" : ""
        }`}
      >
        <Search className="db-global-search-icon" size={14} aria-hidden="true" />
        <input
          ref={inputRef}
          type="search"
          className="db-global-search-input"
          value={query}
          onFocus={() => setFocused(true)}
          onChange={(e) => {
            onChange(e.target.value);
            if (!focused) setFocused(true);
          }}
          placeholder="Search files, topics, pages..."
          aria-label="Global workspace search"
        />

        {loading ? (
          <Loader2 className="db-global-search-spinner db-spin" size={14} />
        ) : trimmed ? (
          <div className="db-global-search-tail">
            {resultCount !== null && (
              <span className="db-global-search-count">{resultCount}</span>
            )}
            <button
              type="button"
              className="db-global-search-clear"
              aria-label="Clear search"
              onClick={() => {
                onClear();
                inputRef.current?.focus();
              }}
            >
              <X size={11} />
            </button>
          </div>
        ) : (
          <kbd className="db-global-search-kbd" aria-hidden="true">
            ⌘K
          </kbd>
        )}
      </div>

      {isOpen && (
        <div
          className="db-search-popover"
          role="listbox"
          aria-label="Search results"
        >
          {loading && docHits.length === 0 && chunkHits.length === 0 ? (
            <div className="db-search-popover-empty">
              <Loader2 size={14} className="db-spin" />
              <span>Searching documents &amp; indexed passages...</span>
            </div>
          ) : docHits.length === 0 && chunkHits.length === 0 ? (
            <div className="db-search-popover-empty">
              <span>No matches for &ldquo;{trimmed}&rdquo;</span>
            </div>
          ) : (
            <div className="db-search-popover-scroll">
              {docHits.length > 0 && (
                <div className="db-search-popover-group">
                  <div className="db-search-popover-label">Files</div>
                  {docHits.map((doc) => {
                    const isSheet =
                      doc.file_type?.toLowerCase().includes("csv") ||
                      doc.file_type?.toLowerCase().includes("xls");
                    return (
                      <div key={doc.id} className="db-search-popover-row">
                        <button
                          type="button"
                          className="db-search-popover-main"
                          onClick={() => handleOpenHit(doc.id)}
                        >
                          <span className="db-search-popover-ico">
                            {isSheet ? (
                              <FileSpreadsheet size={13} />
                            ) : (
                              <FileText size={13} />
                            )}
                          </span>
                          <div className="db-search-popover-text">
                            <span className="db-search-popover-title">
                              {doc.title}
                            </span>
                            <span className="db-search-popover-sub">
                              {doc.page_count || 1}p ·{" "}
                              {doc.category || "Document"}
                            </span>
                          </div>
                          <ArrowUpRight
                            size={12}
                            className="db-search-popover-arrow"
                          />
                        </button>
                        {onAskDocument && (
                          <button
                            type="button"
                            className="db-search-popover-ask"
                            title={`Ask AI about ${doc.title}`}
                            onClick={() => {
                              setFocused(false);
                              onAskDocument(doc.id);
                            }}
                          >
                            <MessageSquare size={12} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {chunkHits.length > 0 && (
                <div className="db-search-popover-group">
                  <div className="db-search-popover-label">
                    Matching Passages
                  </div>
                  {chunkHits.map((m, idx) => {
                    const targetId = m.doc_id || m.document_id;
                    return (
                      <button
                        key={`${m.chunk_id || m.id || idx}`}
                        type="button"
                        className="db-search-popover-chunk"
                        onClick={() => {
                          if (targetId) handleOpenHit(targetId);
                        }}
                      >
                        <div className="db-search-popover-chunk-top">
                          <span className="db-search-popover-title">
                            {m.doc_title || "Document"}
                          </span>
                          <span className="db-search-popover-page">
                            p.{m.page_number || 1}
                          </span>
                        </div>
                        <p className="db-search-popover-snippet">
                          {(m.text_content || m.content || "").slice(0, 110)}
                        </p>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
