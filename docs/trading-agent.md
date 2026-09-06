# Allign Trading Agent — Design Doc

## What It Is

A fully autonomous AI agent that trades B20 tokenized stocks on behalf of users. The user sets one thing: a daily USDC spending limit. The agent handles everything else — researching signals, deciding what to buy, executing trades, and reporting back.

No rules to configure. No "buy X every Monday." The agent is smart enough to decide on its own.

---

## How It Works (High Level)

```
User: "Agent budget: $5/day"
User: signs Spend Permission (one time)

Every 4 hours:
  Agent scores all 13 B20 stocks using 5 signal sources
  Buys the top-scoring stocks with small amounts (Half-Kelly sized)
  Monitors holdings for sell signals
  Reports activity in chat
```

---

## Signal Sources (What the Agent Looks At)

### 1. Price Momentum (30% weight)
Source: Chainlink price feeds (already integrated)

- 24h price change direction and magnitude
- Rate of change (is momentum accelerating or decelerating?)
- Score: normalized 0→1, centered at 0.5 for flat, 1.0 for strong uptrend

```
momentum_score = sigmoid((change_24h / stddev_universe) * 2)
```

### 2. Polymarket Consensus (25% weight)
Source: Polymarket Gamma API (free, public)

- Search for prediction markets related to each stock ticker
- Queries: "[COMPANY] earnings", "[COMPANY] stock", "[COMPANY] revenue"
- Extract market consensus (lastPrice = implied probability of YES)
- High consensus on a positive outcome = bullish signal

```
polymarket_score = weighted_avg(consensus scores for matching markets)
// weighted by market liquidity and time-to-resolution proximity
```

### 3. News Sentiment (20% weight)
Source: Perplexity Sonar API or OpenAI web search

- Pull 5 most recent headlines per stock
- LLM scores each headline: -1.0 (very negative) to +1.0 (very positive)
- Weighted by recency (last 6h > last 24h > last 7d)

```
sentiment_score = normalize(weighted_avg(headline_scores))
```

### 4. Pool Health (15% weight)
Source: Ozmium advisory data + Chainlink feed

- Pool liquidity depth (can we trade without slippage?)
- Price deviation from Chainlink feed (positive deviation = demand pressure)
- Feed alignment: is pool price tracking the real stock price?

```
pool_score = 0.6 * liquidity_score + 0.4 * (1 - abs(feed_deviation))
```

### 5. Relative Strength (10% weight)
Source: Computed from Chainlink data across all 13 B20 stocks

- How does this stock's momentum compare to the B20 universe average?
- Agent prefers the strongest relative movers, not just absolute gainers

```
relative_score = rank(stock_momentum) / total_stocks
```

---

## Composite Score Formula

Adapted from TextWallet's multi-factor scoring (proven in production):

```typescript
const score = clamp(
  0.30 * momentum_score +
  0.25 * polymarket_score +
  0.20 * sentiment_score +
  0.15 * pool_health_score +
  0.10 * relative_strength_score
);
```

**Thresholds:**
- score ≥ 0.65 → BUY candidate
- score ≤ 0.35 → SELL candidate (if held)
- 0.35–0.65 → HOLD

---

## Position Sizing — Half-Kelly with Hard Cap

Adapted from TextWallet's Kelly Criterion implementation:

```typescript
// How much better than random is this signal?
const edge = score - 0.5;

// Full Kelly fraction
const kelly_full = edge / (1 - edge);

// Half Kelly (conservative — cuts theoretical optimal by 50%)
const kelly_half = kelly_full * 0.5;

// Hard cap: never more than 10% of daily budget on one trade
const position_fraction = Math.min(kelly_half, 0.10);

// Dollar amount
const trade_amount = daily_budget * position_fraction;
// Minimum $0.30 (Ozmium minimum)
const final_amount = Math.max(trade_amount, 0.30);
```

**Example with $5/day budget:**
- Strong signal (score 0.80) → edge 0.30 → position ~$1.20
- Medium signal (score 0.68) → edge 0.18 → position ~$0.45
- Weak signal (score 0.66) → edge 0.16 → position ~$0.35

Multiple buy candidates → split budget across all within daily limit.

---

## Execution Flow

```
1. Score engine runs (every 4 hours via Vercel Cron)
2. Find stocks with score ≥ 0.65 and budget remaining
3. For each buy candidate:
   a. Check Supabase: has this stock been bought in last N hours?
   b. Pull USDC from user wallet: SpendPermission.spend(amount)
   c. Call Ozmium API: get swap route (taker = user wallet)
   d. Execute swap transactions
   e. Log to agent_trades table: stock, amount, score, reasoning
4. Check holdings: any score ≤ 0.35?
   a. Get Ozmium sell quote
   b. Execute sell
   c. Log sell with reasoning
5. Aggregate activity → send to user's chat stream
```

---

## Spend Permission Flow (User Side)

```
/agent page:
  User sets daily budget → $5 USDC
  
  Signs EIP-712 message:
  {
    spender: ALLIGN_SERVER_WALLET,
    token: USDC_ADDRESS,
    allowance: 5_000_000,  // $5 in USDC units (6 decimals)
    period: 86400,          // 1 day in seconds
    start: now,
    end: now + 30days       // 30 day agent authorization
  }
  
  Stored in Supabase: spend_permissions table
  
Agent (server-side) at trade time:
  SpendPermission.spend({
    permission: stored_permission,
    value: trade_amount_in_usdc_units
  })
  → USDC pulled from user wallet → server wallet
  → Server executes Ozmium swap
  → B20 tokens delivered to user wallet
```

---

## Database Schema

```sql
-- Agent configuration per user
create table agent_configs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id),
  wallet_address text not null,
  daily_budget_usdc numeric not null,  -- e.g. 5.00
  is_active boolean default true,
  spend_permission_json jsonb,
  spend_permission_hash text,
  permission_expires_at timestamptz,
  created_at timestamptz default now()
);

-- Every autonomous trade the agent makes
create table agent_trades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id),
  wallet_address text not null,
  stock_ticker text not null,          -- e.g. "NVDAc"
  side text not null,                  -- "buy" | "sell"
  amount_usdc numeric,                 -- USDC spent (for buy)
  amount_shares numeric,               -- shares received/sold
  composite_score numeric,             -- agent's confidence 0-1
  signal_breakdown jsonb,              -- { momentum, polymarket, sentiment, pool, relative }
  reasoning text,                      -- human-readable why
  tx_hash text,
  status text default 'pending',       -- pending | success | failed
  created_at timestamptz default now()
);

-- Daily budget tracking
create table agent_budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id),
  date date default current_date,
  budget_usdc numeric not null,
  spent_usdc numeric default 0,
  remaining_usdc numeric,
  unique(user_id, date)
);

-- Signal cache (avoid redundant API calls)
create table signal_cache (
  ticker text primary key,
  scores jsonb not null,
  composite numeric not null,
  signal text not null,
  reasoning text,
  cached_at timestamptz default now(),
  expires_at timestamptz
);
```

---

## What Makes This Different from Rule-Based DCA

| Rule-based DCA | Allign Agent |
|---|---|
| User sets: "Buy $50 NVDA every Monday" | Agent decides: "Score is 0.72, buy $1.20" |
| Buys regardless of conditions | Only buys when signals are favorable |
| Single asset, fixed amount | Diversifies across best opportunities |
| No sell logic | Sells when signals reverse |
| "Dumb" execution | Explains every decision in plain English |
| Needs frequent updating | Fully autonomous |

---

## Signal Engine File Structure

```
lib/agent/
  types.ts          — TypeScript interfaces
  momentum.ts       — Price momentum scoring from Chainlink
  polymarket.ts     — Polymarket Gamma API integration + scoring
  sentiment.ts      — News sentiment via LLM
  pool.ts           — Pool health from Ozmium/feed data
  scorer.ts         — Composite score + Kelly sizing
  signals.ts        — Main orchestrator: scores all 13 B20 stocks
  executor.ts       — Spend Permission pull + Ozmium execution
  scheduler.ts      — Cron job logic
```

---

## Build Order

1. **Signal engine** (`lib/agent/signals.ts` + sub-modules) — the brain
2. **Spend Permission setup** — user authorization flow on `/agent` page
3. **Executor** (`lib/agent/executor.ts`) — wire signals to actual trades
4. **Vercel Cron** (`app/api/agent/cron/route.ts`) — make it autonomous
5. **`/agent` page** — setup + live activity dashboard
6. **Chat integration** — agent reports trades, answers "why did you buy X?"

---

## Constraints & Safety

- **Hard daily budget cap** — agent never exceeds user's set limit
- **Minimum trade $0.30** — Ozmium minimum, prevents dust transactions
- **Max 10% per trade** — Half-Kelly cap, never puts everything in one stock
- **Spend Permission expiry** — user authorizes for 30 days max, must re-authorize
- **User can pause anytime** — one button, immediately stops all agent activity
- **Full audit log** — every trade logged with signal breakdown and reasoning
- **No leverage, no borrowing** — agent only spends what user explicitly budgets
