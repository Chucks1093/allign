import { wrapFetchWithPayment, x402Client } from "@x402/fetch";
import { ExactEvmScheme, toClientEvmSigner } from "@x402/evm";
import { privateKeyToAccount } from "viem/accounts";
import { createPublicClient, http } from "viem";
import { base } from "viem/chains";

const OZMIUM_BASE = "https://ozmium.org/v1";

export type OzmiumStock = {
  sym: string;
  name: string;
  address: string;
  feed: string;
  price: number;
  minted: boolean;
  tradable: boolean;
};

export type OzmiumStep = {
  to: `0x${string}`;
  data: `0x${string}`;
  value: string;
};

export type OzmiumQuoteAdvisory = {
  amountOut: string;
  amountOutMin: string;
  pricePerShare: number;
  feedUsd: number;
  vsFeedPct: number;
  multiplier: number;
  pool: {
    fee: number;
    usdc: number;
    shares: number;
  };
};

export type OzmiumQuoteResult = {
  network: string;
  steps: OzmiumStep[];
  advisory: OzmiumQuoteAdvisory;
};

export type StockQuoteParams = {
  sym: string;
  side: "buy" | "sell";
  amount: string;
  taker: string;
  slippageBps?: number;
};

function buildFetch() {
  const rawKey = process.env.OZMIUM_SERVER_WALLET_PRIVATE_KEY;
  if (!rawKey) throw new Error("OZMIUM_SERVER_WALLET_PRIVATE_KEY is not set");

  const privateKey = rawKey.startsWith("0x") ? rawKey : `0x${rawKey}`;
  const account = privateKeyToAccount(privateKey as `0x${string}`);
  const publicClient = createPublicClient({ chain: base, transport: http() });

  const signer = toClientEvmSigner(account, publicClient);
  const scheme = new ExactEvmScheme(signer);
  const client = new x402Client().register("eip155:8453", scheme);

  return wrapFetchWithPayment(fetch, client);
}

let _fetch: ReturnType<typeof buildFetch> | null = null;
function getOzmiumFetch() {
  if (!_fetch) _fetch = buildFetch();
  return _fetch;
}

export async function fetchStocks(): Promise<OzmiumStock[]> {
  const paidFetch = getOzmiumFetch();
  const res = await paidFetch(`${OZMIUM_BASE}/stocks`);
  if (!res.ok) throw new Error(`Ozmium /v1/stocks failed: ${res.status}`);
  return res.json();
}

export async function fetchStockQuote(params: StockQuoteParams): Promise<OzmiumQuoteResult> {
  const paidFetch = getOzmiumFetch();
  const res = await paidFetch(`${OZMIUM_BASE}/tx/stocks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ slippageBps: 100, ...params }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Ozmium /v1/tx/stocks failed: ${res.status} ${body}`);
  }
  return res.json();
}
