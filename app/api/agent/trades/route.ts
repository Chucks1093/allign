import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";

export async function GET(req: NextRequest) {
  const wallet = req.nextUrl.searchParams.get("wallet");
  if (!wallet) return NextResponse.json({ trades: [] });

  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const { data } = await supabase
      .from("trades")
      .select("*")
      .eq("wallet_address", wallet.toLowerCase())
      .order("created_at", { ascending: false })
      .limit(50);

    return NextResponse.json({ trades: data ?? [] });
  } catch {
    return NextResponse.json({ trades: [] });
  }
}
