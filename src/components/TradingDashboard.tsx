'use client';

import React from 'react';
import { CandlestickChart } from '@/components/CandlestickChart';
import { RefreshCw, AlertCircle, Activity } from 'lucide-react';
import tradingConfig from '@/config/trading';
import { useBackendWebSocket } from '@/hooks/useBackendWebSocket';

export function TradingDashboard() {
  // Use backend connection only
  const { 
    isConnected, 
    candlestickData,
    currentPrice,
    error, 
    reconnect
  } = useBackendWebSocket(tradingConfig.backend.url);

  // Debug: Show data reception status
  const [updateCount, setUpdateCount] = React.useState(0);
  
  React.useEffect(() => {
    console.log('🎯 🚨 DASHBOARD: candlestickData updated, length:', candlestickData.length);
    console.log('🎯 📊 DASHBOARD: Current price:', currentPrice);
    setUpdateCount(prev => prev + 1);
  }, [candlestickData, currentPrice]);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Activity className="w-8 h-8 text-blue-500" />
            <h1 className="text-3xl font-bold text-white">
              Bitcoin Live Chart
            </h1>
          </div>
          
          <div className="flex items-center space-x-4">
            {currentPrice && (
              <div className="text-2xl font-semibold">
                <span className="text-gray-400">BTC:</span>
                <span className="text-yellow-400 font-mono ml-2">${currentPrice.toFixed(2)}</span>
                <span className="text-xs text-gray-500 ml-2">(#{updateCount})</span>
              </div>
            )}
            
            <div className={`flex items-center space-x-2 px-3 py-1 rounded-full ${
              isConnected ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
            }`}>
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`} />
              <span className="text-sm font-medium">
                {isConnected ? 'Live' : 'Disconnected'}
              </span>
            </div>

            {error && (
              <div className="flex items-center space-x-2 bg-red-900/20 border border-red-800 rounded-lg px-4 py-2">
                <AlertCircle className="w-4 h-4 text-red-500" />
                <span className="text-red-300 text-sm">{error}</span>
                <button
                  onClick={reconnect}
                  className="ml-2 text-red-400 hover:text-red-200"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
        
        <div className="text-gray-400">
          <p>Real-time Bitcoin price chart • 1-second data, 30-second candles</p>
        </div>
      </div>

      {/* Main Chart - Full width */}
      <div className="mb-6">
        <div className="mb-4">
          <h2 className="text-xl font-semibold mb-2 text-white">BTC/USDT Price Chart</h2>
          <div className="text-sm text-gray-400">
            Live data from backend • 1s updates, 30s candles
          </div>
        </div>
        
        {candlestickData.length > 0 ? (
          <div>
            <div className="mb-2 text-sm text-green-400">
              📊 Live data: {candlestickData.length} candles • Last update: {new Date().toLocaleTimeString()} • Updates: #{updateCount}
            </div>
            <CandlestickChart 
              key={`chart-${updateCount}`} 
              data={candlestickData} 
              symbol="BTCUSDT" 
              interval="30s" 
            />
          </div>
        ) : (
          <div className="bg-gray-800 rounded-lg h-96 flex items-center justify-center">
            <div className="text-center">
              {isConnected ? (
                <>
                  <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                  <p className="text-gray-400">Waiting for 1-second data stream...</p>
                  <p className="text-sm text-gray-500 mt-2">Connected to: {tradingConfig.backend.url}</p>
                </>
              ) : (
                <div className="space-y-2">
                  <p className="text-gray-500">Not connected to backend server</p>
                  <div className="text-sm text-gray-600">
                    <p>Make sure your backend is running on:</p>
                    <p className="font-mono text-blue-400">{tradingConfig.backend.url}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Basic Price Stats */}
      {candlestickData.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {(() => {
            const latest = candlestickData[candlestickData.length - 1];
            const previous = candlestickData.length > 1 ? candlestickData[candlestickData.length - 2] : null;
            const change = previous ? latest.close - previous.close : 0;
            const changePercent = previous ? (change / previous.close) * 100 : 0;
            const isPositive = change >= 0;
            
            return (
              <>
                <div className="bg-gray-800 rounded-lg p-4 text-center">
                  <div className="text-sm text-gray-400 mb-1">Open</div>
                  <div className="text-lg font-mono text-white">${latest.open.toFixed(2)}</div>
                </div>
                <div className="bg-gray-800 rounded-lg p-4 text-center">
                  <div className="text-sm text-gray-400 mb-1">High</div>
                  <div className="text-lg font-mono text-green-400">${latest.high.toFixed(2)}</div>
                </div>
                <div className="bg-gray-800 rounded-lg p-4 text-center">
                  <div className="text-sm text-gray-400 mb-1">Low</div>
                  <div className="text-lg font-mono text-red-400">${latest.low.toFixed(2)}</div>
                </div>
                <div className="bg-gray-800 rounded-lg p-4 text-center">
                  <div className="text-sm text-gray-400 mb-1">Change</div>
                  <div className={`text-lg font-mono ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                    {isPositive ? '+' : ''}{changePercent.toFixed(2)}%
                  </div>
                </div>
              </>
            );
          })()}
        </div>
      )}

      {/* Footer */}
      <div className="text-center text-sm text-gray-500 py-4 border-t border-gray-800">
        <p>Bitcoin price visualization • Real-time data from backend server</p>
      </div>
    </div>
  );
}