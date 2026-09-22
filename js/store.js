// Store: abstrai "local" (localStorage) e "nuvem" (Supabase).
// A conta e sempre real: local = usuario+senha no aparelho;
// nuvem = Supabase Auth com sincronizacao entre aparelhos.
const Store = {
  mode: 'local',          // 'local' | 'cloud'
  user: null,             // {id, name, email}
  cfg: { url: '', key: '' },

  _ls(k, v) {
    if (v === undefined) {
      try { return JSON.parse(localStorage.getItem('casalnavy.' + k)); } catch (e) { return null; }
    }
    localStorage.setItem('casalnavy.' + k, JSON.stringify(v));
  },

  async sha(str) {
    const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('tny$' + str));
    return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
  },
  uid() { return 'u' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); },

  // ---------- sessao ----------
  async boot() {
    const cfg = this._ls('sbconfig') || DEFAULT_SB;
    if (cfg && cfg.url && cfg.key) { this.cfg = cfg; SB.configure(cfg.url, cfg.key); }
    const sess = this._ls('session');
    if (!sess) return false;
    if (sess.mode === 'cloud' && SB.ready) {
      this.mode = 'cloud';
      SB.token = sess.token; SB.refreshToken = sess.refreshToken;
      try {
        // valida/renova a sessao
        const ok = await SB.refresh();
        if (!ok && !SB.token) throw new Error('sessao expirada');
        if (!SB.user) await SB.getUser();
        if (!SB.user) throw new Error('sessao expirada');
        this.user = { id: sess.userId, name: sess.name, email: sess.email };
        this._ls('session', { mode: 'cloud', userId: this.user.id, name: this.user.name, email: this.user.email, token: SB.token, refreshToken: SB.refreshToken });
        return true;
      } catch (e) { this.signOut(); return false; }
    }
    if (sess.mode === 'local') {
      const users = this._ls('users') || [];
      const u = users.find(x => x.id === sess.userId);
      if (!u) return false;
      this.mode = 'local';
      this.user = { id: u.id, name: u.name, email: u.email };
      return true;
    }
    return false;
  },

  async signUp(name, email, password) {
    email = email.trim().toLowerCase(); name = name.trim();
    if (!name || !email || !password || password.length < 4) throw new Error('Preencha nome, e-mail e senha (min. 4 letras).');
    if (this.cfg.url && this.cfg.key) {
      SB.configure(this.cfg.url, this.cfg.key);
      await SB.signUp(email, password, name);
      // garante que existe sessao (quando confirmacao de e-mail esta ativa, faz login em seguida)
      if (!SB.token) await SB.signIn(email, password);
      const uid = SB.user.id;
      try { await SB.ins('profiles', { id: uid, name, meta: { rotation_index: 0 } }); } catch (e) { /* ja existe */ }
      await SB.ins('plans', { user_id: uid, name: 'Rotação A/B/C', days: PLAN_3DAY, active: true });
      this.mode = 'cloud'; this.user = { id: uid, name, email };
    } else {
      const users = this._ls('users') || [];
      if (users.some(x => x.email === email)) throw new Error('Este e-mail já tem conta neste aparelho.');
      const id = this.uid();
      users.push({ id, name, email, pass: await this.sha(password) });
      this._ls('users', users);
      this._ls('data.' + id, { plan: { name: 'Rotação A/B/C', days: PLAN_3DAY }, logs: [], meta: { rotation_index: 0 } });
      this.mode = 'local'; this.user = { id, name, email };
    }
    this._persistSession();
    return this.user;
  },

  async signIn(email, password) {
    email = email.trim().toLowerCase();
    if (this.cfg.url && this.cfg.key) {
      SB.configure(this.cfg.url, this.cfg.key);
      await SB.signIn(email, password);
      const uid = SB.user.id;
      let prof = await SB.sel('profiles', '?id=eq.' + uid + '&select=id,name,meta');
      if (!prof || !prof.length) {
        const nm = (SB.user.user_metadata && SB.user.user_metadata.name) || email.split('@')[0];
        await SB.ins('profiles', { id: uid, name: nm, meta: { rotation_index: 0 } });
        await SB.ins('plans', { user_id: uid, name: 'Rotação A/B/C', days: PLAN_3DAY, active: true });
        prof = [{ id: uid, name: nm }];
      }
      this.mode = 'cloud'; this.user = { id: uid, name: prof[0].name, email };
    } else {
      const users = this._ls('users') || [];
      const u = users.find(x => x.email === email);
      if (!u || u.pass !== await this.sha(password)) throw new Error('E-mail ou senha inválidos.');
      this.mode = 'local'; this.user = { id: u.id, name: u.name, email: u.email };
    }
    this._persistSession();
    return this.user;
  },

  _persistSession() {
    this._ls('session', this.mode === 'cloud'
      ? { mode: 'cloud', userId: this.user.id, name: this.user.name, email: this.user.email, token: SB.token, refreshToken: SB.refreshToken }
      : { mode: 'local', userId: this.user.id });
  },

  async signOut() {
    if (this.mode === 'cloud') { try { await SB.signOut(); } catch (e) {} }
    localStorage.removeItem('casalnavy.session');
    this.user = null; this.mode = 'local';
  },

  // ---------- dados ----------
  _data() { return this._ls('data.' + this.user.id) || { plan: null, logs: [], meta: { rotation_index: 0 } }; },
  _saveData(d) { this._ls('data.' + this.user.id, d); },

  async getPlan() {
    if (this.mode === 'cloud') {
      const rows = await SB.sel('plans', '?user_id=eq.' + this.user.id + '&active=eq.true&select=id,name,days&limit=1');
      if (rows && rows.length) return { id: rows[0].id, name: rows[0].name, days: rows[0].days };
      const ins = await SB.ins('plans', { user_id: this.user.id, name: 'Rotação A/B/C', days: PLAN_3DAY, active: true });
      return { id: ins[0].id, name: ins[0].name, days: ins[0].days };
    }
    const d = this._data();
    if (!d.plan) { d.plan = { name: 'Rotação A/B/C', days: PLAN_3DAY }; this._saveData(d); }
    return d.plan;
  },

  async savePlan(plan) {
    if (this.mode === 'cloud') {
      const cur = await this.getPlan();
      await SB.upd('plans', '?id=eq.' + cur.id, { name: plan.name, days: plan.days, updated_at: new Date().toISOString() });
    } else { const d = this._data(); d.plan = plan; this._saveData(d); }
  },

  async getLogs() {
    if (this.mode === 'cloud') {
      return await SB.sel('workout_logs', '?user_id=eq.' + this.user.id + '&select=id,log_date,day_label,entries,notes,created_at&order=log_date.desc,created_at.desc&limit=2000');
    }
    return (this._data().logs || []).slice().sort((a, b) => (b.log_date || '').localeCompare(a.log_date || ''));
  },

  async saveLog(log) {
    const row = { user_id: this.user.id, log_date: log.log_date, day_label: log.day_label, entries: log.entries, notes: log.notes || '' };
    if (this.mode === 'cloud') {
      if (log.id) { await SB.upd('workout_logs', '?id=eq.' + log.id, row); return log.id; }
      const ins = await SB.ins('workout_logs', row);
      return ins[0].id;
    }
    const d = this._data(); d.logs = d.logs || [];
    if (log.id) { const i = d.logs.findIndex(x => x.id === log.id); if (i >= 0) d.logs[i] = log; }
    else { log.id = this.uid(); log.created_at = new Date().toISOString(); d.logs.push(log); }
    this._saveData(d);
    return log.id;
  },

  async deleteLog(id) {
    if (this.mode === 'cloud') { await SB.del('workout_logs', '?id=eq.' + id); return; }
    const d = this._data(); d.logs = (d.logs || []).filter(x => x.id !== id); this._saveData(d);
  },

  async getMeta() {
    if (this.mode === 'cloud') {
      const r = await SB.sel('profiles', '?id=eq.' + this.user.id + '&select=meta&limit=1');
      return (r && r[0] && r[0].meta) || { rotation_index: 0 };
    }
    return this._data().meta || { rotation_index: 0 };
  },
  async saveMeta(meta) {
    if (this.mode === 'cloud') { await SB.upd('profiles', '?id=eq.' + this.user.id, { meta }); return; }
    const d = this._data(); d.meta = meta; this._saveData(d);
  },

  saveSbConfig(url, key) {
    this.cfg = { url: url.trim().replace(/\/+$/, ''), key: key.trim() };
    this._ls('sbconfig', this.cfg);
    SB.configure(this.cfg.url, this.cfg.key);
  },
};
