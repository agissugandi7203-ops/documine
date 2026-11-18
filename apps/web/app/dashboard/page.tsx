"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getCurrentUser, signOut, type AuthUser } from "@/lib/supabase";
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
import { LayerPanel } from "@/components/dashboard/LayerPanel";
import { MainCanvas } from "@/components/dashboard/MainCanvas";
import { PreviewPanel } from "@/components/dashboard/PreviewPanel";
import { Sidebar } from "@/components/dashboard/Sidebar";
import {
  INITIAL_DECK_LAYERS,
  INITIAL_PREVIEW_ITEMS,
  NAV_ITEMS,
  type DashboardSectionId,
  type DeckLayerItem,
  type PreviewLayerItem,
} from "@/components/dashboard/types";
import "@/app/dashboard/dashboard.css";

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
  const [backendOnline, setBackendOnline] = useState(false);
  const [loadingData, setLoadingData] = useState(false);

  // Navigation: default first page is "homes"
  const [activeNavId, setActiveNavId] = useState<DashboardSectionId>("homes");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [statusIndicatorActive, setStatusIndicatorActive] = useState(false);
  const [avatarActive, setAvatarActive] = useState(false);

  // Workspace data
  const [summary, setSummary] = useState<DocumentsSummary | null>(null);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [activeDocStatus, setActiveDocStatus] =
    useState<DocumentStatusInfo | null>(null);

  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

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

  // Right-bottom 3 draggable fanned playing cards
  const [deckLayers, setDeckLayers] =
    useState<DeckLayerItem[]>(INITIAL_DECK_LAYERS);
  const [selectedLayerIndex, setSelectedLayerIndex] = useState<number>(2);

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
    try {
      const [sessionRes, summaryRes, docsRes, analyticsRes, relRes] =
        await Promise.allSettled([
          dashboardApi.getSession(),
          dashboardApi.getDocumentsSummary(),
          dashboardApi.listDocuments(),
          dashboardApi.getAnalyticsDashboard(),
          dashboardApi.getRelationships(),
        ]);

      let anySucceeded = false;

      if (sessionRes.status === "fulfilled") {
        anySucceeded = true;
        setWorkspaceName(
          sessionRes.value.workspace?.name || "Personal Workspace"
        );
      }

      if (summaryRes.status === "fulfilled") {
        anySucceeded = true;
        setSummary(summaryRes.value);
      }

      if (docsRes.status === "fulfilled") {
        anySucceeded = true;
        const docs = docsRes.value;
        setDocuments(docs);
        setSelectedDocId((prev) =>
          prev && docs.some((d) => d.id === prev) ? prev : docs[0]?.id ?? null
        );

        if (docs.length > 0) {
          setPreviewItems((prev) =>
            prev.map((card, idx) => {
              const doc = docs[idx];
              if (!doc) return card;
              return {
                ...card,
                title: doc.title,
                subtitle: `${doc.page_count}p · ${
                  doc.category || "general"
                }`,
                metric: (doc.status || doc.processing_status).toUpperCase(),
                docId: doc.id,
              };
            })
          );
        }
      }

      if (analyticsRes.status === "fulfilled") {
        anySucceeded = true;
        setAnalytics(analyticsRes.value);
      }

      if (relRes.status === "fulfilled") {
        anySucceeded = true;
        setRelationships(relRes.value);
      }

      setBackendOnline(anySucceeded);
      setStatusIndicatorActive(anySucceeded);
    } catch {
      setBackendOnline(false);
      setStatusIndicatorActive(false);
    } finally {
      setLoadingData(false);
    }
  }, []);

  const verifySession = useCallback(async (isActive: () => boolean) => {
    try {
      const currentUser = await getCurrentUser();
      if (!isActive()) return;
      if (!currentUser) {
        setUser(null);
        setAuthStatus("unauthenticated");
        window.location.replace("/login");
        return;
      }
      setUser(currentUser);
      setAuthStatus("authenticated");
    } catch {
      if (!isActive()) return;
      setUser(null);
      setAuthStatus("unauthenticated");
      window.location.replace("/login");
    }
  }, []);

  useEffect(() => {
    let active = true;
    const isActive = () => active;

    void verifySession(isActive);

    const handlePageShow = () => {
      void verifySession(isActive);
    };
    window.addEventListener("pageshow", handlePageShow);

    return () => {
      active = false;
      window.removeEventListener("pageshow", handlePageShow);
    };
  }, [verifySession]);

  useEffect(() => {
    if (authStatus === "authenticated") {
      void loadWorkspaceData();
    }
  }, [authStatus, loadWorkspaceData]);

  useEffect(() => {
    if (authStatus !== "authenticated" || !selectedDocId || !backendOnline) {
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
  }, [authStatus, selectedDocId, backendOnline, documents, loadWorkspaceData]);

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

  const handleSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    setAvatarActive(false);
    try {
      await signOut();
      setUser(null);
      setAuthStatus("unauthenticated");
      window.location.assign("/login");
    } catch {
      setSigningOut(false);
    }
  };

  const handleUploadFile = async (file: File) => {
    setUploading(true);
    setUploadError(null);
    try {
      const uploaded = await dashboardApi.uploadDocument(file);
      setSelectedDocId(uploaded.id);
      await loadWorkspaceData();
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : "Failed to upload document."
      );
    } finally {
      setUploading(false);
    }
  };

  const handleFileInputChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await handleUploadFile(file);
    e.target.value = "";
  };

  const handleDeleteDoc = async (docId: string) => {
    try {
      await dashboardApi.deleteDocument(docId);
      await loadWorkspaceData();
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : "Unable to delete document."
      );
    }
  };

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

  const handleRunSynthesis = async (docIds: string[]) => {
    if (docIds.length < 2) return;
    setSynthesisLoading(true);
    try {
      const res = await dashboardApi.compareSynthesis(docIds);
      setSynthesisResult(res);
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
      const updated = await dashboardApi.getRelationships();
      setRelationships(updated);
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : "Failed to recompute graph."
      );
    }
  };

  const handleGenerateQuiz = async (docId: string) => {
    setQuizLoading(true);
    try {
      const res = await dashboardApi.generateQuiz(docId, 3);
      setQuizResult(res);
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

  const handleReorderLayers = (fromIndex: number, toIndex: number) => {
    setDeckLayers((prev) => {
      const movedId = prev[selectedLayerIndex]?.id;
      const reordered = reorderList(prev, fromIndex, toIndex);
      if (movedId) {
        const nextIdx = reordered.findIndex((item) => item.id === movedId);
        if (nextIdx !== -1) setSelectedLayerIndex(nextIdx);
      }
      return reordered;
    });
  };

  const handleSelectPreview = (index: number) => {
    setSelectedPreviewIndex(index);
    const chosen = previewItems[index];
    if (chosen?.docId) {
      setSelectedDocId(chosen.docId);
    }
  };

  const handleSelectLayer = (index: number) => {
    setSelectedLayerIndex(index);
    const chosen = deckLayers[index];
    if (chosen?.sectionTarget) {
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

  const displayName = user?.username || user?.email?.split("@")[0] || "Creator";

  if (authStatus === "unauthenticated") {
    return <div className="db-viewport" />;
  }

  return (
    <div className="db-viewport">
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.txt,.md,.csv,.xlsx,.xls,application/pdf"
        className="sr-only"
        onChange={handleFileInputChange}
      />

      <DashboardFrame sidebarCollapsed={sidebarCollapsed}>
        <Sidebar
          activeNavId={activeNavId}
          collapsed={sidebarCollapsed}
          statusIndicatorActive={statusIndicatorActive}
          avatarActive={avatarActive}
          user={user}
          workspaceName={workspaceName}
          signingOut={signingOut}
          onSelectNav={setActiveNavId}
          onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
          onBrandClick={() => setActiveNavId("homes")}
          onToggleStatusIndicator={() => {
            void loadWorkspaceData();
          }}
          onAvatarClick={() => setAvatarActive((prev) => !prev)}
          onCloseAvatarMenu={() => setAvatarActive(false)}
          onRefreshData={() => {
            void loadWorkspaceData();
          }}
          onSignOut={handleSignOut}
        />

        <MainCanvas
          activeNavId={activeNavId}
          userName={displayName}
          workspaceName={workspaceName}
          backendOnline={backendOnline}
          loadingData={loadingData}
          uploading={uploading}
          uploadError={uploadError}
          summary={summary}
          documents={documents}
          selectedDocId={selectedDocId}
          analytics={analytics}
          generatedWidget={generatedWidget}
          analyticsGenerating={analyticsGenerating}
          searchQuery={searchQuery}
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
          onTriggerUpload={() => fileInputRef.current?.click()}
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

        <aside className="db-right-column" aria-label="Search, Progress and Card Decks">
          <PreviewPanel
            items={previewItems}
            selectedIndex={selectedPreviewIndex}
            searchQuery={searchQuery}
            searchLoading={searchLoading}
            searchResultCount={searchResultCount}
            onSearchChange={setSearchQuery}
            onSearchClear={() => setSearchQuery("")}
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
            onSelectStep={(step) => {
              const target = NAV_ITEMS[step];
              if (target) setActiveNavId(target.id);
            }}
            onRefreshProgress={() => {
              void loadWorkspaceData();
            }}
          />

          <LayerPanel
            layers={deckLayers}
            selectedLayerIndex={selectedLayerIndex}
            onSelectLayer={handleSelectLayer}
            onReorderLayers={handleReorderLayers}
            onCycleLayer={() =>
              setSelectedLayerIndex((prev) => (prev + 1) % deckLayers.length)
            }
          />
        </aside>
      </DashboardFrame>
    </div>
  );
}
