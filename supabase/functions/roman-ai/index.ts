import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, conversationHistory } = await req.json();
    const ROMAN_AI_API_KEY = Deno.env.get("ROMAN_AI_API_KEY");
    
    if (!ROMAN_AI_API_KEY) {
      throw new Error("ROMAN_AI_API_KEY is not configured");
    }

    // Build messages array with conversation history
    const messages = [
      {
        role: "system",
        content: `You are Roman, a friendly and helpful AI assistant for the Roman social platform. 
You help users with questions, provide information, and assist with various tasks.
You have access to search capabilities and can provide informative, accurate responses.
Keep your responses concise, friendly, and helpful.
You speak both English and Sinhala - respond in the same language the user uses.
Always be respectful and maintain a positive, supportive tone.`
      },
      ...(conversationHistory || []),
      { role: "user", content: message }
    ];

    // Call the AI API (OpenAI-compatible endpoint)
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${ROMAN_AI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages,
        max_tokens: 1000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI API error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`AI API error: ${response.status}`);
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
