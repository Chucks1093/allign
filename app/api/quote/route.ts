// This endpoint is no longer used — quotes now come from /api/stocks/quote (Ozmium)
import { NextResponse } from "next/server";
export async function GET() {
  return NextResponse.json({ error: "Use /api/stocks/quote instead" }, { status: 410 });
}
