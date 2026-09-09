import { NextRequest, NextResponse } from "next/server";
import { privateKeyToAccount } from "viem/accounts";
import { CdpClient } from "@coinbase/cdp-sdk";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { scoreAllStocks, getTradeDecisions } from "@/lib/agent/signals";
import { fetchStockQuote } from "@/lib/stocks/ozmium";
import { log, logSeparator } from "@/lib/agent/logger";
import { recordActivity } from "@/lib/agent/activity";

export const maxDuration = 300;

const MIN_POOL_LIQUIDITY_USDC = 500; // skip stocks with < $500 in the pool

async function getAgentSmartAccount() {
  const pk = process.env.OZMIUM_SERVER_WALLET_PRIVATE_KEY!;
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
  const networkAccount = await smartAccount.useNetwork("base");
  return { smartAccount, networkAccount };
}

export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const runAt = new Date().toISOString();

  const { data: configs } = await supabase
    .from("settings")
    .select("*")
    .eq("is_active", true)
    .gt("permission_expires_at", new Date().toISOString());

  if (!configs?.length) {
    return NextResponse.json({ ok: true, processed: 0, message: "No active configs" });
  }

  logSeparator("AGENT RUN START");
  const signals = await scoreAllStocks();
  const { smartAccount, networkAccount } = await getAgentSmartAccount();
  const results = [];

  for (const config of configs) {
    try {
      const { buys } = getTradeDecisions(signals, config.daily_budget_usdc, config.daily_budget_usdc);

      if (!buys.length) {
        log(`[execute] no buy candidates for ${config.wallet_address} — no strong signals`);
        await supabase.from("trades").insert({
          wallet_address: config.wallet_address,
          run_at: runAt,
          event_type: "skip",
          message: "No strong signals this run",
        });
        await recordActivity({
          wallet_address: config.wallet_address,
          type: "info",
          title: "No trades this run",
          description: "Agent found no strong signals — no positions taken",
          info: { body: "No strong signals this run" },
        });
        results.push({ wallet: config.wallet_address, status: "skipped", reason: "no strong signals" });
        continue;
      }

      log(`[execute] ${buys.length} buy candidates: ${buys.map(b => b.stock.ticker).join(", ")}`);

      // Try candidates in order until one succeeds
      let traded = false;
      for (const candidate of buys) {
        const tokenTicker = candidate.stock.tokenTicker;
        const amountUsdc = Math.max((candidate.kelly ?? 0.1) * config.daily_budget_usdc, 0.30);
        const compositeScore = Math.round((candidate.composite ?? 0) * 100);

        log(`[execute] trying ${tokenTicker} — composite=${compositeScore}, $${amountUsdc.toFixed(2)} USDC`);

        let quote;
        try {
          quote = await fetchStockQuote({
            sym: tokenTicker,
            side: "buy",
            amount: amountUsdc.toFixed(6),
            taker: smartAccount.address,
            slippageBps: 100,
          });
        } catch (e: any) {
          log(`[execute] quote failed for ${tokenTicker}: ${e?.message} — trying next`);
          continue;
        }

        const poolLiquidity = quote.advisory?.pool?.usdc ?? 0;
        if (poolLiquidity < MIN_POOL_LIQUIDITY_USDC) {
          log(`[execute] ${tokenTicker} pool too shallow ($${poolLiquidity} USDC, need $${MIN_POOL_LIQUIDITY_USDC}) — trying next`);
          continue;
        }

        if (Math.abs(quote.advisory.vsFeedPct) > 2) {
          log(`[execute] ${tokenTicker} price deviation ${quote.advisory.vsFeedPct.toFixed(2)}% — trying next`);
          continue;
        }

        log(`[execute] ${tokenTicker} quote OK — pool $${poolLiquidity} USDC, deviation ${quote.advisory.vsFeedPct.toFixed(3)}%`);

        const amountMicro = BigInt(Math.round(amountUsdc * 1_000_000));
        const { prepareSpendCallData } = await import("@base-org/account/spend-permission");
        const spendCalls = await prepareSpendCallData(config.spend_permission_json, amountMicro);

        // Bundle spend + swap into one atomic user op — if swap fails, USDC is not pulled
        const swapCalls = quote.steps.map((step: any) => ({
          to: step.to,
          data: step.data,
          value: BigInt(step.value),
        }));

        const atomicOp = await networkAccount.sendUserOperation({
          calls: [...spendCalls, ...swapCalls],
        });
        const atomicReceipt = await networkAccount.waitForUserOperation({ userOpHash: atomicOp.userOpHash });

        if (atomicReceipt.status !== "complete") {
          log(`[execute] atomic op failed for ${tokenTicker}`);
          throw new Error("Atomic spend+swap user op failed");
        }

        const txHashes = [atomicReceipt.transactionHash];

        const sharesReceived = Number(quote.advisory.amountOut) / 1e8;
        const finalTx = txHashes[txHashes.length - 1];

        await supabase.from("trades").insert({
          wallet_address: config.wallet_address,
          run_at: runAt,
          event_type: "trade",
          message: `Bought ${sharesReceived.toFixed(6)} ${tokenTicker} for $${amountUsdc.toFixed(2)}`,
          ticker: tokenTicker,
          side: "buy",
          amount_usdc: amountUsdc,
          shares: sharesReceived,
          price: quote.advisory.pricePerShare,
          tx_hash: finalTx,
          signal_score: compositeScore,
        });
        await recordActivity({
          wallet_address: config.wallet_address,
          type: "buy",
          title: `Bought ${candidate.stock.ticker}`,
          description: `Agent bought ${sharesReceived.toFixed(6)} ${tokenTicker} for $${amountUsdc.toFixed(2)} USDC`,
          info: {
            ticker: tokenTicker,
            shares: sharesReceived,
            amount_usdc: amountUsdc,
            price: quote.advisory.pricePerShare,
            tx_hash: finalTx,
            signal_score: compositeScore,
          },
        });

        results.push({ wallet: config.wallet_address, ticker: tokenTicker, status: "ok", tx: finalTx });
        traded = true;
        break;
      }

      if (!traded) {
        await supabase.from("trades").insert({
          wallet_address: config.wallet_address,
          run_at: runAt,
          event_type: "skip",
          message: "All candidates failed — no liquid pool or price deviation too high",
        });
        await recordActivity({
          wallet_address: config.wallet_address,
          type: "info",
          title: "Trade skipped",
          description: "All candidates failed — no liquid pool or price deviation too high",
          info: { body: "All candidates failed — no liquid pool or price deviation too high" },
        });
        results.push({ wallet: config.wallet_address, status: "skipped", reason: "all candidates failed" });
      }
    } catch (e: any) {
      const msg = e?.message ?? "Unknown error";
      console.error(`Agent execute error for ${config.wallet_address}:`, msg);
      await supabase.from("trades").insert({
        wallet_address: config.wallet_address,
        run_at: runAt,
        event_type: "error",
        message: msg,
      });
      await recordActivity({
        wallet_address: config.wallet_address,
        type: "error",
        title: "Agent error",
        description: msg,
        info: { reason: msg },
      });
      results.push({ wallet: config.wallet_address, status: "error", error: msg });
    }
  }

  return NextResponse.json({ ok: true, processed: configs.length, results });
}
