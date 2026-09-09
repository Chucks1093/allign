import { NextResponse } from "next/server";
import { STOCKS } from "@/lib/stocks/tokens";

export const revalidate = 300;

export async function GET() {
  const addresses = STOCKS.map((s) => s.contract).join(",");

  try {
    const res = await fetch(
      `https://api.geckoterminal.com/api/v2/networks/base/tokens/multi/${addresses}`,
      {
        headers: { Accept: "application/json;version=20230302" },
        next: { revalidate: 300 },
      }
    );

    if (!res.ok) return NextResponse.json({});

    const data = await res.json();
    const tokens: any[] = data?.data ?? [];

    // GeckoTerminal returns tokens keyed by address (lowercased)
    const map: Record<string, { volume24h: number | null; marketCap: number | null }> = {};
    tokens.forEach((t) => {
      const addr: string = t?.attributes?.address?.toLowerCase();
      const attrs = t?.attributes ?? {};
      const stock = STOCKS.find((s) => s.contract.toLowerCase() === addr);
      if (stock) {
        map[stock.tokenTicker] = {
          volume24h: attrs.volume_usd?.h24 != null ? parseFloat(attrs.volume_usd.h24) : null,
          marketCap: attrs.market_cap_usd != null ? parseFloat(attrs.market_cap_usd) : null,
        };
      }
    });

    return NextResponse.json(map, {
      headers: { "Cache-Control": "s-maxage=300, stale-while-revalidate=60" },
    });
  } catch {
    return NextResponse.json({});
  }
}
