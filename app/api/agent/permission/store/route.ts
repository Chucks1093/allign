import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
  try {
    const {
      walletAddress,
      permission,
      budgetUsdc,
      periodDays,
      isActive,
    }: {
      walletAddress: string;
      permission: object;
      budgetUsdc: number;
      periodDays: number;
      isActive?: boolean;
    } = await req.json();

    if (!walletAddress || !permission) {
      return NextResponse.json({ error: "missing_params" }, { status: 400 });
    }

    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const periodSeconds = periodDays * 86400;
    const now = Math.floor(Date.now() / 1000);

    await supabase.from("settings").upsert(
      {
        wallet_address: walletAddress.toLowerCase(),
        daily_budget_usdc: budgetUsdc,
        is_active: isActive ?? true,
        spend_permission_json: permission,
        permission_expires_at: new Date((now + periodSeconds) * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "wallet_address" }
    );

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("Permission store error:", e?.message);
    return NextResponse.json({ error: e?.message ?? "store_failed" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const wallet = req.nextUrl.searchParams.get("wallet");
  if (!wallet) return NextResponse.json({ error: "missing wallet" }, { status: 400 });

  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const { data } = await supabase
      .from("settings")
      .select("*")
      .eq("wallet_address", wallet.toLowerCase())
      .single();

    return NextResponse.json({ config: data ?? null });
  } catch {
    return NextResponse.json({ config: null });
  }
}
