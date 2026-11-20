"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import * as echarts from "echarts";
import {
  AlignLeft,
  AreaChart,
  BarChart3,
  Database,
  Download,
  Grid3X3,
  LineChart,
  MessageSquare,
  PieChart as PieChartIcon,
  Table2,
} from "lucide-react";
import type {
  DynamicAnalyticsChartSpec,
  DynamicChartType,
} from "@/lib/dashboard-api";

const ATELIER_PALETTE = [
  "#e85a24", // Terracotta
  "#2c6b58", // Sage
  "#2563eb", // Executive Blue
  "#d97706", // Ochre
  "#7c3aed", // Violet
  "#0f766e", // Deep Teal
  "#18181b", // Ink
];

function escapeCsvCell(val: unknown): string {
  const s = String(val ?? "");
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return `"${safe.replace(/"/g, '""')}"`;
}

interface DynamicAnalyticsChartProps {
  spec: DynamicAnalyticsChartSpec;
  featured?: boolean;
  onAskAboutChart?: (spec: DynamicAnalyticsChartSpec) => void;
}

function buildEChartsOption(
  spec: DynamicAnalyticsChartSpec,
  activeType: DynamicChartType
): echarts.EChartsOption {
  const labels = spec.labels || [];
  const seriesList = spec.series || [];
  const firstSeries = seriesList[0] || { name: spec.unit || "Nilai", data: [] };
  const isMulti = seriesList.length > 1;

  // PIE or DONUT
  if (activeType === "pie" || activeType === "donut") {
    const isDonut = activeType === "donut";
    const pieData = labels.map((lbl, idx) => ({
      name: lbl,
      value: Math.max(0, Number(firstSeries.data[idx] ?? 0)),
    }));
    const total = pieData.reduce((acc, item) => acc + item.value, 0);

    return {
      color: ATELIER_PALETTE,
      animationDuration: 500,
      tooltip: {
        trigger: "item",
        backgroundColor: "#18181b",
        borderColor: "#18181b",
        textStyle: { color: "#ffffff", fontSize: 12 },
        formatter: `{b}<br/><b>{c}</b> ${spec.unit ? spec.unit : ""} ({d}%)`,
      },
      legend: {
        type: "scroll",
        bottom: 0,
        icon: "circle",
        itemWidth: 8,
        itemHeight: 8,
        textStyle: { color: "#52525b", fontSize: 11, fontWeight: 500 },
      },
      series: [
        {
          name: firstSeries.name,
          type: "pie",
          radius: isDonut ? ["48%", "74%"] : ["0%", "70%"],
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
                formatter: () =>
                  `{val|${Number.isInteger(total) ? total : total.toFixed(1)}}\n{lbl|Total}`,
                rich: {
                  val: {
                    fontSize: 20,
                    fontWeight: 800,
                    color: "#18181b",
                    lineHeight: 24,
                  },
                  lbl: {
                    fontSize: 11,
                    fontWeight: 600,
                    color: "#75736c",
                  },
                },
              }
            : {
                show: true,
                formatter: "{b}: {d}%",
                fontSize: 11,
                color: "#3f3f46",
                fontWeight: 600,
              },
          emphasis: { scaleSize: 6 },
          data: pieData,
        },
      ],
    };
  }

  // SURFACE / 2D MATRIX HEATMAP
  if (activeType === "heatmap") {
    const yNames = seriesList.map((s) => s.name);
    const pts: Array<[number, number, number]> = [];
    let minVal = Infinity;
    let maxVal = -Infinity;
    seriesList.forEach((s, yi) => {
      labels.forEach((_, xi) => {
        const v = Number(s.data[xi] ?? 0);
        if (v < minVal) minVal = v;
        if (v > maxVal) maxVal = v;
        pts.push([xi, yi, v]);
      });
    });
    if (!Number.isFinite(minVal)) minVal = 0;
    if (!Number.isFinite(maxVal) || maxVal <= minVal) maxVal = minVal + 1;

    return {
      animationDuration: 420,
      tooltip: {
        position: "top",
        backgroundColor: "#18181b",
        borderColor: "#18181b",
        textStyle: { color: "#ffffff", fontSize: 12 },
        formatter: (p: unknown) => {
          const item = p as { value?: [number, number, number] };
          const [xi, yi, val] = item.value ?? [0, 0, 0];
          return `${labels[xi] || ""} · ${yNames[yi] || ""}<br/><b>${val}</b> ${spec.unit || ""}`;
        },
      },
      grid: { top: 14, right: 16, bottom: 48, left: 12, containLabel: true },
      xAxis: {
        type: "category",
        data: labels,
        splitArea: { show: true },
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          color: "#52525b",
          fontSize: 11,
          rotate: labels.length > 6 ? 20 : 0,
        },
      },
      yAxis: {
        type: "category",
        data: yNames,
        splitArea: { show: true },
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: "#27272a", fontSize: 11, fontWeight: 600 },
      },
      visualMap: {
        min: minVal,
        max: maxVal,
        orient: "horizontal",
        left: "center",
        bottom: 2,
        itemWidth: 10,
        itemHeight: 110,
        textStyle: { color: "#75736c", fontSize: 10.5 },
        inRange: {
          color: ["#f5f4ef", "#fde2d2", "#f59e6c", "#e85a24", "#9a2f0c"],
        },
      },
      series: [
        {
          type: "heatmap",
          data: pts,
          label: {
            show: labels.length <= 10 && yNames.length <= 5,
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
  }

  // HORIZONTAL BAR
  if (activeType === "horizontal_bar") {
    return {
      color: ATELIER_PALETTE,
      animationDuration: 480,
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
        backgroundColor: "#18181b",
        borderColor: "#18181b",
        textStyle: { color: "#ffffff", fontSize: 12 },
      },
      legend: isMulti
        ? {
            top: 0,
            right: 4,
            icon: "circle",
            itemWidth: 8,
            itemHeight: 8,
            textStyle: { color: "#52525b", fontSize: 11 },
          }
        : undefined,
      grid: {
        top: isMulti ? 30 : 10,
        right: 34,
        bottom: 14,
        left: 10,
        containLabel: true,
      },
      xAxis: {
        type: "value",
        splitLine: { lineStyle: { color: "#efede7", type: "dashed" } },
        axisLabel: { color: "#75736c", fontSize: 11 },
      },
      yAxis: {
        type: "category",
        inverse: true,
        data: labels,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          color: "#27272a",
          fontSize: 11.5,
          fontWeight: 600,
          width: 136,
          overflow: "truncate",
        },
      },
      series: seriesList.map((s, idx) => ({
        name: s.name,
        type: "bar",
        barMaxWidth: isMulti ? 14 : 22,
        data: s.data.map((v, i) => ({
          value: v,
          itemStyle: {
            color:
              !isMulti && i === 0
                ? "#e85a24"
                : ATELIER_PALETTE[idx % ATELIER_PALETTE.length],
            borderRadius: [0, 7, 7, 0],
          },
        })),
        label: !isMulti
          ? {
              show: true,
              position: "right",
              color: "#3f3f46",
              fontSize: 11,
              fontWeight: 700,
            }
          : undefined,
      })),
    };
  }

  // LINE / AREA / STACKED AREA
  if (
    activeType === "line" ||
    activeType === "area" ||
    activeType === "stacked_area"
  ) {
    const isArea = activeType === "area" || activeType === "stacked_area";
    const isStacked = activeType === "stacked_area" && isMulti;

    return {
      color: ATELIER_PALETTE,
      animationDuration: 520,
      tooltip: {
        trigger: "axis",
        backgroundColor: "#18181b",
        borderColor: "#18181b",
        textStyle: { color: "#ffffff", fontSize: 12 },
      },
      legend: isMulti
        ? {
            top: 0,
            right: 4,
            icon: "circle",
            itemWidth: 8,
            itemHeight: 8,
            textStyle: { color: "#52525b", fontSize: 11 },
          }
        : undefined,
      grid: {
        top: isMulti ? 32 : 16,
        right: 16,
        bottom: 24,
        left: 12,
        containLabel: true,
      },
      xAxis: {
        type: "category",
        boundaryGap: false,
        data: labels,
        axisLine: { lineStyle: { color: "#e5e2d9" } },
        axisTick: { show: false },
        axisLabel: {
          color: "#6b6860",
          fontSize: 11,
          rotate: labels.length > 7 ? 24 : 0,
        },
      },
      yAxis: {
        type: "value",
        splitLine: { lineStyle: { color: "#efede7", type: "dashed" } },
        axisLabel: { color: "#75736c", fontSize: 11 },
      },
      series: seriesList.map((s, idx) => ({
        name: s.name,
        type: "line",
        stack: isStacked ? "total" : undefined,
        smooth: 0.35,
        symbol: "circle",
        symbolSize: 7,
        lineStyle: {
          width: 2.5,
          color: ATELIER_PALETTE[idx % ATELIER_PALETTE.length],
        },
        itemStyle: {
          color: ATELIER_PALETTE[idx % ATELIER_PALETTE.length],
          borderColor: "#ffffff",
          borderWidth: 2,
        },
        areaStyle: isArea
          ? {
              opacity: isStacked ? 0.35 : 0.2,
            }
          : undefined,
        data: s.data,
      })),
    };
  }

  // Default: COLUMN (Vertical Bar / Grouped Column)
  return {
    color: ATELIER_PALETTE,
    animationDuration: 480,
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      backgroundColor: "#18181b",
      borderColor: "#18181b",
      textStyle: { color: "#ffffff", fontSize: 12 },
    },
    legend: isMulti
      ? {
          top: 0,
          right: 4,
          icon: "circle",
          itemWidth: 8,
          itemHeight: 8,
          textStyle: { color: "#52525b", fontSize: 11 },
        }
      : undefined,
    grid: {
      top: isMulti ? 32 : 16,
      right: 14,
      bottom: 24,
      left: 10,
      containLabel: true,
    },
    xAxis: {
      type: "category",
      data: labels,
      axisLine: { lineStyle: { color: "#e5e2d9" } },
      axisTick: { show: false },
      axisLabel: {
        color: "#52525b",
        fontSize: 11,
        interval: 0,
        rotate: labels.length > 6 ? 22 : 0,
        width: 96,
        overflow: "truncate",
      },
    },
    yAxis: {
      type: "value",
      splitLine: { lineStyle: { color: "#efede7", type: "dashed" } },
      axisLabel: { color: "#75736c", fontSize: 11 },
    },
    series: seriesList.map((s, idx) => ({
      name: s.name,
      type: "bar",
      barMaxWidth: isMulti ? 22 : 38,
      data: s.data.map((v, i) => ({
        value: v,
        itemStyle: {
          color:
            !isMulti && i === 0
              ? "#e85a24"
              : ATELIER_PALETTE[idx % ATELIER_PALETTE.length],
          borderRadius: [8, 8, 0, 0],
        },
      })),
    })),
  };
}

export function DynamicAnalyticsChart({
  spec,
  featured = false,
  onAskAboutChart,
}: DynamicAnalyticsChartProps) {
  const [chartType, setChartType] = useState<DynamicChartType>(spec.chart_type);
  const [showData, setShowData] = useState(false);
  const hostRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    setChartType(spec.chart_type);
  }, [spec.id, spec.chart_type]);

  const option = useMemo(
    () => buildEChartsOption(spec, chartType),
    [spec, chartType]
  );

  useEffect(() => {
    const el = hostRef.current;
    if (!el || showData) return;

    const chart = echarts.init(el, undefined, { renderer: "canvas" });
    instanceRef.current = chart;
    chart.setOption(option, true);

    const observer = new ResizeObserver(() => {
      chart.resize();
    });
    observer.observe(el);

    return () => {
      observer.disconnect();
      chart.dispose();
      instanceRef.current = null;
    };
  }, [option, showData]);

  const isMultiSeries = (spec.series?.length ?? 0) > 1;
  const rowCols = spec.rows?.[0] ? Object.keys(spec.rows[0]) : [];

  const handleDownloadCsv = () => {
    if (!spec.rows || spec.rows.length === 0) return;
    const headerLine = rowCols.map(escapeCsvCell).join(",");
    const bodyLines = spec.rows.map((r) =>
      rowCols.map((c) => escapeCsvCell(r[c] ?? "")).join(",")
    );
    const blob = new Blob([[headerLine, ...bodyLines].join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${spec.id || "chart-data"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <article className={`an-chart-card ${featured ? "an-chart-card--featured" : ""}`}>
      <header className="an-chart-head">
        <div className="an-chart-title-wrap">
          <h3 className="an-chart-title">{spec.title}</h3>
          <p className="an-chart-sub">{spec.subtitle}</p>
        </div>

        <div className="an-chart-controls">
          <div className="an-chart-type-group" role="group" aria-label="Switch chart type">
            <button
              type="button"
              className={`an-type-btn ${
                !showData && (chartType === "bar" || chartType === "grouped_bar")
                  ? "is-active"
                  : ""
              }`}
              title="Column Chart"
              onClick={() => {
                setShowData(false);
                setChartType(isMultiSeries ? "grouped_bar" : "bar");
              }}
            >
              <BarChart3 size={13} />
            </button>
            <button
              type="button"
              className={`an-type-btn ${
                !showData && chartType === "horizontal_bar" ? "is-active" : ""
              }`}
              title="Horizontal Bar Chart"
              onClick={() => {
                setShowData(false);
                setChartType("horizontal_bar");
              }}
            >
              <AlignLeft size={13} />
            </button>
            <button
              type="button"
              className={`an-type-btn ${
                !showData && chartType === "line" ? "is-active" : ""
              }`}
              title="Line Chart"
              onClick={() => {
                setShowData(false);
                setChartType("line");
              }}
            >
              <LineChart size={13} />
            </button>
            <button
              type="button"
              className={`an-type-btn ${
                !showData && (chartType === "area" || chartType === "stacked_area")
                  ? "is-active"
                  : ""
              }`}
              title="Area Chart"
              onClick={() => {
                setShowData(false);
                setChartType(isMultiSeries ? "stacked_area" : "area");
              }}
            >
              <AreaChart size={13} />
            </button>
            {!isMultiSeries && (
              <button
                type="button"
                className={`an-type-btn ${
                  !showData && (chartType === "pie" || chartType === "donut")
                    ? "is-active"
                    : ""
                }`}
                title="Pie / Donut Chart (click again to toggle)"
                onClick={() => {
                  setShowData(false);
                  setChartType((prev) => (prev === "donut" ? "pie" : "donut"));
                }}
              >
                <PieChartIcon size={13} />
              </button>
            )}
            <button
              type="button"
              className={`an-type-btn ${
                !showData && chartType === "heatmap" ? "is-active" : ""
              }`}
              title="Surface Intensity Matrix"
              onClick={() => {
                setShowData(false);
                setChartType("heatmap");
              }}
            >
              <Grid3X3 size={13} />
            </button>
            {spec.rows && spec.rows.length > 0 && (
              <>
                <button
                  type="button"
                  className={`an-type-btn ${showData ? "is-active" : ""}`}
                  title="Data Table View"
                  onClick={() => setShowData((p) => !p)}
                >
                  <Table2 size={13} />
                </button>
                <button
                  type="button"
                  className="an-type-btn"
                  title="Export CSV"
                  onClick={handleDownloadCsv}
                >
                  <Download size={13} />
                </button>
              </>
            )}
          </div>

          {onAskAboutChart && (
            <button
              type="button"
              className="an-chart-ask-btn"
              onClick={() => onAskAboutChart(spec)}
              title="Ask AI more about this data"
            >
              <MessageSquare size={12} />
              <span>Ask AI</span>
            </button>
          )}
        </div>
      </header>

      {showData && spec.rows && spec.rows.length > 0 ? (
        <div className="an-data-table-wrap">
          <table className="an-data-table">
            <thead>
              <tr>
                {rowCols.map((col) => (
                  <th key={col}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {spec.rows.map((row, rIdx) => (
                <tr key={rIdx}>
                  {rowCols.map((col) => (
                    <td key={col}>{String(row[col] ?? "-")}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div
          ref={hostRef}
          className={`an-chart-canvas ${featured ? "is-tall" : ""}`}
        />
      )}

      <footer className="an-chart-foot">
        <p className="an-chart-takeaway">{spec.takeaway}</p>
        <div className="an-chart-meta-row">
          <div className="an-chart-sources">
            {(spec.source_labels || []).slice(0, 2).map((lbl) => (
              <span key={lbl} className="an-source-pill">
                {lbl}
              </span>
            ))}
          </div>
          {spec.sql_query && (
            <span className="an-sql-chip" title={spec.sql_query}>
              <Database size={11} />
              <span>DuckDB Verified</span>
            </span>
          )}
        </div>
      </footer>
    </article>
  );
}

export default DynamicAnalyticsChart;
