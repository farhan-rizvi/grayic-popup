// Admin endpoint for the popup widget's settings (singleton row in public.popup_settings).
// GET  -> full settings (admin-token gated).
// POST -> partial update (admin-token gated). Body = JSON of fields to change.
//
// Required secret on this function:
//   POPUP_ADMIN_TOKEN  - shared admin token; send as `x-admin-token` header.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, x-admin-token",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const ALLOWED_FIELDS = new Set([
  "enabled", "position", "interval_ms", "duration_ms", "feed_limit",
  "refresh_ms", "exclude_sources", "show_country", "show_time_ago", "show_verified",
  "accent_from", "accent_to", "name_fallback", "product_fallback",
]);

const VALID_POSITIONS = new Set(["bottom-left", "bottom-right", "top-left", "top-right"]);
const HEX = /^#[0-9a-fA-F]{6}$/;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  const expected = Deno.env.get("POPUP_ADMIN_TOKEN");
  if (!expected) return json({ error: "POPUP_ADMIN_TOKEN not configured" }, 500);
  if (req.headers.get("x-admin-token") !== expected) return json({ error: "Unauthorized" }, 401);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  if (req.method === "GET") {
    const { data, error } = await supabase.from("popup_settings").select("*").limit(1).maybeSingle();
    if (error) return json({ error: error.message }, 500);
    return json(data ?? {}, 200);
  }

  if (req.method === "POST") {
    let body: Record<string, unknown>;
    try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }

    const update: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(body)) {
      if (!ALLOWED_FIELDS.has(k)) continue;
      update[k] = v;
    }
    if (Object.keys(update).length === 0) return json({ error: "No valid fields" }, 400);

    // Validate
    if ("position" in update && !VALID_POSITIONS.has(String(update.position))) {
      return json({ error: "Invalid position" }, 400);
    }
    for (const f of ["accent_from", "accent_to"] as const) {
      if (f in update && !HEX.test(String(update[f]))) return json({ error: `Invalid ${f}` }, 400);
    }
    for (const f of ["interval_ms", "duration_ms", "feed_limit", "refresh_ms"] as const) {
      if (f in update) {
        const n = Number(update[f]);
        if (!Number.isFinite(n) || n <= 0) return json({ error: `Invalid ${f}` }, 400);
        update[f] = Math.floor(n);
      }
    }
    if ("refresh_ms" in update) {
      const n = Number(update.refresh_ms);
      if (n < 60000 || n > 3600000) return json({ error: "refresh_ms must be 60000-3600000" }, 400);
    }
    if ("exclude_sources" in update) {
      if (!Array.isArray(update.exclude_sources)) return json({ error: "exclude_sources must be array" }, 400);
      update.exclude_sources = (update.exclude_sources as unknown[]).map(String);
    }
    update.updated_at = new Date().toISOString();

    const { data: existing } = await supabase.from("popup_settings").select("id").limit(1).maybeSingle();
    if (!existing) return json({ error: "Settings row missing" }, 500);

    const { data, error } = await supabase
      .from("popup_settings").update(update).eq("id", existing.id).select("*").single();
    if (error) return json({ error: error.message }, 500);
    return json(data, 200);
  }

  return json({ error: "Method not allowed" }, 405);
});

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...cors, "Content-Type": "application/json" },
  });
}
