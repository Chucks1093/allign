import { NextResponse } from "next/server";
import { privateKeyToAccount } from "viem/accounts";

export async function GET() {
  try {
    const pk = process.env.OZMIUM_SERVER_WALLET_PRIVATE_KEY;
    if (!pk) return NextResponse.json({ error: "No spender configured" }, { status: 500 });

    const normalized = pk.startsWith("0x") ? pk : `0x${pk}`;
    const account = privateKeyToAccount(normalized as `0x${string}`);
    return NextResponse.json({ address: account.address });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "invalid_key" }, { status: 500 });
  }
}
