// Cliente minimo do Supabase via REST (sem dependencias externas).
// Usa: Auth (signup/signin) + PostgREST (tabelas). A anon key e publica
// por desenho e fica protegida pelas policies RLS do schema.sql.
// Projeto padrao do Casal Navy (pre-configurado; pode ser trocado na tela Conta).
const DEFAULT_SB = {
  url: 'https://rbumnmyeahjtjxeyrnry.supabase.co',
  key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJidW1ubXllYWhqdGp4ZXlybnJ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAwNDc2ODAsImV4cCI6MjEwNTYyMzY4MH0.Zm-UJKt2Lpqgb6-xevMKCO47qBijGKQ2TXBr69dtIQM',
};
// Timeout duro em TODA chamada de rede: sem isso, rede "zumbi" (sinal fraco,
// portal cativo, DNS morto) pendura o fetch por minutos e o app nem abre nem
// salva. Com o abort, o erro vira "abort/timeout" e as camadas de cima caem
// pro cache local/fila offline como ja fazem com qualquer erro de rede.
const SB_TIMEOUT_MS = 8000;
async function fetchT(url, opts, ms) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms || SB_TIMEOUT_MS);
  try { return await fetch(url, Object.assign({}, opts, { signal: ctrl.signal })); }
  finally { clearTimeout(t); }
}
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
    const r = await fetchT(this.url + '/auth/v1' + path, {
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
  // link mágico de login/cadastro: quem abre o link no e-mail entra direto.
  // Não mexe na sessão atual de quem envia — serve pra convidar amigo.
  async otp(email, redirectTo) {
    const body = { email, create_user: true };
    if (redirectTo) body.options = { emailRedirectTo: redirectTo };
    await this._auth('/otp', body, false);
    return true;
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
    const r = await fetchT(this.url + '/auth/v1/user', {
      headers: { 'apikey': this.key, 'Authorization': 'Bearer ' + this.token },
    });
    if (!r.ok) throw new Error('sessao invalida');
    this.user = await r.json();
    return this.user;
  },
  // 'ok' = renovou; 'invalid' = o servidor RECUSOU o refresh token (sessão
  // morta: token rotacionado por outro login ou expirado — só login novo
  // resolve); 'error' = rede/servidor instável (não dá pra concluir nada —
  // nunca deslogar por isso).
  // ATENÇÃO: status 400/401/403 SOZINHO não prova sessão morta — portal
  // cativo de wifi (academia!), proxy ou DNS respondem 401/403 com página
  // HTML no lugar do Supabase. 'invalid' exige o corpo de erro de auth do
  // próprio GoTrue (JSON com invalid_grant / refresh_token_not_found /
  // campo `code` de auth); sem esse corpo, é 'error' (rede).
  _authGrantError(data) {
    if (!data || typeof data !== 'object') return false;
    const ec = String(data.error_code || '');
    if (ec === 'invalid_grant' || ec === 'refresh_token_not_found' || ec === 'refresh_token_already_used') return true;
    if (String(data.error || '') === 'invalid_grant') return true;
    const desc = String(data.error_description || data.msg || data.message || '');
    if (/invalid[_\s]grant|refresh[_\s]token/i.test(desc) && (ec || data.error || typeof data.code === 'number')) return true;
    return false;
  },
  async refreshWithStatus() {
    if (!this.refreshToken) return 'invalid';
    let r;
    try {
      r = await fetchT(this.url + '/auth/v1/token?grant_type=refresh_token', {
        method: 'POST',
        headers: { 'apikey': this.key, 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: this.refreshToken }),
      });
    } catch (e) { return 'error'; }
    let data = null;
    try { data = await r.json(); } catch (e) { data = null; } // HTML de portal cativo não é JSON
    if (r.ok && data && data.access_token) { this._setSession(data); return 'ok'; }
    if ((r.status === 400 || r.status === 401 || r.status === 403) && this._authGrantError(data)) return 'invalid';
    return 'error';
  },
  async refresh() { return (await this.refreshWithStatus()) === 'ok'; },

  // ---- PostgREST ----
  async _rest(method, table, query, body, prefer) {
    const headers = {
      'apikey': this.key,
      'Authorization': 'Bearer ' + this.token,
      'Content-Type': 'application/json',
      'Prefer': prefer || (method === 'POST' ? 'return=representation' : undefined),
    };
    Object.keys(headers).forEach(k => headers[k] === undefined && delete headers[k]);
    const r = await fetchT(this.url + '/rest/v1/' + table + (query || ''), {
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
  // ---------- Storage: mídia dos recados (bucket privado recado-media) ----------
  async storageUpload(path, blob, contentType) {
    return this.storageUploadTo('recado-media', path, blob, contentType);
  },
  async storageUploadTo(bucket, path, blob, contentType) {
    const r = await fetchT(this.url + '/storage/v1/object/' + bucket + '/' + path, {
      method: 'POST',
      headers: {
        'apikey': this.key,
        'Authorization': 'Bearer ' + this.token,
        'Content-Type': contentType || (blob && blob.type) || 'application/octet-stream',
      },
      body: blob,
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.message || data.error || ('HTTP ' + r.status));
    return data;
  },
  storagePublicUrl(bucket, path) {
    return this.url + '/storage/v1/object/public/' + bucket + '/' + path;
  },
  async storageDownload(path) {
    const r = await fetchT(this.url + '/storage/v1/object/recado-media/' + path, {
      headers: { 'apikey': this.key, 'Authorization': 'Bearer ' + this.token },
    });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return await r.blob();
  },
  async storageRemove(path) {
    const r = await fetchT(this.url + '/storage/v1/object/recado-media/' + path, {
      method: 'DELETE',
      headers: { 'apikey': this.key, 'Authorization': 'Bearer ' + this.token },
    });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return true;
  },
  upsert(table, row, onConflict) {
    return this._rest('POST', table, '?on_conflict=' + encodeURIComponent(onConflict), row,
      'return=representation,resolution=merge-duplicates');
  },
  upd(table, query, patch) { return this._rest('PATCH', table, query, patch); },
  del(table, query) { return this._rest('DELETE', table, query); },
};
