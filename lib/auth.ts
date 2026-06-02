import { cache } from "react";

import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ProfileStatus = "pending" | "approved" | "disabled";
export type ProfileRole = "client" | "vip" | "admin";

export type UserProfile = {
  id: string;
  email: string;
  status: ProfileStatus;
  role: ProfileRole;
  created_at: string;
  approved_at: string | null;
  approved_by: string | null;
};

export type AuthState =
  | {
      isConfigured: false;
      user: null;
      profile: null;
      status: null;
    }
  | {
      isConfigured: true;
      user: { id: string; email: string | null };
      profile: UserProfile | null;
      status: ProfileStatus;
    }
  | {
      isConfigured: true;
      user: null;
      profile: null;
      status: null;
    };

export const getAuthState = cache(async (): Promise<AuthState> => {
  if (!isSupabaseConfigured()) {
    return {
      isConfigured: false,
      user: null,
      profile: null,
      status: null,
    };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      isConfigured: true,
      user: null,
      profile: null,
      status: null,
    };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, status, role, created_at, approved_at, approved_by")
    .eq("id", user.id)
    .maybeSingle<UserProfile>();

  const normalizedProfile =
    profile ??
    ({
      id: user.id,
      email: user.email ?? "",
      status: "pending",
      role: "client",
      created_at: new Date(0).toISOString(),
      approved_at: null,
      approved_by: null,
    } satisfies UserProfile);

  return {
    isConfigured: true,
    user: {
      id: user.id,
      email: user.email ?? null,
    },
    profile: normalizedProfile,
    status: normalizedProfile.status,
  };
});

export function getDefaultRedirectByStatus(status: ProfileStatus) {
  switch (status) {
    case "approved":
      return "/insights";
    case "disabled":
      return "/disabled";
    case "pending":
    default:
      return "/pending";
  }
}
