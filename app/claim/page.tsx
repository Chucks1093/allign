import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import ClaimClient from "./ClaimClient";
import { Gift, AlertCircle, CheckCircle2 } from "lucide-react";

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
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0d0d0d] flex items-center justify-center px-4 font-[var(--font-manrope)]">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-10">
          <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
            <Gift size={20} className="text-white/60" />
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}

export default async function ClaimPage({ searchParams }: { searchParams: Promise<{ id?: string; auth_error?: string }> }) {
  const { id, auth_error } = await searchParams;

  // no id → handle search UI
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
    .select("id, type, platform, recipient_handle, ticker, token_contract, amount, status, deposited, sender_address")
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

  // sticker — check if scheduled release date has passed
  if (gift.type === "sticker" && !gift.deposited) {
    return (
      <Shell>
        <div className="text-center space-y-3">
          <AlertCircle size={36} className="text-yellow-400 mx-auto" />
          <p className="text-white text-xl font-bold">Not ready yet</p>
          <p className="text-white/40 text-sm">This gift has a scheduled release date that hasn't arrived yet.</p>
        </div>
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
