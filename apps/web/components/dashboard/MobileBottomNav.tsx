"use client";

import React from "react";
import { NAV_ITEMS, type DashboardSectionId } from "./types";

interface MobileBottomNavProps {
  activeNavId: DashboardSectionId;
  onSelectNav: (id: DashboardSectionId) => void;
  renderIcon: (id: DashboardSectionId) => React.ReactNode;
  onAfterSelect?: () => void;
}

const MAX_MOBILE_TABS = 5;

/**
 * Fixed 5-item mobile/tablet bottom navigation bar (< 1024px).
 * Kept separate from Sidebar markup to avoid interfering with desktop layouts.
 */
export function MobileBottomNav({
  activeNavId,
  onSelectNav,
  renderIcon,
  onAfterSelect,
}: MobileBottomNavProps) {
  const mobileItems = NAV_ITEMS.slice(0, MAX_MOBILE_TABS);

  const handleSelect = (id: DashboardSectionId) => {
    onAfterSelect?.();
    onSelectNav(id);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <nav className="db-mobile-bottom-nav" aria-label="Mobile Navigation">
      <div className="db-mobile-bottom-nav-track">
        {mobileItems.map((item) => {
          const active = activeNavId === item.id;
          return (
            <button
              key={item.id}
              type="button"
              data-nav-id={item.id}
              className={`db-mobile-nav-btn ${
                active ? "db-mobile-nav-btn--active" : ""
              }`}
              aria-label={item.label}
              aria-current={active ? "page" : undefined}
              onClick={() => handleSelect(item.id)}
            >
              <span className="db-mobile-nav-icon" aria-hidden="true">
                {renderIcon(item.id)}
              </span>
              <span className="db-mobile-nav-label">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
