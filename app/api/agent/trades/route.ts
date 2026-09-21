import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";

const PAGE_SIZE = 13;

export async function GET(req: NextRequest) {
  const wallet = req.nextUrl.searchParams.get("wallet");
  if (!wallet) return NextResponse.json({ activity: [], hasMore: false });

  const page = Math.max(0, parseInt(req.nextUrl.searchParams.get("page") ?? "0", 10));

  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE;

    const { data } = await supabase
      .from("activity")
      .select("*")
      .eq("wallet_address", wallet.toLowerCase())
      .order("created_at", { ascending: false })
      .range(from, to);

    const items = data ?? [];
    return NextResponse.json({
      activity: items.slice(0, PAGE_SIZE),
      hasMore: items.length > PAGE_SIZE,
    });
  } catch {
    return NextResponse.json({ activity: [], hasMore: false });
  }
}
