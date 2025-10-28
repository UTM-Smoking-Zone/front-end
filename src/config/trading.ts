// Trading configuration
export const tradingConfig = {
  // Backend connection settings
  backend: {
    url: 'http://localhost:3001/crypto', // Correct WebSocket path for crypto data
    useBackend: true, // Using backend connection only
  },
  
  // Trading pairs to display (only BTCUSDT as per backend)
  symbols: ['BTCUSDT'],
  
  // Chart settings
  chart: {
    interval: '30s', // 30 second candlesticks
    maxCandles: 100, // Reduced for better performance
  },
  
  // UI settings
  ui: {
    maxTrades: 25, // Reduced for better performance
    maxTickers: 5, // Reduced since we only use BTCUSDT
  }
};

export default tradingConfig;