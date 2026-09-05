import { NextRequest, NextResponse } from "next/server";
import { getBalances } from "@/lib/stocks/balances";
import { getAllPrices } from "@/lib/stocks/prices";

export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get("address");

  if (!address) {
    return NextResponse.json({ error: "Missing address" }, { status: 400 });
  }

  const [balances, prices] = await Promise.all([
    getBalances(address as `0x${string}`),
    getAllPrices(),
  ]);

  const holdings = balances.map((b) => {
    const priceData = prices.find((p) => p.stock.ticker === b.ticker);
    const price = priceData?.price ?? 0;
    const value = b.shares * price;
    return {
      ticker: b.ticker,
      name: priceData?.stock.name ?? b.ticker,
      logo: priceData?.stock.logo ?? "🔹",
      tokenTicker: priceData?.stock.tokenTicker ?? b.ticker,
      shares: b.shares,
      price,
      value,
      changePercent: priceData?.changePercent,
    };
  });

  const totalValue = holdings.reduce((sum, h) => sum + h.value, 0);

  return NextResponse.json({ holdings, totalValue });
}
