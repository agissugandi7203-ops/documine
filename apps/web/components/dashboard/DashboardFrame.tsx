"use client";

import React from "react";

interface DashboardFrameProps {
  children: React.ReactNode;
}

/**
 * Full-viewport editorial flex workspace shell allowing the animated sidebar
 * and central Bento canvas to resize smoothly in tandem.
 */
export function DashboardFrame({ children }: DashboardFrameProps) {
  return (
    <div className="db-frame-bezel">
      <main className="db-frame-cavity" aria-label="Workspace Dashboard">
        {children}
      </main>
    </div>
  );
}
