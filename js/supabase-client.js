// ══════════════════════════════════════════════════════════════
// js/supabase-client.js  — LocMaster AI Studio
// Initialises Supabase if credentials are configured; otherwise
// provides a no-op stub so demo mode works without a Supabase
// project.
// ══════════════════════════════════════════════════════════════

(function () {
  const SUPABASE_URL = localStorage.getItem('lm_supabase_url') || '';
  const SUPABASE_KEY = localStorage.getItem('lm_supabase_anon_key') || '';

  if (SUPABASE_URL && SUPABASE_KEY && window.supabase) {
    try {
      window.SupabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    } catch (e) {
      console.warn('Supabase init failed:', e.message);
      window.SupabaseClient = null;
    }
  } else {
    window.SupabaseClient = null;
  }
})();
