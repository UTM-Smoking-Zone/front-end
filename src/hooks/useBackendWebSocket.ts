'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

export interface CandlestickData {
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

// Simplified Backend WebSocket Hook - Chart viewing only
export function useBackendWebSocket(backendUrl: string = 'http://localhost:3001/crypto') {
  const [isConnected, setIsConnected] = useState(false);
  const [candlestickData, setCandlestickData] = useState<CandlestickData[]>([]);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdateTime, setLastUpdateTime] = useState<number>(0);
  
  const socketRef = useRef<Socket | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Function to handle candlestick data from any event
  const handleCandlestickData = useCallback((data: any) => {
    // Ensure proper data format and time conversion
    console.log('📊 Raw data received every second:', data);
    
    const processedData: CandlestickData = {
      timestamp: data.timestamp || data.time || Date.now(),
      time: data.time || Math.floor((data.timestamp || Date.now()) / 1000),
      open: parseFloat(data.open || data.o || data.close || data.c || 0),
      high: parseFloat(data.high || data.h || data.close || data.c || 0),
      low: parseFloat(data.low || data.l || data.close || data.c || 0),
      close: parseFloat(data.close || data.c || 0),
      volume: parseFloat(data.volume || data.v || 0),
      symbol: data.symbol || data.s || 'BTCUSDT',
      interval: data.interval || data.i || '1s'
    };
    
    console.log('📊 Processed 1s data:', processedData);
    
    // Clear timeout since we received data
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    setCandlestickData(prevData => {
      // Ensure consistent 30-second intervals for uniform candle dimensions
      const currentTime = Math.floor(Date.now() / 1000);
      const candleStartTime = Math.floor(currentTime / 30) * 30; // Round down to nearest 30-second boundary
      
      // Use consistent time intervals to ensure same candle dimensions
      const processedCandleStart = Math.floor(processedData.time / 30) * 30;
      
      // Check if we're updating the current candle or adding a new one
      const existingIndex = prevData.findIndex(item => {
        return Math.floor(item.time / 30) * 30 === processedCandleStart;
      });
      
      if (existingIndex >= 0) {
        // Update existing candle with new high/low/close values
        const newData = [...prevData];
        const existingCandle = newData[existingIndex];
        
        // Keep the original open, but update high, low, close based on new data
        newData[existingIndex] = {
          ...existingCandle,
          high: Math.max(existingCandle.high, processedData.close),
          low: Math.min(existingCandle.low, processedData.close),
          close: processedData.close, // Always use latest close price
          volume: existingCandle.volume + processedData.volume,
          timestamp: Date.now(), // Update timestamp to force re-render
        };
        
        console.log('📈 Updated candle (1s data):', {
          price: processedData.close,
          high: newData[existingIndex].high,
          low: newData[existingIndex].low,
          timeInCandle: currentTime - newData[existingIndex].time
        });
        return newData;
      } else {
        // Add new 30-second candle with consistent time alignment
        const newCandle = {
          ...processedData,
          time: processedCandleStart, // Use processed candle start time for consistency
          timestamp: processedCandleStart * 1000, // Ensure timestamp matches
          high: Math.max(processedData.open, processedData.close),
          low: Math.min(processedData.open, processedData.close),
        };
        
        console.log('🕯️ New 30s candle started:', newCandle);
        return [...prevData, newCandle]
          .sort((a, b) => a.timestamp - b.timestamp)
          .slice(-100); // Keep more candles to see more history
      }
    });

    setCurrentPrice(processedData.close);
    setLastUpdateTime(Date.now()); // Force update trigger
  }, []);

  const connect = useCallback(() => {
    try {
      // Connect to your backend Socket.IO server
      const socket = io(backendUrl, {
        transports: ['websocket', 'polling'],
        timeout: 20000,
      });

      socketRef.current = socket;

      socket.on('connect', () => {
        console.log('✅ Connected to backend WebSocket');
        setIsConnected(true);
        setError(null);
        
        // Subscribe to Bitcoin real-time data (every second)
        console.log('📡 Subscribing to BTCUSDT 1s data for 30s candles...');
        socket.emit('subscribe-symbol', { symbol: 'BTCUSDT', interval: '1s' });
        
        // Also try alternative event names in case backend uses different naming
        socket.emit('subscribe', { symbol: 'BTCUSDT', interval: '1s' });
        socket.emit('join-room', 'BTCUSDT-1s');
        
        // Request initial data
        console.log('📡 Requesting initial candlestick data...');
        socket.emit('get-initial-data', { symbol: 'BTCUSDT', interval: '1s' });
        socket.emit('get-candlesticks', { symbol: 'BTCUSDT', interval: '1s', limit: 200 });
      });

      socket.on('disconnect', () => {
        console.log('Disconnected from backend');
        setIsConnected(false);
      });

      socket.on('connect_error', (error) => {
        console.error('Connection error:', error);
        setError(`Connection failed: ${error.message}`);
        setIsConnected(false);
      });

      // ⭐ THE KEY FIX: Listen for "candlestick-live" events from your backend
      socket.on('candlestick-live', (data: any) => {
        console.log('📊 ✅ RECEIVED candlestick-live event:', data);
        handleCandlestickData(data);
      });

      // Listen for alternative candlestick events as backup
      socket.on('candlestick-update', (data: any) => {
        console.log('📊 Received candlestick-update:', data);
        handleCandlestickData(data);
      });

      socket.on('kline', (data: any) => {
        console.log('📊 Received kline data:', data);
        handleCandlestickData(data);
      });

      // Listen for any data to debug what the backend is sending
      socket.onAny((eventName: string, ...args: any[]) => {
        if (eventName !== 'candlestick-live') {
          console.log('📡 Other event received:', eventName, args);
        }
      });

    } catch (err) {
      console.error('Error creating Socket.IO connection:', err);
      setError('Failed to create Socket.IO connection');
    }
  }, [backendUrl, handleCandlestickData]);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsConnected(false);
  }, []);

  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  return {
    isConnected,
    candlestickData,
    currentPrice,
    error,
    reconnect: connect
  };
}