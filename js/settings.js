// ══════════════════════════════════════════════════════════════════════════════
// LOCMASTER AI STUDIO — Settings Manager
// ══════════════════════════════════════════════════════════════════════════════

window.Settings = {
  init() {
    this._loadProviderFields();
  },

  saveProviderKey(provider, key) {
    localStorage.setItem('lm_key_' + provider, key.trim());
    if (window.AppState) AppState.notify(`${LMConfig.providers[provider]?.name || provider} key saved`, 'success');
  },

  getProviderKey(provider) {
    return localStorage.getItem('lm_key_' + provider) || '';
  },

  clearProviderKey(provider) {
    localStorage.removeItem('lm_key_' + provider);
    if (window.AppState) AppState.notify('Key cleared', 'info');
  },

  _loadProviderFields() {
    Object.keys(LMConfig.providers || {}).forEach(p => {
      const inp = document.getElementById('key-' + p);
      if (inp) inp.value = this.getProviderKey(p);
    });
  },

  saveAll() {
    Object.keys(LMConfig.providers || {}).forEach(p => {
      const inp = document.getElementById('key-' + p);
      if (inp && inp.value.trim()) this.saveProviderKey(p, inp.value);
    });
    if (window.AppState) AppState.notify('Settings saved', 'success');
  },
};
