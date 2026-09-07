import type { PolymarketMarket } from "./types";
import { STOCKS } from "@/lib/stocks/tokens";
import { log } from "./logger";

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
  const ask = market.bestAsk ?? market.lastPrice ?? 0.5;

  // Upside potential: low ask = big potential gain if it resolves YES
  const upside = Math.max(0, 1 - ask);

  // Weight by log liquidity — deep markets are more reliable signals
  const liqWeight = Math.log10(Math.max(1, market.liquidity));

  const raw = upside * (1 + liqWeight);

  // Normalise to 0-1 using logistic (raw can exceed 1 on high-liquidity markets)
  return clamp(logistic(raw * 10 - 5, 1));
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
      log(`[polymarket] ${stock.ticker}: no markets found → score=0.5 (neutral)`);
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

    log(`[polymarket] ${stock.ticker}: ${unique.length} markets found, weightedScore=${weightedScore.toFixed(3)}, top="${top.market.question}" ask=${top.market.bestAsk} → score=${clamp(weightedScore).toFixed(3)}`);
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
