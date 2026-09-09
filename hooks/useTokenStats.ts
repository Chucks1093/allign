"use client";

import { useEffect, useState } from "react";

export interface TokenStat {
  volume24h: number | null;
  marketCap: number | null;
}

type StatsMap = Record<string, TokenStat>;

export function useTokenStats() {
  const [stats, setStats] = useState<StatsMap>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/token-stats")
      .then((r) => r.json())
      .then((data) => {
        setStats(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return { stats, loading };
}
