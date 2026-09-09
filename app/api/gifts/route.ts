import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { recordActivity } from "@/lib/agent/activity";

export async function POST(req: Request) {
  const body = await req.json();
  const { type, sender_address, platform, recipient_handle, ticker, token_contract, amount } = body;

  if (!type || !sender_address || !ticker || !token_contract || !amount) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const supabase = createClient(await cookies());
  const { id, tx_hash, sticker_id, message, scheduled_at } = body;

  const { data, error } = await supabase
    .from("gifts")
    .insert({
      ...(id ? { id } : {}),
      type, sender_address, platform, recipient_handle,
      ticker, token_contract, amount,
      deposited: !!tx_hash,
      tx_hash: tx_hash ?? null,
      sticker_id: sticker_id ?? null,
      message: message ?? null,
      scheduled_at: scheduled_at ?? null,
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (tx_hash) {
    await recordActivity({
      wallet_address: sender_address,
      type: "gift",
      title: `Gifted ${ticker}`,
      description: `Sent ${amount} ${ticker} as a gift`,
      info: {
        ticker,
        shares: amount,
        to_address: recipient_handle ?? "link",
        tx_hash,
        gift_id: data.id,
      },
    }).catch(() => {});
  }

  return NextResponse.json({ id: data.id });
}
