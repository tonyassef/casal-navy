/* Casal Navy — logica do app (vanilla JS, sem dependencias) */
'use strict';

/* ---------- helpers ---------- */
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
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
function openModal(html) { $('#modal-card').innerHTML = html; $('#modal').classList.remove('hidden'); }
function closeModal() { $('#modal').classList.add('hidden'); }
$('#modal').addEventListener('click', e => { if (e.target.id === 'modal') closeModal(); });

/* ---------- estado ---------- */
const S = {
  plan: null, logs: [], meta: { rotation_index: 0 },
  draft: null,           // treino em andamento
  todayIdx: 0, todayDate: todayISO(),
  editPlan: false,
};

function draftKey() { return 'casalnavy.draft.' + Store.user.id; }
function loadDraft() { try { S.draft = JSON.parse(localStorage.getItem(draftKey())); } catch(e){ S.draft = null; } }
function saveDraft() { localStorage.setItem(draftKey(), JSON.stringify(S.draft)); }
function clearDraft() { localStorage.removeItem(draftKey()); S.draft = null; }

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
  if ('serviceWorker' in navigator) { navigator.serviceWorker.register('sw.js').catch(()=>{}); }
}

function showScreen(name) {
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
  loadDraft();
  S.todayDate = todayISO();
  const n = S.plan.days.length || 1;
  S.todayIdx = ((S.meta.rotation_index || 0) % n + n) % n;
  if (S.draft && S.draft.logDate !== S.todayDate) { /* mantem rascunho de outro dia */ }
  renderHoje(); renderHistorico(); renderPlano(); renderConta();
  showScreen('hoje');
}

/* ================= HOJE ================= */
function dayLabel(d) { return d.day + (d.muscle ? ' — ' + d.muscle : ''); }

function renderHoje() {
  const days = S.plan.days;
  if (!days.length) { $('#hoje-content').innerHTML = '<div class="card">Nenhum dia no plano. Vá em Plano para montar.</div>'; return; }
  const d = days[S.todayIdx];
  const draft = S.draft;
  const isDraftDay = draft && draft.dayIdx === S.todayIdx && draft.logDate === S.todayDate;

  let h = `<div class="card"><div class="day-head">
      <h3>${esc(dayLabel(d))}</h3><span class="badge">${esc(S.todayDate ? fmtBR(S.todayDate) : '')}</span>
    </div>
    <div class="sub">${d.exercises.length} exercícios • descanso padrão 3 min</div>
    <label class="lbl">Data do treino</label>
    <input type="date" id="hoje-logdate" value="${esc(S.todayDate)}">
    <label class="lbl">Treinar outro dia do plano</label>
    <select id="hoje-daypick">${days.map((x,i)=>`<option value="${i}" ${i===S.todayIdx?'selected':''}>${esc(dayLabel(x))}</option>`).join('')}</select>
  </div>`;

  d.exercises.forEach((ex, i) => {
    const st = isDraftDay && draft.entries[i];
    const done = st && st.doneSets && st.doneSets.length && st.doneSets.every(Boolean) && st.doneSets.length >= parseInt(st.sets || ex.sets || 0);
    const w = st && st.weight ? esc(st.weight) : '';
    h += `<div class="ex ${done?'done':''}" data-ex="${i}">
      <div class="num">${done ? '✓' : (i+1)}</div>
      <div class="info"><b>${esc(st && st.variant === 'B' && ex.nameB ? ex.nameB : ex.nameA)}</b>
      <small>${esc(ex.sets||'')}× ${esc(ex.reps||'')} • ${esc(ex.technique||'')}</small></div>
      ${w?`<div class="w">${w}</div>`:''}<div class="chev">›</div></div>`;
  });

  h += `<button class="btn primary" id="btn-finish">Concluir treino ✓</button>
        <button class="btn" id="btn-discard" style="${isDraftDay?'':'display:none'}">Descartar rascunho</button>`;
  $('#hoje-content').innerHTML = h;
  $('#hoje-date').textContent = weekdayBR(S.todayDate);

  $('#hoje-logdate').addEventListener('change', e => { S.todayDate = e.target.value || todayISO(); ensureDraft(); renderHoje(); });
  $('#hoje-daypick').addEventListener('change', e => { S.todayIdx = +e.target.value; clearDraft(); renderHoje(); });
  $$('#hoje-content .ex').forEach(el => el.addEventListener('click', () => openExercise(+el.dataset.ex)));
  $('#btn-finish').addEventListener('click', finishWorkout);
  $('#btn-discard').addEventListener('click', () => { clearDraft(); renderHoje(); toast('Rascunho descartado.'); });
}

function ensureDraft() {
  if (!S.draft || S.draft.dayIdx !== S.todayIdx || S.draft.logDate !== S.todayDate) {
    S.draft = { dayIdx: S.todayIdx, logDate: S.todayDate, entries: {}, notes: '' };
    saveDraft();
  }
}

function openExercise(i) {
  ensureDraft();
  const ex = S.plan.days[S.todayIdx].exercises[i];
  const st = S.draft.entries[i] || { variant: 'A', weight: '', doneSets: [], notes: '', sets: ex.sets, reps: ex.reps, technique: ex.technique, rest: ex.rest };
  const nSets = Math.max(1, parseInt(st.sets || ex.sets || '3', 10) || 3);
  while (st.doneSets.length < nSets) st.doneSets.push(false);
  const name = st.variant === 'B' && ex.nameB ? ex.nameB : ex.nameA;

  openModal(`
    <h3>${esc(name)}</h3>
    <div class="sub">${esc(S.plan.days[S.todayIdx].muscle || '')}</div>
    ${ex.nameB ? `<div class="ab-toggle">
      <button class="${st.variant==='A'?'active':''}" data-v="A">Plano A<br><small>${esc(ex.nameA)}</small></button>
      <button class="${st.variant==='B'?'active':''}" data-v="B">Plano B<br><small>${esc(ex.nameB)}</small></button>
    </div>` : `<div class="kv"><span>Plano A</span><b>${esc(ex.nameA)}</b></div>`}
    <div class="row2">
      <div><label class="lbl">Séries</label><input id="m-sets" value="${esc(st.sets || ex.sets || '')}"></div>
      <div><label class="lbl">Reps</label><input id="m-reps" value="${esc(st.reps || ex.reps || '')}"></div>
    </div>
    <label class="lbl">Técnica</label><input id="m-tech" value="${esc(st.technique || ex.technique || '')}">
    <div class="row2">
      <div><label class="lbl">Descanso (seg)</label><input id="m-rest" type="number" value="${esc(st.rest || ex.rest || 180)}"></div>
      <div><label class="lbl">Carga (lbs) — ex: 70/55/40/25</label><input id="m-weight" inputmode="decimal" value="${esc(st.weight)}" placeholder="peso usado"></div>
    </div>
    <label class="lbl">Séries concluídas</label>
    <div class="sets-row" id="m-setsrow">${st.doneSets.map((d,k)=>`<button class="set-chip ${d?'on':''}" data-k="${k}">${k+1}</button>`).join('')}</div>
    <button class="btn" id="m-timer">⏱ Descansar</button>
    <label class="lbl">Observações</label>
    <textarea id="m-notes" rows="2" placeholder="ex: dor no ombro, máquina ocupada...">${esc(st.notes)}</textarea>
    <button class="btn primary" id="m-save">Salvar exercício</button>
    <button class="btn" id="m-close">Voltar</button>`);

  $$('#modal-card .ab-toggle button').forEach(b => b.addEventListener('click', () => {
    st.variant = b.dataset.v; S.draft.entries[i] = st; saveDraft(); openExercise(i);
  }));
  $('#m-sets').addEventListener('change', e => {
    st.sets = e.target.value;
    const n = Math.max(1, parseInt(st.sets, 10) || 3);
    st.doneSets = Array.from({length:n}, (_,k)=>st.doneSets[k]||false);
    S.draft.entries[i]=st; saveDraft(); openExercise(i);
  });
  $$('#m-setsrow .set-chip').forEach(c => c.addEventListener('click', () => {
    const k = +c.dataset.k; st.doneSets[k] = !st.doneSets[k]; c.classList.toggle('on', st.doneSets[k]);
  }));
  $('#m-timer').addEventListener('click', () => {
    st.reps=$('#m-reps').value; st.technique=$('#m-tech').value; st.rest=$('#m-rest').value;
    st.weight=$('#m-weight').value; st.notes=$('#m-notes').value;
    S.draft.entries[i]=st; saveDraft(); openTimer(parseInt(st.rest,10)||180, ()=>openExercise(i));
  });
  $('#m-save').addEventListener('click', () => {
    st.sets=$('#m-sets').value; st.reps=$('#m-reps').value; st.technique=$('#m-tech').value;
    st.rest=$('#m-rest').value; st.weight=$('#m-weight').value; st.notes=$('#m-notes').value;
    S.draft.entries[i]=st; saveDraft(); closeModal(); renderHoje(); toast('Exercício salvo ✓');
  });
  $('#m-close').addEventListener('click', closeModal);
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
      weight: st.weight, doneSets: st.doneSets.filter(Boolean).length, notes: st.notes };
  }).filter(e => e.weight || e.doneSets > 0 || e.notes);
  if (!entries.length) { toast('Marque ao menos um exercício antes de concluir.'); return; }
  const log = { log_date: S.draft.logDate, day_label: dayLabel(d), entries,
    notes: S.draft.notes || '' };
  try {
    await Store.saveLog(log);
    const n = S.plan.days.length || 1;
    S.meta.rotation_index = ((S.meta.rotation_index || 0) + 1);
    await Store.saveMeta(S.meta);
    S.logs = await Store.getLogs();
    clearDraft();
    S.todayIdx = (((S.meta.rotation_index) % n) + n) % n;
    renderHoje(); renderHistorico();
    toast('Treino salvo! Próximo: ' + dayLabel(S.plan.days[S.todayIdx]) + ' 💪');
  } catch(e){ toast('Erro ao salvar: ' + e.message); }
}

/* ================= HISTORICO ================= */
function renderHistorico() {
  let h = `<div class="card"><h3>Progressão por exercício</h3>
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

  // preenche select de exercicios
  const names = {};
  S.logs.forEach(l => l.entries.forEach(e => { const k = normName(e.name); if (k && !names[k]) names[k] = e.name; }));
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
    if (normName(e.name) !== key) return;
    const m = maxLoad(e.weight); if (m == null) return;
    pts.push({ d: l.log_date, w: m });
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
  ctx.strokeStyle = '#1e3358'; ctx.fillStyle = '#8fa3c0'; ctx.font = '11px sans-serif';
  [mn, (mn+mx)/2, mx].forEach(v => { const y = py(v);
    ctx.beginPath(); ctx.moveTo(36,y); ctx.lineTo(W-8,y); ctx.stroke();
    ctx.fillText(String(Math.round(v*10)/10), 4, y+4); });
  ctx.beginPath();
  pts.forEach((p,i)=>{ const x=px(i), y=py(p.w); i?ctx.lineTo(x,y):ctx.moveTo(x,y); });
  ctx.strokeStyle = '#4da3ff'; ctx.lineWidth = 2.5; ctx.stroke();
  pts.forEach((p,i)=>{ const x=px(i), y=py(p.w);
    ctx.beginPath(); ctx.arc(x,y,3.5,0,7); ctx.fillStyle = '#f5b942'; ctx.fill(); });
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
    if (e.notes) h += `<div class="sub" style="margin:-2px 0 6px">📝 ${esc(e.notes)}</div>`;
  });
  if (l.notes) h += `<div class="sub">📝 ${esc(l.notes)}</div>`;
  h += `<button class="btn danger" id="l-del">Excluir este treino</button><button class="btn" id="l-close">Fechar</button>`;
  openModal(h);
  $('#l-close').addEventListener('click', closeModal);
  $('#l-del').addEventListener('click', async () => {
    if (!confirm('Excluir este treino do histórico?')) return;
    await Store.deleteLog(id); S.logs = await Store.getLogs();
    closeModal(); renderHistorico(); toast('Treino excluído.');
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
  renderHistorico(); toast('Histórico importado! 📈 Veja sua progressão no gráfico.');
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
          <small style="color:var(--muted)">B: ${esc(ex.nameB||'—')} • ${esc(ex.sets||'')}× ${esc(ex.reps||'')} • ${esc(ex.technique||'')}</small></span></div>`;
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
      S.editPlan = false; renderPlano(); renderHoje(); toast('Plano atualizado! ✓'); }
    catch(e){ toast('Erro: ' + e.message); }
  });
  $('#p-cancel').addEventListener('click', async () => { S.plan = await Store.getPlan(); S.editPlan = false; renderPlano(); });
}
$('#btn-plan-edit').addEventListener('click', () => { S.editPlan = !S.editPlan; renderPlano(); });

/* ================= CONTA ================= */
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

  h += `<button class="btn danger" id="c-logout">Sair da conta</button>`;
  $('#conta-content').innerHTML = h;

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
      renderHoje(); renderHistorico(); renderPlano(); toast('Backup restaurado! ✓');
    } catch(err){ toast('Erro: ' + err.message); }
  });
  $('#c-logout').addEventListener('click', async () => {
    if (!confirm('Sair da conta?')) return;
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
  try { await fn(); await enterApp(); }
  catch(e){ $('#auth-err').textContent = e.message || 'Erro. Tente de novo.'; }
}
$('#btn-login').addEventListener('click', () => authGo(() => Store.signIn($('#login-email').value, $('#login-pass').value)));
$('#btn-signup').addEventListener('click', () => authGo(() => Store.signUp($('#su-name').value, $('#su-email').value, $('#su-pass').value)));

/* ---------- nav ---------- */
$$('#tabbar button').forEach(b => b.addEventListener('click', () => {
  const s = b.dataset.screen; showScreen(s);
  if (s === 'hoje') renderHoje(); if (s === 'historico') renderHistorico();
  if (s === 'plano') renderPlano(); if (s === 'conta') renderConta();
}));

document.addEventListener('DOMContentLoaded', boot);
