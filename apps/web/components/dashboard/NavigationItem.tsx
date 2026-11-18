"use client";

import React from "react";

interface NavigationItemProps {
  id: string;
  label: string;
  active: boolean;
  collapsed: boolean;
  icon: React.ReactNode;
  onClick: (id: string) => void;
}

/**
 * Sidebar navigation button supporting both expanded pill-row and
 * compact minimized icon rail modes.
 */
export function NavigationItem({
  id,
  label,
  active,
  collapsed,
  icon,
  onClick,
}: NavigationItemProps) {
  return (
    <button
      type="button"
      className={`db-nav-item ${active ? "db-nav-item--active" : ""} ${
        collapsed ? "db-nav-item--collapsed" : ""
      }`}
      aria-label={label}
      aria-pressed={active}
      data-tooltip={collapsed ? label : undefined}
      onClick={() => onClick(id)}
    >
      <span className="db-nav-item-icon" aria-hidden="true">
        {icon}
      </span>
      {!collapsed && <span className="db-nav-item-label">{label}</span>}
    </button>
  );
}
