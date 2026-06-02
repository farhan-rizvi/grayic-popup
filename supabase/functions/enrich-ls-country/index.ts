// Backfills sales.country (ISO alpha-2) for LemonSqueezy sales by looking up the
// customer via the LemonSqueezy API. Batched + idempotent — safe to call repeatedly
// (manually or via cron) until all LS rows are enriched.
//
// Secrets required on this function:
//   LEMONSQUEEZY_API_KEY  - LS API key (Settings → API in LemonSqueezy)
//   ENRICH_SECRET         - shared secret; send as `x-enrich-secret` header
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const LS_BASE = "https://api.lemonsqueezy.com/v1";

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return json({ error: "POST only" }, 405);
  }

  const expected = Deno.env.get("ENRICH_SECRET");
  if (expected && req.headers.get("x-enrich-secret") !== expected) {
    return json({ error: "Unauthorized" }, 401);
  }

  const apiKey = Deno.env.get("LEMONSQUEEZY_API_KEY");
  if (!apiKey) return json({ error: "LEMONSQUEEZY_API_KEY not set" }, 500);

  const batch = Math.min(
    parseInt(new URL(req.url).searchParams.get("batch") || "50") || 50,
    100,
  );

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Rows still missing country.
  const { data, error } = await supabase
    .from("sales")
    .select("id, raw_payload")
    .eq("source", "lemonsqueezy")
    .is("country", null)
    .limit(batch);
  if (error) return json({ error: error.message }, 500);

  let updated = 0, skipped = 0;
  const cache = new Map<string, string | null>(); // customer_id -> country

  for (const row of data ?? []) {
    const customerId = row?.raw_payload?.data?.attributes?.customer_id;
    if (!customerId) { skipped++; continue; }

    let country = cache.get(String(customerId));
    if (country === undefined) {
      country = await fetchCountry(String(customerId), apiKey);
      cache.set(String(customerId), country);
    }
    if (!country) { skipped++; continue; }

    const { error: upErr } = await supabase
      .from("sales").update({ country }).eq("id", row.id);
    if (upErr) { skipped++; continue; }
    updated++;
  }

  return json({ processed: data?.length ?? 0, updated, skipped, batch }, 200);
});

async function fetchCountry(customerId: string, apiKey: string): Promise<string | null> {
  try {
    const res = await fetch(`${LS_BASE}/customers/${customerId}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/vnd.api+json",
      },
    });
    if (!res.ok) return null;
    const body = await res.json();
    return body?.data?.attributes?.country ?? null; // ISO alpha-2
  } catch {
    return null;
  }
}

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
