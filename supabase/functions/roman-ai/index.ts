import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { message, conversationHistory } = await req.json();

    if (!message || typeof message !== "string") {
      return new Response(
        JSON.stringify({ error: "message is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const HY3_API_KEY = Deno.env.get("HY3_API_KEY");

    if (!HY3_API_KEY) {
      throw new Error("HY3_API_KEY is not configured");
    }

    const messages = [
      {
        role: "system",
        content: `You are Roman, a friendly and helpful AI assistant for the Roman social platform.
You help users with questions, provide information, and assist with various tasks.
Keep your responses concise, friendly, and helpful.
You speak both English and Sinhala - respond in the same language the user uses.
Always be respectful and maintain a positive, supportive tone.`,
      },
      ...(conversationHistory || []),
      { role: "user", content: message },
    ];

    const callAI = () => fetch("https://api.b.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${HY3_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "hy3",
        messages,
      }),
    });

    let response = await callAI();

    // Retry once on rate limit (b.ai hits upstream RPM caps sometimes)
    if (response.status === 429) {
      await new Promise((r) => setTimeout(r, 3000));
      response = await callAI();
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI API error:", response.status, errorText);

      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted on the HY3 account." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      throw new Error(`AI API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content || "Sorry, I couldn't generate a response.";

    return new Response(
      JSON.stringify({ response: aiResponse }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Roman AI error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
