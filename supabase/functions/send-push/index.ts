// Supabase Edge Function: send-push
// Disparada por webhook de INSERT em couple_notes.
// Localiza o destinatario (tolerante a Eliza ~ Elizama), busca as
// inscricoes push dele(a) e envia a notificacao via Web Push (VAPID).
//
// Secrets necessarios (Edge Function secrets):
//   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY
// (SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY ja existem por padrao.)

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import webpush from "npm:web-push@3.6.7";

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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const payload = await req.json().catch(() => ({}));
    const rec = payload.record || {};
    const toName = String(rec.to_name || "").trim();
    const fromName = String(rec.from_name || "").trim() || "Seu amor";
    const message = String(rec.message || "").trim().slice(0, 140);
    if (!toName || !message) return json({ skipped: "empty" });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Localiza o destinatario de forma tolerante (ex.: "Eliza" encontra "Elizama")
    const { data: profiles, error: pErr } = await supabase.from("profiles").select("id,name");
    if (pErr) throw pErr;
    const tn = toName.toLowerCase();
    const targets = (profiles || []).filter((p: { name?: string }) => {
      const n = String(p.name || "").toLowerCase().trim();
      return n !== "" && (n === tn || n.startsWith(tn) || tn.startsWith(n));
    });
    if (!targets.length) return json({ skipped: "no-recipient", toName });

    const { data: subs, error: sErr } = await supabase
      .from("push_subscriptions")
      .select("endpoint,subscription")
      .in("user_id", targets.map((t: { id: string }) => t.id));
    if (sErr) throw sErr;
    if (!subs || !subs.length) return json({ skipped: "no-subscription", toName });

    webpush.setVapidDetails(
      "mailto:casal-navy@tonyassef.app",
      Deno.env.get("VAPID_PUBLIC_KEY")!,
      Deno.env.get("VAPID_PRIVATE_KEY")!
    );

    const data = JSON.stringify({
      title: `💌 Recado de ${fromName}`,
      body: message,
    });

    let sent = 0;
    let removed = 0;
    for (const s of subs as { endpoint: string; subscription: unknown }[]) {
      try {
        // deno-lint-ignore no-explicit-any
        await webpush.sendNotification(s.subscription as any, data);
        sent++;
      } catch (e: unknown) {
        // deno-lint-ignore no-explicit-any
        const code = (e as any)?.statusCode;
        if (code === 404 || code === 410) {
          // inscricao expirada: limpa pra nao tentar de novo
          await supabase.from("push_subscriptions").delete().eq("endpoint", s.endpoint);
          removed++;
        }
      }
    }
    return json({ sent, removed });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return json({ error: msg }, 500);
  }
});
