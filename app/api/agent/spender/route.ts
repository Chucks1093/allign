import { NextResponse } from "next/server";
import { privateKeyToAccount } from "viem/accounts";
import { CdpClient } from "@coinbase/cdp-sdk";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const pk = process.env.OZMIUM_SERVER_WALLET_PRIVATE_KEY?.trim();
    if (!pk) return NextResponse.json({ error: "No spender configured" }, { status: 500 });

    const normalized = pk.startsWith("0x") ? pk : `0x${pk}`;
    const signer = privateKeyToAccount(normalized as `0x${string}`);

    const cdp = new CdpClient({
      apiKeyId: process.env.CDP_API_KEY_ID,
      apiKeySecret: process.env.CDP_API_KEY_SECRET,
    });

    const smartAccount = await cdp.evm.getOrCreateSmartAccount({
      name: "allign-agent",
      owner: signer,
      enableSpendPermissions: true,
    });

    return NextResponse.json({ address: smartAccount.address });
  } catch (e: any) {
    console.error("Spender route error:", e?.message);
    return NextResponse.json({ error: e?.message ?? "invalid_key" }, { status: 500 });
  }
}
