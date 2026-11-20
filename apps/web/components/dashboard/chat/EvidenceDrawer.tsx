"use client";

import React from "react";
import {
  ArrowUpRight,
  BookOpen,
  Clock,
  FileText,
  Loader2,
  Plus,
  X,
} from "lucide-react";
import type { ChatCitation, ConversationSummary } from "@/lib/dashboard-api";

export type ChatDrawerTab = "citations" | "history";

interface EvidenceDrawerProps {
  isOpen: boolean;
  activeTab: ChatDrawerTab;
  onChangeTab: (tab: ChatDrawerTab) => void;
  citations: ChatCitation[];
  highlightedChunkId?: string | null;
  conversations: ConversationSummary[];
  activeConversationId: string | null;
  loadingHistory: boolean;
  onSelectConversation: (convId: string) => void;
  onStartNewChat: () => void;
  onOpenDocument?: (docId: string) => void;
  onClose: () => void;
}

export function EvidenceDrawer({
  isOpen,
  activeTab,
  onChangeTab,
  citations,
  highlightedChunkId,
  conversations,
  activeConversationId,
  loadingHistory,
  onSelectConversation,
  onStartNewChat,
  onOpenDocument,
  onClose,
}: EvidenceDrawerProps) {
  if (!isOpen) return null;

  return (
    <aside
      className="dm-chat-drawer"
      aria-label="Citations Evidence and Chat History"
    >
      <header className="dm-chat-drawer__head">
        <div className="dm-chat-drawer__tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "citations"}
            className={`dm-chat-drawer__tab ${
              activeTab === "citations" ? "is-active" : ""
            }`}
            onClick={() => onChangeTab("citations")}
          >
            <BookOpen size={13} />
            <span>Citations ({citations.length})</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "history"}
            className={`dm-chat-drawer__tab ${
              activeTab === "history" ? "is-active" : ""
            }`}
            onClick={() => onChangeTab("history")}
          >
            <Clock size={13} />
            <span>History ({conversations.length})</span>
          </button>
        </div>

        <button
          type="button"
          className="dm-chat-drawer__close"
          onClick={onClose}
          aria-label="Close panel"
        >
          <X size={15} />
        </button>
      </header>

      <div className="dm-chat-drawer__body">
        {activeTab === "citations" ? (
          citations.length === 0 ? (
            <div className="dm-chat-drawer__empty">
              <FileText size={22} />
              <p>
                No citations in this conversation yet. Ask a question about your
                documents to inspect source pages.
              </p>
            </div>
          ) : (
            <div className="dm-chat-drawer__list">
              {citations.map((cit, idx) => {
                const docId = cit.document_id || cit.doc_id || "";
                const title = cit.document_title || cit.doc_title || "Document";
                const quote = cit.quote || cit.text_excerpt || "";
                const isHighlighted =
                  highlightedChunkId && cit.chunk_id === highlightedChunkId;

                return (
                  <article
                    key={`${cit.chunk_id}-${idx}`}
                    className={`dm-evidence-card ${
                      isHighlighted ? "is-highlighted" : ""
                    }`}
                  >
                    <div className="dm-evidence-card__top">
                      <span className="dm-evidence-card__idx">[{idx + 1}]</span>
                      <span className="dm-evidence-card__page">
                        Page {cit.page_number}
                      </span>
                    </div>
                    <h4 className="dm-evidence-card__title">{title}</h4>
                    {quote && (
                      <blockquote className="dm-evidence-card__quote">
                        &ldquo;{quote}&rdquo;
                      </blockquote>
                    )}
                    {docId && onOpenDocument && (
                      <button
                        type="button"
                        className="dm-evidence-card__open"
                        onClick={() => onOpenDocument(docId)}
                      >
                        <span>Open in Repository</span>
                        <ArrowUpRight size={12} />
                      </button>
                    )}
                  </article>
                );
              })}
            </div>
          )
        ) : (
          <div className="dm-chat-drawer__list">
            <button
              type="button"
              className="dm-history-new-btn"
              onClick={onStartNewChat}
            >
              <Plus size={14} />
              <span>New Conversation</span>
            </button>

            {loadingHistory ? (
              <div className="dm-chat-drawer__empty">
                <Loader2 size={20} className="db-spin" />
                <p>Loading conversation history...</p>
              </div>
            ) : conversations.length === 0 ? (
              <div className="dm-chat-drawer__empty">
                <Clock size={22} />
                <p>No saved conversations yet.</p>
              </div>
            ) : (
              conversations.map((conv) => (
                <button
                  key={conv.id}
                  type="button"
                  className={`dm-history-item ${
                    activeConversationId === conv.id ? "is-active" : ""
                  }`}
                  onClick={() => onSelectConversation(conv.id)}
                >
                  <span className="dm-history-item__title">
                    {conv.title || "Document Conversation"}
                  </span>
                  <span className="dm-history-item__meta">
                    {conv.scope_mode === "single_doc"
                      ? "1 Document"
                      : conv.scope_mode === "multi_doc"
                      ? "Multi-Document"
                      : "All Documents"}
                  </span>
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </aside>
  );
}

export default EvidenceDrawer;
