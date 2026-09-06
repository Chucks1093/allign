import { getAllPrices } from "@/lib/stocks/prices";
import { STOCKS } from "@/lib/stocks/tokens";

function logistic(x: number, k = 0.002): number {
  return 1 / (1 + Math.exp(-k * x));
}

function clamp(x: number, min = 0, max = 1): number {
  return Math.max(min, Math.min(max, x));
}

export interface PoolHealthResult {
  ticker: string;
  score: number;   // 0-1
  hasPrice: boolean;
}

// Pool health is approximated from Chainlink feed data + stock metadata.
// Full pool health (Ozmium liquidity) is fetched lazily during execution
// to avoid burning x402 micropayments on every signal run.
export async function scorePoolHealth(): Promise<PoolHealthResult[]> {
  const prices = await getAllPrices();

  return STOCKS.map((stock) => {
    const priceData = prices.find((p) => p.stock.ticker === stock.ticker);

    if (!priceData || priceData.error || priceData.price <= 0) {
      return { ticker: stock.ticker, score: 0, hasPrice: false };
    }

    // Proxy for pool health using feed data freshness
    const now = Math.floor(Date.now() / 1000);
    const staleness = now - priceData.updatedAt; // seconds since last update

    // Fresh feed (<1h) = good. Stale (>6h) = bad
    const freshnessFactor = clamp(1 - staleness / 21600); // 21600 = 6 hours

    // Non-tradable stocks get a pool health penalty
    const tradable = stock.tradable !== false;
    const tradabilityFactor = tradable ? 1.0 : 0.0;

    // Price > 0 and feed is fresh = healthy pool signal
    const score = clamp(0.7 * freshnessFactor + 0.3 * tradabilityFactor);

    return { ticker: stock.ticker, score, hasPrice: true };
  });
}
