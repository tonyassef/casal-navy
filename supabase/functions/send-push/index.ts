// Supabase Edge Function: send-push
// Disparada por webhooks de INSERT em couple_notes (recado-push)
// e em gym_checkins (checkin-push).
// - recado normal  -> "💌 Recado de {nome}"
// - resposta       -> "↩️ {nome} respondeu seu recado"
// - check-in       -> "💪 Check-in na academia" para o outro do casal
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

// Envia o push para as inscricoes dos userIds; limpa inscricoes expiradas.
async function pushToUserIds(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  userIds: string[],
  title: string,
  body: string,
) {
  const { data: subs, error: sErr } = await supabase
    .from("push_subscriptions")
    .select("endpoint,subscription")
    .in("user_id", userIds);
  if (sErr) throw sErr;
  if (!subs || !subs.length) return { sent: 0, removed: 0, skipped: "no-subscription" };

  webpush.setVapidDetails(
    "mailto:casal-navy@tonyassef.app",
    Deno.env.get("VAPID_PUBLIC_KEY")!,
    Deno.env.get("VAPID_PRIVATE_KEY")!,
  );

  const data = JSON.stringify({ title, body });
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
  return { sent, removed };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const payload = await req.json().catch(() => ({}));
    const table = String(payload.table || "");
    const rec = payload.record || {};

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // ---------- check-in / check-out na academia: avisa o outro do casal ----------
    if (table === "gym_checkins") {
      const fromId = String(rec.user_id || "");
      const fromName = String(rec.user_name || "").trim() || "Seu amor";
      const isOut = String(rec.type || "in") === "out";
      if (!fromId) return json({ skipped: "empty" });
      const { data: profiles, error: pErr } = await supabase.from("profiles").select("id");
      if (pErr) throw pErr;
      const targets = (profiles || [])
        .map((p: { id: string }) => p.id)
        .filter((id: string) => id && id !== fromId);
      if (!targets.length) return json({ skipped: "no-recipient" });
      const title = isOut ? "🏁 Check-out da academia" : "💪 Check-in na academia";
      const body = isOut
        ? `${fromName} saiu da academia! Treino pago? 💪😌`
        : `${fromName} chegou na academia! Bora treinar 🔥`;
      const r = await pushToUserIds(supabase, targets, title, body);
      return json({ kind: isOut ? "checkout" : "checkin", ...r });
    }

    // ---------- recadinhos: novo recado ou resposta ----------
    const toName = String(rec.to_name || "").trim();
    const fromName = String(rec.from_name || "").trim() || "Seu amor";
    const message = String(rec.message || "").trim().slice(0, 140);
    if (!toName || !message) return json({ skipped: "empty" });

    // Localiza o destinatario de forma tolerante (ex.: "Eliza" encontra "Elizama")
    const { data: profiles, error: pErr } = await supabase.from("profiles").select("id,name");
    if (pErr) throw pErr;
    const tn = toName.toLowerCase();
    const targets = (profiles || []).filter((p: { name?: string }) => {
      const n = String(p.name || "").toLowerCase().trim();
      return n !== "" && (n === tn || n.startsWith(tn) || tn.startsWith(n));
    });
    if (!targets.length) return json({ skipped: "no-recipient", toName });

    const isReply = !!rec.parent_id;
    const title = isReply ? `↩️ ${fromName} respondeu seu recado` : `💌 Recado de ${fromName}`;
    const r = await pushToUserIds(
      supabase,
      targets.map((t: { id: string }) => t.id),
      title,
      message,
    );
    return json({ kind: isReply ? "reply" : "note", ...r });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return json({ error: msg }, 500);
  }
});
