"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ChevronUp,
  ExternalLink,
  Home,
  Loader2,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  RefreshCw,
} from "lucide-react";
import type { AuthUser } from "@/lib/supabase";
import { NavigationItem } from "./NavigationItem";
import { NAV_ITEMS, type DashboardSectionId } from "./types";

interface SidebarProps {
  activeNavId: DashboardSectionId;
  collapsed: boolean;
  statusIndicatorActive: boolean;
  avatarActive: boolean;
  user: AuthUser | null;
  workspaceName: string;
  signingOut: boolean;
  onSelectNav: (id: DashboardSectionId) => void;
  onToggleCollapse: () => void;
  onBrandClick: () => void;
  onToggleStatusIndicator: () => void;
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
    case "layers":
      return (
        <svg className="db-nav-svg" viewBox="0 0 24 24" fill="none">
          <rect
            x="4.5"
            y="4.5"
            width="15"
            height="5.2"
            rx="2.2"
            fill="currentColor"
            fillOpacity="0.18"
            stroke="currentColor"
            strokeWidth="1.75"
          />
          <rect
            x="4.5"
            y="11.4"
            width="15"
            height="4.2"
            rx="2"
            stroke="currentColor"
            strokeWidth="1.75"
          />
          <path
            d="M6.5 18.5H17.5"
            stroke="currentColor"
            strokeWidth="1.85"
            strokeLinecap="round"
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
            d="M12 7.5L13.35 10.65L16.5 12L13.35 13.35L12 16.5L10.65 13.35L7.5 12L10.65 10.65L12 7.5Z"
            fill="currentColor"
            fillOpacity="0.22"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </svg>
      );
  }
}

/**
 * Collapsible editorial left sidebar featuring custom geometric SVG icons,
 * balanced spacing, minimize/maximize toggle, Gmail photo support, and popup menu.
 */
export function Sidebar({
  activeNavId,
  collapsed,
  statusIndicatorActive,
  avatarActive,
  user,
  workspaceName,
  signingOut,
  onSelectNav,
  onToggleCollapse,
  onBrandClick,
  onToggleStatusIndicator,
  onAvatarClick,
  onCloseAvatarMenu,
  onRefreshData,
  onSignOut,
}: SidebarProps) {
  const profileAnchorRef = useRef<HTMLDivElement>(null);
  const [avatarFailed, setAvatarFailed] = useState(false);

  useEffect(() => {
    setAvatarFailed(false);
  }, [user?.avatarUrl]);

  const avatarSrc =
    !avatarFailed && user?.avatarUrl
      ? user.avatarUrl
      : "/assets/avatar-portrait.svg";

  const displayName = user?.username || user?.email?.split("@")[0] || "Account";

  useEffect(() => {
    if (!avatarActive) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (
        profileAnchorRef.current &&
        !profileAnchorRef.current.contains(event.target as Node)
      ) {
        onCloseAvatarMenu();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onCloseAvatarMenu();
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [avatarActive, onCloseAvatarMenu]);

  return (
    <aside
      className={`db-sidebar ${collapsed ? "db-sidebar--collapsed" : ""}`}
      aria-label="Primary Navigation"
    >
      {/* Top Brand + Minimize / Maximize Header */}
      <div className="db-sidebar-top">
        <button
          type="button"
          className="db-brand-btn"
          aria-label="DocuMind Homes"
          data-tooltip={collapsed ? "DocuMind Homes" : undefined}
          onClick={onBrandClick}
        >
          <span className="db-brand-mark-wrap">
            <img
              src="/assets/documind-mark.svg"
              alt="DocuMind"
              className="db-brand-asset"
            />
          </span>
          {!collapsed && <span className="db-brand-title">DocuMind</span>}
        </button>

        <button
          type="button"
          className="db-sidebar-toggle-btn"
          aria-label={collapsed ? "Maximize sidebar" : "Minimize sidebar"}
          aria-expanded={!collapsed}
          data-tooltip={collapsed ? "Maximize" : "Minimize"}
          onClick={onToggleCollapse}
        >
          {collapsed ? (
            <PanelLeftOpen size={16} strokeWidth={1.9} />
          ) : (
            <PanelLeftClose size={16} strokeWidth={1.9} />
          )}
        </button>
      </div>

      {/* Main Navigation Rail / Panel */}
      <nav className="db-sidebar-capsule" aria-label="Workspace Tools">
        <div className="db-sidebar-group">
          {!collapsed && (
            <div className="db-sidebar-section-label">Workspace</div>
          )}
          {NAV_ITEMS.map((item) => (
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

        <div className="db-sidebar-footer">
          <button
            type="button"
            className={`db-status-row-btn ${
              statusIndicatorActive ? "db-status-row-btn--online" : ""
            } ${collapsed ? "db-status-row-btn--collapsed" : ""}`}
            aria-label="Backend Sync Status"
            aria-pressed={statusIndicatorActive}
            data-tooltip={
              collapsed
                ? statusIndicatorActive
                  ? "API Connected"
                  : "Sync Standby"
                : undefined
            }
            onClick={onToggleStatusIndicator}
          >
            <svg className="db-nav-svg" viewBox="0 0 24 24" fill="none">
              <circle
                cx="12"
                cy="12"
                r="7.5"
                stroke="currentColor"
                strokeWidth="1.75"
              />
              <circle cx="12" cy="12" r="3" fill="currentColor" />
            </svg>
            {!collapsed && (
              <span className="db-status-row-label">
                {statusIndicatorActive ? "API Connected" : "Sync Standby"}
              </span>
            )}
          </button>

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
                collapsed && !avatarActive ? `Profile · ${displayName}` : undefined
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
              {!collapsed && (
                <>
                  <span className="db-profile-info">
                    <span className="db-profile-name">{displayName}</span>
                    <span className="db-profile-ws">{workspaceName}</span>
                  </span>
                  <ChevronUp
                    size={15}
                    className={`db-profile-chevron ${
                      avatarActive ? "db-profile-chevron--open" : ""
                    }`}
                  />
                </>
              )}
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
                    <span>Workspace Homes</span>
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
                    <span>Sync Workspace</span>
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
  );
}
