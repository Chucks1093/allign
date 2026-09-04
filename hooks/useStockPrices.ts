"use client";

import { useState, useEffect, useCallback } from "react";
import { STOCKS } from "@/lib/stocks/tokens";
import type { StockPrice } from "@/lib/stocks/prices";

const REFRESH_INTERVAL = 120_000; // 2 minutes

export function useStockPrices() {
  const [stocks, setStocks] = useState<StockPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);

  const fetchPrices = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await fetch("/api/prices");
      if (!res.ok) throw new Error("Failed to fetch prices");

      const data: {
        ticker: string;
        tokenTicker: string;
        price: number;
        updatedAt: number;
        changePercent?: number;
        error?: boolean;
      }[] = await res.json();

      const stockMap = Object.fromEntries(STOCKS.map((s) => [s.tokenTicker, s]));

      const mapped: StockPrice[] = data.map((d) => ({
        stock: stockMap[d.tokenTicker],
        price: d.price,
        updatedAt: d.updatedAt,
        changePercent: d.changePercent,
        error: d.error,
      }));

      setStocks(mapped);
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchPrices();
    const interval = setInterval(() => fetchPrices(), REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchPrices]);

  return {
    stocks,
    loading,
    refreshing,
    error,
    refresh: () => fetchPrices(true),
  };
}
