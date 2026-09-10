import { NextRequest, NextResponse } from "next/server";
import { privateKeyToAccount } from "viem/accounts";
import { createPublicClient, http } from "viem";
import { base } from "viem/chains";
import { CdpClient } from "@coinbase/cdp-sdk";
import { Attribution } from "ox/erc8021";

const DATA_SUFFIX = Attribution.toDataSuffix({ codes: ["bc_fmbqk5r8"] });
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { scoreAllStocks, getTradeDecisions } from "@/lib/agent/signals";
import { fetchStockQuote } from "@/lib/stocks/ozmium";
import { log, logSeparator } from "@/lib/agent/logger";
import { recordActivity } from "@/lib/agent/activity";

const USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as const;
const SPEND_PERMISSION_MANAGER = "0xf85210B21cC50302F477BA56686d2019dC9b67Ad" as const;
const MIN_BUY_USDC = 0.30;
const MIN_ETH_FOR_GAS = 0.0005; // ~$1 worth — enough for a few user ops

const SPEND_PERMISSION_ABI = [
  {
    name: "getCurrentPeriod",
    type: "function" as const,
    stateMutability: "view" as const,
    inputs: [{ name: "spendPermission", type: "tuple", components: [
      { name: "account", type: "address" },
      { name: "spender", type: "address" },
      { name: "token", type: "address" },
      { name: "allowance", type: "uint160" },
      { name: "period", type: "uint48" },
      { name: "start", type: "uint48" },
      { name: "end", type: "uint48" },
      { name: "salt", type: "uint256" },
      { name: "extraData", type: "bytes" },
    ]}],
    outputs: [{ name: "", type: "tuple", components: [
      { name: "start", type: "uint48" },
      { name: "end", type: "uint48" },
      { name: "spend", type: "uint160" },
    ]}],
  },
  {
    name: "isRevoked",
    type: "function" as const,
    stateMutability: "view" as const,
    inputs: [{ name: "spendPermission", type: "tuple", components: [
      { name: "account", type: "address" },
      { name: "spender", type: "address" },
      { name: "token", type: "address" },
      { name: "allowance", type: "uint160" },
      { name: "period", type: "uint48" },
      { name: "start", type: "uint48" },
      { name: "end", type: "uint48" },
      { name: "salt", type: "uint256" },
      { name: "extraData", type: "bytes" },
    ]}],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

const ERC20_BALANCE_ABI = [{
  name: "balanceOf",
  type: "function" as const,
  stateMutability: "view" as const,
  inputs: [{ name: "account", type: "address" }],
  outputs: [{ name: "", type: "uint256" }],
}] as const;

const BASE_RPC = `https://api.developer.coinbase.com/rpc/v1/base/${process.env.CDP_API_KEY_ID}`;
const publicClient = createPublicClient({ chain: base, transport: http(BASE_RPC) });

async function runPreflightChecks(config: any, agentAddress: string): Promise<{ ok: boolean; reason: string } > {
  const perm = config.spend_permission_json?.permission;
  if (!perm) return { ok: false, reason: "No spend permission configured" };

  const permArgs = {
    account: perm.account as `0x${string}`,
    spender: perm.spender as `0x${string}`,
    token: perm.token as `0x${string}`,
    allowance: BigInt(perm.allowance),
    period: Number(perm.period),
    start: Number(perm.start),
    end: Number(perm.end),
    salt: BigInt(perm.salt ?? 0),
    extraData: (perm.extraData ?? "0x") as `0x${string}`,
  };

  const [isRevoked, currentPeriod, userUsdcBalance, agentEthBalance] = await Promise.all([
    publicClient.readContract({ address: SPEND_PERMISSION_MANAGER, abi: SPEND_PERMISSION_ABI, functionName: "isRevoked", args: [permArgs] }),
    publicClient.readContract({ address: SPEND_PERMISSION_MANAGER, abi: SPEND_PERMISSION_ABI, functionName: "getCurrentPeriod", args: [permArgs] }),
    publicClient.readContract({ address: USDC_ADDRESS, abi: ERC20_BALANCE_ABI, functionName: "balanceOf", args: [perm.account as `0x${string}`] }),
    publicClient.getBalance({ address: agentAddress as `0x${string}` }),
  ]);

  // 1. Permission revoked on-chain
  if (isRevoked) return { ok: false, reason: "Spend permission has been revoked" };

  // 2. Remaining allowance in current period
  const allowance = BigInt(perm.allowance);
  const spent = (currentPeriod as any).spend as bigint;
  const remaining = allowance > spent ? allowance - spent : 0n;
  const remainingUsdc = Number(remaining) / 1e6;
  if (remainingUsdc < MIN_BUY_USDC) return { ok: false, reason: `Budget exhausted — only $${remainingUsdc.toFixed(4)} USDC remaining this period` };

  // 3. User's actual USDC balance
  const userUsdc = Number(userUsdcBalance as bigint) / 1e6;
  if (userUsdc < MIN_BUY_USDC) return { ok: false, reason: `Insufficient USDC balance — wallet has $${userUsdc.toFixed(4)} USDC` };

  // 4. Agent ETH for gas
  const agentEth = Number(agentEthBalance) / 1e18;
  if (agentEth < MIN_ETH_FOR_GAS) return { ok: false, reason: `Agent wallet low on ETH for gas — ${agentEth.toFixed(6)} ETH` };

  return { ok: true, reason: "" };
}

export const maxDuration = 300;

const MIN_POOL_LIQUIDITY_USDC = 500; // skip stocks with < $500 in the pool

async function getAgentSmartAccount() {
  const pk = process.env.OZMIUM_SERVER_WALLET_PRIVATE_KEY!;
  const normalized = pk.startsWith("0x") ? pk : `0x${pk}`;
  const signer = privateKeyToAccount(normalized as `0x${string}`);
  const signerAddress = signer.address;
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
  return { smartAccount, networkAccount, signerAddress };
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
  const { smartAccount, networkAccount, signerAddress } = await getAgentSmartAccount();
  const results = [];

  for (const config of configs) {
    try {
      // ── Pre-flight checks ────────────────────────────────────────────────────
      const preflight = await runPreflightChecks(config, signerAddress);
      if (!preflight.ok) {
        log(`[execute] preflight failed for ${config.wallet_address}: ${preflight.reason}`);
        await recordActivity({
          wallet_address: config.wallet_address,
          type: "info",
          title: "Agent skipped",
          description: preflight.reason,
          info: { body: preflight.reason },
        });
        results.push({ wallet: config.wallet_address, status: "skipped", reason: preflight.reason });
        continue;
      }

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
          dataSuffix: DATA_SUFFIX,
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
