import { getAllPrices, type StockPrice } from "@/lib/stocks/prices";
import { log } from "./logger";

function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

function clamp(x: number, min = 0, max = 1): number {
  return Math.max(min, Math.min(max, x));
}

export interface MomentumResult {
  ticker: string;
  price: number;
  change24h: number;
  score: number;   // 0-1
}

export async function scoreMomentum(): Promise<MomentumResult[]> {
  log("[momentum] fetching prices...");
  const prices = await getAllPrices();
  log("[momentum] raw prices:", prices.map((p) => ({ ticker: p.stock.ticker, price: p.price, change: p.changePercent, error: p.error })));
  const valid = prices.filter((p) => !p.error && p.price > 0 && p.changePercent !== undefined);

  if (valid.length === 0) return [];

  // Compute universe average and std dev for normalization
  const changes = valid.map((p) => p.changePercent!);
  const mean = changes.reduce((a, b) => a + b, 0) / changes.length;
  const variance = changes.reduce((a, b) => a + (b - mean) ** 2, 0) / changes.length;
  const stddev = Math.sqrt(variance) || 1;

  log(`[momentum] universe mean=${mean.toFixed(4)} stddev=${stddev.toFixed(4)}`);
  const results = prices.map((p) => {
    if (p.error || p.price <= 0) {
      return { ticker: p.stock.ticker, price: 0, change24h: 0, score: 0.5 };
    }
    const change = p.changePercent ?? 0;
    // Normalize: how many std-devs above/below the universe mean?
    // sigmoid maps this to 0-1, centered at 0.5 for average performance
    const zScore = (change - mean) / stddev;
    const score = clamp(sigmoid(zScore * 1.5)); // 1.5 steepens the curve slightly
    return {
      ticker: p.stock.ticker,
      price: p.price,
      change24h: change,
      score,
    };
  });
  log("[momentum] scores:", results.map((r) => ({ ticker: r.ticker, change24h: r.change24h, score: r.score })));
  return results;
}
