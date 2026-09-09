import { createClient } from "@supabase/supabase-js";
import type {
  ActivityType,
  BuyInfo,
  SellInfo,
  GiftInfo,
  ErrorInfo,
  InfoInfo,
} from "@/components/agent/ActivityRow";

type InfoForType<T extends ActivityType> =
  T extends "buy"   ? BuyInfo   :
  T extends "sell"  ? SellInfo  :
  T extends "gift"  ? GiftInfo  :
  T extends "error" ? ErrorInfo :
  InfoInfo;

interface RecordActivityInput<T extends ActivityType> {
  wallet_address: string;
  type: T;
  title: string;
  description: string;
  info: InfoForType<T>;
}

function getClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );
}

export async function recordActivity<T extends ActivityType>(
  input: RecordActivityInput<T>
): Promise<void> {
  const supabase = getClient();
  const { error } = await supabase.from("activity").insert({
    wallet_address: input.wallet_address.toLowerCase(),
    type: input.type,
    title: input.title,
    description: input.description,
    info: input.info,
  });
  if (error) throw new Error(`recordActivity failed: ${error.message}`);
}
