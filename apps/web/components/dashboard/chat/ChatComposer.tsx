"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowUp,
  Check,
  FileText,
  FolderOpen,
  Plus,
  Square,
  Upload,
  X,
} from "lucide-react";
import type { DocumentItem } from "@/lib/dashboard-api";
import { ThinkingOrbStage } from "./ThinkingOrbStage";

const MAX_TEXTAREA_HEIGHT = 180;

export interface ChatAttachmentEntry {
  localId: string;
  filename: string;
  status: "uploading" | "ready" | "error";
  docId?: string;
  errorMessage?: string;
}

interface ChatComposerProps {
  value: string;
  onChange: (next: string) => void;
  onSubmit: () => void;
  onStopStreaming: () => void;
  thinkingEnabled: boolean;
  onToggleThinking: (next: boolean) => void;
  attachments: ChatAttachmentEntry[];
  onSelectFiles: (files: File[]) => void;
  onRemoveAttachment: (localId: string) => void;
  repositoryDocs?: DocumentItem[];
  onAttachExistingDoc?: (doc: DocumentItem) => void;
  onOpenUploadModal?: () => void;
  isStreaming: boolean;
  placeholder?: string;
  autoFocus?: boolean;
  compact?: boolean;
}

export function ChatComposer({
  value,
  onChange,
  onSubmit,
  onStopStreaming,
  thinkingEnabled,
  onToggleThinking,
  attachments,
  onSelectFiles,
  onRemoveAttachment,
  repositoryDocs = [],
  onAttachExistingDoc,
  onOpenUploadModal,
  isStreaming,
  placeholder = "Ask anything about your documents...",
  autoFocus = true,
  compact = false,
}: ChatComposerProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [showRepoPicker, setShowRepoPicker] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const menuWrapRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!autoFocus) return;
    const focusInput = () => {
      const el = textareaRef.current;
      if (!el) return;
      el.focus();
    };
    const t = setTimeout(focusInput, 60);
    return () => clearTimeout(t);
  }, [autoFocus]);

  const adjustHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    if (!el.value) {
      el.style.height = "26px";
      el.style.overflowY = "hidden";
      return;
    }
    el.style.height = "auto";
    const nextH = Math.min(el.scrollHeight || 26, MAX_TEXTAREA_HEIGHT);
    el.style.height = `${nextH}px`;
    el.style.overflowY =
      el.scrollHeight > MAX_TEXTAREA_HEIGHT ? "auto" : "hidden";
  }, []);

  useEffect(() => {
    adjustHeight();
  }, [value, adjustHeight]);

  useEffect(() => {
    if (!menuOpen) {
      setShowRepoPicker(false);
      return;
    }
    const onPointerDown = (e: MouseEvent) => {
      if (
        menuWrapRef.current &&
        !menuWrapRef.current.contains(e.target as Node)
      ) {
        setMenuOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  const hasUploading = attachments.some((a) => a.status === "uploading");
  const hasReadyAttachment = attachments.some((a) => a.status === "ready");
  const canSubmit =
    !isStreaming &&
    !hasUploading &&
    (value.trim().length > 0 || hasReadyAttachment);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    onSubmit();
    setTimeout(() => textareaRef.current?.focus(), 20);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      if (canSubmit) {
        onSubmit();
        setTimeout(() => textareaRef.current?.focus(), 20);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    e.target.value = "";
    if (files.length > 0) {
      onSelectFiles(files);
    }
  };

  return (
    <form
      className={`dm-composer ${attachments.length > 0 ? "has-attachments" : ""} ${
        compact ? "is-compact" : ""
      }`}
      onSubmit={handleFormSubmit}
      onClick={(e) => {
        const target = e.target as HTMLElement;
        if (!target.closest("button") && !target.closest(".dm-composer-menu")) {
          textareaRef.current?.focus();
        }
      }}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.txt,.md,.csv,.xlsx,.xls,application/pdf,text/plain,text/csv"
        multiple
        className="dm-composer-hidden-input"
        onChange={handleFileChange}
        tabIndex={-1}
      />

      {attachments.length > 0 && (
        <div className="dm-composer-attachments">
          {attachments.map((att) => (
            <div
              key={att.localId}
              className={`dm-att-chip status-${att.status}`}
            >
              <span className="dm-att-chip__icon" aria-hidden="true">
                {att.status === "uploading" ? (
                  <ThinkingOrbStage
                    state="background"
                    variant="spiral"
                    size={16}
                    showLabel={false}
                  />
                ) : (
                  <FileText size={14} />
                )}
              </span>
              <div className="dm-att-chip__meta">
                <span className="dm-att-chip__name" title={att.filename}>
                  {att.filename}
                </span>
                <span className="dm-att-chip__sub">
                  {att.status === "uploading" && "Uploading to Repository..."}
                  {att.status === "ready" && "Saved in Repository"}
                  {att.status === "error" &&
                    (att.errorMessage || "Upload failed")}
                </span>
              </div>
              <button
                type="button"
                className="dm-att-chip__remove"
                aria-label={`Remove ${att.filename}`}
                onClick={() => onRemoveAttachment(att.localId)}
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="dm-composer-main-row">
        <div className="dm-composer-left" ref={menuWrapRef}>
          <button
            type="button"
            className={`dm-composer-plus-btn ${menuOpen ? "is-open" : ""}`}
            aria-label="Attach or upload document"
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            onClick={() => setMenuOpen((prev) => !prev)}
          >
            <Plus size={19} strokeWidth={2.1} />
          </button>

          {menuOpen && (
            <div className="dm-composer-menu" role="menu">
              <button
                type="button"
                role="menuitem"
                className="dm-composer-menu__item"
                onClick={() => {
                  setMenuOpen(false);
                  fileInputRef.current?.click();
                }}
              >
                <Upload size={15} />
                <div className="dm-composer-menu__copy">
                  <span>Upload PDF / CSV / TXT</span>
                  <small>Adds automatically to Repository</small>
                </div>
              </button>

              {onOpenUploadModal && (
                <button
                  type="button"
                  role="menuitem"
                  className="dm-composer-menu__item"
                  onClick={() => {
                    setMenuOpen(false);
                    onOpenUploadModal();
                  }}
                >
                  <Upload size={15} />
                  <div className="dm-composer-menu__copy">
                    <span>Open Dropzone Dialog</span>
                    <small>Batch upload &amp; progress tracker</small>
                  </div>
                </button>
              )}

              {repositoryDocs.length > 0 && onAttachExistingDoc && (
                <>
                  <button
                    type="button"
                    role="menuitem"
                    className="dm-composer-menu__item"
                    onClick={() => setShowRepoPicker((p) => !p)}
                  >
                    <FolderOpen size={15} />
                    <div className="dm-composer-menu__copy">
                      <span>Attach from Repository ({repositoryDocs.length})</span>
                      <small>Reference an indexed file</small>
                    </div>
                  </button>

                  {showRepoPicker && (
                    <div className="dm-composer-repo-list">
                      {repositoryDocs.slice(0, 8).map((doc) => {
                        const attached = attachments.some(
                          (a) => a.docId === doc.id
                        );
                        return (
                          <button
                            key={doc.id}
                            type="button"
                            className={`dm-composer-repo-row ${
                              attached ? "is-picked" : ""
                            }`}
                            onClick={() => {
                              onAttachExistingDoc(doc);
                              setMenuOpen(false);
                            }}
                          >
                            <FileText size={12} />
                            <span className="dm-composer-repo-name">
                              {doc.title}
                            </span>
                            {attached && <Check size={12} />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        <div
          className="dm-composer-center"
          onClick={() => textareaRef.current?.focus()}
        >
          <textarea
            ref={textareaRef}
            rows={1}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            aria-label="Ask DocuMind AI"
            className="dm-composer-textarea"
          />
        </div>

        <div className="dm-composer-right">
          <button
            type="button"
            className={`dm-composer-thinking-btn ${
              thinkingEnabled ? "is-on" : "is-off"
            }`}
            aria-pressed={thinkingEnabled}
            title={
              thinkingEnabled
                ? "Deep Thinking enabled (multi-source reasoning)"
                : "Enable Deep Thinking"
            }
            onClick={() => onToggleThinking(!thinkingEnabled)}
          >
            {thinkingEnabled ? (
              <ThinkingOrbStage
                state="reasoning"
                variant="twins"
                size={16}
                showLabel={false}
              />
            ) : (
              <span className="dm-composer-thinking-dot" aria-hidden="true" />
            )}
            <span className="dm-composer-thinking-text">
              Thinking {thinkingEnabled ? "On" : "Off"}
            </span>
          </button>

          {isStreaming ? (
            <button
              type="button"
              className="dm-composer-action-btn is-stop"
              aria-label="Stop AI streaming"
              title="Stop response"
              onClick={onStopStreaming}
            >
              <Square size={13} fill="currentColor" strokeWidth={2} />
            </button>
          ) : (
            <button
              type="submit"
              className="dm-composer-action-btn is-send"
              disabled={!canSubmit}
              aria-label="Send question"
              title="Send question"
            >
              <ArrowUp size={17} strokeWidth={2.3} />
            </button>
          )}
        </div>
      </div>
    </form>
  );
}
