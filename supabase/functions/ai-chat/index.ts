import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const OPENROUTER_API_KEY = "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";
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

const SYSTEM_PROMPT = `Ты - ИИ-ассистент для обучения аускультации (выслушивания сердечных и легочных шумов).

Твоя роль:
- Помогать студентам-медикам распознавать и запоминать различные сердечные и легочные шумы
- Отвечать ТОЛЬКО на вопросы по клинической аускультации
- Объяснять характеристики шумов (тембр, продолжительность, локализация)
- Помогать понять патофизиологию, связанную со звуковыми феноменами
- Давать подсказки для дифференциальной диагностики по аускультативным данным

ОГРАНИЧЕНИЯ:
- НЕ отвечай на вопросы не связанные с медициной и аускультацией
- НЕ давай конкретных рекомендаций по лечению пациентов
- Если вопрос не по теме, вежливо напомни о своей специализации
- Ответы должны быть краткими и по существу (максимум 3-4 абзаца)

Отвечай на русском языке.`;

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { message, history = [] }: { message: string; history: ChatMessage[] } = await req.json();

    if (!message || message.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "Message is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...history.map((msg: ChatMessage) => ({
        role: msg.role,
        content: msg.content
      })),
      { role: "user", content: message }
    ];

    const response = await fetch(OPENROUTER_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "HTTP-Referer": "https://auscultation-trainer.app",
        "X-Title": "Auscultation Trainer"
      },
      body: JSON.stringify({
        model: "openai/gpt-4o-mini",
        messages,
        temperature: 0.7,
        max_tokens: 1024,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenRouter API error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: `API error: ${response.status} - ${errorText}` }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content || "Извините, не удалось получить ответ.";

    return new Response(
      JSON.stringify({ response: aiResponse }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: `Internal server error: ${error.message}` }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});