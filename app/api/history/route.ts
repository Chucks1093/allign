import { NextRequest, NextResponse } from "next/server";
import { publicClient } from "@/lib/stocks/client";
import { STOCKS } from "@/lib/stocks/tokens";

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

// rounds to fetch and seconds cutoff per range
const RANGE_CONFIG: Record<string, { rounds: number; cutoff: number }> = {
  "1D": { rounds: 60,  cutoff: 86400 },
  "1W": { rounds: 14,  cutoff: 7 * 86400 },
  "1M": { rounds: 45,  cutoff: 30 * 86400 },
  "1Y": { rounds: 300, cutoff: 365 * 86400 },
};

// GET /api/history?tokenTicker=NVDAc&range=1M
export async function GET(req: NextRequest) {
  const tokenTicker = req.nextUrl.searchParams.get("tokenTicker");
  const range = req.nextUrl.searchParams.get("range") ?? "1M";

  if (!tokenTicker) return NextResponse.json({ error: "tokenTicker required" }, { status: 400 });

  const stock = STOCKS.find((s) => s.tokenTicker === tokenTicker);
  if (!stock) return NextResponse.json({ error: "unknown ticker" }, { status: 404 });

  const config = RANGE_CONFIG[range] ?? RANGE_CONFIG["1M"];

  try {
    // Get latest round first
    const latestResult = await publicClient.readContract({
      address: stock.feedAddress,
      abi: CHAINLINK_ABI,
      functionName: "latestRoundData",
    });

    const [latestRoundId, latestAnswer, , latestUpdatedAt] = latestResult as [bigint, bigint, bigint, bigint, bigint];
    const phaseId = latestRoundId >> 64n;
    const aggRoundId = latestRoundId & 0xFFFFFFFFFFFFFFFFn;

    // Build round IDs to fetch going backwards
    const roundIds: bigint[] = [];
    for (let i = 0; i < config.rounds; i++) {
      const prevAgg = aggRoundId - BigInt(i);
      if (prevAgg <= 0n) break;
      roundIds.push((phaseId << 64n) | prevAgg);
    }

    // Multicall all rounds
    const calls = roundIds.map((id) => ({
      address: stock.feedAddress,
      abi: CHAINLINK_ABI,
      functionName: "getRoundData" as const,
      args: [id] as [bigint],
    }));

    const results = await publicClient.multicall({ contracts: calls, allowFailure: true });

    const now = Math.floor(Date.now() / 1000);
    const cutoff = now - config.cutoff;

    const allPoints = results
      .map((r) => {
        if (r.status === "failure" || !r.result) return null;
        const [, answer, , updatedAt] = r.result as [bigint, bigint, bigint, bigint, bigint];
        return { t: Number(updatedAt), price: Number(answer) / 1e8 };
      })
      .filter((p): p is { t: number; price: number } => !!p && p.price > 0)
      .sort((a, b) => a.t - b.t);

    // Filter to the requested time window; fall back to all fetched points if too few
    let points = allPoints.filter((p) => p.t >= cutoff);
    if (points.length < 2) points = allPoints;

    // Always include current price as last point
    const currentPrice = Number(latestAnswer) / 1e8;
    const currentT = Number(latestUpdatedAt);
    if (points.length === 0 || points[points.length - 1].t < currentT) {
      points.push({ t: currentT, price: currentPrice });
    }

    return NextResponse.json({ points }, {
      headers: { "Cache-Control": "s-maxage=300, stale-while-revalidate=60" },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
