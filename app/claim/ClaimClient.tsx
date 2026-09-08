"use client";

import { useState, useEffect } from "react";
import { useAccount, useConnect, useConnectors } from "wagmi";
import { CheckCircle2, AlertCircle, Loader2, ExternalLink, Wallet, ShieldAlert, Clock } from "lucide-react";
import { GIFT_STICKERS } from "@/components/gift/GiftTab";

interface GiftRecord {
  id: string;
  type: "handle" | "link" | "sticker";
  platform?: string;
  recipient_handle?: string;
  ticker: string;
  amount: number;
  status: "pending" | "claimed";
  sender_address: string;
  sticker_id?: string | null;
  message?: string | null;
  scheduled_at?: string | null;
}

interface Verified {
  platform: string;
  handle: string;
}

const PLATFORM_ICONS: Record<string, React.ReactNode> = {
  twitter:   <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.748l7.73-8.835L1.254 2.25H8.08l4.253 5.622 5.91-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>,
  farcaster: <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7"><path d="M18.24 0.24H5.76C2.5789 0.24 0 2.8188 0 6v12c0 3.1811 2.5789 5.76 5.76 5.76h12.48c3.1812 0 5.76-2.5789 5.76-5.76V6C24 2.8188 21.4212 0.24 18.24 0.24m0.8155 17.1662v0.504c0.2868-0.0256 0.5458 0.1905 0.5439 0.479v0.5688h-5.1437v-0.5688c-0.0019-0.2885 0.2576-0.5047 0.5443-0.479v-0.504c0-0.22 0.1525-0.402 0.358-0.458l-0.0095-4.3645c-0.1589-1.7366-1.6402-3.0979-3.4435-3.0979-1.8038 0-3.2846 1.3613-3.4435 3.0979l-0.0096 4.3578c0.2276 0.0424 0.5318 0.2083 0.5395 0.4648v0.504c0.2863-0.0256 0.5457 0.1905 0.5438 0.479v0.5688H4.3915v-0.5688c-0.0019-0.2885 0.2575-0.5047 0.5438-0.479v-0.504c0-0.2529 0.2011-0.4548 0.4536-0.4724v-7.895h-0.4905L4.2898 7.008l2.6405-0.0005V5.0419h9.9495v1.9656h2.8219l-0.6091 2.0314h-0.4901v7.8949c0.2519 0.0177 0.453 0.2195 0.453 0.4724" /></svg>,
  telegram:  <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" /></svg>,
  discord:   <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.015.043.033.055a19.9 19.9 0 0 0 5.993 3.03.077.077 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" /></svg>,
};

const PLATFORM_LABEL: Record<string, string> = {
  twitter: "X / Twitter", farcaster: "Farcaster", telegram: "Telegram", discord: "Discord",
};

const CARD_COLORS = [
  "#E8D5FF", "#FFD6E8", "#FFF5A3", "#D6F0FF",
  "#FFE4CC", "#D6FFE8", "#F5D6FF", "#FFD6D6",
  "#D6EDFF", "#FFEFD6", "#E8FFD6", "#FFD6F5",
  "#D6FFF5", "#F5FFD6", "#FFD6E0", "#D6D6FF",
  "#FFF0D6", "#D6FFE0", "#FFD6EC", "#E0D6FF",
];

function shortAddr(a: string) { return `${a.slice(0, 6)}…${a.slice(-4)}`; }

function useCountdown(target: string | null | undefined) {
  const [diff, setDiff] = useState(() =>
    target ? Math.max(0, new Date(target).getTime() - Date.now()) : 0
  );
  useEffect(() => {
    if (!target) return;
    const id = setInterval(() => {
      setDiff(Math.max(0, new Date(target).getTime() - Date.now()));
    }, 1000);
    return () => clearInterval(id);
  }, [target]);
  const s = Math.floor(diff / 1000);
  return {
    locked: diff > 0,
    days: Math.floor(s / 86400),
    hours: Math.floor((s % 86400) / 3600),
    minutes: Math.floor((s % 3600) / 60),
    seconds: s % 60,
  };
}

function GiftCard({ gift }: { gift: GiftRecord }) {
  const stickerId = gift.sticker_id ? Number(gift.sticker_id) : null;
  const stickerUrl = stickerId ? GIFT_STICKERS[stickerId] : null;
  const colorIndex = stickerId ? (stickerId - 1) % CARD_COLORS.length : parseInt(gift.id[0], 16) % CARD_COLORS.length;
  const color = CARD_COLORS[colorIndex];
  const countdown = useCountdown(gift.scheduled_at);

  return (
    <div className="bg-[#1a1a1a] rounded-2xl p-6 flex flex-col items-center gap-4">
      <div className="w-28 h-28 rounded-2xl flex items-center justify-center"
        style={{ backgroundColor: color }}>
        {stickerUrl
          ? <img src={stickerUrl} alt="" className="w-20 h-20 object-contain" />
          : <span className="text-5xl">🎁</span>
        }
      </div>
      <div className="text-center space-y-1">
        <p className="text-white text-3xl font-bold">{gift.amount} {gift.ticker}</p>
        <p className="text-white/40 text-sm">from {shortAddr(gift.sender_address)} · Base</p>
      </div>
      {gift.message && (
        <div className="w-full bg-[#111] rounded-xl px-4 py-3 text-center">
          <p className="text-white/70 text-sm italic">"{gift.message}"</p>
        </div>
      )}
      {countdown.locked && (
        <div className="w-full bg-[#111] border border-white/5 rounded-xl px-4 py-3 flex flex-col items-center gap-2">
          <div className="flex items-center gap-1.5 text-white/40 text-xs">
            <Clock size={12} /> Unlocks in
          </div>
          <div className="flex items-center gap-3 text-white font-mono font-bold text-xl">
            {countdown.days > 0 && <span>{countdown.days}d</span>}
            <span>{String(countdown.hours).padStart(2, "0")}h</span>
            <span>{String(countdown.minutes).padStart(2, "0")}m</span>
            <span>{String(countdown.seconds).padStart(2, "0")}s</span>
          </div>
        </div>
      )}
    </div>
  );
}

function ConnectButton({ onConnected }: { onConnected?: () => void }) {
  const connectors = useConnectors();
  const { connect } = useConnect();
  const [connecting, setConnecting] = useState(false);

  async function handleConnect() {
    const connector = connectors[0];
    if (!connector) return;
    setConnecting(true);
    try {
      await connect({ connector });
      onConnected?.();
    } catch {
      // user dismissed — fine
    } finally {
      setConnecting(false);
    }
  }

  return (
    <button onClick={handleConnect} disabled={connecting}
      className="w-full py-4 rounded-xl bg-white hover:bg-white/90 text-black font-bold text-base flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50">
      {connecting
        ? <><Loader2 size={16} className="animate-spin" /> Connecting…</>
        : <><Wallet size={18} /> Connect wallet to claim</>}
    </button>
  );
}

// Telegram widget — injects their script, calls back with verified data
function TelegramVerify({ gift }: { gift: GiftRecord }) {
  const botName = (process.env.NEXT_PUBLIC_TELEGRAM_BOT_NAME ?? "").replace(/^@/, "");

  useEffect(() => {
    if (!(window as any).TelegramLoginWidget) {
      const script = document.createElement("script");
      script.src = "https://telegram.org/js/telegram-widget.js?22";
      script.async = true;
      script.setAttribute("data-telegram-login", botName ?? "");
      script.setAttribute("data-size", "large");
      script.setAttribute("data-auth-url", `${window.location.origin}/api/auth/telegram?giftId=${gift.id}`);
      script.setAttribute("data-request-access", "write");
      document.getElementById("tg-widget")?.appendChild(script);
    }
  }, [gift.id, botName]);

  return (
    <div className="space-y-4">
      <div className="bg-[#1a1a1a] rounded-xl px-5 py-4 text-center space-y-1">
        <p className="text-white/60 text-sm">This gift was sent to</p>
        <p className="text-white font-bold text-lg">@{gift.recipient_handle}</p>
        <p className="text-white/40 text-xs">on Telegram</p>
      </div>
      <div id="tg-widget" className="flex justify-center" />
      <p className="text-center text-white/25 text-xs">We verify you own this handle before releasing the gift.</p>
    </div>
  );
}

// Farcaster SIWF — creates channel + opens Warpcast in one click, polls for completion
function FarcasterVerify({ gift }: { gift: GiftRecord }) {
  const [channelToken, setChannelToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [waiting, setWaiting] = useState(false);

  async function startSignIn() {
    setLoading(true);
    try {
      const res = await fetch(`/api/auth/farcaster?giftId=${gift.id}`);
      const data = await res.json();
      if (data.url && data.channelToken) {
        setChannelToken(data.channelToken);
        setWaiting(true);
        // Open Warpcast immediately — no second button needed
        window.open(data.url, "_blank");
      }
    } finally {
      setLoading(false);
    }
  }

  async function checkStatus(token: string) {
    const res = await fetch(`/api/auth/farcaster/callback?channelToken=${token}&giftId=${gift.id}`);
    const data = await res.json();
    if (data.state === "completed") {
      window.location.reload();
    }
    if (data.state === "failed") {
      setWaiting(false);
      setChannelToken(null);
    }
  }

  // Poll every 2s while waiting
  useEffect(() => {
    if (!waiting || !channelToken) return;
    const interval = setInterval(() => checkStatus(channelToken), 2000);
    return () => clearInterval(interval);
  }, [waiting, channelToken]);

  // Also check immediately when user returns to this tab
  useEffect(() => {
    if (!waiting || !channelToken) return;
    const onVisible = () => {
      if (document.visibilityState === "visible") checkStatus(channelToken);
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [waiting, channelToken]);

  return (
    <div className="space-y-4">
      <div className="bg-[#1a1a1a] rounded-xl px-5 py-4 text-center space-y-1">
        <p className="text-white/60 text-sm">This gift was sent to</p>
        <p className="text-white font-bold text-lg">@{gift.recipient_handle}</p>
        <p className="text-white/40 text-xs">on Farcaster</p>
      </div>

      {waiting ? (
        <div className="space-y-3">
          <div className="bg-[#1a1a1a] rounded-xl px-5 py-5 flex flex-col items-center gap-3">
            <Loader2 size={20} className="text-white/40 animate-spin" />
            <p className="text-white/50 text-sm text-center">Waiting for you to sign in Warpcast…</p>
          </div>
          <button onClick={() => { setWaiting(false); setChannelToken(null); }}
            className="w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white/40 text-sm transition-colors cursor-pointer">
            Cancel
          </button>
        </div>
      ) : (
        <button onClick={startSignIn} disabled={loading}
          className="w-full py-4 rounded-xl bg-white hover:bg-white/90 text-black font-bold text-base flex items-center justify-center gap-3 transition-colors cursor-pointer disabled:opacity-50">
          {loading
            ? <><Loader2 size={16} className="animate-spin" /> Opening Warpcast…</>
            : <>{PLATFORM_ICONS["farcaster"]} Sign in with Farcaster</>}
        </button>
      )}
      <p className="text-center text-white/25 text-xs">We verify you own this handle before releasing the gift.</p>
    </div>
  );
}

// For handle gifts: show platform sign-in button
function HandleVerify({ gift }: { gift: GiftRecord }) {
  const platform = gift.platform ?? "twitter";
  const [loading, setLoading] = useState(false);

  if (platform === "telegram") return <TelegramVerify gift={gift} />;
  if (platform === "farcaster") return <FarcasterVerify gift={gift} />;

  function signIn() {
    setLoading(true);
    window.location.href = `/api/auth/${platform}?giftId=${gift.id}`;
  }

  return (
    <div className="space-y-4">
      <div className="bg-[#1a1a1a] rounded-xl px-5 py-4 text-center space-y-1">
        <p className="text-white/60 text-sm">This gift was sent to</p>
        <p className="text-white font-bold text-lg">@{gift.recipient_handle}</p>
        <p className="text-white/40 text-xs">on {PLATFORM_LABEL[platform] ?? platform}</p>
      </div>
      <button onClick={signIn} disabled={loading}
        className="w-full py-4 rounded-xl bg-white hover:bg-white/90 text-black font-bold text-base flex items-center justify-center gap-3 transition-colors cursor-pointer disabled:opacity-50">
        {loading
          ? <><Loader2 size={16} className="animate-spin" /> Redirecting…</>
          : <>{PLATFORM_ICONS[platform]} Sign in with {PLATFORM_LABEL[platform] ?? platform}</>}
      </button>
      <p className="text-center text-white/25 text-xs">We verify you own this handle before releasing the gift.</p>
    </div>
  );
}

interface Props {
  gift: GiftRecord | null;
  verified: Verified | null;
  authError: boolean;
}

export default function ClaimClient({ gift, verified, authError }: Props) {
  const { address, isConnected } = useAccount();
  const [step, setStep] = useState<"landing" | "claiming" | "done" | "error">("landing");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleClaim() {
    if (!address || !gift) return;
    setStep("claiming");
    try {
      const res = await fetch(`/api/gifts/${gift.id}/release`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipient: address }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setTxHash(data.txHash);
      setStep("done");
    } catch (e: any) {
      setErrorMsg(e.message ?? "Something went wrong");
      setStep("error");
    }
  }

  if (step === "done") return (
    <div className="text-center space-y-5">
      <div className="w-16 h-16 rounded-full bg-emerald-500/15 flex items-center justify-center mx-auto">
        <CheckCircle2 size={32} className="text-emerald-400" />
      </div>
      <div>
        <p className="text-white text-2xl font-bold">You got it.</p>
        <p className="text-white/40 text-sm mt-1">{gift?.amount} {gift?.ticker} is in your wallet.</p>
      </div>
      {txHash && (
        <a href={`https://basescan.org/tx/${txHash}`} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-sm text-white/40 hover:text-white transition-colors">
          View on Basescan <ExternalLink size={13} />
        </a>
      )}
      <a href="/app"
        className="block w-full py-4 rounded-xl bg-white hover:bg-white/90 text-black font-bold text-sm text-center transition-colors">
        Open app
      </a>
    </div>
  );

  if (step === "error") return (
    <div className="text-center space-y-5">
      <AlertCircle size={36} className="text-red-400 mx-auto" />
      <div>
        <p className="text-white text-xl font-bold">Something went wrong</p>
        <p className="text-white/40 text-sm mt-1">{errorMsg}</p>
      </div>
      <button onClick={() => setStep("landing")}
        className="w-full py-4 rounded-xl bg-white hover:bg-white/90 text-black font-bold text-sm cursor-pointer transition-colors">
        Try again
      </button>
    </div>
  );

  if (step === "claiming") return (
    <div className="text-center space-y-4 py-8">
      <Loader2 size={32} className="text-white/40 animate-spin mx-auto" />
      <p className="text-white/60 text-sm">Releasing your stocks…</p>
    </div>
  );

  if (!gift) return <HandleSearch />;

  const isHandleGift = gift.type === "handle";
  const handleVerified = verified &&
    verified.platform === gift.platform &&
    verified.handle === gift.recipient_handle?.toLowerCase();
  const wrongHandle = verified && !handleVerified;
  const isLocked = !!gift.scheduled_at && new Date(gift.scheduled_at) > new Date();

  return (
    <div className="space-y-6">
      <div className="text-center space-y-1">
        <p className="text-white text-2xl font-bold">You have a gift</p>
        {isHandleGift && gift.recipient_handle && (
          <p className="text-white/40 text-sm">
            sent to <span className="text-white">@{gift.recipient_handle}</span>
            {gift.platform && ` on ${PLATFORM_LABEL[gift.platform] ?? gift.platform}`}
          </p>
        )}
      </div>

      <GiftCard gift={gift} />

      {/* Auth error from OAuth */}
      {authError && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 flex items-center gap-3">
          <AlertCircle size={16} className="text-red-400 shrink-0" />
          <p className="text-red-400 text-sm">Sign-in failed. Please try again.</p>
        </div>
      )}

      {/* Wrong handle */}
      {wrongHandle && (
        <div className="bg-[#1a1a1a] rounded-xl px-5 py-4 flex items-center gap-3">
          <ShieldAlert size={18} className="text-yellow-400 shrink-0" />
          <div>
            <p className="text-white text-sm font-semibold">Wrong account</p>
            <p className="text-white/40 text-xs">You signed in as @{verified.handle} but this gift is for @{gift.recipient_handle}.</p>
          </div>
        </div>
      )}

      {/* Handle gift — needs verification first */}
      {isLocked ? null : isHandleGift && !handleVerified ? (
        <HandleVerify gift={gift} />
      ) : isConnected && address ? (
        <div className="space-y-3">
          <div className="bg-[#1a1a1a] rounded-xl px-5 py-4 flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
            <p className="text-white font-mono text-sm flex-1">{shortAddr(address)}</p>
            <span className="text-xs text-emerald-400 font-medium">Connected</span>
          </div>
          <button onClick={handleClaim}
            className="w-full py-4 rounded-xl bg-white hover:bg-white/90 text-black font-bold text-base transition-colors cursor-pointer">
            Claim {gift.amount} {gift.ticker}
          </button>
        </div>
      ) : (
        <ConnectButton />
      )}
    </div>
  );
}

function HandleSearch() {
  const [platform, setPlatform] = useState("twitter");
  const [handle, setHandle] = useState("");

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <p className="text-white text-2xl font-bold">Check your gift</p>
        <p className="text-white/40 text-sm">Enter your handle to see if someone sent you stocks.</p>
      </div>
      <div className="grid grid-cols-4 gap-3">
        {Object.entries(PLATFORM_ICONS).map(([id, icon]) => (
          <button key={id} onClick={() => setPlatform(id)}
            className={`aspect-square rounded-xl flex items-center justify-center transition-all cursor-pointer ${
              platform === id ? "bg-[#2a2a2a] text-white ring-1 ring-white/30" : "bg-[#1a1a1a] text-white/50 hover:text-white hover:bg-[#222]"
            }`}>
            {icon}
          </button>
        ))}
      </div>
      <div className="bg-[#1a1a1a] border rounded-xl px-4 py-4 flex items-center gap-3"
        style={{ borderColor: handle ? "#a8ff78" : "rgba(255,255,255,0.1)" }}>
        <span className="text-white/40 font-medium">@</span>
        <input type="text" value={handle} onChange={(e) => setHandle(e.target.value)}
          placeholder="yourhandle"
          className="flex-1 bg-transparent text-white text-sm outline-none placeholder:text-white/25" />
      </div>
      <button disabled={!handle}
        className="w-full py-4 rounded-xl bg-white hover:bg-white/90 text-black font-bold text-base transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed">
        Check for gifts
      </button>
    </div>
  );
}
