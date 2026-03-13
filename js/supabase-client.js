// ══════════════════════════════════════════════════════════════════════════════
// LOCMASTER AI STUDIO — Supabase Client
// ══════════════════════════════════════════════════════════════════════════════

window.SupabaseClient = (function () {
  let _client = null;

  function init(url, anonKey) {
    if (typeof supabase !== 'undefined' && url && anonKey) {
      _client = supabase.createClient(url, anonKey);
    }
    return _client;
  }

  function getClient() { return _client; }

  return { init, getClient };
})();
