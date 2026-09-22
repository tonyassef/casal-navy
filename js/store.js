// Store: abstrai "local" (localStorage) e "nuvem" (Supabase).
// A conta e sempre real: local = usuario+senha no aparelho;
// nuvem = Supabase Auth com sincronizacao entre aparelhos.

// Chave publica VAPID (push notifications). A privada fica no servidor (Edge Function).
const VAPID_PUBLIC = 'BP-GdgwLWLXepDtU9g1OvQ_osVvgTuwHfrIUy6nladzWrsZKUEe1SE8slnY9FjIm6iyK8ESX4mxYuV7sPgLh86Q';
function b64ToU8(s) {
  const p = '='.repeat((4 - (s.length % 4)) % 4);
  const b = (s + p).replace(/-/g, '+').replace(/_/g, '/');
  const r = atob(b); const o = new Uint8Array(r.length);
  for (let i = 0; i < r.length; i++) o[i] = r.charCodeAt(i);
  return o;
}

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
      const netErr = (e) => {
        if (typeof navigator !== 'undefined' && navigator.onLine === false) return true;
        return /failed to fetch|networkerror|network request failed|load failed|timed out|timeout|abort/i.test((e && e.message) || '');
      };
      const enterCached = () => {
        // falha de rede: entra com os dados em cache em vez de deslogar; sincroniza depois
        this.user = { id: sess.userId, name: sess.name, email: sess.email };
        return true;
      };
      try {
        // valida o token atual; se vencido tenta renovar; falha de rede nao desloga
        try { await SB.getUser(); }
        catch (e) {
          if (netErr(e)) return enterCached();
          const ok = await SB.refresh().catch(() => false);
          if (!ok) throw new Error('sessao expirada');
          await SB.getUser();
        }
        if (!SB.user) throw new Error('sessao expirada');
        this.user = { id: sess.userId, name: sess.name, email: sess.email };
        this._persistSession();
        this._rememberSession();
        return true;
      } catch (e) {
        if (netErr(e) && sess.userId) return enterCached();
        const r = await this.signOut();
        return r === 'switched';
      }
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
      await SB.ins('plans', { user_id: uid, name: 'Rotação A–F', days: PLAN_6DAY, active: true });
      this.mode = 'cloud'; this.user = { id: uid, name, email };
    } else {
      const users = this._ls('users') || [];
      if (users.some(x => x.email === email)) throw new Error('Este e-mail já tem conta neste aparelho.');
      const id = this.uid();
      users.push({ id, name, email, pass: await this.sha(password) });
      this._ls('users', users);
      this._ls('data.' + id, { plan: { name: 'Rotação A–F', days: PLAN_6DAY }, logs: [], meta: { rotation_index: 0 } });
      this.mode = 'local'; this.user = { id, name, email };
    }
    this._persistSession();
    this._rememberSession();
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
        await SB.ins('plans', { user_id: uid, name: 'Rotação A–F', days: PLAN_6DAY, active: true });
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
    this._rememberSession();
    return this.user;
  },

  _persistSession() {
    this._ls('session', this.mode === 'cloud'
      ? { mode: 'cloud', userId: this.user.id, name: this.user.name, email: this.user.email, token: SB.token, refreshToken: SB.refreshToken }
      : { mode: 'local', userId: this.user.id });
  },

  // ---------- perfis: varias contas neste aparelho (ex: Tony e Eliza) ----------
  // Cada perfil mantem sua propria conta/sessao; trocar de perfil = trocar o
  // token ativo. Os dados continuam separados por conta (RLS), sem DDL novo.
  _savedSessions() { try { return JSON.parse(localStorage.getItem('casalnavy.sessions')) || []; } catch (e) { return []; } },
  _setSavedSessions(s) { try { localStorage.setItem('casalnavy.sessions', JSON.stringify(s)); } catch (e) {} },
  _rememberSession() {
    if (!this.user) return;
    const cur = this.mode === 'cloud'
      ? { mode: 'cloud', userId: this.user.id, name: this.user.name, email: this.user.email, token: SB.token, refreshToken: SB.refreshToken }
      : { mode: 'local', userId: this.user.id, name: this.user.name, email: this.user.email };
    const rest = this._savedSessions().filter(x => x.userId !== this.user.id);
    rest.unshift(cur);
    this._setSavedSessions(rest);
  },
  async switchProfile(userId) {
    const t = this._savedSessions().find(x => x.userId === userId);
    if (!t) throw new Error('Perfil não encontrado.');
    if (t.mode === 'cloud') {
      SB.token = t.token || null; SB.refreshToken = t.refreshToken || null; SB.user = null;
      try {
        const ok = await SB.refresh();
        if (!ok && !SB.token) throw new Error('sessao expirada');
        if (!SB.user) await SB.getUser();
        if (!SB.user) throw new Error('sessao expirada');
      } catch (e) {
        const off = typeof navigator !== 'undefined' && navigator.onLine === false;
        if (!off) {
          this._setSavedSessions(this._savedSessions().filter(x => x.userId !== userId));
          throw new Error('Sessão expirada. Entre de novo neste perfil.');
        }
      }
      this.mode = 'cloud';
      this.user = { id: t.userId, name: t.name, email: t.email };
      try {
        const p = await SB.sel('profiles', '?id=eq.' + t.userId + '&select=name&limit=1');
        if (p && p[0] && p[0].name) this.user.name = p[0].name;
      } catch (e) {}
    } else {
      const users = this._ls('users') || [];
      const u = users.find(x => x.id === t.userId);
      if (!u) {
        this._setSavedSessions(this._savedSessions().filter(x => x.userId !== userId));
        throw new Error('Perfil não encontrado neste aparelho.');
      }
      this.mode = 'local';
      this.user = { id: u.id, name: u.name, email: u.email };
    }
    this._persistSession();
    this._rememberSession();
    return this.user;
  },
  removeProfile(userId) {
    this._setSavedSessions(this._savedSessions().filter(x => x.userId !== userId));
  },

  async signOut() {
    const curId = this.user && this.user.id;
    if (this.mode === 'cloud') { try { await SB.signOut(); } catch (e) {} }
    if (curId) this._setSavedSessions(this._savedSessions().filter(x => x.userId !== curId));
    localStorage.removeItem('casalnavy.session');
    this.user = null; this.mode = 'local';
    const rest = this._savedSessions();
    if (rest.length) {
      try { await this.switchProfile(rest[0].userId); return 'switched'; } catch (e) {}
    }
    return 'logged-out';
  },

  // ---------- offline: fila de sincronizacao + cache local (modo nuvem) ----------
  // Sem internet, as escritas vao para uma fila (outbox) e os dados sao lidos
  // de um cache local. Quando o sinal volta, syncNow() envia tudo sozinho.
  offlineWrite: false,
  _offlineQueue() { try { return JSON.parse(localStorage.getItem('casalnavy.outbox')) || []; } catch (e) { return []; } },
  _setOutbox(q) { try { localStorage.setItem('casalnavy.outbox', JSON.stringify(q)); } catch (e) {} },
  _queueOp(op) { const q = this._offlineQueue(); q.push(Object.assign({ _ts: Date.now() }, op)); this._setOutbox(q); },
  _cache() { try { return JSON.parse(localStorage.getItem('casalnavy.cache.' + (this.user && this.user.id))) || null; } catch (e) { return null; } },
  _setCache(c) { try { localStorage.setItem('casalnavy.cache.' + this.user.id, JSON.stringify(c)); } catch (e) {} },
  // decide se um erro de rede deve ir para a fila (erro de HTTP real = problema de verdade, nao fila)
  _queueable(e) {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return true;
    return !(e && e.message && /^HTTP \d+/.test(e.message));
  },

  async syncNow() {
    if (this.mode !== 'cloud' || !this.user) return { n: 0, pending: 0 };
    const q = this._offlineQueue();
    if (!q.length) return { n: 0, pending: 0 };
    const remaining = [];
    let done = 0;
    for (const op of q) {
      try {
        if (op.t === 'plan') {
          const cur = await SB.sel('plans', '?user_id=eq.' + this.user.id + '&active=eq.true&select=id&limit=1');
          const patch = { name: op.plan.name, days: op.plan.days, updated_at: new Date().toISOString() };
          if (cur && cur.length) await SB.upd('plans', '?id=eq.' + cur[0].id, patch);
          else await SB.ins('plans', Object.assign({ user_id: this.user.id, active: true }, patch));
        } else if (op.t === 'log') {
          const ex = await SB.sel('workout_logs', '?user_id=eq.' + this.user.id + '&log_date=eq.' + op.log.log_date + '&select=id&limit=1');
          const row = { user_id: this.user.id, log_date: op.log.log_date, day_label: op.log.day_label, entries: op.log.entries, notes: op.log.notes || '' };
          if (ex && ex.length) await SB.upd('workout_logs', '?id=eq.' + ex[0].id, row);
          else await SB.ins('workout_logs', row);
        } else if (op.t === 'dellog') {
          const ex = await SB.sel('workout_logs', '?user_id=eq.' + this.user.id + '&log_date=eq.' + op.log_date + '&select=id&limit=1');
          if (ex && ex.length) await SB.del('workout_logs', '?id=eq.' + ex[0].id);
        } else if (op.t === 'meta') {
          await SB.upd('profiles', '?id=eq.' + this.user.id, { meta: op.meta });
        } else { continue; }
        done++;
      } catch (e) { remaining.push(op); break; }
    }
    this._setOutbox(remaining);
    try { await this.getPlan(); await this.getLogs(); await this.getMeta(); } catch (e) {}
    return { n: done, pending: remaining.length };
  },

  // ---------- dados ----------
  _data() { return this._ls('data.' + this.user.id) || { plan: null, logs: [], meta: { rotation_index: 0 } }; },
  _saveData(d) { this._ls('data.' + this.user.id, d); },

  // Assinatura do plano salvo: identifica o template padrão antigo (antes da
  // correção de 22/09/2026). Só migra se for idêntico ao template antigo —
  // plano personalizado pelo usuário nunca é tocado.
  _planSig(pl) {
    try {
      return JSON.stringify((pl.days || []).map(d => ({
        day: d.day, m: d.muscle,
        ex: (d.exercises || []).map(e => [e.nameA, e.nameB, e.sets, e.reps, e.technique])
      })));
    } catch (e) { return ''; }
  },
  _isOldTemplate(pl) {
    return pl && pl.name === 'Rotação A–F' && pl.days && pl.days.length === 6 && this._planSig(pl) === PLAN_6DAY_SIG_V1;
  },
  _isOld3DayTemplate(pl) {
    return pl && pl.name === 'Rotação A/B/C' && pl.days && pl.days.length === 3 && this._planSig(pl) === PLAN_3DAY_SIG_V1;
  },
  _freshPlan() { return { name: 'Rotação A–F', days: JSON.parse(JSON.stringify(PLAN_6DAY)) }; },

  async getPlan() {
    if (this.mode === 'cloud') {
      try {
        const rows = await SB.sel('plans', '?user_id=eq.' + this.user.id + '&active=eq.true&select=id,name,days&limit=1');
        let pl;
        if (rows && rows.length) {
          pl = { id: rows[0].id, name: rows[0].name, days: rows[0].days };
          if (this._isOld3DayTemplate(pl)) {
            await SB.upd('plans', '?id=eq.' + pl.id, { name: 'Rotação A–F', days: PLAN_6DAY, updated_at: new Date().toISOString() });
            pl = { id: pl.id, name: 'Rotação A–F', days: PLAN_6DAY };
          } else if (this._isOldTemplate(pl)) {
            // template padrão antigo (exercícios incorretos) → substitui pelo corrigido
            const fresh = this._freshPlan();
            await SB.upd('plans', '?id=eq.' + pl.id, { days: fresh.days, updated_at: new Date().toISOString() });
            pl = { id: pl.id, name: pl.name, days: fresh.days };
          }
        } else {
          const ins = await SB.ins('plans', { user_id: this.user.id, name: 'Rotação A–F', days: PLAN_6DAY, active: true });
          pl = { id: ins[0].id, name: ins[0].name, days: ins[0].days };
        }
        this._setCache(Object.assign(this._cache() || {}, { plan: pl }));
        return pl;
      } catch (e) {
        if (!this._queueable(e)) throw e;
        const c = this._cache();
        if (c && c.plan) return c.plan;
        return { name: 'Rotação A–F', days: PLAN_6DAY };
      }
    }
    const d = this._data();
    if (!d.plan) { d.plan = { name: 'Rotação A–F', days: PLAN_6DAY }; this._saveData(d); }
    else if (this._isOld3DayTemplate(d.plan)) {
      d.plan = { name: 'Rotação A–F', days: PLAN_6DAY }; this._saveData(d);
    }
    else if (this._isOldTemplate(d.plan)) {
      d.plan = this._freshPlan(); this._saveData(d);
    }
    return d.plan;
  },

  async savePlan(plan) {
    if (this.mode === 'cloud') {
      try {
        const cur = await this.getPlan();
        if (!cur.id) throw new Error('offline');
        await SB.upd('plans', '?id=eq.' + cur.id, { name: plan.name, days: plan.days, updated_at: new Date().toISOString() });
        const c = this._cache() || {};
        c.plan = { id: cur.id, name: plan.name, days: plan.days };
        this._setCache(c);
      } catch (e) {
        if (!this._queueable(e)) throw e;
        const c = this._cache() || {};
        c.plan = { name: plan.name, days: plan.days };
        this._setCache(c);
        this._queueOp({ t: 'plan', plan: { name: plan.name, days: plan.days } });
        this.offlineWrite = true;
      }
      return;
    }
    const d = this._data(); d.plan = plan; this._saveData(d);
  },

  async getLogs() {
    if (this.mode === 'cloud') {
      try {
        const rows = await SB.sel('workout_logs', '?user_id=eq.' + this.user.id + '&select=id,log_date,day_label,entries,notes,created_at&order=log_date.desc,created_at.desc&limit=2000');
        this._setCache(Object.assign(this._cache() || {}, { logs: rows }));
        return rows;
      } catch (e) {
        if (!this._queueable(e)) throw e;
        const c = this._cache();
        return ((c && c.logs) || []).slice().sort((a, b) => (b.log_date || '').localeCompare(a.log_date || ''));
      }
    }
    return (this._data().logs || []).slice().sort((a, b) => (b.log_date || '').localeCompare(a.log_date || ''));
  },

  async saveLog(log) {
    const row = { user_id: this.user.id, log_date: log.log_date, day_label: log.day_label, entries: log.entries, notes: log.notes || '' };
    if (this.mode === 'cloud') {
      try {
        let id = log.id;
        if (id && !String(id).startsWith('off_')) {
          await SB.upd('workout_logs', '?id=eq.' + id, row);
        } else {
          // evita duplicar: se ja existe log nesta data, atualiza
          const ex = await SB.sel('workout_logs', '?user_id=eq.' + this.user.id + '&log_date=eq.' + log.log_date + '&select=id&limit=1');
          if (ex && ex.length) { id = ex[0].id; await SB.upd('workout_logs', '?id=eq.' + id, row); }
          else { const ins = await SB.ins('workout_logs', row); id = ins[0].id; }
        }
        const c = this._cache() || {}; const logs = c.logs || [];
        const full = Object.assign({}, log, { id });
        const i = logs.findIndex(x => x.log_date === log.log_date);
        if (i >= 0) logs[i] = full; else logs.unshift(full);
        c.logs = logs; this._setCache(c);
        return id;
      } catch (e) {
        if (!this._queueable(e)) throw e;
        const c = this._cache() || {}; const logs = c.logs || [];
        if (!log.id) log.id = 'off_' + Date.now().toString(36);
        log.created_at = log.created_at || new Date().toISOString();
        const i = logs.findIndex(x => x.log_date === log.log_date);
        if (i >= 0) logs[i] = log; else logs.unshift(log);
        c.logs = logs; this._setCache(c);
        this._queueOp({ t: 'log', log: { log_date: log.log_date, day_label: log.day_label, entries: log.entries, notes: log.notes || '' } });
        this.offlineWrite = true;
        return log.id;
      }
    }
    const d = this._data(); d.logs = d.logs || [];
    if (log.id) { const i = d.logs.findIndex(x => x.id === log.id); if (i >= 0) d.logs[i] = log; }
    else { log.id = this.uid(); log.created_at = new Date().toISOString(); d.logs.push(log); }
    this._saveData(d);
    return log.id;
  },

  async deleteLog(id) {
    if (this.mode === 'cloud') {
      try {
        if (String(id).startsWith('off_')) throw new Error('offline');
        await SB.del('workout_logs', '?id=eq.' + id);
        const c = this._cache() || {};
        c.logs = (c.logs || []).filter(x => String(x.id) !== String(id));
        this._setCache(c);
      } catch (e) {
        if (!this._queueable(e)) throw e;
        const c = this._cache() || {};
        const gone = (c.logs || []).find(x => String(x.id) === String(id));
        c.logs = (c.logs || []).filter(x => String(x.id) !== String(id));
        this._setCache(c);
        if (gone) {
          // remove da fila qualquer criacao pendente desse log (efeito liquido: nada a sincronizar)
          this._setOutbox(this._offlineQueue().filter(op => !(op.t === 'log' && op.log.log_date === gone.log_date)));
          if (!String(id).startsWith('off_')) this._queueOp({ t: 'dellog', log_date: gone.log_date });
        }
        this.offlineWrite = true;
      }
      return;
    }
    const d = this._data(); d.logs = (d.logs || []).filter(x => x.id !== id); this._saveData(d);
  },

  async getMeta() {
    if (this.mode === 'cloud') {
      try {
        const r = await SB.sel('profiles', '?id=eq.' + this.user.id + '&select=meta&limit=1');
        const meta = (r && r[0] && r[0].meta) || { rotation_index: 0 };
        this._setCache(Object.assign(this._cache() || {}, { meta }));
        return meta;
      } catch (e) {
        if (!this._queueable(e)) throw e;
        const c = this._cache();
        return (c && c.meta) || { rotation_index: 0 };
      }
    }
    return this._data().meta || { rotation_index: 0 };
  },
  async saveMeta(meta) {
    if (this.mode === 'cloud') {
      try {
        await SB.upd('profiles', '?id=eq.' + this.user.id, { meta });
        const c = this._cache() || {}; c.meta = meta; this._setCache(c);
      } catch (e) {
        if (!this._queueable(e)) throw e;
        const c = this._cache() || {}; c.meta = meta; this._setCache(c);
        this._queueOp({ t: 'meta', meta });
        this.offlineWrite = true;
      }
      return;
    }
    const d = this._data(); d.meta = meta; this._saveData(d);
  },

  // ---------- recadinhos do casal ----------
  async getNotes() {
    if (this.mode === 'cloud') {
      try {
        const r = await SB.sel('couple_notes', '?select=*&order=created_at.desc&limit=60');
        return r || [];
      } catch (e) { return []; }
    }
    return this._ls('notes.' + this.user.id) || [];
  },
  async saveNote(toName, message) {
    toName = (toName || '').trim(); message = (message || '').trim();
    if (!toName || !message) throw new Error('Escreva para quem é e a mensagem. 💌');
    if (this.mode === 'cloud') {
      const rows = await SB.ins('couple_notes', {
        from_user_id: this.user.id, from_name: this.user.name,
        to_name: toName, message: message.slice(0, 500),
      });
      return rows && rows[0];
    }
    const k = 'notes.' + this.user.id;
    const arr = this._ls(k) || [];
    const row = { id: this.uid(), from_user_id: this.user.id, from_name: this.user.name,
      to_name: toName, message: message.slice(0, 500), created_at: new Date().toISOString() };
    arr.unshift(row); this._ls(k, arr);
    return row;
  },
  async deleteNote(id) {
    if (this.mode === 'cloud') { try { await SB.del('couple_notes', '?id=eq.' + id); } catch (e) {} return; }
    const k = 'notes.' + this.user.id;
    this._ls(k, (this._ls(k) || []).filter(x => x.id !== id));
  },

  // ---------- push notifications (recadinhos) ----------
  pushSupported() {
    return ('Notification' in window) && ('PushManager' in window) && ('serviceWorker' in navigator);
  },
  pushPermission() { return ('Notification' in window) ? Notification.permission : 'denied'; },
  // Garante a inscricao push deste aparelho salva na nuvem (chamar quando já permitido).
  async ensurePushSubscription() {
    if (this.mode !== 'cloud') return false;
    if (!this.pushSupported() || Notification.permission !== 'granted') return false;
    try {
      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (!sub) sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: b64ToU8(VAPID_PUBLIC),
      });
      const j = sub.toJSON();
      await SB.upsert('push_subscriptions', {
        user_id: this.user.id, endpoint: j.endpoint,
        subscription: j, updated_at: new Date().toISOString(),
      }, 'user_id');
      return true;
    } catch (e) { return false; }
  },
  // Pede permissao ao usuario e ativa as notificacoes neste aparelho.
  async enablePush() {
    if (this.mode !== 'cloud') throw new Error('Entra com a sua conta pra ativar as notificações.');
    if (!this.pushSupported()) throw new Error('Este aparelho/navegador não suporta notificações push. 📵');
    let perm = Notification.permission;
    if (perm === 'default') perm = await Notification.requestPermission();
    if (perm !== 'granted') throw new Error('Notificações bloqueadas: libera nas configurações do aparelho e tenta de novo. 🔕');
    const ok = await this.ensurePushSubscription();
    if (!ok) throw new Error('Não consegui registrar este aparelho. Tenta de novo 😕');
    return true;
  },

  // ---------- rascunho com auto-save (local imediato + nuvem) ----------
  // O treino em andamento nunca se perde: cada alteracao salva na hora
  // no aparelho e, com internet, tambem na nuvem (na meta do perfil).
  async saveDraft(draft) {
    const key = 'casalnavy.draft.' + this.user.id;
    try { localStorage.setItem(key, JSON.stringify(draft)); } catch (e) {}
    if (this.mode !== 'cloud' || !draft) return;
    const now = Date.now();
    if (now - (this._draftLast || 0) < 2000) {
      clearTimeout(this._draftT);
      this._draftT = setTimeout(() => this.saveDraft(Store._pendingDraft || draft), 2200);
      this._pendingDraft = draft;
      return;
    }
    this._draftLast = now; this._pendingDraft = null;
    try {
      const meta = (await this.getMeta()) || {};
      meta.draft = draft;
      await this.saveMeta(meta);
    } catch (e) { /* tenta de novo na proxima alteracao */ }
  },
  async loadDraft() {
    const key = 'casalnavy.draft.' + this.user.id;
    let local = null;
    try { local = JSON.parse(localStorage.getItem(key)); } catch (e) {}
    if (this.mode !== 'cloud') return local;
    try {
      const meta = await this.getMeta();
      const cloud = meta && meta.draft;
      if (cloud && cloud.dayIdx !== undefined) {
        const lt = (local && local.updatedAt) || 0, ct = cloud.updatedAt || 0;
        return ct >= lt ? cloud : local;
      }
    } catch (e) {}
    return local;
  },
  async clearDraft() {
    const key = 'casalnavy.draft.' + this.user.id;
    try { localStorage.removeItem(key); } catch (e) {}
    clearTimeout(this._draftT); this._pendingDraft = null;
    if (this.mode !== 'cloud') return;
    try {
      const meta = (await this.getMeta()) || {};
      if (meta.draft) { delete meta.draft; await this.saveMeta(meta); }
    } catch (e) {}
  },

  saveSbConfig(url, key) {
    this.cfg = { url: url.trim().replace(/\/+$/, ''), key: key.trim() };
    this._ls('sbconfig', this.cfg);
    SB.configure(this.cfg.url, this.cfg.key);
  },
};
