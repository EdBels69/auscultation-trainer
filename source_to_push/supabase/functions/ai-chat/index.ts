import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const ROUTER_API_KEY = "sk-P89P4HGd2RxOOdiv8SQ2Z1ZyUKBlLe25";
const ROUTER_API_URL = "https://routerai.ru/api/v1/chat/completions";
const MODEL = "deepseek/deepseek-v3.2";

// ── Статичная часть промпта ──────────────────────────────────────────────────
const BASE_PROMPT = `Ты — Сергей Михайлович, опытный кардиолог и пульмонолог с 20-летним стажем преподавания в медицинском университете. Ты куратор студента в цифровом тренажёре аускультации.

СТИЛЬ ОБЩЕНИЯ:
- Отвечай кратко: 2–4 предложения, если студент не просит подробнее
- В конце КАЖДОГО ответа задавай один уточняющий или проверочный вопрос
- Используй конкретные клинические примеры, не абстрактные объяснения
- Не читай лекции — веди студента к пониманию через вопросы (сократический метод)
- Тон: дружелюбный, как опытный наставник, не строгий экзаменатор
- Обращение: на "ты"

ЭКСПЕРТИЗА:
- Сердечные шумы: систолические, диастолические, тоны I–IV
- Клапанные пороки: стеноз АК/МК, недостаточность АК/МК, трикуспидальный клапан
- Лёгочные феномены: крепитация, сухие/влажные хрипы, бронхиальное дыхание, плевральный шум, ослабленное дыхание
- Точки и методика аускультации
- Патофизиология акустических феноменов
- Дифференциальная диагностика по аускультативной картине

ОГРАНИЧЕНИЯ:
- Отвечай только на вопросы об аускультации, кардиологии, пульмонологии
- Не давай конкретных назначений лечения для реальных пациентов
- При вопросе вне темы — одной фразой верни к аускультации

Язык ответов: русский.`;

// ── Типы ────────────────────────────────────────────────────────────────────
interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface LastTestResult {
  score: number;
  mode: string;
  difficulty: string;
  wrongCount: number;
}

interface ChatContext {
  userRole?: string;
  lastTestResult?: LastTestResult | null;
  currentSection?: string;
}

// ── Динамический контекстный блок ───────────────────────────────────────────
function buildContextBlock(ctx: ChatContext): string {
  const parts: string[] = [];

  const roleLabels: Record<string, string> = {
    student:  "студент медицинского вуза",
    resident: "ординатор",
    doctor:   "практикующий врач",
    teacher:  "преподаватель",
  };
  parts.push(
    `УРОВЕНЬ СТУДЕНТА: ${roleLabels[ctx.userRole || "student"] ?? ctx.userRole}`
  );

  if (ctx.lastTestResult) {
    const t = ctx.lastTestResult;
    const modeLabel =
      t.mode === "cardiac"   ? "кардиология" :
      t.mode === "pulmonary" ? "пульмонология" :
      "смешанный режим";
    const passed = t.score >= 70;
    parts.push(
      `ПОСЛЕДНИЙ ТЕСТ: ${t.score}% (${passed ? "сдан" : "не сдан"}), ` +
      `режим: ${modeLabel}, ошибок: ${t.wrongCount}.` +
      (!passed ? " Студент нуждается в дополнительной практике по этой теме." : "")
    );
  }

  if (ctx.currentSection === "learning" || ctx.currentSection === "theory") {
    parts.push("ТЕКУЩИЙ РАЗДЕЛ: студент сейчас изучает обучающие материалы.");
  }

  return "\n\nКОНТЕКСТ СТУДЕНТА:\n" + parts.join("\n");
}

// ── Handler ──────────────────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const {
      message,
      history = [],
      context = {},
    }: {
      message: string;
      history: ChatMessage[];
      context: ChatContext;
    } = await req.json();

    if (!message || message.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "Message is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const systemPrompt = BASE_PROMPT + buildContextBlock(context);

    const messages = [
      { role: "system", content: systemPrompt },
      // Последние 6 сообщений — баланс памяти и токенов
      ...history.slice(-6).map((msg: ChatMessage) => ({
        role: msg.role,
        content: msg.content,
      })),
      { role: "user", content: message },
    ];

    const response = await fetch(ROUTER_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${ROUTER_API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages,
        temperature: 0.6,
        max_tokens: 1024,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("RouterAI API error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: `API error: ${response.status}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const aiResponse =
      data.choices?.[0]?.message?.content || "Извините, не удалось получить ответ.";

    return new Response(
      JSON.stringify({ response: aiResponse }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: `Internal server error: ${error.message}` }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
