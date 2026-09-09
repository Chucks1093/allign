import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createWalletClient, createPublicClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";
import { uuidToBytes32 } from "@/lib/gifts/deposit";
import { recordActivity } from "@/lib/agent/activity";

const ESCROW_ADDRESS = process.env.NEXT_PUBLIC_GIFT_ESCROW_ADDRESS as `0x${string}`;

const RELEASE_ABI = [{
  name: "release", type: "function", stateMutability: "nonpayable",
  inputs: [
    { name: "giftId", type: "bytes32" },
    { name: "recipient", type: "address" },
  ],
  outputs: [],
}] as const;

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { recipient } = await req.json();
  if (!recipient) return NextResponse.json({ error: "recipient required" }, { status: 400 });

  const supabase = createClient(await cookies());

  // fetch gift
  const { data: gift, error: fetchErr } = await supabase
    .from("gifts")
    .select("id, status, deposited, ticker, amount, sender_address")
    .eq("id", id)
    .single();

  if (fetchErr || !gift) return NextResponse.json({ error: "Gift not found" }, { status: 404 });
  if (gift.status === "claimed") return NextResponse.json({ error: "Already claimed" }, { status: 409 });

  // call release() from operator wallet
  const account = privateKeyToAccount(`0x${process.env.GIFT_ESCROW_OPERATOR_PRIVATE_KEY}` as `0x${string}`);
  const walletClient = createWalletClient({ account, chain: base, transport: http() });
  const publicClient = createPublicClient({ chain: base, transport: http() });

  try {
    const hash = await walletClient.writeContract({
      address: ESCROW_ADDRESS,
      abi: RELEASE_ABI,
      functionName: "release",
      args: [uuidToBytes32(id), recipient as `0x${string}`],
    });
    await publicClient.waitForTransactionReceipt({ hash });

    // mark as claimed
    await supabase
      .from("gifts")
      .update({ status: "claimed", claimed_by: recipient })
      .eq("id", id);

    await Promise.all([
      // sender sees their gift was claimed
      recordActivity({
        wallet_address: gift.sender_address,
        type: "gift",
        title: `Gift claimed`,
        description: `Your ${gift.ticker} gift of ${gift.amount} shares was claimed`,
        info: { ticker: gift.ticker, shares: gift.amount, to_address: recipient, tx_hash: hash, gift_id: id },
      }).catch(() => {}),
      // recipient sees they received a gift
      recordActivity({
        wallet_address: recipient,
        type: "gift",
        title: `Received ${gift.ticker}`,
        description: `You received ${gift.amount} ${gift.ticker} as a gift`,
        info: { ticker: gift.ticker, shares: gift.amount, to_address: recipient, tx_hash: hash, gift_id: id },
      }).catch(() => {}),
    ]);

    return NextResponse.json({ ok: true, txHash: hash });
  } catch (e: any) {
    return NextResponse.json({ error: e.shortMessage ?? e.message ?? "Release failed" }, { status: 500 });
  }
}
