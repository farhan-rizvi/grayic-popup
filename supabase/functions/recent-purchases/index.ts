// Public sanitized feed + display config for the social-proof popup widget.
// Response shape: { config: {...}, items: [{first_name,country,product,at}, ...] }
// Returns ONLY first name, country (ISO alpha-2), product, timestamp. No PII beyond first name.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

function firstName(name: string | null): string | null {
  if (!name) return null;
  const t = name.trim().split(/\s+/)[0];
  return t || null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "GET") return json({ error: "Method not allowed" }, 405);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Load singleton settings; fall back to safe defaults if missing.
  const { data: s } = await supabase.from("popup_settings").select("*").limit(1).maybeSingle();

  const cfg = {
    enabled: s?.enabled ?? true,
    position: s?.position ?? "bottom-left",
    interval_ms: s?.interval_ms ?? 8000,
    duration_ms: s?.duration_ms ?? 5000,
    refresh_ms: s?.refresh_ms ?? 180000,
    show_country: s?.show_country ?? true,
    show_time_ago: s?.show_time_ago ?? true,
    show_verified: s?.show_verified ?? true,
    accent_from: s?.accent_from ?? "#6366f1",
    accent_to: s?.accent_to ?? "#8b5cf6",
    name_fallback: s?.name_fallback ?? "Someone",
    product_fallback: s?.product_fallback ?? "a template",
  };

  if (!cfg.enabled) {
    return new Response(JSON.stringify({ config: cfg, items: [] }), {
      headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "public, max-age=30" },
    });
  }

  const url = new URL(req.url);
  const limitParam = parseInt(url.searchParams.get("limit") || "0") || 0;
  const limit = Math.min(limitParam || s?.feed_limit || 20, 50);
  const exclude: string[] = s?.exclude_sources ?? ["custom"];

  let q = supabase
    .from("sales")
    .select("customer_name, country, product_name, sale_date")
    .order("sale_date", { ascending: false })
    .limit(limit);
  if (exclude.length) q = q.not("source", "in", `(${exclude.map((e) => `"${e}"`).join(",")})`);

  const { data, error } = await q;
  if (error) return json({ error: error.message }, 500);

  const items = (data ?? []).map((r: any) => ({
    first_name: firstName(r.customer_name),
    country: r.country ?? null,
    product: r.product_name ?? null,
    at: r.sale_date,
  }));

  return new Response(JSON.stringify({ config: cfg, items }), {
    headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "public, max-age=60" },
  });
});

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}
