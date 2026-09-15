import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const API_KEY = Deno.env.get("MAGICHOUR_API_KEY");
    if (!API_KEY) {
      return json({ error: "Video service is not configured." }, 500);
    }

    const { action, prompt, orientation, seconds, id } = await req.json();
    const authHeaders = {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    };

    // ---- Check status of an existing render ----
    if (action === "status") {
      if (!id) return json({ error: "id is required" }, 400);

      const res = await fetch(`https://api.magichour.ai/v1/video-projects/${id}`, {
        headers: authHeaders,
      });
      if (!res.ok) {
        const text = await res.text();
        console.error("Status error:", res.status, text);
        return json({ error: "Could not check the video status." }, res.status);
      }
      const data = await res.json();
      const url = data?.downloads?.[0]?.url ?? null;
      return json({
        status: data?.status ?? "queued",
        progress: data?.progress?.percentage ?? null,
        url,
        error: data?.error?.message ?? null,
      });
    }

    // ---- Start a new video render ----
    if (!prompt || typeof prompt !== "string") {
      return json({ error: "prompt is required" }, 400);
    }

    const body = {
      name: prompt.slice(0, 60),
      end_seconds: Math.min(Math.max(Number(seconds) || 5, 5), 20),
      orientation: orientation === "portrait" || orientation === "square" ? orientation : "landscape",
      style: { prompt, quality_mode: "quick" },
    };

    const res = await fetch("https://api.magichour.ai/v1/text-to-video", {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("Create error:", res.status, text);
      if (res.status === 401 || res.status === 403) {
        return json({ error: "Video service key is invalid or expired." }, res.status);
      }
      if (res.status === 402) {
        return json({ error: "Video credits are exhausted." }, 402);
      }
      if (res.status === 429) {
        return json({ error: "Too many videos at once. Please wait a moment." }, 429);
      }
      return json({ error: "Video generation failed to start." }, res.status);
    }

    const data = await res.json();
    return json({ id: data.id, credits_charged: data.credits_charged ?? null });
  } catch (error) {
    console.error("roman-video error:", error);
    return json({ error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});
