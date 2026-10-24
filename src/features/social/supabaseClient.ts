import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let cached: SupabaseClient | null = null;

/** P2B：Supabase 是否已設定（env 有值才算） */
export function isSocialConfigured(): boolean {
  return !!(
    import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY
  );
}

/** 取得 Supabase client；未設定 env 時回 null（社交功能整體關閉） */
export function getSupabase(): SupabaseClient | null {
  if (!isSocialConfigured()) return null;
  if (!cached) {
    cached = createClient(
      import.meta.env.VITE_SUPABASE_URL as string,
      import.meta.env.VITE_SUPABASE_ANON_KEY as string,
      { auth: { persistSession: true, autoRefreshToken: true } },
    );
  }
  return cached;
}

/** 匿名登入（無感帳號）；回傳 user id，失敗回 null */
export async function ensureAnonymousAuth(): Promise<string | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data: sessionData } = await sb.auth.getSession();
  if (sessionData.session?.user) return sessionData.session.user.id;
  const { data, error } = await sb.auth.signInAnonymously();
  if (error || !data.user) {
    console.error('[social] anonymous sign-in failed', error);
    return null;
  }
  return data.user.id;
}
