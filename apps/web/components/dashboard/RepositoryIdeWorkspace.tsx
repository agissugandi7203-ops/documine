"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Download,
  ExternalLink,
  FileCode2,
  FileSpreadsheet,
  FileText,
  Folder,
  FolderOpen,
  FolderPlus,
  GripHorizontal,
  Loader2,
  Maximize2,
  MessageSquare,
  Minimize2,
  Minus,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRight,
  Pencil,
  PictureInPicture2,
  Search,
  Table2,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import {
  dashboardApi,
  type ChatCitation,
  type DocumentChunkItem,
  type DocumentDetailResponse,
  type DocumentItem,
} from "@/lib/dashboard-api";
import { ChatComposer, type ChatAttachmentEntry } from "./chat/ChatComposer";
import { ChatWorkspace } from "./chat/ChatWorkspace";
import {
  ORB_ACTIVITY_PRESETS,
  ThinkingOrbStage,
} from "./chat/ThinkingOrbStage";
import { RepositoryItemDialog } from "./WorkspaceDialogs";
import { useDraggableSheet } from "./useDraggableSheet";

interface RepositoryIdeWorkspaceProps {
  workspaceName: string;
  workspaceId?: string;
  userName: string;
  documents: DocumentItem[];
  selectedDocId: string | null;
  openDocRequest?: { docId: string; nonce: number } | null;
  uploading: boolean;
  onSelectDoc: (docId: string) => void;
  onOpenUploadModal: (targetFolder?: string) => void;
  onUploadFilesToRepo: (
    files: File[],
    targetFolder?: string
  ) => Promise<Array<{ filename: string; doc?: DocumentItem; error?: string }>>;
  onRequestDeleteDoc: (doc: DocumentItem) => void;
  onUpdateDocumentMeta: (
    docId: string,
    payload: { title?: string; category?: string }
  ) => Promise<void>;
  onRefreshDocuments: () => void;
}

interface InlineAnswerTurn {
  id: string;
  question: string;
  answer: string;
  status: "streaming" | "completed" | "error";
  orbState: string;
  statusLabel: string;
  citations: ChatCitation[];
  error?: string;
}

function normalizeFolderName(raw?: string | null): string {
  if (!raw || !raw.trim()) return "General";
  const cleaned = raw.trim();
  if (cleaned === "general_document" || cleaned === "general") return "General";
  return cleaned
    .replace(/_/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

function getFileExtension(doc: DocumentItem): string {
  const fromTitle = doc.title?.split(".").pop()?.trim();
  if (fromTitle && fromTitle.length <= 5 && doc.title.includes(".")) {
    return fromTitle.toUpperCase();
  }
  return (doc.file_type || "PDF").toUpperCase();
}

function isPdfDocument(doc: DocumentItem): boolean {
  const ft = (doc.file_type || "").toLowerCase();
  const mime = (doc.mime_type || "").toLowerCase();
  return ft === "pdf" || mime.includes("pdf") || doc.title.toLowerCase().endsWith(".pdf");
}

function isCsvDocument(doc: DocumentItem): boolean {
  const ft = (doc.file_type || "").toLowerCase();
  return ft === "csv" || doc.title.toLowerCase().endsWith(".csv");
}

function parseCsvPreview(raw: string, maxRows = 120): string[][] {
  const rows: string[][] = [];
  const lines = raw.replace(/\r\n/g, "\n").split("\n").filter(Boolean);
  for (let i = 0; i < Math.min(lines.length, maxRows); i += 1) {
    const line = lines[i];
    const cells: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let j = 0; j < line.length; j += 1) {
      const ch = line[j];
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === "," && !inQuotes) {
        cells.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
    cells.push(current.trim());
    rows.push(cells);
  }
  return rows;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * VS Code-Style Repository IDE Workspace:
 * - Left Explorer Sidebar: Folder tree, files, drag-and-drop into folders, New Folder / Rename / Move / Delete
 * - Right Stage (Default): Full clean AI Chat experience (identical to Chat)
 * - Right Stage (When file clicked): Replaces AI Chat with Real File Viewer (PDF iframe, CSV table, TXT lines, Chunks)
 *   plus a persistent bottom AI Chat Input scoped to the open file + floating inline AI response dock.
 * - Clicking [×] on the opened file immediately restores the full main AI Chat menu on the right.
 */
export function RepositoryIdeWorkspace({
  workspaceName,
  workspaceId,
  userName,
  documents,
  selectedDocId,
  openDocRequest,
  uploading,
  onSelectDoc,
  onOpenUploadModal,
  onUploadFilesToRepo,
  onRequestDeleteDoc,
  onUpdateDocumentMeta,
  onRefreshDocuments,
}: RepositoryIdeWorkspaceProps) {
  const wsKey = workspaceId || workspaceName || "default";
  const foldersStorageKey = `documind:repo:folders:${wsKey}`;
  const mapStorageKey = `documind:repo:docmap:${wsKey}`;

  // Custom folders & file-to-folder mapping
  const [customFolders, setCustomFolders] = useState<string[]>([
    "General",
    "Finance",
    "Engineering",
    "Research",
  ]);
  const [localFolderMap, setLocalFolderMap] = useState<Record<string, string>>(
    {}
  );
  const [expandedFolders, setExpandedFolders] = useState<
    Record<string, boolean>
  >({
    General: true,
    Finance: true,
    Engineering: true,
    Research: true,
  });
  const [activeFolder, setActiveFolder] = useState<string>("General");
  const [explorerFilter, setExplorerFilter] = useState("");
  const [dragOverFolder, setDragOverFolder] = useState<string | null>(null);
  const [draggedDocId, setDraggedDocId] = useState<string | null>(null);

  // Dialogs for New Folder & Rename/Move File
  const [itemDialogMode, setItemDialogMode] = useState<
    "create-folder" | "edit-doc" | null
  >(null);
  const [editingDoc, setEditingDoc] = useState<DocumentItem | null>(null);
  const [dialogSaving, setDialogSaving] = useState(false);

  // Open file in right editor/viewer (null = Default AI Chat mode)
  const ideShellRef = useRef<HTMLDivElement | null>(null);
  const [explorerPct, setExplorerPct] = useState<number>(60);
  const [openExplorerPx, setOpenExplorerPx] = useState<number>(228);
  const [isDraggingSplit, setIsDraggingSplit] = useState(false);
  const [desktopAiMode, setDesktopAiMode] = useState<
    "split" | "floating" | "minimized"
  >("split");
  const [lastActiveAiMode, setLastActiveAiMode] = useState<"split" | "floating">(
    "split"
  );
  const [floatBox, setFloatBox] = useState({
    left: 24,
    top: 18,
    width: 450,
    height: 580,
    initialized: false,
  });
  const [floatPreMaxBox, setFloatPreMaxBox] = useState<{
    left: number;
    top: number;
    width: number;
    height: number;
  } | null>(null);
  const [isFloatingInteracting, setIsFloatingInteracting] = useState(false);
  const [inlineDockMinimized, setInlineDockMinimized] = useState(false);
  const [inlineAnswerHeight, setInlineAnswerHeight] = useState<number>(300);
  const [openDocId, setOpenDocId] = useState<string | null>(null);
  const [explorerCollapsed, setExplorerCollapsed] = useState(false);
  const [mobileAiOpen, setMobileAiOpen] = useState(false);
  const [viewerMode, setViewerMode] = useState<"preview" | "text" | "tables">(
    "preview"
  );
  const [viewerPage, setViewerPage] = useState<number | null>(null);
  const [docDetail, setDocDetail] = useState<DocumentDetailResponse | null>(
    null
  );
  const [docChunks, setDocChunks] = useState<DocumentChunkItem[]>([]);
  const [rawTextPreview, setRawTextPreview] = useState<string | null>(null);
  const [loadingPreviewMeta, setLoadingPreviewMeta] = useState(false);

  // Inline File AI Chat (bottom input while viewing PDF/File)
  const [inlineInput, setInlineInput] = useState("");
  const [inlineThinking, setInlineThinking] = useState(false);
  const [inlineAttachments, setInlineAttachments] = useState<
    ChatAttachmentEntry[]
  >([]);
  const [inlineStreaming, setInlineStreaming] = useState(false);
  const [inlineConvId, setInlineConvId] = useState<string | null>(null);
  const [inlineTurn, setInlineTurn] = useState<InlineAnswerTurn | null>(null);
  const [inlinePanelVisible, setInlinePanelVisible] = useState(false);
  const inlineAbortRef = useRef<AbortController | null>(null);

  // Load persisted folder list & doc assignments
  useEffect(() => {
    try {
      const rawF = window.localStorage.getItem(foldersStorageKey);
      if (rawF) {
        const parsed = JSON.parse(rawF) as string[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setCustomFolders(parsed);
        }
      }
      const rawMap = window.localStorage.getItem(mapStorageKey);
      if (rawMap) {
        const parsedMap = JSON.parse(rawMap) as Record<string, string>;
        if (parsedMap && typeof parsedMap === "object") {
          setLocalFolderMap(parsedMap);
        }
      }
    } catch {
      // ignore storage errors
    }
  }, [foldersStorageKey, mapStorageKey]);

  // Honor explicit external open-file requests (from Search or Upload Dialog)
  useEffect(() => {
    if (!openDocRequest?.docId) return;
    setOpenDocId(openDocRequest.docId);
    setViewerMode("preview");
    setViewerPage(null);
    setInlineTurn(null);
    setInlinePanelVisible(false);
    onSelectDoc(openDocRequest.docId);
  }, [openDocRequest, onSelectDoc]);

  // If the currently opened file was deleted, restore default AI menu cleanly
  useEffect(() => {
    if (openDocId && !documents.some((d) => d.id === openDocId)) {
      setOpenDocId(null);
      setInlineTurn(null);
      setInlinePanelVisible(false);
    }
  }, [documents, openDocId]);

  useEffect(() => {
    return () => {
      inlineAbortRef.current?.abort();
    };
  }, []);

  const openDoc = useMemo(
    () =>
      openDocId ? documents.find((d) => d.id === openDocId) ?? null : null,
    [documents, openDocId]
  );

  const repoAiSheet = useDraggableSheet({
    open: !openDoc && mobileAiOpen,
    onClose: () => setMobileAiOpen(false),
  });

  // Load document chunks / detail / raw CSV/TXT whenever openDocId changes
  useEffect(() => {
    if (!openDoc) {
      setDocDetail(null);
      setDocChunks([]);
      setRawTextPreview(null);
      return;
    }

    let cancelled = false;
    setLoadingPreviewMeta(true);
    setRawTextPreview(null);

    const tasks: Array<Promise<unknown>> = [
      dashboardApi
        .getDocumentDetail(openDoc.id)
        .then((res) => {
          if (!cancelled) setDocDetail(res);
        })
        .catch(() => {
          if (!cancelled) setDocDetail(null);
        }),
      dashboardApi
        .getDocumentChunks(openDoc.id)
        .then((chunks) => {
          if (!cancelled) setDocChunks(Array.isArray(chunks) ? chunks : []);
        })
        .catch(() => {
          if (!cancelled) setDocChunks([]);
        }),
    ];

    if (!isPdfDocument(openDoc)) {
      tasks.push(
        dashboardApi
          .fetchDocumentText(openDoc.id)
          .then((txt) => {
            if (!cancelled) setRawTextPreview(txt);
          })
          .catch(() => {
            if (!cancelled) setRawTextPreview(null);
          })
      );
    }

    void Promise.allSettled(tasks).finally(() => {
      if (!cancelled) setLoadingPreviewMeta(false);
    });

    return () => {
      cancelled = true;
    };
  }, [openDoc]);

  // Resolve folder tree combining custom folders + document categories
  const folderTree = useMemo(() => {
    const q = explorerFilter.trim().toLowerCase();
    const map = new Map<string, DocumentItem[]>();

    for (const f of customFolders) {
      map.set(f, []);
    }

    for (const doc of documents) {
      const assigned =
        localFolderMap[doc.id] || normalizeFolderName(doc.category);
      if (!map.has(assigned)) {
        map.set(assigned, []);
      }
      if (!q || doc.title.toLowerCase().includes(q) || assigned.toLowerCase().includes(q)) {
        map.get(assigned)!.push(doc);
      }
    }

    return Array.from(map.entries())
      .filter(([folderName, files]) => {
        if (!q) return true;
        return files.length > 0 || folderName.toLowerCase().includes(q);
      })
      .sort(([a], [b]) => {
        if (a === "General") return -1;
        if (b === "General") return 1;
        return a.localeCompare(b);
      });
  }, [customFolders, documents, localFolderMap, explorerFilter]);

  const allFolderNames = useMemo(
    () => folderTree.map(([name]) => name),
    [folderTree]
  );

  const persistFolders = useCallback(
    (next: string[]) => {
      setCustomFolders(next);
      try {
        window.localStorage.setItem(foldersStorageKey, JSON.stringify(next));
      } catch {
        // ignore quota errors
      }
    },
    [foldersStorageKey]
  );

  const assignDocFolder = useCallback(
    async (docId: string, folderName: string) => {
      const clean = folderName.trim() || "General";
      if (!customFolders.includes(clean)) {
        persistFolders([...customFolders, clean]);
      }
      setLocalFolderMap((prev) => {
        const next = { ...prev, [docId]: clean };
        try {
          window.localStorage.setItem(mapStorageKey, JSON.stringify(next));
        } catch {
          // ignore
        }
        return next;
      });
      setExpandedFolders((prev) => ({ ...prev, [clean]: true }));
      try {
        await onUpdateDocumentMeta(docId, { category: clean });
      } catch {
        // keep optimistic local assignment
      }
    },
    [customFolders, mapStorageKey, onUpdateDocumentMeta, persistFolders]
  );

  useEffect(() => {
    if (!mobileAiOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileAiOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileAiOpen]);

  const handleOpenFile = (doc: DocumentItem) => {
    onSelectDoc(doc.id);
    setOpenDocId(doc.id);
    setMobileAiOpen(false);
    setViewerMode("preview");
    setViewerPage(null);
    setInlineTurn(null);
    setInlinePanelVisible(false);
  };

  const handleCloseOpenedFile = () => {
    inlineAbortRef.current?.abort();
    setInlineStreaming(false);
    setOpenDocId(null);
    setExplorerCollapsed(false);
    setInlineTurn(null);
    setInlinePanelVisible(false);
  };

  const handleDropIntoFolder = async (
    e: React.DragEvent<HTMLElement>,
    folderName: string
  ) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverFolder(null);

    // 1) Internal move of an existing Explorer file row
    const internalDocId =
      e.dataTransfer.getData("application/x-documind-doc-id") || draggedDocId;
    if (internalDocId && e.dataTransfer.files.length === 0) {
      setDraggedDocId(null);
      await assignDocFolder(internalDocId, folderName);
      return;
    }

    // 2) External files dropped from OS onto a folder
    const files = e.dataTransfer.files ? Array.from(e.dataTransfer.files) : [];
    if (files.length > 0) {
      setExpandedFolders((prev) => ({ ...prev, [folderName]: true }));
      setActiveFolder(folderName);
      const uploadedResults = await onUploadFilesToRepo(files, folderName);
      for (const r of uploadedResults) {
        if (r.doc?.id) {
          await assignDocFolder(r.doc.id, folderName);
        }
      }
    }
  };

  // Handle Inline File Chat Submission while File Viewer is Open
  const handleSubmitInlineChat = async () => {
    if (!openDoc || inlineStreaming) return;
    const text = inlineInput.trim();
    if (!text) return;

    const controller = new AbortController();
    inlineAbortRef.current = controller;
    setInlineInput("");
    setInlineStreaming(true);
    setInlinePanelVisible(true);

    const turnId = `inline-${Date.now()}`;
    setInlineTurn({
      id: turnId,
      question: text,
      answer: "",
      status: "streaming",
      orbState: ORB_ACTIVITY_PRESETS.searching.state,
      statusLabel: `Searching "${openDoc.title}"...`,
      citations: [],
    });

    let accumulated = "";

    try {
      await dashboardApi.streamChat(
        {
          message: text,
          document_id: openDoc.id,
          scope_mode: "single_doc",
          deep_analysis: inlineThinking,
          conversation_id: inlineConvId,
        },
        {
          signal: controller.signal,
          onStatus: (st) => {
            setInlineTurn((prev) =>
              prev
                ? {
                    ...prev,
                    orbState: st.orbState || "reasoning",
                    statusLabel: st.label || "Analyzing document...",
                  }
                : prev
            );
          },
          onTokenDelta: (delta) => {
            accumulated += delta;
            setInlineTurn((prev) =>
              prev
                ? {
                    ...prev,
                    orbState: "working",
                    statusLabel: "Writing answer...",
                    answer: accumulated,
                  }
                : prev
            );
          },
          onCitationsVerified: (done) => {
            if (done.conversation_id) {
              setInlineConvId(done.conversation_id);
            }
            setInlineTurn((prev) =>
              prev
                ? {
                    ...prev,
                    status: "completed",
                    answer: done.answer || accumulated,
                    citations: done.citations || [],
                    statusLabel: "Completed",
                  }
                : prev
            );
          },
        }
      );

      setInlineTurn((prev) =>
        prev && prev.status === "streaming"
          ? {
              ...prev,
              status: prev.answer.trim() ? "completed" : "error",
              error: prev.answer.trim()
                ? undefined
                : "No response received from AI.",
            }
          : prev
      );
    } catch (err) {
      const aborted =
        controller.signal.aborted ||
        (err instanceof DOMException && err.name === "AbortError");
      setInlineTurn((prev) =>
        prev
          ? {
              ...prev,
              status: aborted ? "completed" : "error",
              error: aborted
                ? undefined
                : err instanceof Error
                ? err.message
                : "Failed to answer question.",
            }
          : prev
      );
    } finally {
      inlineAbortRef.current = null;
      setInlineStreaming(false);
    }
  };

  const handleInlineUploadFiles = (files: File[]) => {
    const entries: ChatAttachmentEntry[] = files.map((f, idx) => ({
      localId: `repo-att-${Date.now()}-${idx}`,
      filename: f.name,
      status: "uploading",
    }));
    setInlineAttachments((prev) => [...prev, ...entries]);
    void onUploadFilesToRepo(files, activeFolder).then((results) => {
      entries.forEach((entry, idx) => {
        const res = results[idx];
        setInlineAttachments((prev) =>
          prev.map((a) =>
            a.localId === entry.localId
              ? res?.doc
                ? { ...a, status: "ready", docId: res.doc.id }
                : { ...a, status: "error", errorMessage: res?.error || "Failed" }
              : a
          )
        );
      });
    });
  };

  const csvRows = useMemo(() => {
    if (!rawTextPreview || !openDoc || !isCsvDocument(openDoc)) return [];
    return parseCsvPreview(rawTextPreview);
  }, [rawTextPreview, openDoc]);

  const toggleAllFolders = (expand: boolean) => {
    const next: Record<string, boolean> = {};
    for (const [name] of folderTree) {
      next[name] = expand;
    }
    setExpandedFolders(next);
  };

  const computeDefaultFloatBox = useCallback(() => {
    const rect = ideShellRef.current?.getBoundingClientRect();
    const shellW = rect?.width || 1100;
    const shellH = rect?.height || 700;
    const w = Math.max(360, Math.min(480, Math.round(shellW * 0.44)));
    const h = Math.max(380, Math.min(640, Math.round(shellH - 40)));
    return {
      left: Math.max(12, Math.round(shellW - w - 18)),
      top: Math.max(12, Math.round((shellH - h) / 2)),
      width: w,
      height: h,
      initialized: true,
    };
  }, []);

  const enterFloatingMode = useCallback(() => {
    setFloatBox((prev) => (prev.initialized ? prev : computeDefaultFloatBox()));
    setLastActiveAiMode("floating");
    setDesktopAiMode("floating");
  }, [computeDefaultFloatBox]);

  const minimizeDesktopAi = useCallback(() => {
    if (desktopAiMode === "split" || desktopAiMode === "floating") {
      setLastActiveAiMode(desktopAiMode);
    }
    setDesktopAiMode("minimized");
  }, [desktopAiMode]);

  const restoreDesktopAi = useCallback(() => {
    if (lastActiveAiMode === "floating") {
      setFloatBox((prev) =>
        prev.initialized ? prev : computeDefaultFloatBox()
      );
    }
    setDesktopAiMode(lastActiveAiMode);
  }, [computeDefaultFloatBox, lastActiveAiMode]);

  const toggleAiEnlargeShrink = useCallback(() => {
    if (desktopAiMode === "floating") {
      const rect = ideShellRef.current?.getBoundingClientRect();
      const shellW = rect?.width || 1100;
      const shellH = rect?.height || 700;
      if (floatPreMaxBox) {
        setFloatBox({ ...floatPreMaxBox, initialized: true });
        setFloatPreMaxBox(null);
      } else {
        setFloatPreMaxBox({
          left: floatBox.left,
          top: floatBox.top,
          width: floatBox.width,
          height: floatBox.height,
        });
        const maxW = Math.max(420, Math.min(920, Math.round(shellW * 0.84)));
        const maxH = Math.max(400, Math.round(shellH - 28));
        setFloatBox({
          left: Math.max(12, Math.round((shellW - maxW) / 2)),
          top: Math.max(12, Math.round((shellH - maxH) / 2)),
          width: maxW,
          height: maxH,
          initialized: true,
        });
      }
      return;
    }
    setExplorerPct((p) => (p <= 36 ? 60 : 30));
  }, [desktopAiMode, floatBox, floatPreMaxBox]);

  const handleFloatDragPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.button !== 0 || !ideShellRef.current) return;
      if ((e.target as HTMLElement).closest("button")) return;
      if (typeof window !== "undefined" && window.innerWidth < 1024) return;
      e.preventDefault();

      const shellRect = ideShellRef.current.getBoundingClientRect();
      const startX = e.clientX;
      const startY = e.clientY;
      const initialBox =
        desktopAiMode === "floating" && floatBox.initialized
          ? floatBox
          : computeDefaultFloatBox();

      let detached = desktopAiMode === "floating";
      if (!detached && !floatBox.initialized) {
        setFloatBox(initialBox);
      }
      setIsFloatingInteracting(true);

      const onMove = (ev: PointerEvent) => {
        const dx = ev.clientX - startX;
        const dy = ev.clientY - startY;
        if (!detached) {
          if (Math.hypot(dx, dy) < 10) return;
          detached = true;
          setLastActiveAiMode("floating");
          setDesktopAiMode("floating");
        }
        setFloatPreMaxBox(null);
        const maxL = Math.max(10, shellRect.width - initialBox.width - 10);
        const maxT = Math.max(10, shellRect.height - initialBox.height - 10);
        setFloatBox({
          left: Math.max(10, Math.min(maxL, Math.round(initialBox.left + dx))),
          top: Math.max(10, Math.min(maxT, Math.round(initialBox.top + dy))),
          width: initialBox.width,
          height: initialBox.height,
          initialized: true,
        });
      };

      const onUp = () => {
        setIsFloatingInteracting(false);
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onUp);
      };

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onUp);
    },
    [computeDefaultFloatBox, desktopAiMode, floatBox]
  );

  const handleFloatResizePointerDown = useCallback(
    (
      dir: "n" | "s" | "e" | "w" | "nw" | "ne" | "sw" | "se",
      e: React.PointerEvent<HTMLDivElement>
    ) => {
      if (e.button !== 0 || !ideShellRef.current) return;
      e.preventDefault();
      e.stopPropagation();
      const shellRect = ideShellRef.current.getBoundingClientRect();
      const startX = e.clientX;
      const startY = e.clientY;
      const startBox = floatBox;
      setFloatPreMaxBox(null);
      setIsFloatingInteracting(true);

      const minW = 320;
      const minH = 300;
      const pad = 10;

      const onMove = (ev: PointerEvent) => {
        const dx = ev.clientX - startX;
        const dy = ev.clientY - startY;

        let nextLeft = startBox.left;
        let nextTop = startBox.top;
        let nextW = startBox.width;
        let nextH = startBox.height;

        if (dir.includes("e")) {
          const maxW = Math.max(minW, shellRect.width - startBox.left - pad);
          nextW = Math.max(minW, Math.min(maxW, Math.round(startBox.width + dx)));
        }
        if (dir.includes("w")) {
          const maxW = Math.max(minW, startBox.left + startBox.width - pad);
          nextW = Math.max(minW, Math.min(maxW, Math.round(startBox.width - dx)));
          nextLeft = Math.round(startBox.left + (startBox.width - nextW));
        }
        if (dir.includes("s")) {
          const maxH = Math.max(minH, shellRect.height - startBox.top - pad);
          nextH = Math.max(minH, Math.min(maxH, Math.round(startBox.height + dy)));
        }
        if (dir.includes("n")) {
          const maxH = Math.max(minH, startBox.top + startBox.height - pad);
          nextH = Math.max(minH, Math.min(maxH, Math.round(startBox.height - dy)));
          nextTop = Math.round(startBox.top + (startBox.height - nextH));
        }

        setFloatBox({
          left: nextLeft,
          top: nextTop,
          width: nextW,
          height: nextH,
          initialized: true,
        });
      };

      const onUp = () => {
        setIsFloatingInteracting(false);
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onUp);
      };

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onUp);
    },
    [floatBox]
  );

  const handleInlineResizePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.button !== 0) return;
      e.preventDefault();
      const startY = e.clientY;
      const startH = inlineAnswerHeight;

      const onMove = (ev: PointerEvent) => {
        const nextH = Math.max(
          150,
          Math.min(540, Math.round(startH + (startY - ev.clientY)))
        );
        setInlineAnswerHeight(nextH);
      };

      const onUp = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onUp);
      };

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onUp);
    },
    [inlineAnswerHeight]
  );

  const handleSplitPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.button !== 0 || !ideShellRef.current) return;
      e.preventDefault();
      const shellRect = ideShellRef.current.getBoundingClientRect();
      if (shellRect.width <= 0) return;
      setIsDraggingSplit(true);

      const onMove = (ev: PointerEvent) => {
        const dx = ev.clientX - shellRect.left;
        if (openDocId) {
          const nextPx = Math.max(180, Math.min(480, Math.round(dx)));
          setOpenExplorerPx(nextPx);
        } else {
          const rawPct = (dx / shellRect.width) * 100;
          const nextPct = Math.max(
            24,
            Math.min(78, Math.round(rawPct * 10) / 10)
          );
          setExplorerPct(nextPct);
        }
      };

      const onUp = () => {
        setIsDraggingSplit(false);
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onUp);
      };

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onUp);
    },
    [openDocId]
  );

  const anyExpanded = folderTree.some(([name]) => expandedFolders[name] !== false);

  return (
    <div
      ref={ideShellRef}
      className={`repo-ide-shell ${
        openDoc ? "has-open-file" : "is-repo-primary"
      } ${openDoc && explorerCollapsed ? "is-explorer-collapsed" : ""} ${
        isDraggingSplit ? "is-resizing-split" : ""
      } ${!openDoc && desktopAiMode === "floating" ? "is-desktop-ai-floating" : ""} ${
        !openDoc && desktopAiMode === "minimized" ? "is-desktop-ai-minimized" : ""
      } ${isFloatingInteracting ? "is-floating-interacting" : ""} ${
        !openDoc && mobileAiOpen ? "is-mobile-ai-open" : ""
      } ${!openDoc && mobileAiOpen && repoAiSheet.isFull ? "is-mobile-ai-full" : ""}`}
      style={
        {
          "--repo-explorer-pct": `${explorerPct}%`,
          "--repo-explorer-open-px": `${openExplorerPx}px`,
        } as React.CSSProperties
      }
    >
      {/* ====================================================================
          LEFT PANE: VS CODE EXPLORER (DOMINANT REPO TREE DEFAULT; SLIM/HIDE WHEN PDF OPEN)
          ==================================================================== */}
      {(!openDoc || !explorerCollapsed) && (
        <aside
          className="repo-explorer"
          aria-label="Repository Explorer"
          onDragOver={(e) => {
            if (e.dataTransfer.types.includes("Files")) {
              e.preventDefault();
            }
          }}
          onDrop={(e) => {
            if (e.dataTransfer.files?.length && !dragOverFolder) {
              void handleDropIntoFolder(e, activeFolder || "General");
            }
          }}
        >
        <div className="repo-explorer-head">
          <span className="repo-explorer-kicker">EXPLORER</span>
          <div className="repo-explorer-actions">
            {!openDoc && (
              <button
                type="button"
                className="repo-mobile-ai-icon-btn"
                title="Open Repository AI Pop-up"
                aria-label="Open Repository AI"
                onClick={() => setMobileAiOpen(true)}
              >
                <MessageSquare size={13} />
              </button>
            )}
            <button
              type="button"
              className="repo-icon-btn"
              title="New Folder"
              aria-label="New Folder"
              onClick={() => {
                setEditingDoc(null);
                setItemDialogMode("create-folder");
              }}
            >
              <FolderPlus size={14} />
            </button>
            <button
              type="button"
              className="repo-icon-btn"
              title={`Upload File to ${activeFolder}`}
              aria-label="Upload File"
              onClick={() => onOpenUploadModal(activeFolder)}
            >
              <Upload size={14} />
            </button>
            {!openDoc && desktopAiMode === "minimized" && (
              <button
                type="button"
                className="repo-icon-btn repo-desktop-resize-btn"
                title="Restore Repository AI"
                aria-label="Restore Repository AI"
                onClick={restoreDesktopAi}
              >
                <MessageSquare size={13} />
              </button>
            )}
            {!openDoc && desktopAiMode === "split" && (
              <button
                type="button"
                className="repo-icon-btn repo-desktop-resize-btn"
                title={
                  explorerPct >= 68
                    ? "Restore Explorer width"
                    : "Enlarge Explorer panel"
                }
                aria-label={
                  explorerPct >= 68
                    ? "Restore Explorer width"
                    : "Enlarge Explorer panel"
                }
                onClick={() => setExplorerPct((p) => (p >= 68 ? 60 : 74))}
              >
                {explorerPct >= 68 ? (
                  <Minimize2 size={13} />
                ) : (
                  <Maximize2 size={13} />
                )}
              </button>
            )}
            <button
              type="button"
              className="repo-icon-btn"
              title={anyExpanded ? "Collapse Folders" : "Expand Folders"}
              aria-label={anyExpanded ? "Collapse Folders" : "Expand Folders"}
              onClick={() => toggleAllFolders(!anyExpanded)}
            >
              {anyExpanded ? (
                <ChevronDown size={14} />
              ) : (
                <ChevronRight size={14} />
              )}
            </button>
          </div>
        </div>

        <div className="repo-explorer-ws-row">
          <ChevronDown size={13} />
          <span className="repo-explorer-ws-name">{workspaceName}</span>
          <span className="repo-explorer-ws-count">{documents.length}</span>
        </div>

        <div className="repo-explorer-search">
          <Search size={12} />
          <input
            type="text"
            value={explorerFilter}
            onChange={(e) => setExplorerFilter(e.target.value)}
            placeholder="Filter files..."
            aria-label="Filter files in explorer"
          />
          {explorerFilter && (
            <button
              type="button"
              className="repo-explorer-clear"
              aria-label="Clear filter"
              onClick={() => setExplorerFilter("")}
            >
              <X size={11} />
            </button>
          )}
        </div>

        <div className="repo-tree-scroll">
          {folderTree.map(([folderName, files]) => {
            const isExpanded = expandedFolders[folderName] !== false;
            const isActiveDir = activeFolder === folderName;
            const isDropHot = dragOverFolder === folderName;

            return (
              <div
                key={folderName}
                className={`repo-folder-group ${
                  isDropHot ? "is-drop-target" : ""
                }`}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (dragOverFolder !== folderName) {
                    setDragOverFolder(folderName);
                  }
                }}
                onDragLeave={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                    setDragOverFolder(null);
                  }
                }}
                onDrop={(e) => {
                  void handleDropIntoFolder(e, folderName);
                }}
              >
                <div
                  className={`repo-folder-row ${
                    isActiveDir ? "is-selected" : ""
                  }`}
                >
                  <button
                    type="button"
                    className="repo-folder-btn"
                    onClick={() => {
                      setActiveFolder(folderName);
                      setExpandedFolders((prev) => ({
                        ...prev,
                        [folderName]: !isExpanded,
                      }));
                    }}
                  >
                    <span className="repo-tree-chevron">
                      {isExpanded ? (
                        <ChevronDown size={13} />
                      ) : (
                        <ChevronRight size={13} />
                      )}
                    </span>
                    <span className="repo-folder-ico">
                      {isExpanded ? (
                        <FolderOpen size={14} />
                      ) : (
                        <Folder size={14} />
                      )}
                    </span>
                    <span className="repo-folder-name">{folderName}</span>
                    <span className="repo-folder-count">{files.length}</span>
                  </button>

                  <button
                    type="button"
                    className="repo-row-hover-btn"
                    title={`Upload into ${folderName}`}
                    aria-label={`Upload into ${folderName}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveFolder(folderName);
                      onOpenUploadModal(folderName);
                    }}
                  >
                    <Upload size={11} />
                  </button>
                </div>

                {isExpanded && (
                  <ul className="repo-file-list" role="group">
                    {files.length > 0 ? (
                      files.map((doc) => {
                        const isOpen = openDoc?.id === doc.id;
                        const isSelected = selectedDocId === doc.id;
                        const ext = getFileExtension(doc);
                        const isSheet = isCsvDocument(doc) || ext.startsWith("XLS");

                        return (
                          <li
                            key={doc.id}
                            className={`repo-file-row ${
                              isOpen
                                ? "is-open"
                                : isSelected
                                ? "is-selected"
                                : ""
                            }`}
                            draggable
                            onDragStart={(e) => {
                              setDraggedDocId(doc.id);
                              e.dataTransfer.setData(
                                "application/x-documind-doc-id",
                                doc.id
                              );
                            }}
                            onDragEnd={() => {
                              setDraggedDocId(null);
                              setDragOverFolder(null);
                            }}
                          >
                            <button
                              type="button"
                              className="repo-file-btn"
                              onClick={() => handleOpenFile(doc)}
                              title={`${doc.title} (${doc.page_count}p · ${formatBytes(
                                doc.file_size_bytes
                              )})`}
                            >
                              <span
                                className={`repo-file-ext-tag is-${
                                  isSheet ? "sheet" : ext === "PDF" ? "pdf" : "doc"
                                }`}
                              >
                                {ext.slice(0, 3)}
                              </span>
                              <span className="repo-file-title">{doc.title}</span>
                              <span className="repo-file-meta">
                                {doc.page_count || 1}p · {formatBytes(doc.file_size_bytes)}
                              </span>
                            </button>

                            <div className="repo-file-row-actions">
                              <button
                                type="button"
                                className="repo-row-hover-btn"
                                title="Rename or move folder"
                                aria-label={`Rename or move ${doc.title}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingDoc(doc);
                                  setItemDialogMode("edit-doc");
                                }}
                              >
                                <Pencil size={11} />
                              </button>
                              <button
                                type="button"
                                className="repo-row-hover-btn is-danger"
                                title="Delete file"
                                aria-label={`Delete ${doc.title}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onRequestDeleteDoc(doc);
                                }}
                              >
                                <Trash2 size={11} />
                              </button>
                            </div>
                          </li>
                        );
                      })
                    ) : (
                      <li className="repo-folder-empty">
                        <span>Empty folder, drop files here</span>
                      </li>
                    )}
                  </ul>
                )}
              </div>
            );
          })}

          {documents.length === 0 && (
            <div className="repo-explorer-onboard">
              <p>No files in Repository yet. Drop a PDF or CSV on any folder.</p>
              <button
                type="button"
                className="repo-explorer-upload-cta"
                onClick={() => onOpenUploadModal(activeFolder)}
                disabled={uploading}
              >
                <Upload size={12} />
                <span>Start First Document</span>
              </button>
            </div>
          )}
        </div>
      </aside>
      )}

      {/* Mobile Backdrop & Floating Pop-up Trigger for Repository AI */}
      {!openDoc && mobileAiOpen && (
        <div
          className="repo-mobile-ai-backdrop"
          onClick={() => setMobileAiOpen(false)}
          aria-hidden="true"
        />
      )}

      {!openDoc && (
        <button
          type="button"
          className="repo-mobile-ai-fab"
          onClick={() => setMobileAiOpen(true)}
          aria-label="Open Repository AI Assistant"
        >
          <MessageSquare size={15} />
          <span>Ask Repo AI</span>
        </button>
      )}

      {/* Desktop Interactive Split Resizer (Drag or Double-Click to Reset) */}
      {(openDoc ? !explorerCollapsed : desktopAiMode === "split") && (
        <div
          className="repo-split-resizer"
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize Repository Explorer and right panel"
          title="Drag to enlarge or shrink panes · Double-click to reset"
          onPointerDown={handleSplitPointerDown}
          onDoubleClick={() => {
            if (openDoc) setOpenExplorerPx(228);
            else setExplorerPct(60);
          }}
        >
          <span className="repo-split-resizer-handle" aria-hidden="true" />
        </div>
      )}

      {/* Desktop Minimized AI Launcher Pill */}
      {!openDoc && desktopAiMode === "minimized" && (
        <button
          type="button"
          className="repo-desktop-ai-minimized-pill"
          onClick={restoreDesktopAi}
          title="Open Repository AI Chat"
          aria-label="Open Repository AI Chat"
        >
          <MessageSquare size={14} />
          <span>Repository AI</span>
          <Maximize2 size={12} />
        </button>
      )}

      {/* ====================================================================
          RIGHT PANE: DEFAULT MAIN AI CHAT (SPLIT / FLOATING / MINIMIZED) <--> OPENED FILE VIEWER
          ==================================================================== */}
      <section
        className={`repo-stage-pane ${
          !openDoc && desktopAiMode === "floating" ? "is-desktop-floating" : ""
        }`}
        aria-label="Repository Editor and AI"
        style={
          !openDoc && mobileAiOpen
            ? repoAiSheet.sheetInlineStyle
            : !openDoc && desktopAiMode === "floating"
            ? ({
                "--repo-float-left": `${floatBox.left}px`,
                "--repo-float-top": `${floatBox.top}px`,
                "--repo-float-w": `${floatBox.width}px`,
                "--repo-float-h": `${floatBox.height}px`,
              } as React.CSSProperties)
            : undefined
        }
        {...(!openDoc && mobileAiOpen ? repoAiSheet.bodyTouchProps : {})}
      >
        {!openDoc ? (
          /* DEFAULT: Main AI Chat Menu (Desktop split/floating/minimizable; Mobile swipeable pop-up) */
          <div className="repo-default-chat-host">
            {desktopAiMode === "floating" && (
              <>
                <div
                  className="repo-float-resize repo-float-resize--w"
                  onPointerDown={(e) => handleFloatResizePointerDown("w", e)}
                  aria-hidden="true"
                />
                <div
                  className="repo-float-resize repo-float-resize--e"
                  onPointerDown={(e) => handleFloatResizePointerDown("e", e)}
                  aria-hidden="true"
                />
                <div
                  className="repo-float-resize repo-float-resize--n"
                  onPointerDown={(e) => handleFloatResizePointerDown("n", e)}
                  aria-hidden="true"
                />
                <div
                  className="repo-float-resize repo-float-resize--s"
                  onPointerDown={(e) => handleFloatResizePointerDown("s", e)}
                  aria-hidden="true"
                />
                <div
                  className="repo-float-resize repo-float-resize--nw"
                  onPointerDown={(e) => handleFloatResizePointerDown("nw", e)}
                  aria-hidden="true"
                />
                <div
                  className="repo-float-resize repo-float-resize--ne"
                  onPointerDown={(e) => handleFloatResizePointerDown("ne", e)}
                  aria-hidden="true"
                />
                <div
                  className="repo-float-resize repo-float-resize--sw"
                  onPointerDown={(e) => handleFloatResizePointerDown("sw", e)}
                  aria-hidden="true"
                />
                <div
                  className="repo-float-resize repo-float-resize--se"
                  onPointerDown={(e) => handleFloatResizePointerDown("se", e)}
                  aria-hidden="true"
                />
              </>
            )}

            <div
              className={`repo-desktop-ai-bar ${
                desktopAiMode === "floating" ? "is-floating-drag" : ""
              }`}
              onPointerDown={handleFloatDragPointerDown}
              title={
                desktopAiMode === "floating"
                  ? "Drag header to move chat anywhere"
                  : "Drag header out to float and move freely"
              }
            >
              <span className="repo-desktop-ai-title">
                <GripHorizontal size={13} className="repo-desktop-ai-grip" />
                <MessageSquare size={13} />
                <span>Repository AI</span>
              </span>
              <div className="repo-desktop-ai-actions">
                <button
                  type="button"
                  className="repo-icon-btn"
                  title={
                    desktopAiMode === "floating"
                      ? "Dock chat to right panel"
                      : "Float chat window to move & resize freely"
                  }
                  aria-label={
                    desktopAiMode === "floating"
                      ? "Dock chat to side"
                      : "Float chat window"
                  }
                  onClick={() => {
                    if (desktopAiMode === "floating") {
                      setLastActiveAiMode("split");
                      setDesktopAiMode("split");
                    } else {
                      enterFloatingMode();
                    }
                  }}
                >
                  {desktopAiMode === "floating" ? (
                    <PanelRight size={13} />
                  ) : (
                    <PictureInPicture2 size={13} />
                  )}
                </button>
                <button
                  type="button"
                  className="repo-icon-btn"
                  title={
                    desktopAiMode === "floating"
                      ? floatPreMaxBox
                        ? "Restore chat size"
                        : "Enlarge floating chat"
                      : explorerPct <= 36
                      ? "Shrink AI panel"
                      : "Enlarge AI panel"
                  }
                  aria-label={
                    desktopAiMode === "floating"
                      ? floatPreMaxBox
                        ? "Restore chat size"
                        : "Enlarge floating chat"
                      : explorerPct <= 36
                      ? "Shrink AI panel"
                      : "Enlarge AI panel"
                  }
                  onClick={toggleAiEnlargeShrink}
                >
                  {(desktopAiMode === "floating" ? Boolean(floatPreMaxBox) : explorerPct <= 36) ? (
                    <Minimize2 size={13} />
                  ) : (
                    <Maximize2 size={13} />
                  )}
                </button>
                <button
                  type="button"
                  className="repo-icon-btn"
                  title="Minimize chat"
                  aria-label="Minimize Repository AI chat"
                  onClick={minimizeDesktopAi}
                >
                  <Minus size={13} />
                </button>
              </div>
            </div>
            <div
              className="repo-sheet-grabber"
              title="Swipe up for full screen, swipe down to close"
              aria-label="Drag Repository AI pop-up"
              {...repoAiSheet.grabberProps}
            >
              <span className="repo-sheet-grabber-pill" aria-hidden="true" />
            </div>
            <div className="repo-mobile-ai-head">
              <div className="repo-mobile-ai-title">
                <MessageSquare size={15} />
                <span>Repository AI Assistant</span>
              </div>
              <div className="repo-mobile-ai-head-actions">
                <button
                  type="button"
                  className="repo-mobile-ai-close"
                  aria-label={
                    repoAiSheet.isFull
                      ? "Shrink AI pop-up"
                      : "Expand AI pop-up full screen"
                  }
                  title={repoAiSheet.isFull ? "Shrink pop-up" : "Full screen"}
                  onClick={() => repoAiSheet.setIsFull((v) => !v)}
                >
                  {repoAiSheet.isFull ? (
                    <Minimize2 size={14} />
                  ) : (
                    <Maximize2 size={14} />
                  )}
                </button>
                <button
                  type="button"
                  className="repo-mobile-ai-close"
                  aria-label="Close Repository AI"
                  onClick={() => setMobileAiOpen(false)}
                >
                  <X size={15} />
                </button>
              </div>
            </div>
            <ChatWorkspace
              userName={userName}
              documents={documents}
              initialScopeDocId="all"
              embeddedInRepo
              onNavigateToInspector={(docId) => {
                const found = documents.find((d) => d.id === docId);
                if (found) handleOpenFile(found);
              }}
              onRefreshDocuments={onRefreshDocuments}
              onUploadFilesToRepo={(files) =>
                onUploadFilesToRepo(files, activeFolder)
              }
              onOpenUploadModal={() => onOpenUploadModal(activeFolder)}
            />
          </div>
        ) : (
          /* FILE OPEN: Real File Viewer + Persistent Bottom Chat Input */
          <div className="repo-editor-shell">
            {/* Slim VS Code Tab Bar (maximizes PDF / document height) */}
            <header className="repo-editor-tabs">
              <div className="repo-editor-tab-left">
                <button
                  type="button"
                  className="repo-icon-btn"
                  onClick={() => setExplorerCollapsed((v) => !v)}
                  title={
                    explorerCollapsed
                      ? "Show Repository Explorer"
                      : "Expand reader (hide Explorer)"
                  }
                  aria-label={
                    explorerCollapsed
                      ? "Show Repository Explorer"
                      : "Hide Repository Explorer"
                  }
                >
                  {explorerCollapsed ? (
                    <PanelLeftOpen size={14} />
                  ) : (
                    <PanelLeftClose size={14} />
                  )}
                </button>

                <div className="repo-editor-tab is-active">
                  {isCsvDocument(openDoc) ? (
                    <FileSpreadsheet size={13} className="repo-tab-ico" />
                  ) : (
                    <FileText size={13} className="repo-tab-ico" />
                  )}
                  <span className="repo-tab-title" title={openDoc.title}>
                    {openDoc.title}
                  </span>
                  <span className="repo-tab-meta">
                    {openDoc.page_count || 1}p ·{" "}
                    {formatBytes(openDoc.file_size_bytes)}
                    {viewerPage ? ` · p.${viewerPage}` : ""}
                  </span>
                  <button
                    type="button"
                    className="repo-tab-close"
                    aria-label="Close file and return to AI Chat"
                    title="Close file (return to main AI Chat)"
                    onClick={handleCloseOpenedFile}
                  >
                    <X size={13} />
                  </button>
                </div>
              </div>

              <div className="repo-editor-tools">
                <div className="repo-view-switcher" role="tablist">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={viewerMode === "preview"}
                    className={`repo-view-pill ${
                      viewerMode === "preview" ? "is-active" : ""
                    }`}
                    onClick={() => setViewerMode("preview")}
                  >
                    <FileText size={12} />
                    <span>File View</span>
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={viewerMode === "text"}
                    className={`repo-view-pill ${
                      viewerMode === "text" ? "is-active" : ""
                    }`}
                    onClick={() => setViewerMode("text")}
                  >
                    <FileCode2 size={12} />
                    <span>Text ({docChunks.length})</span>
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={viewerMode === "tables"}
                    className={`repo-view-pill ${
                      viewerMode === "tables" ? "is-active" : ""
                    }`}
                    onClick={() => setViewerMode("tables")}
                  >
                    <Table2 size={12} />
                    <span>
                      Tables &amp; Info ({docDetail?.extracted_tables?.length ?? openDoc.table_count ?? 0})
                    </span>
                  </button>
                </div>

                <a
                  href={`/api/proxy/documents/${encodeURIComponent(
                    openDoc.id
                  )}/file`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="repo-editor-link-btn"
                  title="Open raw file in new tab"
                >
                  <ExternalLink size={13} />
                </a>
                <a
                  href={`/api/proxy/documents/${encodeURIComponent(
                    openDoc.id
                  )}/file`}
                  download={openDoc.original_filename || openDoc.title}
                  className="repo-editor-link-btn"
                  title="Download file"
                >
                  <Download size={13} />
                </a>
                <button
                  type="button"
                  className="repo-editor-close-main"
                  onClick={handleCloseOpenedFile}
                  title="Close file & return to AI Chat"
                >
                  <X size={14} />
                  <span>Close</span>
                </button>
              </div>
            </header>

            {/* Real Rendered Document Surface */}
            <div className="repo-viewer-canvas">
              {viewerMode === "preview" ? (
                isPdfDocument(openDoc) ? (
                  <iframe
                    key={`${openDoc.id}-p-${viewerPage ?? 1}`}
                    src={`/api/proxy/documents/${encodeURIComponent(
                      openDoc.id
                    )}/file#toolbar=1&navpanes=0&view=FitH${
                      viewerPage ? `&page=${viewerPage}` : ""
                    }`}
                    title={openDoc.title}
                    className="repo-pdf-iframe"
                  />
                ) : isCsvDocument(openDoc) && csvRows.length > 0 ? (
                  <div className="repo-sheet-scroll">
                    <table className="repo-sheet-table">
                      <thead>
                        <tr>
                          <th className="repo-sheet-rownum">#</th>
                          {csvRows[0].map((cell, ci) => (
                            <th key={ci}>{cell || `Col ${ci + 1}`}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {csvRows.slice(1).map((row, ri) => (
                          <tr key={ri}>
                            <td className="repo-sheet-rownum">{ri + 1}</td>
                            {csvRows[0].map((_, ci) => (
                              <td key={ci}>{row[ci] ?? ""}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : rawTextPreview !== null ? (
                  <div className="repo-code-scroll">
                    {rawTextPreview.split("\n").map((line, idx) => (
                      <div key={idx} className="repo-code-line">
                        <span className="repo-code-ln">{idx + 1}</span>
                        <span className="repo-code-txt">{line || " "}</span>
                      </div>
                    ))}
                  </div>
                ) : loadingPreviewMeta ? (
                  <div className="repo-viewer-loading">
                    <Loader2 size={20} className="db-spin" />
                    <span>Loading document preview...</span>
                  </div>
                ) : (
                  <div className="repo-code-scroll">
                    {docChunks.length > 0 ? (
                      docChunks.map((ch) => (
                        <div key={ch.id} className="repo-chunk-block">
                          <span className="repo-chunk-page">
                            Page {ch.page_number}
                          </span>
                          <p>{ch.text_content || ch.content}</p>
                        </div>
                      ))
                    ) : (
                      <div className="repo-viewer-loading">
                        <p>
                          {openDoc.summary ||
                            "Indexed file ready. Ask a question in the input below."}
                        </p>
                      </div>
                    )}
                  </div>
                )
              ) : viewerMode === "text" ? (
                <div className="repo-code-scroll">
                  {loadingPreviewMeta && docChunks.length === 0 ? (
                    <div className="repo-viewer-loading">
                      <Loader2 size={20} className="db-spin" />
                      <span>Loading extracted text passages...</span>
                    </div>
                  ) : docChunks.length > 0 ? (
                    docChunks.map((ch) => (
                      <div key={ch.id} className="repo-chunk-block">
                        <span className="repo-chunk-page">
                          Page {ch.page_number} · Chunk #{ch.chunk_index + 1}
                        </span>
                        <p>{ch.text_content || ch.content}</p>
                      </div>
                    ))
                  ) : (
                    <div className="repo-viewer-loading">
                      <span>No text chunks extracted yet for this document.</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="repo-info-scroll">
                  <div className="repo-info-summary-box">
                    <h4>Document Summary</h4>
                    <p>
                      {docDetail?.summary ||
                        openDoc.summary ||
                        "Indexed inside workspace Repository."}
                    </p>
                  </div>

                  {docDetail?.extracted_metrics &&
                    docDetail.extracted_metrics.length > 0 && (
                      <div className="repo-info-section">
                        <h4>
                          Verified Metrics ({docDetail.extracted_metrics.length})
                        </h4>
                        <div className="repo-info-metrics-grid">
                          {docDetail.extracted_metrics
                            .slice(0, 12)
                            .map((m, idx) => (
                              <div key={m.id || idx} className="repo-metric-card">
                                <span>{m.metric_name || "Metric"}</span>
                                <strong>
                                  {String(m.metric_value ?? "")}{" "}
                                  {m.unit || ""}
                                </strong>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}

                  {docDetail?.extracted_tables &&
                    docDetail.extracted_tables.length > 0 && (
                      <div className="repo-info-section">
                        <h4>
                          Extracted Tables ({docDetail.extracted_tables.length})
                        </h4>
                        {docDetail.extracted_tables.slice(0, 5).map((tbl, i) => (
                          <div key={tbl.id || i} className="repo-table-card">
                            <div className="repo-table-card-head">
                              <strong>
                                {tbl.table_name || `Table ${i + 1}`}
                              </strong>
                              {tbl.page_number && (
                                <span>Page {tbl.page_number}</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                </div>
              )}

              {/* Floating Collapsible Inline Answer Sheet Above Bottom Input */}
              {inlinePanelVisible && inlineTurn && (
                <div
                  className="repo-inline-answer-sheet"
                  style={{ maxHeight: `${inlineAnswerHeight}px` }}
                >
                  <div
                    className="repo-inline-resize-bar"
                    onPointerDown={handleInlineResizePointerDown}
                    title="Drag up or down to resize answer box"
                    aria-hidden="true"
                  >
                    <span className="repo-inline-resize-pill" />
                  </div>
                  <div className="repo-inline-answer-head">
                    <div className="repo-inline-answer-q">
                      <ThinkingOrbStage
                        state={inlineTurn.orbState}
                        size={18}
                        showLabel={false}
                      />
                      <strong>{inlineTurn.question}</strong>
                    </div>
                    <div className="repo-desktop-ai-actions">
                      <button
                        type="button"
                        className="repo-inline-answer-close"
                        aria-label={
                          inlineAnswerHeight >= 420
                            ? "Shrink answer panel"
                            : "Enlarge answer panel"
                        }
                        title={
                          inlineAnswerHeight >= 420
                            ? "Shrink answer"
                            : "Enlarge answer"
                        }
                        onClick={() =>
                          setInlineAnswerHeight((h) => (h >= 420 ? 280 : 460))
                        }
                      >
                        {inlineAnswerHeight >= 420 ? (
                          <Minimize2 size={11} />
                        ) : (
                          <Maximize2 size={11} />
                        )}
                      </button>
                      <button
                        type="button"
                        className="repo-inline-answer-close"
                        aria-label="Minimize inline answer"
                        title="Minimize answer"
                        onClick={() => setInlinePanelVisible(false)}
                      >
                        <Minus size={12} />
                      </button>
                    </div>
                  </div>

                  <div className="repo-inline-answer-body">
                    {inlineTurn.error ? (
                      <p className="repo-inline-answer-err">{inlineTurn.error}</p>
                    ) : inlineTurn.answer ? (
                      <p className="repo-inline-answer-txt">
                        {inlineTurn.answer.replace(/\[cite:[a-zA-Z0-9_-]+\]/g, "")}
                      </p>
                    ) : (
                      <p className="repo-inline-answer-status">
                        {inlineTurn.statusLabel}
                      </p>
                    )}

                    {inlineTurn.citations.length > 0 && (
                      <div className="repo-inline-cites">
                        {inlineTurn.citations.slice(0, 5).map((cit, idx) => (
                          <button
                            key={`${cit.chunk_id}-${idx}`}
                            type="button"
                            className="repo-inline-cite-btn"
                            onClick={() => {
                              setViewerMode("preview");
                              setViewerPage(cit.page_number || 1);
                            }}
                            title={`Jump to page ${cit.page_number}`}
                          >
                            Page {cit.page_number}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Persistent Bottom Chat Input While Viewing File (Minimizable) */}
            {inlineDockMinimized ? (
              <div className="repo-bottom-chat-minimized">
                {inlineTurn && !inlinePanelVisible && (
                  <button
                    type="button"
                    className="repo-restore-answer-pill"
                    onClick={() => {
                      setInlineDockMinimized(false);
                      setInlinePanelVisible(true);
                    }}
                  >
                    <MessageSquare size={12} />
                    <span>Show last AI answer</span>
                  </button>
                )}
                <button
                  type="button"
                  className="repo-restore-answer-pill"
                  onClick={() => setInlineDockMinimized(false)}
                >
                  <MessageSquare size={12} />
                  <span>Ask AI about this file</span>
                  <Maximize2 size={11} />
                </button>
              </div>
            ) : (
              <div className="repo-bottom-chat-dock">
                <div className="repo-bottom-chat-top">
                  {inlineTurn && !inlinePanelVisible ? (
                    <button
                      type="button"
                      className="repo-restore-answer-pill"
                      onClick={() => setInlinePanelVisible(true)}
                    >
                      <MessageSquare size={12} />
                      <span>Show last AI answer for this file</span>
                    </button>
                  ) : (
                    <span className="repo-bottom-chat-label">
                      <MessageSquare size={11} />
                      <span>Ask about {openDoc.title}</span>
                    </span>
                  )}
                  <button
                    type="button"
                    className="repo-inline-dock-min-btn"
                    onClick={() => setInlineDockMinimized(true)}
                    title="Minimize bottom chat bar"
                    aria-label="Minimize bottom chat bar"
                  >
                    <Minus size={12} />
                  </button>
                </div>
                <ChatComposer
                  value={inlineInput}
                  onChange={setInlineInput}
                  onSubmit={() => void handleSubmitInlineChat()}
                  onStopStreaming={() => inlineAbortRef.current?.abort()}
                  thinkingEnabled={inlineThinking}
                  onToggleThinking={setInlineThinking}
                  attachments={inlineAttachments}
                  onSelectFiles={handleInlineUploadFiles}
                  onRemoveAttachment={(id) =>
                    setInlineAttachments((prev) =>
                      prev.filter((a) => a.localId !== id)
                    )
                  }
                  repositoryDocs={documents}
                  onOpenUploadModal={() => onOpenUploadModal(activeFolder)}
                  isStreaming={inlineStreaming}
                  autoFocus={false}
                  compact
                  placeholder={`Ask anything about "${openDoc.title}"...`}
                />
              </div>
            )}
          </div>
        )}
      </section>

      {/* Clean Modal for New Folder & Rename/Move File */}
      <RepositoryItemDialog
        mode={itemDialogMode}
        initialName={
          itemDialogMode === "edit-doc" && editingDoc ? editingDoc.title : ""
        }
        initialFolder={
          itemDialogMode === "edit-doc" && editingDoc
            ? localFolderMap[editingDoc.id] ||
              normalizeFolderName(editingDoc.category)
            : activeFolder
        }
        availableFolders={allFolderNames}
        busy={dialogSaving}
        onCancel={() => {
          setItemDialogMode(null);
          setEditingDoc(null);
        }}
        onSubmit={async ({ name, folder }) => {
          setDialogSaving(true);
          try {
            if (itemDialogMode === "create-folder") {
              if (!customFolders.includes(name)) {
                persistFolders([...customFolders, name]);
              }
              setExpandedFolders((prev) => ({ ...prev, [name]: true }));
              setActiveFolder(name);
            } else if (itemDialogMode === "edit-doc" && editingDoc) {
              await onUpdateDocumentMeta(editingDoc.id, {
                title: name,
                category: folder,
              });
              await assignDocFolder(editingDoc.id, folder);
            }
          } finally {
            setDialogSaving(false);
            setItemDialogMode(null);
            setEditingDoc(null);
          }
        }}
      />
    </div>
  );
}
