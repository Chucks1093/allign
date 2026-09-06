import { NextResponse } from "next/server";
import { scoreAllStocks } from "@/lib/agent/signals";

export const maxDuration = 60;

export async function GET() {
  const signals = await scoreAllStocks();
  return NextResponse.json({
    scoredAt: new Date().toISOString(),
    signals: signals.map((s) => ({
      ticker: s.stock.ticker,
      name: s.stock.name,
      price: s.price,
      change24h: s.change24h,
      signal: s.signal,
      composite: parseFloat(s.composite.toFixed(4)),
      kelly: parseFloat(s.kelly.toFixed(4)),
      scores: {
        momentum: parseFloat(s.scores.momentum.toFixed(4)),
        polymarket: parseFloat(s.scores.polymarket.toFixed(4)),
        sentiment: parseFloat(s.scores.sentiment.toFixed(4)),
        poolHealth: parseFloat(s.scores.poolHealth.toFixed(4)),
        relativeStrength: parseFloat(s.scores.relativeStrength.toFixed(4)),
      },
      reasoning: s.reasoning,
    })),
  });
}
