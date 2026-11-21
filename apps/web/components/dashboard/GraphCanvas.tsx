"use client";

import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  BaseEdge,
  ConnectionMode,
  EdgeLabelRenderer,
  Handle,
  MarkerType,
  Position,
  ReactFlow,
  ReactFlowProvider,
  SelectionMode,
  getBezierPath,
  useReactFlow,
  type Connection,
  type Edge,
  type EdgeProps,
  type Node,
  type NodeProps,
  type OnNodeDrag,
  type Viewport,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import "./graph-canvas.css";
import {
  AlignHorizontalJustifyCenter,
  AlignVerticalJustifyCenter,
  AlertTriangle,
  ArrowRight,
  Crosshair,
  FileSpreadsheet,
  FileText,
  FolderOpen,
  GitBranch,
  GitCompare,
  Grid2x2,
  Hand,
  LayoutGrid,
  Link2,
  Loader2,
  Maximize2,
  MessageSquare,
  Minus,
  Moon,
  MousePointer2,
  Network,
  Plus,
  RefreshCw,
  Search,
  Sun,
  Trash2,
  Upload,
  Waypoints,
  X,
} from "lucide-react";
import {
  dashboardApi,
  type DocumentItem,
  type RelationshipEvidenceSummary,
  type RelationshipGraphEdge,
  type RelationshipGraphResponse,
} from "@/lib/dashboard-api";
import type { DashboardSectionId } from "./types";
import { GraphAIPanel, type GraphRightPanelTab } from "./GraphAIPanel";
import { ThinkingOrbStage } from "./chat/ThinkingOrbStage";

/* ============================================================================
   Types & Constants
   ============================================================================ */

export type GraphLayoutMode = "cluster" | "flow" | "grid";
export type GraphToolMode = "select" | "hand";
export type GraphThemeMode = "light" | "dark";

type CategoryTone = "terracotta" | "sage" | "lime" | "ink";

interface FileNodeData extends Record<string, unknown> {
  docId: string;
  title: string;
  category: string;
  fileType: string;
  status: string;
  summary: string;
  topics: string[];
  pageCount: number;
  tableCount: number;
  metricCount: number;
  linkCount: number;
  tone: CategoryTone;
  dimmed: boolean;
  isSearchMatch: boolean;
  isFocusedHub: boolean;
  isDemo?: boolean;
}

interface RelationshipEdgeData extends Record<string, unknown> {
  edgeId: string;
  sourceDocId: string;
  targetDocId: string;
  sourceTitle: string;
  targetTitle: string;
  relationshipType: string;
  confidence: number;
  explanation: string;
  evidenceSummary?: RelationshipEvidenceSummary;
  isDark?: boolean;
  dimmed: boolean;
  isManual?: boolean;
  isDemo?: boolean;
  onSelectEdge: (edgeId: string) => void;
}

type FileGraphNode = Node<FileNodeData, "fileNode">;
type FileGraphEdge = Edge<RelationshipEdgeData, "relationshipEdge">;

interface ManualEdgeRecord {
  id: string;
  source_doc_id: string;
  target_doc_id: string;
  relationship_type: "manual";
  composite_confidence: number;
  explanation: string;
}

export interface GraphCanvasProps {
  workspaceName: string;
  workspaceId?: string;
  documents: DocumentItem[];
  relationships: RelationshipGraphResponse | null;
  selectedDocId?: string | null;
  uploading?: boolean;
  uploadError?: string | null;
  onBack: () => void;
  onSelectNav?: (section: DashboardSectionId) => void;
  onSelectDoc?: (docId: string) => void;
  onTriggerUpload: () => void;
  onDropFile?: (file: File) => void;
  onRecomputeRelationships: () => Promise<void> | void;
  onDismissRelationship?: (relationshipId: string) => Promise<void> | void;
  onOpenInChat?: (docId: string) => void;
  onOpenInRepository?: (docId: string) => void;
  onCompareInSynthesis?: (docIds: string[]) => void;
  onThemeChange?: (theme: GraphThemeMode) => void;
}

/* ============================================================================
   Sample Interactive Graph (Shown Only When User Opts Into Demo on Empty Board)
   ============================================================================ */

const DEMO_DOCUMENTS: DocumentItem[] = [
  {
    id: "demo-fin-q4",
    title: "Q4 Financial Telemetry.pdf",
    file_type: "pdf",
    page_count: 28,
    file_size_bytes: 2_450_000,
    processing_status: "ready",
    status: "ready",
    category: "Finance",
    summary:
      "Quarterly revenue breakdown, gross margin expansion, and enterprise ARR retention metrics across regions.",
    main_topics: ["ARR Growth", "Gross Margin", "Enterprise Retention"],
    table_count: 6,
    metric_count: 18,
  },
  {
    id: "demo-arch-spec",
    title: "Product Architecture Spec.pdf",
    file_type: "pdf",
    page_count: 19,
    file_size_bytes: 1_820_000,
    processing_status: "ready",
    status: "ready",
    category: "Engineering",
    summary:
      "Multi-tenant DuckDB analytics pipeline, hybrid vector retrieval index, and latency SLO targets.",
    main_topics: ["DuckDB Engine", "Retrieval Latency", "Cloud Cost"],
    table_count: 3,
    metric_count: 11,
  },
  {
    id: "demo-market-brief",
    title: "Market Synthesis Brief.pdf",
    file_type: "pdf",
    page_count: 14,
    file_size_bytes: 1_190_000,
    processing_status: "ready",
    status: "ready",
    category: "Research",
    summary:
      "Competitive positioning benchmark across enterprise document intelligence and AI research platforms.",
    main_topics: ["ARR Growth", "Enterprise Buyers", "Pricing Tiers"],
    table_count: 4,
    metric_count: 9,
  },
  {
    id: "demo-churn-csv",
    title: "Customer Retention Cohort.csv",
    file_type: "csv",
    page_count: 1,
    file_size_bytes: 420_000,
    processing_status: "ready",
    status: "ready",
    category: "Finance",
    summary:
      "Monthly cohort churn rates and expansion seat velocity segmented by customer tier.",
    main_topics: ["Enterprise Retention", "Churn Cohort", "Seat Velocity"],
    table_count: 1,
    metric_count: 14,
  },
  {
    id: "demo-compliance",
    title: "SOC2 & Compliance Audit.pdf",
    file_type: "pdf",
    page_count: 32,
    file_size_bytes: 3_110_000,
    processing_status: "ready",
    status: "ready",
    category: "Legal",
    summary:
      "Security controls, workspace tenant isolation verification, and data residency requirements.",
    main_topics: ["Tenant Isolation", "Audit Controls", "DuckDB Engine"],
    table_count: 5,
    metric_count: 7,
  },
  {
    id: "demo-board-deck",
    title: "2026 Board Strategy Deck.pdf",
    file_type: "pdf",
    page_count: 22,
    file_size_bytes: 4_050_000,
    processing_status: "ready",
    status: "ready",
    category: "Research",
    summary:
      "Annual operating plan aligning infrastructure cost budget with projected enterprise expansion targets.",
    main_topics: ["ARR Growth", "Cloud Cost", "Pricing Tiers"],
    table_count: 4,
    metric_count: 15,
  },
];

const DEMO_EDGES: RelationshipGraphEdge[] = [
  {
    id: "demo-edge-1",
    source_doc_id: "demo-fin-q4",
    target_doc_id: "demo-board-deck",
    source_doc_title: "Q4 Financial Telemetry.pdf",
    target_doc_title: "2026 Board Strategy Deck.pdf",
    relationship_type: "shared_topics",
    composite_confidence: 0.94,
    explanation: "Shares topics (ARR Growth, Gross Margin, Pricing Tiers)",
    evidence_summary: {
      shared_topics: ["ARR Growth", "Gross Margin", "Pricing Tiers"],
      shared_entity_count: 4,
      semantic_similarity: 0.89,
    },
  },
  {
    id: "demo-edge-2",
    source_doc_id: "demo-fin-q4",
    target_doc_id: "demo-churn-csv",
    source_doc_title: "Q4 Financial Telemetry.pdf",
    target_doc_title: "Customer Retention Cohort.csv",
    relationship_type: "metric_contradiction",
    composite_confidence: 0.88,
    explanation:
      "Net retention reported at 118% in Q4 Telemetry vs. 113.4% in raw Cohort CSV.",
    evidence_summary: {
      shared_topics: ["Enterprise Retention"],
      shared_entity_count: 2,
      semantic_similarity: 0.81,
    },
  },
  {
    id: "demo-edge-3",
    source_doc_id: "demo-fin-q4",
    target_doc_id: "demo-market-brief",
    source_doc_title: "Q4 Financial Telemetry.pdf",
    target_doc_title: "Market Synthesis Brief.pdf",
    relationship_type: "shared_topics",
    composite_confidence: 0.84,
    explanation: "Shares topics (ARR Growth, Enterprise Buyers)",
    evidence_summary: {
      shared_topics: ["ARR Growth", "Enterprise Buyers"],
      shared_entity_count: 3,
      semantic_similarity: 0.79,
    },
  },
  {
    id: "demo-edge-4",
    source_doc_id: "demo-arch-spec",
    target_doc_id: "demo-compliance",
    source_doc_title: "Product Architecture Spec.pdf",
    target_doc_title: "SOC2 & Compliance Audit.pdf",
    relationship_type: "shared_entities",
    composite_confidence: 0.86,
    explanation: "Shares 5 canonical named entities across tenant isolation layers",
    evidence_summary: {
      shared_topics: ["DuckDB Engine", "Tenant Isolation"],
      shared_entity_count: 5,
      semantic_similarity: 0.82,
    },
  },
  {
    id: "demo-edge-5",
    source_doc_id: "demo-arch-spec",
    target_doc_id: "demo-board-deck",
    source_doc_title: "Product Architecture Spec.pdf",
    target_doc_title: "2026 Board Strategy Deck.pdf",
    relationship_type: "shared_topics",
    composite_confidence: 0.78,
    explanation: "Shares topics (Cloud Cost, Infrastructure Scaling)",
    evidence_summary: {
      shared_topics: ["Cloud Cost"],
      shared_entity_count: 2,
      semantic_similarity: 0.74,
    },
  },
  {
    id: "demo-edge-6",
    source_doc_id: "demo-market-brief",
    target_doc_id: "demo-board-deck",
    source_doc_title: "Market Synthesis Brief.pdf",
    target_doc_title: "2026 Board Strategy Deck.pdf",
    relationship_type: "semantic_similarity",
    composite_confidence: 0.82,
    explanation: "High semantic content similarity (82%)",
    evidence_summary: {
      shared_topics: ["Pricing Tiers"],
      shared_entity_count: 2,
      semantic_similarity: 0.82,
    },
  },
  {
    id: "demo-edge-7",
    source_doc_id: "demo-churn-csv",
    target_doc_id: "demo-market-brief",
    source_doc_title: "Customer Retention Cohort.csv",
    target_doc_title: "Market Synthesis Brief.pdf",
    relationship_type: "shared_entities",
    composite_confidence: 0.73,
    explanation: "Shares 3 canonical named entities (Enterprise Segment accounts)",
    evidence_summary: {
      shared_topics: [],
      shared_entity_count: 3,
      semantic_similarity: 0.71,
    },
  },
];

/* ============================================================================
   Visual & Layout Helpers
   ============================================================================ */

function getCategoryTone(category: string): CategoryTone {
  const c = category.toLowerCase();
  if (c.includes("fin") || c.includes("rev") || c.includes("tax") || c.includes("budget")) {
    return "terracotta";
  }
  if (c.includes("eng") || c.includes("tech") || c.includes("arch") || c.includes("code")) {
    return "sage";
  }
  if (c.includes("res") || c.includes("mark") || c.includes("brief") || c.includes("strat")) {
    return "lime";
  }
  return "ink";
}

function formatCategoryLabel(category?: string): string {
  if (!category) return "Document";
  return category
    .replace(/_/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

function getEdgeMeta(
  relType?: string,
  isDark = false
): {
  label: string;
  shortLabel: string;
  color: string;
  dashed: boolean;
  toneClass: string;
} {
  switch (relType) {
    case "shared_topics":
      return {
        label: "Shared Topics",
        shortLabel: "Topics",
        color: isDark ? "#ff7847" : "#e85a24",
        dashed: false,
        toneClass: "topics",
      };
    case "shared_entities":
      return {
        label: "Shared Entities",
        shortLabel: "Entities",
        color: isDark ? "#34d399" : "#2c6b58",
        dashed: false,
        toneClass: "entities",
      };
    case "metric_contradiction":
      return {
        label: "Metric Contradiction",
        shortLabel: "Conflict",
        color: isDark ? "#f87171" : "#dc2626",
        dashed: true,
        toneClass: "conflict",
      };
    case "manual":
      return {
        label: "Manual Link",
        shortLabel: "Manual",
        color: isDark ? "#fbbf24" : "#b45309",
        dashed: false,
        toneClass: "manual",
      };
    default:
      return {
        label: "Semantic Similarity",
        shortLabel: "Semantic",
        color: isDark ? "#8b8f9c" : "#52525b",
        dashed: false,
        toneClass: "semantic",
      };
  }
}

function computeAutoLayout(
  docIds: string[],
  categoriesById: Record<string, string>,
  edges: Array<{ source_doc_id: string; target_doc_id: string }>,
  mode: GraphLayoutMode
): Record<string, { x: number; y: number }> {
  const positions: Record<string, { x: number; y: number }> = {};
  const count = docIds.length;
  if (count === 0) return positions;

  // Degree count per document
  const degree: Record<string, number> = {};
  for (const id of docIds) degree[id] = 0;
  for (const e of edges) {
    if (degree[e.source_doc_id] !== undefined) degree[e.source_doc_id] += 1;
    if (degree[e.target_doc_id] !== undefined) degree[e.target_doc_id] += 1;
  }

  if (mode === "grid") {
    const cols = count <= 2 ? count : count <= 6 ? 3 : 4;
    const xGap = 340;
    const yGap = 240;
    docIds.forEach((id, idx) => {
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      positions[id] = {
        x: Math.round((col - (cols - 1) / 2) * xGap),
        y: Math.round(row * yGap),
      };
    });
    return positions;
  }

  if (mode === "flow") {
    const groups = new Map<string, string[]>();
    for (const id of docIds) {
      const cat = formatCategoryLabel(categoriesById[id]);
      const list = groups.get(cat) ?? [];
      list.push(id);
      groups.set(cat, list);
    }
    const orderedGroups = Array.from(groups.entries()).sort(
      (a, b) => b[1].length - a[1].length
    );
    const colGap = 370;
    const rowGap = 238;
    orderedGroups.forEach(([, ids], colIdx) => {
      const sorted = [...ids].sort((a, b) => (degree[b] ?? 0) - (degree[a] ?? 0));
      sorted.forEach((id, rowIdx) => {
        positions[id] = {
          x: Math.round((colIdx - (orderedGroups.length - 1) / 2) * colGap),
          y: Math.round((rowIdx - (sorted.length - 1) / 2) * rowGap),
        };
      });
    });
    return positions;
  }

  // Default: "cluster", hub-centric concentric orbital rings with generous card spacing
  const sortedByDegree = [...docIds].sort(
    (a, b) => (degree[b] ?? 0) - (degree[a] ?? 0)
  );

  if (count === 1) {
    positions[sortedByDegree[0]] = { x: 0, y: 0 };
    return positions;
  }

  if (count === 2) {
    positions[sortedByDegree[0]] = { x: -220, y: 0 };
    positions[sortedByDegree[1]] = { x: 220, y: 0 };
    return positions;
  }

  // Place top hub at center if it has >= 2 connections; otherwise ring everyone evenly
  const hasStrongHub = (degree[sortedByDegree[0]] ?? 0) >= 2 && count >= 4;
  let remaining = sortedByDegree;

  if (hasStrongHub) {
    positions[sortedByDegree[0]] = { x: 0, y: 0 };
    remaining = sortedByDegree.slice(1);
  }

  let cursor = 0;
  let ring = 1;
  while (cursor < remaining.length) {
    const ringCapacity = ring === 1 ? Math.min(6, remaining.length) : 8 + (ring - 2) * 4;
    const slice = remaining.slice(cursor, cursor + ringCapacity);
    const rx = ring === 1 ? (hasStrongHub ? 430 : 320) : 430 + (ring - 1) * 330;
    const ry = ring === 1 ? (hasStrongHub ? 295 : 230) : 295 + (ring - 1) * 245;
    const angleOffset = -Math.PI / 2 + (ring % 2 === 0 ? Math.PI / slice.length : 0);

    slice.forEach((id, i) => {
      const theta = angleOffset + (i / slice.length) * Math.PI * 2;
      positions[id] = {
        x: Math.round(Math.cos(theta) * rx),
        y: Math.round(Math.sin(theta) * ry),
      };
    });

    cursor += slice.length;
    ring += 1;
  }

  return positions;
}

const CARD_W = 280;
const CARD_H = 176;

/**
 * Dynamically pick the cleanest facing handle pair (right<->left or bottom<->top)
 * from live node positions so wires NEVER loop awkwardly across card bodies.
 */
function computeOptimalHandles(
  srcPos?: { x: number; y: number },
  tgtPos?: { x: number; y: number }
): { sourceHandle: string; targetHandle: string } {
  if (!srcPos || !tgtPos) {
    return { sourceHandle: "right", targetHandle: "left" };
  }
  const dx = tgtPos.x - srcPos.x;
  const dy = tgtPos.y - srcPos.y;
  if (Math.abs(dx) >= Math.abs(dy) * 0.82) {
    return dx >= 0
      ? { sourceHandle: "right", targetHandle: "left" }
      : { sourceHandle: "left", targetHandle: "right" };
  }
  return dy >= 0
    ? { sourceHandle: "bottom", targetHandle: "top" }
    : { sourceHandle: "top", targetHandle: "bottom" };
}

/**
 * When two nodes are connected, smoothly adjust the target node if they overlap
 * or sit awkwardly far apart, while avoiding collisions with neighboring cards.
 */
function adjustConnectedNodePosition(
  sourceId: string,
  targetId: string,
  allPositions: Record<string, { x: number; y: number }>
): Record<string, { x: number; y: number }> {
  const src = allPositions[sourceId];
  const tgt = allPositions[targetId];
  if (!src || !tgt) return allPositions;

  const dx = tgt.x - src.x;
  const dy = tgt.y - src.y;
  const dist = Math.hypot(dx, dy);

  const minXGap = CARD_W + 68;
  const minYGap = CARD_H + 56;
  const isOverlapping = Math.abs(dx) < minXGap && Math.abs(dy) < minYGap;
  const isTooFar = dist > 720;

  let nextTgt = { ...tgt };

  if (isOverlapping) {
    // Separate cleanly along the dominant axis
    if (Math.abs(dx) >= Math.abs(dy) || dist < 10) {
      const sign = dx >= 0 ? 1 : -1;
      nextTgt = { x: Math.round(src.x + sign * minXGap), y: Math.round(src.y) };
    } else {
      const sign = dy >= 0 ? 1 : -1;
      nextTgt = { x: Math.round(src.x), y: Math.round(src.y + sign * minYGap) };
    }
  } else if (isTooFar) {
    // Bring target cleanly closer to source in the natural direction so the wire is immediately clear
    const idealDist = Math.abs(dx) >= Math.abs(dy) ? 370 : 260;
    const ux = dx / (dist || 1);
    const uy = dy / (dist || 1);
    nextTgt = {
      x: Math.round(src.x + ux * idealDist),
      y: Math.round(src.y + uy * idealDist),
    };
  } else if (Math.abs(dy) < 42 && Math.abs(dx) >= minXGap) {
    // Gentle horizontal snap alignment when almost level
    nextTgt = { x: Math.round(tgt.x), y: Math.round(src.y) };
  } else if (Math.abs(dx) < 42 && Math.abs(dy) >= minYGap) {
    // Gentle vertical snap alignment when almost stacked
    nextTgt = { x: Math.round(src.x), y: Math.round(tgt.y) };
  }

  // Collision nudge against all other cards
  const updated: Record<string, { x: number; y: number }> = {
    ...allPositions,
    [targetId]: nextTgt,
  };
  for (let pass = 0; pass < 8; pass += 1) {
    let moved = false;
    for (const [otherId, pos] of Object.entries(updated)) {
      if (otherId === targetId) continue;
      const ox = updated[targetId].x - pos.x;
      const oy = updated[targetId].y - pos.y;
      if (Math.abs(ox) < CARD_W + 44 && Math.abs(oy) < CARD_H + 36) {
        const pushY = oy >= 0 ? CARD_H + 54 : -(CARD_H + 54);
        updated[targetId] = {
          x: updated[targetId].x,
          y: Math.round(pos.y + pushY),
        };
        moved = true;
      }
    }
    if (!moved) break;
  }

  return updated;
}

/**
 * Connected-Component Auto-Tidy Layout ("Auto Tidy"):
 * Groups connected nodes into crisp hierarchical left-to-right flow clusters
 * (putting newly connected nodes right next to each other with zero overlap),
 * and neatly aligns isolated nodes in an organized row underneath.
 */
function computeTidyConnectedLayout(
  docIds: string[],
  edges: Array<{ source_doc_id: string; target_doc_id: string }>
): Record<string, { x: number; y: number }> {
  const positions: Record<string, { x: number; y: number }> = {};
  if (docIds.length === 0) return positions;

  const idSet = new Set(docIds);
  const adj = new Map<string, Set<string>>();
  for (const id of docIds) adj.set(id, new Set());
  for (const e of edges) {
    if (idSet.has(e.source_doc_id) && idSet.has(e.target_doc_id) && e.source_doc_id !== e.target_doc_id) {
      adj.get(e.source_doc_id)!.add(e.target_doc_id);
      adj.get(e.target_doc_id)!.add(e.source_doc_id);
    }
  }

  // Extract connected components via BFS
  const visited = new Set<string>();
  const connectedComponents: string[][] = [];
  const isolated: string[] = [];

  for (const id of docIds) {
    if (visited.has(id)) continue;
    if ((adj.get(id)?.size ?? 0) === 0) {
      visited.add(id);
      isolated.push(id);
      continue;
    }
    const comp: string[] = [];
    const queue: string[] = [id];
    visited.add(id);
    while (queue.length > 0) {
      const cur = queue.shift()!;
      comp.push(cur);
      for (const nb of adj.get(cur) ?? []) {
        if (!visited.has(nb)) {
          visited.add(nb);
          queue.push(nb);
        }
      }
    }
    connectedComponents.push(comp);
  }

  // Sort largest connected components first
  connectedComponents.sort((a, b) => b.length - a.length);

  const xGap = 370;
  const yGap = 232;
  let cursorY = 0;

  for (const comp of connectedComponents) {
    // Pick highest-degree hub as root of this component
    const root = [...comp].sort(
      (a, b) => (adj.get(b)?.size ?? 0) - (adj.get(a)?.size ?? 0)
    )[0];

    const layers: string[][] = [];
    const depth = new Map<string, number>();
    const q: string[] = [root];
    depth.set(root, 0);

    while (q.length > 0) {
      const cur = q.shift()!;
      const d = depth.get(cur)!;
      if (!layers[d]) layers[d] = [];
      layers[d].push(cur);
      const neighbors = Array.from(adj.get(cur) ?? []).sort(
        (a, b) => (adj.get(b)?.size ?? 0) - (adj.get(a)?.size ?? 0)
      );
      for (const nb of neighbors) {
        if (!depth.has(nb)) {
          depth.set(nb, d + 1);
          q.push(nb);
        }
      }
    }

    const maxRows = Math.max(...layers.map((l) => l.length), 1);
    const compHeight = (maxRows - 1) * yGap;
    const totalCols = layers.length;

    layers.forEach((layerIds, colIdx) => {
      const colHeight = (layerIds.length - 1) * yGap;
      const startY = cursorY + (compHeight - colHeight) / 2;
      const x = Math.round((colIdx - (totalCols - 1) / 2) * xGap);
      layerIds.forEach((id, rowIdx) => {
        positions[id] = {
          x,
          y: Math.round(startY + rowIdx * yGap),
        };
      });
    });

    cursorY += compHeight + yGap + 88;
  }

  // Place isolated (unconnected) nodes in a crisp centered row underneath
  if (isolated.length > 0) {
    const cols = Math.min(4, isolated.length);
    const isoXGap = 330;
    const isoYGap = 224;
    isolated.forEach((id, idx) => {
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      const rowItems = Math.min(cols, isolated.length - row * cols);
      positions[id] = {
        x: Math.round((col - (rowItems - 1) / 2) * isoXGap),
        y: Math.round(cursorY + row * isoYGap),
      };
    });
  }

  return positions;
}

/* ============================================================================
   Memoized Custom Figma File Node (Defined Outside Component for React 19 Perf)
   ============================================================================ */

const FileNode = memo(function FileNode({
  data,
  selected,
}: NodeProps<FileGraphNode>) {
  const isSpreadsheet =
    data.fileType.toLowerCase().includes("csv") ||
    data.fileType.toLowerCase().includes("xls");

  const statusReady = ["ready", "partial_ready", "completed", "indexed"].includes(
    data.status.toLowerCase()
  );

  return (
    <div
      className={`gc-node ${selected ? "gc-node--selected" : ""} ${
        data.isFocusedHub ? "gc-node--focused-hub" : ""
      } ${data.dimmed ? "gc-node--dimmed" : ""} ${
        data.isSearchMatch ? "gc-node--match" : ""
      }`}
    >
      {selected && (
        <>
          <span className="gc-corner gc-corner--tl" aria-hidden="true" />
          <span className="gc-corner gc-corner--tr" aria-hidden="true" />
          <span className="gc-corner gc-corner--bl" aria-hidden="true" />
          <span className="gc-corner gc-corner--br" aria-hidden="true" />
        </>
      )}

      {/* 4-Side Figma Connector Handles (ConnectionMode.Loose allows drag from any side) */}
      <Handle id="top" type="source" position={Position.Top} className="gc-handle" />
      <Handle id="right" type="source" position={Position.Right} className="gc-handle" />
      <Handle id="bottom" type="source" position={Position.Bottom} className="gc-handle" />
      <Handle id="left" type="source" position={Position.Left} className="gc-handle" />

      <div className={`gc-node-accent gc-node-accent--${data.tone}`} />

      <div className="gc-node-body">
        <div className="gc-node-head">
          <div className="gc-node-cat-row">
            <span className={`gc-node-icon gc-node-icon--${data.tone}`}>
              {isSpreadsheet ? <FileSpreadsheet size={13} /> : <FileText size={13} />}
            </span>
            <span className="gc-node-cat">{formatCategoryLabel(data.category)}</span>
          </div>

          <div className="gc-node-badges">
            <span className="gc-file-ext">{data.fileType || "PDF"}</span>
            <span
              className={`gc-status-dot ${!statusReady ? "gc-status-dot--warn" : ""}`}
              title={`Status: ${data.status}`}
            />
          </div>
        </div>

        <h3 className="gc-node-title" title={data.title}>
          {data.title}
        </h3>

        {data.summary && <p className="gc-node-summary">{data.summary}</p>}

        {data.topics.length > 0 && (
          <div className="gc-node-topics">
            {data.topics.slice(0, 3).map((topic) => (
              <span key={topic} className="gc-topic-pill" title={topic}>
                {topic}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="gc-node-footer">
        <div className="gc-node-metrics">
          <span>{data.pageCount}p</span>
          <span>·</span>
          <span>{data.tableCount} tbl</span>
          {data.metricCount > 0 && (
            <>
              <span>·</span>
              <span>{data.metricCount} mtr</span>
            </>
          )}
        </div>
        <span
          className={`gc-node-links-pill ${
            data.linkCount > 0 ? "gc-node-links-pill--connected" : ""
          }`}
        >
          <Link2 size={10} />
          <span>{data.linkCount}</span>
        </span>
      </div>
    </div>
  );
});

/* ============================================================================
   Memoized Custom Relationship Edge (Smooth Bezier / Orthogonal Step + Badge)
   ============================================================================ */

const RelationshipEdge = memo(function RelationshipEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  selected,
  markerEnd,
  data,
}: EdgeProps<FileGraphEdge>) {
  const isDark = Boolean(data?.isDark);
  const meta = getEdgeMeta(data?.relationshipType, isDark);

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    curvature: 0.28,
  });

  const confidence = data?.confidence ?? 0.7;
  const baseWidth = Math.max(1.6, Math.min(3.1, 1.35 + confidence * 1.65));
  const strokeWidth = selected ? baseWidth + 1.1 : baseWidth;
  const dimmed = Boolean(data?.dimmed);
  const pct = Math.round(confidence * 100);

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        interactionWidth={22}
        style={{
          stroke: selected ? (isDark ? "#f4f4f6" : "#18181b") : meta.color,
          strokeWidth,
          strokeDasharray: meta.dashed ? "6 4" : undefined,
          opacity: dimmed ? 0.14 : selected ? 1 : isDark ? 0.9 : 0.85,
        }}
      />

      <EdgeLabelRenderer>
        <div
          className="gc-edge-label-wrap nodrag nopan"
          style={{
            transform: `translate3d(-50%, -50%, 0) translate3d(${labelX}px, ${labelY}px, 0)`,
          }}
        >
          <button
            type="button"
            className={`gc-edge-pill ${
              selected ? "gc-edge-pill--selected" : ""
            } ${
              data?.relationshipType === "metric_contradiction"
                ? "gc-edge-pill--conflict"
                : ""
            } ${dimmed ? "gc-edge-pill--dimmed" : ""}`}
            onClick={(e) => {
              e.stopPropagation();
              data?.onSelectEdge(id);
            }}
            title={data?.explanation || meta.label}
          >
            <span className={`gc-dot gc-dot--${meta.toneClass}`} />
            <span>{meta.shortLabel}</span>
            {!data?.isManual && <span className="gc-edge-conf">{pct}%</span>}
          </button>
        </div>
      </EdgeLabelRenderer>
    </>
  );
});

const NODE_TYPES = { fileNode: FileNode } as const;
const EDGE_TYPES = { relationshipEdge: RelationshipEdge } as const;
const EMPTY_NODES: FileGraphNode[] = [];
const EMPTY_EDGES: FileGraphEdge[] = [];
const PAN_ON_DRAG_BUTTONS = [1, 2];
const PRO_OPTIONS = { hideAttribution: true } as const;

/* ============================================================================
   Inner Graph Studio Canvas (Wrapped in ReactFlowProvider)
   ============================================================================ */

function GraphCanvasInner({
  workspaceName,
  workspaceId,
  documents,
  relationships,
  selectedDocId,
  uploading = false,
  uploadError = null,
  onBack,
  onSelectNav,
  onSelectDoc,
  onTriggerUpload,
  onDropFile,
  onRecomputeRelationships,
  onDismissRelationship,
  onOpenInChat,
  onOpenInRepository,
  onCompareInSynthesis,
  onThemeChange,
}: GraphCanvasProps) {
  const {
    fitView,
    zoomIn,
    zoomOut,
    setCenter,
    zoomTo,
    getNodes,
    setNodes,
    setEdges,
  } = useReactFlow<FileGraphNode, FileGraphEdge>();

  const workspaceKey = workspaceId || workspaceName || "default";
  const posStorageKey = `documind:graph:pos:${workspaceKey}`;
  const manualStorageKey = `documind:graph:manual:${workspaceKey}`;
  const themeStorageKey = "documind:graph:theme";

  // Canvas modes, theme & simplified controls (default "hand" = direct pan + direct node drag + click select)
  const [flowReady, setFlowReady] = useState(false);
  const [graphTheme, setGraphTheme] = useState<GraphThemeMode>("light");
  const [toolMode, setToolMode] = useState<GraphToolMode>("hand");
  const [spacePressed, setSpacePressed] = useState(false);
  const [layoutMode, setLayoutMode] = useState<GraphLayoutMode>("cluster");
  const [zoomPct, setZoomPct] = useState(100);

  // Search & focus
  const [searchText, setSearchText] = useState("");
  const [focusedHubId, setFocusedHubId] = useState<string | null>(null);

  // Right floating AI & Detail panel over canvas
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [rightPanelTab, setRightPanelTab] = useState<GraphRightPanelTab>("ai");
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>(() =>
    selectedDocId ? [selectedDocId] : []
  );
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);

  // Backend mutations & file drop
  const [recomputing, setRecomputing] = useState(false);
  const [aiSyncedEdges, setAiSyncedEdges] = useState<RelationshipGraphEdge[] | null>(null);
  const [dismissingEdgeId, setDismissingEdgeId] = useState<string | null>(null);
  const [dismissedLocalIds, setDismissedLocalIds] = useState<string[]>([]);
  const [isDragOverFile, setIsDragOverFile] = useState(false);
  const [useDemoMode, setUseDemoMode] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Persistent node positions (ref to avoid full node rebuild on every drag stop) & manual edges
  const savedPositionsRef = useRef<Record<string, { x: number; y: number }>>({});
  const [posVersion, setPosVersion] = useState(0);
  const [manualEdges, setManualEdges] = useState<ManualEdgeRecord[]>([]);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const saveTimerRef = useRef<number | null>(null);
  const hasFittedRef = useRef(false);

  // Load persisted theme + default panel collapse on narrow viewports
  useEffect(() => {
    try {
      const savedTheme = window.localStorage.getItem(themeStorageKey);
      if (savedTheme === "dark" || savedTheme === "light") {
        setGraphTheme(savedTheme);
        onThemeChange?.(savedTheme);
      }
    } catch {
      // ignore storage errors
    }
    if (window.matchMedia("(max-width: 1023px)").matches) {
      setRightPanelOpen(false);
    }
  }, [onThemeChange]);

  const toggleGraphTheme = useCallback(() => {
    setGraphTheme((prev) => {
      const next: GraphThemeMode = prev === "light" ? "dark" : "light";
      try {
        window.localStorage.setItem(themeStorageKey, next);
      } catch {
        // ignore storage errors
      }
      onThemeChange?.(next);
      return next;
    });
  }, [onThemeChange]);

  const isDark = graphTheme === "dark";

  // Load persisted node positions & manual edges for this workspace
  useEffect(() => {
    try {
      const rawPos = window.localStorage.getItem(posStorageKey);
      if (rawPos) {
        const parsed = JSON.parse(rawPos) as Record<string, { x: number; y: number }>;
        if (parsed && typeof parsed === "object") {
          savedPositionsRef.current = parsed;
          setPosVersion((v) => v + 1);
        }
      }
      const rawEdges = window.localStorage.getItem(manualStorageKey);
      if (rawEdges) {
        const parsed = JSON.parse(rawEdges) as ManualEdgeRecord[];
        if (Array.isArray(parsed)) setManualEdges(parsed);
      }
    } catch {
      // ignore storage errors
    }
  }, [posStorageKey, manualStorageKey]);

  const persistPositionsDebounced = useCallback(
    (nextPos: Record<string, { x: number; y: number }>) => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = window.setTimeout(() => {
        try {
          window.localStorage.setItem(posStorageKey, JSON.stringify(nextPos));
        } catch {
          // ignore storage quota
        }
      }, 280);
    },
    [posStorageKey]
  );

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    };
  }, []);

  // Automatically leave demo mode if real documents arrive
  useEffect(() => {
    if (documents.length > 0 && useDemoMode) {
      setUseDemoMode(false);
      setDismissedLocalIds([]);
      hasFittedRef.current = false;
    }
  }, [documents.length, useDemoMode]);

  // Auto-clear transient status banner
  useEffect(() => {
    if (!statusMessage) return;
    const timer = window.setTimeout(() => setStatusMessage(null), 3200);
    return () => window.clearTimeout(timer);
  }, [statusMessage]);

  // Effective documents & edges (Real workspace OR Interactive Demo Preview)
  const isShowingDemo = documents.length === 0 && useDemoMode;

  const effectiveDocs = useMemo<DocumentItem[]>(() => {
    if (isShowingDemo) return DEMO_DOCUMENTS;
    if (documents.length > 0) return documents;
    if (relationships?.nodes?.length) {
      return relationships.nodes.map((n) => ({
        id: n.id,
        title: n.title,
        file_type: "pdf",
        page_count: n.page_count || 1,
        file_size_bytes: 0,
        processing_status: n.status || "ready",
        status: n.status || "ready",
        category: n.category || "Document",
        main_topics: n.main_topics || [],
        table_count: n.table_count || 0,
        metric_count: n.metric_count || 0,
      }));
    }
    return [];
  }, [isShowingDemo, documents, relationships]);

  const relNodeById = useMemo(() => {
    const map: Record<string, NonNullable<RelationshipGraphResponse["nodes"]>[number]> = {};
    for (const n of relationships?.nodes ?? []) {
      map[n.id] = n;
    }
    return map;
  }, [relationships]);

  const docById = useMemo(() => {
    const map: Record<string, DocumentItem> = {};
    for (const d of effectiveDocs) {
      map[d.id] = d;
    }
    return map;
  }, [effectiveDocs]);

  const rawCombinedEdges = useMemo<RelationshipGraphEdge[]>(() => {
    const validDocIds = new Set(effectiveDocs.map((d) => d.id));
    const baseEdges = isShowingDemo
      ? DEMO_EDGES
      : aiSyncedEdges ?? relationships?.edges ?? [];

    const filteredBase = baseEdges.filter(
      (e) =>
        validDocIds.has(e.source_doc_id) &&
        validDocIds.has(e.target_doc_id) &&
        !dismissedLocalIds.includes(e.id)
    );

    const validManual: RelationshipGraphEdge[] = manualEdges
      .filter(
        (m) =>
          validDocIds.has(m.source_doc_id) &&
          validDocIds.has(m.target_doc_id) &&
          !dismissedLocalIds.includes(m.id)
      )
      .map((m) => ({
        id: m.id,
        source_doc_id: m.source_doc_id,
        target_doc_id: m.target_doc_id,
        source_doc_title: docById[m.source_doc_id]?.title,
        target_doc_title: docById[m.target_doc_id]?.title,
        relationship_type: "manual",
        composite_confidence: m.composite_confidence,
        explanation: m.explanation,
      }));

    return [...filteredBase, ...validManual];
  }, [
    effectiveDocs,
    isShowingDemo,
    relationships,
    manualEdges,
    dismissedLocalIds,
    aiSyncedEdges,
    docById,
  ]);

  const visibleRelationshipEdges = rawCombinedEdges;

  // Degree count per node from visible edges
  const linkCountByDoc = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const d of effectiveDocs) counts[d.id] = 0;
    for (const e of visibleRelationshipEdges) {
      if (counts[e.source_doc_id] !== undefined) counts[e.source_doc_id] += 1;
      if (counts[e.target_doc_id] !== undefined) counts[e.target_doc_id] += 1;
    }
    return counts;
  }, [effectiveDocs, visibleRelationshipEdges]);

  // Search matching set
  const searchMatchIds = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (!q) return null;
    const set = new Set<string>();
    for (const d of effectiveDocs) {
      const rn = relNodeById[d.id];
      const topics = (d.main_topics?.length ? d.main_topics : rn?.main_topics) ?? [];
      const hay = `${d.title} ${d.category || ""} ${d.summary || ""} ${topics.join(" ")}`.toLowerCase();
      if (hay.includes(q)) set.add(d.id);
    }
    return set;
  }, [searchText, effectiveDocs, relNodeById]);

  // Ego-network focused neighborhood set
  const focusedNeighborhoodIds = useMemo(() => {
    if (!focusedHubId) return null;
    const set = new Set<string>([focusedHubId]);
    for (const e of visibleRelationshipEdges) {
      if (e.source_doc_id === focusedHubId) set.add(e.target_doc_id);
      if (e.target_doc_id === focusedHubId) set.add(e.source_doc_id);
    }
    return set;
  }, [focusedHubId, visibleRelationshipEdges]);

  const handleSelectEdge = useCallback((edgeId: string) => {
    setSelectedEdgeId(edgeId);
    setSelectedNodeIds([]);
    setRightPanelOpen(true);
  }, []);

  // Sync effectiveDocs + filters + positions into uncontrolled React Flow store (zero re-renders during drag/select)
  useEffect(() => {
    if (!flowReady) return;
    const docIds = effectiveDocs.map((d) => d.id);
    const categoriesById: Record<string, string> = {};
    for (const d of effectiveDocs) {
      categoriesById[d.id] = d.category || relNodeById[d.id]?.category || "Document";
    }

    const fallbackPositions = computeAutoLayout(
      docIds,
      categoriesById,
      visibleRelationshipEdges,
      layoutMode
    );

    setNodes((prevNodes) => {
      const prevMap = new Map(prevNodes.map((n) => [n.id, n]));
      return effectiveDocs.map((doc) => {
        const rn = relNodeById[doc.id];
        const category = doc.category || rn?.category || "Document";
        const topics = (doc.main_topics?.length ? doc.main_topics : rn?.main_topics) ?? [];
        const prevNode = prevMap.get(doc.id);
        const existingPos =
          prevNode?.position ??
          savedPositionsRef.current[doc.id] ??
          fallbackPositions[doc.id] ??
          { x: 0, y: 0 };

        const isSearchMatch = Boolean(searchMatchIds?.has(doc.id));
        const dimmedBySearch = Boolean(searchMatchIds && !isSearchMatch);
        const dimmedByFocus = Boolean(
          focusedNeighborhoodIds && !focusedNeighborhoodIds.has(doc.id)
        );

        return {
          id: doc.id,
          type: "fileNode",
          position: existingPos,
          selected: prevNode?.selected ?? false,
          data: {
            docId: doc.id,
            title: doc.title,
            category,
            fileType: doc.file_type || "pdf",
            status: doc.status || doc.processing_status || rn?.status || "ready",
            summary: doc.summary || "",
            topics,
            pageCount: doc.page_count || rn?.page_count || 1,
            tableCount: doc.table_count ?? rn?.table_count ?? 0,
            metricCount: doc.metric_count ?? rn?.metric_count ?? 0,
            linkCount: linkCountByDoc[doc.id] ?? 0,
            tone: getCategoryTone(category),
            dimmed: dimmedBySearch || dimmedByFocus,
            isSearchMatch,
            isFocusedHub: focusedHubId === doc.id,
            isDemo: isShowingDemo,
          },
        };
      });
    });
  }, [
    flowReady,
    effectiveDocs,
    relNodeById,
    visibleRelationshipEdges,
    layoutMode,
    posVersion,
    searchMatchIds,
    focusedNeighborhoodIds,
    focusedHubId,
    linkCountByDoc,
    isShowingDemo,
    setNodes,
  ]);

  // Helper to update edge handle attachment sides whenever node positions change
  const rerouteEdgeHandles = useCallback(
    (posMap: Record<string, { x: number; y: number }>) => {
      setEdges((curr) =>
        curr.map((edge) => {
          const { sourceHandle, targetHandle } = computeOptimalHandles(
            posMap[edge.source],
            posMap[edge.target]
          );
          if (
            edge.sourceHandle === sourceHandle &&
            edge.targetHandle === targetHandle
          ) {
            return edge;
          }
          return { ...edge, sourceHandle, targetHandle };
        })
      );
    },
    [setEdges]
  );

  useEffect(() => {
    if (!flowReady) return;
    const livePosMap: Record<string, { x: number; y: number }> = {
      ...savedPositionsRef.current,
    };
    for (const n of getNodes()) {
      livePosMap[n.id] = n.position;
    }

    const nextEdges: FileGraphEdge[] = visibleRelationshipEdges.map((edge) => {
      const meta = getEdgeMeta(edge.relationship_type, isDark);
      const isSelected = selectedEdgeId === edge.id;
      const dimmedByFocus = Boolean(
        focusedNeighborhoodIds &&
          !(
            focusedNeighborhoodIds.has(edge.source_doc_id) &&
            focusedNeighborhoodIds.has(edge.target_doc_id)
          )
      );
      const dimmedBySearch = Boolean(
        searchMatchIds &&
          !(
            searchMatchIds.has(edge.source_doc_id) ||
            searchMatchIds.has(edge.target_doc_id)
          )
      );
      const { sourceHandle, targetHandle } = computeOptimalHandles(
        livePosMap[edge.source_doc_id],
        livePosMap[edge.target_doc_id]
      );

      return {
        id: edge.id,
        source: edge.source_doc_id,
        target: edge.target_doc_id,
        sourceHandle,
        targetHandle,
        type: "relationshipEdge",
        selected: isSelected,
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 14,
          height: 14,
          color: isSelected ? (isDark ? "#f4f4f6" : "#18181b") : meta.color,
        },
        data: {
          edgeId: edge.id,
          sourceDocId: edge.source_doc_id,
          targetDocId: edge.target_doc_id,
          sourceTitle:
            edge.source_doc_title || docById[edge.source_doc_id]?.title || "Document",
          targetTitle:
            edge.target_doc_title || docById[edge.target_doc_id]?.title || "Document",
          relationshipType: edge.relationship_type || "semantic_similarity",
          confidence: edge.composite_confidence ?? 0.72,
          explanation:
            edge.explanation ||
            "Related documents detected across workspace semantics.",
          evidenceSummary: edge.evidence_summary,
          isDark,
          dimmed: dimmedByFocus || dimmedBySearch,
          isManual: edge.relationship_type === "manual",
          isDemo: isShowingDemo,
          onSelectEdge: handleSelectEdge,
        },
      };
    });

    setEdges(nextEdges);
  }, [
    flowReady,
    visibleRelationshipEdges,
    selectedEdgeId,
    focusedNeighborhoodIds,
    searchMatchIds,
    docById,
    isDark,
    isShowingDemo,
    handleSelectEdge,
    getNodes,
    setEdges,
  ]);

  // Fit viewport smoothly on initial load or demo toggle
  useEffect(() => {
    if (effectiveDocs.length === 0) {
      hasFittedRef.current = false;
      return;
    }
    if (!hasFittedRef.current) {
      hasFittedRef.current = true;
      window.setTimeout(() => {
        void fitView({ padding: 0.22, duration: 380, maxZoom: 1.08 });
      }, 60);
    }
  }, [effectiveDocs.length, fitView]);

  // Apply chosen Auto-Layout, re-route edge handles, and persist coordinates
  const applyLayout = useCallback(
    (mode: GraphLayoutMode) => {
      setLayoutMode(mode);
      const docIds = effectiveDocs.map((d) => d.id);
      const categoriesById: Record<string, string> = {};
      for (const d of effectiveDocs) {
        categoriesById[d.id] = d.category || relNodeById[d.id]?.category || "Document";
      }
      const nextPositions = computeAutoLayout(
        docIds,
        categoriesById,
        visibleRelationshipEdges,
        mode
      );

      savedPositionsRef.current = {
        ...savedPositionsRef.current,
        ...nextPositions,
      };
      persistPositionsDebounced(savedPositionsRef.current);

      setNodes((curr) =>
        curr.map((n) => ({
          ...n,
          position: nextPositions[n.id] ?? n.position,
        }))
      );
      rerouteEdgeHandles(savedPositionsRef.current);

      window.setTimeout(() => {
        void fitView({ padding: 0.22, duration: 360, maxZoom: 1.08 });
      }, 40);
    },
    [
      effectiveDocs,
      relNodeById,
      visibleRelationshipEdges,
      persistPositionsDebounced,
      setNodes,
      rerouteEdgeHandles,
      fitView,
    ]
  );

  // One-click "Auto Tidy" connected-component tidy engine (clusters connected nodes cleanly, zero overlaps)
  const autoTidyGraph = useCallback(
    (extraEdges?: Array<{ source_doc_id: string; target_doc_id: string }>) => {
      const docIds = effectiveDocs.map((d) => d.id);
      if (docIds.length === 0) return;
      const allEdges = extraEdges
        ? [...visibleRelationshipEdges, ...extraEdges]
        : visibleRelationshipEdges;

      const tidyPositions = computeTidyConnectedLayout(docIds, allEdges);
      savedPositionsRef.current = {
        ...savedPositionsRef.current,
        ...tidyPositions,
      };
      persistPositionsDebounced(savedPositionsRef.current);

      setNodes((curr) =>
        curr.map((n) => ({
          ...n,
          position: tidyPositions[n.id] ?? n.position,
        }))
      );
      rerouteEdgeHandles(savedPositionsRef.current);
      setStatusMessage("Graph automatically arranged by node connections.");

      window.setTimeout(() => {
        void fitView({ padding: 0.2, duration: 380, maxZoom: 1.08 });
      }, 40);
    },
    [
      effectiveDocs,
      visibleRelationshipEdges,
      persistPositionsDebounced,
      setNodes,
      rerouteEdgeHandles,
      fitView,
    ]
  );

  // Persist dragged node positions cleanly & snap edge handles to nearest facing sides
  const handleNodeDragStop: OnNodeDrag<FileGraphNode> = useCallback(
    (_event, _node, draggedNodes) => {
      const next = { ...savedPositionsRef.current };
      for (const n of getNodes()) {
        next[n.id] = {
          x: Math.round(n.position.x),
          y: Math.round(n.position.y),
        };
      }
      for (const dn of draggedNodes) {
        next[dn.id] = {
          x: Math.round(dn.position.x),
          y: Math.round(dn.position.y),
        };
      }
      savedPositionsRef.current = next;
      persistPositionsDebounced(next);
      rerouteEdgeHandles(next);
    },
    [getNodes, persistPositionsDebounced, rerouteEdgeHandles]
  );

  // Manual wire connection between any two file nodes: auto-adjusts target position & facing handles cleanly!
  const handleConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return;
      if (connection.source === connection.target) return;

      const srcTitle = docById[connection.source]?.title || "Document";
      const tgtTitle = docById[connection.target]?.title || "Document";

      const exists = rawCombinedEdges.some(
        (e) =>
          (e.source_doc_id === connection.source &&
            e.target_doc_id === connection.target) ||
          (e.source_doc_id === connection.target &&
            e.target_doc_id === connection.source)
      );

      if (exists) {
        setStatusMessage("These two files are already connected.");
        return;
      }

      // 1. Smartly adjust connected node position (separate overlap, pull distant node closer, snap clean alignment)
      const currentPosMap: Record<string, { x: number; y: number }> = {
        ...savedPositionsRef.current,
      };
      for (const n of getNodes()) {
        currentPosMap[n.id] = {
          x: Math.round(n.position.x),
          y: Math.round(n.position.y),
        };
      }
      const adjustedPosMap = adjustConnectedNodePosition(
        connection.source,
        connection.target,
        currentPosMap
      );
      savedPositionsRef.current = adjustedPosMap;
      persistPositionsDebounced(adjustedPosMap);

      setNodes((curr) =>
        curr.map((n) =>
          adjustedPosMap[n.id]
            ? { ...n, position: adjustedPosMap[n.id] }
            : n
        )
      );

      // 2. Create manual edge record (useEffect immediately mounts with optimal facing handles)
      const newEdge: ManualEdgeRecord = {
        id: `manual-${connection.source}-${connection.target}-${Date.now()}`,
        source_doc_id: connection.source,
        target_doc_id: connection.target,
        relationship_type: "manual",
        composite_confidence: 1.0,
        explanation: `Manually linked "${srcTitle}" with "${tgtTitle}" on the graph canvas.`,
      };

      setManualEdges((prev) => {
        const next = [...prev, newEdge];
        try {
          window.localStorage.setItem(manualStorageKey, JSON.stringify(next));
        } catch {
          // ignore storage quota
        }
        return next;
      });

      // Re-route existing edges immediately for the adjusted target position
      rerouteEdgeHandles(adjustedPosMap);

      setSelectedEdgeId(newEdge.id);
      setSelectedNodeIds([]);
      setRightPanelOpen(true);
      setRightPanelTab("detail");
      setStatusMessage("Nodes connected and aligned. Click Auto Tidy to arrange all.");
      void dashboardApi
        .createManualRelationshipLink({
          source_doc_id: connection.source,
          target_doc_id: connection.target,
          relationship_type: "explicit_reference",
          explanation: `Linked "${srcTitle}" with "${tgtTitle}" on workspace canvas.`,
        })
        .catch(() => {});
    },
    [
      docById,
      rawCombinedEdges,
      manualStorageKey,
      getNodes,
      persistPositionsDebounced,
      setNodes,
      rerouteEdgeHandles,
    ]
  );

  // Dismiss an edge (backend PATCH /relationships/{id}/dismiss OR remove manual link)
  const handleDismissEdge = useCallback(
    async (edgeId: string) => {
      const targetEdge = rawCombinedEdges.find((e) => e.id === edgeId);
      if (!targetEdge) return;

      if (targetEdge.relationship_type === "manual") {
        setManualEdges((prev) => {
          const next = prev.filter((m) => m.id !== edgeId);
          try {
            window.localStorage.setItem(manualStorageKey, JSON.stringify(next));
          } catch {
            // ignore
          }
          return next;
        });
        setSelectedEdgeId(null);
        setStatusMessage("Manual link removed.");
        return;
      }

      if (isShowingDemo) {
        setDismissedLocalIds((prev) => [...prev, edgeId]);
        setSelectedEdgeId(null);
        setStatusMessage("Sample relationship dismissed.");
        return;
      }

      setDismissingEdgeId(edgeId);
      try {
        await onDismissRelationship?.(edgeId);
        setDismissedLocalIds((prev) => [...prev, edgeId]);
        setSelectedEdgeId(null);
        setStatusMessage("Relationship dismissed.");
      } catch (err) {
        setStatusMessage(
          err instanceof Error ? err.message : "Failed to dismiss relationship."
        );
      } finally {
        setDismissingEdgeId(null);
      }
    },
    [rawCombinedEdges, manualStorageKey, isShowingDemo, onDismissRelationship]
  );

  // Semantic AI Auto-Connect: analyzes content/chunks across canvas docs & draws edges live
  const handleAiAutoConnect = useCallback(
    async (focusPrompt?: string) => {
      const targetIds =
        selectedNodeIds.length >= 2
          ? selectedNodeIds.filter((id) => docById[id])
          : undefined;
      const res = await dashboardApi.aiConnectRelationships({
        document_ids: targetIds,
        focus_prompt: focusPrompt,
      });
      if (Array.isArray(res.edges)) {
        setAiSyncedEdges(res.edges);
        setDismissedLocalIds([]);
      }
      if (res.discovered_count > 0) {
        setStatusMessage(
          `AI connected ${res.discovered_count} content-based relationship(s).`
        );
      } else {
        setStatusMessage(res.summary || "Graph link analysis completed.");
      }
      return {
        summary: res.summary,
        discoveredCount: res.discovered_count,
        links: (res.new_edges || []).map((e) => ({
          sourceTitle:
            e.source_doc_title || docById[e.source_doc_id]?.title || "Document A",
          targetTitle:
            e.target_doc_title || docById[e.target_doc_id]?.title || "Document B",
          type: e.relationship_type || "composite_related",
          explanation: e.explanation || "Related by content.",
        })),
      };
    },
    [selectedNodeIds, docById]
  );

  // Recompute backend graph relationships
  const handleRecompute = useCallback(async () => {
    if (isShowingDemo) {
      applyLayout(layoutMode);
      setStatusMessage("Sample layout refreshed.");
      return;
    }
    setRecomputing(true);
    try {
      await onRecomputeRelationships();
      setAiSyncedEdges(null);
      setDismissedLocalIds([]);
      setStatusMessage("Relationships recomputed from workspace documents.");
    } catch (err) {
      setStatusMessage(
        err instanceof Error ? err.message : "Failed to recompute graph."
      );
    } finally {
      setRecomputing(false);
    }
  }, [isShowingDemo, applyLayout, layoutMode, onRecomputeRelationships]);

  // Smoothly focus camera onto a specific file node (reads via getNodes() so dragging never recreates callback)
  const focusNodeCamera = useCallback(
    (docId: string) => {
      const target = getNodes().find((n) => n.id === docId);
      if (!target) return;
      setSelectedNodeIds([docId]);
      setSelectedEdgeId(null);
      setRightPanelOpen(true);
      onSelectDoc?.(docId);
      void setCenter(target.position.x + 136, target.position.y + 84, {
        zoom: 1.05,
        duration: 380,
      });
    },
    [getNodes, setCenter, onSelectDoc]
  );

  // Multi-select Figma Alignment actions
  const alignSelectedNodes = useCallback(
    (axis: "horizontal" | "vertical") => {
      if (selectedNodeIds.length < 2) return;
      const selected = getNodes().filter((n) => selectedNodeIds.includes(n.id));
      if (selected.length < 2) return;

      const updatedPos: Record<string, { x: number; y: number }> = {};

      if (axis === "horizontal") {
        const avgY = Math.round(
          selected.reduce((sum, n) => sum + n.position.y, 0) / selected.length
        );
        const sortedX = [...selected].sort((a, b) => a.position.x - b.position.x);
        const startX = sortedX[0].position.x;
        sortedX.forEach((n, idx) => {
          updatedPos[n.id] = { x: Math.round(startX + idx * 320), y: avgY };
        });
      } else {
        const avgX = Math.round(
          selected.reduce((sum, n) => sum + n.position.x, 0) / selected.length
        );
        const sortedY = [...selected].sort((a, b) => a.position.y - b.position.y);
        const startY = sortedY[0].position.y;
        sortedY.forEach((n, idx) => {
          updatedPos[n.id] = { x: avgX, y: Math.round(startY + idx * 224) };
        });
      }

      setNodes((curr) =>
        curr.map((n) =>
          updatedPos[n.id] ? { ...n, position: updatedPos[n.id] } : n
        )
      );
      savedPositionsRef.current = {
        ...savedPositionsRef.current,
        ...updatedPos,
      };
      persistPositionsDebounced(savedPositionsRef.current);
      setStatusMessage(
        axis === "horizontal"
          ? "Aligned selected files horizontally."
          : "Aligned selected files vertically."
      );
    },
    [selectedNodeIds, getNodes, setNodes, persistPositionsDebounced]
  );

  const linkSelectedNodes = useCallback(() => {
    if (selectedNodeIds.length < 2) return;
    let addedCount = 0;
    const nextManual: ManualEdgeRecord[] = [...manualEdges];

    for (let i = 0; i < selectedNodeIds.length - 1; i += 1) {
      const a = selectedNodeIds[i];
      const b = selectedNodeIds[i + 1];
      const alreadyExists =
        rawCombinedEdges.some(
          (e) =>
            (e.source_doc_id === a && e.target_doc_id === b) ||
            (e.source_doc_id === b && e.target_doc_id === a)
        ) ||
        nextManual.some(
          (e) =>
            (e.source_doc_id === a && e.target_doc_id === b) ||
            (e.source_doc_id === b && e.target_doc_id === a)
        );
      if (!alreadyExists) {
        nextManual.push({
          id: `manual-${a}-${b}-${Date.now()}-${i}`,
          source_doc_id: a,
          target_doc_id: b,
          relationship_type: "manual",
          composite_confidence: 1.0,
          explanation: `Manually linked "${docById[a]?.title || "File"}" with "${
            docById[b]?.title || "File"
          }".`,
        });
        addedCount += 1;
      }
    }

    if (addedCount > 0) {
      setManualEdges(nextManual);
      try {
        window.localStorage.setItem(manualStorageKey, JSON.stringify(nextManual));
      } catch {
        // ignore
      }
      setStatusMessage(`Created ${addedCount} manual link${addedCount > 1 ? "s" : ""}.`);
    } else {
      setStatusMessage("Selected files are already linked.");
    }
  }, [selectedNodeIds, manualEdges, rawCombinedEdges, docById, manualStorageKey]);

  // Figma Keyboard Shortcuts (V = Select, H = Hand, F = Fit, Space = Temp Pan, Esc = Clear)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
        return;
      }

      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      if (
        tag === "input" ||
        tag === "textarea" ||
        tag === "select" ||
        target?.isContentEditable
      ) {
        return;
      }

      if (e.code === "Space" && !e.repeat) {
        e.preventDefault();
        setSpacePressed(true);
        return;
      }

      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const key = e.key.toLowerCase();
      if (key === "v") {
        e.preventDefault();
        setToolMode("select");
      } else if (key === "h") {
        e.preventDefault();
        setToolMode("hand");
      } else if (key === "f") {
        e.preventDefault();
        void fitView({ padding: 0.22, duration: 360, maxZoom: 1.08 });
      } else if (key === "r") {
        e.preventDefault();
        autoTidyGraph();
      } else if (key === "escape") {
        setSelectedNodeIds([]);
        setSelectedEdgeId(null);
        setFocusedHubId(null);
      } else if (key === "=" || key === "+") {
        e.preventDefault();
        void zoomIn({ duration: 180 });
      } else if (key === "-") {
        e.preventDefault();
        void zoomOut({ duration: 180 });
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        setSpacePressed(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [fitView, autoTidyGraph, zoomIn, zoomOut]);

  // Selection sync from React Flow clicks / marquee (local-only to prevent parent DashboardPage re-render & HTTP status polling during drag)
  const handleSelectionChange = useCallback(
    ({
      nodes: selNodes,
      edges: selEdges,
    }: {
      nodes: FileGraphNode[];
      edges: FileGraphEdge[];
    }) => {
      const nextNodeIds = selNodes.map((n) => n.id);
      setSelectedNodeIds((prev) =>
        prev.length === nextNodeIds.length &&
        prev.every((id, i) => id === nextNodeIds[i])
          ? prev
          : nextNodeIds
      );
      if (nextNodeIds.length > 0) {
        setSelectedEdgeId((prev) => (prev === null ? prev : null));
      } else if (selEdges.length > 0) {
        const edgeId = selEdges[0].id;
        setSelectedEdgeId((prev) => (prev === edgeId ? prev : edgeId));
      } else {
        setSelectedEdgeId((prev) => (prev === null ? prev : null));
      }
    },
    []
  );

  // Selected entity resolution for Right Inspector
  const singleSelectedDoc =
    selectedNodeIds.length === 1 ? docById[selectedNodeIds[0]] ?? null : null;
  const selectedEdgeObj = selectedEdgeId
    ? rawCombinedEdges.find((e) => e.id === selectedEdgeId) ?? null
    : null;

  const connectedNeighbors = useMemo(() => {
    if (!singleSelectedDoc) return [];
    const list: Array<{
      neighbor: DocumentItem;
      edge: RelationshipGraphEdge;
    }> = [];
    for (const e of visibleRelationshipEdges) {
      if (e.source_doc_id === singleSelectedDoc.id && docById[e.target_doc_id]) {
        list.push({ neighbor: docById[e.target_doc_id], edge: e });
      } else if (
        e.target_doc_id === singleSelectedDoc.id &&
        docById[e.source_doc_id]
      ) {
        list.push({ neighbor: docById[e.source_doc_id], edge: e });
      }
    }
    return list.sort(
      (a, b) =>
        (b.edge.composite_confidence ?? 0) - (a.edge.composite_confidence ?? 0)
    );
  }, [singleSelectedDoc, visibleRelationshipEdges, docById]);

  const hasSelection =
    selectedNodeIds.length > 0 || selectedEdgeObj !== null;

  const isHandActive = toolMode === "hand" || spacePressed;

  const cycleLayout = useCallback(() => {
    const order: GraphLayoutMode[] = ["cluster", "flow", "grid"];
    const next = order[(order.indexOf(layoutMode) + 1) % order.length];
    applyLayout(next);
  }, [applyLayout, layoutMode]);

  // Drag & drop PDF/CSV directly onto the infinite canvas
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    if (e.dataTransfer.types.includes("Files")) {
      e.preventDefault();
      if (!isDragOverFile) setIsDragOverFile(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    if (e.currentTarget === e.target) {
      setIsDragOverFile(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    if (!e.dataTransfer.files?.length) return;
    e.preventDefault();
    setIsDragOverFile(false);
    const file = e.dataTransfer.files[0];
    if (file && onDropFile) {
      onDropFile(file);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchMatchIds || searchMatchIds.size === 0) return;
    const firstId = Array.from(searchMatchIds)[0];
    focusNodeCamera(firstId);
  };

  const handleMoveEnd = useCallback((_event: unknown, viewport: Viewport) => {
    const next = Math.round(viewport.zoom * 100);
    setZoomPct((prev) => (prev === next ? prev : next));
  }, []);

  const handleNodeDoubleClick = useCallback(
    (_e: React.MouseEvent, node: FileGraphNode) => {
      focusNodeCamera(node.id);
    },
    [focusNodeCamera]
  );

  const handleEdgeClick = useCallback(
    (_e: React.MouseEvent, edge: FileGraphEdge) => {
      handleSelectEdge(edge.id);
    },
    [handleSelectEdge]
  );

  const handlePaneClick = useCallback(() => {
    setSelectedNodeIds((prev) => (prev.length === 0 ? prev : []));
    setSelectedEdgeId((prev) => (prev === null ? prev : null));
    setFocusedHubId((prev) => (prev === null ? prev : null));
  }, []);

  const handleFlowInit = useCallback(() => {
    setFlowReady(true);
  }, []);

  const handleCloseRightPanel = useCallback(() => {
    setRightPanelOpen(false);
  }, []);

  return (
    <div
      className={`gc-viewport ${isHandActive ? "gc-viewport--hand" : ""} ${
        rightPanelOpen ? "gc-viewport--panel-open" : ""
      } ${isDragOverFile ? "gc-viewport--dragover" : ""}`}
      data-graph-theme={graphTheme}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      role="region"
      aria-label="Knowledge Graph Canvas"
    >
      {isDragOverFile && (
        <div className="gc-drop-toast">
          <Upload size={16} />
          <span>Drop files anywhere to add them to the graph</span>
        </div>
      )}

      {/* ====================================================================
          SIMPLIFIED TOP BAR: MOST-USED ACTIONS + LIGHT / DARK THEME
          ==================================================================== */}
      <header className="gc-hud-top">
        {/* Left: Title + Count + Quick Search */}
        <div className="gc-island gc-island--left">
          <div className="gc-title-cluster">
            <span className="gc-brand-badge" aria-hidden="true">
              <Network size={14} />
            </span>
            <div className="gc-title-meta">
              <span className="gc-title-main">Knowledge Graph</span>
              <span className="gc-title-sub">
                {effectiveDocs.length} files · {visibleRelationshipEdges.length}{" "}
                links
              </span>
            </div>
          </div>

          {isShowingDemo && (
            <div className="gc-demo-pill">
              <span>Preview</span>
              <button
                type="button"
                className="gc-demo-clear"
                onClick={() => {
                  setUseDemoMode(false);
                  setSelectedNodeIds([]);
                  setSelectedEdgeId(null);
                  setFocusedHubId(null);
                }}
              >
                Close
              </button>
            </div>
          )}

          <span className="gc-brand-sep" aria-hidden="true" />

          <form className="gc-search-box" onSubmit={handleSearchSubmit}>
            <Search size={13} className="gc-search-icon" />
            <input
              ref={searchInputRef}
              type="text"
              className="gc-search-input"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Search files or topics..."
              aria-label="Search files on graph canvas"
            />
            {searchText && (
              <button
                type="button"
                className="gc-search-clear"
                aria-label="Clear search"
                onClick={() => setSearchText("")}
              >
                <X size={10} />
              </button>
            )}
          </form>
        </div>

        {/* Right: Upload, Recompute, Layout, Theme Toggle & AI Panel Toggle */}
        <div className="gc-island gc-island--right">
          <button
            type="button"
            className="gc-action-btn gc-action-btn--primary"
            onClick={onTriggerUpload}
            disabled={uploading}
          >
            {uploading ? (
              <Loader2 size={13} className="gc-spin" />
            ) : (
              <Upload size={13} />
            )}
            <span>{uploading ? "Uploading..." : "Upload"}</span>
          </button>

          <button
            type="button"
            className="gc-action-btn"
            onClick={() => {
              void handleRecompute();
            }}
            disabled={recomputing || effectiveDocs.length < 2}
            title="Recompute relationships across documents"
          >
            <RefreshCw size={13} className={recomputing ? "gc-spin" : undefined} />
            <span className="gc-hide-sm">
              {recomputing ? "Syncing..." : "Sync"}
            </span>
          </button>

          <button
            type="button"
            className="gc-action-btn"
            onClick={() => autoTidyGraph()}
            disabled={effectiveDocs.length === 0}
            title="Auto arrange all connected nodes and edges (R)"
          >
            <Grid2x2 size={13} />
            <span className="gc-hide-sm">Auto Tidy</span>
          </button>

          <button
            type="button"
            className="gc-action-btn"
            onClick={cycleLayout}
            title={`Switch layout (Current: ${layoutMode})`}
          >
            {layoutMode === "flow" ? (
              <GitBranch size={13} />
            ) : layoutMode === "grid" ? (
              <LayoutGrid size={13} />
            ) : (
              <Network size={13} />
            )}
            <span className="gc-hide-sm">
              {layoutMode === "cluster"
                ? "Cluster"
                : layoutMode === "flow"
                ? "Flow"
                : "Grid"}
            </span>
          </button>

          <span className="gc-brand-sep" aria-hidden="true" />

          {/* Light / Dark Theme Switch */}
          <button
            type="button"
            className="gc-theme-btn"
            onClick={toggleGraphTheme}
            aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
            title={isDark ? "Light Theme" : "Dark Theme"}
          >
            {isDark ? <Sun size={14} /> : <Moon size={14} />}
            <span className="gc-hide-sm">{isDark ? "Light" : "Dark"}</span>
          </button>

          {/* Floating AI Overlay Toggle */}
          <button
            type="button"
            className={`gc-action-btn gc-ai-toggle-btn ${
              rightPanelOpen ? "gc-action-btn--active" : ""
            }`}
            onClick={() => {
              if (!rightPanelOpen) {
                setRightPanelTab("ai");
                setRightPanelOpen(true);
              } else {
                setRightPanelOpen(false);
              }
            }}
            title={rightPanelOpen ? "Close AI panel" : "Open AI over canvas"}
          >
            <ThinkingOrbStage
              state={rightPanelOpen ? "working" : "idle"}
              variant={rightPanelOpen ? "default" : "blink"}
              size={15}
              paused={true}
              showLabel={false}
            />
            <span>AI</span>
          </button>
        </div>
      </header>

      {/* Transient Status / Error Banner */}
      {(uploadError || statusMessage) && (
        <div
          className={`gc-status-pill ${
            uploadError ? "gc-status-pill--error" : ""
          }`}
          role="status"
        >
          {uploadError ? <AlertTriangle size={13} /> : <Waypoints size={13} />}
          <span>{uploadError || statusMessage}</span>
          {!uploadError &&
            statusMessage?.toLowerCase().includes("auto tidy") && (
              <button
                type="button"
                className="gc-status-link"
                onClick={() => autoTidyGraph()}
              >
                Auto Tidy
              </button>
            )}
        </div>
      )}

      {/* Helpful Prompt When Real Files Exist But Zero Links Have Been Computed Yet */}
      {!isShowingDemo &&
        effectiveDocs.length >= 2 &&
        rawCombinedEdges.length === 0 &&
        !statusMessage &&
        !uploadError && (
          <div className="gc-status-pill">
            <span>No automatic links yet. Drag between nodes or sync relationships.</span>
            <button
              type="button"
              className="gc-status-link"
              onClick={() => {
                void handleRecompute();
              }}
              disabled={recomputing}
            >
              {recomputing ? "Syncing..." : "Sync Graph"}
            </button>
          </div>
        )}

      {/* ====================================================================
          INFINITE REACT FLOW CANVAS
          ==================================================================== */}
      <div className="gc-flow-host">
        <ReactFlow<FileGraphNode, FileGraphEdge>
          defaultNodes={EMPTY_NODES}
          defaultEdges={EMPTY_EDGES}
          nodeTypes={NODE_TYPES}
          edgeTypes={EDGE_TYPES}
          onInit={handleFlowInit}
          onConnect={handleConnect}
          onNodeDragStop={handleNodeDragStop}
          onSelectionChange={handleSelectionChange}
          onNodeDoubleClick={handleNodeDoubleClick}
          onEdgeClick={handleEdgeClick}
          onPaneClick={handlePaneClick}
          onMoveEnd={handleMoveEnd}
          forceColorMode={graphTheme}
          connectionMode={ConnectionMode.Loose}
          selectionMode={SelectionMode.Partial}
          selectionOnDrag={toolMode === "select" && !spacePressed}
          panOnDrag={isHandActive ? true : PAN_ON_DRAG_BUTTONS}
          zoomOnScroll
          zoomOnPinch
          paneDragThreshold={1}
          minZoom={0.18}
          maxZoom={2.2}
          onlyRenderVisibleElements={effectiveDocs.length > 40}
          proOptions={PRO_OPTIONS}
        />
      </div>

      {/* Clean Empty Workspace Floating Onboarding */}
      {effectiveDocs.length === 0 && (
        <div className="gc-empty-overlay">
          <span className="gc-empty-icon-wrap" aria-hidden="true">
            <Network size={22} />
          </span>
          <h2 className="gc-empty-title">No documents in your Graph yet</h2>
          <p className="gc-empty-desc">
            Upload PDF or CSV files to visually map topics, entities, and
            cross-document relationships, or explore the interactive preview now.
          </p>
          <div className="gc-empty-actions">
            <button
              type="button"
              className="gc-action-btn gc-action-btn--primary"
              onClick={onTriggerUpload}
              disabled={uploading}
            >
              <Upload size={13} />
              <span>Upload Documents</span>
            </button>
            <button
              type="button"
              className="gc-action-btn"
              onClick={() => {
                setUseDemoMode(true);
                hasFittedRef.current = false;
              }}
            >
              <Waypoints size={13} />
              <span>Try Sample Graph</span>
            </button>
          </div>
        </div>
      )}

      {/* ====================================================================
          SIMPLE FLOATING BOTTOM CONTROL PILL
          ==================================================================== */}
      <div
        className="gc-dock-bottom"
        role="toolbar"
        aria-label="Graph Canvas Controls"
      >
        <button
          type="button"
          className={`gc-tool-btn gc-tool-btn--icon ${
            toolMode === "select" && !spacePressed ? "gc-tool-btn--active" : ""
          }`}
          onClick={() => setToolMode("select")}
          aria-label="Select mode"
          title="Select (V)"
        >
          <MousePointer2 size={14} />
        </button>

        <button
          type="button"
          className={`gc-tool-btn gc-tool-btn--icon ${
            isHandActive ? "gc-tool-btn--active" : ""
          }`}
          onClick={() => setToolMode("hand")}
          aria-label="Pan canvas mode"
          title="Pan Canvas (H)"
        >
          <Hand size={14} />
        </button>

        <span className="gc-brand-sep" aria-hidden="true" />

        <button
          type="button"
          className="gc-tool-btn gc-tool-btn--icon"
          aria-label="Zoom out"
          title="Zoom out (-)"
          onClick={() => {
            void zoomOut({ duration: 180 });
          }}
        >
          <Minus size={14} />
        </button>

        <button
          type="button"
          className="gc-zoom-readout"
          onClick={() => {
            void zoomTo(1, { duration: 220 });
            setZoomPct(100);
          }}
          title="Reset zoom to 100%"
        >
          {zoomPct}%
        </button>

        <button
          type="button"
          className="gc-tool-btn gc-tool-btn--icon"
          aria-label="Zoom in"
          title="Zoom in (+)"
          onClick={() => {
            void zoomIn({ duration: 180 });
          }}
        >
          <Plus size={14} />
        </button>

        <button
          type="button"
          className="gc-tool-btn"
          onClick={() => {
            void fitView({ padding: 0.22, duration: 360, maxZoom: 1.08 });
          }}
          title="Fit all nodes to screen (F)"
        >
          <Maximize2 size={13} />
          <span>Fit</span>
        </button>

        <button
          type="button"
          className="gc-tool-btn"
          onClick={() => autoTidyGraph()}
          disabled={effectiveDocs.length === 0}
          title="Auto arrange connected nodes and edges (R)"
        >
          <Grid2x2 size={13} />
          <span>Tidy</span>
        </button>
      </div>

      {/* ====================================================================
          RIGHT FLOATING AI OVERLAY & NODE/EDGE DETAIL OVER CANVAS
          ==================================================================== */}
      {rightPanelOpen && (
        <GraphAIPanel
          documents={effectiveDocs}
          selectedDocIds={selectedNodeIds}
          selectedEdge={selectedEdgeObj}
          isDemoMode={isShowingDemo}
          activeTab={rightPanelTab}
          onChangeTab={setRightPanelTab}
          hasSelection={hasSelection}
          onFocusNode={focusNodeCamera}
          onAiAutoConnect={handleAiAutoConnect}
          onClose={handleCloseRightPanel}
          detailContent={
            rightPanelTab !== "detail" ? null : (
            <>
              {/* CASE 1: Selected Relationship Edge */}
              {selectedEdgeObj ? (
                <>
                  {(() => {
                    const meta = getEdgeMeta(
                      selectedEdgeObj.relationship_type,
                      isDark
                    );
                  const confPct = Math.round(
                    (selectedEdgeObj.composite_confidence ?? 0.72) * 100
                  );
                  const srcTitle =
                    selectedEdgeObj.source_doc_title ||
                    docById[selectedEdgeObj.source_doc_id]?.title ||
                    "Source Document";
                  const tgtTitle =
                    selectedEdgeObj.target_doc_title ||
                    docById[selectedEdgeObj.target_doc_id]?.title ||
                    "Target Document";
                  const sharedTopics =
                    selectedEdgeObj.evidence_summary?.shared_topics ?? [];
                  const sharedEntities =
                    selectedEdgeObj.evidence_summary?.shared_entity_count ?? 0;
                  const semSim =
                    selectedEdgeObj.evidence_summary?.semantic_similarity;

                  return (
                    <>
                      <div className="gc-edge-pair-card">
                        <button
                          type="button"
                          className="gc-neighbor-item"
                          onClick={() =>
                            focusNodeCamera(selectedEdgeObj.source_doc_id)
                          }
                        >
                          <span className="gc-neighbor-name">{srcTitle}</span>
                          <ArrowRight size={12} />
                        </button>
                        <div className="gc-edge-arrow-row">
                          <span className={`gc-dot gc-dot--${meta.toneClass}`} />
                          <span>{meta.label}</span>
                        </div>
                        <button
                          type="button"
                          className="gc-neighbor-item"
                          onClick={() =>
                            focusNodeCamera(selectedEdgeObj.target_doc_id)
                          }
                        >
                          <span className="gc-neighbor-name">{tgtTitle}</span>
                          <ArrowRight size={12} />
                        </button>
                      </div>

                      <div className="gc-conf-meter">
                        <div className="gc-conf-meter-row">
                          <span>Confidence Score</span>
                          <span>{confPct}%</span>
                        </div>
                        <div className="gc-conf-track">
                          <div
                            className={`gc-conf-fill gc-conf-fill--${meta.toneClass}`}
                            style={{ width: `${Math.min(100, confPct)}%` }}
                          />
                        </div>
                      </div>

                      <div className="gc-insp-section">
                        <span className="gc-insp-section-title">
                          Relationship Evidence
                        </span>
                        <p className="gc-insp-sub">
                          {selectedEdgeObj.explanation ||
                            "Detected semantic and topical overlap between these two workspace files."}
                        </p>

                        {sharedTopics.length > 0 && (
                          <div className="gc-node-topics">
                            {sharedTopics.map((topic) => (
                              <span key={topic} className="gc-topic-pill">
                                {topic}
                              </span>
                            ))}
                          </div>
                        )}

                        {(sharedEntities > 0 || typeof semSim === "number") && (
                          <div className="gc-insp-stat-grid">
                            <div className="gc-insp-stat">
                              <span className="gc-insp-stat-val">
                                {sharedTopics.length}
                              </span>
                              <span className="gc-insp-stat-lbl">Topics</span>
                            </div>
                            <div className="gc-insp-stat">
                              <span className="gc-insp-stat-val">
                                {sharedEntities}
                              </span>
                              <span className="gc-insp-stat-lbl">Entities</span>
                            </div>
                            <div className="gc-insp-stat">
                              <span className="gc-insp-stat-val">
                                {typeof semSim === "number"
                                  ? `${Math.round(semSim * 100)}%`
                                  : `${confPct}%`}
                              </span>
                              <span className="gc-insp-stat-lbl">Cosine</span>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="gc-insp-btn-stack">
                        {!isShowingDemo && onCompareInSynthesis && (
                          <button
                            type="button"
                            className="gc-insp-btn gc-insp-btn--primary"
                            onClick={() =>
                              onCompareInSynthesis([
                                selectedEdgeObj.source_doc_id,
                                selectedEdgeObj.target_doc_id,
                              ])
                            }
                          >
                            <GitCompare size={13} />
                            <span>Compare Pair in Synthesis</span>
                          </button>
                        )}
                        <button
                          type="button"
                          className="gc-insp-btn gc-insp-btn--danger"
                          disabled={dismissingEdgeId === selectedEdgeObj.id}
                          onClick={() => {
                            void handleDismissEdge(selectedEdgeObj.id);
                          }}
                        >
                          <Trash2 size={13} />
                          <span>
                            {dismissingEdgeId === selectedEdgeObj.id
                              ? "Dismissing..."
                              : selectedEdgeObj.relationship_type === "manual"
                              ? "Remove Manual Link"
                              : "Dismiss Relationship"}
                          </span>
                        </button>
                      </div>
                    </>
                  );
                })()}
              </>
            ) : selectedNodeIds.length > 1 ? (
              /* CASE 2: Multi-Node Marquee Selection */
              <>
                <div>
                  <h3 className="gc-insp-title">
                    {selectedNodeIds.length} Files Selected
                  </h3>
                  <p className="gc-insp-sub">
                    Align frames cleanly like Figma, link them together, or run
                    cross-document synthesis.
                  </p>
                </div>

                <div className="gc-insp-section">
                  <span className="gc-insp-section-title">Arrange &amp; Align</span>
                  <div className="gc-insp-btn-row">
                    <button
                      type="button"
                      className="gc-insp-btn"
                      onClick={() => alignSelectedNodes("horizontal")}
                    >
                      <AlignHorizontalJustifyCenter size={13} />
                      <span>Align Row</span>
                    </button>
                    <button
                      type="button"
                      className="gc-insp-btn"
                      onClick={() => alignSelectedNodes("vertical")}
                    >
                      <AlignVerticalJustifyCenter size={13} />
                      <span>Align Col</span>
                    </button>
                  </div>
                </div>

                <div className="gc-insp-btn-stack">
                  <button
                    type="button"
                    className="gc-insp-btn gc-insp-btn--accent"
                    onClick={linkSelectedNodes}
                  >
                    <Link2 size={13} />
                    <span>Link Selected Files</span>
                  </button>

                  {!isShowingDemo &&
                    onCompareInSynthesis &&
                    selectedNodeIds.length >= 2 &&
                    selectedNodeIds.length <= 6 && (
                      <button
                        type="button"
                        className="gc-insp-btn gc-insp-btn--primary"
                        onClick={() => onCompareInSynthesis(selectedNodeIds)}
                      >
                        <GitCompare size={13} />
                        <span>Compare in Synthesis</span>
                      </button>
                    )}
                </div>

                <div className="gc-insp-section">
                  <span className="gc-insp-section-title">Selected Nodes</span>
                  <div className="gc-neighbor-list">
                    {selectedNodeIds.map((id) => {
                      const d = docById[id];
                      if (!d) return null;
                      return (
                        <button
                          key={id}
                          type="button"
                          className="gc-neighbor-item"
                          onClick={() => focusNodeCamera(id)}
                        >
                          <div className="gc-neighbor-meta">
                            <span className="gc-neighbor-name">{d.title}</span>
                            <span className="gc-neighbor-rel">
                              {formatCategoryLabel(d.category)} · {d.page_count}p
                            </span>
                          </div>
                          <Crosshair size={13} />
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            ) : singleSelectedDoc ? (
              /* CASE 3: Single Selected File Node */
              <>
                <div>
                  <h3 className="gc-insp-title">{singleSelectedDoc.title}</h3>
                  <p className="gc-insp-sub">
                    {singleSelectedDoc.summary ||
                      "Indexed workspace document mapped on the relationship canvas."}
                  </p>
                </div>

                <div className="gc-insp-stat-grid">
                  <div className="gc-insp-stat">
                    <span className="gc-insp-stat-val">
                      {singleSelectedDoc.page_count || 1}
                    </span>
                    <span className="gc-insp-stat-lbl">Pages</span>
                  </div>
                  <div className="gc-insp-stat">
                    <span className="gc-insp-stat-val">
                      {singleSelectedDoc.table_count ?? 0}
                    </span>
                    <span className="gc-insp-stat-lbl">Tables</span>
                  </div>
                  <div className="gc-insp-stat">
                    <span className="gc-insp-stat-val">
                      {connectedNeighbors.length}
                    </span>
                    <span className="gc-insp-stat-lbl">Links</span>
                  </div>
                </div>

                {((singleSelectedDoc.main_topics?.length
                  ? singleSelectedDoc.main_topics
                  : relNodeById[singleSelectedDoc.id]?.main_topics) ?? []
                ).length > 0 && (
                  <div className="gc-insp-section">
                    <span className="gc-insp-section-title">
                      Extracted Topics
                    </span>
                    <div className="gc-node-topics">
                      {(
                        (singleSelectedDoc.main_topics?.length
                          ? singleSelectedDoc.main_topics
                          : relNodeById[singleSelectedDoc.id]?.main_topics) ?? []
                      ).map((topic) => (
                        <span key={topic} className="gc-topic-pill">
                          {topic}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="gc-insp-btn-stack">
                  <button
                    type="button"
                    className={`gc-insp-btn ${
                      focusedHubId === singleSelectedDoc.id
                        ? "gc-insp-btn--accent"
                        : ""
                    }`}
                    onClick={() =>
                      setFocusedHubId((prev) =>
                        prev === singleSelectedDoc.id
                          ? null
                          : singleSelectedDoc.id
                      )
                    }
                  >
                    <Crosshair size={13} />
                    <span>
                      {focusedHubId === singleSelectedDoc.id
                        ? "Exit Neighborhood Focus"
                        : "Focus Neighborhood"}
                    </span>
                  </button>

                  {!isShowingDemo && (
                    <div className="gc-insp-btn-row">
                      {onOpenInChat && (
                        <button
                          type="button"
                          className="gc-insp-btn gc-insp-btn--primary"
                          onClick={() => onOpenInChat(singleSelectedDoc.id)}
                        >
                          <MessageSquare size={12} />
                          <span>AI Chat</span>
                        </button>
                      )}
                      {onOpenInRepository && (
                        <button
                          type="button"
                          className="gc-insp-btn"
                          onClick={() =>
                            onOpenInRepository(singleSelectedDoc.id)
                          }
                        >
                          <FolderOpen size={12} />
                          <span>Repository</span>
                        </button>
                      )}
                    </div>
                  )}

                  {!isShowingDemo &&
                    onCompareInSynthesis &&
                    connectedNeighbors.length > 0 && (
                      <button
                        type="button"
                        className="gc-insp-btn"
                        onClick={() =>
                          onCompareInSynthesis([
                            singleSelectedDoc.id,
                            ...connectedNeighbors
                              .slice(0, 4)
                              .map((n) => n.neighbor.id),
                          ])
                        }
                      >
                        <GitCompare size={13} />
                        <span>Compare With Connected Files</span>
                      </button>
                    )}
                </div>

                <div className="gc-insp-section">
                  <span className="gc-insp-section-title">
                    Connected Files ({connectedNeighbors.length})
                  </span>
                  {connectedNeighbors.length > 0 ? (
                    <div className="gc-neighbor-list">
                      {connectedNeighbors.map(({ neighbor, edge }) => {
                        const meta = getEdgeMeta(edge.relationship_type);
                        const pct = Math.round(
                          (edge.composite_confidence ?? 0.72) * 100
                        );
                        return (
                          <button
                            key={edge.id}
                            type="button"
                            className="gc-neighbor-item"
                            onClick={() => focusNodeCamera(neighbor.id)}
                          >
                            <div className="gc-neighbor-meta">
                              <span className="gc-neighbor-name">
                                {neighbor.title}
                              </span>
                              <span className="gc-neighbor-rel">
                                {meta.label} · {pct}%
                              </span>
                            </div>
                            <ArrowRight size={13} />
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="gc-insp-sub">
                      No links yet. Drag from any edge handle on this node to
                      connect it to another file.
                    </p>
                  )}
                </div>
              </>
            ) : (
              /* CASE 4: Overview Directory when Inspector Opened With Nothing Selected */
              <>
                <div className="gc-insp-stat-grid">
                  <div className="gc-insp-stat">
                    <span className="gc-insp-stat-val">
                      {effectiveDocs.length}
                    </span>
                    <span className="gc-insp-stat-lbl">Files</span>
                  </div>
                  <div className="gc-insp-stat">
                    <span className="gc-insp-stat-val">
                      {visibleRelationshipEdges.length}
                    </span>
                    <span className="gc-insp-stat-lbl">Links</span>
                  </div>
                  <div className="gc-insp-stat">
                    <span className="gc-insp-stat-val">
                      {effectiveDocs.length > 1
                        ? `${Math.min(
                            100,
                            Math.round(
                              (visibleRelationshipEdges.length /
                                ((effectiveDocs.length *
                                  (effectiveDocs.length - 1)) /
                                  2)) *
                                100
                            )
                          )}%`
                        : "0%"}
                    </span>
                    <span className="gc-insp-stat-lbl">Density</span>
                  </div>
                </div>

                <div className="gc-insp-section">
                  <span className="gc-insp-section-title">
                    Canvas Files ({effectiveDocs.length})
                  </span>
                  {effectiveDocs.length > 0 ? (
                    <div className="gc-neighbor-list">
                      {effectiveDocs.map((doc) => (
                        <button
                          key={doc.id}
                          type="button"
                          className="gc-neighbor-item"
                          onClick={() => focusNodeCamera(doc.id)}
                        >
                          <div className="gc-neighbor-meta">
                            <span className="gc-neighbor-name">{doc.title}</span>
                            <span className="gc-neighbor-rel">
                              {formatCategoryLabel(doc.category)} ·{" "}
                              {linkCountByDoc[doc.id] ?? 0} links
                            </span>
                          </div>
                          <Crosshair size={13} />
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="gc-insp-sub">
                      Upload documents or load the sample graph to jump across
                      file nodes here.
                    </p>
                  )}
                </div>

                <div className="gc-insp-section">
                  <span className="gc-insp-section-title">Canvas Actions</span>
                  <div className="gc-insp-btn-row">
                    <button
                      type="button"
                      className="gc-insp-btn"
                      onClick={() => applyLayout("cluster")}
                    >
                      <Grid2x2 size={12} />
                      <span>Reset Layout</span>
                    </button>
                    <button
                      type="button"
                      className="gc-insp-btn"
                      onClick={() => {
                        setSearchText("");
                        setFocusedHubId(null);
                      }}
                    >
                      <Crosshair size={12} />
                      <span>Reset Focus</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </>
            )
          }
        />
      )}
    </div>
  );
}

/* ============================================================================
   Public Export Wrapped With ReactFlowProvider
   ============================================================================ */

export const GraphCanvas = memo(function GraphCanvas(props: GraphCanvasProps) {
  return (
    <ReactFlowProvider>
      <GraphCanvasInner {...props} />
    </ReactFlowProvider>
  );
});
