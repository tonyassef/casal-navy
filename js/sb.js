// Cliente minimo do Supabase via REST (sem dependencias externas).
// Usa: Auth (signup/signin) + PostgREST (tabelas). A anon key e publica
// por desenho e fica protegida pelas policies RLS do schema.sql.
// Projeto padrao do Casal Navy (pre-configurado; pode ser trocado na tela Conta).
const DEFAULT_SB = {
  url: 'https://rbumnmyeahjtjxeyrnry.supabase.co',
  key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJidW1ubXllYWhqdGp4ZXlybnJ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAwNDc2ODAsImV4cCI6MjEwNTYyMzY4MH0.Zm-UJKt2Lpqgb6-xevMKCO47qBijGKQ2TXBr69dtIQM',
};
const SB = {
  url: null, key: null, token: null, refreshToken: null, user: null,

  configure(url, key) {
    this.url = (url || '').replace(/\/+$/, '');
    this.key = (key || '').trim();
    this.token = null; this.user = null;
  },
  get ready() { return !!(this.url && this.key); },

  async _auth(path, body, authed) {
    const headers = { 'apikey': this.key, 'Content-Type': 'application/json' };
    if (authed && this.token) headers['Authorization'] = 'Bearer ' + this.token;
    const r = await fetch(this.url + '/auth/v1' + path, {
      method: 'POST', headers, body: body ? JSON.stringify(body) : undefined,
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.msg || data.error_description || data.error || ('HTTP ' + r.status));
    return data;
  },

  async signUp(email, password, name) {
    const data = await this._auth('/signup', { email, password, data: { name } });
    // com "confirm email" desligado, ja volta sessao; se nao, pede login
    if (data.access_token) this._setSession(data);
    return data;
  },
  async signIn(email, password) {
    const data = await this._auth('/token?grant_type=password', { email, password });
    this._setSession(data);
    return data;
  },
  async signOut() {
    try { await this._auth('/logout', {}, true); } catch (e) { /* ignora */ }
    this.token = null; this.refreshToken = null; this.user = null;
  },
  _setSession(data) {
    this.token = data.access_token;
    this.refreshToken = data.refresh_token;
    this.user = data.user || null;
  },
  async getUser() {
    const r = await fetch(this.url + '/auth/v1/user', {
      headers: { 'apikey': this.key, 'Authorization': 'Bearer ' + this.token },
    });
    if (!r.ok) throw new Error('sessao invalida');
    this.user = await r.json();
    return this.user;
  },
  async refresh() {
    if (!this.refreshToken) return false;
    try {
      const data = await this._auth('/token?grant_type=refresh_token', { refresh_token: this.refreshToken });
      this._setSession(data);
      return true;
    } catch (e) { return false; }
  },

  // ---- PostgREST ----
  async _rest(method, table, query, body) {
    const headers = {
      'apikey': this.key,
      'Authorization': 'Bearer ' + this.token,
      'Content-Type': 'application/json',
      'Prefer': method === 'POST' ? 'return=representation' : undefined,
    };
    Object.keys(headers).forEach(k => headers[k] === undefined && delete headers[k]);
    const r = await fetch(this.url + '/rest/v1/' + table + (query || ''), {
      method, headers, body: body ? JSON.stringify(body) : undefined,
    });
    if (r.status === 401 && await this.refresh()) return this._rest(method, table, query, body);
    const text = await r.text();
    const data = text ? JSON.parse(text) : null;
    if (!r.ok) throw new Error((data && (data.message || data.msg)) || ('HTTP ' + r.status));
    return data;
  },
  sel(table, query) { return this._rest('GET', table, query); },
  ins(table, row) { return this._rest('POST', table, '', row); },
  upd(table, query, patch) { return this._rest('PATCH', table, query, patch); },
  del(table, query) { return this._rest('DELETE', table, query); },
};
