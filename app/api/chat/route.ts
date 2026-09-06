import { openai } from "@ai-sdk/openai";
import { convertToModelMessages, createUIMessageStreamResponse, streamText, toUIMessageStream, UIMessage, tool, zodSchema, isStepCount } from "ai";
import { z } from "zod";
import { fetchStockQuote } from "@/lib/stocks/ozmium";
import { getBalances } from "@/lib/stocks/balances";
import { getAllPrices } from "@/lib/stocks/prices";

export const maxDuration = 30;

const SYSTEM = `You are Allign's AI trading assistant — a sharp, concise DeFi desk for tokenized US stocks on Base.

You help users buy and sell tokenized stocks using their connected crypto wallet. Keep responses short and direct.

Available tokenized stocks (B20 standard on Base):
NVDAc (NVIDIA), AAPLc (Apple), METAc (Meta), GOOGLc (Alphabet), AMZNc (Amazon),
MSFTc (Microsoft), TSLAc (Tesla), MSTRc (Strategy/MicroStrategy), SPCXc (SpaceX),
SNDKc (SanDisk), COINc (Coinbase — not tradable yet), CRCLc (Circle — not tradable yet), INTCc (Intel — not tradable yet)

Rules:
- Always call getQuote before giving any price — never guess
- Buy amount = USDC to spend (e.g. "5" = $5 USDC). Minimum $0.30
- Sell amount = number of shares (e.g. "0.001301")
- After a quote, tell the user to click the Trade button to confirm in their wallet
- If no wallet is connected say so
- Only available to non-US users under Regulation S

## Autonomous Trading Agent
When the user asks to activate the agent, set up auto trading, or let AI trade for them:
1. Suggest a daily budget (default $5/day) and ask them to confirm
2. Once they confirm, end your message with this exact tag on its own line:
   [ACTION:ACTIVATE_AGENT budgetUSD=5 periodDays=30]
   (replace 5 with whatever budget they chose)
3. The app will handle the wallet signature — do not explain the technical steps
4. After activation succeeds, confirm the agent is live and explain it runs every 4 hours`;

export async function POST(req: Request) {
  const { messages, walletAddress }: { messages: UIMessage[]; walletAddress?: string } = await req.json();

  const system = walletAddress
    ? `${SYSTEM}\n\nWallet connected: ${walletAddress}`
    : `${SYSTEM}\n\nNo wallet connected — tell the user to connect their wallet before trading.`;

  const result = streamText({
    model: openai("gpt-4o-mini"),
    system,
    messages: await convertToModelMessages(messages),
    stopWhen: isStepCount(5),
    tools: {
      getQuote: tool({
        description: "Get a live buy or sell quote for a tokenized stock. Call this whenever the user asks about buying or selling.",
        inputSchema: zodSchema(z.object({
          sym: z.string().describe("Token ticker e.g. NVDAc, AAPLc"),
          side: z.enum(["buy", "sell"]),
          amount: z.string().describe("USDC amount for buy (e.g. '5'), share amount for sell (e.g. '0.001301')"),
        })),
        execute: async ({ sym, side, amount }: { sym: string; side: "buy" | "sell"; amount: string }) => {
          if (!walletAddress) {
            return { error: "No wallet connected. Please connect your wallet first." };
          }
          try {
            const quote = await fetchStockQuote({ sym, side, amount, taker: walletAddress, slippageBps: 100 });
            const a = quote.advisory;
            return {
              sym,
              side,
              amount,
              pricePerShare: a.pricePerShare,
              feedUsd: a.feedUsd,
              vsFeedPct: a.vsFeedPct,
              amountOut: side === "buy"
                ? (Number(a.amountOut) / 1e8).toFixed(6)
                : (Number(a.amountOut) / 1e6).toFixed(4),
              amountOutMin: side === "buy"
                ? (Number(a.amountOutMin) / 1e8).toFixed(6)
                : (Number(a.amountOutMin) / 1e6).toFixed(4),
              receiveUnit: side === "buy" ? sym : "USDC",
              poolLiquidityUsdc: a.pool.usdc,
            };
          } catch (e: any) {
            return { error: e.message ?? "Quote failed" };
          }
        },
      }),

      getPrice: tool({
        description: "Get the current Chainlink price for a tokenized stock. Use this when the user asks how much a stock costs or its current price, without wanting to trade.",
        inputSchema: zodSchema(z.object({
          sym: z.string().describe("Token ticker e.g. NVDAc, AAPLc"),
        })),
        execute: async ({ sym }: { sym: string }) => {
          try {
            const prices = await getAllPrices();
            const found = prices.find(
              (p) => p.stock.tokenTicker.toLowerCase() === sym.toLowerCase() ||
                     p.stock.ticker.toLowerCase() === sym.toLowerCase()
            );
            if (!found) return { error: `Unknown ticker: ${sym}` };
            return {
              sym: found.stock.tokenTicker,
              name: found.stock.name,
              logo: found.stock.logo,
              price: found.price,
              changePercent: found.changePercent,
              updatedAt: found.updatedAt,
            };
          } catch (e: any) {
            return { error: e.message ?? "Price lookup failed" };
          }
        },
      }),

      getPortfolio: tool({
        description: "Get the user's current tokenized stock holdings and portfolio value. Call this when the user asks about their portfolio, holdings, or positions.",
        inputSchema: zodSchema(z.object({})),
        execute: async () => {
          if (!walletAddress) {
            return { error: "No wallet connected. Please connect your wallet first." };
          }
          try {
            const [balances, prices] = await Promise.all([
              getBalances(walletAddress as `0x${string}`),
              getAllPrices(),
            ]);
            const holdings = balances.map((b) => {
              const priceData = prices.find((p) => p.stock.ticker === b.ticker);
              const price = priceData?.price ?? 0;
              return {
                ticker: b.ticker,
                name: priceData?.stock.name ?? b.ticker,
                logo: priceData?.stock.logo ?? "🔹",
                tokenTicker: priceData?.stock.tokenTicker ?? b.ticker,
                shares: b.shares,
                price,
                value: b.shares * price,
                changePercent: priceData?.changePercent,
              };
            });
            const totalValue = holdings.reduce((sum, h) => sum + h.value, 0);
            return { holdings, totalValue };
          } catch (e: any) {
            return { error: e.message ?? "Failed to fetch portfolio" };
          }
        },
      }),
    },
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({ stream: result.stream }),
  });
}
