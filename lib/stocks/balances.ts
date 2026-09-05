import { publicClient } from "./client";
import { STOCKS } from "./tokens";

const ERC20_ABI = [
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "decimals",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
  },
] as const;

export interface TokenBalance {
  ticker: string;
  contract: `0x${string}`;
  shares: number;
  raw: bigint;
}

export async function getBalances(walletAddress: `0x${string}`): Promise<TokenBalance[]> {
  const calls = STOCKS.map((stock) => ({
    address: stock.contract,
    abi: ERC20_ABI,
    functionName: "balanceOf" as const,
    args: [walletAddress],
  }));

  const results = await publicClient.multicall({ contracts: calls, allowFailure: true });

  return STOCKS.map((stock, i) => {
    const r = results[i];
    const raw = r.status === "success" ? (r.result as bigint) : 0n;
    const shares = Number(raw) / 1e8; // B20 tokens use 8 decimals
    return { ticker: stock.ticker, contract: stock.contract, shares, raw };
  }).filter((b) => b.shares > 0);
}
