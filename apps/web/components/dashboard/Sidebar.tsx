"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ChevronUp,
  ExternalLink,
  HardDrive,
  Home,
  Loader2,
  LogOut,
  MessageSquare,
  PanelLeftClose,
  PanelLeftOpen,
  RefreshCw,
  Upload,
} from "lucide-react";
import type { AuthUser } from "@/lib/supabase";
import { MobileBottomNav } from "./MobileBottomNav";
import { NavigationItem } from "./NavigationItem";
import {
  PRIMARY_NAV_ITEMS,
  SECONDARY_NAV_ITEMS,
  type DashboardSectionId,
} from "./types";

interface SidebarProps {
  activeNavId: DashboardSectionId;
  collapsed: boolean;
  avatarActive: boolean;
  user: AuthUser | null;
  workspaceName: string;
  totalDocs: number;
  readyDocs: number;
  storageProgress?: number;
  storageLabel?: string;
  signingOut: boolean;
  onSelectNav: (id: DashboardSectionId) => void;
  onToggleCollapse: () => void;
  onBrandClick: () => void;
  onTriggerUpload: () => void;
  onAvatarClick: () => void;
  onCloseAvatarMenu: () => void;
  onRefreshData: () => void;
  onSignOut: () => void;
}

function SidebarNavSvg({ id }: { id: DashboardSectionId }) {
  switch (id) {
    case "homes":
      return (
        <svg className="db-nav-svg" viewBox="0 0 24 24" fill="none">
          <path
            d="M4.5 10.6L11.1 5.1C11.62 4.67 12.38 4.67 12.9 5.1L19.5 10.6V18.2C19.5 19.2 18.7 20 17.7 20H6.3C5.3 20 4.5 19.2 4.5 18.2V10.6Z"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinejoin="round"
          />
          <rect
            x="9.5"
            y="13"
            width="5"
            height="7"
            rx="2.2"
            fill="currentColor"
            fillOpacity="0.2"
            stroke="currentColor"
            strokeWidth="1.6"
          />
        </svg>
      );
    case "chat":
      return (
        <svg className="db-nav-svg" viewBox="0 0 24 24" fill="none">
          <path
            d="M5 6.8C5 5.53 6.03 4.5 7.3 4.5H16.7C17.97 4.5 19 5.53 19 6.8V13.7C19 14.97 17.97 16 16.7 16H11.2L7.3 19.2C6.65 19.73 5.7 19.27 5.7 18.43V16C5.3 15.6 5 14.7 5 13.7V6.8Z"
            fill="currentColor"
            fillOpacity="0.16"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinejoin="round"
          />
          <path
            d="M8.8 9.2H15.2M8.8 12.2H12.8"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
          />
        </svg>
      );
    case "repository":
      return (
        <svg className="db-nav-svg" viewBox="0 0 24 24" fill="none">
          <path
            d="M4.5 7.8C4.5 6.53 5.53 5.5 6.8 5.5H9.9L11.6 7.5H17.2C18.47 7.5 19.5 8.53 19.5 9.8V16.7C19.5 17.97 18.47 19 17.2 19H6.8C5.53 19 4.5 17.97 4.5 16.7V7.8Z"
            fill="currentColor"
            fillOpacity="0.16"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinejoin="round"
          />
          <path
            d="M8.5 13.5H15.5"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
          />
        </svg>
      );
    case "layers":
      return (
        <svg className="db-nav-svg" viewBox="0 0 24 24" fill="none">
          <path
            d="M8.8 8.6L15.1 11.1M8.8 15.4L15.1 12.9"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
          />
          <circle
            cx="6.5"
            cy="7.5"
            r="2.6"
            fill="currentColor"
            fillOpacity="0.18"
            stroke="currentColor"
            strokeWidth="1.75"
          />
          <circle
            cx="6.5"
            cy="16.5"
            r="2.6"
            stroke="currentColor"
            strokeWidth="1.75"
          />
          <circle
            cx="17.5"
            cy="12"
            r="2.8"
            fill="currentColor"
            fillOpacity="0.22"
            stroke="currentColor"
            strokeWidth="1.75"
          />
        </svg>
      );
    case "analytics":
      return (
        <svg className="db-nav-svg" viewBox="0 0 24 24" fill="none">
          <rect
            x="5"
            y="12"
            width="3.6"
            height="7"
            rx="1.8"
            stroke="currentColor"
            strokeWidth="1.75"
          />
          <rect
            x="10.2"
            y="5"
            width="3.6"
            height="14"
            rx="1.8"
            fill="currentColor"
            fillOpacity="0.22"
            stroke="currentColor"
            strokeWidth="1.75"
          />
          <rect
            x="15.4"
            y="8.5"
            width="3.6"
            height="10.5"
            rx="1.8"
            stroke="currentColor"
            strokeWidth="1.75"
          />
        </svg>
      );
    case "synthesis":
      return (
        <svg className="db-nav-svg" viewBox="0 0 24 24" fill="none">
          <circle
            cx="9.5"
            cy="12"
            r="5"
            fill="currentColor"
            fillOpacity="0.18"
            stroke="currentColor"
            strokeWidth="1.75"
          />
          <circle
            cx="14.5"
            cy="12"
            r="5"
            stroke="currentColor"
            strokeWidth="1.75"
          />
          <circle cx="12" cy="12" r="1.4" fill="currentColor" />
        </svg>
      );
    case "studio":
      return (
        <svg className="db-nav-svg" viewBox="0 0 24 24" fill="none">
          <rect
            x="4.5"
            y="4.5"
            width="15"
            height="15"
            rx="4.5"
            stroke="currentColor"
            strokeWidth="1.75"
          />
          <path
            d="M9 15.5V10.5M12 15.5V8.5M15 15.5V12"
            stroke="currentColor"
            strokeWidth="1.85"
            strokeLinecap="round"
          />
        </svg>
      );
  }
}

/**
 * Two-section collapsible left sidebar:
 * - Upper section: Homes, Chat, Repository
 * - Divider line
 * - Lower section: Layers, Analytics, Synthesis, Studio
 * - Footer: Notifications popover + Gmail Profile menu
 */
export function Sidebar({
  activeNavId,
  collapsed,
  avatarActive,
  user,
  workspaceName,
  totalDocs,
  readyDocs,
  storageProgress = 0,
  storageLabel = "0.0 MB / 1024 MB",
  signingOut,
  onSelectNav,
  onToggleCollapse,
  onBrandClick,
  onTriggerUpload,
  onAvatarClick,
  onCloseAvatarMenu,
  onRefreshData,
  onSignOut,
}: SidebarProps) {
  const profileAnchorRef = useRef<HTMLDivElement>(null);
  const notifAnchorRef = useRef<HTMLDivElement>(null);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  const safeStoragePct = Math.max(0, Math.min(100, Math.round(storageProgress)));
  const storageFillWidth = safeStoragePct > 0 ? Math.max(6, safeStoragePct) : 0;

  useEffect(() => {
    setAvatarFailed(false);
  }, [user?.avatarUrl]);

  const avatarSrc =
    !avatarFailed && user?.avatarUrl
      ? user.avatarUrl
      : "/assets/avatar-portrait.svg";

  const displayName = user?.username || user?.email?.split("@")[0] || "Account";

  useEffect(() => {
    if (!avatarActive && !notifOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        avatarActive &&
        profileAnchorRef.current &&
        !profileAnchorRef.current.contains(target)
      ) {
        onCloseAvatarMenu();
      }
      if (
        notifOpen &&
        notifAnchorRef.current &&
        !notifAnchorRef.current.contains(target)
      ) {
        setNotifOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onCloseAvatarMenu();
        setNotifOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [avatarActive, notifOpen, onCloseAvatarMenu]);

  return (
    <>
      <aside
        className={`db-sidebar ${collapsed ? "db-sidebar--collapsed" : ""}`}
        aria-label="Primary Navigation"
      >
      {/* Top Brand Header (constant 58px height, fixed 36px logo) */}
      <div className="db-sidebar-top">
        <button
          type="button"
          className="db-brand-btn"
          aria-label="DocuMind Homes"
          data-tooltip={collapsed ? "DocuMind" : undefined}
          onClick={onBrandClick}
        >
          <span className="db-brand-mark-wrap">
            <img
              src="/assets/documind-mark.svg"
              alt="DocuMind"
              className="db-brand-asset"
            />
          </span>
          <span className="db-brand-title" aria-hidden={collapsed}>
            DocuMind
          </span>
        </button>

        <button
          type="button"
          className="db-sidebar-toggle-btn"
          aria-label={collapsed ? "Maximize sidebar" : "Minimize sidebar"}
          aria-expanded={!collapsed}
          data-tooltip={collapsed ? "Expand" : "Minimize"}
          onClick={onToggleCollapse}
        >
          {collapsed ? (
            <PanelLeftOpen size={15} strokeWidth={2} />
          ) : (
            <PanelLeftClose size={15} strokeWidth={2} />
          )}
        </button>
      </div>

      {/* Main Navigation Capsule with 2 Divided Sections + Footer */}
      <nav className="db-sidebar-capsule" aria-label="Workspace Navigation">
        <div className="db-sidebar-sections">
          {/* Section 1: Main (Homes, Chat, Repository) */}
          <div className="db-sidebar-group">
            {PRIMARY_NAV_ITEMS.map((item) => (
              <NavigationItem
                key={item.id}
                id={item.id}
                label={item.label}
                active={activeNavId === item.id}
                collapsed={collapsed}
                icon={<SidebarNavSvg id={item.id} />}
                onClick={(id) => onSelectNav(id as DashboardSectionId)}
              />
            ))}
          </div>

          <div className="db-sidebar-divider" role="separator" />

          {/* Section 2: Tools (Layers, Analytics, Synthesis, Studio) */}
          <div className="db-sidebar-group">
            {SECONDARY_NAV_ITEMS.map((item) => (
              <NavigationItem
                key={item.id}
                id={item.id}
                label={item.label}
                active={activeNavId === item.id}
                collapsed={collapsed}
                icon={<SidebarNavSvg id={item.id} />}
                onClick={(id) => onSelectNav(id as DashboardSectionId)}
              />
            ))}
          </div>
        </div>

        {/* Footer: Storage Usage + Notifications + Profile */}
        <div className="db-sidebar-footer">
          {collapsed ? (
            <button
              type="button"
              className="db-sidebar-storage-mini"
              aria-label={`Storage used ${storageLabel}`}
              data-tooltip={`Storage · ${storageLabel}`}
              onClick={() => onSelectNav("repository")}
            >
              <HardDrive size={18} strokeWidth={1.9} />
            </button>
          ) : (
            <div
              className="db-sidebar-storage-card"
              role="region"
              aria-label="Storage Used"
            >
              <div className="db-sidebar-storage-head">
                <span className="db-sidebar-storage-title">
                  <HardDrive size={14} strokeWidth={2.1} aria-hidden="true" />
                  <span>Storage Used</span>
                </span>
                <span className="db-sidebar-storage-pct">
                  {safeStoragePct}%
                </span>
              </div>
              <div
                className="db-sidebar-storage-track"
                role="progressbar"
                aria-valuenow={safeStoragePct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Storage usage percentage"
              >
                <div
                  className={`db-sidebar-storage-fill ${
                    safeStoragePct >= 80
                      ? "db-sidebar-storage-fill--warn"
                      : ""
                  }`}
                  style={{ width: `${storageFillWidth}%` }}
                />
              </div>
              <div className="db-sidebar-storage-meta">
                <span>{storageLabel}</span>
                <span>{totalDocs} files</span>
              </div>
            </div>
          )}

          <div className="db-notif-anchor" ref={notifAnchorRef}>
            <button
              type="button"
              className={`db-nav-item db-notif-btn ${
                notifOpen ? "db-nav-item--active" : ""
              } ${collapsed ? "db-nav-item--collapsed" : ""}`}
              aria-label="Notifications"
              aria-expanded={notifOpen}
              data-tooltip={collapsed && !notifOpen ? "Notifications" : undefined}
              onClick={() => setNotifOpen((prev) => !prev)}
            >
              <span className="db-nav-item-icon" aria-hidden="true">
                <svg className="db-nav-svg" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M6.8 10.2C6.8 7.33 9.13 5 12 5C14.87 5 17.2 7.33 17.2 10.2V14.2L18.7 16.2C19.08 16.7 18.72 17.4 18.1 17.4H5.9C5.28 17.4 4.92 16.7 5.3 16.2L6.8 14.2V10.2Z"
                    fill="currentColor"
                    fillOpacity="0.16"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M10 19.5C10.5 20.2 11.2 20.5 12 20.5C12.8 20.5 13.5 20.2 14 19.5"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                  />
                </svg>
                <span className="db-notif-dot" />
              </span>
              <span className="db-nav-item-label" aria-hidden={collapsed}>
                Notifications
              </span>
            </button>

            {notifOpen && (
              <div
                className="db-account-popover db-notif-popover"
                role="dialog"
                aria-label="Workspace notifications"
              >
                <div className="db-notif-head">
                  <span className="db-account-name">Notifications</span>
                  <span className="db-kpi-pill">
                    {totalDocs > 0 ? `${readyDocs} Ready` : "Getting Started"}
                  </span>
                </div>
                <div className="db-account-divider" />
                <div className="db-notif-list">
                  {totalDocs === 0 ? (
                    <div className="db-notif-empty">
                      <p>
                        You don&apos;t have any documents yet. Start your first
                        document or open AI Chat.
                      </p>
                      <div className="db-notif-actions">
                        <button
                          type="button"
                          className="db-mini-pill-btn db-mini-pill-btn--accent"
                          onClick={() => {
                            setNotifOpen(false);
                            onTriggerUpload();
                          }}
                        >
                          <Upload size={11} />
                          <span>Start First Doc</span>
                        </button>
                        <button
                          type="button"
                          className="db-mini-pill-btn"
                          onClick={() => {
                            setNotifOpen(false);
                            onSelectNav("chat");
                          }}
                        >
                          <MessageSquare size={11} />
                          <span>Open Chat</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="db-notif-empty">
                      <p>
                        {readyDocs} of {totalDocs} documents are ready across
                        Chat, Analytics, and Synthesis.
                      </p>
                      <div className="db-notif-actions">
                        <button
                          type="button"
                          className="db-mini-pill-btn db-mini-pill-btn--accent"
                          onClick={() => {
                            setNotifOpen(false);
                            onSelectNav("chat");
                          }}
                        >
                          <MessageSquare size={11} />
                          <span>Ask Documents</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="db-profile-anchor" ref={profileAnchorRef}>
            <button
              type="button"
              className={`db-profile-btn ${
                avatarActive ? "db-profile-btn--active" : ""
              } ${collapsed ? "db-profile-btn--collapsed" : ""}`}
              aria-label="Profile menu"
              aria-haspopup="menu"
              aria-expanded={avatarActive}
              data-tooltip={
                collapsed && !avatarActive ? displayName : undefined
              }
              onClick={onAvatarClick}
            >
              <span className="db-avatar-frame">
                <img
                  src={avatarSrc}
                  alt={displayName}
                  referrerPolicy="no-referrer"
                  className="db-avatar-portrait"
                  onError={() => setAvatarFailed(true)}
                />
              </span>
              <span className="db-profile-info" aria-hidden={collapsed}>
                <span className="db-profile-name">{displayName}</span>
                <span className="db-profile-ws">{workspaceName}</span>
              </span>
              <span className="db-profile-chevron-wrap" aria-hidden={collapsed}>
                <ChevronUp
                  size={15}
                  className={`db-profile-chevron ${
                    avatarActive ? "db-profile-chevron--open" : ""
                  }`}
                />
              </span>
            </button>

            {avatarActive && (
              <div
                className="db-account-popover"
                role="menu"
                aria-label="Profile dropdown menu"
              >
                <div className="db-account-header">
                  <img
                    src={avatarSrc}
                    alt={displayName}
                    referrerPolicy="no-referrer"
                    className="db-account-badge-img"
                    onError={() => setAvatarFailed(true)}
                  />
                  <div className="db-account-meta">
                    <span className="db-account-name">{displayName}</span>
                    {user?.email && (
                      <span className="db-account-email">{user.email}</span>
                    )}
                    <span className="db-account-workspace">{workspaceName}</span>
                  </div>
                </div>

                <div className="db-account-divider" />

                <div className="db-account-menu-list">
                  <button
                    type="button"
                    role="menuitem"
                    className="db-account-menu-item"
                    onClick={() => {
                      onSelectNav("homes");
                      onCloseAvatarMenu();
                    }}
                  >
                    <Home size={14} />
                    <span>Homes</span>
                  </button>

                  <button
                    type="button"
                    role="menuitem"
                    className="db-account-menu-item"
                    onClick={() => {
                      onRefreshData();
                      onCloseAvatarMenu();
                    }}
                  >
                    <RefreshCw size={14} />
                    <span>Refresh</span>
                  </button>

                  <Link
                    href="/"
                    role="menuitem"
                    className="db-account-menu-item"
                    onClick={onCloseAvatarMenu}
                  >
                    <ExternalLink size={14} />
                    <span>Landing Page</span>
                  </Link>
                </div>

                <div className="db-account-divider" />

                <button
                  type="button"
                  role="menuitem"
                  className="db-account-signout"
                  disabled={signingOut}
                  onClick={onSignOut}
                >
                  {signingOut ? (
                    <>
                      <Loader2 className="db-spin" size={14} />
                      <span>Signing out...</span>
                    </>
                  ) : (
                    <>
                      <LogOut size={14} />
                      <span>Sign out</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>
    </aside>

      <MobileBottomNav
        activeNavId={activeNavId}
        onSelectNav={onSelectNav}
        renderIcon={(id) => <SidebarNavSvg id={id} />}
        onAfterSelect={() => {
          setNotifOpen(false);
          if (avatarActive) onCloseAvatarMenu();
        }}
      />
    </>
  );
}
