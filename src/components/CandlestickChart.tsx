'use client';

import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { createChart, IChartApi, ISeriesApi, CrosshairMode, Time, CandlestickData as LightweightCandlestickData } from 'lightweight-charts';

// Our custom candlestick data interface from the WebSocket hook
interface CustomCandlestickData {
  timestamp: number;
  time: number; // For lightweight-charts (timestamp in seconds)
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  symbol: string;
  interval: string;
}

interface Props {
  data: CustomCandlestickData[];
  symbol?: string;
  interval?: string;
}

interface ChartCandlestickData {
  time: Time;
  open: number;
  high: number;
  low: number;
  close: number;
}

export const CandlestickChart: React.FC<Props> = ({ data, symbol = 'BTCUSDT', interval = '30s' }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<any>(null);
  const [isChartReady, setIsChartReady] = useState(false);
  
  // Debug: Log when data changes
  useEffect(() => {
    console.log('🎯 Chart received new data:', data.length, 'candles');
    if (data.length > 0) {
      console.log('🎯 Latest candle:', data[data.length - 1]);
    }
  }, [data]);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Create chart with dark theme
    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 400,
      layout: {
        background: { color: '#1f2937' }, // Gray-800
        textColor: '#f9fafb', // Gray-50
      },
      grid: {
        vertLines: { color: '#374151' }, // Gray-700
        horzLines: { color: '#374151' }, // Gray-700
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          width: 1,
          color: '#6b7280', // Gray-500
          style: 0,
        },
        horzLine: {
          width: 1,
          color: '#6b7280', // Gray-500
          style: 0,
        },
      },
      rightPriceScale: {
        borderColor: '#374151', // Gray-700
        scaleMargins: {
          top: 0.1,
          bottom: 0.1,
        },
      },
      timeScale: {
        borderColor: '#374151', // Gray-700
        timeVisible: true,
        secondsVisible: false,
        fixLeftEdge: false, // Allow horizontal scrolling
        fixRightEdge: false, // Allow horizontal scrolling
        barSpacing: 8, // Fixed candle width - each candle is exactly 8 pixels
        minBarSpacing: 8, // Force minimum spacing to be same as barSpacing
        rightOffset: 12, // Space on the right side
        lockVisibleTimeRangeOnResize: false, // Allow scrolling when container resizes
        shiftVisibleRangeOnNewBar: false, // Don't auto-shift, let user control view
      },
    });

    // Create candlestick series with professional colors
    const candlestickSeries = (chart as any).addCandlestickSeries({
      upColor: '#10b981', // Green-500 (emerald)
      downColor: '#ef4444', // Red-500
      borderVisible: false,
      wickUpColor: '#10b981', // Green-500
      wickDownColor: '#ef4444', // Red-500
      priceFormat: {
        type: 'price',
        precision: 2,
        minMove: 0.01,
      },
    });

    chartRef.current = chart;
    seriesRef.current = candlestickSeries;
    setIsChartReady(true);

    // Handle resize - maintain fixed candle width with horizontal scroll capability
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
        
        // Maintain fixed candle width regardless of container size
        chartRef.current.timeScale().applyOptions({
          barSpacing: 8,
          minBarSpacing: 8,
        });
      }
    };

    window.addEventListener('resize', handleResize);

    // Set fixed candle width and enable horizontal scrolling
    chart.timeScale().applyOptions({
      barSpacing: 8,
      minBarSpacing: 8,
    });

    // Initially show the latest candles
    chart.timeScale().scrollToPosition(0, false);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (chartRef.current) {
        chartRef.current.remove();
      }
    };
  }, [symbol]);

  useEffect(() => {
    if (seriesRef.current && data.length > 0 && isChartReady) {
      // Transform data for lightweight-charts with uniform candle spacing
      const chartData: ChartCandlestickData[] = data.map(item => {
        // Convert timestamp to proper time format for lightweight-charts
        let timeValue: number;
        if (item.time > 1000000000000) {
          // Timestamp is in milliseconds, convert to seconds
          timeValue = Math.floor(item.time / 1000);
        } else {
          // Timestamp is already in seconds
          timeValue = Math.floor(item.time);
        }
        
        // Align to 30-second boundaries for consistent candle width
        const alignedTime = Math.floor(timeValue / 30) * 30;
        
        return {
          time: alignedTime as Time,
          open: parseFloat(item.open.toString()),
          high: parseFloat(item.high.toString()),
          low: parseFloat(item.low.toString()),
          close: parseFloat(item.close.toString()),
        };
      });

      // Sort data by time (should already be sorted from backend)
      chartData.sort((a, b) => (a.time as number) - (b.time as number));

      // Use setData for better performance with uniform candle spacing
      console.log('🎯 Setting chart data:', chartData.length, 'candles');
      seriesRef.current.setData(chartData);
      
      // Scroll to the latest candle while maintaining fixed width and horizontal scroll
      if (chartRef.current) {
        // Enforce fixed candle width
        chartRef.current.timeScale().applyOptions({
          barSpacing: 8,
          minBarSpacing: 8,
        });
        // Auto-scroll to latest candle
        chartRef.current.timeScale().scrollToPosition(0, false);
      }
    }
  }, [data, isChartReady]); // Real-time updates based on data changes

  return (
    <div className="w-full bg-gray-800 rounded-lg overflow-hidden">
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">
            {symbol.replace('USDT', '/USDT')} Candlestick Chart
          </h3>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-400">{interval} intervals • Fixed width candles with horizontal scroll</span>
            {data.length > 0 && (
              <div className="text-sm">
                <span className="text-gray-400">Last: </span>
                <span className="font-mono text-white">
                  ${data[data.length - 1]?.close.toFixed(2)}
                </span>
              </div>
            )}
          </div>
        </div>
        <div className="text-xs text-gray-500 mt-2">
          📊 Use mouse wheel or drag to scroll horizontally • Each candle is exactly 8 pixels wide
        </div>
      </div>
      
      <div className="relative">
        <div 
          ref={chartContainerRef} 
          className="w-full h-96 bg-gray-800"
        />
      </div>
      
      {data.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-400">Loading candlestick data...</p>
          </div>
        </div>
      )}
    </div>
  );
};