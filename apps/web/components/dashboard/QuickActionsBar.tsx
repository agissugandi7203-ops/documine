"use client";

import React from "react";
import { FolderOpen, MessageSquare, Plus } from "lucide-react";

interface QuickActionsBarProps {
  uploading: boolean;
  onTriggerUpload: () => void;
  onOpenSynthesis: () => void;
  onOpenStudio: () => void;
}

/**
 * Clean header action pills: AI Chat, Repository, and Upload PDF CTA.
 */
export function QuickActionsBar({
  uploading,
  onTriggerUpload,
  onOpenSynthesis,
  onOpenStudio,
}: QuickActionsBarProps) {
  return (
    <div
      className="db-quick-actions-bar"
      role="group"
      aria-label="Workspace Actions"
    >
      <button
        type="button"
        className="db-quick-btn"
        onClick={onOpenSynthesis}
      >
        <MessageSquare
          className="db-quick-btn-icon"
          strokeWidth={2}
          aria-hidden="true"
        />
        <span>AI Chat</span>
      </button>

      <button type="button" className="db-quick-btn" onClick={onOpenStudio}>
        <FolderOpen
          className="db-quick-btn-icon"
          strokeWidth={2}
          aria-hidden="true"
        />
        <span>Repository</span>
      </button>

      <button
        type="button"
        className="db-quick-btn db-quick-btn--accent"
        onClick={onTriggerUpload}
        disabled={uploading}
      >
        <Plus
          className="db-quick-btn-icon"
          strokeWidth={2.4}
          aria-hidden="true"
        />
        <span>{uploading ? "Uploading..." : "Upload PDF"}</span>
      </button>
    </div>
  );
}
