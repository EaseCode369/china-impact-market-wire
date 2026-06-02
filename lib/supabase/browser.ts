"use client";

import { createBrowserClient } from "@supabase/ssr";

import { assertSupabaseConfigured } from "@/lib/supabase/config";

export function createSupabaseBrowserClient() {
  const { url, anonKey } = assertSupabaseConfigured();
  return createBrowserClient(url, anonKey);
}
