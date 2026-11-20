"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import "@/app/dashboard/dashboard.css";
import { getCurrentUser, signOut, type AuthUser } from "@/lib/supabase";
import {
  dashboardApi,
  type DocumentItem,
  type DocumentsSummary,
  type RelationshipGraphResponse,
} from "@/lib/dashboard-api";
import { DashboardFrame } from "@/components/dashboard/DashboardFrame";
import {
  GraphCanvasSkeleton,
  SidebarBootSkeleton,
} from "@/components/dashboard/DashboardSkeletons";
import { Sidebar } from "@/components/dashboard/Sidebar";
import type { DashboardSectionId } from "@/components/dashboard/types";

const GraphCanvas = dynamic(
  () => import("@/components/dashboard/GraphCanvas").then((m) => m.GraphCanvas),
  { ssr: false, loading: () => <GraphCanvasSkeleton /> }
);

function formatMegabytes(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
  if (mb >= 10) return `${Math.round(mb)} MB`;
  return `${mb.toFixed(1)} MB`;
}

export default function DashboardGraphPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [authReady, setAuthReady] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [graphTheme, setGraphTheme] = useState<"light" | "dark">("light");
  const [avatarActive, setAvatarActive] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const [workspaceName, setWorkspaceName] = useState("Personal Workspace");
  const [workspaceId, setWorkspaceId] = useState<string | undefined>(undefined);
  const [summary, setSummary] = useState<DocumentsSummary | null>(null);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [relationships, setRelationships] =
    useState<RelationshipGraphResponse | null>(null);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const loadGraphData = useCallback(async () => {
    try {
      const [sessionRes, summaryRes, docsRes, relRes] = await Promise.allSettled([
        dashboardApi.getSession(),
        dashboardApi.getDocumentsSummary(),
        dashboardApi.listDocuments(),
        dashboardApi.getRelationships(0.0),
      ]);

      if (sessionRes.status === "fulfilled") {
        setWorkspaceName(sessionRes.value.workspace.name || "Personal Workspace");
        setWorkspaceId(sessionRes.value.workspace.id);
      }
      if (summaryRes.status === "fulfilled") {
        setSummary(summaryRes.value);
      }
      if (docsRes.status === "fulfilled") {
        setDocuments(docsRes.value);
      }
      if (relRes.status === "fulfilled") {
        setRelationships(relRes.value);
      }
    } catch {
      // keep existing UI state gracefully
    }
  }, []);

  useEffect(() => {
    let active = true;
    const verify = async () => {
      try {
        const currentUser = await getCurrentUser();
        if (!active) return;
        if (!currentUser) {
          window.location.replace("/login");
          return;
        }
        setUser(currentUser);
        setAuthReady(true);
        await loadGraphData();
      } catch {
        if (!active) return;
        window.location.replace("/login");
      }
    };
    void verify();
    return () => {
      active = false;
    };
  }, [loadGraphData]);

  const handleUploadFile = useCallback(
    async (file: File) => {
      setUploading(true);
      setUploadError(null);
      try {
        const uploaded = await dashboardApi.uploadDocument(file);
        setSelectedDocId(uploaded.id);
        await loadGraphData();
      } catch (err) {
        setUploadError(
          err instanceof Error ? err.message : "Failed to upload document."
        );
      } finally {
        setUploading(false);
      }
    },
    [loadGraphData]
  );

  const handleFileInputChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await handleUploadFile(file);
    e.target.value = "";
  };

  const handleRecompute = useCallback(async () => {
    setUploadError(null);
    await dashboardApi.recomputeRelationships();
    const updated = await dashboardApi.getRelationships(0.0);
    setRelationships(updated);
  }, []);

  const handleDismiss = useCallback(async (relationshipId: string) => {
    await dashboardApi.dismissRelationship(relationshipId);
    const updated = await dashboardApi.getRelationships(0.0);
    setRelationships(updated);
  }, []);

  const handleSelectNav = useCallback(
    (section: DashboardSectionId) => {
      if (section === "layers") return;
      router.push(`/dashboard?section=${encodeURIComponent(section)}`);
    },
    [router]
  );

  const handleSignOut = useCallback(async () => {
    setSigningOut(true);
    try {
      await signOut();
      window.location.replace("/login");
    } finally {
      setSigningOut(false);
    }
  }, []);

  const { storageProgress, storageLabel } = useMemo(() => {
    const usedBytes = summary?.total_storage_bytes ?? 0;
    const limitBytes = summary?.storage_limit_bytes || 1024 * 1024 * 1024;
    return {
      storageProgress: Math.min(100, (usedBytes / limitBytes) * 100),
      storageLabel: `${formatMegabytes(usedBytes)} / ${formatMegabytes(
        limitBytes
      )}`,
    };
  }, [summary]);

  if (!authReady) {
    return (
      <div className="db-viewport db-viewport--graph-full">
        <DashboardFrame>
          <SidebarBootSkeleton activeSection="layers" />
          <GraphCanvasSkeleton />
        </DashboardFrame>
      </div>
    );
  }

  return (
    <div
      className={`db-viewport db-viewport--graph-full ${
        sidebarCollapsed ? "db-viewport--sidebar-collapsed" : ""
      }`}
      data-graph-theme={graphTheme}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.txt,.md,.csv,.xlsx,.xls,application/pdf"
        className="sr-only"
        onChange={handleFileInputChange}
      />

      <DashboardFrame>
        <Sidebar
          activeNavId="layers"
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
          signingOut={signingOut}
          onSelectNav={handleSelectNav}
          onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
          onBrandClick={() => router.push("/dashboard")}
          onTriggerUpload={() => fileInputRef.current?.click()}
          onAvatarClick={() => setAvatarActive((prev) => !prev)}
          onCloseAvatarMenu={() => setAvatarActive(false)}
          onRefreshData={() => {
            void loadGraphData();
          }}
          onSignOut={() => {
            void handleSignOut();
          }}
        />

        <GraphCanvas
          workspaceName={workspaceName}
          workspaceId={workspaceId}
          documents={documents}
          relationships={relationships}
          selectedDocId={selectedDocId}
          uploading={uploading}
          uploadError={uploadError}
          onBack={() => router.push("/dashboard")}
          onSelectNav={handleSelectNav}
          onSelectDoc={setSelectedDocId}
          onTriggerUpload={() => fileInputRef.current?.click()}
          onDropFile={(file) => {
            void handleUploadFile(file);
          }}
          onRecomputeRelationships={handleRecompute}
          onDismissRelationship={handleDismiss}
          onOpenInChat={(docId) =>
            router.push(`/dashboard?section=chat&doc=${encodeURIComponent(docId)}`)
          }
          onOpenInRepository={(docId) =>
            router.push(
              `/dashboard?section=repository&doc=${encodeURIComponent(docId)}`
            )
          }
          onCompareInSynthesis={(docIds) =>
            router.push(
              `/dashboard?section=synthesis&docs=${encodeURIComponent(
                docIds.join(",")
              )}`
            )
          }
          onThemeChange={setGraphTheme}
        />
      </DashboardFrame>
    </div>
  );
}
