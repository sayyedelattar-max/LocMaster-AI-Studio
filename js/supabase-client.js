// ── Supabase Client Wrapper ───────────────────────────────────────
// Wraps the Supabase JS SDK; other modules call SupabaseClient.getClient().

window.SupabaseClient = (function() {
  let _client = null;

  return {
    /** Initialise the Supabase client using window.SUPABASE_URL / SUPABASE_ANON_KEY. */
    init() {
      if (_client) return _client;
      const url = window.SUPABASE_URL;
      const key = window.SUPABASE_ANON_KEY;
      if (url && key && window.supabase) {
        _client = window.supabase.createClient(url, key);
      }
      return _client;
    },

    /** Returns the initialised client, or null if credentials are not set. */
    getClient() {
      return _client || this.init();
    }
  };
})();
