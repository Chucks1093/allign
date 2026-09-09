import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import ClaimClient from "./ClaimClient";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import Image from "next/image";

interface GiftRecord {
  id: string;
  type: "handle" | "link" | "sticker";
  platform?: string;
  recipient_handle?: string;
  ticker: string;
  token_contract: string;
  amount: number;
  status: "pending" | "claimed";
  deposited: boolean;
  sender_address: string;
  sticker_id?: string | null;
  message?: string | null;
  scheduled_at?: string | null;
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="min-h-screen relative flex items-center justify-center px-4 font-[var(--font-manrope)]"
      style={{ background: "linear-gradient(to bottom, rgba(37,99,235,0.4) 0%, rgba(37,99,235,0.15) 35%, #0d0d0d 65%)" }}
    >
      <div className="absolute inset-0 pointer-events-none opacity-[0.3] z-0" style={{ backgroundImage: "url('/images/noise.png')" }} />
      <div className="relative z-10 w-full max-w-md">
        <div className="flex justify-center mb-10">
          <div className="w-14 h-14 rounded-xl bg-white/90 flex items-center justify-center shrink-0">
            <Image src="/logo.svg" alt="allign" width={34} height={34} className="invert" />
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}

export default async function ClaimPage({ searchParams }: { searchParams: Promise<{ id?: string; auth_error?: string }> }) {
  const { id, auth_error } = await searchParams;

  if (!id) {
    return (
      <Shell>
        <ClaimClient gift={null} verified={null} authError={false} />
      </Shell>
    );
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  // Read verified handle from OAuth callback cookie
  const verifiedRaw = cookieStore.get(`gift_claim_${id}`)?.value;
  const verified: { platform: string; handle: string } | null = verifiedRaw
    ? (() => { try { return JSON.parse(verifiedRaw); } catch { return null; } })()
    : null;

  const { data: gift, error } = await supabase
    .from("gifts")
    .select("id, type, platform, recipient_handle, ticker, token_contract, amount, status, deposited, sender_address, sticker_id, message, scheduled_at")
    .eq("id", id)
    .single();

  // not found
  if (error || !gift) {
    return (
      <Shell>
        <div className="text-center space-y-3">
          <AlertCircle size={36} className="text-red-400 mx-auto" />
          <p className="text-white text-xl font-bold">Gift not found</p>
          <p className="text-white/40 text-sm">This link may be invalid or has expired.</p>
        </div>
      </Shell>
    );
  }

  // already claimed
  if (gift.status === "claimed") {
    return (
      <Shell>
        <div className="text-center space-y-3">
          <CheckCircle2 size={36} className="text-white/30 mx-auto" />
          <p className="text-white text-xl font-bold">Already claimed</p>
          <p className="text-white/40 text-sm">This gift has already been picked up.</p>
        </div>
      </Shell>
    );
  }

  // scheduled — not yet unlockable
  if (gift.scheduled_at && new Date(gift.scheduled_at) > new Date()) {
    return (
      <Shell>
        <ClaimClient gift={gift as GiftRecord} verified={null} authError={false} />
      </Shell>
    );
  }

  // valid — hand off to client
  return (
    <Shell>
      <ClaimClient gift={gift as GiftRecord} verified={verified} authError={!!auth_error} />
    </Shell>
  );
}
