# Base Ecosystem — What's Possible for Allign

Deep dive findings from docs.base.org. Everything listed here is live on Base mainnet today unless marked experimental.

---

## 🟢 Easy Wins (this week)

### Paymaster / Gas Sponsorship
Users pay zero ETH — ever. The app sponsors all gas.  
**Allign use:** "Trade stocks onchain. No ETH needed." Configure CDP paymaster URL in `wallet_sendCalls` capabilities.  
**How:** Pass paymaster URL in wallet config. CDP gives free credits on signup.

### Batch Transactions (wallet_sendCalls / EIP-5792)
Multiple onchain calls in one user-approved transaction. Atomic (all or nothing).  
**Allign use:** USDC approval + stock purchase in one tap instead of two MetaMask popups. Sell + rebuy in one action.  
**How:** `wallet_sendCalls` in Base Account SDK / Wagmi.

### Basenames (alice.base.eth)
Base's ENS equivalent. Human-readable names resolving to wallet addresses.  
**Allign use:** Show `alice.base.eth` instead of `0x1234...` everywhere — portfolio, gifts, trade history. Gift flow: "Send to alice.base.eth" instead of pasting addresses.  
**How:** Base Account SDK Wagmi integration. One hook call resolves name ↔ address.

### Prolink Gift URLs
Shareable URLs encoding a token transfer. Recipient clicks → Base Account prompts them to accept.  
**Allign use:** "Gift stocks with a link." AI generates a gift link → user forwards via iMessage. "Click to claim your NVDA from mom."  
**How:** `createProlinkUrl()` SDK utility. Encodes recipient + token + amount.

### Builder Codes (ERC-8021)
Mint an ERC-721 at base.dev. Append 4-byte suffix to all tx calldata. Base indexes and attributes all transactions to your app.  
**Allign use:** Free analytics dashboard (users, volume, conversions). Appear in Base App discovery. Earn potential future rewards.  
**How:** Configure `dataSuffix` once in Wagmi client. Automatic from there. Zero cost.

### Transaction Simulation
Preview exact outcome before user signs. Shows token amounts in/out, addresses, state changes.  
**Allign use:** "You will spend 183.42 USDC and receive 1.00 NVDA token." Before gifting: "You will send 0.5 AAPL to alice.base.eth (~$94.50)."  
**How:** Enable via `inspect-txn-simulation` in Base Account SDK config.

### B20 scaledBalanceOf()
B20 tokens have a `multiplier` for stock splits. Raw `balanceOf()` doesn't reflect splits. `scaledBalanceOf()` does.  
**Allign use:** Always use `scaledBalanceOf()` and `uiMultiplier()` for portfolio display. Notify users when splits occur.  
**How:** Call `scaledBalanceOf(address)` instead of `balanceOf(address)` on B20 contracts.

---

## 🟡 Medium (next sprint)

### Spend Permissions
User signs once → app can spend up to $X USDC per period autonomously. Allowance auto-resets each period. User can revoke anytime from Base Account dashboard.  
**Allign use:** Core of the trading agent. User sets "$5/day budget" → signs once → agent trades within that limit every day. Also powers DCA: "Invest $50 in NVDA every Monday."  
**How:** `requestSpendPermission()` frontend. `SpendPermission.spend()` server-side at trade time.

### Sub-Accounts (ERC-7895)
App-specific embedded wallet linked to user's main Base Account. Parent funds sub-account via Spend Permissions. No per-tx signing within sub-account limits.  
**Allign use:** Provision a trading sub-account per user. Agent has full control within that account. User funds it once. All agent trades happen without popups.  
**How:** `wallet_addSubAccount` RPC + Spend Permissions for funding.

### B20 Announcement Events
B20 issuers call `announce()` for stock dividends and corporate actions. Emits events with human-readable description + URI to action details.  
**Allign use:** Listen for events on all held tokens. Push notification: "You received 0.05 additional AAPL shares from a dividend." Build a "Corporate Actions" feed.  
**How:** Subscribe to `Announcement` events via viem `watchContractEvent`.

### Base Verify (Social Verification)
Verifies wallet controls a social/Coinbase account. Returns sybil-resistant token.  
**Allign use:** Unlock higher trading tiers for Coinbase-verified users (already KYC'd). "Verified Investor" badge. One-per-person referral enforcement.  
**How:** REST API backend integration + SIWE frontend flow.

### Morpho Vaults (Yield on Idle USDC)
Deposit USDC to earn variable APY (4%+). Available as Base MCP plugin.  
**Allign use:** "Your $500 uninvested USDC earns 4.2% APY until your next DCA purchase." Agent manages idle cash automatically.  
**How:** Morpho SDK + AI assistant routing logic.

---

## 🔴 Advanced / Moat Builders

### Limit Orders via EIP-3009 (Authorize-then-Capture)
User signs offchain authorization for a USDC amount within a validity window. App captures when conditions are met.  
**Allign use:** "Buy AAPL when it drops to $180." Authorization stored. Agent captures when Chainlink feed hits target. No popup at execution.  
**How:** Store EIP-3009 signatures in Supabase. Price monitoring cron. `receiveWithAuthorization()` at execution.

### Allign MCP Plugin
Expose Allign as a Model Context Protocol plugin. Any MCP-compatible AI (Claude, Cursor, etc.) can trade through Allign.  
**Allign use:** "Hey Claude, buy $50 of NVDA through Allign" — works from any AI assistant. Distribution moat: Allign becomes infrastructure, not just an app.  
**How:** Write MCP plugin spec. API endpoints returning unsigned calldata. Register at base.dev.

### EIP-8130 Session Keys (Experimental — Vibenet only)
Protocol-level account abstraction. Session keys with granular permissions: per-token spend limits, function restrictions, time bounds.  
**Allign use:** Agent gets a scoped session key: "Buy/sell up to $100/day in B20 tokens for 7 days." Zero signing prompts within those limits. True autonomy.  
**Status:** Experimental (Vibenet devnet, chain ID 84538453). Design for it now, ship when mainnet.

### B20 Policy Registry Pre-Check
Query PolicyRegistry before executing a gift to check if recipient is eligible to hold the token.  
**Allign use:** Prevent failed gift transactions. "This recipient is not eligible to receive NVDA tokens" — shown before user signs.  
**How:** Read `PolicyRegistry` contract state before transaction.

---

## The 3 Biggest Differentiators

1. **DCA via Spend Permissions** — Invest automatically, fully non-custodial. No CEX controls your money.

2. **Gift stocks with Basename + message + Prolink URL** — Fully onchain, human-readable, shareable. No other stock app can do this.

3. **Autonomous AI agent with Sub-Account** — Agent trades within user-set limits with zero popups. Truly autonomous portfolio management, non-custodial.

---

## Base MCP — What the AI Agent Can Do Natively

When connected to Base MCP, the Allign AI assistant can:
- Read B20 balances and portfolio composition
- Execute stock purchases and sales
- Send token transfers (gifts)
- Interact with DeFi protocols (Morpho, Uniswap)
- Pay x402 APIs autonomously

All write actions require user approval via a link (or via session key within limits).
