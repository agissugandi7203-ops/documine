"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import type * as EChartsTypes from "echarts";
import { ArrowUpRight, Flame } from "lucide-react";
import type {
  AnalyticsWidget,
  DocumentItem,
} from "@/lib/dashboard-api";
import { MonochromeChart } from "./MonochromeChart";

export type ChartWindow = "7d" | "30d" | "all";

interface EChartsKpiMiniProps {
  points: number[];
  variant: "bars" | "spline" | "darkWave";
  labels?: string[];
}

/**
 * Crisp ECharts mini chart for stacked layer cards using rectangular bars
 * and clean area curves.
 */
export function EChartsKpiMini({
  points,
  variant,
  labels = ["Sat", "Sun", "Mon", "Tue", "Wed", "Thu", "Fri"],
}: EChartsKpiMiniProps) {
  const hostRef = useRef<HTMLDivElement>(null);

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
      const safeData =
        points.length >= 2 ? points : [18, 26, 22, 38, 31, 27, 34];
      const xLabels = labels.slice(0, safeData.length);
      const maxVal = Math.max(...safeData, 1);

      const option: EChartsTypes.EChartsOption = {
        animation: true,
        animationDuration: 320,
        backgroundColor: "transparent",
        tooltip: {
          trigger: "axis",
          confine: true,
          backgroundColor: "#18181b",
          borderColor: "#2e2e32",
          borderWidth: 1,
          padding: [4, 8],
          textStyle: { color: "#ffffff", fontSize: 10.5 },
        },
        grid: {
          top: 4,
          right: 2,
          bottom: 2,
          left: 2,
          containLabel: false,
        },
        xAxis: {
          type: "category",
          data: xLabels,
          boundaryGap: variant === "bars",
          show: false,
        },
        yAxis: {
          type: "value",
          min: 0,
          show: false,
        },
        series:
          variant === "bars"
            ? [
                {
                  name: "Volume",
                  type: "bar",
                  barWidth: "56%",
                  data: safeData.map((val) => ({
                    value: val,
                    itemStyle: {
                      color: val === maxVal ? "#e85a24" : "#d4cfc4",
                      borderRadius: [3, 3, 0, 0],
                    },
                  })),
                },
              ]
            : [
                {
                  name: "Trend",
                  type: "line",
                  smooth: 0.38,
                  symbol: "none",
                  data: safeData,
                  lineStyle: {
                    width: 2.2,
                    color: variant === "darkWave" ? "#e85a24" : "#18181b",
                  },
                  areaStyle: {
                    color:
                      variant === "darkWave"
                        ? "rgba(232, 90, 36, 0.24)"
                        : "rgba(24, 24, 27, 0.1)",
                  },
                },
              ],
      };

      chart.setOption(option, true);
      rafId = window.requestAnimationFrame(() => {
        chart?.resize();
      });

      observer = new ResizeObserver(() => {
        chart?.resize();
      });
      observer.observe(el);
    });

    return () => {
      disposed = true;
      if (rafId) window.cancelAnimationFrame(rafId);
      observer?.disconnect();
      chart?.dispose();
    };
  }, [points, variant, labels]);

  return (
    <div
      ref={hostRef}
      className="db-kpi-echarts-mini"
      style={{ width: "86px", height: "36px" }}
    />
  );
}

interface HeroActivityChartProps {
  chartWindow: ChartWindow;
  documents: DocumentItem[];
  totalDocs: number;
  totalPages: number;
  totalMetrics: number;
  totalTables: number;
  totalRelationships: number;
  primaryWidget: AnalyticsWidget | null;
  onExploreAnalytics: () => void;
}

/**
 * Editorial Activity & Engagement Card blending:
 * - Bar mode: ECharts rectangular bars with native diagonal print-hatch decal on secondary bars
 *   and solid terracotta highlight on the active/peak bar (zero CSS gradients).
 * - Rhythm mode: Oripio-inspired interactive vertical hairline stems with floating nodes.
 * - Line mode: Clean ECharts spline curve with tactile focus markers.
 */
export function HeroActivityChart({
  chartWindow,
  documents,
  totalDocs,
  totalPages,
  totalMetrics,
  totalTables,
  totalRelationships,
  primaryWidget,
  onExploreAnalytics,
}: HeroActivityChartProps) {
  const [chartType, setChartType] = useState<"bar" | "rhythm" | "line" | "sql">(
    "bar"
  );
  const [activeBarIndex, setActiveBarIndex] = useState<number | null>(null);
  const chartHostRef = useRef<HTMLDivElement>(null);

  const hasLiveWidget = Boolean(
    primaryWidget?.echarts_spec?.series?.[0]?.data?.length
  );

  const chartDataset = useMemo(() => {
    if (documents.length > 0) {
      const slice = documents.slice(0, 6);
      return {
        categories: slice.map((d) =>
          d.title.length > 9 ? `${d.title.slice(0, 8)}…` : d.title
        ),
        values: slice.map((d) =>
          Math.max(18, (d.page_count || 4) * 9 + (d.metric_count || 2) * 6)
        ),
      };
    }

    if (chartWindow === "30d") {
      return {
        categories: ["W1", "W2", "W3", "W4", "W5", "W6"],
        values: [190, 295, 220, 395, 310, 245],
      };
    }

    if (chartWindow === "all") {
      return {
        categories: ["Docs", "Pages", "SQL", "Tables", "Graph", "Studio"],
        values: [
          Math.max(140, totalDocs * 45),
          Math.max(260, totalPages * 12),
          Math.max(210, totalMetrics * 18),
          Math.max(380, (totalTables + 4) * 35),
          Math.max(290, (totalRelationships + 3) * 28),
          230,
        ],
      };
    }

    return {
      categories: ["Sat", "Sun", "Mon", "Tue", "Wed", "Thu"],
      values: [195, 298, 215, 396, 312, 234],
    };
  }, [
    documents,
    chartWindow,
    totalDocs,
    totalPages,
    totalMetrics,
    totalTables,
    totalRelationships,
  ]);

  const peakIndex = useMemo(() => {
    let bestIdx = 0;
    let bestVal = -Infinity;
    chartDataset.values.forEach((v, idx) => {
      if (v > bestVal) {
        bestVal = v;
        bestIdx = idx;
      }
    });
    return bestIdx;
  }, [chartDataset.values]);

  const focusedIdx =
    activeBarIndex !== null && activeBarIndex < chartDataset.values.length
      ? activeBarIndex
      : peakIndex;
  const focusedLabel = chartDataset.categories[focusedIdx] ?? "Peak";
  const focusedValue = chartDataset.values[focusedIdx] ?? 0;

  useEffect(() => {
    if (chartType === "rhythm") return;
    if (chartType === "sql" && hasLiveWidget) return;
    const host = chartHostRef.current;
    if (!host) return;

    let disposed = false;
    let chart: EChartsTypes.ECharts | null = null;
    let rafId = 0;
    let observer: ResizeObserver | null = null;

    void import("echarts").then((echarts) => {
      if (disposed || !host) return;
      chart = echarts.init(host, undefined, { renderer: "canvas" });

      const option: EChartsTypes.EChartsOption = {
        animation: true,
        animationDuration: 360,
        backgroundColor: "transparent",
        tooltip: {
          trigger: "axis",
          axisPointer: { type: "none" },
          backgroundColor: "#18181b",
          borderColor: "#2d2d30",
          padding: [6, 10],
          textStyle: { color: "#f6f5f1", fontSize: 11.5, fontWeight: 600 },
        },
        grid: {
          top: 22,
          right: 12,
          bottom: 24,
          left: 36,
          containLabel: false,
        },
        xAxis: {
          type: "category",
          data: chartDataset.categories,
          axisLine: { show: false },
          axisTick: { show: false },
          axisLabel: {
            color: "#555450",
            fontSize: 11,
            fontWeight: 600,
            margin: 10,
          },
        },
        yAxis: {
          type: "value",
          splitNumber: 4,
          axisLine: { show: false },
          axisTick: { show: false },
          splitLine: {
            lineStyle: { color: "#e2dfd7", type: "dashed" },
          },
          axisLabel: {
            color: "#7c7a74",
            fontSize: 10.5,
            fontWeight: 600,
          },
        },
        series:
          chartType === "line"
            ? [
                {
                  name: "Activity",
                  type: "line",
                  smooth: 0.38,
                  symbol: "circle",
                  symbolSize: 8,
                  data: chartDataset.values,
                  lineStyle: { width: 2.6, color: "#18181b" },
                  itemStyle: {
                    color: "#e85a24",
                    borderColor: "#ffffff",
                    borderWidth: 2,
                  },
                  areaStyle: {
                    color: "rgba(232, 90, 36, 0.13)",
                  },
                },
              ]
            : [
                {
                  name: "Activity",
                  type: "bar",
                  barWidth: 36,
                  data: chartDataset.values.map((val, idx) => {
                    const isFocused = idx === focusedIdx;
                    return {
                      value: val,
                      label: {
                        show: isFocused,
                        position: "top",
                        distance: 5,
                        color: "#18181b",
                        fontSize: 10.5,
                        fontWeight: 700,
                        backgroundColor: "#dbdc54",
                        padding: [2, 6],
                        borderRadius: 6,
                      },
                      itemStyle: isFocused
                        ? {
                            color: "#e85a24",
                            borderRadius: [8, 8, 4, 4],
                          }
                        : {
                            color: "#b7cfc6",
                            borderRadius: [8, 8, 4, 4],
                            decal: {
                              symbol: "rect",
                              dashArrayX: [1, 0],
                              dashArrayY: [2, 5],
                              rotation: -Math.PI / 4,
                              color: "rgba(255, 255, 255, 0.48)",
                            },
                          },
                    };
                  }),
                },
              ],
      };

      chart.setOption(option, true);
      chart.on("click", (params) => {
        if (typeof params.dataIndex === "number") {
          setActiveBarIndex(params.dataIndex);
        }
      });

      rafId = window.requestAnimationFrame(() => {
        chart?.resize();
      });

      observer = new ResizeObserver(() => {
        chart?.resize();
      });
      observer.observe(host);
    });

    return () => {
      disposed = true;
      if (rafId) window.cancelAnimationFrame(rafId);
      observer?.disconnect();
      chart?.dispose();
    };
  }, [chartType, hasLiveWidget, chartDataset, focusedIdx]);

  const maxRhythm = Math.max(...chartDataset.values, 1);

  return (
    <div className="db-rect-card db-activity-rect-card">
      <div className="db-rect-card-head">
        <div className="db-rect-head-left">
          <span className="db-rect-card-title">Engagement & Activity</span>
          <span className="db-peak-callout-pill">
            <Flame size={11} className="db-peak-callout-icon" />
            <span>
              {focusedLabel} · <strong>{focusedValue}</strong>
            </span>
          </span>
        </div>

        <div className="db-rect-head-right">
          <div className="db-rect-tabs" role="tablist" aria-label="Chart mode">
            <button
              type="button"
              role="tab"
              aria-selected={chartType === "bar"}
              className={`db-rect-tab ${
                chartType === "bar" ? "db-rect-tab--active" : ""
              }`}
              onClick={() => setChartType("bar")}
            >
              Bar
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={chartType === "rhythm"}
              className={`db-rect-tab ${
                chartType === "rhythm" ? "db-rect-tab--active" : ""
              }`}
              onClick={() => setChartType("rhythm")}
            >
              Rhythm
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={chartType === "line"}
              className={`db-rect-tab ${
                chartType === "line" ? "db-rect-tab--active" : ""
              }`}
              onClick={() => setChartType("line")}
            >
              Line
            </button>
            {hasLiveWidget && (
              <button
                type="button"
                role="tab"
                aria-selected={chartType === "sql"}
                className={`db-rect-tab ${
                  chartType === "sql" ? "db-rect-tab--active" : ""
                }`}
                onClick={() => setChartType("sql")}
              >
                SQL
              </button>
            )}
          </div>

          <button
            type="button"
            className="db-rect-icon-link"
            aria-label="Open Analytics"
            onClick={onExploreAnalytics}
          >
            <ArrowUpRight size={14} />
          </button>
        </div>
      </div>

      <div className="db-rect-chart-well">
        {chartType === "rhythm" ? (
          <div className="db-rhythm-stage" role="list" aria-label="Activity rhythm stems">
            {chartDataset.categories.map((cat, idx) => {
              const val = chartDataset.values[idx] ?? 0;
              const pct = Math.max(14, Math.min(86, Math.round((val / maxRhythm) * 82)));
              const isSelected = idx === focusedIdx;
              return (
                <button
                  key={`${cat}-${idx}`}
                  type="button"
                  role="listitem"
                  className={`db-rhythm-col ${
                    isSelected ? "db-rhythm-col--active" : ""
                  }`}
                  onClick={() => setActiveBarIndex(idx)}
                >
                  <div className="db-rhythm-track">
                    <span className="db-rhythm-hairline" aria-hidden="true" />
                    <span
                      className="db-rhythm-node"
                      style={{ bottom: `${pct}%` }}
                    >
                      <span className="db-rhythm-node-dot" />
                    </span>
                  </div>
                  <span className="db-rhythm-val">{val}</span>
                  <span className="db-rhythm-label">{cat}</span>
                </button>
              );
            })}
          </div>
        ) : chartType === "sql" && hasLiveWidget && primaryWidget ? (
          <MonochromeChart widget={primaryWidget} height={176} />
        ) : (
          <div
            ref={chartHostRef}
            style={{ width: "100%", height: "176px" }}
            aria-label="Activity bar chart"
          />
        )}
      </div>
    </div>
  );
}
