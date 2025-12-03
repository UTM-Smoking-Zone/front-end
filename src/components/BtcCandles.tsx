"use client";

import { useEffect, useRef } from "react";
import { createChart, IChartApi, ISeriesApi, CandlestickData } from "lightweight-charts";
import { io } from "socket.io-client";

type Props = {
  backendBaseUrl: string;
  symbol?: string;   // e.g., BTCUSDT
  interval?: string; // e.g., 1m
};

export default function BtcCandles({ backendBaseUrl, symbol = "BTCUSDT", interval = "1m" }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);

  // Init chart + load history + connect socket
  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      height: 520,
      layout: { background: { color: "#0b0f14" }, textColor: "#e6e9ef" },
      grid: { vertLines: { color: "#1c252f" }, horzLines: { color: "#1c252f" } }
    });
    const series = chart.addCandlestickSeries();

    chartRef.current = chart;
    seriesRef.current = series;

    // 1) History
    fetch(`${backendBaseUrl}/candles?symbol=${symbol}&interval=${interval}&limit=500`)
      .then(r => r.json())
      .then((rows: CandlestickData[]) => {
        series.setData(rows);
        chart.timeScale().fitContent();
      })
      .catch(console.error);

    // 2) Live updates
    const socket = io(`${backendBaseUrl}/market`, {
      transports: ["websocket"],
    });

    socket.on("connect", () => {
      // console.log("Socket connected");
    });

    socket.on("kline", (k: any) => {
      // only process events for our symbol/interval
      if (k?.symbol?.toLowerCase() !== symbol.toLowerCase()) return;
      if (k?.interval !== interval) return;
      series.update({
        time: k.time,
        open: k.open,
        high: k.high,
        low: k.low,
        close: k.close,
      });
    });

    socket.on("disconnect", () => { /* noop */ });

    // Cleanup
    return () => {
      socket.disconnect();
      chart.remove();
    };
  }, [backendBaseUrl, symbol, interval]);

  // autoresize
  useEffect(() => {
    const onResize = () => {
      if (!containerRef.current || !chartRef.current) return;
      const width = containerRef.current.clientWidth;
      chartRef.current.applyOptions({ width });
    };
    window.addEventListener("resize", onResize);
    onResize();
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return <div ref={containerRef} style={{ width: "100%", height: 520 }} />;
}
