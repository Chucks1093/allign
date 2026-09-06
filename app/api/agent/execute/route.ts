import { NextRequest, NextResponse } from "next/server";
import { privateKeyToAccount } from "viem/accounts";
import { createWalletClient, createPublicClient, http } from "viem";
import { base } from "viem/chains";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { scoreAllStocks, getTradeDecisions } from "@/lib/agent/signals";
import { fetchStockQuote } from "@/lib/stocks/ozmium";

export const maxDuration = 300;

function getServerWallet() {
  const pk = process.env.OZMIUM_SERVER_WALLET_PRIVATE_KEY!;
  const normalized = pk.startsWith("0x") ? pk : `0x${pk}`;
  const account = privateKeyToAccount(normalized as `0x${string}`);
  const walletClient = createWalletClient({ account, chain: base, transport: http() });
  const publicClient = createPublicClient({ chain: base, transport: http() });
  return { account, walletClient, publicClient };
}

export async function POST(req: NextRequest) {
  // Protect endpoint — Vercel cron sends this header automatically
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  // Fetch all active, non-expired configs
  const { data: configs } = await supabase
    .from("settings")
    .select("*")
    .eq("is_active", true)
    .gt("permission_expires_at", new Date().toISOString());

  if (!configs?.length) {
    return NextResponse.json({ ok: true, processed: 0, message: "No active configs" });
  }

  // Run signal engine once — shared across all users
  const signals = await scoreAllStocks();

  const { prepareSpendCallData } = await import("@base-org/account/spend-permission");
  const { account, walletClient, publicClient } = getServerWallet();

  const results = [];

  for (const config of configs) {
    try {
      const { buys } = getTradeDecisions(signals, config.daily_budget_usdc, config.daily_budget_usdc);
      if (!buys.length) {
        results.push({ wallet: config.wallet_address, status: "skipped", reason: "no strong signals" });
        continue;
      }

      const topBuy = buys[0];
      const amountUsdc = Math.max((topBuy.kelly ?? 0.1) * config.daily_budget_usdc, 0.30);
      const amountMicro = BigInt(Math.round(amountUsdc * 1_000_000));

      const tokenTicker = topBuy.stock.tokenTicker;

      // 1. Pull USDC from user wallet to server wallet via spend permission
      const spendCalls = await prepareSpendCallData(
        config.spend_permission_json,
        amountMicro,
      );

      for (const call of spendCalls) {
        const hash = await walletClient.sendTransaction({
          to: call.to as `0x${string}`,
          data: call.data as `0x${string}`,
          value: call.value ? BigInt(call.value) : 0n,
        });
        await publicClient.waitForTransactionReceipt({ hash });
      }

      // 2. Get quote from Ozmium (server wallet is the taker)
      const quote = await fetchStockQuote({
        sym: tokenTicker,
        side: "buy",
        amount: amountUsdc.toFixed(6),
        taker: account.address,
        slippageBps: 100,
      });

      if (Math.abs(quote.advisory.vsFeedPct) > 2) {
        results.push({ wallet: config.wallet_address, status: "skipped", reason: "price deviation too high" });
        continue;
      }

      // 3. Execute swap steps
      const txHashes: string[] = [];
      for (const step of quote.steps) {
        const hash = await walletClient.sendTransaction({
          to: step.to,
          data: step.data,
          value: BigInt(step.value),
        });
        await publicClient.waitForTransactionReceipt({ hash });
        txHashes.push(hash);
      }

      // 4. Log trade to Supabase
      const sharesReceived = Number(quote.advisory.amountOut) / 1e8;
      await supabase.from("trades").insert({
        wallet_address: config.wallet_address,
        ticker: tokenTicker,
        side: "buy",
        amount_usdc: amountUsdc,
        shares: sharesReceived,
        price: quote.advisory.pricePerShare,
        tx_hash: txHashes[txHashes.length - 1],
        signal_score: Math.round((topBuy.composite ?? 0) * 100),
      });

      results.push({ wallet: config.wallet_address, ticker: tokenTicker, status: "ok", tx: txHashes.at(-1) });
    } catch (e: any) {
      console.error(`Agent execute error for ${config.wallet_address}:`, e?.message);
      results.push({ wallet: config.wallet_address, status: "error", error: e?.message });
    }
  }

  return NextResponse.json({ ok: true, processed: configs.length, results });
}
