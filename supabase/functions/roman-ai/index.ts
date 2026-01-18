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

    // Detect API type based on key prefix
    const isOpenRouter = ROMAN_AI_API_KEY.startsWith("sk-or-") || ROMAN_AI_API_KEY.includes("openrouter");
    const isOpenAI = ROMAN_AI_API_KEY.startsWith("sk-") && !isOpenRouter;
    
    let apiUrl: string;
    let model: string;
    let headers: Record<string, string>;

    if (isOpenRouter || ROMAN_AI_API_KEY.startsWith("ofapi_")) {
      // OpenRouter API
      apiUrl = "https://openrouter.ai/api/v1/chat/completions";
      model = "google/gemini-2.0-flash-exp:free";
      headers = {
        "Authorization": `Bearer ${ROMAN_AI_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://roman-messenger.lovable.app",
        "X-Title": "Roman AI Assistant",
      };
    } else if (isOpenAI) {
      // OpenAI API
      apiUrl = "https://api.openai.com/v1/chat/completions";
      model = "gpt-4o-mini";
      headers = {
        "Authorization": `Bearer ${ROMAN_AI_API_KEY}`,
        "Content-Type": "application/json",
      };
    } else {
      // Default to OpenRouter for other keys
      apiUrl = "https://openrouter.ai/api/v1/chat/completions";
      model = "google/gemini-2.0-flash-exp:free";
      headers = {
        "Authorization": `Bearer ${ROMAN_AI_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://roman-messenger.lovable.app",
        "X-Title": "Roman AI Assistant",
      };
    }

    console.log(`Using API: ${apiUrl}, Model: ${model}`);

    const response = await fetch(apiUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model,
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
