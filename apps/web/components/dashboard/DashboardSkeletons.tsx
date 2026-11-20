"use client";

import type { CSSProperties } from "react";
import type { DashboardSectionId } from "./types";

const NAV_ROWS: Array<{ id: DashboardSectionId; width: string }> = [
  { id: "homes", width: "56px" },
  { id: "chat", width: "44px" },
  { id: "repository", width: "86px" },
  { id: "analytics", width: "74px" },
  { id: "layers", width: "112px" },
];

const KPI_WIDTHS = ["58%", "66%", "52%", "62%"];

const TREND_BAR_HEIGHTS = [36, 48, 42, 64, 58, 78, 72, 92, 84, 96, 88, 94];

const HBAR_WIDTHS = ["86%", "72%", "58%", "44%"];

const REPO_TREE_ITEMS: Array<{ level: number; width: string; meta?: string }> = [
  { level: 0, width: "118px" },
  { level: 1, width: "168px", meta: "14p" },
  { level: 1, width: "142px", meta: "8p" },
  { level: 0, width: "104px" },
  { level: 1, width: "184px", meta: "22p" },
  { level: 1, width: "152px", meta: "11p" },
  { level: 1, width: "136px", meta: "6p" },
  { level: 0, width: "126px" },
  { level: 1, width: "162px", meta: "19p" },
];

const GRAPH_NODE_CARDS: Array<{
  left: string;
  top: string;
  accent: string;
  isHub?: boolean;
}> = [
  { left: "50%", top: "48%", accent: "#e85a24", isHub: true },
  { left: "24%", top: "30%", accent: "#2c6b58" },
  { left: "76%", top: "28%", accent: "#b5b726" },
  { left: "26%", top: "71%", accent: "#706d65" },
  { left: "74%", top: "70%", accent: "#e85a24" },
];

const GRAPH_EDGE_PILLS: Array<{ left: string; top: string }> = [
  { left: "37%", top: "39%" },
  { left: "63%", top: "38%" },
  { left: "38%", top: "60%" },
  { left: "62%", top: "59%" },
];

export function WorkspacePieSkeleton() {
  return (
    <div className="db-skel-donut-wrap" aria-hidden="true">
      <div className="db-skel-donut-ring">
        <div className="db-skel-donut-hole" />
      </div>
      <div className="db-skel-donut-legend">
        <span className="db-skel-block db-skel-line--md" />
        <span className="db-skel-block db-skel-line--sm" />
        <span className="db-skel-block db-skel-line--sm" />
      </div>
    </div>
  );
}

export function HeroChartSkeleton() {
  return (
    <div className="db-skel-chart" aria-hidden="true">
      <div className="db-skel-chart-head">
        <span className="db-skel-block db-skel-line--lg" />
        <span className="db-skel-block db-skel-line--sm" />
      </div>
      <div className="db-skel-chart-bars">
        {TREND_BAR_HEIGHTS.map((height, index) => (
          <span
            key={index}
            className="db-skel-block db-skel-chart-bar"
            style={{ height: `${height}%` }}
          />
        ))}
      </div>
    </div>
  );
}

export function ExecutiveHomeSkeleton() {
  return (
    <div className="db-skel-ex" aria-hidden="true">
      <div className="db-skel-ex-strip">
        <div className="db-skel-ex-strip-left">
          <span className="db-skel-block db-skel-dot" />
          <span className="db-skel-block db-skel-line--md" />
        </div>
        <div className="db-skel-ex-strip-actions">
          <span className="db-skel-block db-skel-btn-sm" />
          <span className="db-skel-block db-skel-btn-sm" />
          <span className="db-skel-block db-skel-btn-md" />
        </div>
      </div>

      <div className="db-skel-ex-kpi-row">
        {KPI_WIDTHS.map((width, index) => (
          <div key={index} className="db-skel-ex-kpi-card">
            <div className="db-skel-ex-kpi-top">
              <span className="db-skel-block db-skel-line--sm" style={{ width }} />
              <span className="db-skel-block db-skel-icon-box" />
            </div>
            <div className="db-skel-ex-kpi-mid">
              <span className="db-skel-block db-skel-kpi-num" />
              <div className="db-skel-ex-spark">
                <span className="db-skel-block" style={{ height: "42%" }} />
                <span className="db-skel-block" style={{ height: "68%" }} />
                <span className="db-skel-block" style={{ height: "54%" }} />
                <span className="db-skel-block" style={{ height: "88%" }} />
                <span className="db-skel-block" style={{ height: "76%" }} />
              </div>
            </div>
            <span className="db-skel-block db-skel-line--md" />
          </div>
        ))}
      </div>

      <div className="db-skel-ex-grid">
        <div className="db-skel-card db-skel-ex-span-8">
          <div className="db-skel-ex-card-head">
            <div className="db-skel-ex-card-titles">
              <span className="db-skel-block db-skel-line--lg" />
              <span className="db-skel-block db-skel-line--sm" />
            </div>
            <div className="db-skel-ex-legend-row">
              <span className="db-skel-block db-skel-pill-sm" />
              <span className="db-skel-block db-skel-pill-sm" />
            </div>
          </div>
          <div className="db-skel-chart-bars db-skel-chart-bars--tall">
            {TREND_BAR_HEIGHTS.map((height, index) => (
              <span
                key={index}
                className="db-skel-block db-skel-chart-bar"
                style={{ height: `${height}%` }}
              />
            ))}
          </div>
        </div>

        <div className="db-skel-card db-skel-ex-span-4">
          <div className="db-skel-ex-card-head">
            <div className="db-skel-ex-card-titles">
              <span className="db-skel-block db-skel-line--md" />
              <span className="db-skel-block db-skel-line--sm" />
            </div>
          </div>
          <WorkspacePieSkeleton />
        </div>

        <div className="db-skel-card db-skel-ex-span-6">
          <div className="db-skel-ex-card-head">
            <div className="db-skel-ex-card-titles">
              <span className="db-skel-block db-skel-line--md" />
              <span className="db-skel-block db-skel-line--sm" />
            </div>
          </div>
          <div className="db-skel-hbars">
            {HBAR_WIDTHS.map((width, index) => (
              <div key={index} className="db-skel-hbar-row">
                <span className="db-skel-block db-skel-hbar-label" />
                <div className="db-skel-hbar-track">
                  <span className="db-skel-block db-skel-hbar-fill" style={{ width }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="db-skel-card db-skel-ex-span-6">
          <div className="db-skel-ex-card-head">
            <div className="db-skel-ex-card-titles">
              <span className="db-skel-block db-skel-line--md" />
              <span className="db-skel-block db-skel-line--sm" />
            </div>
          </div>
          <div className="db-skel-table">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="db-skel-table-row">
                <span className="db-skel-block db-skel-icon-sm" />
                <span className="db-skel-block db-skel-line--lg" />
                <span className="db-skel-block db-skel-pill-sm" />
                <span className="db-skel-block db-skel-line--sm" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function ChatWorkspaceSkeleton() {
  return (
    <div className="db-skel-chat" aria-hidden="true">
      <div className="db-skel-chat-topbar">
        <span className="db-skel-block db-skel-pill-lg" />
        <div className="db-skel-chat-top-actions">
          <span className="db-skel-block db-skel-btn-sm" />
          <span className="db-skel-block db-skel-btn-sm" />
          <span className="db-skel-block db-skel-btn-sm" />
        </div>
      </div>

      <div className="db-skel-chat-stage">
        <span className="db-skel-block db-skel-orb" />
        <span className="db-skel-block db-skel-chat-kicker" />
        <span className="db-skel-block db-skel-chat-title" />
        <span className="db-skel-block db-skel-chat-sub" />

        <div className="db-skel-chat-composer">
          <span className="db-skel-block db-skel-composer-circle" />
          <span className="db-skel-block db-skel-composer-line" />
          <span className="db-skel-block db-skel-composer-send" />
        </div>

        <div className="db-skel-chat-starters">
          <span className="db-skel-block db-skel-pill-lg" />
          <span className="db-skel-block db-skel-pill-lg" />
          <span className="db-skel-block db-skel-pill-md" />
        </div>
      </div>
    </div>
  );
}

export function RepositoryIdeSkeleton() {
  return (
    <div className="db-skel-repo" aria-hidden="true">
      <div className="db-skel-repo-explorer">
        <div className="db-skel-repo-exp-head">
          <span className="db-skel-block db-skel-line--sm" />
          <div className="db-skel-repo-exp-icons">
            <span className="db-skel-block db-skel-icon-box" />
            <span className="db-skel-block db-skel-icon-box" />
            <span className="db-skel-block db-skel-icon-box" />
          </div>
        </div>

        <div className="db-skel-repo-search">
          <span className="db-skel-block db-skel-input-bar" />
        </div>

        <div className="db-skel-repo-tree">
          {REPO_TREE_ITEMS.map((item, index) => (
            <div
              key={index}
              className="db-skel-repo-row"
              style={{ paddingLeft: `${10 + item.level * 18}px` } as CSSProperties}
            >
              <span className="db-skel-block db-skel-icon-sm" />
              <span
                className="db-skel-block db-skel-repo-label"
                style={{ width: item.width }}
              />
              {item.meta ? (
                <span className="db-skel-block db-skel-repo-meta" />
              ) : null}
            </div>
          ))}
        </div>
      </div>

      <div className="db-skel-repo-divider" />

      <div className="db-skel-repo-ai">
        <div className="db-skel-repo-ai-head">
          <span className="db-skel-block db-skel-line--sm" />
          <div className="db-skel-repo-exp-icons">
            <span className="db-skel-block db-skel-btn-sm" />
            <span className="db-skel-block db-skel-icon-box" />
          </div>
        </div>

        <div className="db-skel-repo-ai-body">
          <span className="db-skel-block db-skel-pill-md" />
          <span className="db-skel-block db-skel-orb db-skel-orb--sm" />
          <span className="db-skel-block db-skel-line--lg" />
          <span className="db-skel-block db-skel-line--md" />
          <div className="db-skel-chat-composer db-skel-chat-composer--compact">
            <span className="db-skel-block db-skel-composer-circle" />
            <span className="db-skel-block db-skel-composer-line" />
            <span className="db-skel-block db-skel-composer-send" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function AnalyticsWorkspaceSkeleton() {
  return (
    <div className="db-skel-analytics" aria-hidden="true">
      <div className="db-skel-an-header">
        <span className="db-skel-block db-skel-pill-md" />
        <span className="db-skel-block db-skel-an-title" />
        <span className="db-skel-block db-skel-an-sub" />
      </div>

      <div className="db-skel-an-modes">
        {Array.from({ length: 2 }).map((_, index) => (
          <div key={index} className="db-skel-card db-skel-an-mode-card">
            <span className="db-skel-block db-skel-icon-box" />
            <span className="db-skel-block db-skel-line--md" />
            <span className="db-skel-block db-skel-line--full" />
            <span className="db-skel-block db-skel-line--lg" />
          </div>
        ))}
      </div>

      <div className="db-skel-card db-skel-an-picker">
        <div className="db-skel-an-picker-bar">
          <div className="db-skel-an-folders">
            <span className="db-skel-block db-skel-pill-sm" />
            <span className="db-skel-block db-skel-pill-md" />
            <span className="db-skel-block db-skel-pill-md" />
          </div>
          <span className="db-skel-block db-skel-search-pill" />
        </div>

        <div className="db-skel-an-file-grid">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="db-skel-an-file-card">
              <div className="db-skel-an-file-top">
                <span className="db-skel-block db-skel-icon-sm" />
                <span className="db-skel-block db-skel-pill-sm" />
              </div>
              <span className="db-skel-block db-skel-line--lg" />
              <span className="db-skel-block db-skel-line--sm" />
            </div>
          ))}
        </div>
      </div>

      <div className="db-skel-an-footer">
        <span className="db-skel-block db-skel-an-input" />
        <span className="db-skel-block db-skel-btn-lg" />
      </div>
    </div>
  );
}

export function GraphCanvasSkeleton() {
  return (
    <div className="db-skel-graph" aria-hidden="true">
      <div className="db-skel-graph-hud-top">
        <div className="db-skel-graph-island">
          <span className="db-skel-block db-skel-icon-box" />
          <div className="db-skel-graph-title-meta">
            <span className="db-skel-block db-skel-graph-title-bar" />
            <span className="db-skel-block db-skel-graph-sub-bar" />
          </div>
          <span className="db-skel-graph-sep" />
          <span className="db-skel-block db-skel-graph-search" />
        </div>

        <div className="db-skel-graph-island db-skel-graph-island--right">
          <span className="db-skel-block db-skel-btn-sm" />
          <span className="db-skel-block db-skel-btn-sm" />
          <span className="db-skel-block db-skel-btn-sm" />
          <span className="db-skel-block db-skel-btn-sm" />
          <span className="db-skel-graph-sep" />
          <span className="db-skel-block db-skel-pill-sm" />
          <span className="db-skel-block db-skel-pill-sm" />
        </div>
      </div>

      <div className="db-skel-graph-stage">
        <svg
          className="db-skel-graph-edges"
          viewBox="0 0 1000 700"
          preserveAspectRatio="none"
        >
          <path
            d="M 240 210 C 350 210, 390 336, 500 336"
            stroke="#dcd6c8"
            strokeWidth="2"
            fill="none"
          />
          <path
            d="M 760 196 C 650 196, 610 336, 500 336"
            stroke="#dcd6c8"
            strokeWidth="2"
            fill="none"
          />
          <path
            d="M 260 497 C 365 497, 395 336, 500 336"
            stroke="#dcd6c8"
            strokeWidth="2"
            fill="none"
          />
          <path
            d="M 740 490 C 640 490, 605 336, 500 336"
            stroke="#dcd6c8"
            strokeWidth="2"
            fill="none"
          />
        </svg>

        {GRAPH_EDGE_PILLS.map((pill, index) => (
          <div
            key={index}
            className="db-skel-graph-edge-pill"
            style={{ left: pill.left, top: pill.top }}
          >
            <span className="db-skel-block db-skel-dot" />
            <span className="db-skel-block db-skel-graph-edge-txt" />
          </div>
        ))}

        {GRAPH_NODE_CARDS.map((node, index) => (
          <div
            key={index}
            className={`db-skel-graph-node ${node.isHub ? "is-hub" : ""}`}
            style={{ left: node.left, top: node.top }}
          >
            <div
              className="db-skel-graph-node-accent"
              style={{ background: node.accent }}
            />
            <div className="db-skel-graph-node-body">
              <div className="db-skel-graph-node-head">
                <div className="db-skel-graph-node-cat">
                  <span className="db-skel-block db-skel-graph-node-ico" />
                  <span className="db-skel-block db-skel-graph-cat-txt" />
                </div>
                <span className="db-skel-block db-skel-graph-ext" />
              </div>
              <span className="db-skel-block db-skel-line--lg" />
              <span className="db-skel-block db-skel-line--full" />
              <div className="db-skel-graph-node-topics">
                <span className="db-skel-block db-skel-pill-sm" />
                <span className="db-skel-block db-skel-pill-sm" />
              </div>
            </div>
            <div className="db-skel-graph-node-footer">
              <span className="db-skel-block db-skel-graph-meta" />
              <span className="db-skel-block db-skel-pill-sm" />
            </div>
          </div>
        ))}
      </div>

      <div className="db-skel-graph-dock">
        <span className="db-skel-block db-skel-icon-box" />
        <span className="db-skel-block db-skel-icon-box" />
        <span className="db-skel-graph-sep" />
        <span className="db-skel-block db-skel-icon-box" />
        <span className="db-skel-block db-skel-pill-sm" />
        <span className="db-skel-block db-skel-icon-box" />
        <span className="db-skel-block db-skel-pill-sm" />
        <span className="db-skel-block db-skel-pill-sm" />
      </div>
    </div>
  );
}

export function SidebarBootSkeleton({
  activeSection = "homes",
}: {
  activeSection?: DashboardSectionId;
}) {
  return (
    <aside className="db-sidebar db-skel-sidebar-shell" aria-hidden="true">
      <div className="db-skel-sb-brand">
        <span className="db-skel-block db-skel-sb-mark" />
        <span className="db-skel-block db-skel-line--md" />
      </div>

      <span className="db-skel-block db-skel-sb-upload" />
      <span className="db-skel-block db-skel-sb-search" />

      <div className="db-skel-sb-nav">
        {NAV_ROWS.map((item) => {
          const isActive =
            item.id === activeSection ||
            (activeSection === "synthesis" && item.id === "layers") ||
            (activeSection === "studio" && item.id === "homes");
          return (
            <div
              key={item.id}
              className={`db-skel-sb-nav-item ${isActive ? "is-active" : ""}`}
            >
              <span className="db-skel-block db-skel-icon-sm" />
              <span
                className="db-skel-block db-skel-sb-label"
                style={{ width: item.width }}
              />
            </div>
          );
        })}
      </div>

      <div className="db-skel-sb-footer">
        <div className="db-skel-sb-quota">
          <div className="db-skel-sb-quota-head">
            <span className="db-skel-block db-skel-line--sm" />
            <span className="db-skel-block db-skel-pill-sm" />
          </div>
          <span className="db-skel-block db-skel-sb-track" />
          <span className="db-skel-block db-skel-line--md" />
        </div>
        <div className="db-skel-sb-user">
          <span className="db-skel-block db-skel-composer-circle" />
          <div className="db-skel-sb-user-meta">
            <span className="db-skel-block db-skel-line--md" />
            <span className="db-skel-block db-skel-line--sm" />
          </div>
        </div>
      </div>
    </aside>
  );
}

function renderSectionBody(section: DashboardSectionId) {
  switch (section) {
    case "chat":
      return <ChatWorkspaceSkeleton />;
    case "repository":
      return <RepositoryIdeSkeleton />;
    case "analytics":
      return <AnalyticsWorkspaceSkeleton />;
    case "layers":
    case "synthesis":
      return <GraphCanvasSkeleton />;
    case "homes":
    case "studio":
    default:
      return <ExecutiveHomeSkeleton />;
  }
}

export function DashboardBootSkeleton({
  section = "homes",
}: {
  section?: DashboardSectionId;
}) {
  const isFullBleedCanvas = section === "layers" || section === "synthesis";

  if (isFullBleedCanvas) {
    return (
      <>
        <SidebarBootSkeleton activeSection={section} />
        <GraphCanvasSkeleton />
      </>
    );
  }

  return (
    <>
      <SidebarBootSkeleton activeSection={section} />
      <div className="db-main-canvas">
        <header className="db-skel-main-header" aria-hidden="true">
          <div className="db-skel-header-left">
            <span className="db-skel-block db-skel-line--sm" />
            <span className="db-skel-block db-skel-header-title" />
          </div>
          <div className="db-skel-header-right">
            <span className="db-skel-block db-skel-search-pill" />
            <span className="db-skel-block db-skel-icon-box" />
            <span className="db-skel-block db-skel-btn-sm" />
          </div>
        </header>

        <div className="db-workspace-body">{renderSectionBody(section)}</div>
      </div>
    </>
  );
}
