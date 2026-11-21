"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Layers, PanelRightOpen, PieChart, Upload } from "lucide-react";
import {
  getCurrentSessionDetails,
  refreshAuthSession,
  signOut,
  type AuthUser,
} from "@/lib/supabase";
import {
  dashboardApi,
  type AnalyticsDashboardResponse,
  type AnalyticsWidget,
  type AudioBriefingResponse,
  type DocumentItem,
  type DocumentsSummary,
  type DocumentStatusInfo,
  type QuizResponse,
  type RelationshipGraphResponse,
  type SearchMatch,
  type SynthesisResponse,
} from "@/lib/dashboard-api";
import { BottomControls } from "@/components/dashboard/BottomControls";
import { DashboardFrame } from "@/components/dashboard/DashboardFrame";
import {
  DashboardBootSkeleton,
  GraphCanvasSkeleton,
  WorkspacePieSkeleton,
} from "@/components/dashboard/DashboardSkeletons";
import { MainCanvas } from "@/components/dashboard/MainCanvas";
import { PreviewPanel } from "@/components/dashboard/PreviewPanel";
import { Sidebar } from "@/components/dashboard/Sidebar";
import {
  DeleteConfirmDialog,
  FloatingUploadTracker,
  SignOutConfirmDialog,
  UploadModalDialog,
  type UploadTaskItem,
} from "@/components/dashboard/WorkspaceDialogs";

const GraphCanvas = dynamic(
  () => import("@/components/dashboard/GraphCanvas").then((m) => m.GraphCanvas),
  { ssr: false, loading: () => <GraphCanvasSkeleton /> }
);

const WorkspacePieChart = dynamic(
  () =>
    import("@/components/dashboard/WorkspacePieChart").then(
      (m) => m.WorkspacePieChart
    ),
  { ssr: false, loading: () => <WorkspacePieSkeleton /> }
);
import {
  INITIAL_PREVIEW_ITEMS,
  NAV_ITEMS,
  type DashboardSectionId,
  type PreviewLayerItem,
  type WorkspaceNotification,
} from "@/components/dashboard/types";
import "@/app/dashboard/dashboard.css";

const ALLOWED_EXTENSIONS = [".pdf", ".txt", ".md", ".csv", ".xlsx", ".xls"];
const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

function validateClientFile(file: File): string | null {
  const lower = file.name.toLowerCase();
  const validExt = ALLOWED_EXTENSIONS.some((ext) => lower.endsWith(ext));
  if (!validExt) {
    return `Unsupported format "${file.name}". Upload PDF, CSV, Excel, TXT, or Markdown.`;
  }
  if (file.size === 0) {
    return `"${file.name}" is empty (0 bytes).`;
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return `"${file.name}" exceeds the 50 MB workspace limit.`;
  }
  return null;
}

function formatStageLabel(stage?: string): string {
  if (!stage) return "Indexing document...";
  const clean = stage.replace(/_/g, " ").trim();
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

function reorderList<T>(list: T[], fromIndex: number, toIndex: number): T[] {
  const next = [...list];
  const [moved] = next.splice(fromIndex, 1);
  if (moved === undefined) return list;
  next.splice(toIndex, 0, moved);
  return next;
}

function formatMegabytes(bytes: number): string {
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(0)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DashboardPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [user, setUser] = useState<AuthUser | null>(null);
  const [authStatus, setAuthStatus] = useState<
    "checking" | "authenticated" | "unauthenticated"
  >("checking");
  const [signingOut, setSigningOut] = useState(false);

  const [workspaceName, setWorkspaceName] = useState("Personal Workspace");
  const [workspaceId, setWorkspaceId] = useState<string | undefined>(undefined);
  const [backendOnline, setBackendOnline] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [initialDocsLoaded, setInitialDocsLoaded] = useState(false);

  // Navigation: default first page is "homes"; restored from URL/sessionStorage before persisting
  const [activeNavId, setActiveNavId] = useState<DashboardSectionId>("homes");
  const [navRestored, setNavRestored] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [graphTheme, setGraphTheme] = useState<"light" | "dark">("light");
  const [rightRailCollapsed, setRightRailCollapsed] = useState(false);
  const [previewMinimized, setPreviewMinimized] = useState(false);
  const [progressMinimized, setProgressMinimized] = useState(false);
  const [statusIndicatorActive, setStatusIndicatorActive] = useState(false);
  const [avatarActive, setAvatarActive] = useState(false);

  // Unified Workspace Dialogs & Upload Queue State
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadTargetFolder, setUploadTargetFolder] = useState<string | null>(
    null
  );
  const [uploadTasks, setUploadTasks] = useState<UploadTaskItem[]>([]);
  const [globalFileDragOver, setGlobalFileDragOver] = useState(false);

  const [deleteTargetDoc, setDeleteTargetDoc] = useState<DocumentItem | null>(
    null
  );
  const [deletingDoc, setDeletingDoc] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [signOutConfirmOpen, setSignOutConfirmOpen] = useState(false);
  const [openRepoDocRequest, setOpenRepoDocRequest] = useState<{
    docId: string;
    nonce: number;
  } | null>(null);

  // Workspace data
  const [summary, setSummary] = useState<DocumentsSummary | null>(null);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [activeDocStatus, setActiveDocStatus] =
    useState<DocumentStatusInfo | null>(null);

  const [uploadError, setUploadError] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<WorkspaceNotification[]>([]);

  const pushNotification = useCallback(
    (entry: {
      title: string;
      detail: string;
      tone?: WorkspaceNotification["tone"];
      targetNav?: DashboardSectionId;
      docId?: string;
    }) => {
      const nowLabel = new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
      setNotifications((prev) => {
        const next: WorkspaceNotification[] = [
          {
            id: `nt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            title: entry.title,
            detail: entry.detail,
            tone: entry.tone || "info",
            timestamp: nowLabel,
            read: false,
            targetNav: entry.targetNav,
            docId: entry.docId,
          },
          ...prev,
        ].slice(0, 20);
        try {
          if (user?.id) {
            window.localStorage.setItem(
              `documind:notifications:${user.id}`,
              JSON.stringify(next)
            );
          }
        } catch {
          // ignore storage quota
        }
        return next;
      });
    },
    [user?.id]
  );

  useEffect(() => {
    if (!user?.id) return;
    try {
      const raw = window.localStorage.getItem(
        `documind:notifications:${user.id}`
      );
      if (raw) {
        const parsed = JSON.parse(raw) as WorkspaceNotification[];
        if (Array.isArray(parsed)) {
          setNotifications(parsed);
        }
      }
    } catch {
      // ignore storage errors
    }
  }, [user?.id]);

  const uploading = useMemo(
    () =>
      uploadTasks.some(
        (t) => t.status === "uploading" || t.status === "processing"
      ),
    [uploadTasks]
  );

  // Search (top-right pill)
  const [searchQuery, setSearchQuery] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchMatches, setSearchMatches] = useState<SearchMatch[]>([]);
  const [searchResultCount, setSearchResultCount] = useState<number | null>(
    null
  );

  // Right-top 3 draggable playing cards
  const [previewItems, setPreviewItems] = useState<PreviewLayerItem[]>(
    INITIAL_PREVIEW_ITEMS
  );
  const [selectedPreviewIndex, setSelectedPreviewIndex] = useState<number>(2);

  // Analytics, Synthesis, Relationships, Studio
  const [analytics, setAnalytics] =
    useState<AnalyticsDashboardResponse | null>(null);
  const [generatedWidget, setGeneratedWidget] =
    useState<AnalyticsWidget | null>(null);
  const [analyticsGenerating, setAnalyticsGenerating] = useState(false);

  const [relationships, setRelationships] =
    useState<RelationshipGraphResponse | null>(null);
  const [synthesisResult, setSynthesisResult] =
    useState<SynthesisResponse | null>(null);
  const [synthesisLoading, setSynthesisLoading] = useState(false);

  const [quizResult, setQuizResult] = useState<QuizResponse | null>(null);
  const [quizLoading, setQuizLoading] = useState(false);

  const [audioResult, setAudioResult] =
    useState<AudioBriefingResponse | null>(null);
  const [audioLoading, setAudioLoading] = useState(false);

  const loadWorkspaceData = useCallback(async () => {
    setLoadingData(true);
    let anySucceeded = false;

    const sessionTask = dashboardApi.getSession().then((res) => {
      anySucceeded = true;
      setWorkspaceName(res.workspace?.name || "Personal Workspace");
      setWorkspaceId(res.workspace?.id);
    });

    const summaryTask = dashboardApi.getDocumentsSummary().then((res) => {
      anySucceeded = true;
      setSummary(res);
    });

    const docsTask = dashboardApi.listDocuments().then((docs) => {
      anySucceeded = true;
      setDocuments(docs);
      setSelectedDocId((prev) =>
        prev && docs.some((d) => d.id === prev) ? prev : docs[0]?.id ?? null
      );
    });

    const analyticsTask = dashboardApi.getAnalyticsDashboard().then((res) => {
      anySucceeded = true;
      setAnalytics(res);
    });

    const relTask = dashboardApi.getRelationships(0.0).then((res) => {
      anySucceeded = true;
      setRelationships(res);
    });

    try {
      await Promise.allSettled([sessionTask, summaryTask, docsTask]);
      setInitialDocsLoaded(true);
      await Promise.allSettled([analyticsTask, relTask]);
      setBackendOnline(anySucceeded);
      setStatusIndicatorActive(anySucceeded);
    } catch {
      setInitialDocsLoaded(true);
      setBackendOnline(anySucceeded);
      setStatusIndicatorActive(anySucceeded);
    } finally {
      setLoadingData(false);
    }
  }, []);

  const [sessionDeadlines, setSessionDeadlines] = useState<{
    expiresAt: number | null;
    sessionExpiresAt: number | null;
  }>({ expiresAt: null, sessionExpiresAt: null });

  const verifySession = useCallback(async (isActive: () => boolean) => {
    try {
      const details = await getCurrentSessionDetails();
      if (!isActive()) return;
      if (!details) {
        setUser(null);
        setAuthStatus("unauthenticated");
        window.location.replace("/login?reason=session_expired");
        return;
      }
      setUser(details.user);
      setSessionDeadlines({
        expiresAt: details.expiresAt,
        sessionExpiresAt: details.sessionExpiresAt,
      });
      setAuthStatus("authenticated");
    } catch {
      if (!isActive()) return;
      setUser(null);
      setAuthStatus("unauthenticated");
      window.location.replace("/login?reason=session_expired");
    }
  }, []);

  useEffect(() => {
    let active = true;
    const isActive = () => active;

    void verifySession(isActive);

    const handlePageShow = () => {
      void verifySession(isActive);
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void verifySession(isActive);
      }
    };
    window.addEventListener("pageshow", handlePageShow);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      active = false;
      window.removeEventListener("pageshow", handlePageShow);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [verifySession]);

  // Proactive access token refresh before expiry + strict absolute session cutoff timer
  useEffect(() => {
    if (authStatus !== "authenticated") return;
    const { expiresAt, sessionExpiresAt } = sessionDeadlines;
    const nowSec = Math.floor(Date.now() / 1000);
    const timers: number[] = [];

    if (sessionExpiresAt && sessionExpiresAt > 0) {
      const absRemainingMs = (sessionExpiresAt - nowSec) * 1000;
      if (absRemainingMs <= 0) {
        setAuthStatus("unauthenticated");
        window.location.replace("/login?reason=session_expired");
        return;
      }
      const boundedAbsDelay = Math.min(absRemainingMs, 2_147_483_000);
      timers.push(
        window.setTimeout(() => {
          void verifySession(() => true);
        }, boundedAbsDelay)
      );
    }

    if (expiresAt && expiresAt > 0) {
      // Refresh proactively ~90s before the short-lived JWT expires (only if within absolute deadline)
      const refreshAtMs = Math.max(10_000, (expiresAt - 90 - nowSec) * 1000);
      const canExtendBeforeCutoff =
        !sessionExpiresAt || expiresAt - 90 < sessionExpiresAt;
      if (canExtendBeforeCutoff && refreshAtMs < 2_147_483_000) {
        timers.push(
          window.setTimeout(async () => {
            const refreshed = await refreshAuthSession(false);
            if (!refreshed.authenticated) {
              setAuthStatus("unauthenticated");
              window.location.replace("/login?reason=session_expired");
              return;
            }
            setSessionDeadlines({
              expiresAt: refreshed.expiresAt,
              sessionExpiresAt: refreshed.sessionExpiresAt,
            });
          }, refreshAtMs)
        );
      }
    }

    return () => {
      for (const id of timers) {
        window.clearTimeout(id);
      }
    };
  }, [authStatus, sessionDeadlines, verifySession]);

  useEffect(() => {
    const totalDocs = summary?.total_documents ?? documents.length;
    const readyDocs =
      summary?.ready_count ??
      documents.filter((d) =>
        ["ready", "partial_ready", "completed"].includes(
          d.status || d.processing_status
        )
      ).length;
    const totalPages =
      analytics?.corpus_telemetry?.total_pages ??
      documents.reduce((acc, doc) => acc + (doc.page_count || 0), 0);
    const totalMetrics = analytics?.corpus_telemetry?.total_verified_metrics ?? 0;
    const totalTables = analytics?.corpus_telemetry?.total_tables ?? 0;
    const widgetCount = analytics?.widgets?.length ?? 0;
    const totalLinks =
      relationships?.edge_count ??
      analytics?.corpus_telemetry?.total_relationships ??
      0;

    setPreviewItems((prev) =>
      prev.map((card) => {
        if (card.id === "preview-1") {
          return {
            ...card,
            statValue: `${totalDocs} Docs`,
            statDetail:
              totalDocs > 0
                ? `${readyDocs} ready · ${totalPages} pages`
                : "Start your first document",
            docId: documents[0]?.id,
            sectionTarget: "repository",
          };
        }
        if (card.id === "preview-2") {
          return {
            ...card,
            statValue: `${totalMetrics} Metrics`,
            statDetail: `${totalTables} tables · ${widgetCount} charts`,
            sectionTarget: "analytics",
          };
        }
        if (card.id === "preview-3") {
          return {
            ...card,
            statValue: `${totalLinks} Links`,
            statDetail:
              totalDocs > 0
                ? `${readyDocs} docs · Quiz & Audio`
                : "Quiz, Audio & Graph",
            sectionTarget: "studio",
          };
        }
        return card;
      })
    );
  }, [summary, documents, analytics, relationships]);

  useEffect(() => {
    if (authStatus === "authenticated") {
      void loadWorkspaceData();
    }
  }, [authStatus, loadWorkspaceData]);

  useEffect(() => {
    if (
      authStatus !== "authenticated" ||
      !selectedDocId ||
      !backendOnline ||
      activeNavId === "layers" ||
      selectedDocId.startsWith("demo-")
    ) {
      return;
    }

    let cancelled = false;
    const pollStatus = async () => {
      try {
        const st = await dashboardApi.getDocumentStatus(selectedDocId);
        if (!cancelled) {
          setActiveDocStatus(st);
        }
      } catch {
        // Ignore silent status check errors
      }
    };

    void pollStatus();
    const doc = documents.find((d) => d.id === selectedDocId);
    const rawState = doc?.status || doc?.processing_status || "";
    if (!["queued", "pending", "processing"].includes(rawState)) {
      return () => {
        cancelled = true;
      };
    }

    const interval = window.setInterval(() => {
      void pollStatus();
      void loadWorkspaceData();
    }, 3000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [
    authStatus,
    selectedDocId,
    backendOnline,
    activeNavId,
    documents,
    loadWorkspaceData,
  ]);

  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      setSearchMatches([]);
      setSearchResultCount(null);
      setSearchLoading(false);
      return;
    }

    let cancelled = false;
    setSearchLoading(true);

    const timer = window.setTimeout(async () => {
      try {
        const res = await dashboardApi.search(trimmed, 6);
        if (cancelled) return;
        setSearchMatches(res.results || []);
        setSearchResultCount(res.total_matches ?? res.results.length);
      } catch {
        if (cancelled) return;
        const localCount = documents.filter((d) =>
          d.title.toLowerCase().includes(trimmed.toLowerCase())
        ).length;
        setSearchMatches([]);
        setSearchResultCount(localCount);
      } finally {
        if (!cancelled) setSearchLoading(false);
      }
    }, 320);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [searchQuery, documents]);

  const focusWorkspaceSearch = useCallback(() => {
    const input = document.querySelector<HTMLInputElement>(
      ".db-global-search-input"
    );
    input?.focus();
    input?.select();
  }, []);

  // Tick elapsed time and slow detection while any upload or indexing task is active
  useEffect(() => {
    const hasActive = uploadTasks.some(
      (t) => t.status === "uploading" || t.status === "processing"
    );
    if (!hasActive) return;

    const timer = window.setInterval(() => {
      const now = Date.now();
      setUploadTasks((prev) =>
        prev.map((task) => {
          if (task.status !== "uploading" && task.status !== "processing") {
            return task;
          }
          const elapsedSec = Math.max(
            0,
            Math.floor((now - task.startedAt) / 1000)
          );
          const isSlow =
            (task.status === "uploading" && elapsedSec >= 8) ||
            (task.status === "processing" && elapsedSec >= 15);
          return { ...task, elapsedSec, isSlow };
        })
      );
    }, 1000);

    return () => window.clearInterval(timer);
  }, [uploadTasks]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sec = params.get("section");
    const savedSec =
      typeof window !== "undefined"
        ? window.sessionStorage.getItem("documind:activeNavId")
        : null;
    const candidate = sec || savedSec;
    if (
      candidate &&
      (NAV_ITEMS.some((item) => item.id === candidate) || candidate === "layers")
    ) {
      setActiveNavId(candidate as DashboardSectionId);
    }
    setNavRestored(true);
    const doc = params.get("doc");
    if (doc) {
      setSelectedDocId(doc);
    }
  }, []);

  useEffect(() => {
    if (!navRestored) return;
    try {
      window.sessionStorage.setItem("documind:activeNavId", activeNavId);
      const url = new URL(window.location.href);
      if (activeNavId === "homes") {
        url.searchParams.delete("section");
      } else {
        url.searchParams.set("section", activeNavId);
      }
      window.history.replaceState(null, "", url.pathname + url.search + url.hash);
    } catch {
      // Ignore storage/history restrictions
    }
  }, [activeNavId, navRestored]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        if (activeNavId === "layers") return;
        e.preventDefault();
        focusWorkspaceSearch();
        return;
      }

      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      if (
        tag === "input" ||
        tag === "textarea" ||
        tag === "select" ||
        target?.isContentEditable
      ) {
        return;
      }

      const key = e.key.toLowerCase();
      if (activeNavId !== "layers") {
        if (key === "u") {
          e.preventDefault();
          setUploadTargetFolder(null);
          setUploadModalOpen(true);
          return;
        }
        if (key === "c") {
          e.preventDefault();
          setActiveNavId("chat");
          return;
        }
      }

      const num = Number(key);
      if (num >= 1 && num <= NAV_ITEMS.length) {
        const targetNav = NAV_ITEMS[num - 1];
        if (targetNav) {
          e.preventDefault();
          setActiveNavId(targetNav.id);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [focusWorkspaceSearch, activeNavId]);

  const handleSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    setAvatarActive(false);
    try {
      await signOut();
      try {
        window.sessionStorage.removeItem("documind:activeNavId");
      } catch {
        // Ignore storage restrictions
      }
      setSignOutConfirmOpen(false);
      setUser(null);
      setAuthStatus("unauthenticated");
      window.location.assign("/login");
    } catch {
      setSigningOut(false);
    }
  };

  const openUploadDialog = useCallback((targetFolder?: string) => {
    setUploadTargetFolder(targetFolder || null);
    setUploadModalOpen(true);
  }, []);

  const runSingleUploadTask = useCallback(
    async (
      localId: string,
      file: File,
      options?: { forceReplace?: boolean; targetFolder?: string }
    ): Promise<{ filename: string; doc?: DocumentItem; error?: string }> => {
      const validationError = validateClientFile(file);
      if (validationError) {
        setUploadTasks((prev) =>
          prev.map((t) =>
            t.localId === localId
              ? {
                  ...t,
                  status: "error",
                  stageLabel: "Validation failed",
                  errorMessage: validationError,
                }
              : t
          )
        );
        return { filename: file.name, error: validationError };
      }

      setUploadError(null);
      try {
        let uploaded = await dashboardApi.uploadDocumentWithProgress(file, {
          forceReplace: options?.forceReplace,
          onProgress: (pct) => {
            setUploadTasks((prev) =>
              prev.map((t) =>
                t.localId === localId && t.status === "uploading"
                  ? {
                      ...t,
                      progressPct: pct,
                      stageLabel:
                        pct >= 98
                          ? "Finalizing upload..."
                          : `Uploading file (${pct}%)...`,
                    }
                  : t
              )
            );
          },
        });

        if (uploaded.is_duplicate && !options?.forceReplace) {
          setUploadTasks((prev) =>
            prev.map((t) =>
              t.localId === localId
                ? {
                    ...t,
                    status: "duplicate",
                    progressPct: 100,
                    stageLabel: "Duplicate file detected",
                    doc: uploaded,
                  }
                : t
            )
          );
          setSelectedDocId(uploaded.id);
          await loadWorkspaceData();
          return { filename: file.name, doc: uploaded };
        }

        if (
          options?.targetFolder &&
          options.targetFolder.trim() &&
          options.targetFolder.trim().toLowerCase() !== "general"
        ) {
          try {
            uploaded = await dashboardApi.updateDocument(uploaded.id, {
              category: options.targetFolder.trim(),
            });
          } catch {
            // non-fatal metadata update
          }
        }

        setSelectedDocId(uploaded.id);
        setDocuments((prev) => [
          uploaded,
          ...prev.filter((d) => d.id !== uploaded.id),
        ]);
        void loadWorkspaceData();

        const initialStatus = (
          uploaded.status ||
          uploaded.processing_status ||
          "ready"
        ).toLowerCase();

        if (["queued", "pending", "processing"].includes(initialStatus)) {
          setUploadTasks((prev) =>
            prev.map((t) =>
              t.localId === localId
                ? {
                    ...t,
                    status: "processing",
                    progressPct: Math.max(t.progressPct, 35),
                    stageLabel: "Indexing into Repository...",
                    doc: uploaded,
                  }
                : t
            )
          );

          for (let attempt = 0; attempt < 90; attempt += 1) {
            await new Promise((r) => window.setTimeout(r, 900));
            try {
              const st = await dashboardApi.getDocumentStatus(uploaded.id);
              const lower = (st.status || "").toLowerCase();
              if (["ready", "partial_ready", "completed"].includes(lower)) {
                setUploadTasks((prev) =>
                  prev.map((t) =>
                    t.localId === localId
                      ? {
                          ...t,
                          status: "ready",
                          progressPct: 100,
                          stageLabel: "Indexed & ready in Repository",
                          doc: uploaded,
                        }
                      : t
                  )
                );
                await loadWorkspaceData();
                pushNotification({
                  title: "Document indexed",
                  detail: `"${uploaded.title || file.name}" is ready for Chat, Analytics & Graph.`,
                  tone: "success",
                  targetNav: "repository",
                  docId: uploaded.id,
                });
                return { filename: file.name, doc: uploaded };
              }
              if (lower === "failed") {
                const msg =
                  st.error_message || "Document processing failed on server.";
                setUploadTasks((prev) =>
                  prev.map((t) =>
                    t.localId === localId
                      ? {
                          ...t,
                          status: "error",
                          stageLabel: "Processing failed",
                          errorMessage: msg,
                        }
                      : t
                  )
                );
                await loadWorkspaceData();
                pushNotification({
                  title: "Processing failed",
                  detail: `${file.name}: ${msg}`,
                  tone: "error",
                  targetNav: "repository",
                  docId: uploaded.id,
                });
                return { filename: file.name, error: msg };
              }
              setUploadTasks((prev) =>
                prev.map((t) =>
                  t.localId === localId
                    ? {
                        ...t,
                        progressPct: Math.max(35, st.progress_pct || 45),
                        stageLabel: formatStageLabel(st.current_stage),
                      }
                    : t
                )
              );
            } catch {
              // continue polling briefly
            }
          }
        }

        setUploadTasks((prev) =>
          prev.map((t) =>
            t.localId === localId
              ? {
                  ...t,
                  status: "ready",
                  progressPct: 100,
                  stageLabel: "Saved & indexed in Repository",
                  doc: uploaded,
                }
              : t
          )
        );
        return { filename: file.name, doc: uploaded };
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Failed to upload document.";
        setUploadTasks((prev) =>
          prev.map((t) =>
            t.localId === localId
              ? {
                  ...t,
                  status: "error",
                  stageLabel: "Upload failed",
                  errorMessage: msg,
                }
              : t
          )
        );
        setUploadError(msg);
        return { filename: file.name, error: msg };
      }
    },
    [loadWorkspaceData]
  );

  const enqueueUploadFiles = useCallback(
    async (
      files: File[],
      opts?: { targetFolder?: string; openModal?: boolean }
    ) => {
      if (files.length === 0) return [];
      const now = Date.now();
      const target = opts?.targetFolder ?? uploadTargetFolder ?? undefined;

      const createdTasks: UploadTaskItem[] = files.map((file, idx) => ({
        localId: `up-${now}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
        filename: file.name,
        sizeBytes: file.size,
        progressPct: 4,
        stageLabel: "Starting upload...",
        status: "uploading",
        startedAt: now,
        elapsedSec: 0,
        isSlow: false,
        targetFolder: target,
        sourceFile: file,
      }));

      setUploadTasks((prev) => [...createdTasks, ...prev].slice(0, 10));
      if (opts?.openModal !== false) {
        setUploadModalOpen(true);
      }

      const settled = await Promise.all(
        createdTasks.map((task, idx) =>
          runSingleUploadTask(task.localId, files[idx], {
            targetFolder: target,
          })
        )
      );
      return settled;
    },
    [runSingleUploadTask, uploadTargetFolder]
  );

  const handleRetryUploadTask = useCallback(
    (localId: string) => {
      const target = uploadTasks.find((t) => t.localId === localId);
      if (!target?.sourceFile) return;
      const now = Date.now();
      setUploadTasks((prev) =>
        prev.map((t) =>
          t.localId === localId
            ? {
                ...t,
                status: "uploading",
                progressPct: 4,
                stageLabel: "Retrying upload...",
                errorMessage: undefined,
                startedAt: now,
                elapsedSec: 0,
                isSlow: false,
              }
            : t
        )
      );
      void runSingleUploadTask(localId, target.sourceFile, {
        targetFolder: target.targetFolder,
      });
    },
    [uploadTasks, runSingleUploadTask]
  );

  const handleForceReplaceTask = useCallback(
    (localId: string) => {
      const target = uploadTasks.find((t) => t.localId === localId);
      if (!target?.sourceFile) return;
      const now = Date.now();
      setUploadTasks((prev) =>
        prev.map((t) =>
          t.localId === localId
            ? {
                ...t,
                status: "uploading",
                progressPct: 6,
                stageLabel: "Replacing existing document...",
                errorMessage: undefined,
                startedAt: now,
                elapsedSec: 0,
                isSlow: false,
              }
            : t
        )
      );
      void runSingleUploadTask(localId, target.sourceFile, {
        forceReplace: true,
        targetFolder: target.targetFolder,
      });
    },
    [uploadTasks, runSingleUploadTask]
  );

  const handleUploadFile = async (file: File) => {
    await enqueueUploadFiles([file], { openModal: true });
  };

  const handleFileInputChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    e.target.value = "";
    if (files.length === 0) return;
    await enqueueUploadFiles(files, { openModal: true });
  };

  const requestDeleteDoc = useCallback((doc: DocumentItem) => {
    setDeleteError(null);
    setDeleteTargetDoc(doc);
  }, []);

  const handleConfirmDeleteDoc = useCallback(async () => {
    if (!deleteTargetDoc || deletingDoc) return;
    setDeletingDoc(true);
    setDeleteError(null);
    try {
      await dashboardApi.deleteDocument(deleteTargetDoc.id);
      setDeleteTargetDoc(null);
      await loadWorkspaceData();
    } catch (err) {
      setDeleteError(
        err instanceof Error ? err.message : "Unable to delete document."
      );
    } finally {
      setDeletingDoc(false);
    }
  }, [deleteTargetDoc, deletingDoc, loadWorkspaceData]);

  const handleDeleteDoc = async (docId: string) => {
    const found = documents.find((d) => d.id === docId);
    if (found) {
      requestDeleteDoc(found);
      return;
    }
    try {
      await dashboardApi.deleteDocument(docId);
      await loadWorkspaceData();
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : "Unable to delete document."
      );
    }
  };

  const handleUpdateDocumentMeta = useCallback(
    async (
      docId: string,
      payload: { title?: string; category?: string }
    ) => {
      try {
        await dashboardApi.updateDocument(docId, payload);
        await loadWorkspaceData();
      } catch (err) {
        setUploadError(
          err instanceof Error ? err.message : "Failed to update document."
        );
      }
    },
    [loadWorkspaceData]
  );

  const openDocumentInRepository = useCallback((docId: string) => {
    setSelectedDocId(docId);
    setActiveNavId("repository");
    setOpenRepoDocRequest({ docId, nonce: Date.now() });
    setUploadModalOpen(false);
  }, []);

  const handleGenerateWidget = async (
    chartType: "bar" | "line" | "pie",
    prompt: string
  ) => {
    setAnalyticsGenerating(true);
    try {
      const widget = await dashboardApi.generateAnalyticsWidget({
        chart_type: chartType,
        prompt,
        document_id: selectedDocId ?? undefined,
      });
      setGeneratedWidget(widget);
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : "Unable to generate chart."
      );
    } finally {
      setAnalyticsGenerating(false);
    }
  };

  const handleRunSynthesis = async (docIds: string[], focusQuery?: string) => {
    if (docIds.length < 2) return;
    setSynthesisLoading(true);
    try {
      const res = await dashboardApi.compareSynthesis(docIds, focusQuery);
      setSynthesisResult(res);
      pushNotification({
        title: "Cross-document synthesis ready",
        detail: res.synthesis_headline,
        tone: "success",
        targetNav: "synthesis",
      });
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : "Cross-document synthesis failed."
      );
    } finally {
      setSynthesisLoading(false);
    }
  };

  const handleRecomputeRelationships = async () => {
    try {
      await dashboardApi.recomputeRelationships();
      const updated = await dashboardApi.getRelationships(0.0);
      setRelationships(updated);
      pushNotification({
        title: "Graph links updated",
        detail: `${updated.edge_count} relationship(s) mapped across ${updated.node_count} documents.`,
        tone: "info",
        targetNav: "layers",
      });
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : "Failed to recompute graph."
      );
    }
  };

  const handleDismissRelationship = async (relationshipId: string) => {
    try {
      await dashboardApi.dismissRelationship(relationshipId);
      const updated = await dashboardApi.getRelationships(0.0);
      setRelationships(updated);
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : "Failed to dismiss relationship."
      );
    }
  };

  const handleGenerateQuiz = async (docId: string) => {
    setQuizLoading(true);
    try {
      const res = await dashboardApi.generateQuiz(docId, 3);
      setQuizResult(res);
      pushNotification({
        title: "Quiz generated",
        detail: `${res.questions.length} source-backed questions ready in Studio.`,
        tone: "success",
        targetNav: "studio",
        docId,
      });
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : "Failed to generate quiz."
      );
    } finally {
      setQuizLoading(false);
    }
  };

  const handleGenerateAudio = async (docId?: string) => {
    setAudioLoading(true);
    try {
      const res = await dashboardApi.generateAudioBriefing(docId);
      setAudioResult(res);
      pushNotification({
        title: "Audio briefing ready",
        detail: `${res.title} (${res.duration_estimate}) is ready to play in Studio.`,
        tone: "success",
        targetNav: "studio",
        docId,
      });
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : "Failed to generate audio script."
      );
    } finally {
      setAudioLoading(false);
    }
  };

  const handleReorderPreviews = (fromIndex: number, toIndex: number) => {
    setPreviewItems((prev) => {
      const movedId = prev[selectedPreviewIndex]?.id;
      const reordered = reorderList(prev, fromIndex, toIndex);
      if (movedId) {
        const nextIdx = reordered.findIndex((item) => item.id === movedId);
        if (nextIdx !== -1) setSelectedPreviewIndex(nextIdx);
      }
      return reordered;
    });
  };

  const handleSelectPreview = (index: number) => {
    setSelectedPreviewIndex(index);
    const chosen = previewItems[index];
    if (chosen?.docId) {
      setSelectedDocId(chosen.docId);
      setActiveNavId(chosen.sectionTarget || "layers");
    } else if (chosen?.sectionTarget) {
      setActiveNavId(chosen.sectionTarget);
    }
  };

  const activeStep = useMemo(() => {
    const idx = NAV_ITEMS.findIndex((item) => item.id === activeNavId);
    return idx >= 0 ? idx : 0;
  }, [activeNavId]);

  const { ingestionProgress, ingestionLabel, storageProgress, storageLabel } =
    useMemo(() => {
      const total = summary?.total_documents ?? documents.length;
      const ready =
        summary?.ready_count ??
        documents.filter((d) =>
          ["ready", "partial_ready", "completed"].includes(
            d.status || d.processing_status
          )
        ).length;

      let ingPct = total > 0 ? (ready / total) * 100 : 0;
      let ingText =
        total > 0 ? `${ready}/${total} ready` : "Awaiting documents";

      if (
        activeDocStatus &&
        ["queued", "pending", "processing"].includes(activeDocStatus.status)
      ) {
        ingPct = activeDocStatus.progress_pct;
        ingText = activeDocStatus.current_stage.replace(/_/g, " ");
      }

      const usedBytes = summary?.total_storage_bytes ?? 0;
      const limitBytes = summary?.storage_limit_bytes || 1024 * 1024 * 1024;
      const storPct = Math.min(100, (usedBytes / limitBytes) * 100);
      const storText = `${formatMegabytes(usedBytes)} / ${formatMegabytes(
        limitBytes
      )}`;

      return {
        ingestionProgress: ingPct,
        ingestionLabel: ingText,
        storageProgress: storPct,
        storageLabel: storText,
      };
    }, [summary, documents, activeDocStatus]);

  const showRightColumn =
    activeNavId !== "homes" &&
    activeNavId !== "chat" &&
    activeNavId !== "repository" &&
    activeNavId !== "analytics";

  const displayName = user?.username || user?.email?.split("@")[0] || "Creator";

  if (authStatus === "unauthenticated") {
    return <div className="db-viewport" />;
  }

  if (authStatus === "checking" || !navRestored || !initialDocsLoaded) {
    const isGraphBoot =
      activeNavId === "layers" || activeNavId === "synthesis";
    return (
      <div
        className={`db-viewport ${
          isGraphBoot ? "db-viewport--graph-full" : ""
        }`}
      >
        <DashboardFrame>
          <DashboardBootSkeleton section={activeNavId} />
        </DashboardFrame>
      </div>
    );
  }

  return (
    <div
      className={`db-viewport ${
        globalFileDragOver ? "db-viewport--file-dragover" : ""
      } ${activeNavId === "layers" ? "db-viewport--graph-full" : ""} ${
        sidebarCollapsed ? "db-viewport--sidebar-collapsed" : ""
      }`}
      data-graph-theme={activeNavId === "layers" ? graphTheme : undefined}
      onDragOver={(e) => {
        if (
          activeNavId !== "layers" &&
          e.dataTransfer.types.includes("Files")
        ) {
          e.preventDefault();
          if (!globalFileDragOver) setGlobalFileDragOver(true);
        }
      }}
      onDragLeave={(e) => {
        if (e.currentTarget === e.target) {
          setGlobalFileDragOver(false);
        }
      }}
      onDrop={(e) => {
        if (
          activeNavId === "layers" ||
          !e.dataTransfer.files ||
          e.dataTransfer.files.length === 0
        ) {
          return;
        }
        e.preventDefault();
        setGlobalFileDragOver(false);
        void enqueueUploadFiles(Array.from(e.dataTransfer.files), {
          openModal: true,
        });
      }}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,.txt,.md,.csv,.xlsx,.xls,application/pdf"
        className="sr-only"
        onChange={handleFileInputChange}
      />

      {globalFileDragOver && (
        <div className="db-global-drop-overlay" aria-hidden="true">
          <div className="db-global-drop-pill">
            <Upload size={18} />
            <span>Drop files anywhere to upload &amp; index into Repository</span>
          </div>
        </div>
      )}

      <DashboardFrame>
        <Sidebar
          activeNavId={activeNavId}
          collapsed={sidebarCollapsed}
          avatarActive={avatarActive}
          user={user}
          workspaceName={workspaceName}
          totalDocs={summary?.total_documents ?? documents.length}
          readyDocs={
            summary?.ready_count ??
            documents.filter((d) =>
              ["ready", "partial_ready", "completed"].includes(
                d.status || d.processing_status
              )
            ).length
          }
          storageProgress={storageProgress}
          storageLabel={storageLabel}
          notifications={notifications}
          signingOut={signingOut}
          onSelectNav={setActiveNavId}
          onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
          onBrandClick={() => setActiveNavId("homes")}
          onTriggerUpload={() => openUploadDialog()}
          onAvatarClick={() => setAvatarActive((prev) => !prev)}
          onCloseAvatarMenu={() => setAvatarActive(false)}
          onRefreshData={() => {
            void loadWorkspaceData();
          }}
          onSelectNotification={(item) => {
            setNotifications((prev) => {
              const next = prev.map((n) =>
                n.id === item.id ? { ...n, read: true } : n
              );
              try {
                if (user?.id) {
                  window.localStorage.setItem(
                    `documind:notifications:${user.id}`,
                    JSON.stringify(next)
                  );
                }
              } catch {
                // ignore
              }
              return next;
            });
            if (item.docId) {
              setSelectedDocId(item.docId);
            }
            if (item.targetNav) {
              setActiveNavId(item.targetNav);
            }
          }}
          onMarkAllNotificationsRead={() => {
            setNotifications((prev) => {
              const next = prev.map((n) => ({ ...n, read: true }));
              try {
                if (user?.id) {
                  window.localStorage.setItem(
                    `documind:notifications:${user.id}`,
                    JSON.stringify(next)
                  );
                }
              } catch {
                // ignore
              }
              return next;
            });
          }}
          onClearNotifications={() => {
            setNotifications([]);
            try {
              if (user?.id) {
                window.localStorage.removeItem(
                  `documind:notifications:${user.id}`
                );
              }
            } catch {
              // ignore
            }
          }}
          onSignOut={() => {
            setAvatarActive(false);
            setSignOutConfirmOpen(true);
          }}
        />

        {activeNavId === "layers" ? (
          <GraphCanvas
            workspaceName={workspaceName}
            workspaceId={workspaceId}
            documents={documents}
            relationships={relationships}
            selectedDocId={selectedDocId}
            uploading={uploading}
            uploadError={uploadError}
            onBack={() => setActiveNavId("homes")}
            onSelectNav={setActiveNavId}
            onSelectDoc={setSelectedDocId}
            onTriggerUpload={() => openUploadDialog()}
            onDropFile={(file) => {
              void enqueueUploadFiles([file], { openModal: false });
            }}
            onRecomputeRelationships={handleRecomputeRelationships}
            onDismissRelationship={handleDismissRelationship}
            onOpenInChat={(docId) => {
              setSelectedDocId(docId);
              setActiveNavId("chat");
            }}
            onOpenInRepository={(docId) => openDocumentInRepository(docId)}
            onCompareInSynthesis={(docIds) => {
              if (docIds.length >= 2) {
                setActiveNavId("synthesis");
                void handleRunSynthesis(docIds);
              }
            }}
            onThemeChange={setGraphTheme}
          />
        ) : (
          <>
            <MainCanvas
              activeNavId={activeNavId}
              userName={displayName}
              workspaceName={workspaceName}
              workspaceId={workspaceId}
              loadingData={loadingData}
              uploading={uploading}
              uploadError={uploadError}
              summary={summary}
              documents={documents}
              selectedDocId={selectedDocId}
              openRepoDocRequest={openRepoDocRequest}
              analytics={analytics}
              generatedWidget={generatedWidget}
              analyticsGenerating={analyticsGenerating}
              searchQuery={searchQuery}
              searchLoading={searchLoading}
              searchResultCount={searchResultCount}
              searchMatches={searchMatches}
              relationships={relationships}
              synthesisResult={synthesisResult}
              synthesisLoading={synthesisLoading}
              quizResult={quizResult}
              quizLoading={quizLoading}
              audioResult={audioResult}
              audioLoading={audioLoading}
              onSelectNav={setActiveNavId}
              onSelectDoc={setSelectedDocId}
              onOpenSearchResultDoc={openDocumentInRepository}
              onAskDocInChat={(docId) => {
                setSelectedDocId(docId);
                setActiveNavId("chat");
              }}
              onSearchChange={setSearchQuery}
              onSearchClear={() => setSearchQuery("")}
              onTriggerUpload={(folder) => openUploadDialog(folder)}
              onUploadFilesToRepo={(files, folder) =>
                enqueueUploadFiles(files, {
                  targetFolder: folder,
                  openModal: false,
                })
              }
              onRequestDeleteDoc={requestDeleteDoc}
              onUpdateDocumentMeta={handleUpdateDocumentMeta}
              onFocusSearch={focusWorkspaceSearch}
              onDropFile={(file) => {
                void handleUploadFile(file);
              }}
              onDeleteDoc={(docId) => {
                void handleDeleteDoc(docId);
              }}
              onRefreshData={() => {
                void loadWorkspaceData();
              }}
              onGenerateWidget={(chartType, prompt) => {
                void handleGenerateWidget(chartType, prompt);
              }}
              onRunSynthesis={(docIds) => {
                void handleRunSynthesis(docIds);
              }}
              onRecomputeRelationships={() => {
                void handleRecomputeRelationships();
              }}
              onGenerateQuiz={(docId) => {
                void handleGenerateQuiz(docId);
              }}
              onGenerateAudio={(docId) => {
                void handleGenerateAudio(docId);
              }}
              onDropPreviewCardOnCanvas={(idx) => {
                handleSelectPreview(idx);
                setActiveNavId("layers");
              }}
            />

            {showRightColumn && (
              <aside
                className={`db-right-column ${
                  rightRailCollapsed ? "db-right-column--collapsed" : ""
                }`}
                aria-label="Quick Stage, Progress and Pie Distribution"
              >
                {rightRailCollapsed ? (
                  <div className="db-right-collapsed-dock">
                    <button
                      type="button"
                      className="db-right-dock-btn"
                      aria-label="Expand right rail"
                      data-tooltip="Expand"
                      onClick={() => setRightRailCollapsed(false)}
                    >
                      <PanelRightOpen size={16} />
                    </button>

                    <button
                      type="button"
                      className="db-right-dock-btn"
                      aria-label="Open card stage"
                      data-tooltip="Cards"
                      onClick={() => {
                        setRightRailCollapsed(false);
                        setPreviewMinimized(false);
                      }}
                    >
                      <Layers size={15} />
                    </button>

                    <button
                      type="button"
                      className="db-right-dock-btn"
                      aria-label="Show workspace chart"
                      data-tooltip="Pie Mix"
                      onClick={() => setRightRailCollapsed(false)}
                    >
                      <PieChart size={15} />
                    </button>
                  </div>
                ) : (
                  <>
                    <PreviewPanel
                      items={previewItems}
                      selectedIndex={selectedPreviewIndex}
                      minimized={previewMinimized}
                      onToggleMinimize={() =>
                        setPreviewMinimized((prev) => !prev)
                      }
                      onCollapseRail={() => setRightRailCollapsed(true)}
                      onSelectPreview={handleSelectPreview}
                      onReorderPreviews={handleReorderPreviews}
                      onDropPreviewToCanvas={(idx) => {
                        handleSelectPreview(idx);
                        setActiveNavId("layers");
                      }}
                    />

                    <BottomControls
                      activeNavId={activeNavId}
                      ingestionProgress={ingestionProgress}
                      ingestionLabel={ingestionLabel}
                      storageProgress={storageProgress}
                      storageLabel={storageLabel}
                      activeStep={activeStep}
                      minimized={progressMinimized}
                      onToggleMinimize={() =>
                        setProgressMinimized((prev) => !prev)
                      }
                      onSelectStep={(step) => {
                        const target = NAV_ITEMS[step];
                        if (target) setActiveNavId(target.id);
                      }}
                      onRefreshProgress={() => {
                        void loadWorkspaceData();
                      }}
                    />

                    <WorkspacePieChart
                      documents={documents}
                      totalPages={
                        analytics?.corpus_telemetry?.total_pages ??
                        documents.reduce(
                          (acc, d) => acc + (d.page_count || 1),
                          0
                        )
                      }
                      totalTables={
                        analytics?.corpus_telemetry?.total_tables ?? 0
                      }
                      totalMetrics={
                        analytics?.corpus_telemetry?.total_verified_metrics ?? 0
                      }
                      totalRelationships={
                        analytics?.corpus_telemetry?.total_relationships ??
                        relationships?.edge_count ??
                        0
                      }
                      onSelectSection={(sec) => setActiveNavId(sec)}
                    />
                  </>
                )}
              </aside>
            )}
          </>
        )}
      </DashboardFrame>

      {/* Workspace Action & Feedback Dialogs */}
      <UploadModalDialog
        open={uploadModalOpen}
        tasks={uploadTasks}
        targetFolder={uploadTargetFolder}
        onClose={() => setUploadModalOpen(false)}
        onMinimizeToBackground={() => setUploadModalOpen(false)}
        onSelectFiles={(files, folder) => {
          void enqueueUploadFiles(files, {
            targetFolder: folder,
            openModal: true,
          });
        }}
        onRetryTask={handleRetryUploadTask}
        onForceReplaceDuplicate={handleForceReplaceTask}
        onDismissTask={(localId) =>
          setUploadTasks((prev) => prev.filter((t) => t.localId !== localId))
        }
        onOpenDocInRepo={openDocumentInRepository}
        onAskDocInChat={(docId) => {
          setSelectedDocId(docId);
          setUploadModalOpen(false);
          setActiveNavId("chat");
        }}
      />

      <FloatingUploadTracker
        tasks={uploadTasks}
        modalOpen={uploadModalOpen}
        onReopenModal={() => setUploadModalOpen(true)}
        onDismissAllCompleted={() =>
          setUploadTasks((prev) =>
            prev.filter(
              (t) => t.status === "uploading" || t.status === "processing"
            )
          )
        }
      />

      <DeleteConfirmDialog
        doc={deleteTargetDoc}
        deleting={deletingDoc}
        error={deleteError}
        onCancel={() => setDeleteTargetDoc(null)}
        onConfirm={() => {
          void handleConfirmDeleteDoc();
        }}
      />

      <SignOutConfirmDialog
        open={signOutConfirmOpen}
        user={user}
        workspaceName={workspaceName}
        signingOut={signingOut}
        hasActiveUploads={uploading}
        onCancel={() => setSignOutConfirmOpen(false)}
        onConfirm={() => {
          void handleSignOut();
        }}
      />
    </div>
  );
}
