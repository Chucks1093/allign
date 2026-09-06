import type { PolymarketMarket } from "./types";
import { STOCKS } from "@/lib/stocks/tokens";

const GAMMA_API = "https://gamma-api.polymarket.com";

// Stock name variants to search Polymarket with
const SEARCH_TERMS: Record<string, string[]> = {
  NVDA: ["NVIDIA", "NVDA"],
  AAPL: ["Apple", "AAPL"],
  META: ["Meta", "META", "Facebook"],
  GOOGL: ["Google", "Alphabet", "GOOGL"],
  AMZN: ["Amazon", "AMZN"],
  MSFT: ["Microsoft", "MSFT"],
  TSLA: ["Tesla", "TSLA"],
  MSTR: ["MicroStrategy", "MSTR", "Strategy"],
  COIN: ["Coinbase", "COIN"],
  INTC: ["Intel", "INTC"],
  CRCLC: ["Circle", "CRCL"],
  SPCE: ["SpaceX", "SPCE"],
  SNDK: ["SanDisk", "SNDK"],
};

function logistic(x: number, k = 0.002): number {
  return 1 / (1 + Math.exp(-k * x));
}

function clamp(x: number, min = 0, max = 1): number {
  return Math.max(min, Math.min(max, x));
}

async function fetchMarketsForQuery(query: string): Promise<PolymarketMarket[]> {
  try {
    const url = new URL(`${GAMMA_API}/events`);
    url.searchParams.set("limit", "10");
    url.searchParams.set("closed", "false");
    url.searchParams.set("active", "true");

    const res = await fetch(url.toString(), {
      headers: { "Accept": "application/json" },
      next: { revalidate: 3600 }, // cache 1 hour
    });

    if (!res.ok) return [];
    const events = await res.json() as any[];

    // Filter events that mention our query in title/description
    const q = query.toLowerCase();
    const matching = events.filter((e: any) =>
      (e.title ?? "").toLowerCase().includes(q) ||
      (e.description ?? "").toLowerCase().includes(q)
    );

    return matching.flatMap((e: any) =>
      (e.markets ?? []).map((m: any) => ({
        id: m.id,
        question: m.question ?? e.title,
        slug: m.slug ?? e.slug,
        liquidity: Number(m.liquidity ?? e.liquidity ?? 0),
        volume24h: Number(m.volume24h ?? 0),
        bestBid: m.bestBid != null ? Number(m.bestBid) : undefined,
        bestAsk: m.bestAsk != null ? Number(m.bestAsk) : undefined,
        lastPrice: m.lastPrice != null ? Number(m.lastPrice) : undefined,
        endsAt: m.endDate ?? e.endDate,
      }))
    );
  } catch {
    return [];
  }
}

function scoreMarket(market: PolymarketMarket): number {
  const consensus = clamp(market.lastPrice ?? market.bestBid ?? 0.5);

  // Time decay: prefer markets resolving sooner
  let fT = 0.5;
  if (market.endsAt) {
    const daysToEnd = (new Date(market.endsAt).getTime() - Date.now()) / 86_400_000;
    fT = daysToEnd <= 0 ? 0 : clamp(1 - daysToEnd / 180);
  }

  // Liquidity score (logistic saturation at ~$5k)
  const fL = logistic(market.liquidity, 0.002);

  // Spread quality
  const spread = market.bestAsk != null && market.bestBid != null
    ? market.bestAsk - market.bestBid : 0.1;
  const fSpr = clamp(1 - clamp(spread, 0, 0.2) / 0.2);

  // Volume / activity
  const fVol = logistic(market.volume24h, 0.001);

  return clamp(
    0.40 * consensus +
    0.20 * fT +
    0.20 * (0.7 * fL + 0.3 * fSpr) +
    0.20 * fVol
  );
}

export interface PolymarketSignal {
  ticker: string;
  score: number;          // 0-1
  marketsFound: number;
  topQuestion?: string;
  topConsensus?: number;
}

export async function scorePolymarket(): Promise<PolymarketSignal[]> {
  const results: PolymarketSignal[] = [];

  for (const stock of STOCKS) {
    const terms = SEARCH_TERMS[stock.ticker] ?? [stock.name, stock.ticker];
    const markets: PolymarketMarket[] = [];

    for (const term of terms.slice(0, 2)) { // max 2 searches per stock
      const found = await fetchMarketsForQuery(term);
      markets.push(...found);
    }

    // Deduplicate by id
    const unique = Array.from(new Map(markets.map((m) => [m.id, m])).values());

    if (unique.length === 0) {
      // No Polymarket signal → neutral (0.5)
      results.push({ ticker: stock.ticker, score: 0.5, marketsFound: 0 });
      continue;
    }

    // Score each market, weight by liquidity
    const scored = unique.map((m) => ({ market: m, score: scoreMarket(m) }));
    const totalLiquidity = unique.reduce((s, m) => s + m.liquidity, 0) || 1;

    const weightedScore = scored.reduce((sum, { market, score }) => {
      const weight = market.liquidity / totalLiquidity;
      return sum + score * weight;
    }, 0);

    // Top market by score for display
    const top = scored.sort((a, b) => b.score - a.score)[0];

    results.push({
      ticker: stock.ticker,
      score: clamp(weightedScore),
      marketsFound: unique.length,
      topQuestion: top.market.question,
      topConsensus: top.market.lastPrice,
    });
  }

  return results;
}
