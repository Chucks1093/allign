import { NextRequest, NextResponse } from "next/server";
import { fetchStockQuote } from "@/lib/stocks/ozmium";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sym, side, amount, taker, slippageBps } = body;

    if (!sym || !side || !amount || !taker) {
      return NextResponse.json({ error: "Missing required fields: sym, side, amount, taker" }, { status: 400 });
    }

    const result = await fetchStockQuote({ sym, side, amount, taker, slippageBps });

    console.log(`[Ozmium quote] ${side} ${amount} USDC of ${sym}`);
    console.log("[Ozmium steps]", JSON.stringify(result.steps, null, 2));
    console.log("[Ozmium advisory]", JSON.stringify(result.advisory, null, 2));

    return NextResponse.json(result);
  } catch (e: any) {
    console.error("[/api/stocks/quote]", e?.message);
    return NextResponse.json({ error: e?.message ?? "Quote failed" }, { status: 500 });
  }
}
