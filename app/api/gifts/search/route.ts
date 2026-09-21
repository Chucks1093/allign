import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const wallet = searchParams.get("wallet")?.toLowerCase();
  const platform = searchParams.get("platform");
  const handle = searchParams.get("handle")?.replace(/^@/, "").toLowerCase();

  if (!wallet && !(platform && handle)) {
    return NextResponse.json({ error: "Provide wallet or platform+handle" }, { status: 400 });
  }

  const supabase = createClient(await cookies());

  let query = supabase
    .from("gifts")
    .select("id, type, platform, recipient_handle, recipient_address, ticker, amount, sticker_id, message, scheduled_at, sender_address")
    .eq("status", "pending")
    .eq("deposited", true);

  if (wallet) {
    query = query.eq("recipient_address", wallet);
  } else {
    query = query.eq("type", "handle").eq("platform", platform!).ilike("recipient_handle", handle!);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ gifts: data ?? [] });
}
