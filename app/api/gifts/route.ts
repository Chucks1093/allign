import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function POST(req: Request) {
  const body = await req.json();
  const { type, sender_address, platform, recipient_handle, ticker, token_contract, amount } = body;

  if (!type || !sender_address || !ticker || !token_contract || !amount) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const supabase = createClient(await cookies());
  const { id, tx_hash } = body;

  const { data, error } = await supabase
    .from("gifts")
    .insert({
      ...(id ? { id } : {}),
      type, sender_address, platform, recipient_handle,
      ticker, token_contract, amount,
      deposited: !!tx_hash,
      tx_hash: tx_hash ?? null,
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data.id });
}
