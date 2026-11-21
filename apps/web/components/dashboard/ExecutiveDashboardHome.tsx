"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import * as echarts from "echarts";
import {
  ArrowUpDown,
  ArrowUpRight,
  BarChart3,
  Check,
  ChevronDown,
  ChevronUp,
  Database,
  Download,
  FileSpreadsheet,
  FileText,
  FolderOpen,
  Headphones,
  Layers,
  MessageSquare,
  Network,
  Pencil,
  PieChart,
  Search,
  Share2,
  Trash2,
  TrendingUp,
  Upload,
  X,
} from "lucide-react";
import type {
  AnalyticsDashboardResponse,
  DocumentItem,
  DocumentsSummary,
  RelationshipGraphResponse,
} from "@/lib/dashboard-api";
import type { DashboardSectionId } from "./types";

const BI_PALETTE = [
  "#e85a24", // Terracotta primary
  "#2c6b58", // Sage teal
  "#2563eb", // Executive blue
  "#d97706", // Amber ochre
  "#7c3aed", // Violet
  "#0f766e", // Deep cyan
  "#18181b", // Charcoal ink
];

function normalizeCategory(raw?: string | null): string {
  if (!raw || !raw.trim()) return "General";
  const cleaned = raw.trim();
  if (
    cleaned.toLowerCase() === "general_document" ||
    cleaned.toLowerCase() === "general"
  ) {
    return "General";
  }
  return cleaned
    .replace(/_/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return "0 KB";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function escapeCsvCell(val: unknown): string {
  const s = String(val ?? "");
  // Prevent CSV formula injection (=, +, -, @)
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return `"${safe.replace(/"/g, '""')}"`;
}

interface EChartBoxProps {
  option: echarts.EChartsOption;
  height?: number;
  onItemClick?: (name: string) => void;
}

function EChartBox({ option, height = 270, onItemClick }: EChartBoxProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const clickRef = useRef(onItemClick);
  clickRef.current = onItemClick;

  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;

    const chart = echarts.init(el, undefined, { renderer: "canvas" });
    chart.setOption(option, true);

    chart.on("click", (params: { name?: string }) => {
      if (params?.name && clickRef.current) {
        clickRef.current(params.name);
      }
    });

    const raf = window.requestAnimationFrame(() => chart.resize());
    const ro = new ResizeObserver(() => chart.resize());
    ro.observe(el);

    return () => {
      window.cancelAnimationFrame(raf);
      ro.disconnect();
      chart.dispose();
    };
  }, [option]);

  return (
    <div
      ref={hostRef}
      className="ex-chart-host"
      style={{ width: "100%", height: `${height}px` }}
    />
  );
}

interface MiniSparkProps {
  values: number[];
  color: string;
  type?: "line" | "bar";
}

function MiniSpark({ values, color, type = "line" }: MiniSparkProps) {
  const option = useMemo<echarts.EChartsOption>(() => {
    const data = values.length >= 2 ? values : [0, values[0] ?? 0];
    return {
      animation: true,
      animationDuration: 360,
      grid: { top: 4, right: 2, bottom: 2, left: 2 },
      xAxis: { type: "category", show: false, data: data.map((_, i) => i) },
      yAxis: { type: "value", show: false, min: 0 },
      series: [
        type === "bar"
          ? {
              type: "bar",
              data,
              barWidth: "60%",
              itemStyle: { color, borderRadius: [3, 3, 0, 0] },
            }
          : {
              type: "line",
              data,
              smooth: 0.4,
              symbol: "none",
              lineStyle: { width: 2.2, color },
              areaStyle: {
                color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                  { offset: 0, color: `${color}38` },
                  { offset: 1, color: `${color}03` },
                ]),
              },
            },
      ],
    };
  }, [values, color, type]);

  return <EChartBox option={option} height={42} />;
}

export interface ExecutiveDashboardHomeProps {
  documents: DocumentItem[];
  summary: DocumentsSummary | null;
  analytics: AnalyticsDashboardResponse | null;
  relationships: RelationshipGraphResponse | null;
  uploading: boolean;
  onSelectNav: (section: DashboardSectionId) => void;
  onTriggerUpload: () => void;
  onOpenDocInRepository: (docId: string) => void;
  onAskDocInChat: (docId: string, prompt?: string) => void;
  onUpdateDocumentMeta: (
    docId: string,
    payload: { title?: string; category?: string }
  ) => Promise<void>;
  onRequestDeleteDoc: (doc: DocumentItem) => void;
}

type SortField = "title" | "category" | "page_count" | "table_count" | "metric_count" | "status";

export function ExecutiveDashboardHome({
  documents,
  summary,
  analytics,
  relationships,
  uploading,
  onSelectNav,
  onTriggerUpload,
  onOpenDocInRepository,
  onAskDocInChat,
  onUpdateDocumentMeta,
  onRequestDeleteDoc,
}: ExecutiveDashboardHomeProps) {
  // Quick Stage starts minimized when user first opens Home
  const [quickStageOpen, setQuickStageOpen] = useState(false);

  // Interactive chart type switchers (matching Column, Bar, Pie, Line, Area, Surface)
  const [trendMode, setTrendMode] = useState<"area" | "line" | "column">("area");
  const [pieMode, setPieMode] = useState<"donut" | "pie">("donut");
  const [compareMode, setCompareMode] = useState<"bar" | "column">("bar");
  const [surfaceMode, setSurfaceMode] = useState<"heatmap" | "radar">("heatmap");

  // Interactive Data Table state
  const [tableSearch, setTableSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("All");
  const [sortField, setSortField] = useState<SortField>("page_count");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editCategory, setEditCategory] = useState("");

  // --------------------------------------------------------------------------
  // Real Grounded Workspace Metrics
  // --------------------------------------------------------------------------
  const linkCountByDoc = useMemo(() => {
    const map: Record<string, number> = {};
    for (const e of relationships?.edges ?? []) {
      map[e.source_doc_id] = (map[e.source_doc_id] ?? 0) + 1;
      map[e.target_doc_id] = (map[e.target_doc_id] ?? 0) + 1;
    }
    return map;
  }, [relationships]);

  const kpi = useMemo(() => {
    const totalDocs = summary?.total_documents ?? documents.length;
    const readyDocs =
      summary?.ready_count ??
      documents.filter((d) =>
        ["ready", "partial_ready", "completed", "indexed"].includes(
          (d.status || d.processing_status || "").toLowerCase()
        )
      ).length;
    const totalPages = documents.reduce((s, d) => s + (d.page_count || 0), 0);
    const totalTables =
      analytics?.corpus_telemetry?.total_tables ??
      documents.reduce((s, d) => s + (d.table_count || 0), 0);
    const totalMetrics =
      analytics?.corpus_telemetry?.total_verified_metrics ??
      documents.reduce((s, d) => s + (d.metric_count || 0), 0);
    const totalLinks = relationships?.edge_count ?? 0;
    const usedBytes =
      summary?.total_storage_bytes ??
      documents.reduce((s, d) => s + (d.file_size_bytes || 0), 0);
    const limitBytes = summary?.storage_limit_bytes || 1024 * 1024 * 1024;
    const storagePct = Math.min(100, Math.round((usedBytes / limitBytes) * 100));
    const readyPct = totalDocs > 0 ? Math.round((readyDocs / totalDocs) * 100) : 0;
    const avgPages = totalDocs > 0 ? (totalPages / totalDocs).toFixed(1) : "0";

    const pageSeries = documents.slice(0, 8).map((d) => d.page_count || 1);
    const dataSeries = documents
      .slice(0, 8)
      .map((d) => (d.table_count || 0) * 3 + (d.metric_count || 0));

    return {
      totalDocs,
      readyDocs,
      readyPct,
      totalPages,
      avgPages,
      totalTables,
      totalMetrics,
      totalLinks,
      usedBytes,
      limitBytes,
      storagePct,
      pageSeries: pageSeries.length >= 2 ? pageSeries : [0, totalPages],
      dataSeries:
        dataSeries.length >= 2 ? dataSeries : [0, totalTables + totalMetrics],
    };
  }, [documents, summary, analytics, relationships]);

  // Dynamic category list from REAL documents
  const categoryBreakdown = useMemo(() => {
    const counts = new Map<string, number>();
    for (const d of documents) {
      const cat = normalizeCategory(d.category);
      counts.set(cat, (counts.get(cat) ?? 0) + 1);
    }
    const entries = Array.from(counts.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    // If all files share a single category, show File Type mix so Pie chart stays insightful
    if (entries.length <= 1 && documents.length > 0) {
      const extCounts = new Map<string, number>();
      for (const d of documents) {
        const ext = (d.file_type || "PDF").toUpperCase();
        extCounts.set(ext, (extCounts.get(ext) ?? 0) + 1);
      }
      if (extCounts.size > 1) {
        return {
          byType: true,
          items: Array.from(extCounts.entries()).map(([name, value]) => ({
            name,
            value,
          })),
        };
      }
    }
    return { byType: false, items: entries };
  }, [documents]);

  const filterCategories = useMemo(() => {
    const set = new Set<string>();
    for (const d of documents) set.add(normalizeCategory(d.category));
    return ["All", ...Array.from(set).sort()];
  }, [documents]);

  // --------------------------------------------------------------------------
  // Chart 1: Macro Trend - Stacked Area / Line / Column (Span 8)
  // --------------------------------------------------------------------------
  const trendOption = useMemo<echarts.EChartsOption>(() => {
    const ordered = [...documents].sort((a, b) =>
      String(a.created_at || "").localeCompare(String(b.created_at || ""))
    );
    const slice = ordered.slice(-10);
    const labels = slice.map((d) =>
      d.title.length > 16 ? `${d.title.slice(0, 15)}…` : d.title
    );
    const pagesData = slice.map((d) => d.page_count || 1);
    const metricsData = slice.map((d) => d.metric_count || 0);
    const tablesData = slice.map((d) => d.table_count || 0);

    const isColumn = trendMode === "column";
    const isArea = trendMode === "area";

    return {
      color: [BI_PALETTE[0], BI_PALETTE[1], BI_PALETTE[2]],
      animationDuration: 460,
      tooltip: {
        trigger: "axis",
        axisPointer: { type: isColumn ? "shadow" : "line" },
        backgroundColor: "#18181b",
        borderColor: "#27272a",
        textStyle: { color: "#ffffff", fontSize: 12 },
      },
      legend: {
        top: 0,
        right: 4,
        icon: "circle",
        itemWidth: 8,
        itemHeight: 8,
        textStyle: { color: "#52525b", fontSize: 11.5, fontWeight: 500 },
      },
      grid: { top: 34, right: 16, bottom: 26, left: 12, containLabel: true },
      xAxis: {
        type: "category",
        boundaryGap: isColumn,
        data: labels,
        axisLine: { lineStyle: { color: "#e4e2dc" } },
        axisTick: { show: false },
        axisLabel: {
          color: "#64625b",
          fontSize: 11,
          rotate: labels.length > 6 ? 18 : 0,
        },
      },
      yAxis: {
        type: "value",
        splitLine: { lineStyle: { color: "#f0eee8", type: "dashed" } },
        axisLabel: { color: "#75736c", fontSize: 11 },
      },
      series: isColumn
        ? [
            {
              name: "Pages",
              type: "bar",
              barMaxWidth: 22,
              itemStyle: { borderRadius: [5, 5, 0, 0] },
              data: pagesData,
            },
            {
              name: "Metrics",
              type: "bar",
              barMaxWidth: 22,
              itemStyle: { borderRadius: [5, 5, 0, 0] },
              data: metricsData,
            },
            {
              name: "Tables",
              type: "bar",
              barMaxWidth: 22,
              itemStyle: { borderRadius: [5, 5, 0, 0] },
              data: tablesData,
            },
          ]
        : [
            {
              name: "Pages",
              type: "line",
              smooth: 0.35,
              stack: isArea ? "total" : undefined,
              symbol: "circle",
              symbolSize: 6,
              lineStyle: { width: 2.4 },
              areaStyle: isArea ? { opacity: 0.28 } : undefined,
              data: pagesData,
            },
            {
              name: "Metrics",
              type: "line",
              smooth: 0.35,
              stack: isArea ? "total" : undefined,
              symbol: "circle",
              symbolSize: 6,
              lineStyle: { width: 2.4 },
              areaStyle: isArea ? { opacity: 0.32 } : undefined,
              data: metricsData,
            },
            {
              name: "Tables",
              type: "line",
              smooth: 0.35,
              stack: isArea ? "total" : undefined,
              symbol: "circle",
              symbolSize: 6,
              lineStyle: { width: 2.2 },
              areaStyle: isArea ? { opacity: 0.36 } : undefined,
              data: tablesData,
            },
          ],
    };
  }, [documents, trendMode]);

  // --------------------------------------------------------------------------
  // Chart 2: Category / File Type Share - Pie / Donut (Span 4)
  // --------------------------------------------------------------------------
  const pieOption = useMemo<echarts.EChartsOption>(() => {
    const items = categoryBreakdown.items;
    const total = items.reduce((acc, it) => acc + it.value, 0);
    const isDonut = pieMode === "donut";

    return {
      color: BI_PALETTE,
      animationDuration: 460,
      tooltip: {
        trigger: "item",
        backgroundColor: "#18181b",
        borderColor: "#27272a",
        textStyle: { color: "#ffffff", fontSize: 12 },
        formatter: "{b}<br/><b>{c}</b> files ({d}%)",
      },
      legend: {
        type: "scroll",
        bottom: 0,
        icon: "circle",
        itemWidth: 8,
        itemHeight: 8,
        textStyle: { color: "#52525b", fontSize: 11.5 },
      },
      series: [
        {
          name: categoryBreakdown.byType ? "File Types" : "Categories",
          type: "pie",
          radius: isDonut ? ["48%", "74%"] : ["0%", "72%"],
          center: ["50%", "44%"],
          itemStyle: {
            borderRadius: isDonut ? 7 : 3,
            borderColor: "#ffffff",
            borderWidth: 2,
          },
          label: isDonut
            ? {
                show: true,
                position: "center",
                formatter: () => `{v|${total}}\n{l|Files}`,
                rich: {
                  v: { fontSize: 22, fontWeight: 800, color: "#18181b", lineHeight: 26 },
                  l: { fontSize: 11, fontWeight: 600, color: "#75736c" },
                },
              }
            : {
                show: true,
                formatter: "{b}\n{d}%",
                fontSize: 11,
                color: "#3f3f46",
                fontWeight: 600,
              },
          emphasis: { scaleSize: 6 },
          data: items,
        },
      ],
    };
  }, [categoryBreakdown, pieMode]);

  // --------------------------------------------------------------------------
  // Chart 3: Top Documents Comparison - Horizontal Bar / Grouped Column (Span 6)
  // --------------------------------------------------------------------------
  const compareOption = useMemo<echarts.EChartsOption>(() => {
    const ranked = [...documents]
      .sort(
        (a, b) =>
          (b.page_count || 0) +
          (b.metric_count || 0) * 2 +
          (b.table_count || 0) * 3 -
          ((a.page_count || 0) +
            (a.metric_count || 0) * 2 +
            (a.table_count || 0) * 3)
      )
      .slice(0, 7);

    const labels = ranked.map((d) =>
      d.title.length > 22 ? `${d.title.slice(0, 21)}…` : d.title
    );
    const pages = ranked.map((d) => d.page_count || 1);
    const metrics = ranked.map((d) => d.metric_count || 0);
    const tables = ranked.map((d) => d.table_count || 0);

    if (compareMode === "bar") {
      return {
        color: [BI_PALETTE[0], BI_PALETTE[1], BI_PALETTE[2]],
        animationDuration: 460,
        tooltip: {
          trigger: "axis",
          axisPointer: { type: "shadow" },
          backgroundColor: "#18181b",
          borderColor: "#27272a",
          textStyle: { color: "#ffffff", fontSize: 12 },
        },
        legend: {
          top: 0,
          right: 4,
          icon: "circle",
          itemWidth: 8,
          itemHeight: 8,
          textStyle: { color: "#52525b", fontSize: 11 },
        },
        grid: { top: 30, right: 24, bottom: 12, left: 10, containLabel: true },
        xAxis: {
          type: "value",
          splitLine: { lineStyle: { color: "#f0eee8", type: "dashed" } },
          axisLabel: { color: "#75736c", fontSize: 11 },
        },
        yAxis: {
          type: "category",
          inverse: true,
          data: labels,
          axisLine: { show: false },
          axisTick: { show: false },
          axisLabel: { color: "#27272a", fontSize: 11, fontWeight: 600 },
        },
        series: [
          {
            name: "Pages",
            type: "bar",
            stack: "depth",
            barMaxWidth: 18,
            data: pages,
          },
          {
            name: "Metrics",
            type: "bar",
            stack: "depth",
            barMaxWidth: 18,
            data: metrics,
          },
          {
            name: "Tables",
            type: "bar",
            stack: "depth",
            barMaxWidth: 18,
            itemStyle: { borderRadius: [0, 5, 5, 0] },
            data: tables,
          },
        ],
      };
    }

    return {
      color: [BI_PALETTE[0], BI_PALETTE[1], BI_PALETTE[2]],
      animationDuration: 460,
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
        backgroundColor: "#18181b",
        borderColor: "#27272a",
        textStyle: { color: "#ffffff", fontSize: 12 },
      },
      legend: {
        top: 0,
        right: 4,
        icon: "circle",
        itemWidth: 8,
        itemHeight: 8,
        textStyle: { color: "#52525b", fontSize: 11 },
      },
      grid: { top: 32, right: 14, bottom: 26, left: 10, containLabel: true },
      xAxis: {
        type: "category",
        data: labels.map((l) => (l.length > 13 ? `${l.slice(0, 12)}…` : l)),
        axisLine: { lineStyle: { color: "#e4e2dc" } },
        axisTick: { show: false },
        axisLabel: { color: "#52525b", fontSize: 10.5, rotate: labels.length > 5 ? 18 : 0 },
      },
      yAxis: {
        type: "value",
        splitLine: { lineStyle: { color: "#f0eee8", type: "dashed" } },
        axisLabel: { color: "#75736c", fontSize: 11 },
      },
      series: [
        { name: "Pages", type: "bar", barMaxWidth: 18, itemStyle: { borderRadius: [5, 5, 0, 0] }, data: pages },
        { name: "Metrics", type: "bar", barMaxWidth: 18, itemStyle: { borderRadius: [5, 5, 0, 0] }, data: metrics },
        { name: "Tables", type: "bar", barMaxWidth: 18, itemStyle: { borderRadius: [5, 5, 0, 0] }, data: tables },
      ],
    };
  }, [documents, compareMode]);

  // --------------------------------------------------------------------------
  // Chart 4: Data Coverage Surface Heatmap / Radar Profile (Span 6)
  // --------------------------------------------------------------------------
  const surfaceOption = useMemo<echarts.EChartsOption>(() => {
    const sample = documents.slice(0, 6);
    const dims = ["Pages", "Tables", "Metrics", "Topics", "Links"];

    const maxPages = Math.max(1, ...sample.map((d) => d.page_count || 0));
    const maxTables = Math.max(1, ...sample.map((d) => d.table_count || 0));
    const maxMetrics = Math.max(1, ...sample.map((d) => d.metric_count || 0));
    const maxTopics = Math.max(1, ...sample.map((d) => (d.main_topics || []).length));
    const maxLinks = Math.max(1, ...sample.map((d) => linkCountByDoc[d.id] || 0));

    if (surfaceMode === "radar") {
      const avgNorm = (vals: number[], mx: number) =>
        vals.length === 0
          ? 0
          : Math.round((vals.reduce((a, b) => a + b, 0) / vals.length / mx) * 100);
      const topDoc = sample[0];
      const topVec = topDoc
        ? [
            Math.round(((topDoc.page_count || 0) / maxPages) * 100),
            Math.round(((topDoc.table_count || 0) / maxTables) * 100),
            Math.round(((topDoc.metric_count || 0) / maxMetrics) * 100),
            Math.round((((topDoc.main_topics || []).length) / maxTopics) * 100),
            Math.round(((linkCountByDoc[topDoc.id] || 0) / maxLinks) * 100),
          ]
        : [0, 0, 0, 0, 0];
      const avgVec = [
        avgNorm(sample.map((d) => d.page_count || 0), maxPages),
        avgNorm(sample.map((d) => d.table_count || 0), maxTables),
        avgNorm(sample.map((d) => d.metric_count || 0), maxMetrics),
        avgNorm(sample.map((d) => (d.main_topics || []).length), maxTopics),
        avgNorm(sample.map((d) => linkCountByDoc[d.id] || 0), maxLinks),
      ];

      return {
        color: [BI_PALETTE[0], BI_PALETTE[1]],
        tooltip: {
          backgroundColor: "#18181b",
          borderColor: "#27272a",
          textStyle: { color: "#ffffff", fontSize: 12 },
        },
        legend: {
          bottom: 0,
          icon: "circle",
          itemWidth: 8,
          itemHeight: 8,
          textStyle: { color: "#52525b", fontSize: 11 },
        },
        radar: {
          radius: "62%",
          center: ["50%", "46%"],
          indicator: dims.map((d) => ({ name: d, max: 100 })),
          splitArea: { areaStyle: { color: ["#faf9f6", "#f4f2ec"] } },
          axisName: { color: "#3f3f46", fontSize: 11, fontWeight: 600 },
        },
        series: [
          {
            type: "radar",
            data: [
              {
                value: avgVec,
                name: "Workspace Average (%)",
                areaStyle: { opacity: 0.22 },
              },
              ...(topDoc
                ? [
                    {
                      value: topVec,
                      name:
                        topDoc.title.length > 20
                          ? `${topDoc.title.slice(0, 19)}…`
                          : topDoc.title,
                      areaStyle: { opacity: 0.14 },
                    },
                  ]
                : []),
            ],
          },
        ],
      };
    }

    // 2D Surface Intensity Heatmap (Documents × Data Dimensions)
    const yLabels = sample.map((d) =>
      d.title.length > 18 ? `${d.title.slice(0, 17)}…` : d.title
    );
    const points: Array<[number, number, number]> = [];
    sample.forEach((doc, yIdx) => {
      const rawScores = [
        Math.round(((doc.page_count || 0) / maxPages) * 100),
        Math.round(((doc.table_count || 0) / maxTables) * 100),
        Math.round(((doc.metric_count || 0) / maxMetrics) * 100),
        Math.round((((doc.main_topics || []).length) / maxTopics) * 100),
        Math.round(((linkCountByDoc[doc.id] || 0) / maxLinks) * 100),
      ];
      rawScores.forEach((score, xIdx) => {
        points.push([xIdx, yIdx, score]);
      });
    });

    return {
      animationDuration: 420,
      tooltip: {
        position: "top",
        backgroundColor: "#18181b",
        borderColor: "#27272a",
        textStyle: { color: "#ffffff", fontSize: 12 },
        formatter: (p: unknown) => {
          const item = p as { value?: [number, number, number] };
          const [xi, yi, val] = item.value ?? [0, 0, 0];
          return `${yLabels[yi] || "Doc"}<br/><b>${dims[xi]}</b>: ${val}% intensity`;
        },
      },
      grid: { top: 12, right: 16, bottom: 44, left: 10, containLabel: true },
      xAxis: {
        type: "category",
        data: dims,
        splitArea: { show: true },
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: "#3f3f46", fontSize: 11, fontWeight: 600 },
      },
      yAxis: {
        type: "category",
        data: yLabels,
        inverse: true,
        splitArea: { show: true },
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: "#27272a", fontSize: 11, fontWeight: 600 },
      },
      visualMap: {
        min: 0,
        max: 100,
        orient: "horizontal",
        left: "center",
        bottom: 2,
        itemWidth: 10,
        itemHeight: 90,
        text: ["High", "Low"],
        textStyle: { color: "#75736c", fontSize: 10.5 },
        inRange: {
          color: ["#f5f4ef", "#fde2d2", "#f59e6c", "#e85a24", "#9a2f0c"],
        },
      },
      series: [
        {
          name: "Data Intensity",
          type: "heatmap",
          data: points,
          label: {
            show: true,
            formatter: (p: unknown) => {
              const item = p as { value?: [number, number, number] };
              const val = item.value?.[2] ?? 0;
              return val > 0 ? `${val}` : "-";
            },
            fontSize: 10.5,
            fontWeight: 600,
            color: "#18181b",
          },
          itemStyle: {
            borderColor: "#ffffff",
            borderWidth: 2,
            borderRadius: 5,
          },
        },
      ],
    };
  }, [documents, linkCountByDoc, surfaceMode]);

  // --------------------------------------------------------------------------
  // Interactive Executive Data Table (Search + Category + Sort + CSV Export)
  // --------------------------------------------------------------------------
  const filteredTableDocs = useMemo(() => {
    const q = tableSearch.trim().toLowerCase();
    const list = documents.filter((d) => {
      const cat = normalizeCategory(d.category);
      if (categoryFilter !== "All" && cat !== categoryFilter) return false;
      if (!q) return true;
      return (
        d.title.toLowerCase().includes(q) ||
        cat.toLowerCase().includes(q) ||
        (d.file_type || "").toLowerCase().includes(q) ||
        (d.summary || "").toLowerCase().includes(q)
      );
    });

    const mult = sortDir === "asc" ? 1 : -1;
    return [...list].sort((a, b) => {
      if (sortField === "title") return a.title.localeCompare(b.title) * mult;
      if (sortField === "category")
        return normalizeCategory(a.category).localeCompare(normalizeCategory(b.category)) * mult;
      if (sortField === "status")
        return String(a.status || a.processing_status || "").localeCompare(
          String(b.status || b.processing_status || "")
        ) * mult;
      return (Number(a[sortField] || 0) - Number(b[sortField] || 0)) * mult;
    });
  }, [documents, tableSearch, categoryFilter, sortField, sortDir]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir(field === "title" || field === "category" ? "asc" : "desc");
    }
  };

  const handleExportCsv = () => {
    const headers = [
      "Document",
      "Category",
      "File Type",
      "Pages",
      "Tables",
      "Metrics",
      "Links",
      "Size (Bytes)",
      "Status",
    ];
    const rows = filteredTableDocs.map((d) =>
      [
        d.title,
        normalizeCategory(d.category),
        (d.file_type || "PDF").toUpperCase(),
        d.page_count || 1,
        d.table_count || 0,
        d.metric_count || 0,
        linkCountByDoc[d.id] || 0,
        d.file_size_bytes || 0,
        d.status || d.processing_status || "ready",
      ]
        .map(escapeCsvCell)
        .join(",")
    );
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `documind-workspace-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const saveEdit = async (docId: string) => {
    const nextTitle = editTitle.trim();
    const nextCat = editCategory.trim();
    if (!nextTitle) return;
    setEditingId(null);
    await onUpdateDocumentMeta(docId, {
      title: nextTitle,
      category: nextCat || undefined,
    });
  };

  // --------------------------------------------------------------------------
  // Clean Empty State (0 Documents Uploaded)
  // --------------------------------------------------------------------------
  if (documents.length === 0) {
    return (
      <div className="ex-home ex-home--empty">
        <div className="ex-empty-panel">
          <div className="ex-empty-icon">
            <BarChart3 size={28} strokeWidth={1.7} />
          </div>
          <h2 className="ex-empty-title">Your Executive Dashboard is ready</h2>
          <p className="ex-empty-sub">
            Upload your first PDF, CSV, or Excel file to automatically unlock
            interactive Area, Line, Column, Horizontal Bar, Pie, Surface
            Heatmap charts, and a sortable workspace data table.
          </p>
          <div className="ex-empty-actions">
            <button
              type="button"
              className="ex-btn ex-btn--primary"
              onClick={onTriggerUpload}
              disabled={uploading}
            >
              <Upload size={15} />
              <span>{uploading ? "Uploading..." : "Upload First Document"}</span>
            </button>
            <button
              type="button"
              className="ex-btn"
              onClick={() => onSelectNav("analytics")}
            >
              <PieChart size={15} />
              <span>Open Analytics Studio</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // Executive BI Dashboard Grid (12-Column Modular SaaS Template)
  // --------------------------------------------------------------------------
  return (
    <div className="ex-home">
      {/* Quick Executive Action Strip */}
      <div className="ex-top-strip">
        <div className="ex-strip-left">
          <span className="ex-live-dot" aria-hidden="true" />
          <span className="ex-strip-label">
            Workspace Intelligence Overview · {kpi.totalDocs} files indexed
          </span>
        </div>
        <div className="ex-strip-actions">
          <button
            type="button"
            className="ex-btn"
            onClick={() => onSelectNav("layers")}
          >
            <Network size={13} />
            <span>Knowledge Graph</span>
          </button>
          <button
            type="button"
            className="ex-btn"
            onClick={() => onSelectNav("analytics")}
          >
            <BarChart3 size={13} />
            <span>Analytics Studio</span>
          </button>
          <button
            type="button"
            className="ex-btn ex-btn--primary"
            onClick={() => onAskDocInChat("all")}
          >
            <MessageSquare size={13} />
            <span>Ask AI Workspace</span>
            <ArrowUpRight size={13} />
          </button>
        </div>
      </div>

      {/* Quick Stage (Minimized by default on first entry; expands on demand) */}
      <div className={`ex-quick-stage ${quickStageOpen ? "is-open" : ""}`}>
        <div className="ex-quick-stage-bar">
          <div className="ex-quick-stage-info">
            <span className="ex-quick-stage-tag">Quick Stage</span>
            <span className="ex-quick-stage-sub">
              {quickStageOpen
                ? "Jump straight into any workspace pillar"
                : "5 workspace shortcuts ready"}
            </span>
          </div>
          <button
            type="button"
            className="ex-quick-stage-toggle"
            aria-expanded={quickStageOpen}
            onClick={() => setQuickStageOpen((prev) => !prev)}
          >
            <span>{quickStageOpen ? "Minimize" : "Expand"}</span>
            {quickStageOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
        </div>

        {quickStageOpen && (
          <div className="ex-quick-stage-grid">
            <button
              type="button"
              className="ex-quick-stage-tile"
              onClick={() => onAskDocInChat("all")}
            >
              <div className="ex-quick-stage-tile-top">
                <MessageSquare size={15} />
                <ArrowUpRight size={13} />
              </div>
              <strong>AI Chat</strong>
              <span>Ask grounded questions with citations</span>
            </button>

            <button
              type="button"
              className="ex-quick-stage-tile"
              onClick={() => onSelectNav("repository")}
            >
              <div className="ex-quick-stage-tile-top">
                <FolderOpen size={15} />
                <ArrowUpRight size={13} />
              </div>
              <strong>Repository IDE</strong>
              <span>{kpi.totalDocs} files · folders &amp; viewer</span>
            </button>

            <button
              type="button"
              className="ex-quick-stage-tile"
              onClick={() => onSelectNav("layers")}
            >
              <div className="ex-quick-stage-tile-top">
                <Network size={15} />
                <ArrowUpRight size={13} />
              </div>
              <strong>Knowledge Graph</strong>
              <span>{kpi.totalLinks} links · AI relationship map</span>
            </button>

            <button
              type="button"
              className="ex-quick-stage-tile"
              onClick={() => onSelectNav("analytics")}
            >
              <div className="ex-quick-stage-tile-top">
                <BarChart3 size={15} />
                <ArrowUpRight size={13} />
              </div>
              <strong>Analytics Studio</strong>
              <span>{kpi.totalTables} tables · DuckDB charts</span>
            </button>

            <button
              type="button"
              className="ex-quick-stage-tile"
              onClick={() => onSelectNav("studio")}
            >
              <div className="ex-quick-stage-tile-top">
                <Headphones size={15} />
                <ArrowUpRight size={13} />
              </div>
              <strong>Audio &amp; Quiz Studio</strong>
              <span>OpenAI TTS podcast &amp; study quizzes</span>
            </button>
          </div>
        )}
      </div>

      {/* ROW 1: 4 Executive KPI Cards */}
      <section className="ex-kpi-row" aria-label="Workspace Key Metrics">
        <article className="ex-kpi-card">
          <div className="ex-kpi-head">
            <span className="ex-kpi-label">Total Documents</span>
            <span className="ex-kpi-icon ex-kpi-icon--accent">
              <FileText size={14} />
            </span>
          </div>
          <div className="ex-kpi-mid">
            <div className="ex-kpi-val-col">
              <strong className="ex-kpi-val">{kpi.totalDocs}</strong>
              <span className="ex-kpi-badge ex-kpi-badge--ok">
                {kpi.readyPct}% indexed
              </span>
            </div>
            <div className="ex-kpi-spark">
              <MiniSpark values={kpi.pageSeries} color="#e85a24" type="line" />
            </div>
          </div>
          <div className="ex-kpi-foot-row">
            <span className="ex-kpi-foot">
              {kpi.readyDocs} ready · {categoryBreakdown.items.length} categories
            </span>
            <button
              type="button"
              className="ex-kpi-shortcut"
              onClick={() => onSelectNav("repository")}
            >
              <span>Repo</span>
              <ArrowUpRight size={11} />
            </button>
          </div>
        </article>

        <article className="ex-kpi-card">
          <div className="ex-kpi-head">
            <span className="ex-kpi-label">Pages Indexed</span>
            <span className="ex-kpi-icon ex-kpi-icon--sage">
              <Layers size={14} />
            </span>
          </div>
          <div className="ex-kpi-mid">
            <div className="ex-kpi-val-col">
              <strong className="ex-kpi-val">
                {kpi.totalPages.toLocaleString()}
              </strong>
              <span className="ex-kpi-badge">Avg {kpi.avgPages}/doc</span>
            </div>
            <div className="ex-kpi-spark">
              <MiniSpark values={kpi.pageSeries} color="#2c6b58" type="bar" />
            </div>
          </div>
          <div className="ex-kpi-foot-row">
            <span className="ex-kpi-foot">Full-text &amp; vector chunks</span>
            <button
              type="button"
              className="ex-kpi-shortcut"
              onClick={() => onAskDocInChat("all")}
            >
              <span>Ask AI</span>
              <ArrowUpRight size={11} />
            </button>
          </div>
        </article>

        <article className="ex-kpi-card">
          <div className="ex-kpi-head">
            <span className="ex-kpi-label">Tables &amp; Metrics</span>
            <span className="ex-kpi-icon ex-kpi-icon--blue">
              <Database size={14} />
            </span>
          </div>
          <div className="ex-kpi-mid">
            <div className="ex-kpi-val-col">
              <strong className="ex-kpi-val">
                {kpi.totalTables}{" "}
                <span className="ex-kpi-slash">/</span> {kpi.totalMetrics}
              </strong>
              <span className="ex-kpi-badge">DuckDB SQL</span>
            </div>
            <div className="ex-kpi-spark">
              <MiniSpark values={kpi.dataSeries} color="#2563eb" type="line" />
            </div>
          </div>
          <div className="ex-kpi-foot-row">
            <span className="ex-kpi-foot">
              {kpi.totalTables} tables · {kpi.totalMetrics} extracted KPIs
            </span>
            <button
              type="button"
              className="ex-kpi-shortcut"
              onClick={() => onSelectNav("analytics")}
            >
              <span>Analytics</span>
              <ArrowUpRight size={11} />
            </button>
          </div>
        </article>

        <article className="ex-kpi-card">
          <div className="ex-kpi-head">
            <span className="ex-kpi-label">Graph Links &amp; Storage</span>
            <span className="ex-kpi-icon ex-kpi-icon--ink">
              <Share2 size={14} />
            </span>
          </div>
          <div className="ex-kpi-mid ex-kpi-mid--stack">
            <div className="ex-kpi-val-row">
              <strong className="ex-kpi-val">{kpi.totalLinks}</strong>
              <span className="ex-kpi-badge">
                {formatBytes(kpi.usedBytes)} used
              </span>
            </div>
            <div className="ex-storage-track" title={`${kpi.storagePct}% of quota`}>
              <div
                className="ex-storage-fill"
                style={{ width: `${Math.max(4, kpi.storagePct)}%` }}
              />
            </div>
          </div>
          <div className="ex-kpi-foot-row">
            <span className="ex-kpi-foot">
              {kpi.storagePct}% of {formatBytes(kpi.limitBytes)}
            </span>
            <button
              type="button"
              className="ex-kpi-shortcut"
              onClick={() => onSelectNav("layers")}
            >
              <span>{kpi.totalLinks > 0 ? "Graph" : "Connect"}</span>
              <ArrowUpRight size={11} />
            </button>
          </div>
        </article>
      </section>

      {/* ROW 2: Macro Volume Trend (8 cols) + Category Share Pie/Donut (4 cols) */}
      <section className="ex-grid-12">
        <article className="ex-card ex-span-8">
          <header className="ex-card-head">
            <div>
              <h3 className="ex-card-title">
                <TrendingUp size={15} />
                <span>Document Volume &amp; Data Extraction Trend</span>
              </h3>
              <p className="ex-card-sub">
                Pages, extracted metrics, and structured tables across your
                latest files
              </p>
            </div>
            <div className="ex-seg-tabs" role="tablist" aria-label="Trend chart type">
              {(["area", "line", "column"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  role="tab"
                  aria-selected={trendMode === m}
                  className={`ex-seg-btn ${trendMode === m ? "is-active" : ""}`}
                  onClick={() => setTrendMode(m)}
                >
                  {m === "area" ? "Area" : m === "line" ? "Line" : "Column"}
                </button>
              ))}
            </div>
          </header>
          <EChartBox option={trendOption} height={272} />
        </article>

        <article className="ex-card ex-span-4">
          <header className="ex-card-head">
            <div>
              <h3 className="ex-card-title">
                <PieChart size={15} />
                <span>
                  {categoryBreakdown.byType ? "File Format Mix" : "Category Mix"}
                </span>
              </h3>
              <p className="ex-card-sub">
                Click any slice to filter the table below
              </p>
            </div>
            <div className="ex-seg-tabs" role="tablist" aria-label="Pie style">
              {(["donut", "pie"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  role="tab"
                  aria-selected={pieMode === m}
                  className={`ex-seg-btn ${pieMode === m ? "is-active" : ""}`}
                  onClick={() => setPieMode(m)}
                >
                  {m === "donut" ? "Donut" : "Pie"}
                </button>
              ))}
            </div>
          </header>
          <EChartBox
            option={pieOption}
            height={272}
            onItemClick={(name) => {
              if (!categoryBreakdown.byType) {
                setCategoryFilter((prev) => (prev === name ? "All" : name));
              }
            }}
          />
        </article>
      </section>

      {/* ROW 3: Top Files Comparison (6 cols) + Surface Heatmap / Radar (6 cols) */}
      <section className="ex-grid-12">
        <article className="ex-card ex-span-6">
          <header className="ex-card-head">
            <div>
              <h3 className="ex-card-title">
                <BarChart3 size={15} />
                <span>Top Documents by Data Depth</span>
              </h3>
              <p className="ex-card-sub">
                Ranked comparison of pages, extracted metrics, and tables
              </p>
            </div>
            <div className="ex-seg-tabs" role="tablist" aria-label="Comparison chart type">
              {(["bar", "column"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  role="tab"
                  aria-selected={compareMode === m}
                  className={`ex-seg-btn ${compareMode === m ? "is-active" : ""}`}
                  onClick={() => setCompareMode(m)}
                >
                  {m === "bar" ? "Bar" : "Column"}
                </button>
              ))}
            </div>
          </header>
          <EChartBox option={compareOption} height={268} />
        </article>

        <article className="ex-card ex-span-6">
          <header className="ex-card-head">
            <div>
              <h3 className="ex-card-title">
                <Layers size={15} />
                <span>Data Coverage Surface Matrix</span>
              </h3>
              <p className="ex-card-sub">
                Relative richness across Pages, Tables, Metrics, Topics &amp;
                Links (0–100%)
              </p>
            </div>
            <div className="ex-seg-tabs" role="tablist" aria-label="Matrix style">
              {(["heatmap", "radar"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  role="tab"
                  aria-selected={surfaceMode === m}
                  className={`ex-seg-btn ${surfaceMode === m ? "is-active" : ""}`}
                  onClick={() => setSurfaceMode(m)}
                >
                  {m === "heatmap" ? "Surface" : "Radar"}
                </button>
              ))}
            </div>
          </header>
          <EChartBox option={surfaceOption} height={268} />
        </article>
      </section>

      {/* ROW 4: Full-Width Actionable Executive Data Table (12 cols) */}
      <section className="ex-card ex-table-card" aria-label="Document Data Table">
        <header className="ex-table-head">
          <div>
            <h3 className="ex-card-title">
              <FileSpreadsheet size={15} />
              <span>Workspace Document Directory ({filteredTableDocs.length})</span>
            </h3>
            <p className="ex-card-sub">
              Search, sort, export CSV, edit metadata, or launch Analytics &amp;
              AI Chat on any document
            </p>
          </div>

          <div className="ex-table-tools">
            <div className="ex-search-box">
              <Search size={13} />
              <input
                type="text"
                value={tableSearch}
                onChange={(e) => setTableSearch(e.target.value)}
                placeholder="Search document or category..."
                aria-label="Search workspace documents"
              />
              {tableSearch && (
                <button
                  type="button"
                  className="ex-clear-x"
                  onClick={() => setTableSearch("")}
                  aria-label="Clear search"
                >
                  <X size={11} />
                </button>
              )}
            </div>

            <button
              type="button"
              className="ex-btn"
              onClick={handleExportCsv}
              title="Export visible rows to CSV"
            >
              <Download size={13} />
              <span>Export CSV</span>
            </button>

            <button
              type="button"
              className="ex-btn ex-btn--primary"
              onClick={onTriggerUpload}
              disabled={uploading}
            >
              <Upload size={13} />
              <span>{uploading ? "Uploading..." : "Upload File"}</span>
            </button>
          </div>
        </header>

        {/* Dynamic Category Filter Pills */}
        <div className="ex-filter-pills" role="group" aria-label="Filter by category">
          {filterCategories.map((cat) => (
            <button
              key={cat}
              type="button"
              className={`ex-pill ${categoryFilter === cat ? "is-active" : ""}`}
              onClick={() => setCategoryFilter(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="ex-table-scroll">
          <table className="ex-data-table">
            <thead>
              <tr>
                <th>
                  <button
                    type="button"
                    className="ex-th-sort"
                    onClick={() => toggleSort("title")}
                  >
                    <span>Document</span>
                    <ArrowUpDown size={11} />
                  </button>
                </th>
                <th>
                  <button
                    type="button"
                    className="ex-th-sort"
                    onClick={() => toggleSort("category")}
                  >
                    <span>Category</span>
                    <ArrowUpDown size={11} />
                  </button>
                </th>
                <th className="is-num">
                  <button
                    type="button"
                    className="ex-th-sort"
                    onClick={() => toggleSort("page_count")}
                  >
                    <span>Pages</span>
                    <ArrowUpDown size={11} />
                  </button>
                </th>
                <th className="is-num">
                  <button
                    type="button"
                    className="ex-th-sort"
                    onClick={() => toggleSort("table_count")}
                  >
                    <span>Tables</span>
                    <ArrowUpDown size={11} />
                  </button>
                </th>
                <th className="is-num">
                  <button
                    type="button"
                    className="ex-th-sort"
                    onClick={() => toggleSort("metric_count")}
                  >
                    <span>Metrics</span>
                    <ArrowUpDown size={11} />
                  </button>
                </th>
                <th>
                  <button
                    type="button"
                    className="ex-th-sort"
                    onClick={() => toggleSort("status")}
                  >
                    <span>Status</span>
                    <ArrowUpDown size={11} />
                  </button>
                </th>
                <th className="is-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTableDocs.length > 0 ? (
                filteredTableDocs.map((doc) => {
                  const isEditing = editingId === doc.id;
                  const cat = normalizeCategory(doc.category);
                  const st = (doc.status || doc.processing_status || "ready").toLowerCase();
                  const isReady = ["ready", "partial_ready", "completed", "indexed"].includes(st);
                  const isSheet =
                    (doc.file_type || "").toLowerCase().includes("csv") ||
                    (doc.file_type || "").toLowerCase().includes("xls");

                  return (
                    <tr key={doc.id}>
                      <td>
                        {isEditing ? (
                          <input
                            type="text"
                            className="ex-inline-input"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            autoFocus
                          />
                        ) : (
                          <button
                            type="button"
                            className="ex-doc-cell"
                            onClick={() => onOpenDocInRepository(doc.id)}
                          >
                            <span
                              className={`ex-file-badge ${
                                isSheet ? "is-sheet" : ""
                              }`}
                            >
                              {isSheet ? (
                                <FileSpreadsheet size={12} />
                              ) : (
                                <FileText size={12} />
                              )}
                            </span>
                            <div className="ex-doc-cell-text">
                              <strong title={doc.title}>{doc.title}</strong>
                              <span>
                                {(doc.file_type || "PDF").toUpperCase()} ·{" "}
                                {formatBytes(doc.file_size_bytes || 0)}
                              </span>
                            </div>
                          </button>
                        )}
                      </td>
                      <td>
                        {isEditing ? (
                          <input
                            type="text"
                            className="ex-inline-input ex-inline-input--sm"
                            value={editCategory}
                            onChange={(e) => setEditCategory(e.target.value)}
                          />
                        ) : (
                          <span className="ex-cat-chip">{cat}</span>
                        )}
                      </td>
                      <td className="is-num">{doc.page_count || 1}</td>
                      <td className="is-num">{doc.table_count || 0}</td>
                      <td className="is-num">{doc.metric_count || 0}</td>
                      <td>
                        <span
                          className={`ex-status-chip ${
                            isReady ? "is-ready" : "is-pending"
                          }`}
                        >
                          <span className="ex-status-dot" />
                          <span>{isReady ? "Indexed" : st}</span>
                        </span>
                      </td>
                      <td className="is-right">
                        <div className="ex-row-actions">
                          {isEditing ? (
                            <>
                              <button
                                type="button"
                                className="ex-icon-btn is-save"
                                title="Save"
                                onClick={() => void saveEdit(doc.id)}
                              >
                                <Check size={13} />
                              </button>
                              <button
                                type="button"
                                className="ex-icon-btn"
                                title="Cancel"
                                onClick={() => setEditingId(null)}
                              >
                                <X size={13} />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                className="ex-icon-btn"
                                title="Ask AI about this file"
                                onClick={() =>
                                  onAskDocInChat(
                                    doc.id,
                                    `Ringkas poin dan data utama dari "${doc.title}"`
                                  )
                                }
                              >
                                <MessageSquare size={13} />
                              </button>
                              <button
                                type="button"
                                className="ex-icon-btn"
                                title="Edit metadata"
                                onClick={() => {
                                  setEditingId(doc.id);
                                  setEditTitle(doc.title);
                                  setEditCategory(cat);
                                }}
                              >
                                <Pencil size={13} />
                              </button>
                              <button
                                type="button"
                                className="ex-icon-btn is-danger"
                                title="Delete document"
                                onClick={() => onRequestDeleteDoc(doc)}
                              >
                                <Trash2 size={13} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="ex-empty-row">
                    No matching documents found. Try clearing your filter or
                    search query.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export default ExecutiveDashboardHome;
