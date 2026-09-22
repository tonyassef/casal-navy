/* Casal Navy — logica do app (vanilla JS, sem dependencias) */
'use strict';

/* ---------- helpers ---------- */
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const DEFAULT_SPOTIFY = 'https://open.spotify.com/playlist/24d78VZmZtVvlZTVBs7vYA'; // playlist de treino do Tony
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pad = n => String(n).padStart(2, '0');
function todayISO(d) { d = d || new Date(); return d.getFullYear() + '-' + pad(d.getMonth()+1) + '-' + pad(d.getDate()); }
function fmtBR(iso) { if (!iso) return ''; const [y,m,dd] = iso.split('-'); return `${dd}/${m}/${y}`; }
function weekdayBR(iso) {
  const dias = ['Domingo','Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado'];
  const [y,m,d] = iso.split('-').map(Number);
  return dias[new Date(y, m-1, d).getDay()];
}
function parseLoads(str) {
  const nums = String(str || '').match(/\d+(?:[.,]\d+)?/g);
  return nums ? nums.map(x => parseFloat(x.replace(',', '.'))) : [];
}
function maxLoad(str) { const l = parseLoads(str); return l.length ? Math.max(...l) : null; }
function normName(name) {
  let n = String(name || '').toLowerCase().replace(/\s+/g, ' ');
  [['[àáâã]','a'],['[éê]','e'],['[í]','i'],['[óôõ]','o'],['[ú]','u'],['[ç]','c']]
    .forEach(([a,b]) => { n = n.replace(new RegExp(a,'g'), b); });
  return n.replace(/[^a-z0-9/ ]/g, '').trim();
}
let toastT = null;
function toast(msg, ms) {
  const t = $('#toast'); t.textContent = msg; t.classList.remove('hidden');
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.add('hidden'), ms || 2600);
}
// toast apos escrita: se foi offline, avisa que vai sincronizar depois
function savedToast(okMsg) {
  if (Store.offlineWrite) { Store.offlineWrite = false; toast('Salvo offline 📶 — sincroniza sozinho quando a internet voltar.'); }
  else if (okMsg) toast(okMsg);
}
// youtube: link do exercicio ou busca pelo nome
function ytUrlFor(ex, variant) {
  const raw = variant === 'B' ? ex.ytB : ex.ytA;
  const v = (raw || '').trim();
  if (v) return /^https?:\/\//i.test(v) ? v : 'https://' + v;
  const name = variant === 'B' && ex.nameB ? ex.nameB : ex.nameA;
  try { const mv = (typeof EXERCISE_VIDEOS !== 'undefined' && EXERCISE_VIDEOS[name]) || ''; if (mv) return mv; } catch (e) {}
  return 'https://www.youtube.com/results?search_query=' + encodeURIComponent(name + ' exercício academia');
}
// super-set: "Super-set com <parceiro>" → nome do exercício parceiro ("" se não for super-set)
function ssPartner(technique) {
  const m = /^super-?set com (.+)$/i.exec(String(technique || '').trim());
  return m ? m[1].trim() : '';
}
// barra de perfis (Tony / Eliza)
function profileBar() {
  const profiles = Store._savedSessions();
  if (profiles.length < 2) return '';
  return `<div class="profbar">${profiles.map(p =>
    `<button class="profchip ${p.userId === Store.user.id ? 'active' : ''}" data-prof="${p.userId}">${esc((p.name || '?').split(' ')[0])}</button>`
  ).join('')}<button class="profchip add" id="prof-add" title="Adicionar perfil">＋</button></div>`;
}
function wireProfileBar() {
  $$('#hoje-content .profchip[data-prof]').forEach(b => b.addEventListener('click', async () => {
    if (b.dataset.prof === Store.user.id) return;
    toast('Trocando de perfil... ⏳');
    try { await Store.switchProfile(b.dataset.prof); await enterApp(); toast('Perfil: ' + Store.user.name + ' 👤'); }
    catch (e) { toast('Erro: ' + e.message); }
  }));
  const pa = $('#prof-add');
  if (pa) pa.addEventListener('click', startAddProfile);
}
function startAddProfile() {
  S.addingProfile = true;
  $('#auth-err').textContent = '';
  $('#auth-cancel').classList.remove('hidden');
  showScreen('auth');
}
function openModal(html) { $('#modal-card').innerHTML = html; $('#modal').classList.remove('hidden'); }
function closeModal() { $('#modal').classList.add('hidden'); }
$('#modal').addEventListener('click', e => { if (e.target.id === 'modal') closeModal(); });

const APP_VERSION = 'v24'; // manter igual ao CACHE do sw.js
/* ---------- estado ---------- */
const S = {
  plan: null, logs: [], meta: { rotation_index: 0 },
  draft: null,           // treino em andamento
  todayIdx: 0, todayDate: todayISO(),
  editPlan: false,
  notes: [],             // recadinhos do casal
};
function fmtDT(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return pad(d.getDate()) + '/' + pad(d.getMonth()+1) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
}
// quem recebe o recado por padrao (o outro do casal)
function partnerDefault() {
  const me = String(Store.user && Store.user.name || '').toLowerCase();
  if (/tony|antonio|assef/.test(me)) return 'Eliza';
  if (/eliz/.test(me)) return 'Antonio';
  return '';
}
const NOTE_IDEAS = [
  'Bom treino, meu amor! 💪❤️',
  'Foca que o shape vem! 😍',
  'Tô torcendo por você 💙',
  'Arrasa hoje! Depois tem recompensa 😏❤️',
  'Treina fofo que eu te amo forte 🥰',
];

/* rascunho com auto-save: salva no aparelho na hora e na nuvem logo em seguida.
   Nenhum valor digitado se perde, mesmo fechando o app no meio do treino. */
async function loadDraft() { S.draft = await Store.loadDraft(); }
function saveDraft() {
  if (!S.draft) return;
  S.draft.updatedAt = Date.now();
  Store.saveDraft(S.draft); // fire-and-forget: local imediato, nuvem com debounce
}
function clearDraft() { S.draft = null; Store.clearDraft(); }

/* ---------- boot ---------- */
async function boot() {
  const logged = await Store.boot().catch(() => false);
  if (logged) { await enterApp(); }
  else {
    showScreen('auth');
    const cfg = Store.cfg;
    $('#auth-mode-hint').textContent = (cfg.url && cfg.key)
      ? 'Modo nuvem: sua conta sincroniza entre aparelhos.'
      : 'Modo local: conta salva neste aparelho. Ative a nuvem em Conta → Banco de dados.';
  }
  // offline -> online: sincroniza a fila sozinho
  window.addEventListener('online', async () => {
    refreshActive();
    try {
      const r = await Store.syncNow();
      if (r.n > 0) {
        S.plan = await Store.getPlan(); S.logs = await Store.getLogs(); S.meta = await Store.getMeta();
        refreshActive();
        toast(r.pending > 0 ? `Sincronizado ☁️ (${r.pending} ainda pendentes)` : 'Tudo sincronizado com a nuvem! ☁️✓');
      }
    } catch (e) {}
  });
  window.addEventListener('offline', () => {
    toast('Sem internet 📶 — o app continua funcionando, tudo sincroniza depois.');
    refreshActive();
  });
  // tenta enviar pendencias ao abrir
  try {
    const r = await Store.syncNow();
    if (r.n > 0) { S.plan = await Store.getPlan(); S.logs = await Store.getLogs(); S.meta = await Store.getMeta(); refreshActive(); }
  } catch (e) {}
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').then(reg => {
      // achou versão nova instalando: avisa e recarrega sozinho pro código novo valer
      const watchNew = () => {
        const nw = reg.installing;
        if (!nw || nw.__watched) return;
        nw.__watched = true;
        nw.addEventListener('statechange', () => {
          if (nw.state === 'activated' && navigator.serviceWorker.controller) {
            toast('Nova versão instalada — recarregando… 🔄');
            setTimeout(() => location.reload(), 900);
          }
        });
      };
      reg.addEventListener('updatefound', watchNew);
      watchNew();
      // força a checagem a cada abertura (o navegador às vezes pula sozinho)
      try { reg.update(); } catch (e) {}
      // e de meia em meia hora com o app aberto: atualização entra sozinha
      setInterval(() => { try { reg.update(); } catch (e) {} }, 30 * 60 * 1000);
      // ao voltar pro app (estava em segundo plano): checa atualização na hora
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) { try { reg.update(); } catch (e) {} }
      });
      S.swReg = reg;
    }).catch(()=>{});
    // quando uma versão nova do app assumir, recarrega sozinho pra já rodar o código novo
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (window.__swUpdated) return;
      window.__swUpdated = true;
      location.reload();
    });
  }
}

function refreshActive() {
  const s = S.screen || 'hoje';
  if (s === 'hoje') renderHoje();
  else if (s === 'historico') renderHistorico();
  else if (s === 'plano') renderPlano();
  else if (s === 'conta') renderConta();
  else if (s === 'recados') renderRecados();
  else if (s === 'calendario') renderCalendario();
}

function showScreen(name) {
  S.screen = name;
  $$('.screen').forEach(s => s.classList.add('hidden'));
  $('#screen-' + name).classList.remove('hidden');
  $$('#tabbar button').forEach(b => b.classList.toggle('active', b.dataset.screen === name));
  $('#tabbar').classList.toggle('hidden', name === 'auth');
  window.scrollTo(0, 0);
}

async function enterApp() {
  S.plan = await Store.getPlan();
  S.logs = await Store.getLogs();
  S.meta = await Store.getMeta();
  try { S.notes = await Store.getNotes(); } catch (e) { S.notes = []; }
  await loadDraft();
  S.todayDate = todayISO();
  const n = S.plan.days.length || 1;
  S.todayIdx = computeTodayIdx(); // fixo por dia; anda so no dia seguinte ao treino feito
  if (S.draft && S.draft.logDate !== S.todayDate) { /* mantem rascunho de outro dia */ }
  renderHoje(); renderHistorico(); renderPlano(); renderConta(); renderCalendario(); renderRecados();
  showScreen('hoje');
  // Se as notificacoes ja foram permitidas, garante a inscricao push atualizada
  if (Store.pushSupported() && Store.pushPermission() === 'granted') Store.ensurePushSubscription();
}

/* ================= HOJE ================= */
function dayLabel(d) { return d.day + (d.muscle ? ' — ' + d.muscle : ''); }

/*acha o índice do dia do plano a partir do rótulo salvo no histórico ("Plano C — Pernas/Glúteo")*/
function dayIdxFromLabel(lbl) {
  const days = S.plan.days;
  if (!lbl) return -1;
  let i = days.findIndex(d => dayLabel(d) === lbl);
  if (i < 0) {
    const key = String(lbl).split(' — ')[0].trim();
    i = days.findIndex(d => d.day === key);
  }
  return i;
}

/*Plano "atual": fixo por dia. A rotação só anda no dia seguinte a um dia
  treinado (treino concluído com rótulo reconhecido): concluir hoje não muda
  o plano de hoje; se faltar num dia, o plano não anda. Rascunho de hoje em
  andamento tem prioridade; sem histórico, usa a posição salva.*/
function computeTodayIdx() {
  const days = S.plan.days, n = days.length || 1;
  const norm = x => ((x % n) + n) % n;
  advanceRotation();
  let pos = norm(S.meta.rotation_index || 0);
  // se já concluiu um treino hoje, o plano de hoje é o treinado (repara a posição se preciso)
  const tl = latestTodayLog();
  if (tl) {
    const ti = norm(dayIdxFromLabel(tl.day_label));
    const cyc = Math.max(0, Math.floor((S.meta.rotation_index || 0) / n));
    if (cyc * n + ti !== (S.meta.rotation_index || 0)) {
      S.meta.rotation_index = cyc * n + ti;
      try { if (Store && Store.saveMeta) Store.saveMeta(S.meta).catch(() => {}); } catch (e) {}
    }
    pos = ti;
  }
  // rascunho só vale se for do plano do dia; se destoar (ex.: resto de versão antiga), descarta
  if (S.draft && S.draft.logDate === S.todayDate && typeof S.draft.dayIdx === 'number') {
    if (norm(S.draft.dayIdx) !== pos) clearDraft();
    else return pos;
  }
  return pos;
}

/*último treino concluído hoje com rótulo reconhecido (ignora "Importado da planilha").*/
function latestTodayLog() {
  const logs = (S.logs || []).filter(l => l && String(l.log_date) === S.todayDate);
  logs.sort((a, b) => String(a.log_date) < String(b.log_date) ? 1 : String(a.log_date) > String(b.log_date) ? -1 : 0);
  for (const l of logs) if (dayIdxFromLabel(l.day_label) >= 0) return l;
  return null;
}

/*avança a rotação um passo por dia treinado anterior a hoje ainda não
  contabilizado; salva a nova posição (melhor esforço, sem travar a tela).*/
function advanceRotation() {
  const days = S.plan.days, n = days.length || 1;
  if (S.meta.rotation_anchor == null) {
    // migração: começa a contar de ontem, sem pular por treino antigo
    S.meta.rotation_anchor = todayISO(new Date(Date.now() - 864e5));
    try { if (Store && Store.saveMeta) Store.saveMeta(S.meta).catch(() => {}); } catch (e) {}
  }
  const anchor = String(S.meta.rotation_anchor);
  const seen = {};
  (S.logs || []).forEach(l => {
    if (!l || !l.log_date) return;
    const d = String(l.log_date);
    if (d <= anchor || d >= S.todayDate) return;
    if (dayIdxFromLabel(l.day_label) < 0) return;
    seen[d] = 1;
  });
  const dates = Object.keys(seen).sort();
  if (dates.length) {
    S.meta.rotation_index = (S.meta.rotation_index || 0) + dates.length;
    S.meta.rotation_anchor = dates[dates.length - 1];
    try { if (Store && Store.saveMeta) Store.saveMeta(S.meta).catch(() => {}); } catch (e) {}
  }
}

function renderHoje() {
  const days = S.plan.days;
  if (!days.length) { $('#hoje-content').innerHTML = '<div class="card">Nenhum dia no plano. Vá em Plano para montar.</div>'; return; }
  const offline = (typeof navigator !== 'undefined' && navigator.onLine === false);
  const d = days[S.todayIdx];
  const draft = S.draft;
  const isDraftDay = draft && draft.dayIdx === S.todayIdx && draft.logDate === S.todayDate;
  // se o treino da data em vista já foi concluído, avisa — o plano do dia continua o mesmo
  const viewedDone = !!latestTodayLog();
  const doneToday = (S.todayDate === todayISO()) && viewedDone;

  let h = profileBar() + noteBanner() + deloadBanner() + (offline
    ? `<div class="card" style="border-color:var(--gold)"><div class="sub">📶 <b>Sem internet</b> — pode treinar normal, tudo sincroniza quando o sinal voltar.</div></div>`
    : '')
    + `<div class="card"><div class="day-head">
      <h3>${esc(dayLabel(d))}</h3><span class="badge">${esc(S.todayDate ? fmtBR(S.todayDate) : '')}</span>
    </div>
    <div class="sub">${d.exercises.length} exercícios • descanso padrão 3 min</div>
    <label class="lbl">Data do treino</label>
    <input type="date" id="hoje-logdate" value="${esc(S.todayDate)}">
    <label class="lbl">Treinar outro dia do plano</label>
    <select id="hoje-daypick">${days.map((x,i)=>`<option value="${i}" ${i===S.todayIdx?'selected':''}>${esc(dayLabel(x))}</option>`).join('')}</select>
  </div>`
  + (viewedDone
    ? `<div class="card" style="border:2px solid #34c759"><div class="sub">✅ <b>${doneToday ? 'Treino de hoje já concluído' : 'Treino desse dia já concluído'}</b> — registrado no calendário com os pesos.${doneToday ? ' O plano do dia continua o mesmo.' : ''}</div></div>`
    : '');

  d.exercises.forEach((ex, i) => {
    const st = isDraftDay && draft.entries[i];
    const done = st && st.doneSets && st.doneSets.length && st.doneSets.every(Boolean) && st.doneSets.length >= parseInt(st.sets || ex.sets || 0);
    const w = st ? [st.weight, st.partnerWeight].filter(Boolean).map(esc).join(' + ') : '';
    h += `<div class="ex ${done?'done':''}" data-ex="${i}">
      <div class="num">${done ? '✓' : (i+1)}</div>
      <div class="info"><b>${esc(st && st.variant === 'B' && ex.nameB ? ex.nameB : ex.nameA)}</b>
      <small>${esc(ex.sets||'')}× ${esc(ex.reps||'')} • ${esc(ex.technique||'')}</small></div>
      ${w?`<div class="w">${w}</div>`:''}<button class="yt-btn" data-yt="${i}" data-v="${st && st.variant === 'B' && ex.nameB ? 'B' : 'A'}" title="Ver vídeo no YouTube">▶️</button><div class="chev">›</div></div>`;
  });

  h += `<button class="btn primary" id="btn-finish">Concluir treino ✓</button>
        <button class="btn spotify" id="btn-spotify">🎵 Tocar playlist de treino</button>
        <button class="btn" id="btn-discard" style="${isDraftDay?'':'display:none'}">Descartar rascunho</button>`;
  $('#hoje-content').innerHTML = h;
  $('#hoje-date').textContent = weekdayBR(S.todayDate);

  $('#btn-spotify').addEventListener('click', () => {
    window.open((S.meta && S.meta.spotify_playlist) || DEFAULT_SPOTIFY, '_blank');
  });

  $('#hoje-logdate').addEventListener('change', e => {
    S.todayDate = e.target.value || todayISO();
    S.todayIdx = computeTodayIdx(); // o plano acompanha a data escolhida
    ensureDraft();
    renderHoje();
  });
  $('#hoje-daypick').addEventListener('change', async e => {
    S.todayIdx = +e.target.value; clearDraft();
    // o app aprende a posicao na rotacao: passa a abrir daqui em diante
    try {
      const n = S.plan.days.length || 1;
      const cyc = Math.max(0, Math.floor((S.meta.rotation_index || 0) / n));
      S.meta.rotation_index = cyc * n + (((+e.target.value) % n) + n) % n;
      S.meta.plan_pick_date = todayISO();
      // a escolha de hoje passa a valer; treinos anteriores a hoje não andam a rotação
      S.meta.rotation_anchor = todayISO(new Date(Date.now() - 864e5));
      await Store.saveMeta(S.meta);
    } catch (err) {}
    renderHoje();
  });
  $$('#hoje-content .ex').forEach(el => el.addEventListener('click', () => openExercise(+el.dataset.ex)));  $$('#hoje-content .yt-btn').forEach(b => b.addEventListener('click', e => {
    e.stopPropagation();
    const ex = S.plan.days[S.todayIdx].exercises[+b.dataset.yt];
    window.open(ytUrlFor(ex, b.dataset.v), '_blank');
  }));
  wireProfileBar();
  wireNoteBanner();
  wireDeloadBanner();
  $('#btn-finish').addEventListener('click', finishWorkout);
  $('#btn-discard').addEventListener('click', () => { clearDraft(); renderHoje(); toast('Rascunho descartado.'); });
}

function ensureDraft() {
  if (!S.draft || S.draft.dayIdx !== S.todayIdx || S.draft.logDate !== S.todayDate) {
    S.draft = { dayIdx: S.todayIdx, logDate: S.todayDate, entries: {}, notes: '' };
    saveDraft();
  }
}

// pesos do último treino concluído deste mesmo dia do plano.
// Quando o treino é finalizado, o próximo treino desse plano já abre
// com as cargas usadas da última vez — é só ajustar se for aumentar.
function lastLoadsFor(ex, dayLbl) {
  const targets = [normName(ex.nameA), normName(ex.nameB)].filter(Boolean);
  if (!targets.length) return null;
  for (const l of (S.logs || [])) {
    if (l.day_label !== dayLbl) continue;
    for (const e of (l.entries || [])) {
      if (targets.includes(normName(e.name))) {
        return { weight: e.weight || '', partnerWeight: e.partnerWeight || '', partnerReps: e.partnerReps || '' };
      }
    }
  }
  return null;
}
function openExercise(i) {
  ensureDraft();
  const ex = S.plan.days[S.todayIdx].exercises[i];
  let st = S.draft.entries[i];
  let prefilled = false;
  if (!st) {
    st = { variant: 'A', weight: '', partnerWeight: '', partnerReps: '', doneSets: [], notes: '', sets: ex.sets, reps: ex.reps, technique: ex.technique, rest: ex.rest };
    const last = lastLoadsFor(ex, dayLabel(S.plan.days[S.todayIdx]));
    if (last && (last.weight || last.partnerWeight)) {
      st.weight = last.weight; st.partnerWeight = last.partnerWeight; st.partnerReps = last.partnerReps;
      prefilled = true;
    }
  }
  const nSets = Math.max(1, parseInt(st.sets || ex.sets || '3', 10) || 3);
  while (st.doneSets.length < nSets) st.doneSets.push(false);
  const name = st.variant === 'B' && ex.nameB ? ex.nameB : ex.nameA;
  const partner = ssPartner(st.technique || ex.technique);

  const loadHtml = partner ? `
    <div class="row2">
      <div><label class="lbl">Séries</label><input id="m-sets" value="${esc(st.sets || ex.sets || '')}"></div>
      <div><label class="lbl">Descanso (seg)</label><input id="m-rest" type="number" value="${esc(st.rest || ex.rest || 180)}"></div>
    </div>
    <label class="lbl">Técnica</label><input id="m-tech" value="${esc(st.technique || ex.technique || '')}">
    <div class="ss-head">1 — ${esc(name)}</div>
    <div class="row2">
      <div><label class="lbl">Carga (lbs) — ex: 70/55/40</label><input id="m-weight" inputmode="decimal" value="${esc(st.weight)}" placeholder="peso usado"></div>
      <div><label class="lbl">Reps</label><input id="m-reps" value="${esc(st.reps || ex.reps || '')}"></div>
    </div>
    <div class="ss-head">2 — ${esc(partner)} <small>(super-set)</small></div>
    <div class="row2">
      <div><label class="lbl">Carga (lbs) — ex: 25/20/15</label><input id="m-weight2" inputmode="decimal" value="${esc(st.partnerWeight || '')}" placeholder="peso usado"></div>
      <div><label class="lbl">Reps</label><input id="m-reps2" value="${esc(st.partnerReps || ex.reps || '')}"></div>
    </div>` : `
    <div class="row2">
      <div><label class="lbl">Séries</label><input id="m-sets" value="${esc(st.sets || ex.sets || '')}"></div>
      <div><label class="lbl">Reps</label><input id="m-reps" value="${esc(st.reps || ex.reps || '')}"></div>
    </div>
    <label class="lbl">Técnica</label><input id="m-tech" value="${esc(st.technique || ex.technique || '')}">
    <div class="row2">
      <div><label class="lbl">Descanso (seg)</label><input id="m-rest" type="number" value="${esc(st.rest || ex.rest || 180)}"></div>
      <div><label class="lbl">Carga (lbs) — ex: 70/55/40/25</label><input id="m-weight" inputmode="decimal" value="${esc(st.weight)}" placeholder="peso usado"></div>
    </div>`;

  openModal(`
    <h3>${esc(name)}${partner ? ' <small style="color:var(--muted)">+ super-set</small>' : ''}</h3>
    <div class="sub">${esc(S.plan.days[S.todayIdx].muscle || '')}</div>
    <button class="btn" id="m-yt">▶️ Ver vídeo do exercício</button>
    ${ex.nameB ? `<div class="ab-toggle">
      <button class="${st.variant==='A'?'active':''}" data-v="A">Plano A<br><small>${esc(ex.nameA)}</small></button>
      <button class="${st.variant==='B'?'active':''}" data-v="B">Plano B<br><small>${esc(ex.nameB)}</small></button>
    </div>` : `<div class="kv"><span>Plano A</span><b>${esc(ex.nameA)}</b></div>`}
    ${loadHtml}
    ${prefilled ? '<div class="sub" style="color:var(--gold)">↩ pesos do seu último treino deste plano — ajusta se for aumentar 💪</div>' : ''}
    <label class="lbl">Séries concluídas</label>
    <div class="sets-row" id="m-setsrow">${st.doneSets.map((d,k)=>`<button class="set-chip ${d?'on':''}" data-k="${k}">${k+1}</button>`).join('')}</div>
    <button class="btn" id="m-timer">⏱ Descansar</button>
    <label class="lbl">Observações</label>
    <textarea id="m-notes" rows="2" placeholder="ex: dor no ombro, máquina ocupada...">${esc(st.notes)}</textarea>
    <button class="btn primary" id="m-save">Salvar exercício</button>
    <button class="btn" id="m-close">Voltar</button>`);

  const readFields = () => {
    st.sets=$('#m-sets').value; st.reps=$('#m-reps').value; st.technique=$('#m-tech').value;
    st.rest=$('#m-rest').value; st.weight=$('#m-weight').value; st.notes=$('#m-notes').value;
    const w2 = $('#m-weight2');
    if (w2) { st.partnerWeight = w2.value; st.partnerReps = $('#m-reps2').value; st.partnerName = partner; }
  };

  $$('#modal-card .ab-toggle button').forEach(b => b.addEventListener('click', () => {
    st.variant = b.dataset.v; S.draft.entries[i] = st; saveDraft(); openExercise(i);
  }));
  $('#m-yt').addEventListener('click', () => window.open(ytUrlFor(ex, st.variant), '_blank'));
  $('#m-sets').addEventListener('change', e => {
    st.sets = e.target.value;
    const n = Math.max(1, parseInt(st.sets, 10) || 3);
    st.doneSets = Array.from({length:n}, (_,k)=>st.doneSets[k]||false);
    S.draft.entries[i]=st; saveDraft(); openExercise(i);
  });
  $$('#m-setsrow .set-chip').forEach(c => c.addEventListener('click', () => {
    const k = +c.dataset.k; st.doneSets[k] = !st.doneSets[k]; c.classList.toggle('on', st.doneSets[k]);
    S.draft.entries[i] = st; saveDraft(); // marca série e já salva
  }));
  // AUTO-SAVE: qualquer valor digitado salva na hora (aparelho + nuvem).
  // Fechar o app no meio do exercício não apaga mais nada.
  $$('#modal-card input, #modal-card textarea').forEach(el => {
    el.addEventListener('input', () => { readFields(); S.draft.entries[i] = st; saveDraft(); });
  });
  $('#m-timer').addEventListener('click', () => {
    readFields();
    S.draft.entries[i]=st; saveDraft(); openTimer(parseInt(st.rest,10)||180, ()=>openExercise(i));
  });
  $('#m-save').addEventListener('click', () => {
    readFields();
    S.draft.entries[i]=st; saveDraft(); closeModal(); renderHoje(); toast('Exercício salvo ✓');
  });
  $('#m-close').addEventListener('click', () => {
    readFields(); // voltar também salva o que foi digitado
    S.draft.entries[i] = st; saveDraft(); closeModal(); renderHoje();
  });
}

/* timer de descanso */
let timerInt = null;
function openTimer(secs, back) {
  let left = secs;
  openModal(`<h3>Descanso</h3><div class="timer-big" id="t-big">${fmtT(left)}</div>
    <div class="timer-btns"><button class="btn small" id="t-30">+30s</button>
    <button class="btn small" id="t-stop">Parar</button></div>
    <button class="btn" id="t-back">Voltar ao exercício</button>`);
  clearInterval(timerInt);
  const tick = () => {
    left--; const elx = $('#t-big'); if (elx) elx.textContent = fmtT(Math.max(0,left));
    if (left <= 0) { clearInterval(timerInt); beep(); if (navigator.vibrate) navigator.vibrate([200,100,200]); toast('Descanso terminado! 💪'); }
  };
  timerInt = setInterval(tick, 1000);
  $('#t-30').addEventListener('click', ()=>{ left += 30; $('#t-big').textContent = fmtT(left); });
  const stop = () => { clearInterval(timerInt); back(); };
  $('#t-stop').addEventListener('click', stop);
  $('#t-back').addEventListener('click', stop);
}
function fmtT(s){ return pad(Math.floor(s/60)) + ':' + pad(s%60); }
function beep(){
  try{
    const ctx = new (window.AudioContext||window.webkitAudioContext)();
    [0,250,500].forEach(t=>{ const o=ctx.createOscillator(), g=ctx.createGain();
      o.connect(g); g.connect(ctx.destination); o.frequency.value=880;
      o.start(ctx.currentTime+t/1000); o.stop(ctx.currentTime+t/1000+0.2); });
  }catch(e){}
}

async function finishWorkout() {
  ensureDraft();
  const d = S.plan.days[S.todayIdx];
  const entries = Object.keys(S.draft.entries).map(k => {
    const i = +k, ex = d.exercises[i], st = S.draft.entries[k];
    return { name: st.variant==='B' && ex.nameB ? ex.nameB : ex.nameA, variant: st.variant,
      sets: st.sets, reps: st.reps, technique: st.technique, rest: st.rest,
      weight: st.weight, partnerName: st.partnerName || '', partnerWeight: st.partnerWeight || '', partnerReps: st.partnerReps || '',
      doneSets: st.doneSets.filter(Boolean).length, notes: st.notes };
  }).filter(e => e.weight || e.doneSets > 0 || e.notes);
  if (!entries.length) { toast('Marque ao menos um exercício antes de concluir.'); return; }
  const log = { log_date: S.draft.logDate, day_label: dayLabel(d), entries,
    notes: S.draft.notes || '' };
  try {
    await Store.saveLog(log);
    S.logs = await Store.getLogs();
    clearDraft();
    // o plano de hoje continua o mesmo; a rotação só anda amanhã
    S.todayIdx = computeTodayIdx();
    const nn = S.plan.days.length || 1;
    const nx = (((S.todayIdx + 1) % nn) + nn) % nn;
    renderHoje(); renderHistorico();
    savedToast('Treino salvo! Amanhã: ' + dayLabel(S.plan.days[nx]) + ' 💪');
  } catch(e){ toast('Erro ao salvar: ' + e.message); }
}

/* ================= HISTORICO / EVOLUCAO ================= */
function kpiStats(days) {
  const sinceISO = days ? todayISO(new Date(Date.now() - (days - 1) * 864e5)) : '';
  let treinos = 0, series = 0, vol = 0;
  S.logs.forEach(l => {
    if (sinceISO && l.log_date < sinceISO) return;
    treinos++;
    l.entries.forEach(e => {
      const s = e.doneSets > 0 ? e.doneSets : (parseInt(e.sets, 10) || 0);
      series += s;
      const m = maxLoad(e.weight);
      if (m != null) vol += m * s;
      const m2 = maxLoad(e.partnerWeight);
      if (m2 != null) vol += m2 * s;
    });
  });
  return { treinos, series, vol: Math.round(vol) };
}
function streakDays() {
  const set = new Set(S.logs.map(l => l.log_date));
  const d = new Date();
  if (!set.has(todayISO(d))) d.setDate(d.getDate() - 1);
  let s = 0;
  while (set.has(todayISO(d))) { s++; d.setDate(d.getDate() - 1); }
  return s;
}

function renderHistorico() {
  const r = S.histRange || 30;
  const st = kpiStats(r);
  let h = `<div class="seg">
      ${[[7,'7 dias'],[30,'30 dias'],[0,'Tudo']].map(([v,l]) =>
        `<button data-r="${v}" class="${r===v?'active':''}">${l}</button>`).join('')}</div>
    <div class="kpis">
      <div class="kpi"><b>${st.treinos}</b><small>treinos</small></div>
      <div class="kpi"><b>${st.series}</b><small>séries</small></div>
      <div class="kpi"><b>${st.vol.toLocaleString('pt-BR')}</b><small>volume (lbs)</small></div>
      <div class="kpi"><b>${streakDays()} 🔥</b><small>dias seguidos</small></div>
    </div>`;

  h += `<div class="card"><h3>Progressão por exercício</h3>
    <label class="lbl">Exercício</label><select id="h-exsel"></select>
    <canvas class="chart" id="h-chart" width="640" height="220"></canvas>
    <div class="sub" id="h-stat" style="margin-top:6px"></div></div>`;

  h += `<div class="card"><h3>Treinos registrados</h3><div id="h-list">`;
  if (!S.logs.length) h += '<div class="sub">Nenhum treino ainda. Bora treinar! 💪</div>';
  S.logs.slice(0,120).forEach(l => {
    h += `<div class="log-item" data-id="${l.id}"><div><b>${esc(fmtBR(l.log_date))}</b>
      <small>${esc(l.day_label)} • ${l.entries.length} exercícios</small></div><div class="chev">›</div></div>`;
  });
  h += `</div></div>`;
  if (!S.meta.seed_imported) {
    h += `<button class="btn gold" id="btn-seed">📥 Importar meu histórico da planilha (Tony)</button>
          <div class="sub" style="text-align:center">Traz seus pesos de ago/2025 até hoje para o gráfico de progressão.</div>`;
  }
  $('#hist-content').innerHTML = h;

  $$('#hist-content .seg button').forEach(b => b.addEventListener('click', () => {
    S.histRange = +b.dataset.r; renderHistorico();
  }));

  // preenche select de exercicios
  const names = {};
  S.logs.forEach(l => l.entries.forEach(e => {
    const k = normName(e.name); if (k && !names[k]) names[k] = e.name;
    const pk = normName(e.partnerName); if (pk && !names[pk]) names[pk] = e.partnerName;
  }));
  (S.plan.days||[]).forEach(d => d.exercises.forEach(ex => {
    [ex.nameA, ex.nameB].forEach(nm => { const k = normName(nm); if (k && !names[k]) names[k] = nm; });
  }));
  const keys = Object.keys(names).sort((a,b)=>names[a].localeCompare(names[b]));
  $('#h-exsel').innerHTML = keys.map(k=>`<option value="${esc(k)}">${esc(names[k])}</option>`).join('');
  if (keys.length) { drawChart(keys[0], names); $('#h-exsel').addEventListener('change', e=>drawChart(e.target.value, names)); }

  $$('#h-list .log-item').forEach(el => el.addEventListener('click', ()=>openLog(el.dataset.id)));
  const bs = $('#btn-seed'); if (bs) bs.addEventListener('click', importSeed);
}

function chartPoints(key) {
  const pts = [];
  S.logs.forEach(l => l.entries.forEach(e => {
    let w = null;
    if (normName(e.name) === key) w = maxLoad(e.weight);
    else if (e.partnerName && normName(e.partnerName) === key) w = maxLoad(e.partnerWeight);
    if (w == null) return;
    pts.push({ d: l.log_date, w });
  }));
  pts.sort((a,b)=>a.d.localeCompare(b.d));
  // agrega por data (maior carga do dia)
  const by = {};
  pts.forEach(p => { if (!by[p.d] || p.w > by[p.d]) by[p.d] = p.w; });
  return Object.keys(by).sort().map(d => ({ d, w: by[d] }));
}

function drawChart(key, names) {
  const pts = chartPoints(key);
  const cv = $('#h-chart'); const ctx = cv.getContext('2d');
  const W = cv.width, H = cv.height; ctx.clearRect(0,0,W,H);
  const stat = $('#h-stat');
  if (pts.length < 1) { stat.textContent = 'Sem registros com carga para este exercício.'; return; }
  const ws = pts.map(p=>p.w);
  let mn = Math.min(...ws), mx = Math.max(...ws);
  if (mn === mx) { mn -= 5; mx += 5; }
  const px = i => 40 + (W-60) * (pts.length===1 ? 0.5 : i/(pts.length-1));
  const py = w => (H-34) - (H-60) * ((w-mn)/(mx-mn));
  ctx.strokeStyle = '#c6e2f5'; ctx.fillStyle = '#5d84a6'; ctx.font = '11px sans-serif';
  [mn, (mn+mx)/2, mx].forEach(v => { const y = py(v);
    ctx.beginPath(); ctx.moveTo(36,y); ctx.lineTo(W-8,y); ctx.stroke();
    ctx.fillText(String(Math.round(v*10)/10), 4, y+4); });
  ctx.beginPath();
  pts.forEach((p,i)=>{ const x=px(i), y=py(p.w); i?ctx.lineTo(x,y):ctx.moveTo(x,y); });
  ctx.strokeStyle = '#1b7cbb'; ctx.lineWidth = 2.5; ctx.stroke();
  pts.forEach((p,i)=>{ const x=px(i), y=py(p.w);
    ctx.beginPath(); ctx.arc(x,y,3.5,0,7); ctx.fillStyle = '#d9931e'; ctx.fill(); });
  const first = pts[0], last = pts[pts.length-1];
  const evo = last.w - first.w;
  stat.innerHTML = `${pts.length} registros • de <b>${first.w}</b> para <b>${last.w} lbs</b> ` +
    `(<span style="color:${evo>=0?'var(--ok)':'var(--danger)'}">${evo>=0?'+':''}${Math.round(evo*10)/10}</span>)`;
}

function openLog(id) {
  const l = S.logs.find(x => String(x.id) === String(id)); if (!l) return;
  let h = `<h3>${esc(fmtBR(l.log_date))}</h3><div class="sub">${esc(l.day_label)} • ${esc(weekdayBR(l.log_date))}</div>`;
  l.entries.forEach(e => {
    h += `<div class="kv"><span>${esc(e.name)} <small style="color:var(--muted)">(${esc(e.variant||'A')})</small><br>
      <small style="color:var(--muted)">${esc(e.sets||'')}× ${esc(e.reps||'')} ${esc(e.technique||'')}</small></span>
      <b style="color:var(--gold)">${esc(e.weight||'—')}</b></div>`;
    if (e.partnerName) h += `<div class="kv"><span>+ ${esc(e.partnerName)} <small style="color:var(--muted)">(super-set${e.partnerReps ? ' • ' + esc(e.partnerReps) + ' reps' : ''})</small></span>
      <b style="color:var(--gold)">${esc(e.partnerWeight||'—')}</b></div>`;
    if (e.notes) h += `<div class="sub" style="margin:-2px 0 6px">📝 ${esc(e.notes)}</div>`;
  });
  if (l.notes) h += `<div class="sub">📝 ${esc(l.notes)}</div>`;
  h += `<button class="btn danger" id="l-del">Excluir este treino</button><button class="btn" id="l-close">Fechar</button>`;
  openModal(h);
  $('#l-close').addEventListener('click', closeModal);
  $('#l-del').addEventListener('click', async () => {
    if (!confirm('Excluir este treino do histórico?')) return;
    await Store.deleteLog(id); S.logs = await Store.getLogs();
    closeModal(); renderHistorico(); savedToast('Treino excluído.');
  });
}

async function importSeed() {
  if (!confirm('Importar ' + SEED_HISTORY.length + ' registros da planilha para o seu histórico?')) return;
  toast('Importando histórico... ⏳');
  const byDate = {};
  SEED_HISTORY.forEach(([d, k, name, w]) => {
    (byDate[d] = byDate[d] || []).push({ name, variant: 'A', sets: '', reps: '', technique: '',
      weight: String(w).replace('.', ','), doneSets: 0, notes: '', seeded: true });
  });
  const dates = Object.keys(byDate).sort();
  let n = 0;
  for (const d of dates) {
    if (S.logs.some(l => l.log_date === d && l.day_label === 'Importado da planilha')) continue;
    await Store.saveLog({ log_date: d, day_label: 'Importado da planilha', entries: byDate[d], notes: '' });
    if (++n % 60 === 0) toast(`Importando... ${n}/${dates.length}`);
  }
  S.meta.seed_imported = true; await Store.saveMeta(S.meta);
  S.logs = await Store.getLogs();
  renderHistorico(); savedToast('Histórico importado! 📈 Veja sua progressão no gráfico.');
}

/* ================= CALENDARIO ================= */
function renderCalendario() {
  const now = new Date();
  if (S.calY == null) { S.calY = now.getFullYear(); S.calM = now.getMonth(); }
  const y = S.calY, m = S.calM;
  const first = new Date(y, m, 1);
  const startDow = first.getDay();
  const daysIn = new Date(y, m + 1, 0).getDate();
  const daysPrev = new Date(y, m, 0).getDate();
  const byDate = {};
  S.logs.forEach(l => { (byDate[l.log_date] = byDate[l.log_date] || []).push(l); });
  const monthName = first.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  const tISO = todayISO();
  let h = `<div class="card"><div class="cal-head">
    <button class="btn small" id="cal-prev">‹</button><h3>${monthName}</h3><button class="btn small" id="cal-next">›</button></div>
    <div class="cal-grid">${['D','S','T','Q','Q','S','S'].map(d => `<div class="cal-dow">${d}</div>`).join('')}`;
  for (let i = startDow; i > 0; i--) h += `<div class="cal-day dim">${daysPrev - i + 1}</div>`;
  for (let d = 1; d <= daysIn; d++) {
    const iso = `${y}-${pad(m + 1)}-${pad(d)}`;
    const has = byDate[iso] && byDate[iso].length;
    const cls = 'cal-day' + (iso === tISO ? ' today' : '') + (has ? ' has' : '') + (iso === S.calSel ? ' sel' : '');
    h += `<div class="${cls}" data-d="${iso}">${d}</div>`;
  }
  const trail = (7 - (startDow + daysIn) % 7) % 7;
  for (let d = 1; d <= trail; d++) h += `<div class="cal-day dim">${d}</div>`;
  h += `</div></div><div id="cal-daylist">${calDayList(byDate)}</div>`;
  $('#cal-content').innerHTML = h;
  $('#cal-prev').addEventListener('click', () => { const d = new Date(y, m - 1, 1); S.calY = d.getFullYear(); S.calM = d.getMonth(); renderCalendario(); });
  $('#cal-next').addEventListener('click', () => { const d = new Date(y, m + 1, 1); S.calY = d.getFullYear(); S.calM = d.getMonth(); renderCalendario(); });
  $$('#cal-content .cal-day[data-d]').forEach(el => el.addEventListener('click', () => { S.calSel = el.dataset.d; renderCalendario(); }));
  $$('#cal-daylist .log-item').forEach(el => el.addEventListener('click', () => openLog(el.dataset.id)));
}
function calDayList(byDate) {
  const iso = S.calSel || todayISO();
  const logs = byDate[iso] || [];
  let h = `<div class="card"><h3>${esc(fmtBR(iso))} <span class="sub">• ${esc(weekdayBR(iso))}</span></h3>`;
  if (!logs.length) h += `<div class="sub">Sem treino registrado neste dia.</div>`;
  logs.forEach(l => {
    h += `<div class="log-item" data-id="${l.id}"><div><b>${esc(l.day_label)}</b>
      <small>${l.entries.length} exercícios</small></div><div class="chev">›</div></div>`;
  });
  return h + `</div>`;
}

/* ================= PLANO ================= */
function renderPlano() {
  const days = S.plan.days;
  let h = `<div class="card"><div class="day-head"><h3>${esc(S.plan.name || 'Meu plano')}</h3>
    ${S.editPlan?'<span class="badge gold">editando</span>':''}</div>`;
  if (!S.editPlan) {
    days.forEach((d, di) => {
      h += `<div class="section-title">${esc(dayLabel(d))}</div>`;
      d.exercises.forEach((ex, ei) => {
        h += `<div class="kv"><span><b>${esc(ex.nameA)}</b><br>
          <small style="color:var(--muted)">B: ${esc(ex.nameB||'—')} • ${esc(ex.sets||'')}× ${esc(ex.reps||'')} • ${esc(ex.technique||'')}</small></span>
          <button class="yt-btn" data-ytday="${di}" data-ytex="${ei}" title="Ver vídeo no YouTube">▶️</button></div>`;
      });
    });
    h += `</div><div class="sub" style="text-align:center">O plano pode ser atualizado a qualquer momento — ex: a cada 3 meses. Toque em Editar.</div>`;
  } else {
    h += `<label class="lbl">Nome do plano</label><input id="p-name" value="${esc(S.plan.name||'')}">`;
    days.forEach((d, di) => {
      h += `<div class="section-title">${esc(d.day)} <button class="btn small danger" data-delday="${di}" style="display:inline-block">remover dia</button></div>
        <label class="lbl">Rótulo do dia</label><input data-day="${di}" data-f="day" value="${esc(d.day)}">
        <label class="lbl">Grupamento</label><input data-day="${di}" data-f="muscle" value="${esc(d.muscle||'')}">`;
      d.exercises.forEach((ex, ei) => {
        h += `<div class="plan-ex">
          <input data-day="${di}" data-ex="${ei}" data-f="nameA" value="${esc(ex.nameA||'')}" placeholder="Exercício — Plano A (principal)">
          <input data-day="${di}" data-ex="${ei}" data-f="nameB" value="${esc(ex.nameB||'')}" placeholder="Exercício — Plano B (alternativo)">
          <div class="row2">
            <input data-day="${di}" data-ex="${ei}" data-f="ytA" value="${esc(ex.ytA||'')}" placeholder="▶ Link YouTube — Plano A">
            <input data-day="${di}" data-ex="${ei}" data-f="ytB" value="${esc(ex.ytB||'')}" placeholder="▶ Link YouTube — Plano B">
          </div>
          <div class="row2">
            <input data-day="${di}" data-ex="${ei}" data-f="sets" value="${esc(ex.sets||'')}" placeholder="Séries">
            <input data-day="${di}" data-ex="${ei}" data-f="reps" value="${esc(ex.reps||'')}" placeholder="Reps">
          </div>
          <div class="row2">
            <input data-day="${di}" data-ex="${ei}" data-f="technique" value="${esc(ex.technique||'')}" placeholder="Técnica">
            <input data-day="${di}" data-ex="${ei}" data-f="rest" value="${esc(ex.rest||'')}" placeholder="Descanso (s)">
          </div>
          <div class="mini-btns">
            <button class="btn small" data-mv="-1" data-day="${di}" data-ex="${ei}">↑</button>
            <button class="btn small" data-mv="1" data-day="${di}" data-ex="${ei}">↓</button>
            <button class="btn small danger" data-delex="${ei}" data-day="${di}">remover</button>
          </div></div>`;
      });
      h += `<button class="btn small" data-addex="${di}">+ exercício</button>`;
    });
    h += `<button class="btn small" id="p-addday">+ dia</button><div class="divider"></div>
      <label class="lbl">Trocar pelo modelo pronto</label>
      <div class="row2"><button class="btn small" id="p-tpl6">Rotação A–F (6 treinos)</button>
      <button class="btn small" id="p-tpl3">A/B/C mesclado (3 treinos)</button></div>
      <button class="btn primary" id="p-save">Salvar plano ✓</button>
      <button class="btn" id="p-cancel">Cancelar</button></div>`;
  }
  $('#plano-content').innerHTML = h;
  $$('#plano-content .yt-btn').forEach(b => b.addEventListener('click', () => {
    const ex = S.plan.days[+b.dataset.ytday].exercises[+b.dataset.ytex];
    window.open(ytUrlFor(ex, 'A'), '_blank');
  }));
  $('#btn-plan-edit').textContent = S.editPlan ? 'Ver' : 'Editar';
  if (!S.editPlan) return;

  const collect = () => {
    const plan = { name: $('#p-name').value, days: [] };
    $$('#plano-content [data-day][data-f]').forEach(inp => {
      const di = +inp.dataset.day, f = inp.dataset.f;
      if (inp.dataset.ex === undefined) {
        plan.days[di] = plan.days[di] || { day:'', muscle:'', exercises: [] };
        plan.days[di][f] = inp.value;
      } else {
        const ei = +inp.dataset.ex;
        plan.days[di] = plan.days[di] || { day:'', muscle:'', exercises: [] };
        plan.days[di].exercises[ei] = plan.days[di].exercises[ei] || {};
        plan.days[di].exercises[ei][f] = inp.value;
      }
    });
    return plan;
  };

  $$('#plano-content [data-delex]').forEach(b => b.addEventListener('click', () => {
    const p = collect(); p.days[+b.dataset.day].exercises.splice(+b.dataset.delex, 1);
    S.plan = p; renderPlano();
  }));
  $$('#plano-content [data-delday]').forEach(b => b.addEventListener('click', () => {
    if (!confirm('Remover este dia do plano?')) return;
    const p = collect(); p.days.splice(+b.dataset.delday, 1); S.plan = p; renderPlano();
  }));
  $$('#plano-content [data-mv]').forEach(b => b.addEventListener('click', () => {
    const p = collect(); const di = +b.dataset.day, ei = +b.dataset.ex, mv = +b.dataset.mv;
    const arr = p.days[di].exercises; const ni = ei + mv;
    if (ni < 0 || ni >= arr.length) return;
    [arr[ei], arr[ni]] = [arr[ni], arr[ei]]; S.plan = p; renderPlano();
  }));
  $$('#plano-content [data-addex]').forEach(b => b.addEventListener('click', () => {
    const p = collect(); p.days[+b.dataset.addex].exercises.push({ nameA:'', nameB:'', sets:'3', reps:'10-12', technique:'', rest:'180' });
    S.plan = p; renderPlano();
  }));
  $('#p-addday').addEventListener('click', () => {
    const p = collect(); p.days.push({ day: 'Novo dia', muscle: '', exercises: [] }); S.plan = p; renderPlano();
  });
  $('#p-tpl6').addEventListener('click', () => { if (confirm('Substituir pelo modelo rotação A–F (6 treinos)?')) { S.plan = { name:'Rotação A–F', days: JSON.parse(JSON.stringify(PLAN_6DAY)) }; renderPlano(); } });
  $('#p-tpl3').addEventListener('click', () => { if (confirm('Substituir pelo modelo A/B/C mesclado (3 treinos)?')) { S.plan = { name:'Rotação A/B/C', days: JSON.parse(JSON.stringify(PLAN_3DAY)) }; renderPlano(); } });
  $('#p-save').addEventListener('click', async () => {
    try { const p = collect(); await Store.savePlan(p); S.plan = await Store.getPlan();
      S.editPlan = false; renderPlano(); renderHoje(); savedToast('Plano atualizado! ✓'); }
    catch(e){ toast('Erro: ' + e.message); }
  });
  $('#p-cancel').addEventListener('click', async () => { S.plan = await Store.getPlan(); S.editPlan = false; renderPlano(); });
}
$('#btn-plan-edit').addEventListener('click', () => { S.editPlan = !S.editPlan; renderPlano(); });

/* ================= CONTA ================= */
/* ================= RECADOS ================= */
// Cartao de ativacao das notificacoes push (pra recado chegar na hora, com app fechado)
function pushCard() {
  if (Store.mode !== 'cloud') return '';
  if (!Store.pushSupported())
    return `<div class="card push-card"><div class="sub">📵 Este aparelho/navegador não suporta notificações push.</div></div>`;
  const perm = Store.pushPermission();
  const iosHint = `<div class="sub hint-ios">No iPhone: adiciona o app à Tela de Início primeiro (Safari → Compartilhar → Adicionar à Tela de Início) 📲</div>`;
  if (perm === 'granted')
    return `<div class="card push-card"><div class="sub">🔔 <b>Notificações ativadas neste aparelho</b> — os recadinhos chegam na hora, mesmo com o app fechado. 💌</div></div>`;
  if (perm === 'denied')
    return `<div class="card push-card"><div class="sub">🔕 Notificações bloqueadas neste aparelho. Libera nas configurações do navegador/celular e volta aqui.</div>${iosHint}</div>`;
  return `<div class="card push-card">
    <div class="sub">Quer receber os recadinhos <b>na hora</b>, mesmo com o app fechado?</div>
    <button class="btn primary" id="push-enable">🔔 Ativar notificações</button>
    ${iosHint}
  </div>`;
}
function renderRecados() {
  const me = String(Store.user && Store.user.name || '').toLowerCase();
  const mine = (S.notes || []).filter(n => String(n.from_user_id) === String(Store.user && Store.user.id));
  const received = (S.notes || []).filter(n => String(n.from_user_id) !== String(Store.user && Store.user.id));
  const noteCard = n => {
    const canDel = String(n.from_user_id) === String(Store.user && Store.user.id);
    return `<div class="note ${canDel ? 'sent' : 'got'}">
      <div class="note-head"><b>💌 ${esc(n.from_name || '❤️')}</b><span>${esc(fmtDT(n.created_at))}</span></div>
      <div class="note-msg">${esc(n.message)}</div>
      ${canDel ? `<button class="btn small danger note-del" data-id="${esc(n.id)}">Apagar</button>` : ''}
    </div>`;
  };
  $('#recados-content').innerHTML = `
    ${pushCard()}
    <div class="card note-form">
      <h3>Escrever recadinho 💕</h3>
      <div class="sub">Com as notificações ativadas, ela(e) recebe push no celular na hora 📲 — e o recado também aparece aqui e no topo do treino de hoje.</div>
      <label class="lbl">Para quem</label>
      <input id="note-to" placeholder="Ex: Eliza" value="${esc(partnerDefault())}" maxlength="40">
      <label class="lbl">Mensagem</label>
      <textarea id="note-msg" rows="3" maxlength="500" placeholder="Escreve algo fofo pra motivar... 🥰"></textarea>
      <div class="chips">${NOTE_IDEAS.map(t => `<button class="chip" data-idea="${esc(t)}">${esc(t)}</button>`).join('')}</div>
      <button class="btn primary" id="note-send">Enviar recado 💌</button>
    </div>
    ${received.length ? `<h3 class="sec-t">Recebidos (${received.length})</h3>` + received.map(noteCard).join('') : ''}
    ${mine.length ? `<h3 class="sec-t">Enviados por você (${mine.length})</h3>` + mine.map(noteCard).join('') : ''}
    ${!received.length && !mine.length ? '<div class="card"><div class="sub">Nenhum recadinho ainda. Escreve o primeiro ali em cima! 💌</div></div>' : ''}`;

  $$('#recados-content .chip').forEach(c => c.addEventListener('click', () => {
    const ta = $('#note-msg'); ta.value = c.dataset.idea; ta.focus();
  }));
  $('#note-send').addEventListener('click', async () => {
    const to = $('#note-to').value, msg = $('#note-msg').value;
    try {
      await Store.saveNote(to, msg);
      S.notes = await Store.getNotes();
      renderRecados(); renderHoje();
      toast('Recadinho enviado! 💌');
    } catch (e) { toast(e.message || 'Não deu pra enviar 😕'); }
  });
  $$('#recados-content .note-del').forEach(b => b.addEventListener('click', async () => {
    if (!confirm('Apagar este recado?')) return;
    await Store.deleteNote(b.dataset.id);
    S.notes = await Store.getNotes();
    renderRecados(); renderHoje();
  }));
  const pe = $('#push-enable');
  if (pe) pe.addEventListener('click', async () => {
    pe.disabled = true; pe.textContent = 'Ativando... 🔔';
    try {
      await Store.enablePush();
      renderRecados();
      toast('Notificações ativadas! 🔔💌');
    } catch (e) {
      pe.disabled = false; pe.textContent = '🔔 Ativar notificações';
      toast(e.message || 'Não deu pra ativar 😕');
    }
  });
}
// banner do ultimo recado recebido no topo do Hoje
function noteBanner() {
  const rec = (S.notes || []).find(n => String(n.from_user_id) !== String(Store.user && Store.user.id));
  if (!rec) return '';
  return `<div class="card note-banner" id="note-banner">
    <div class="note-head"><b>💌 Recado de ${esc(rec.from_name || 'seu amor')}</b><span>${esc(fmtDT(rec.created_at))}</span></div>
    <div class="note-msg">${esc(rec.message)}</div>
    <button class="btn small" id="note-goto">Ver todos 💕</button>
  </div>`;
}
function wireNoteBanner() {
  const g = $('#note-goto');
  if (g) g.addEventListener('click', () => { showScreen('recados'); renderRecados(); });
}

/* ---------- semana de regeneração (deload a cada 8 semanas) ---------- */
// Conta 8 semanas desde o início do ciclo; quando vence, mostra um aviso
// no topo do treino sugerindo uma semana leve (~-25% de carga).
function deloadInfo() {
  const meta = S.meta || {};
  if (!meta.deload_start) {
    meta.deload_start = todayISO();
    try { Store.saveMeta(meta); } catch (e) {}
  }
  const d0 = new Date(meta.deload_start + 'T12:00:00').getTime();
  const days = Math.floor((Date.now() - d0) / 864e5);
  let snoozed = false;
  if (meta.deload_snooze) {
    const ds = new Date(meta.deload_snooze + 'T12:00:00').getTime();
    snoozed = Math.floor((Date.now() - ds) / 864e5) < 7;
  }
  return { due: days >= 56 && !snoozed, weeks: Math.floor(days / 7) };
}
function deloadBanner() {
  const info = deloadInfo();
  if (!info.due) return '';
  return `<div class="card" style="border-color:var(--gold)">
    <div class="day-head"><h3>💆 Semana de regeneração</h3><span class="badge gold">ciclo de 8 semanas</span></div>
    <div class="sub">Já faz <b>${info.weeks} semanas</b> de treino pesado. Que tal uma semana mais leve?
    Diminui as cargas em <b>~25%</b>, capricha na técnica e deixa o corpo se recuperar. 💙</div>
    <div class="row2">
      <button class="btn primary" id="btn-deload-done">✓ Fiz a semana leve</button>
      <button class="btn" id="btn-deload-later">Lembrar depois</button>
    </div></div>`;
}
function wireDeloadBanner() {
  const done = $('#btn-deload-done'), later = $('#btn-deload-later');
  if (done) done.addEventListener('click', async () => {
    S.meta.deload_start = todayISO(); delete S.meta.deload_snooze;
    try { await Store.saveMeta(S.meta); } catch (e) {}
    renderHoje(); toast('Ciclo reiniciado — te aviso de novo em 8 semanas 💆');
  });
  if (later) later.addEventListener('click', async () => {
    S.meta.deload_snooze = todayISO();
    try { await Store.saveMeta(S.meta); } catch (e) {}
    renderHoje(); toast('Combinado, te lembro em 1 semana ⏰');
  });
}

function renderConta() {
  const cloud = Store.mode === 'cloud';
  const cfg = Store.cfg;
  let h = `<div class="card"><h3>${esc(Store.user.name)}</h3>
    <div class="sub">${esc(Store.user.email)}</div>
    <span class="badge ${cloud?'':'dim'}">${cloud ? '☁️ conta na nuvem' : '📱 conta local'}</span></div>`;

  h += `<div class="card"><h3>Banco de dados (nuvem)</h3>
    <div class="sub">☁️ Nuvem já configurada — é só criar sua conta que tudo sincroniza entre o Android e o iPhone (e a conta da Eliza).</div>
    <label class="lbl">Supabase URL</label><input id="c-url" placeholder="https://xyz.supabase.co" value="${esc(cfg.url||'')}">
    <label class="lbl">Supabase anon key</label><input id="c-key" placeholder="cole a anon key" value="${esc(cfg.key||'')}">
    <button class="btn primary" id="c-save">Salvar conexão</button>
    <button class="btn" id="c-clear">Voltar ao padrão</button>
    <div class="sub">Só mexa aqui se um dia quiser trocar de projeto no Supabase.</div></div>`;

  h += `<div class="card"><h3>Backup</h3>
    <button class="btn" id="c-expjson">⬇ Exportar backup (JSON)</button>
    <button class="btn" id="c-expcsv">⬇ Exportar planilha (CSV)</button>
    <label class="lbl">Restaurar backup (JSON)</label><input type="file" id="c-imp" accept=".json">
    </div>`;

  h += `<div class="card"><h3>👥 Perfis neste aparelho</h3>
    <div class="sub">Troque entre o seu treino e o da Eliza sem precisar sair e entrar toda vez.</div>`;
  Store._savedSessions().forEach(p => {
    h += `<div class="kv"><span><b>${esc(p.name)}</b><br><small style="color:var(--muted)">${esc(p.email || '')}</small></span>
      <span style="display:flex;gap:6px;align-items:center">${p.userId === Store.user.id
        ? '<span class="badge">atual</span>'
        : `<button class="btn small" data-useprof="${p.userId}">usar</button>`}
      <button class="btn small danger" data-delprof="${p.userId}" title="Remover perfil">×</button></span></div>`;
  });
  h += `<button class="btn" id="c-addprof">＋ Adicionar perfil</button></div>`;

  h += `<div class="card"><h3>🎵 Spotify</h3>
    <div class="sub">Um botão na tela de treino abre sua playlist de academia com 1 toque. (O navegador não permite tocar música sozinho ao abrir o app.)</div>
    <label class="lbl">Link da playlist</label><input id="c-spotify" placeholder="https://open.spotify.com/playlist/..." value="${esc((S.meta&&S.meta.spotify_playlist)||DEFAULT_SPOTIFY)}">
    <button class="btn primary" id="c-spsave">Salvar playlist</button></div>`;

  h += `<button class="btn danger" id="c-logout">Sair da conta</button>`;
  h += `<div class="sub" style="text-align:center;margin-top:10px" id="app-ver">versão do app: ${APP_VERSION} — <span style="text-decoration:underline">toque para verificar atualização</span></div>`;
  $('#conta-content').innerHTML = h;
  const av = $('#app-ver');
  if (av) av.addEventListener('click', async () => {
    toast('Verificando atualização… ⏳');
    try {
      const reg = (S.swReg) || await navigator.serviceWorker.getRegistration();
      if (reg) await reg.update();
    } catch (e) { toast('Não foi possível verificar agora.'); }
  });

  $('#c-addprof').addEventListener('click', startAddProfile);
  $$('#conta-content [data-useprof]').forEach(b => b.addEventListener('click', async () => {
    toast('Trocando de perfil... ⏳');
    try { await Store.switchProfile(b.dataset.useprof); await enterApp(); }
    catch (e) { toast('Erro: ' + e.message); }
  }));
  $$('#conta-content [data-delprof]').forEach(b => b.addEventListener('click', async () => {
    const p = Store._savedSessions().find(x => x.userId === b.dataset.delprof);
    if (!confirm(`Remover o perfil "${p ? p.name : ''}" deste aparelho?`)) return;
    const wasCurrent = b.dataset.delprof === Store.user.id;
    Store.removeProfile(b.dataset.delprof);
    if (wasCurrent) {
      const rest = Store._savedSessions();
      if (rest.length) { try { await Store.switchProfile(rest[0].userId); } catch (e) {} await enterApp(); }
      else { await Store.signOut(); location.reload(); }
    } else { renderConta(); }
    toast('Perfil removido.');
  }));

  $('#c-spsave').addEventListener('click', async () => {
    S.meta.spotify_playlist = $('#c-spotify').value.trim();
    try { await Store.saveMeta(S.meta); savedToast('Playlist salva! 🎵'); }
    catch(e){ toast('Erro: ' + e.message); }
  });

  $('#c-save').addEventListener('click', () => {
    const url = $('#c-url').value.trim(), key = $('#c-key').value.trim();
    if (!url || !key) { toast('Cole a URL e a anon key.'); return; }
    Store.saveSbConfig(url, key);
    toast('Nuvem conectada! Saia e entre de novo para usar a conta na nuvem. ☁️');
    renderConta();
  });
  const cc = $('#c-clear'); if (cc) cc.addEventListener('click', () => {
    localStorage.removeItem('casalnavy.sbconfig'); Store.cfg = {...DEFAULT_SB}; SB.configure(Store.cfg.url, Store.cfg.key); renderConta(); toast('Conexão padrão restaurada. ☁️');
  });
  $('#c-expjson').addEventListener('click', async () => {
    const data = { app: 'casal-navy', user: Store.user.name, exported_at: new Date().toISOString(),
      plan: await Store.getPlan(), logs: await Store.getLogs(), meta: await Store.getMeta() };
    download('casal-navy-backup.json', JSON.stringify(data), 'application/json');
  });
  $('#c-expcsv').addEventListener('click', async () => {
    const logs = await Store.getLogs();
    const rows = [['Data','Dia da Semana','Grupamento','Exercicio','Variante','Series','Repeticoes','Tecnica','Carga (lbs)','Series feitas','Observacoes']];
    logs.forEach(l => l.entries.forEach(e => rows.push([
      fmtBR(l.log_date), weekdayBR(l.log_date), l.day_label, e.name, e.variant||'A',
      e.sets||'', e.reps||'', e.technique||'', e.weight||'', e.doneSets||'', (e.notes||'').replace(/\n/g,' ')])));
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(';')).join('\n');
    download('casal-navy-historico.csv', '﻿' + csv, 'text/csv');
  });
  $('#c-imp').addEventListener('change', async e => {
    const f = e.target.files[0]; if (!f) return;
    try {
      const data = JSON.parse(await f.text());
      if (!data.plan || !data.logs) throw new Error('Arquivo inválido.');
      if (!confirm('Substituir plano e histórico atuais pelos do backup?')) return;
      await Store.savePlan({ name: data.plan.name, days: data.plan.days });
      for (const l of data.logs) await Store.saveLog({ log_date: l.log_date, day_label: l.day_label, entries: l.entries, notes: l.notes||'' });
      if (data.meta) await Store.saveMeta(data.meta);
      S.plan = await Store.getPlan(); S.logs = await Store.getLogs(); S.meta = await Store.getMeta();
      renderHoje(); renderHistorico(); renderPlano(); savedToast('Backup restaurado! ✓');
    } catch(err){ toast('Erro: ' + err.message); }
  });
  $('#c-logout').addEventListener('click', async () => {
    if (!confirm('Sair deste perfil? (os outros perfis continuam salvos no aparelho)')) return;
    await Store.signOut(); location.reload();
  });
}

function download(name, content, type) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([content], { type }));
  a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

/* ---------- auth events ---------- */
$$('#screen-auth .tab').forEach(t => t.addEventListener('click', () => {
  $$('#screen-auth .tab').forEach(x => x.classList.remove('active')); t.classList.add('active');
  $('#auth-login').classList.toggle('hidden', t.dataset.authtab !== 'login');
  $('#auth-signup').classList.toggle('hidden', t.dataset.authtab !== 'signup');
  $('#auth-err').textContent = '';
}));
async function authGo(fn) {
  $('#auth-err').textContent = '';
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    $('#auth-err').textContent = 'Sem internet 📶 — conecte-se para entrar na primeira vez.';
    return;
  }
  try { await fn(); S.addingProfile = false; $('#auth-cancel').classList.add('hidden'); await enterApp(); }
  catch(e){ $('#auth-err').textContent = e.message || 'Erro. Tente de novo.'; }
}
$('#auth-cancel').addEventListener('click', () => {
  S.addingProfile = false; $('#auth-cancel').classList.add('hidden'); enterApp();
});
$('#btn-login').addEventListener('click', () => authGo(() => Store.signIn($('#login-email').value, $('#login-pass').value)));
$('#btn-signup').addEventListener('click', () => authGo(() => Store.signUp($('#su-name').value, $('#su-email').value, $('#su-pass').value)));

/* ---------- nav ---------- */
$$('#tabbar button').forEach(b => b.addEventListener('click', () => {
  const s = b.dataset.screen; showScreen(s);
  if (s === 'hoje') renderHoje(); if (s === 'historico') renderHistorico();
  if (s === 'plano') renderPlano(); if (s === 'conta') renderConta();
  if (s === 'calendario') renderCalendario();
}));

document.addEventListener('DOMContentLoaded', boot);
