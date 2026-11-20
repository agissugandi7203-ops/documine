"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BookOpen,
  Check,
  ChevronDown,
  Clock,
  FileSpreadsheet,
  FileText,
  Globe,
  Plus,
  Search,
  Upload,
} from "lucide-react";
import {
  dashboardApi,
  type ChatCitation,
  type ConversationSummary,
  type DocumentItem,
} from "@/lib/dashboard-api";
import { ChatComposer, type ChatAttachmentEntry } from "./ChatComposer";
import {
  ChatMessageList,
  type StreamChatMessage,
} from "./ChatMessageList";
import { EvidenceDrawer, type ChatDrawerTab } from "./EvidenceDrawer";
import {
  ORB_ACTIVITY_PRESETS,
  ThinkingOrbStage,
} from "./ThinkingOrbStage";

const STARTER_PROMPTS = [
  "Summarize the key findings across my documents",
  "What key metrics and figures are recorded?",
  "Explain the methodology and main conclusions",
];

const ATTACHMENT_ONLY_PROMPT = "Summarize the document I just uploaded.";

export interface ChatLaunchRequest {
  scopeDocId: string;
  prompt?: string;
  autoSend?: boolean;
  nonce: number;
}

interface ChatWorkspaceProps {
  userName: string;
  documents: DocumentItem[];
  initialScopeDocId?: string;
  launchRequest?: ChatLaunchRequest | null;
  embeddedInRepo?: boolean;
  onNavigateToInspector?: (docId: string) => void;
  onRefreshDocuments?: () => void;
  onUploadFilesToRepo?: (
    files: File[]
  ) => Promise<Array<{ filename: string; doc?: DocumentItem; error?: string }>>;
  onOpenUploadModal?: () => void;
}

function makeId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

function estimateTokens(text: string) {
  return Math.max(1, Math.round(text.length / 4));
}

/* ============================================================================
   Upgraded Atelier Custom Scope Dropdown (Replaces Native <select>)
   ============================================================================ */

interface ScopeDropdownProps {
  documents: DocumentItem[];
  scopeDocId: string;
  disabled?: boolean;
  onChangeScope: (docId: string) => void;
  onTriggerUpload: () => void;
}

function ScopeDropdown({
  documents,
  scopeDocId,
  disabled,
  onChangeScope,
  onTriggerUpload,
}: ScopeDropdownProps) {
  const [open, setOpen] = useState(false);
  const [filterText, setFilterText] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const filterRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) {
      setFilterText("");
      return;
    }
    const timer = window.setTimeout(() => filterRef.current?.focus(), 30);
    const onOutside = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onOutside);
    document.addEventListener("keydown", onEsc);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("mousedown", onOutside);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  const activeDoc = documents.find((d) => d.id === scopeDocId);
  const triggerLabel = activeDoc
    ? activeDoc.title
    : `All Documents (${documents.length})`;

  const filteredDocs = useMemo(() => {
    const q = filterText.trim().toLowerCase();
    if (!q) return documents;
    return documents.filter(
      (d) =>
        d.title.toLowerCase().includes(q) ||
        (d.category || "").toLowerCase().includes(q)
    );
  }, [documents, filterText]);

  return (
    <div className="dm-scope-dropdown" ref={containerRef}>
      <button
        type="button"
        className={`dm-scope-trigger ${open ? "is-open" : ""}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((p) => !p)}
        title={triggerLabel}
      >
        <span className="dm-scope-trigger__icon">
          {activeDoc ? <FileText size={13} /> : <Globe size={13} />}
        </span>
        <span className="dm-scope-trigger__label">{triggerLabel}</span>
        <span className="dm-scope-trigger__tag">
          {activeDoc ? (activeDoc.file_type || "PDF").toUpperCase() : "Repo"}
        </span>
        <ChevronDown
          size={13}
          className={`dm-scope-trigger__caret ${open ? "is-open" : ""}`}
        />
      </button>

      {open && (
        <div
          className="dm-scope-menu"
          role="listbox"
          aria-label="Document scope options"
        >
          <div className="dm-scope-menu__head">
            <span className="dm-scope-menu__title">Knowledge Scope</span>
            <span className="dm-scope-menu__count">{documents.length} files</span>
          </div>

          {documents.length >= 4 && (
            <div className="dm-scope-menu__search">
              <Search size={12} />
              <input
                ref={filterRef}
                type="text"
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                placeholder="Filter Repository files..."
                aria-label="Filter scope documents"
              />
            </div>
          )}

          <div className="dm-scope-menu__list">
            <button
              type="button"
              role="option"
              aria-selected={scopeDocId === "all"}
              className={`dm-scope-option ${
                scopeDocId === "all" ? "is-selected" : ""
              }`}
              onClick={() => {
                onChangeScope("all");
                setOpen(false);
              }}
            >
              <span className="dm-scope-option__ico is-all">
                <Globe size={13} />
              </span>
              <div className="dm-scope-option__copy">
                <span className="dm-scope-option__name">
                  All Repository Documents
                </span>
                <span className="dm-scope-option__sub">
                  Search across all {documents.length} workspace files
                </span>
              </div>
              {scopeDocId === "all" && (
                <Check size={13} className="dm-scope-option__check" />
              )}
            </button>

            {filteredDocs.length > 0 ? (
              filteredDocs.map((doc) => {
                const selected = doc.id === scopeDocId;
                const isSheet =
                  doc.file_type?.toLowerCase().includes("csv") ||
                  doc.file_type?.toLowerCase().includes("xls");
                const isReady = [
                  "ready",
                  "partial_ready",
                  "completed",
                ].includes(doc.status || doc.processing_status);

                return (
                  <button
                    key={doc.id}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    className={`dm-scope-option ${
                      selected ? "is-selected" : ""
                    }`}
                    onClick={() => {
                      onChangeScope(doc.id);
                      setOpen(false);
                    }}
                  >
                    <span className="dm-scope-option__ico">
                      {isSheet ? (
                        <FileSpreadsheet size={13} />
                      ) : (
                        <FileText size={13} />
                      )}
                    </span>
                    <div className="dm-scope-option__copy">
                      <span className="dm-scope-option__name">{doc.title}</span>
                      <span className="dm-scope-option__sub">
                        <span
                          className={`dm-scope-dot ${
                            isReady ? "is-ready" : ""
                          }`}
                        />
                        {doc.page_count || 1}p ·{" "}
                        {doc.category || "Document"}
                      </span>
                    </div>
                    {selected && (
                      <Check size={13} className="dm-scope-option__check" />
                    )}
                  </button>
                );
              })
            ) : (
              <div className="dm-scope-menu__empty">
                {documents.length === 0
                  ? "No documents uploaded to Repository yet."
                  : "No matching files."}
              </div>
            )}
          </div>

          <div className="dm-scope-menu__foot">
            <button
              type="button"
              className="dm-scope-upload-cta"
              onClick={() => {
                setOpen(false);
                onTriggerUpload();
              }}
            >
              <Upload size={12} />
              <span>Upload New File to Repository</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================================================================
   Main Clean Chat Workspace (Unboxed, Floating Orbs, Repo Sync)
   ============================================================================ */

export function ChatWorkspace({
  userName,
  documents,
  initialScopeDocId = "all",
  launchRequest = null,
  embeddedInRepo = false,
  onNavigateToInspector,
  onRefreshDocuments,
  onUploadFilesToRepo,
  onOpenUploadModal,
}: ChatWorkspaceProps) {
  const [messages, setMessages] = useState<StreamChatMessage[]>([]);
  const [composerText, setComposerText] = useState("");
  const [thinkingEnabled, setThinkingEnabled] = useState(false);
  const [attachments, setAttachments] = useState<ChatAttachmentEntry[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [scopeDocId, setScopeDocId] = useState<string>(initialScopeDocId);
  const [isDragOverChat, setIsDragOverChat] = useState(false);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState<ChatDrawerTab>("citations");
  const [activeCitations, setActiveCitations] = useState<ChatCitation[]>([]);
  const [highlightedChunkId, setHighlightedChunkId] = useState<string | null>(
    null
  );
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Streaming refs (rAF delta batching for smooth 60fps rendering)
  const abortControllerRef = useRef<AbortController | null>(null);
  const activeAssistantIdRef = useRef<string | null>(null);
  const bufferedDeltaRef = useRef("");
  const rafFlushRef = useRef(0);
  const streamStartRef = useRef(0);
  const streamedTextRef = useRef("");
  const messagesRef = useRef<StreamChatMessage[]>([]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    setScopeDocId(initialScopeDocId || "all");
  }, [initialScopeDocId]);

  useEffect(() => {
    if (scopeDocId !== "all" && !documents.some((d) => d.id === scopeDocId)) {
      setScopeDocId("all");
    }
  }, [documents, scopeDocId]);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
      if (rafFlushRef.current) cancelAnimationFrame(rafFlushRef.current);
    };
  }, []);

  const patchMessage = useCallback(
    (
      id: string,
      patch:
        | Partial<StreamChatMessage>
        | ((m: StreamChatMessage) => Partial<StreamChatMessage>)
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

  const flushBufferedDelta = useCallback(() => {
    rafFlushRef.current = 0;
    const id = activeAssistantIdRef.current;
    const chunk = bufferedDeltaRef.current;
    if (!id || !chunk) return;
    bufferedDeltaRef.current = "";
    patchMessage(id, (m) => ({ content: m.content + chunk }));
  }, [patchMessage]);

  const scheduleFlush = useCallback(() => {
    if (rafFlushRef.current) return;
    rafFlushRef.current = requestAnimationFrame(flushBufferedDelta);
  }, [flushBufferedDelta]);

  const forceFlush = useCallback(() => {
    if (rafFlushRef.current) {
      cancelAnimationFrame(rafFlushRef.current);
      rafFlushRef.current = 0;
    }
    flushBufferedDelta();
  }, [flushBufferedDelta]);

  const loadConversations = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const res = await dashboardApi.listConversations();
      setConversations(res.conversations || []);
    } catch {
      setConversations([]);
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  const readyAttachmentDocIds = useMemo(
    () =>
      attachments
        .filter((a) => a.status === "ready" && a.docId)
        .map((a) => a.docId as string),
    [attachments]
  );

  const sendMessage = useCallback(
    async (
      rawText: string,
      opts?: {
        reuseAttachments?: boolean;
        isRetry?: boolean;
        scopeOverride?: string;
      }
    ) => {
      if (isStreaming) return;
      const readyAtts = attachments.filter(
        (a) => a.status === "ready" && a.docId
      );
      const text =
        rawText.trim() || (readyAtts.length > 0 ? ATTACHMENT_ONLY_PROMPT : "");
      if (!text) return;

      const history = messagesRef.current
        .filter((m) => m.status === "completed" && m.content.trim())
        .slice(-10)
        .map((m) => ({ role: m.role, content: m.content }));

      const hasDocsAvailable = documents.length > 0 || readyAtts.length > 0;
      const startedAt = performance.now();

      const userMsg: StreamChatMessage = {
        id: makeId("u"),
        role: "user",
        content: text,
        status: "completed",
        attachments: readyAtts.map((a) => ({
          id: a.docId as string,
          filename: a.filename,
        })),
      };
      const assistantId = makeId("a");
      const initialOrb = opts?.isRetry
        ? ORB_ACTIVITY_PRESETS.retrying
        : hasDocsAvailable
        ? ORB_ACTIVITY_PRESETS.searching
        : thinkingEnabled
        ? ORB_ACTIVITY_PRESETS.deepReasoning
        : ORB_ACTIVITY_PRESETS.reasoning;

      const assistantMsg: StreamChatMessage = {
        id: assistantId,
        role: "assistant",
        content: "",
        status: opts?.isRetry ? "retrying" : "streaming",
        stage: hasDocsAvailable ? "searching" : "reasoning",
        orbState: initialOrb.state,
        orbVariant: initialOrb.variant,
        statusLabel: opts?.isRetry
          ? "Retrying request..."
          : hasDocsAvailable
          ? "Searching documents for evidence..."
          : thinkingEnabled
          ? "Reasoning deeply..."
          : "Processing request...",
        docsSearched: hasDocsAvailable
          ? documents.length || readyAtts.length
          : 0,
        startedAt,
        retryPrompt: text,
      };

      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setComposerText("");
      if (!opts?.reuseAttachments) setAttachments([]);
      setIsStreaming(true);

      activeAssistantIdRef.current = assistantId;
      bufferedDeltaRef.current = "";
      streamedTextRef.current = "";
      streamStartRef.current = startedAt;
      let sawFirstToken = false;

      const controller = new AbortController();
      abortControllerRef.current = controller;

      const attDocIds = readyAtts.map((a) => a.docId as string);
      let scopePayload: {
        document_id?: string;
        document_ids?: string[];
        scope_mode: "single_doc" | "multi_doc" | "repository";
      };
      const effectiveScope = opts?.scopeOverride ?? scopeDocId;
      if (attDocIds.length === 1) {
        scopePayload = { document_id: attDocIds[0], scope_mode: "single_doc" };
      } else if (attDocIds.length > 1) {
        scopePayload = { document_ids: attDocIds, scope_mode: "multi_doc" };
      } else if (effectiveScope !== "all") {
        scopePayload = { document_id: effectiveScope, scope_mode: "single_doc" };
      } else {
        scopePayload = { scope_mode: "repository" };
      }

      try {
        const done = await dashboardApi.streamChat(
          {
            message: text,
            conversation_id: conversationId,
            deep_analysis: thinkingEnabled,
            conversation_history: history,
            ...scopePayload,
          },
          {
            signal: controller.signal,
            onStatus: (status) => {
              const nextStage =
                status.stage === "searching" ||
                status.stage === "reasoning" ||
                status.stage === "generating" ||
                status.stage === "verifying"
                  ? status.stage
                  : undefined;
              patchMessage(assistantId, (prev) => ({
                status: "streaming",
                stage: nextStage ?? prev.stage,
                orbState: status.orbState || "reasoning",
                orbVariant: status.variant || "default",
                statusLabel:
                  status.label ||
                  (status.stage === "generating"
                    ? "Writing response..."
                    : "Processing..."),
                chunksFound:
                  typeof status.chunks_found === "number"
                    ? status.chunks_found
                    : prev.chunksFound,
                docsSearched:
                  typeof status.docs_searched === "number"
                    ? status.docs_searched
                    : prev.docsSearched,
                activeModel: status.model || prev.activeModel,
              }));
            },
            onTokenDelta: (delta) => {
              if (!sawFirstToken) {
                sawFirstToken = true;
                patchMessage(assistantId, (prev) => ({
                  stage: "generating",
                  orbState: thinkingEnabled ? "reasoning" : "working",
                  orbVariant: thinkingEnabled ? "twins" : "default",
                  statusLabel: thinkingEnabled
                    ? "Writing answer (Deep Thinking)..."
                    : prev.chunksFound
                    ? `Writing answer from ${prev.chunksFound} excerpts...`
                    : "Writing answer...",
                }));
              }
              streamedTextRef.current += delta;
              bufferedDeltaRef.current += delta;
              scheduleFlush();
            },
            onCitationsVerified: (payload) => {
              forceFlush();
              const elapsedSeconds =
                payload.elapsed_ms != null
                  ? payload.elapsed_ms / 1000
                  : (performance.now() - streamStartRef.current) / 1000;
              const finalText = payload.answer || streamedTextRef.current;
              const outputTokens = estimateTokens(finalText);
              patchMessage(assistantId, {
                id: payload.message_id || assistantId,
                content: finalText,
                citations: payload.citations || [],
                suggestedFollowups: payload.suggested_followups || [],
                status: "completed",
                stage: null,
                orbState: null,
                statusLabel: null,
                metrics: {
                  elapsedSeconds: Number(elapsedSeconds.toFixed(1)),
                  outputTokens,
                  throughput: Math.round(
                    outputTokens / Math.max(elapsedSeconds, 0.1)
                  ),
                  modelUsed: payload.model_used,
                  isDeepThinking: thinkingEnabled,
                },
              });
              activeAssistantIdRef.current = payload.message_id || assistantId;
              if (payload.conversation_id) {
                setConversationId(payload.conversation_id);
              }
              if (payload.citations && payload.citations.length > 0) {
                setActiveCitations(payload.citations);
              }
            },
          }
        );

        forceFlush();
        if (!done) {
          const finalId = activeAssistantIdRef.current || assistantId;
          patchMessage(finalId, (m) => ({
            status: m.content.trim() ? "completed" : "failed",
            stage: null,
            orbState: null,
            statusLabel: null,
            error: m.content.trim()
              ? null
              : "No response received from AI. Please try again.",
          }));
        }
        void loadConversations();
      } catch (err) {
        forceFlush();
        const finalId = activeAssistantIdRef.current || assistantId;
        const aborted =
          controller.signal.aborted ||
          (err instanceof DOMException && err.name === "AbortError");
        if (aborted) {
          patchMessage(finalId, {
            status: "cancelled",
            stage: null,
            orbState: null,
            statusLabel: null,
          });
        } else {
          patchMessage(finalId, {
            status: "failed",
            stage: null,
            orbState: null,
            statusLabel: null,
            error:
              err instanceof Error
                ? err.message
                : "Unable to reach DocuMind AI right now.",
          });
        }
      } finally {
        abortControllerRef.current = null;
        activeAssistantIdRef.current = null;
        setIsStreaming(false);
      }
    },
    [
      attachments,
      conversationId,
      documents.length,
      forceFlush,
      isStreaming,
      loadConversations,
      patchMessage,
      scheduleFlush,
      scopeDocId,
      thinkingEnabled,
    ]
  );

  // Handle incoming handoff requests from Analytics Studio ("Ask about this file" / chart / insight)
  const handledLaunchNonceRef = useRef<number | null>(null);
  useEffect(() => {
    if (!launchRequest || launchRequest.nonce === handledLaunchNonceRef.current) {
      return;
    }
    handledLaunchNonceRef.current = launchRequest.nonce;
    const nextScope = launchRequest.scopeDocId || "all";
    setScopeDocId(nextScope);

    if (launchRequest.prompt && launchRequest.autoSend) {
      const promptToRun = launchRequest.prompt;
      const timer = window.setTimeout(() => {
        void sendMessage(promptToRun, { scopeOverride: nextScope });
      }, 60);
      return () => window.clearTimeout(timer);
    }
    if (launchRequest.prompt) {
      setComposerText(launchRequest.prompt);
    }
  }, [launchRequest, sendMessage]);

  const handleStop = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  // Upload files from Chat directly into Repository & attach them cleanly
  const handleSelectFiles = useCallback(
    (files: File[]) => {
      if (files.length === 0) return;

      const entries: Array<{ entry: ChatAttachmentEntry; file: File }> =
        files.map((file) => ({
          file,
          entry: {
            localId: makeId("att"),
            filename: file.name,
            status: "uploading",
          },
        }));
      setAttachments((prev) => [...prev, ...entries.map((e) => e.entry)]);

      if (onUploadFilesToRepo) {
        void onUploadFilesToRepo(files).then((results) => {
          entries.forEach(({ entry }, idx) => {
            const r = results[idx];
            if (r?.doc) {
              setAttachments((prev) =>
                prev.map((a) =>
                  a.localId === entry.localId
                    ? { ...a, status: "ready", docId: r.doc!.id }
                    : a
                )
              );
            } else {
              setAttachments((prev) =>
                prev.map((a) =>
                  a.localId === entry.localId
                    ? {
                        ...a,
                        status: "error",
                        errorMessage: r?.error || "Upload failed",
                      }
                    : a
                )
              );
            }
          });
        });
        return;
      }

      entries.forEach(({ entry, file }) => {
        void dashboardApi
          .uploadDocument(file)
          .then((doc) => {
            setAttachments((prev) =>
              prev.map((a) =>
                a.localId === entry.localId
                  ? { ...a, status: "ready", docId: doc.id }
                  : a
              )
            );
            onRefreshDocuments?.();
          })
          .catch((err: unknown) => {
            setAttachments((prev) =>
              prev.map((a) =>
                a.localId === entry.localId
                  ? {
                      ...a,
                      status: "error",
                      errorMessage:
                        err instanceof Error ? err.message : "Upload failed",
                    }
                  : a
              )
            );
          });
      });
    },
    [onRefreshDocuments, onUploadFilesToRepo]
  );

  const handleAttachExistingDoc = useCallback((doc: DocumentItem) => {
    setAttachments((prev) => {
      if (prev.some((a) => a.docId === doc.id)) return prev;
      return [
        ...prev,
        {
          localId: makeId("att"),
          filename: doc.title,
          status: "ready",
          docId: doc.id,
        },
      ];
    });
  }, []);

  const handleRemoveAttachment = useCallback((localId: string) => {
    setAttachments((prev) => prev.filter((a) => a.localId !== localId));
  }, []);

  const handleStartNewChat = useCallback(() => {
    abortControllerRef.current?.abort();
    setMessages([]);
    setConversationId(null);
    setActiveCitations([]);
    setHighlightedChunkId(null);
    setComposerText("");
    setDrawerOpen(false);
  }, []);

  const handleSelectConversation = useCallback(
    async (convId: string) => {
      if (isStreaming) abortControllerRef.current?.abort();
      try {
        const res = await dashboardApi.getConversationMessages(convId);
        const hydrated: StreamChatMessage[] = (res.messages || []).map(
          (row) => ({
            id: row.id,
            role: row.role,
            content: row.content || "",
            status: "completed",
            citations: row.citations || [],
            suggestedFollowups: row.suggested_followups || [],
            metrics: row.model_used
              ? {
                  elapsedSeconds: 0,
                  outputTokens: estimateTokens(row.content || ""),
                  throughput: 0,
                  modelUsed: row.model_used,
                  isDeepThinking: false,
                }
              : null,
          })
        );
        setMessages(hydrated);
        setConversationId(convId);
        const lastCited = [...hydrated]
          .reverse()
          .find((m) => m.citations && m.citations.length > 0);
        setActiveCitations(lastCited?.citations || []);
        if (window.matchMedia("(max-width: 1023px)").matches) {
          setDrawerOpen(false);
        }
      } catch {
        // keep current thread on failure
      }
    },
    [isStreaming]
  );

  const openDrawer = useCallback(
    (tab: ChatDrawerTab) => {
      if (drawerOpen && drawerTab === tab) {
        setDrawerOpen(false);
        return;
      }
      setDrawerTab(tab);
      setDrawerOpen(true);
      if (tab === "history") void loadConversations();
    },
    [drawerOpen, drawerTab, loadConversations]
  );

  const handleSelectCitation = useCallback((cit: ChatCitation) => {
    setHighlightedChunkId(cit.chunk_id);
    setActiveCitations((prev) =>
      prev.some((c) => c.chunk_id === cit.chunk_id) ? prev : [cit, ...prev]
    );
    setDrawerTab("citations");
    setDrawerOpen(true);
  }, []);

  const handleOpenCitationsDrawer = useCallback((cits: ChatCitation[]) => {
    setActiveCitations(cits);
    setHighlightedChunkId(null);
    setDrawerTab("citations");
    setDrawerOpen(true);
  }, []);

  const handleRetry = useCallback(
    (msg: StreamChatMessage) => {
      if (!msg.retryPrompt) return;
      setMessages((prev) => {
        const idx = prev.findIndex((m) => m.id === msg.id);
        if (idx < 0) return prev;
        const cut = idx > 0 && prev[idx - 1].role === "user" ? idx - 1 : idx;
        return prev.slice(0, cut);
      });
      setTimeout(
        () =>
          void sendMessage(msg.retryPrompt as string, {
            reuseAttachments: true,
            isRetry: true,
          }),
        0
      );
    },
    [sendMessage]
  );

  const hasThread = messages.length > 0;
  const firstName = (userName || "").split(" ")[0] || "there";
  const isUploadingFiles = attachments.some((a) => a.status === "uploading");
  const activeStreamingMsg = useMemo(
    () =>
      [...messages]
        .reverse()
        .find((m) => m.status === "streaming" || m.status === "retrying"),
    [messages]
  );

  const liveIndicator = useMemo(() => {
    if (activeStreamingMsg) {
      return {
        state: activeStreamingMsg.orbState || "working",
        variant: activeStreamingMsg.orbVariant || "default",
        label:
          activeStreamingMsg.stage === "searching"
            ? "Searching evidence"
            : activeStreamingMsg.stage === "verifying"
            ? "Verifying citations"
            : thinkingEnabled
            ? "Deep Thinking"
            : "Streaming",
        busy: true,
      };
    }
    if (isUploadingFiles) {
      return {
        ...ORB_ACTIVITY_PRESETS.uploading,
        label: "Indexing file",
        busy: true,
      };
    }
    if (thinkingEnabled) {
      return {
        ...ORB_ACTIVITY_PRESETS.deepReady,
        label: "Deep Mode",
        busy: false,
      };
    }
    return {
      ...ORB_ACTIVITY_PRESETS.ready,
      label: "AI Ready",
      busy: false,
    };
  }, [activeStreamingMsg, isUploadingFiles, thinkingEnabled]);

  const composer = (
    <ChatComposer
      value={composerText}
      onChange={setComposerText}
      onSubmit={() => void sendMessage(composerText)}
      onStopStreaming={handleStop}
      thinkingEnabled={thinkingEnabled}
      onToggleThinking={setThinkingEnabled}
      attachments={attachments}
      onSelectFiles={handleSelectFiles}
      onRemoveAttachment={handleRemoveAttachment}
      repositoryDocs={documents}
      onAttachExistingDoc={handleAttachExistingDoc}
      onOpenUploadModal={onOpenUploadModal}
      isStreaming={isStreaming}
      placeholder={
        documents.length === 0 && readyAttachmentDocIds.length === 0
          ? "Ask anything, or click + / drop a file to index into Repository..."
          : "Ask anything about your Repository documents..."
      }
    />
  );

  return (
    <div
      className={`dm-chat-workspace ${hasThread ? "has-thread" : "is-empty"} ${
        drawerOpen ? "drawer-open" : ""
      } ${embeddedInRepo ? "is-embedded" : ""} ${
        isDragOverChat ? "is-dragover" : ""
      }`}
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes("Files")) {
          e.preventDefault();
          e.stopPropagation();
          if (!isDragOverChat) setIsDragOverChat(true);
        }
      }}
      onDragLeave={(e) => {
        if (e.currentTarget === e.target) setIsDragOverChat(false);
      }}
      onDrop={(e) => {
        if (!e.dataTransfer.files?.length) return;
        e.preventDefault();
        e.stopPropagation();
        setIsDragOverChat(false);
        handleSelectFiles(Array.from(e.dataTransfer.files));
      }}
    >
      <div className="dm-chat-main">
        <div className="dm-chat-topbar">
          <div className="dm-chat-topbar__left">
            <ScopeDropdown
              documents={documents}
              scopeDocId={scopeDocId}
              disabled={isStreaming}
              onChangeScope={setScopeDocId}
              onTriggerUpload={() => {
                if (onOpenUploadModal) {
                  onOpenUploadModal();
                }
              }}
            />

            <div
              className={`dm-chat-live-pill ${
                liveIndicator.busy ? "is-busy" : ""
              } state-${liveIndicator.state}`}
              aria-live="polite"
            >
              <ThinkingOrbStage
                state={liveIndicator.state}
                variant={liveIndicator.variant}
                size={18}
                showLabel={false}
              />
              <span className="dm-chat-live-pill__label">
                {liveIndicator.label}
              </span>
            </div>
          </div>

          <div className="dm-chat-topbar__right">
            {hasThread && (
              <button
                type="button"
                className="dm-chat-top-chip"
                onClick={handleStartNewChat}
              >
                <Plus size={13} />
                <span>New Chat</span>
              </button>
            )}
            <button
              type="button"
              className={`dm-chat-top-chip ${
                drawerOpen && drawerTab === "history" ? "is-active" : ""
              }`}
              onClick={() => openDrawer("history")}
            >
              <Clock size={13} />
              <span>History</span>
            </button>
            <button
              type="button"
              className={`dm-chat-top-chip ${
                drawerOpen && drawerTab === "citations" ? "is-active" : ""
              }`}
              onClick={() => openDrawer("citations")}
            >
              <BookOpen size={13} />
              <span>Citations</span>
              {activeCitations.length > 0 && (
                <span className="dm-chat-top-chip__badge">
                  {activeCitations.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {hasThread ? (
          <div className="dm-chat-thread-stage">
            <ChatMessageList
              messages={messages}
              isStreaming={isStreaming}
              onSelectCitation={handleSelectCitation}
              onOpenCitationsDrawer={handleOpenCitationsDrawer}
              onSelectFollowup={(q) => void sendMessage(q)}
              onRetryMessage={handleRetry}
            />
            <div className="dm-chat-dock">
              {composer}
              <p className="dm-chat-disclaimer">
                AI responses are grounded directly to your source pages. Verify
                critical figures before finalizing decisions.
              </p>
            </div>
          </div>
        ) : (
          <div className="dm-chat-empty-stage">
            <div className="dm-chat-hero">
              {/* Unboxed pure floating Orb */}
              <ThinkingOrbStage
                mode="hero"
                state={liveIndicator.state}
                variant={liveIndicator.variant}
                size={embeddedInRepo ? 54 : 88}
                label={liveIndicator.label}
              />
              <span className="dm-chat-hero__kicker">
                {firstName} ·{" "}
                {isUploadingFiles
                  ? "Indexing documents..."
                  : thinkingEnabled
                  ? "Deep Thinking On"
                  : "DocuMind AI"}
              </span>
              <h2 className="dm-chat-hero__title">
                Where should we begin?
              </h2>
              <p className="dm-chat-hero__sub">
                {documents.length === 0
                  ? "Drop a PDF, CSV, or TXT anywhere or click + to upload straight into your Repository."
                  : `${documents.length} Repository ${
                      documents.length === 1 ? "document" : "documents"
                    } ready with page-level citations.`}
              </p>
            </div>

            <div className="dm-chat-hero-composer">{composer}</div>

            {documents.length > 0 && (
              <div className="dm-chat-starters">
                {STARTER_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    className="dm-chat-starter"
                    onClick={() => void sendMessage(prompt)}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {drawerOpen && (
        <button
          type="button"
          className="dm-chat-drawer-scrim"
          aria-label="Close drawer"
          onClick={() => setDrawerOpen(false)}
        />
      )}
      <EvidenceDrawer
        isOpen={drawerOpen}
        activeTab={drawerTab}
        onChangeTab={(tab) => {
          setDrawerTab(tab);
          if (tab === "history") void loadConversations();
        }}
        citations={activeCitations}
        highlightedChunkId={highlightedChunkId}
        conversations={conversations}
        activeConversationId={conversationId}
        loadingHistory={loadingHistory}
        onSelectConversation={(id) => void handleSelectConversation(id)}
        onStartNewChat={handleStartNewChat}
        onOpenDocument={onNavigateToInspector}
        onClose={() => setDrawerOpen(false)}
      />
    </div>
  );
}

export default ChatWorkspace;
