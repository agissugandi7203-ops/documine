"use client";

import React, { memo, useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUpRight,
  BookOpen,
  Check,
  Copy,
  FileText,
  RotateCcw,
} from "lucide-react";
import type { ChatCitation } from "@/lib/dashboard-api";
import { ThinkingOrbStage } from "./ThinkingOrbStage";

const SMART_SCROLL_THRESHOLD_PX = 68;

export interface StreamChatMetrics {
  elapsedSeconds: number;
  outputTokens: number;
  throughput: number;
  modelUsed?: string;
  isDeepThinking: boolean;
}

export interface StreamChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  attachments?: Array<{ id: string; filename: string }>;
  citations?: ChatCitation[];
  suggestedFollowups?: string[];
  status: "streaming" | "retrying" | "completed" | "cancelled" | "failed";
  stage?: "searching" | "reasoning" | "generating" | "verifying" | null;
  orbState?: string | null;
  orbVariant?: string | null;
  statusLabel?: string | null;
  chunksFound?: number;
  docsSearched?: number;
  activeModel?: string;
  startedAt?: number;
  error?: string | null;
  metrics?: StreamChatMetrics | null;
  retryPrompt?: string;
}

function LiveElapsedTimer({ startedAt }: { startedAt?: number }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!startedAt) return;
    const update = () => {
      setElapsed(Math.max(0, (performance.now() - startedAt) / 1000));
    };
    update();
    const timer = window.setInterval(update, 200);
    return () => window.clearInterval(timer);
  }, [startedAt]);

  if (!startedAt) return null;
  return <span className="dm-status-timer">{elapsed.toFixed(1)}s</span>;
}

function PipelineStageStepper({
  stage,
  hasDocs,
}: {
  stage?: StreamChatMessage["stage"];
  hasDocs: boolean;
}) {
  const steps = hasDocs
    ? [
        { id: "searching", label: "Search Evidence" },
        { id: "generating", label: "Draft Answer" },
        { id: "verifying", label: "Verify Citations" },
      ]
    : [
        { id: "reasoning", label: "Analyze" },
        { id: "generating", label: "Stream Answer" },
      ];

  const activeIdx = Math.max(
    0,
    steps.findIndex((s) => s.id === stage)
  );

  return (
    <div className="dm-stage-stepper" aria-label="AI processing stage">
      {steps.map((step, idx) => {
        const state =
          idx < activeIdx ? "done" : idx === activeIdx ? "active" : "pending";
        return (
          <React.Fragment key={step.id}>
            <span className={`dm-stage-step is-${state}`}>
              <span className="dm-stage-step__dot" aria-hidden="true">
                {state === "done" ? <Check size={9} strokeWidth={3} /> : null}
              </span>
              <span>{step.label}</span>
            </span>
            {idx < steps.length - 1 && (
              <span
                className={`dm-stage-connector ${
                  idx < activeIdx ? "is-done" : ""
                }`}
                aria-hidden="true"
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

function getCitationTitle(cit: ChatCitation): string {
  return cit.document_title || cit.doc_title || "Document";
}

function renderInlineTokens(
  text: string,
  citations: ChatCitation[],
  onSelectCitation?: (cit: ChatCitation) => void
) {
  if (!text) return null;

  const citationIndexByChunk = new Map<string, { num: number; cit: ChatCitation }>();
  citations.forEach((cit, i) => {
    if (cit.chunk_id && !citationIndexByChunk.has(cit.chunk_id)) {
      citationIndexByChunk.set(cit.chunk_id, { num: i + 1, cit });
    }
  });

  const pattern =
    /(\[cite:[a-zA-Z0-9_-]+\]|\*\*[^*]+\*\*|__[^_]+__|`[^`]+`|\[[^\]]+\]\(https?:\/\/[^\s)]+\)|\*[^*\n]+\*)/g;
  const parts = String(text).split(pattern);

  return parts.map((part, idx) => {
    if (!part) return null;

    const citeMatch = part.match(/^\[cite:([a-zA-Z0-9_-]+)\]$/);
    if (citeMatch) {
      const hit = citationIndexByChunk.get(citeMatch[1]);
      if (!hit) return null;
      return (
        <button
          key={idx}
          type="button"
          className="dm-inline-cite-badge"
          title={`${getCitationTitle(hit.cit)} · p.${hit.cit.page_number}`}
          onClick={() => onSelectCitation?.(hit.cit)}
        >
          {hit.num}
        </button>
      );
    }

    if (
      (part.startsWith("**") && part.endsWith("**") && part.length > 4) ||
      (part.startsWith("__") && part.endsWith("__") && part.length > 4)
    ) {
      return (
        <strong key={idx} className="dm-md-bold">
          {part.slice(2, -2)}
        </strong>
      );
    }

    if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
      return (
        <em key={idx} className="dm-md-italic">
          {part.slice(1, -1)}
        </em>
      );
    }

    if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
      return (
        <code key={idx} className="dm-md-inline-code">
          {part.slice(1, -1)}
        </code>
      );
    }

    const linkMatch = part.match(/^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/);
    if (linkMatch) {
      return (
        <a
          key={idx}
          href={linkMatch[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="dm-md-link"
        >
          {linkMatch[1]}
        </a>
      );
    }

    return <React.Fragment key={idx}>{part}</React.Fragment>;
  });
}

function cleanTableCells(line: string): string[] {
  let s = line.trim();
  if (s.startsWith("|")) s = s.slice(1);
  if (s.endsWith("|")) s = s.slice(0, -1);
  return s.split("|").map((c) => c.trim());
}

function isPotentialTableRow(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed.includes("|")) return false;
  let core = trimmed;
  if (core.startsWith("|")) core = core.slice(1);
  if (core.endsWith("|")) core = core.slice(0, -1);
  return core.split("|").length >= 2;
}

function isTableDivider(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed.includes("-")) return false;
  let core = trimmed;
  if (core.startsWith("|")) core = core.slice(1);
  if (core.endsWith("|")) core = core.slice(0, -1);
  const parts = core.split("|").map((p) => p.trim());
  return parts.length > 0 && parts.every((p) => /^:?-{2,}:?$/.test(p));
}

function CodeBlockCard({ lang, code }: { lang: string; code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    void navigator.clipboard?.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div className="dm-md-codeblock">
      <div className="dm-md-codeblock__head">
        <span>{lang || "code"}</span>
        <button
          type="button"
          className="dm-md-codeblock__copy"
          onClick={handleCopy}
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
          <span>{copied ? "Copied" : "Copy"}</span>
        </button>
      </div>
      <pre className="dm-md-codeblock__pre">
        <code>{code}</code>
      </pre>
    </div>
  );
}

type MarkdownBlock =
  | { type: "table"; key: string; headers: string[]; alignments: Array<"left" | "center" | "right">; rows: string[][] }
  | { type: "code"; key: string; lang: string; code: string }
  | { type: "callout"; key: string; text: string }
  | { type: "heading"; key: string; level: number; text: string }
  | { type: "list"; key: string; ordered: boolean; items: Array<{ key: string; text: string }> }
  | { type: "paragraph"; key: string; text: string };

function FormattedMessageContent({
  text,
  citations,
  isStreaming,
  onSelectCitation,
}: {
  text: string;
  citations: ChatCitation[];
  isStreaming: boolean;
  onSelectCitation?: (cit: ChatCitation) => void;
}) {
  if (!text) return null;

  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const blocks: MarkdownBlock[] = [];
  let currentList: Extract<MarkdownBlock, { type: "list" }> | null = null;

  const flushList = () => {
    if (currentList) {
      blocks.push(currentList);
      currentList = null;
    }
  };

  let idx = 0;
  while (idx < lines.length) {
    const rawLine = lines[idx];
    const trimmed = rawLine.trim();

    // Fenced code blocks (```lang ... ```)
    if (trimmed.startsWith("```")) {
      flushList();
      const lang = trimmed.slice(3).trim();
      const codeLines: string[] = [];
      idx++;
      while (idx < lines.length && !lines[idx].trim().startsWith("```")) {
        codeLines.push(lines[idx]);
        idx++;
      }
      if (idx < lines.length) idx++;
      blocks.push({
        type: "code",
        key: `code-${idx}`,
        lang,
        code: codeLines.join("\n"),
      });
      continue;
    }

    if (!trimmed) {
      flushList();
      idx++;
      continue;
    }

    // Markdown table
    if (isPotentialTableRow(trimmed)) {
      let nextIdx = idx + 1;
      while (nextIdx < lines.length && !lines[nextIdx].trim()) nextIdx++;
      if (nextIdx < lines.length && isTableDivider(lines[nextIdx])) {
        flushList();
        const tableLines = [trimmed, lines[nextIdx].trim()];
        let cur = nextIdx + 1;
        while (cur < lines.length) {
          const curTrim = lines[cur].trim();
          if (!curTrim) break;
          if (isPotentialTableRow(curTrim)) {
            tableLines.push(curTrim);
            cur++;
          } else {
            break;
          }
        }
        const headers = cleanTableCells(tableLines[0]);
        const dividerCells = cleanTableCells(tableLines[1]);
        const rows = tableLines
          .slice(2)
          .map(cleanTableCells)
          .filter((r) => r.length > 0 && r.some(Boolean));
        const alignments = dividerCells.map((d): "left" | "center" | "right" => {
          const t = d.trim();
          if (t.startsWith(":") && t.endsWith(":")) return "center";
          if (t.endsWith(":")) return "right";
          return "left";
        });
        blocks.push({
          type: "table",
          key: `tbl-${idx}`,
          headers,
          alignments,
          rows,
        });
        idx = cur;
        continue;
      }
    }

    // Callout blockquote
    if (trimmed.startsWith("> ")) {
      flushList();
      blocks.push({
        type: "callout",
        key: `quote-${idx}`,
        text: trimmed.slice(2).trim(),
      });
      idx++;
      continue;
    }

    // Bullet / numbered lists
    const bulletMatch = trimmed.match(/^[-*•]\s+(.+)$/);
    const numberedMatch = trimmed.match(/^\d+\.\s+(.+)$/);
    if (bulletMatch || numberedMatch) {
      const ordered = Boolean(numberedMatch);
      const itemText = (bulletMatch ? bulletMatch[1] : numberedMatch![1]).trim();
      if (!currentList || currentList.ordered !== ordered) {
        flushList();
        currentList = {
          type: "list",
          ordered,
          key: `list-${idx}`,
          items: [],
        };
      }
      currentList.items.push({ key: `li-${idx}`, text: itemText });
      idx++;
      continue;
    }

    flushList();

    // Headings
    const headingMatch = trimmed.match(/^(#{1,3})\s+(.+)$/);
    if (headingMatch) {
      blocks.push({
        type: "heading",
        level: headingMatch[1].length,
        key: `h-${idx}`,
        text: headingMatch[2],
      });
      idx++;
      continue;
    }

    blocks.push({
      type: "paragraph",
      key: `p-${idx}`,
      text: rawLine,
    });
    idx++;
  }

  flushList();

  return (
    <div className={`dm-md-body ${isStreaming ? "is-streaming" : ""}`}>
      {blocks.map((block) => {
        if (block.type === "code") {
          return (
            <CodeBlockCard
              key={block.key}
              lang={block.lang}
              code={block.code}
            />
          );
        }

        if (block.type === "table") {
          return (
            <div key={block.key} className="dm-md-table-wrap">
              <table className="dm-md-table">
                <thead>
                  <tr>
                    {block.headers.map((h, hIdx) => (
                      <th
                        key={hIdx}
                        style={{ textAlign: block.alignments[hIdx] || "left" }}
                      >
                        {renderInlineTokens(h, citations, onSelectCitation)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {block.rows.map((row, rIdx) => (
                    <tr key={rIdx}>
                      {row.map((cell, cIdx) => (
                        <td
                          key={cIdx}
                          style={{
                            textAlign: block.alignments[cIdx] || "left",
                          }}
                          className={cIdx === 0 ? "is-primary-cell" : undefined}
                        >
                          {renderInlineTokens(cell, citations, onSelectCitation)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }

        if (block.type === "callout") {
          return (
            <div key={block.key} className="dm-md-callout">
              <p>{renderInlineTokens(block.text, citations, onSelectCitation)}</p>
            </div>
          );
        }

        if (block.type === "heading") {
          const Tag = block.level === 1 ? "h3" : block.level === 2 ? "h4" : "h5";
          return (
            <Tag key={block.key} className={`dm-md-heading level-${block.level}`}>
              {renderInlineTokens(block.text, citations, onSelectCitation)}
            </Tag>
          );
        }

        if (block.type === "list") {
          const ListTag = block.ordered ? "ol" : "ul";
          return (
            <ListTag key={block.key} className="dm-md-list">
              {block.items.map((item) => (
                <li key={item.key}>
                  {renderInlineTokens(item.text, citations, onSelectCitation)}
                </li>
              ))}
            </ListTag>
          );
        }

        return (
          <p key={block.key} className="dm-md-paragraph">
            {renderInlineTokens(block.text, citations, onSelectCitation)}
          </p>
        );
      })}
      {isStreaming && <span className="dm-stream-cursor" aria-hidden="true" />}
    </div>
  );
}

const ChatMessageItem = memo(function ChatMessageItem({
  message,
  isLastAssistant,
  onSelectCitation,
  onOpenCitationsDrawer,
  onSelectFollowup,
  onRetry,
}: {
  message: StreamChatMessage;
  isLastAssistant: boolean;
  onSelectCitation?: (cit: ChatCitation) => void;
  onOpenCitationsDrawer?: (citations: ChatCitation[]) => void;
  onSelectFollowup?: (prompt: string) => void;
  onRetry?: (msg: StreamChatMessage) => void;
}) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === "user";
  const citations = message.citations || [];
  const isLive =
    !isUser && (message.status === "streaming" || message.status === "retrying");
  const showOrb = isLive && Boolean(message.orbState);

  const handleCopyAnswer = () => {
    const cleanText = message.content.replace(/\[cite:[a-zA-Z0-9_-]+\]/g, "").trim();
    void navigator.clipboard?.writeText(cleanText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <article
      className={`dm-chat-turn ${isUser ? "is-user" : "is-assistant"}`}
    >
      <div className="dm-chat-turn__bubble">
        {isUser && message.attachments && message.attachments.length > 0 && (
          <div className="dm-turn-attachments">
            {message.attachments.map((att) => (
              <span key={att.id} className="dm-turn-attachment-doc">
                <FileText size={13} />
                <span>{att.filename}</span>
              </span>
            ))}
          </div>
        )}

        {showOrb && (
          <div
            className={`dm-turn-status-card state-${message.orbState || "reasoning"}`}
            data-testid="chat-streaming-indicator"
          >
            <div className="dm-turn-status-top">
              <div className="dm-turn-status-left">
                <ThinkingOrbStage
                  state={message.orbState || "reasoning"}
                  variant={message.orbVariant || "default"}
                  size={28}
                  paused={false}
                  showLabel={false}
                />
                <span className="dm-turn-status-text">
                  {message.statusLabel ||
                    (message.orbVariant === "twins"
                      ? "Reasoning deeply across sources..."
                      : "Generating grounded response...")}
                </span>
              </div>
              <div className="dm-turn-status-badges">
                {typeof message.chunksFound === "number" &&
                  message.chunksFound > 0 && (
                    <span className="dm-status-meta-pill">
                      {message.chunksFound} excerpts
                    </span>
                  )}
                {message.activeModel && (
                  <span className="dm-status-meta-pill is-model">
                    {message.activeModel}
                  </span>
                )}
                <LiveElapsedTimer startedAt={message.startedAt} />
              </div>
            </div>
            {message.stage && (
              <PipelineStageStepper
                stage={message.stage}
                hasDocs={(message.docsSearched ?? 0) > 0}
              />
            )}
          </div>
        )}

        {message.content ? (
          isUser ? (
            <p className="dm-user-text">{message.content}</p>
          ) : (
            <FormattedMessageContent
              text={message.content}
              citations={citations}
              isStreaming={isLive}
              onSelectCitation={onSelectCitation}
            />
          )
        ) : null}

        {!isUser && message.status === "cancelled" && (
          <div className="dm-turn-cancelled-note">Response stopped.</div>
        )}

        {message.error && (
          <div className="dm-turn-error" role="alert">
            <p className="dm-turn-error-text">{message.error}</p>
            {onRetry && message.retryPrompt && (
              <button
                type="button"
                className="dm-turn-retry-btn"
                onClick={() => onRetry(message)}
              >
                <RotateCcw size={12} />
                <span>Retry</span>
              </button>
            )}
          </div>
        )}

        {!isUser && citations.length > 0 && (
          <div className="dm-turn-citations" aria-label="Source citations">
            {citations.slice(0, 4).map((cit, idx) => (
              <button
                key={`${cit.chunk_id}-${idx}`}
                type="button"
                className="dm-citation-chip"
                onClick={() => onSelectCitation?.(cit)}
              >
                <span className="dm-citation-chip__num">{idx + 1}</span>
                <span className="dm-citation-chip__title">
                  {getCitationTitle(cit)}
                </span>
                <span className="dm-citation-chip__page">
                  p.{cit.page_number}
                </span>
              </button>
            ))}
            {citations.length > 4 && onOpenCitationsDrawer && (
              <button
                type="button"
                className="dm-citation-chip is-more"
                onClick={() => onOpenCitationsDrawer(citations)}
              >
                +{citations.length - 4} sources
              </button>
            )}
          </div>
        )}

        {!isUser &&
          message.status === "completed" &&
          message.content.trim().length > 0 && (
            <div className="dm-turn-footer-bar">
              <div className="dm-turn-metrics">
                {message.metrics?.isDeepThinking && (
                  <span className="dm-metric-chip is-thinking">
                    <span className="dm-thinking-pulse-dot" />
                    Deep Thinking
                  </span>
                )}
                {message.metrics && (
                  <span className="dm-metric-chip">
                    {message.metrics.elapsedSeconds}s ·{" "}
                    {message.metrics.throughput} tok/s
                  </span>
                )}
                {message.metrics?.modelUsed && (
                  <span className="dm-metric-chip is-model">
                    {message.metrics.modelUsed}
                  </span>
                )}
              </div>

              <div className="dm-turn-actions">
                {citations.length > 0 && onOpenCitationsDrawer && (
                  <button
                    type="button"
                    className="dm-turn-action-btn"
                    onClick={() => onOpenCitationsDrawer(citations)}
                  >
                    <BookOpen size={12} />
                    <span>Evidence ({citations.length})</span>
                  </button>
                )}
                <button
                  type="button"
                  className="dm-turn-action-btn"
                  onClick={handleCopyAnswer}
                >
                  {copied ? <Check size={12} /> : <Copy size={12} />}
                  <span>{copied ? "Copied" : "Copy"}</span>
                </button>
              </div>
            </div>
          )}

        {!isUser &&
          isLastAssistant &&
          message.status === "completed" &&
          message.suggestedFollowups &&
          message.suggestedFollowups.length > 0 &&
          onSelectFollowup && (
            <div className="dm-followup-row">
              {message.suggestedFollowups.slice(0, 3).map((q, idx) => (
                <button
                  key={idx}
                  type="button"
                  className="dm-followup-chip"
                  onClick={() => onSelectFollowup(q)}
                >
                  <ArrowUpRight size={11} />
                  <span>{q}</span>
                </button>
              ))}
            </div>
          )}
      </div>
    </article>
  );
});

interface ChatMessageListProps {
  messages: StreamChatMessage[];
  isStreaming: boolean;
  onSelectCitation?: (cit: ChatCitation) => void;
  onOpenCitationsDrawer?: (citations: ChatCitation[]) => void;
  onSelectFollowup?: (prompt: string) => void;
  onRetryMessage?: (msg: StreamChatMessage) => void;
}

export function ChatMessageList({
  messages,
  isStreaming,
  onSelectCitation,
  onOpenCitationsDrawer,
  onSelectFollowup,
  onRetryMessage,
}: ChatMessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const pinnedRef = useRef(true);
  const prevCountRef = useRef(messages.length);
  const rafRef = useRef(0);
  const [showScrollBtn, setShowScrollBtn] = useState(false);

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "auto") => {
    const el = scrollRef.current;
    if (!el) return;
    pinnedRef.current = true;
    setShowScrollBtn(false);
    el.scrollTo({ top: el.scrollHeight, behavior });
  }, []);

  const pinToBottom = useCallback(() => {
    if (!pinnedRef.current || rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = 0;
      const el = scrollRef.current;
      if (el && pinnedRef.current) {
        el.scrollTop = el.scrollHeight;
      }
    });
  }, []);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const dist = el.scrollHeight - el.scrollTop - el.clientHeight;
    const near = dist <= SMART_SCROLL_THRESHOLD_PX;
    pinnedRef.current = near;
    setShowScrollBtn(!near && el.scrollHeight > el.clientHeight + 80);
  }, []);

  const lastMsg = messages[messages.length - 1];
  const lastContent = lastMsg?.content || "";
  const lastStatus = lastMsg?.statusLabel || "";

  useEffect(() => {
    const added = messages.length > prevCountRef.current;
    const newestIsUser = lastMsg?.role === "user";
    prevCountRef.current = messages.length;
    if (added && newestIsUser) {
      scrollToBottom("smooth");
      return;
    }
    if (pinnedRef.current) {
      pinToBottom();
    }
  }, [
    messages.length,
    lastContent,
    lastStatus,
    isStreaming,
    lastMsg?.role,
    scrollToBottom,
    pinToBottom,
  ]);

  let lastAssistantIndex = -1;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "assistant") {
      lastAssistantIndex = i;
      break;
    }
  }

  return (
    <div className="dm-stream-wrapper">
      <div
        ref={scrollRef}
        className="dm-stream-scroll"
        onScroll={handleScroll}
      >
        <div className="dm-stream-inner">
          {messages.map((msg, idx) => (
            <ChatMessageItem
              key={msg.id}
              message={msg}
              isLastAssistant={idx === lastAssistantIndex}
              onSelectCitation={onSelectCitation}
              onOpenCitationsDrawer={onOpenCitationsDrawer}
              onSelectFollowup={onSelectFollowup}
              onRetry={onRetryMessage}
            />
          ))}
          <div className="dm-scroll-anchor" aria-hidden="true" />
        </div>
      </div>

      {showScrollBtn && (
        <button
          type="button"
          className="dm-scroll-bottom-pill"
          onClick={() => scrollToBottom("smooth")}
          aria-label="Scroll to latest messages"
        >
          <ArrowDown size={14} />
          <span>Latest messages</span>
        </button>
      )}
    </div>
  );
}

export default ChatMessageList;
