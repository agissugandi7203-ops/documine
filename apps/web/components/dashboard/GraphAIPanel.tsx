"use client";

import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUp,
  ArrowUpRight,
  Check,
  Copy,
  Crosshair,
  FileText,
  GitBranch,
  Info,
  Maximize2,
  Minimize2,
  Plus,
  RotateCcw,
  Square,
  X,
} from "lucide-react";
import {
  dashboardApi,
  type ChatCitation,
  type DocumentItem,
  type RelationshipGraphEdge,
} from "@/lib/dashboard-api";
import {
  ORB_ACTIVITY_PRESETS,
  ThinkingOrbStage,
} from "./chat/ThinkingOrbStage";
import { useDraggableSheet } from "./useDraggableSheet";

export type GraphRightPanelTab = "ai" | "detail";

interface GraphAiMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: ChatCitation[];
  suggestedFollowups?: string[];
  status: "streaming" | "completed" | "cancelled" | "failed";
  orbState?: string | null;
  orbVariant?: string | null;
  statusLabel?: string | null;
  startedAt?: number;
  elapsedSec?: number;
  error?: string | null;
  retryPrompt?: string;
}

interface GraphAIPanelProps {
  documents: DocumentItem[];
  selectedDocIds: string[];
  selectedEdge: RelationshipGraphEdge | null;
  isDemoMode: boolean;
  activeTab: GraphRightPanelTab;
  onChangeTab: (tab: GraphRightPanelTab) => void;
  hasSelection: boolean;
  detailContent: React.ReactNode;
  onFocusNode: (docId: string) => void;
  onClose: () => void;
}

function makeId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 7)}`;
}

function LiveTimer({ startedAt }: { startedAt?: number }) {
  const [sec, setSec] = useState(0);
  useEffect(() => {
    if (!startedAt) return;
    const tick = () => setSec(Math.max(0, (performance.now() - startedAt) / 1000));
    tick();
    const id = window.setInterval(tick, 200);
    return () => window.clearInterval(id);
  }, [startedAt]);
  if (!startedAt) return null;
  return <span className="gc-ai-timer">{sec.toFixed(1)}s</span>;
}

function renderInline(
  text: string,
  citations: ChatCitation[],
  onFocusNode: (docId: string) => void
) {
  const citeByChunk = new Map<string, { num: number; cit: ChatCitation }>();
  citations.forEach((c, idx) => {
    if (c.chunk_id && !citeByChunk.has(c.chunk_id)) {
      citeByChunk.set(c.chunk_id, { num: idx + 1, cit: c });
    }
  });

  const parts = text.split(
    /(\[cite:[a-zA-Z0-9_-]+\]|\*\*[^*]+\*\*|`[^`]+`|\*[^*\n]+\*)/g
  );

  return parts.map((part, idx) => {
    if (!part) return null;
    const cite = part.match(/^\[cite:([a-zA-Z0-9_-]+)\]$/);
    if (cite) {
      const hit = citeByChunk.get(cite[1]);
      if (!hit) return null;
      const docId = hit.cit.document_id || hit.cit.doc_id || "";
      const title = hit.cit.document_title || hit.cit.doc_title || "Document";
      return (
        <button
          key={idx}
          type="button"
          className="gc-ai-inline-cite"
          title={`${title} · p. ${hit.cit.page_number}`}
          onClick={() => docId && onFocusNode(docId)}
        >
          {hit.num}
        </button>
      );
    }
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return <strong key={idx}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
      return (
        <code key={idx} className="gc-ai-code">
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
      return <em key={idx}>{part.slice(1, -1)}</em>;
    }
    return <React.Fragment key={idx}>{part}</React.Fragment>;
  });
}

function CompactMarkdown({
  text,
  citations,
  isStreaming,
  onFocusNode,
}: {
  text: string;
  citations: ChatCitation[];
  isStreaming: boolean;
  onFocusNode: (docId: string) => void;
}) {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const blocks: Array<
    | { type: "heading"; key: string; text: string }
    | { type: "list"; key: string; ordered: boolean; items: string[] }
    | { type: "p"; key: string; text: string }
  > = [];

  let list: { type: "list"; key: string; ordered: boolean; items: string[] } | null =
    null;
  const flush = () => {
    if (list) {
      blocks.push(list);
      list = null;
    }
  };

  lines.forEach((raw, i) => {
    const trimmed = raw.trim();
    if (!trimmed) {
      flush();
      return;
    }
    const bullet = trimmed.match(/^[-*•]\s+(.+)$/);
    const num = trimmed.match(/^\d+\.\s+(.+)$/);
    if (bullet || num) {
      const ordered = Boolean(num);
      const item = (bullet ? bullet[1] : num![1]).trim();
      if (!list || list.ordered !== ordered) {
        flush();
        list = { type: "list", key: `l-${i}`, ordered, items: [] };
      }
      list.items.push(item);
      return;
    }
    flush();
    const heading = trimmed.match(/^#{1,3}\s+(.+)$/);
    if (heading) {
      blocks.push({ type: "heading", key: `h-${i}`, text: heading[1] });
    } else {
      blocks.push({ type: "p", key: `p-${i}`, text: raw });
    }
  });
  flush();

  return (
    <div className="gc-ai-md">
      {blocks.map((b) => {
        if (b.type === "heading") {
          return (
            <h4 key={b.key} className="gc-ai-md-h">
              {renderInline(b.text, citations, onFocusNode)}
            </h4>
          );
        }
        if (b.type === "list") {
          const Tag = b.ordered ? "ol" : "ul";
          return (
            <Tag key={b.key} className="gc-ai-md-list">
              {b.items.map((it, idx) => (
                <li key={idx}>{renderInline(it, citations, onFocusNode)}</li>
              ))}
            </Tag>
          );
        }
        return (
          <p key={b.key} className="gc-ai-md-p">
            {renderInline(b.text, citations, onFocusNode)}
          </p>
        );
      })}
      {isStreaming && <span className="gc-ai-cursor" aria-hidden="true" />}
    </div>
  );
}

export const GraphAIPanel = memo(function GraphAIPanel({
  documents,
  selectedDocIds,
  selectedEdge,
  isDemoMode,
  activeTab,
  onChangeTab,
  hasSelection,
  detailContent,
  onFocusNode,
  onClose,
}: GraphAIPanelProps) {
  const [messages, setMessages] = useState<GraphAiMessage[]>([]);
  const [input, setInput] = useState("");
  const [thinkingEnabled, setThinkingEnabled] = useState(false);
  const [scopeOverrideAll, setScopeOverrideAll] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const activeIdRef = useRef<string | null>(null);
  const deltaBufRef = useRef("");
  const rafRef = useRef(0);
  const fullTextRef = useRef("");
  const startRef = useRef(0);
  const messagesRef = useRef<GraphAiMessage[]>([]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Reset scope override whenever selection changes
  useEffect(() => {
    setScopeOverrideAll(false);
  }, [selectedDocIds, selectedEdge?.id]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // Auto-scroll to bottom on new content
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages]);

  // Auto-grow textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "22px";
    el.style.height = `${Math.min(el.scrollHeight || 22, 110)}px`;
  }, [input]);

  const docById = useMemo(() => {
    const map: Record<string, DocumentItem> = {};
    for (const d of documents) map[d.id] = d;
    return map;
  }, [documents]);

  // Resolve current graph-bound AI scope
  const activeScope = useMemo(() => {
    const realIds = (ids: string[]) =>
      isDemoMode ? [] : ids.filter((id) => Boolean(docById[id]));

    if (!scopeOverrideAll && selectedEdge) {
      const ids = realIds([selectedEdge.source_doc_id, selectedEdge.target_doc_id]);
      const srcTitle =
        selectedEdge.source_doc_title ||
        docById[selectedEdge.source_doc_id]?.title ||
        "Doc A";
      const tgtTitle =
        selectedEdge.target_doc_title ||
        docById[selectedEdge.target_doc_id]?.title ||
        "Doc B";
      return {
        kind: "edge" as const,
        label: `${srcTitle.slice(0, 16)} ↔ ${tgtTitle.slice(0, 16)}`,
        docIds: ids,
        promptContext: `Graph relationship context: "${srcTitle}" is connected to "${tgtTitle}" (${selectedEdge.relationship_type}: ${selectedEdge.explanation}).`,
      };
    }

    if (!scopeOverrideAll && selectedDocIds.length === 1) {
      const doc = docById[selectedDocIds[0]];
      const ids = realIds(selectedDocIds);
      return {
        kind: "single" as const,
        label: doc?.title || "1 Selected Document",
        docIds: ids,
        promptContext: doc
          ? `Selected graph node context: "${doc.title}".`
          : "",
      };
    }

    if (!scopeOverrideAll && selectedDocIds.length > 1) {
      const ids = realIds(selectedDocIds);
      return {
        kind: "multi" as const,
        label: `${selectedDocIds.length} Selected Documents`,
        docIds: ids,
        promptContext: "",
      };
    }

    return {
      kind: "all" as const,
      label: isDemoMode
        ? "Graph Preview"
        : `All Graph (${documents.length} files)`,
      docIds: [] as string[],
      promptContext: "",
    };
  }, [docById, documents.length, isDemoMode, scopeOverrideAll, selectedDocIds, selectedEdge]);

  const starterPrompts = useMemo(() => {
    if (activeScope.kind === "edge") {
      return [
        "Explain the relationship and contrast between these two documents",
        "What key evidence links these documents together?",
      ];
    }
    if (activeScope.kind === "single") {
      return [
        "Summarize the key takeaways from this document",
        "What critical metrics and figures are recorded here?",
      ];
    }
    if (activeScope.kind === "multi") {
      return [
        "Compare the main findings across the selected documents",
        "Are there any metric discrepancies or contradictions?",
      ];
    }
    return [
      "Summarize the overarching themes across this graph",
      "Which documents share the strongest evidentiary links?",
    ];
  }, [activeScope.kind]);

  const patchMsg = useCallback(
    (
      id: string,
      patch:
        | Partial<GraphAiMessage>
        | ((m: GraphAiMessage) => Partial<GraphAiMessage>)
    ) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === id
            ? { ...m, ...(typeof patch === "function" ? patch(m) : patch) }
            : m
        )
      );
    },
    []
  );

  const flushDelta = useCallback(() => {
    rafRef.current = 0;
    const id = activeIdRef.current;
    const chunk = deltaBufRef.current;
    if (!id || !chunk) return;
    deltaBufRef.current = "";
    patchMsg(id, (m) => ({ content: m.content + chunk }));
  }, [patchMsg]);

  const scheduleFlush = useCallback(() => {
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(flushDelta);
  }, [flushDelta]);

  const forceFlush = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }
    flushDelta();
  }, [flushDelta]);

  const sendMessage = useCallback(
    async (rawText: string) => {
      const text = rawText.trim();
      if (!text || isStreaming) return;

      const history = messagesRef.current
        .filter((m) => m.status === "completed" && m.content.trim())
        .slice(-8)
        .map((m) => ({ role: m.role, content: m.content }));

      const userMsg: GraphAiMessage = {
        id: makeId("gu"),
        role: "user",
        content: text,
        status: "completed",
      };
      const assistantId = makeId("ga");
      const startedAt = performance.now();
      const hasRealDocs = !isDemoMode && documents.length > 0;
      const startOrb = hasRealDocs
        ? ORB_ACTIVITY_PRESETS.searching
        : thinkingEnabled
        ? ORB_ACTIVITY_PRESETS.deepReasoning
        : ORB_ACTIVITY_PRESETS.reasoning;

      const assistantMsg: GraphAiMessage = {
        id: assistantId,
        role: "assistant",
        content: "",
        status: "streaming",
        orbState: startOrb.state,
        orbVariant: startOrb.variant,
        statusLabel: hasRealDocs
          ? "Searching graph evidence..."
          : "Processing request...",
        startedAt,
        retryPrompt: text,
      };

      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setInput("");
      setIsStreaming(true);

      activeIdRef.current = assistantId;
      deltaBufRef.current = "";
      fullTextRef.current = "";
      startRef.current = startedAt;
      let sawToken = false;

      const controller = new AbortController();
      abortRef.current = controller;

      const scopePayload =
        activeScope.docIds.length === 1
          ? {
              document_id: activeScope.docIds[0],
              scope_mode: "single_doc" as const,
            }
          : activeScope.docIds.length > 1
          ? {
              document_ids: activeScope.docIds,
              scope_mode: "multi_doc" as const,
            }
          : { scope_mode: "repository" as const };

      const messageToSend =
        activeScope.kind === "edge" && activeScope.promptContext
          ? `${activeScope.promptContext}\n\nQuestion: ${text}`
          : text;

      try {
        const done = await dashboardApi.streamChat(
          {
            message: messageToSend,
            conversation_id: conversationId,
            deep_analysis: thinkingEnabled,
            conversation_history: history,
            ...scopePayload,
          },
          {
            signal: controller.signal,
            onStatus: (st) => {
              patchMsg(assistantId, {
                orbState: st.orbState || "reasoning",
                orbVariant: st.variant || "default",
                statusLabel: st.label || "Composing response...",
              });
            },
            onTokenDelta: (delta) => {
              if (!sawToken) {
                sawToken = true;
                patchMsg(assistantId, {
                  orbState: thinkingEnabled ? "reasoning" : "working",
                  orbVariant: thinkingEnabled ? "twins" : "default",
                  statusLabel: thinkingEnabled
                    ? "Deep Thinking..."
                    : "Writing response...",
                });
              }
              fullTextRef.current += delta;
              deltaBufRef.current += delta;
              scheduleFlush();
            },
            onCitationsVerified: (payload) => {
              forceFlush();
              const elapsedSec =
                payload.elapsed_ms != null
                  ? Number((payload.elapsed_ms / 1000).toFixed(1))
                  : Number(
                      ((performance.now() - startRef.current) / 1000).toFixed(1)
                    );
              patchMsg(assistantId, {
                id: payload.message_id || assistantId,
                content: payload.answer || fullTextRef.current,
                citations: payload.citations || [],
                suggestedFollowups: payload.suggested_followups || [],
                status: "completed",
                orbState: null,
                statusLabel: null,
                elapsedSec,
              });
              activeIdRef.current = payload.message_id || assistantId;
              if (payload.conversation_id) {
                setConversationId(payload.conversation_id);
              }
            },
          }
        );

        forceFlush();
        if (!done) {
          const finalId = activeIdRef.current || assistantId;
          patchMsg(finalId, (m) => ({
            status: m.content.trim() ? "completed" : "failed",
            orbState: null,
            statusLabel: null,
            error: m.content.trim() ? null : "No response received from AI.",
          }));
        }
      } catch (err) {
        forceFlush();
        const finalId = activeIdRef.current || assistantId;
        const aborted =
          controller.signal.aborted ||
          (err instanceof DOMException && err.name === "AbortError");
        if (aborted) {
          patchMsg(finalId, {
            status: "cancelled",
            orbState: null,
            statusLabel: null,
          });
        } else {
          patchMsg(finalId, {
            status: "failed",
            orbState: null,
            statusLabel: null,
            error:
              err instanceof Error
                ? err.message
                : "Failed to reach the AI service.",
          });
        }
      } finally {
        abortRef.current = null;
        activeIdRef.current = null;
        setIsStreaming(false);
      }
    },
    [
      activeScope,
      conversationId,
      documents.length,
      forceFlush,
      isDemoMode,
      isStreaming,
      patchMsg,
      scheduleFlush,
      thinkingEnabled,
    ]
  );

  const activeStreaming = useMemo(
    () => [...messages].reverse().find((m) => m.status === "streaming"),
    [messages]
  );

  const headerOrb = activeStreaming
    ? {
        state: activeStreaming.orbState || "working",
        variant: activeStreaming.orbVariant || "default",
      }
    : thinkingEnabled
    ? ORB_ACTIVITY_PRESETS.deepReady
    : ORB_ACTIVITY_PRESETS.ready;

  const sheet = useDraggableSheet({ open: true, onClose });

  const handleCopy = (id: string, content: string) => {
    const clean = content.replace(/\[cite:[a-zA-Z0-9_-]+\]/g, "").trim();
    void navigator.clipboard?.writeText(clean);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  return (
    <>
      <div
        className="gc-ai-sheet-backdrop"
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        className={`gc-ai-panel ${sheet.isFull ? "is-sheet-full" : ""}`}
        style={sheet.sheetInlineStyle}
        aria-label="Graph AI Assistant & Inspector"
        onKeyDown={(e) => e.stopPropagation()}
        {...sheet.bodyTouchProps}
      >
        <div
          className="gc-sheet-grabber"
          title="Swipe up to expand, swipe down to close"
          aria-label="Drag AI panel"
          {...sheet.grabberProps}
        >
          <span className="gc-sheet-grabber-pill" aria-hidden="true" />
        </div>

        {/* Panel Header with Segmented Tabs */}
        <header className="gc-ai-head">
          <div className="gc-ai-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "ai"}
              className={`gc-ai-tab ${activeTab === "ai" ? "is-active" : ""}`}
              onClick={() => onChangeTab("ai")}
            >
              <ThinkingOrbStage
                state={headerOrb.state}
                variant={headerOrb.variant}
                size={16}
                paused={!isStreaming}
                showLabel={false}
              />
              <span>Ask AI</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "detail"}
              className={`gc-ai-tab ${activeTab === "detail" ? "is-active" : ""}`}
              onClick={() => onChangeTab("detail")}
            >
              <Info size={13} />
              <span>Details</span>
              {hasSelection && <span className="gc-ai-tab-dot" aria-hidden="true" />}
            </button>
          </div>

          <div className="gc-ai-head-actions">
            {activeTab === "ai" && messages.length > 0 && (
              <button
                type="button"
                className="gc-ai-icon-btn"
                title="New conversation"
                aria-label="New conversation"
                onClick={() => {
                  abortRef.current?.abort();
                  setMessages([]);
                  setConversationId(null);
                }}
              >
                <Plus size={14} />
              </button>
            )}
            <button
              type="button"
              className="gc-ai-icon-btn"
              title={sheet.isFull ? "Compact view" : "Expand full screen"}
              aria-label={sheet.isFull ? "Compact pop-up" : "Expand full screen"}
              onClick={() => sheet.setIsFull((v) => !v)}
            >
              {sheet.isFull ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
            </button>
            <button
              type="button"
              className="gc-ai-icon-btn"
              title="Close panel"
              aria-label="Close AI panel"
              onClick={onClose}
            >
              <X size={14} />
            </button>
          </div>
        </header>

      {activeTab === "detail" ? (
        <div className="gc-inspector-scroll">{detailContent}</div>
      ) : (
        <div className="gc-ai-body">
          {/* Active Graph Context Pill */}
          <div className="gc-ai-context-bar">
            <div className="gc-ai-context-chip" title={activeScope.label}>
              {activeScope.kind === "edge" ? (
                <GitBranch size={12} />
              ) : (
                <FileText size={12} />
              )}
              <span>{activeScope.label}</span>
            </div>
            {activeScope.kind !== "all" && (
              <button
                type="button"
                className="gc-ai-scope-reset"
                onClick={() => setScopeOverrideAll(true)}
                title="Query across all documents in the graph"
              >
                All Graph
              </button>
            )}
          </div>

          {/* Messages or Empty Prompt */}
          <div ref={scrollRef} className="gc-ai-scroll">
            {messages.length === 0 ? (
              <div className="gc-ai-empty">
                <ThinkingOrbStage
                  mode="hero"
                  state={headerOrb.state}
                  variant={headerOrb.variant}
                  size={34}
                  paused={!isStreaming && !thinkingEnabled}
                  className="gc-ai-empty-orb"
                />
                <h3 className="gc-ai-empty-title">Ask About Graph</h3>
                <p className="gc-ai-empty-sub">
                  {activeScope.kind === "single"
                    ? "AI is scoped to the document selected on the canvas."
                    : activeScope.kind === "edge"
                    ? "AI is ready to analyze the connection between these two documents."
                    : "Select a node or relationship edge on the canvas to focus your query, or ask across the entire graph."}
                </p>

                <div className="gc-ai-starters">
                  {starterPrompts.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      className="gc-ai-starter-btn"
                      onClick={() => void sendMessage(prompt)}
                    >
                      <ArrowUpRight size={12} />
                      <span>{prompt}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="gc-ai-thread">
                {messages.map((msg) => {
                  const isUser = msg.role === "user";
                  const citations = msg.citations || [];
                  return (
                    <div
                      key={msg.id}
                      className={`gc-ai-msg ${
                        isUser ? "gc-ai-msg--user" : "gc-ai-msg--assistant"
                      }`}
                    >
                      {!isUser && msg.status === "streaming" && msg.orbState && (
                        <div className="gc-ai-live-row">
                          <ThinkingOrbStage
                            state={msg.orbState}
                            variant={msg.orbVariant || "default"}
                            size={20}
                            showLabel={false}
                          />
                          <span className="gc-ai-live-text">
                            {msg.statusLabel || "Processing..."}
                          </span>
                          <LiveTimer startedAt={msg.startedAt} />
                        </div>
                      )}

                      {msg.content &&
                        (isUser ? (
                          <p className="gc-ai-user-bubble">{msg.content}</p>
                        ) : (
                          <CompactMarkdown
                            text={msg.content}
                            citations={citations}
                            isStreaming={msg.status === "streaming"}
                            onFocusNode={onFocusNode}
                          />
                        ))}

                      {!isUser && msg.status === "cancelled" && (
                        <span className="gc-ai-note">Response stopped.</span>
                      )}

                      {msg.error && (
                        <div className="gc-ai-error">
                          <span>{msg.error}</span>
                          {msg.retryPrompt && (
                            <button
                              type="button"
                              className="gc-ai-retry"
                              onClick={() => void sendMessage(msg.retryPrompt!)}
                            >
                              <RotateCcw size={11} />
                              <span>Retry</span>
                            </button>
                          )}
                        </div>
                      )}

                      {!isUser && citations.length > 0 && (
                        <div className="gc-ai-cites">
                          {citations.slice(0, 4).map((cit, idx) => {
                            const docId = cit.document_id || cit.doc_id || "";
                            const title =
                              cit.document_title || cit.doc_title || "Document";
                            return (
                              <button
                                key={`${cit.chunk_id}-${idx}`}
                                type="button"
                                className="gc-ai-cite-chip"
                                title={`Focus on node ${title}`}
                                onClick={() => docId && onFocusNode(docId)}
                              >
                                <Crosshair size={10} />
                                <span className="gc-ai-cite-title">{title}</span>
                                <span className="gc-ai-cite-pg">
                                  p.{cit.page_number}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {!isUser &&
                        msg.status === "completed" &&
                        msg.content.trim() && (
                          <div className="gc-ai-msg-meta">
                            {typeof msg.elapsedSec === "number" && (
                              <span>{msg.elapsedSec}s</span>
                            )}
                            <button
                              type="button"
                              className="gc-ai-copy-btn"
                              onClick={() => handleCopy(msg.id, msg.content)}
                            >
                              {copiedId === msg.id ? (
                                <Check size={11} />
                              ) : (
                                <Copy size={11} />
                              )}
                              <span>
                                {copiedId === msg.id ? "Copied" : "Copy"}
                              </span>
                            </button>
                          </div>
                        )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Compact Floating Composer */}
          <form
            className="gc-ai-composer"
            onSubmit={(e) => {
              e.preventDefault();
              void sendMessage(input);
            }}
          >
            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  void sendMessage(input);
                }
              }}
              placeholder={
                activeScope.kind === "single"
                  ? "Ask about this document..."
                  : activeScope.kind === "edge"
                  ? "Ask about this relationship..."
                  : "Ask AI about the graph..."
              }
              className="gc-ai-textarea"
              aria-label="Ask AI on Graph page"
            />
            <div className="gc-ai-composer-foot">
              <button
                type="button"
                className={`gc-ai-think-btn ${thinkingEnabled ? "is-on" : ""}`}
                onClick={() => setThinkingEnabled((p) => !p)}
                title="Enable Deep Thinking"
              >
                {thinkingEnabled ? (
                  <ThinkingOrbStage
                    state="reasoning"
                    variant="twins"
                    size={13}
                    showLabel={false}
                  />
                ) : (
                  <span className="gc-ai-think-dot" aria-hidden="true" />
                )}
                <span>Deep</span>
              </button>

              {isStreaming ? (
                <button
                  type="button"
                  className="gc-ai-send-btn is-stop"
                  aria-label="Stop AI"
                  onClick={() => abortRef.current?.abort()}
                >
                  <Square size={11} fill="currentColor" />
                </button>
              ) : (
                <button
                  type="submit"
                  className="gc-ai-send-btn"
                  disabled={!input.trim()}
                  aria-label="Send message"
                >
                  <ArrowUp size={14} strokeWidth={2.3} />
                </button>
              )}
            </div>
          </form>
        </div>
      )}
    </aside>
    </>
  );
});

export default GraphAIPanel;
