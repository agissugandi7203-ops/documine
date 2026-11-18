"use client";

import React from "react";

interface DashboardFrameProps {
  sidebarCollapsed?: boolean;
  children: React.ReactNode;
}

/**
 * Full-viewport editorial workspace shell supporting smooth sidebar collapse/expand.
 */
export function DashboardFrame({
  sidebarCollapsed = false,
  children,
}: DashboardFrameProps) {
  return (
    <div className="db-frame-bezel">
      <main
        className={`db-frame-cavity ${
          sidebarCollapsed ? "db-frame-cavity--collapsed" : ""
        }`}
        aria-label="Workspace Dashboard"
      >
        {children}
      </main>
    </div>
  );
}
