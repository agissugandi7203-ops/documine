"use client";

import React, { useEffect, useMemo, useRef } from "react";
import type * as EChartsTypes from "echarts";
import type { DocumentItem } from "@/lib/dashboard-api";
import type { DashboardSectionId } from "./types";

interface WorkspacePieChartProps {
  documents: DocumentItem[];
  totalPages: number;
  totalTables: number;
  totalMetrics: number;
  totalRelationships: number;
  onSelectSection: (section: DashboardSectionId) => void;
}

const PIE_PALETTE = [
  "#e85a24", // Terracotta
  "#18181b", // Obsidian
  "#2c6b58", // Deep Sage
  "#dbdc54", // Editorial Chartreuse
  "#c6b79b", // Warm Sand
];

function formatSliceLabel(raw: string): string {
  return raw
    .replace(/_/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

/**
 * Bare, unboxed circular Pie/Donut Chart replacing the bottom-right 3-card fan.
 * Intentionally has ZERO outer card frame, border, or box shadow.
 */
export function WorkspacePieChart({
  documents,
  totalPages,
  totalTables,
  totalMetrics,
  totalRelationships,
  onSelectSection,
}: WorkspacePieChartProps) {
  const hostRef = useRef<HTMLDivElement>(null);

  const pieModel = useMemo(() => {
    const countsByCategory = new Map<string, number>();
    for (const d of documents) {
      const key = formatSliceLabel(d.category || "General");
      countsByCategory.set(key, (countsByCategory.get(key) ?? 0) + 1);
    }

    if (documents.length > 0 && countsByCategory.size >= 2) {
      const slices = Array.from(countsByCategory.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, value], idx) => ({
          name,
          value,
          target: "repository" as DashboardSectionId,
          color: PIE_PALETTE[idx % PIE_PALETTE.length],
        }));
      return {
        centerValue: String(documents.length),
        centerLabel: documents.length === 1 ? "File" : "Files",
        slices,
      };
    }

    // Telemetry composition across Workspace Intelligence layers
    const hasTelemetry =
      totalPages > 0 ||
      totalTables > 0 ||
      totalMetrics > 0 ||
      totalRelationships > 0;

    if (hasTelemetry) {
      const rawSlices = [
        {
          name: "Pages",
          value: Math.max(1, totalPages),
          target: "repository" as DashboardSectionId,
          color: PIE_PALETTE[0],
        },
        {
          name: "Metrics",
          value: Math.max(1, totalMetrics),
          target: "analytics" as DashboardSectionId,
          color: PIE_PALETTE[1],
        },
        {
          name: "Tables",
          value: Math.max(1, totalTables),
          target: "analytics" as DashboardSectionId,
          color: PIE_PALETTE[2],
        },
        {
          name: "Links",
          value: Math.max(1, totalRelationships),
          target: "layers" as DashboardSectionId,
          color: PIE_PALETTE[3],
        },
      ];
      const totalItems = documents.length || rawSlices.reduce((a, s) => a + s.value, 0);
      return {
        centerValue: documents.length > 0 ? String(documents.length) : String(totalItems),
        centerLabel: documents.length > 0 ? (documents.length === 1 ? "File" : "Files") : "Signals",
        slices: rawSlices,
      };
    }

    return {
      centerValue: "0",
      centerLabel: "Files",
      slices: [
        {
          name: "Docs",
          value: 40,
          target: "repository" as DashboardSectionId,
          color: PIE_PALETTE[0],
        },
        {
          name: "SQL",
          value: 28,
          target: "analytics" as DashboardSectionId,
          color: PIE_PALETTE[1],
        },
        {
          name: "Graph",
          value: 20,
          target: "layers" as DashboardSectionId,
          color: PIE_PALETTE[2],
        },
        {
          name: "Audio",
          value: 12,
          target: "studio" as DashboardSectionId,
          color: PIE_PALETTE[3],
        },
      ],
    };
  }, [
    documents,
    totalPages,
    totalTables,
    totalMetrics,
    totalRelationships,
  ]);

  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;

    let disposed = false;
    let chart: EChartsTypes.ECharts | null = null;
    let rafId = 0;
    let observer: ResizeObserver | null = null;

    void import("echarts").then((echarts) => {
      if (disposed || !el) return;
      chart = echarts.init(el, undefined, { renderer: "canvas" });

      const option: EChartsTypes.EChartsOption = {
        animation: true,
        animationDuration: 420,
        backgroundColor: "transparent",
        tooltip: {
          trigger: "item",
          confine: true,
          backgroundColor: "#18181b",
          borderColor: "#2e2e32",
          borderWidth: 1,
          padding: [6, 10],
          textStyle: { color: "#ffffff", fontSize: 11, fontWeight: 600 },
          formatter: "{b}: {c} ({d}%)",
        },
        series: [
          {
            name: "Workspace Mix",
            type: "pie",
            radius: ["54%", "88%"],
            center: ["50%", "50%"],
            avoidLabelOverlap: true,
            padAngle: 3,
            itemStyle: {
              borderRadius: 6,
              borderColor: "#f3f2ee",
              borderWidth: 2,
            },
            label: { show: false },
            emphasis: {
              scale: true,
              scaleSize: 4,
            },
            data: pieModel.slices.map((s) => ({
              name: s.name,
              value: s.value,
              itemStyle: { color: s.color },
            })),
          },
        ],
      };

      chart.setOption(option, true);
      chart.on("click", (params) => {
        if (typeof params.dataIndex === "number") {
          const picked = pieModel.slices[params.dataIndex];
          if (picked) {
            onSelectSection(picked.target);
          }
        }
      });

      rafId = window.requestAnimationFrame(() => chart?.resize());
      observer = new ResizeObserver(() => chart?.resize());
      observer.observe(el);
    });

    return () => {
      disposed = true;
      if (rafId) window.cancelAnimationFrame(rafId);
      observer?.disconnect();
      chart?.dispose();
    };
  }, [pieModel, onSelectSection]);

  return (
    <div className="db-pie-unboxed" aria-label="Workspace Corpus Pie Chart">
      <div className="db-pie-circle-wrap">
        <div ref={hostRef} className="db-pie-echarts-host" />
        <div className="db-pie-center-readout" aria-hidden="true">
          <strong className="db-pie-center-val">{pieModel.centerValue}</strong>
          <span className="db-pie-center-lbl">{pieModel.centerLabel}</span>
        </div>
      </div>

      <div className="db-pie-legend">
        {pieModel.slices.map((slice) => (
          <button
            key={slice.name}
            type="button"
            className="db-pie-legend-item"
            onClick={() => onSelectSection(slice.target)}
          >
            <span
              className="db-pie-legend-dot"
              style={{ backgroundColor: slice.color }}
              aria-hidden="true"
            />
            <span>{slice.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
