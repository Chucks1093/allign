import { NextResponse } from "next/server";
import { fetchStocks } from "@/lib/stocks/ozmium";

export async function GET() {
  try {
    const stocks = await fetchStocks();
    return NextResponse.json({ stocks });
  } catch (e: any) {
    console.error("[/api/stocks]", e?.message);
    return NextResponse.json({ error: e?.message ?? "Failed to fetch stocks" }, { status: 500 });
  }
}
