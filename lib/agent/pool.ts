import { fetchStocks } from "@/lib/stocks/ozmium";
import { log } from "./logger";

export interface PoolHealthResult {
  ticker: string;
  score: number; // 0-1
  hasPrice: boolean;
}

export async function scorePoolHealth(): Promise<PoolHealthResult[]> {
  log("[pool] fetching Ozmium stocks...");
  const stocks = await fetchStocks();
  const results = stocks.map((s) => ({
    ticker: s.sym,
    score: s.tradable ? 1.0 : 0.0,
    hasPrice: s.price > 0,
  }));
  log("[pool] results:", results);
  return results;
}
