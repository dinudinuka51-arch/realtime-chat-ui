import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const ADMIN_PASSWORD = "admin123admin123";
const ALLOWED = ["HY3_API_KEY", "MAGICHOUR_API_KEY"] as const;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const mask = (v: string) => (v.length <= 6 ? "••••" : `••••••${v.slice(-4)}`);

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { action, password, keys } = await req.json();

    if (password !== ADMIN_PASSWORD) {
      return json({ error: "Incorrect password" }, 401);
    }

    if (action === "status") {
      const { data, error } = await admin
        .from("app_config")
        .select("key, value, updated_at")
        .in("key", ALLOWED as unknown as string[]);
      if (error) throw error;

      const result: Record<string, { set: boolean; masked: string | null; source: string; updated_at: string | null }> = {};
      for (const key of ALLOWED) {
        const row = data?.find((r) => r.key === key);
        const envVal = Deno.env.get(key);
        result[key] = row
          ? { set: true, masked: mask(row.value), source: "custom", updated_at: row.updated_at }
          : { set: !!envVal, masked: envVal ? mask(envVal) : null, source: envVal ? "default" : "none", updated_at: null };
      }
      return json({ keys: result });
    }

    if (action === "set") {
      if (!keys || typeof keys !== "object") {
        return json({ error: "keys is required" }, 400);
      }
      const rows = Object.entries(keys as Record<string, string>)
        .filter(([k, v]) => (ALLOWED as readonly string[]).includes(k) && typeof v === "string" && v.trim().length >= 8)
        .map(([k, v]) => ({ key: k, value: v.trim(), updated_at: new Date().toISOString() }));

      if (rows.length === 0) {
        return json({ error: "No valid key provided" }, 400);
      }

      const { error } = await admin.from("app_config").upsert(rows, { onConflict: "key" });
      if (error) throw error;
      return json({ ok: true, updated: rows.map((r) => r.key) });
    }

    if (action === "reset") {
      const target = (keys as string[] | undefined)?.filter((k) => (ALLOWED as readonly string[]).includes(k)) ?? [];
      if (target.length === 0) return json({ error: "No valid key provided" }, 400);
      const { error } = await admin.from("app_config").delete().in("key", target);
      if (error) throw error;
      return json({ ok: true, reset: target });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (error) {
    console.error("api-keys error:", error);
    return json({ error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});
