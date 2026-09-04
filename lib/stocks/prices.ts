import { publicClient } from "./client";
import { STOCKS, type Stock } from "./tokens";

const CHAINLINK_ABI = [
  {
    name: "latestRoundData",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [
      { name: "roundId", type: "uint80" },
      { name: "answer", type: "int256" },
      { name: "startedAt", type: "uint256" },
      { name: "updatedAt", type: "uint256" },
      { name: "answeredInRound", type: "uint80" },
    ],
  },
  {
    name: "getRoundData",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "_roundId", type: "uint80" }],
    outputs: [
      { name: "roundId", type: "uint80" },
      { name: "answer", type: "int256" },
      { name: "startedAt", type: "uint256" },
      { name: "updatedAt", type: "uint256" },
      { name: "answeredInRound", type: "uint80" },
    ],
  },
] as const;

export interface StockPrice {
  stock: Stock;
  price: number;
  updatedAt: number;
  changePercent?: number;
  error?: boolean;
}

// How far back to probe for the 24h-ago price.
// Chainlink feeds update on 0.5% deviation OR 24h heartbeat.
// We try these offsets and pick the round closest to 24h ago.
const HISTORY_OFFSETS = [10n, 25n, 50n, 100n, 200n];

export async function getAllPrices(): Promise<StockPrice[]> {
  // --- Step 1: fetch all latest rounds ---
  const latestCalls = STOCKS.map((stock) => ({
    address: stock.feedAddress,
    abi: CHAINLINK_ABI,
    functionName: "latestRoundData" as const,
  }));

  const latestResults = await publicClient.multicall({
    contracts: latestCalls,
    allowFailure: true,
  });

  // Parse latest round data per stock
  type RoundData = { roundId: bigint; price: number; updatedAt: number };
  const latest: (RoundData | null)[] = latestResults.map((r) => {
    if (r.status === "failure" || !r.result) return null;
    const [roundId, answer, , updatedAt] = r.result as [bigint, bigint, bigint, bigint, bigint];
    return {
      roundId,
      price: Number(answer) / 1e8,
      updatedAt: Number(updatedAt),
    };
  });

  // --- Step 2: fetch historical rounds for 24h % change ---
  // For each stock, probe HISTORY_OFFSETS rounds back (same phase to avoid boundary issues).
  // phaseId is encoded in upper bits of roundId: phaseId = roundId >> 64n
  const historyCalls: { address: `0x${string}`; abi: typeof CHAINLINK_ABI; functionName: "getRoundData"; args: [bigint] }[] = [];
  const historyIndex: { stockIdx: number; offset: bigint }[] = [];

  for (let i = 0; i < STOCKS.length; i++) {
    const cur = latest[i];
    if (!cur) continue;
    const phaseId = cur.roundId >> 64n;
    const aggRoundId = cur.roundId & 0xFFFFFFFFFFFFFFFFn;

    for (const offset of HISTORY_OFFSETS) {
      const prevAggRoundId = aggRoundId - offset;
      if (prevAggRoundId <= 0n) continue;
      const prevRoundId = (phaseId << 64n) | prevAggRoundId;
      historyCalls.push({
        address: STOCKS[i].feedAddress,
        abi: CHAINLINK_ABI,
        functionName: "getRoundData",
        args: [prevRoundId],
      });
      historyIndex.push({ stockIdx: i, offset });
    }
  }

  const historyResults = historyCalls.length > 0
    ? await publicClient.multicall({ contracts: historyCalls, allowFailure: true })
    : [];

  // --- Step 3: for each stock, pick the historical round closest to 24h ago ---
  const now = Math.floor(Date.now() / 1000);
  const target = now - 86_400; // 24h ago

  // Map stockIdx → best historical round found
  const bestHistory = new Map<number, { price: number; updatedAt: number; delta: number }>();

  for (let j = 0; j < historyResults.length; j++) {
    const r = historyResults[j];
    const { stockIdx } = historyIndex[j];
    if (r.status === "failure" || !r.result) continue;

    const [, answer, , updatedAt] = r.result as [bigint, bigint, bigint, bigint, bigint];
    const updatedAtNum = Number(updatedAt);
    const price = Number(answer) / 1e8;
    if (price <= 0 || updatedAtNum <= 0) continue;

    const delta = Math.abs(updatedAtNum - target);
    const existing = bestHistory.get(stockIdx);
    if (!existing || delta < existing.delta) {
      bestHistory.set(stockIdx, { price, updatedAt: updatedAtNum, delta });
    }
  }

  // --- Step 4: assemble final result ---
  return STOCKS.map((stock, i) => {
    const cur = latest[i];
    if (!cur || cur.price <= 0) {
      return { stock, price: 0, updatedAt: 0, error: true };
    }

    let changePercent: number | undefined;
    const hist = bestHistory.get(i);
    if (hist && hist.price > 0) {
      changePercent = parseFloat(
        (((cur.price - hist.price) / hist.price) * 100).toFixed(2)
      );
    }

    return {
      stock,
      price: cur.price,
      updatedAt: cur.updatedAt,
      changePercent,
      error: false,
    };
  });
}
