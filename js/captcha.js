// captcha.js — #33 da auditoria: captcha anti-robô (Cloudflare
// Turnstile) nos formulários públicos do Auth (entrar, criar
// conta, link mágico, recuperar senha, convite), verificado pelo
// Supabase Auth.
//
// DESLIGADO por padrão: SITE_KEY vazia = token() devolve null e
// korpusCaptchaToken() devolve undefined SEMPRE — o sb.js só inclui
// captcha_token na requisição quando recebe um token, então os
// fluxos são EXATAMENTE os de hoje.
//
// ESTADO (2026-11-07): a SITE_KEY foi PREENCHIDA (widget
// Turnstile "KORPUS" criado no Cloudflare com os domínios do
// site; a SECRET já está no painel do Supabase com a proteção
// DESLIGADA). Esta árvore NÃO publica sozinha — o preenchimento
// só vai ao ar no commit da versão web nova, na janela de
// lançamento; a partir daí o cliente pede o token e o servidor
// ainda ignora, até ligarem a proteção no painel.
//
// A virada é na janela de lançamento, junto com a versão nova
// (ver o runbook da próxima versão):
// 1. widget Turnstile criado e SITE key colada aqui (2026-11-07);
// 2. LIGAR a proteção no painel do Supabase (Authentication →
//    Bot and Abuse Protection → CAPTCHA; a SECRET já está lá).
// Sem os dois lados juntos o login quebra (servidor exige e o app
// não manda) ou o captcha é decorativo (app manda e o servidor
// ignora). Apps ANTIGOS não mandam token: é por isso que a
// proteção só liga quando a versão nova já está nas lojas.
window.KorpusCaptcha = (() => {
  const SITE_KEY = '0x4AAAAAAF4e9fkh6AKIdzHa';
  let apiPromise = null;

  function enabled() { return SITE_KEY.trim() !== ''; }

  function loadApi() {
    if (window.turnstile) return Promise.resolve(window.turnstile);
    if (!apiPromise) {
      apiPromise = new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
        s.async = true;
        s.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error('turnstile indisponível')));
        s.onerror = () => reject(new Error('turnstile indisponível'));
        document.head.appendChild(s);
      });
    }
    return apiPromise;
  }

  // Abre o desafio numa caixa modal simples e resolve o token.
  // Qualquer falha (rede, expirou, fechou, 60s) resolve null.
  async function token() {
    if (!enabled()) return null;
    try {
      const ts = await loadApi();
      return await new Promise((resolve) => {
        const box = document.createElement('div');
        box.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.65);display:flex;align-items:center;justify-content:center;z-index:99999';
        const inner = document.createElement('div');
        box.appendChild(inner);
        document.body.appendChild(box);
        let done = false;
        const finish = (v) => {
          if (done) return;
          done = true;
          try { box.remove(); } catch (e) { /* já removida */ }
          resolve(v);
        };
        ts.render(inner, {
          sitekey: SITE_KEY,
          theme: 'dark',
          callback: (t) => finish(t),
          'error-callback': () => finish(null),
          'expired-callback': () => finish(null),
          'timeout-callback': () => finish(null),
        });
        box.addEventListener('click', (e) => { if (e.target === box) finish(null); });
        setTimeout(() => finish(null), 60000);
      });
    } catch (e) { return null; }
  }

  return { SITE_KEY, enabled, token };
})();

// Atalho pros chamadores (store.js/app.js): desligado → undefined
// (sb.js omite o campo e nada muda); ligado e resolvido → o token;
// ligado e FALHOU → lança erro amigável, porque tentar sem token
// só trocaria a mensagem por um erro cru do servidor.
window.korpusCaptchaToken = async () => {
  if (!window.KorpusCaptcha.enabled()) return undefined;
  const t = await window.KorpusCaptcha.token();
  if (!t) throw new Error('Não deu pra concluir a verificação anti-robô. Tenta de novo.');
  return t;
};
