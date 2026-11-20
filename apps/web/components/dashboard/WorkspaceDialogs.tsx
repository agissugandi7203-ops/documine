"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileText,
  FolderPlus,
  Loader2,
  LogOut,
  MessageSquare,
  RotateCcw,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import type { DocumentItem } from "@/lib/dashboard-api";
import type { AuthUser } from "@/lib/supabase";

export type UploadTaskStatus =
  | "uploading"
  | "processing"
  | "duplicate"
  | "ready"
  | "error";

export interface UploadTaskItem {
  localId: string;
  filename: string;
  sizeBytes: number;
  progressPct: number;
  stageLabel: string;
  status: UploadTaskStatus;
  startedAt: number;
  elapsedSec: number;
  isSlow: boolean;
  doc?: DocumentItem;
  errorMessage?: string;
  targetFolder?: string;
  sourceFile?: File;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/* ============================================================================
   1. Upload & Ingestion Modal (Drag-and-Drop + Live Progress + Slow/Error States)
   ============================================================================ */

interface UploadModalDialogProps {
  open: boolean;
  tasks: UploadTaskItem[];
  targetFolder?: string | null;
  onClose: () => void;
  onMinimizeToBackground: () => void;
  onSelectFiles: (files: File[], targetFolder?: string) => void;
  onRetryTask: (localId: string) => void;
  onForceReplaceDuplicate: (localId: string) => void;
  onDismissTask: (localId: string) => void;
  onOpenDocInRepo: (docId: string) => void;
  onAskDocInChat: (docId: string) => void;
}

export function UploadModalDialog({
  open,
  tasks,
  targetFolder,
  onClose,
  onMinimizeToBackground,
  onSelectFiles,
  onRetryTask,
  onForceReplaceDuplicate,
  onDismissTask,
  onOpenDocInRepo,
  onAskDocInChat,
}: UploadModalDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragInside, setDragInside] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const hasActive = tasks.some(
    (t) => t.status === "uploading" || t.status === "processing"
  );
  const hasSlow = tasks.some(
    (t) =>
      (t.status === "uploading" || t.status === "processing") && t.isSlow
  );

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragInside(false);
    const files = e.dataTransfer.files ? Array.from(e.dataTransfer.files) : [];
    if (files.length > 0) {
      onSelectFiles(files, targetFolder || undefined);
    }
  };

  return (
    <div
      className="db-dialog-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="db-upload-dialog-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="db-dialog-card db-dialog-card--wide">
        <div className="db-dialog-head">
          <div className="db-dialog-head-left">
            <span className="db-dialog-icon db-dialog-icon--accent">
              <Upload size={16} />
            </span>
            <div>
              <h2 id="db-upload-dialog-title" className="db-dialog-title">
                Upload &amp; Index Documents
              </h2>
              <p className="db-dialog-subtitle">
                {targetFolder
                  ? `Adding files directly into Repository folder "${targetFolder}"`
                  : "Files uploaded here sync across Repository, AI Chat, Analytics & Graph."}
              </p>
            </div>
          </div>

          <button
            type="button"
            className="db-dialog-close"
            aria-label="Close upload dialog"
            onClick={onClose}
          >
            <X size={15} />
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.txt,.md,.csv,.xlsx,.xls,application/pdf,text/plain,text/csv"
          className="sr-only"
          onChange={(e) => {
            const list = e.target.files ? Array.from(e.target.files) : [];
            e.target.value = "";
            if (list.length > 0) {
              onSelectFiles(list, targetFolder || undefined);
            }
          }}
        />

        <div
          className={`db-dropzone ${dragInside ? "db-dropzone--active" : ""}`}
          onDragOver={(e) => {
            e.preventDefault();
            if (!dragInside) setDragInside(true);
          }}
          onDragLeave={() => setDragInside(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
        >
          <span className="db-dropzone-badge">
            <Upload size={18} />
          </span>
          <div className="db-dropzone-title">
            Drag &amp; drop PDF, CSV, Excel, TXT, or Markdown here
          </div>
          <div className="db-dropzone-sub">
            or <span className="db-dropzone-link">browse from device</span> · Up
            to 50 MB per file · Multi-file supported
          </div>
        </div>

        {hasSlow && (
          <div className="db-dialog-advisory" role="status">
            <Clock size={14} />
            <div>
              <strong>Taking longer than expected.</strong> Large multi-page
              PDFs or heavy table/OCR extraction take a bit more time. You can
              wait here or minimize to keep working while indexing completes.
            </div>
          </div>
        )}

        {tasks.length > 0 && (
          <div className="db-upload-task-list">
            {tasks.map((task) => (
              <div
                key={task.localId}
                className={`db-upload-task-row is-${task.status}`}
              >
                <div className="db-upload-task-top">
                  <div className="db-upload-task-file">
                    <span className="db-upload-task-ico">
                      {task.status === "ready" ? (
                        <CheckCircle2 size={15} />
                      ) : task.status === "error" ||
                        task.status === "duplicate" ? (
                        <AlertTriangle size={15} />
                      ) : (
                        <Loader2 size={15} className="db-spin" />
                      )}
                    </span>
                    <div className="db-upload-task-meta">
                      <span className="db-upload-task-name" title={task.filename}>
                        {task.filename}
                      </span>
                      <span className="db-upload-task-sub">
                        {task.sizeBytes > 0 ? `${formatFileSize(task.sizeBytes)} · ` : ""}
                        {task.stageLabel}
                        {(task.status === "uploading" ||
                          task.status === "processing") &&
                          ` · ${task.elapsedSec}s`}
                      </span>
                    </div>
                  </div>

                  <div className="db-upload-task-actions">
                    {task.status === "duplicate" && task.doc && (
                      <>
                        <button
                          type="button"
                          className="db-dialog-mini-btn"
                          onClick={() => onOpenDocInRepo(task.doc!.id)}
                        >
                          Open Existing
                        </button>
                        {task.sourceFile && (
                          <button
                            type="button"
                            className="db-dialog-mini-btn db-dialog-mini-btn--accent"
                            onClick={() => onForceReplaceDuplicate(task.localId)}
                          >
                            Replace
                          </button>
                        )}
                      </>
                    )}

                    {task.status === "error" && task.sourceFile && (
                      <button
                        type="button"
                        className="db-dialog-mini-btn db-dialog-mini-btn--accent"
                        onClick={() => onRetryTask(task.localId)}
                      >
                        <RotateCcw size={11} />
                        <span>Retry</span>
                      </button>
                    )}

                    {task.status === "ready" && task.doc && (
                      <>
                        <button
                          type="button"
                          className="db-dialog-mini-btn"
                          onClick={() => onOpenDocInRepo(task.doc!.id)}
                        >
                          <FileText size={11} />
                          <span>Open File</span>
                        </button>
                        <button
                          type="button"
                          className="db-dialog-mini-btn db-dialog-mini-btn--accent"
                          onClick={() => onAskDocInChat(task.doc!.id)}
                        >
                          <MessageSquare size={11} />
                          <span>Ask AI</span>
                        </button>
                      </>
                    )}

                    {(task.status === "ready" ||
                      task.status === "error" ||
                      task.status === "duplicate") && (
                      <button
                        type="button"
                        className="db-upload-task-dismiss"
                        aria-label={`Dismiss ${task.filename}`}
                        onClick={() => onDismissTask(task.localId)}
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>
                </div>

                {(task.status === "uploading" ||
                  task.status === "processing") && (
                  <div className="db-upload-progress-track">
                    <div
                      className={`db-upload-progress-fill ${
                        task.isSlow ? "is-slow" : ""
                      }`}
                      style={{
                        width: `${Math.max(8, Math.min(100, task.progressPct))}%`,
                      }}
                    />
                  </div>
                )}

                {task.status === "error" && task.errorMessage && (
                  <p className="db-upload-task-error">{task.errorMessage}</p>
                )}

                {task.status === "duplicate" && (
                  <p className="db-upload-task-warn">
                    An identical file already exists in your Repository. Open the
                    existing document or replace it to re-index.
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="db-dialog-footer">
          {hasActive ? (
            <button
              type="button"
              className="db-dialog-btn"
              onClick={onMinimizeToBackground}
            >
              Continue in Background
            </button>
          ) : (
            <button type="button" className="db-dialog-btn" onClick={onClose}>
              Done
            </button>
          )}
          <button
            type="button"
            className="db-dialog-btn db-dialog-btn--primary"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload size={13} />
            <span>Add Files</span>
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
   2. Background Upload Floating Pill (Visible While Dialog Is Minimized)
   ============================================================================ */

interface FloatingUploadTrackerProps {
  tasks: UploadTaskItem[];
  modalOpen: boolean;
  onReopenModal: () => void;
  onDismissAllCompleted: () => void;
}

export function FloatingUploadTracker({
  tasks,
  modalOpen,
  onReopenModal,
  onDismissAllCompleted,
}: FloatingUploadTrackerProps) {
  if (modalOpen || tasks.length === 0) return null;

  const active = tasks.filter(
    (t) => t.status === "uploading" || t.status === "processing"
  );
  const failed = tasks.filter((t) => t.status === "error");
  const latest = active[0] || failed[0] || tasks[0];

  const isBusy = active.length > 0;
  const hasError = failed.length > 0 && !isBusy;

  return (
    <div
      className={`db-floating-upload-pill ${
        hasError ? "is-error" : isBusy && latest.isSlow ? "is-slow" : ""
      }`}
      role="status"
    >
      <button
        type="button"
        className="db-floating-upload-main"
        onClick={onReopenModal}
      >
        {isBusy ? (
          <Loader2 size={14} className="db-spin" />
        ) : hasError ? (
          <AlertTriangle size={14} />
        ) : (
          <CheckCircle2 size={14} />
        )}
        <span className="db-floating-upload-text">
          {isBusy
            ? active.length > 1
              ? `Indexing ${active.length} files (${latest.progressPct}%)`
              : `${latest.filename} · ${latest.progressPct}%`
            : hasError
            ? `Upload issue on ${latest.filename}, click to retry`
            : `${tasks.length} ${
                tasks.length === 1 ? "file" : "files"
              } added to Repository`}
        </span>
      </button>

      {!isBusy && (
        <button
          type="button"
          className="db-floating-upload-close"
          aria-label="Dismiss upload status"
          onClick={onDismissAllCompleted}
        >
          <X size={12} />
        </button>
      )}
    </div>
  );
}

/* ============================================================================
   3. Delete Document Confirmation Dialog
   ============================================================================ */

interface DeleteConfirmDialogProps {
  doc: DocumentItem | null;
  deleting: boolean;
  error?: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}

export function DeleteConfirmDialog({
  doc,
  deleting,
  error,
  onCancel,
  onConfirm,
}: DeleteConfirmDialogProps) {
  useEffect(() => {
    if (!doc) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !deleting) onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [doc, deleting, onCancel]);

  if (!doc) return null;

  return (
    <div
      className="db-dialog-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="db-delete-dialog-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !deleting) onCancel();
      }}
    >
      <div className="db-dialog-card">
        <div className="db-dialog-head">
          <div className="db-dialog-head-left">
            <span className="db-dialog-icon db-dialog-icon--danger">
              <Trash2 size={16} />
            </span>
            <div>
              <h2 id="db-delete-dialog-title" className="db-dialog-title">
                Delete Document Permanently?
              </h2>
              <p className="db-dialog-subtitle">
                This action cannot be undone.
              </p>
            </div>
          </div>

          <button
            type="button"
            className="db-dialog-close"
            aria-label="Cancel delete"
            disabled={deleting}
            onClick={onCancel}
          >
            <X size={15} />
          </button>
        </div>

        <div className="db-dialog-file-box">
          <FileText size={16} />
          <div className="db-dialog-file-meta">
            <strong>{doc.title}</strong>
            <span>
              {(doc.file_type || "PDF").toUpperCase()} · {doc.page_count || 1}{" "}
              pages · {formatFileSize(doc.file_size_bytes || 0)}
            </span>
          </div>
        </div>

        <p className="db-dialog-body-copy">
          Deleting this document removes its binary file, indexed vector
          passages, extracted SQL tables, and Knowledge Graph links across your
          workspace.
        </p>

        {error && <p className="db-upload-task-error">{error}</p>}

        <div className="db-dialog-footer">
          <button
            type="button"
            className="db-dialog-btn"
            disabled={deleting}
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type="button"
            className="db-dialog-btn db-dialog-btn--danger"
            disabled={deleting}
            onClick={onConfirm}
          >
            {deleting ? (
              <>
                <Loader2 size={13} className="db-spin" />
                <span>Deleting...</span>
              </>
            ) : (
              <>
                <Trash2 size={13} />
                <span>Delete Permanently</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
   4. Sign Out Confirmation Dialog
   ============================================================================ */

interface SignOutConfirmDialogProps {
  open: boolean;
  user: AuthUser | null;
  workspaceName: string;
  signingOut: boolean;
  hasActiveUploads: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function SignOutConfirmDialog({
  open,
  user,
  workspaceName,
  signingOut,
  hasActiveUploads,
  onCancel,
  onConfirm,
}: SignOutConfirmDialogProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !signingOut) onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, signingOut, onCancel]);

  if (!open) return null;

  const displayName = user?.username || user?.email?.split("@")[0] || "Account";

  return (
    <div
      className="db-dialog-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="db-signout-dialog-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !signingOut) onCancel();
      }}
    >
      <div className="db-dialog-card">
        <div className="db-dialog-head">
          <div className="db-dialog-head-left">
            <span className="db-dialog-icon">
              <LogOut size={16} />
            </span>
            <div>
              <h2 id="db-signout-dialog-title" className="db-dialog-title">
                Sign Out of DocuMind?
              </h2>
              <p className="db-dialog-subtitle">
                Your documents &amp; chat history stay safely saved in your
                workspace.
              </p>
            </div>
          </div>

          <button
            type="button"
            className="db-dialog-close"
            aria-label="Cancel sign out"
            disabled={signingOut}
            onClick={onCancel}
          >
            <X size={15} />
          </button>
        </div>

        <div className="db-dialog-file-box">
          <img
            src={user?.avatarUrl || "/assets/avatar-portrait.svg"}
            alt={displayName}
            referrerPolicy="no-referrer"
            className="db-dialog-avatar"
          />
          <div className="db-dialog-file-meta">
            <strong>{displayName}</strong>
            <span>
              {user?.email ? `${user.email} · ` : ""}
              {workspaceName}
            </span>
          </div>
        </div>

        {hasActiveUploads && (
          <div className="db-dialog-advisory">
            <AlertTriangle size={14} />
            <div>
              An upload or indexing task is currently running. Signing out now
              may interrupt active progress monitoring.
            </div>
          </div>
        )}

        <div className="db-dialog-footer">
          <button
            type="button"
            className="db-dialog-btn"
            disabled={signingOut}
            onClick={onCancel}
          >
            Stay Signed In
          </button>
          <button
            type="button"
            className="db-dialog-btn db-dialog-btn--primary"
            disabled={signingOut}
            onClick={onConfirm}
          >
            {signingOut ? (
              <>
                <Loader2 size={13} className="db-spin" />
                <span>Signing out...</span>
              </>
            ) : (
              <>
                <LogOut size={13} />
                <span>Sign Out</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
   5. VS Code Repository Folder Creation / File Rename & Move Dialog
   ============================================================================ */

interface FolderDialogProps {
  mode: "create-folder" | "edit-doc" | null;
  initialName?: string;
  initialFolder?: string;
  availableFolders: string[];
  busy?: boolean;
  onCancel: () => void;
  onSubmit: (payload: { name: string; folder: string }) => void;
}

export function RepositoryItemDialog({
  mode,
  initialName = "",
  initialFolder = "General",
  availableFolders,
  busy = false,
  onCancel,
  onSubmit,
}: FolderDialogProps) {
  const [name, setName] = useState(initialName);
  const [folder, setFolder] = useState(initialFolder);

  useEffect(() => {
    setName(initialName);
    setFolder(initialFolder);
  }, [mode, initialName, initialFolder]);

  useEffect(() => {
    if (!mode) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mode, busy, onCancel]);

  if (!mode) return null;

  const isFolder = mode === "create-folder";

  return (
    <div
      className="db-dialog-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="db-repo-item-dialog-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) onCancel();
      }}
    >
      <form
        className="db-dialog-card"
        onSubmit={(e) => {
          e.preventDefault();
          const cleanName = name.trim();
          if (!cleanName) return;
          onSubmit({ name: cleanName, folder: folder.trim() || "General" });
        }}
      >
        <div className="db-dialog-head">
          <div className="db-dialog-head-left">
            <span className="db-dialog-icon db-dialog-icon--accent">
              {isFolder ? <FolderPlus size={16} /> : <FileText size={16} />}
            </span>
            <div>
              <h2 id="db-repo-item-dialog-title" className="db-dialog-title">
                {isFolder ? "New Repository Folder" : "Rename or Move Document"}
              </h2>
              <p className="db-dialog-subtitle">
                {isFolder
                  ? "Organize workspace PDFs and datasets inside Explorer."
                  : "Update file title or move into another folder."}
              </p>
            </div>
          </div>

          <button
            type="button"
            className="db-dialog-close"
            aria-label="Close dialog"
            onClick={onCancel}
          >
            <X size={15} />
          </button>
        </div>

        <div className="db-dialog-form-fields">
          <label className="db-dialog-field">
            <span>{isFolder ? "Folder Name" : "Document Title"}</span>
            <input
              type="text"
              className="db-dialog-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={isFolder ? "e.g., Q4 Reports" : "Document title..."}
              autoFocus
            />
          </label>

          {!isFolder && (
            <label className="db-dialog-field">
              <span>Target Folder</span>
              <select
                className="db-dialog-input"
                value={folder}
                onChange={(e) => setFolder(e.target.value)}
              >
                {Array.from(new Set(["General", ...availableFolders, folder]))
                  .filter(Boolean)
                  .map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
              </select>
            </label>
          )}
        </div>

        <div className="db-dialog-footer">
          <button
            type="button"
            className="db-dialog-btn"
            disabled={busy}
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="db-dialog-btn db-dialog-btn--primary"
            disabled={busy || !name.trim()}
          >
            {busy ? (
              <>
                <Loader2 size={13} className="db-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <span>{isFolder ? "Create Folder" : "Save Changes"}</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
