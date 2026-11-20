"use client";

import React, { useEffect, useRef } from "react";
import type * as EChartsTypes from "echarts";
import type { AnalyticsWidget } from "@/lib/dashboard-api";

interface MonochromeChartProps {
  widget: AnalyticsWidget;
  height?: number;
}

/**
 * Renders backend ECharts specification using the editorial flat palette
 * (Terracotta active bar + Warm Stone inactive bars, zero gradients).
 */
export function MonochromeChart({ widget, height = 185 }: MonochromeChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !widget.echarts_spec) return;

    let disposed = false;
    let chart: EChartsTypes.ECharts | null = null;
    let observer: ResizeObserver | null = null;

    void import("echarts").then((echarts) => {
      if (disposed || !el) return;
      chart = echarts.init(el);
      const spec = widget.echarts_spec!;
      const isPie = widget.chart_type === "pie";

      const rawSeries = spec.series ?? [];
      const firstData = rawSeries[0]?.data ?? [];
      const numericVals = firstData.map((d) =>
        typeof d === "number" ? d : Number(d?.value ?? 0)
      );
      const maxVal = numericVals.length ? Math.max(...numericVals) : 0;

      const option: EChartsTypes.EChartsOption = {
        backgroundColor: "transparent",
        color: ["#e85a24", "#18181b", "#8fb3a8", "#d8d3c8", "#c86d44"],
        tooltip: {
          trigger: isPie ? "item" : "axis",
          backgroundColor: "#18181b",
          borderColor: "#2e2e32",
          textStyle: { color: "#f4f3ef", fontSize: 11 },
        },
        grid: isPie
          ? undefined
          : { top: 16, right: 12, bottom: 26, left: 34, containLabel: true },
        xAxis: isPie
          ? undefined
          : {
              type: "category",
              data: spec.xAxis?.data ?? [],
              axisLine: { show: false },
              axisTick: { show: false },
              axisLabel: {
                color: "#74736f",
                fontSize: 10.5,
                interval: 0,
                overflow: "truncate",
                width: 72,
              },
            },
        yAxis: isPie
          ? undefined
          : {
              type: "value",
              splitLine: { lineStyle: { color: "#eceae4", type: "dashed" } },
              axisLabel: { color: "#8c8b85", fontSize: 10 },
            },
        series: rawSeries.map((s) => {
          const seriesType = (s.type as "bar" | "line" | "pie") || "bar";
          const mappedData =
            seriesType === "bar" && Array.isArray(s.data)
              ? s.data.map((item) => {
                  const v =
                    typeof item === "number" ? item : Number(item?.value ?? 0);
                  const isPeak = maxVal > 0 && v === maxVal;
                  return {
                    value: v,
                    itemStyle: {
                      color: isPeak ? "#e85a24" : "#e6e3db",
                      borderRadius: [10, 10, 10, 10],
                    },
                  };
                })
              : s.data ?? [];

          return {
            name: s.name || widget.unit_or_currency || "Value",
            type: seriesType,
            data: mappedData,
            smooth: true,
            barMaxWidth: 26,
            lineStyle:
              seriesType === "line"
                ? { width: 2.5, color: "#e85a24" }
                : undefined,
            itemStyle: isPie
              ? { borderColor: "#ffffff", borderWidth: 2 }
              : seriesType === "line"
              ? { color: "#e85a24" }
              : undefined,
            label: isPie ? { color: "#18181b", fontSize: 10.5 } : undefined,
          };
        }),
      };

      chart.setOption(option);

      observer = new ResizeObserver(() => {
        chart?.resize();
      });
      observer.observe(el);
    });

    return () => {
      disposed = true;
      observer?.disconnect();
      chart?.dispose();
    };
  }, [widget]);

  return (
    <div
      ref={containerRef}
      style={{ width: "100%", height: `${height}px` }}
      aria-label={widget.title}
    />
  );
}
