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
- When the user asks what stocks are available, call getAvailableStocks — do NOT list them as text
- When the user wants to know more about a specific company or stock, call getStockDetails — do NOT describe it as text
- When the user asks what's trending, top performing, or doing well, call getTrendingStocks — do NOT list as text
- When the user asks what stocks are down, declining, doing badly, or losing, call getDecliningStocks — do NOT list as text
- When you receive a message starting with __trade_result__, a trade just succeeded — respond in 1-2 friendly sentences confirming it and include the Basescan link as a clickable markdown link
- When you receive a message starting with __trade_failed__, a trade failed — respond briefly explaining what went wrong and suggest trying again
- When you receive a message starting with __agent_activated__, the AI agent spend permission was signed — respond in 1-2 friendly sentences confirming the agent is live with the budget and period details
- When you receive a message starting with __agent_failed__, agent activation failed — respond briefly with what went wrong and suggest trying again

## Autonomous Trading Agent
When the user asks to activate the agent, set up auto trading, enable the AI agent, or let AI trade for them:
1. ALWAYS treat this as a NEW activation request — never assume the agent is already active from chat history
2. Suggest a daily budget (default $5/day) and ask them to confirm
3. Once they confirm, end your message with this exact tag on its own line:
   [ACTION:ACTIVATE_AGENT budgetUSD=5 periodDays=30]
   (replace 5 with whatever budget they chose)
4. The app will handle the wallet signature — do not explain the technical steps
5. After activation succeeds (__agent_activated__ message), confirm the agent is live and explain it runs every 4 hours
6. NEVER say the agent is "already activated" or reference previous activations from chat history — you have no way to verify the current on-chain state
7. NEVER call getQuote when the user asks about activating the agent

## Tool usage rules
- Only call getQuote ONCE per response, for a single specific stock the user explicitly named
- Never call getQuote multiple times in one response
- Never call getQuote when the user asks about the agent, portfolio, or available stocks`;

export async function POST(req: Request) {
  const { messages, walletAddress }: { messages: UIMessage[]; walletAddress?: string } = await req.json();

  const INTERNAL_PREFIXES = ["__trade_result__", "__trade_failed__", "__agent_activated__", "__agent_failed__"];
  const filteredMessages = messages.filter((msg) => {
    if (msg.role !== "user") return true;
    const text = (msg.parts?.find((p: any) => p.type === "text") as any)?.text as string ?? "";
    return !INTERNAL_PREFIXES.some((prefix) => text.startsWith(prefix));
  });

  const system = walletAddress
    ? `${SYSTEM}\n\nWallet connected: ${walletAddress}`
    : `${SYSTEM}\n\nNo wallet connected — tell the user to connect their wallet before trading.`;

  const result = streamText({
    model: openai("gpt-4o"),
    system,
    messages: await convertToModelMessages(filteredMessages),
    stopWhen: isStepCount(5),
    onChunk: ({ chunk }: any) => {
      if (chunk.type === "text-delta") process.stdout.write(chunk.textDelta ?? "");
      else if (chunk.type === "tool-call") console.log("\n[chat] tool-call:", JSON.stringify({ tool: chunk.toolName, input: chunk.input ?? chunk.args }));
    },
    onFinish: ({ text, usage, toolCalls }: any) => {
      console.log("\n[chat] response:", text);
      if (toolCalls?.length) console.log("[chat] tool-calls:", JSON.stringify(toolCalls.map((t: any) => ({ tool: t.toolName, args: t.args ?? t.input }))));
      console.log("[chat] usage:", JSON.stringify(usage));
    },
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
            const [quote, prices] = await Promise.all([
              fetchStockQuote({ sym, side, amount, taker: walletAddress, slippageBps: 100 }),
              getAllPrices(),
            ]);
            const a = quote.advisory;
            const stockData = prices.find(
              (p) => p.stock.tokenTicker.toLowerCase() === sym.toLowerCase()
            );
            return {
              sym,
              name: stockData?.stock.name ?? sym,
              logo: stockData?.stock.logo ?? "",
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
              marketCap: found.stock.marketCap,
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
                marketCap: priceData?.stock.marketCap,
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

      getAvailableStocks: tool({
        description: "Show the available tokenized stocks on Allign. Call this when the user asks what stocks are available, what they can trade, or to see all stocks.",
        inputSchema: zodSchema(z.object({})),
        execute: async () => {
          try {
            const prices = await getAllPrices();
            const stocks = prices
              .filter((p) => !p.error)
              .slice(0, 6)
              .map((p) => ({
                sym: p.stock.tokenTicker,
                name: p.stock.name,
                logo: p.stock.logo,
                price: p.price,
                changePercent: p.changePercent,
                marketCap: p.stock.marketCap,
              }));
            return { stocks };
          } catch (e: any) {
            return { error: e.message ?? "Failed to fetch stocks" };
          }
        },
      }),

      getTrendingStocks: tool({
        description: "Show the top performing stocks by 24h price change. Call this when the user asks what's trending, what's doing well, top movers, or best performers.",
        inputSchema: zodSchema(z.object({})),
        execute: async () => {
          try {
            const prices = await getAllPrices();
            const stocks = prices
              .filter((p) => !p.error && p.changePercent !== undefined)
              .sort((a, b) => (b.changePercent ?? 0) - (a.changePercent ?? 0))
              .slice(0, 5)
              .map((p) => ({
                sym: p.stock.tokenTicker,
                name: p.stock.name,
                logo: p.stock.logo,
                price: p.price,
                changePercent: p.changePercent,
                marketCap: p.stock.marketCap,
              }));
            return { stocks };
          } catch (e: any) {
            return { error: e.message ?? "Failed to fetch trending stocks" };
          }
        },
      }),

      getStockDetails: tool({
        description: "Get detailed information about a specific stock — description, sector, market cap, exchange, employees, website, and live price. Call this when the user wants to know more about a company.",
        inputSchema: zodSchema(z.object({
          sym: z.string().describe("Token ticker e.g. NVDAc, AAPLc, or the plain ticker e.g. NVDA"),
        })),
        execute: async ({ sym }: { sym: string }) => {
          try {
            const prices = await getAllPrices();
            const found = prices.find(
              (p) =>
                p.stock.tokenTicker.toLowerCase() === sym.toLowerCase() ||
                p.stock.ticker.toLowerCase() === sym.toLowerCase()
            );
            if (!found) return { error: `Unknown ticker: ${sym}` };
            const s = found.stock;
            return {
              sym: s.tokenTicker,
              ticker: s.ticker,
              name: s.name,
              logo: s.logo,
              price: found.price,
              changePercent: found.changePercent,
              marketCap: s.marketCap,
              sector: s.sector,
              exchange: s.exchange,
              employees: s.employees,
              website: s.website,
              description: s.description,
              tradable: s.tradable !== false,
            };
          } catch (e: any) {
            return { error: e.message ?? "Details lookup failed" };
          }
        },
      }),

      getDecliningStocks: tool({
        description: "Show the worst performing stocks by 24h price change. Call this when the user asks what stocks are down, declining, dropping, doing badly, or losing today.",
        inputSchema: zodSchema(z.object({})),
        execute: async () => {
          try {
            const prices = await getAllPrices();
            const stocks = prices
              .filter((p) => !p.error && p.changePercent !== undefined)
              .sort((a, b) => (a.changePercent ?? 0) - (b.changePercent ?? 0))
              .slice(0, 5)
              .map((p) => ({
                sym: p.stock.tokenTicker,
                name: p.stock.name,
                logo: p.stock.logo,
                price: p.price,
                changePercent: p.changePercent,
                marketCap: p.stock.marketCap,
              }));
            return { stocks };
          } catch (e: any) {
            return { error: e.message ?? "Failed to fetch declining stocks" };
          }
        },
      }),
    },
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({ stream: result.stream }),
  });
}
