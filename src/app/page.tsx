'use client';

import dynamic from "next/dynamic";

const BtcCandles = dynamic(() => import("../components/BtcCandles"), { ssr: false });

export default function Page() {
  return (
    <main style={{ padding: 16 }}>
      <h1 style={{ margin: 0, marginBottom: 12, fontSize: 22 }}>BTC/USDT — Candlesticks</h1>
      <BtcCandles backendBaseUrl="http://localhost:3001" />
    </main>
  );
}
