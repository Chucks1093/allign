import { NextRequest, NextResponse } from "next/server";
import { getBalances } from "@/lib/stocks/balances";

export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get("address");
  if (!address) return NextResponse.json({ error: "Missing address" }, { status: 400 });

  const balances = await getBalances(address as `0x${string}`);
  return NextResponse.json({ address, balances, hasHoldings: balances.length > 0 });
}
