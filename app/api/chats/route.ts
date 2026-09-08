import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

function supabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );
}

// GET /api/chats?wallet=0x...
export async function GET(req: NextRequest) {
  const wallet = req.nextUrl.searchParams.get("wallet");
  if (!wallet) return NextResponse.json({ messages: [] });

  const { data, error } = await supabase()
    .from("chat")
    .select("messages")
    .eq("wallet_address", wallet.toLowerCase())
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("chat GET error:", error.message);
    return NextResponse.json({ messages: [] });
  }

  return NextResponse.json({ messages: data?.messages ?? [] });
}

// POST /api/chats  { wallet, messages }
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { wallet, messages } = body;

  if (!wallet || !messages) {
    return NextResponse.json({ error: "wallet and messages required" }, { status: 400 });
  }

  const lowerWallet = wallet.toLowerCase();
  const db = supabase();

  const { data: existing } = await db
    .from("chat")
    .select("id")
    .eq("wallet_address", lowerWallet)
    .limit(1)
    .maybeSingle();

  let error;

  if (existing) {
    ({ error } = await db
      .from("chat")
      .update({ messages, updated_at: new Date().toISOString() })
      .eq("id", existing.id));
  } else {
    ({ error } = await db
      .from("chat")
      .insert({ id: crypto.randomUUID(), wallet_address: lowerWallet, messages }));
  }

  if (error) {
    console.error("chat POST error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
