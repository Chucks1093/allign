"use client";

import { useEffect, useState } from "react";
import { STRATEGIES } from "@/lib/stocks/strategies";

type ReturnMap = Record<string, number | null>;

export function useStrategyReturns() {
  const [returns, setReturns] = useState<ReturnMap>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const uniqueTickers = [
      ...new Set(STRATEGIES.flatMap((s) => s.holdings.map((h) => h.ticker))),
    ];

    // Fetch 1Y history for all unique tickers in parallel
    Promise.all(
      uniqueTickers.map((ticker) =>
        fetch(`/api/history?tokenTicker=${ticker}&range=1Y`)
          .then((r) => r.json())
          .then((data) => {
            const points: { t: number; price: number }[] = data.points ?? [];
            if (points.length < 2) return { ticker, returnPct: null };
            const first = points[0].price;
            const last = points[points.length - 1].price;
            const returnPct = ((last - first) / first) * 100;
            return { ticker, returnPct };
          })
          .catch(() => ({ ticker, returnPct: null }))
      )
    ).then((results) => {
      // Map ticker → 1Y return
      const tickerReturns: Record<string, number | null> = {};
      results.forEach(({ ticker, returnPct }) => {
        tickerReturns[ticker] = returnPct;
      });

      // Compute weighted return for each strategy
      const strategyReturns: ReturnMap = {};
      STRATEGIES.forEach((s) => {
        let weightedReturn = 0;
        let totalWeight = 0;
        s.holdings.forEach((h) => {
          const r = tickerReturns[h.ticker];
          if (r !== null && r !== undefined) {
            weightedReturn += r * h.weight;
            totalWeight += h.weight;
          }
        });
        strategyReturns[s.id] = totalWeight > 0 ? weightedReturn / totalWeight : null;
      });

      setReturns(strategyReturns);
      setLoading(false);
    });
  }, []);

  return { returns, loading };
}
