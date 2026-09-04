import { getAllPrices } from "@/lib/stocks/prices";

export const revalidate = 15;

export async function GET() {
  try {
    const prices = await getAllPrices();

    const data = prices.map((p) => ({
      ticker: p.stock.ticker,
      tokenTicker: p.stock.tokenTicker,
      price: p.price,
      updatedAt: p.updatedAt,
      changePercent: p.changePercent,
      error: p.error,
    }));

    return Response.json(data, {
      headers: { "Cache-Control": "public, s-maxage=15, stale-while-revalidate=30" },
    });
  } catch {
    return Response.json([], { status: 500 });
  }
}
