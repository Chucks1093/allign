import type { SupabaseClient } from "@supabase/supabase-js";
import type { Profile } from "@/lib/types";

type CreateProfileInput = {
  privy_user_id: string;
  wallet_address: string;
  chain_id?: number;
};

type UpdateProfileInput = Partial<Pick<Profile, "wallet_address" | "chain_id">>;

export class ProfileService {
  constructor(private supabase: SupabaseClient) {}

  async create(input: CreateProfileInput): Promise<Profile> {
    const { data, error } = await this.supabase
      .from("profiles")
      .upsert(
        { chain_id: 8453, ...input },
        { onConflict: "privy_user_id" }
      )
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  async get(privyUserId: string): Promise<Profile | null> {
    const { data, error } = await this.supabase
      .from("profiles")
      .select()
      .eq("privy_user_id", privyUserId)
      .single();

    if (error && error.code !== "PGRST116") throw new Error(error.message);
    return data ?? null;
  }

  async update(privyUserId: string, input: UpdateProfileInput): Promise<Profile> {
    const { data, error } = await this.supabase
      .from("profiles")
      .update(input)
      .eq("privy_user_id", privyUserId)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  async delete(privyUserId: string): Promise<void> {
    const { error } = await this.supabase
      .from("profiles")
      .delete()
      .eq("privy_user_id", privyUserId);

    if (error) throw new Error(error.message);
  }
}
