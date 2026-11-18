"use client";

import React from "react";
import {
  BarChart3,
  GitCompare,
  GraduationCap,
  Plus,
} from "lucide-react";
import type { DashboardSectionId } from "./types";

interface QuickActionsBarProps {
  activeNavId: DashboardSectionId;
  uploading: boolean;
  onTriggerUpload: () => void;
  onNavigate: (section: DashboardSectionId) => void;
}

/**
 * Editorial pill quick-actions cluster inspired by clean modern workspace headers.
 */
export function QuickActionsBar({
  activeNavId,
  uploading,
  onTriggerUpload,
  onNavigate,
}: QuickActionsBarProps) {
  return (
    <div
      className="db-quick-actions-bar"
      role="group"
      aria-label="Quick Actions"
    >
      <button
        type="button"
        className={`db-quick-btn ${
          activeNavId === "analytics" ? "db-quick-btn--selected" : ""
        }`}
        onClick={() => onNavigate("analytics")}
      >
        <BarChart3 className="db-quick-btn-icon" strokeWidth={2} aria-hidden="true" />
        <span>Analytics</span>
      </button>

      <button
        type="button"
        className={`db-quick-btn ${
          activeNavId === "synthesis" ? "db-quick-btn--selected" : ""
        }`}
        onClick={() => onNavigate("synthesis")}
      >
        <GitCompare className="db-quick-btn-icon" strokeWidth={2} aria-hidden="true" />
        <span>Compare</span>
      </button>

      <button
        type="button"
        className={`db-quick-btn ${
          activeNavId === "studio" ? "db-quick-btn--selected" : ""
        }`}
        onClick={() => onNavigate("studio")}
      >
        <GraduationCap className="db-quick-btn-icon" strokeWidth={2} aria-hidden="true" />
        <span>Studio</span>
      </button>

      <button
        type="button"
        className="db-quick-btn db-quick-btn--accent"
        onClick={onTriggerUpload}
        disabled={uploading}
      >
        <Plus className="db-quick-btn-icon" strokeWidth={2.4} aria-hidden="true" />
        <span>{uploading ? "Uploading..." : "Upload PDF"}</span>
      </button>
    </div>
  );
}
