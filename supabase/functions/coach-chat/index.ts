// Supabase Edge Function: coach-chat
// Chat do Coach Jarvis dentro do app Casal Navy.
// Recebe a mensagem + contexto do plano e responde via Anthropic.
//
// Secrets necessários (Edge Function secrets):
//   ANTHROPIC_API_KEY
// (SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY já existem por padrão.)

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const MODEL = "claude-haiku-4-5";

function buildSystem(userName: string, plan: any): string {
  const days = (plan?.days || []).join(" | ") || "não informado";
  const exs = (plan?.exercises || [])
    .map((e: any) => `- ${e.a || ""}${e.b ? " / " + e.b : ""} — ${e.sets || ""}× ${e.reps || ""}${e.technique ? ", " + e.technique : ""}`)
    .join("\n") || "não informado";
  return `Você é o Jarvis, o coach pessoal do app Casal Navy (musculação para casais).
Fale português, direto e casual, como um parceiro de treino animado. Respostas curtas (2 a 4 frases), só alongue se pedirem detalhe.
Você conhece técnicas de musculação (rest-pause, drop-set, super-set, pirâmide, etc.) e o plano abaixo.

[Contexto]
Usuário: ${userName || "atleta"}
Treino de hoje: ${plan?.today || "não informado"}
Exercícios de hoje:
${exs}
Dias do plano: ${days}

Se o usuário pedir para TROCAR um exercício do plano, confirme de forma breve E inclua ao final um bloco exatamente assim:
\`\`\`action
{"type":"swap_exercise","day":"<rótulo do dia como no plano>","from":"<nome atual do exercício>","to":"<novo exercício>"}
\`\`\`
Use dia e nomes exatamente como aparecem no plano. Só inclua o bloco quando a troca estiver clara (dia + exercício atual + novo). Sem o bloco, é só conversa.`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = req.headers.get("authorization") || "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    // só usuário logado do app pode usar
    const { data: uData, error: uErr } = await supabase.auth.getUser(auth.replace(/^Bearer\s+/i, ""));
    if (uErr || !uData?.user) return json({ error: "Não autenticado." }, 401);

    const apiKey = Deno.env.get("ANTHROPIC_API_KEY") || "";
    if (!apiKey) return json({ error: "Coach ainda não configurado. Fale com o Tony. 🤖" }, 503);

    const payload = await req.json().catch(() => ({}));
    const message = String(payload.message || "").slice(0, 1000).trim();
    if (!message) return json({ error: "Mensagem vazia." }, 400);
    const history = Array.isArray(payload.history) ? payload.history.slice(-12) : [];
    const userName = String(payload.userName || "").slice(0, 40);

    const messages: any[] = [];
    for (const m of history) {
      const role = m.role === "assistant" ? "assistant" : "user";
      const text = String(m.text || "").slice(0, 1000);
      if (text) messages.push({ role, content: text });
    }
    messages.push({ role: "user", content: message });

    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 600,
        system: buildSystem(userName, payload.plan),
        messages,
      }),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      const msg = data?.error?.message || ("Anthropic HTTP " + r.status);
      return json({ error: "Falha no coach: " + msg }, 502);
    }
    let reply = ((data.content || []).filter((b: any) => b.type === "text").map((b: any) => b.text).join("\n") || "").trim();
    let action: any = null;
    const m = reply.match(/```action\s*([\s\S]*?)```/);
    if (m) {
      try { action = JSON.parse(m[1].trim()); } catch (e) { action = null; }
      reply = reply.replace(m[0], "").trim();
    }
    if (!reply) reply = "Hmm, não entendi. Pode repetir? 💪";
    return json({ reply, action });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return json({ error: msg }, 500);
  }
});
