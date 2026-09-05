import { NextRequest, NextResponse } from "next/server";

const ZEROX_API_KEY = process.env.OX_API_KEY!;
const USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const NVDA_C = "0xb20000000000000000000078ee7ce2fE4908108C";
const CHAIN_ID = "8453";
const HEADERS = {
  "0x-api-key": ZEROX_API_KEY,
  "0x-version": "v2",
};

async function getNVDAQuote(takerAddress: string, sellAmount: string) {
  const params = new URLSearchParams({
    chainId: CHAIN_ID,
    sellToken: USDC,
    buyToken: NVDA_C,
    sellAmount,
    taker: takerAddress,
  });

  // Step 1: /price
  const priceRes = await fetch(
    `https://api.0x.org/swap/allowance-holder/price?${params}`,
    { headers: HEADERS }
  );
  const priceStatus = priceRes.status;
  const priceBody = await priceRes.json();

  if (!priceRes.ok) {
    return { step: "price", status: priceStatus, error: priceBody };
  }

  // Step 2: /quote (adds slippageBps)
  params.set("slippageBps", "100");
  const quoteRes = await fetch(
    `https://api.0x.org/swap/allowance-holder/quote?${params}`,
    { headers: HEADERS }
  );
  const quoteStatus = quoteRes.status;
  const quoteBody = await quoteRes.json();

  return {
    price: { status: priceStatus, body: priceBody },
    quote: { status: quoteStatus, body: quoteBody },
  };
}

export async function GET(req: NextRequest) {
  const taker = req.nextUrl.searchParams.get("taker") ?? "0x0000000000000000000000000000000000000001";
  const sellAmount = req.nextUrl.searchParams.get("sellAmount") ?? "20000000"; // $20 USDC

  try {
    const result = await getNVDAQuote(taker, sellAmount);
    return NextResponse.json(result, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}
