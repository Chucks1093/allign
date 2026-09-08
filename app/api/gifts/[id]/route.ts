import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createClient(await cookies());
  const { data, error } = await supabase
    .from("gifts")
    .select("id, type, platform, recipient_handle, ticker, token_contract, amount, status, sender_address, created_at")
    .eq("id", id)
    .single();

  if (error || !data) return NextResponse.json({ error: "Gift not found" }, { status: 404 });
  return NextResponse.json(data);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const supabase = createClient(await cookies());

  // marking as deposited after escrow tx
  if (body.deposited !== undefined) {
    const { error } = await supabase
      .from("gifts")
      .update({ deposited: body.deposited, tx_hash: body.tx_hash })
      .eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  // marking as claimed
  const { data: existing } = await supabase
    .from("gifts")
    .select("status")
    .eq("id", id)
    .single();

  if (existing?.status === "claimed") {
    return NextResponse.json({ error: "Already claimed" }, { status: 409 });
  }

  const { error } = await supabase
    .from("gifts")
    .update({ status: "claimed", claimed_by: body.claimed_by })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
