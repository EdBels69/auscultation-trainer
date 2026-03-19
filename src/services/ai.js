/**
 * AI service — RouterAI
 * Default model: deepseek/deepseek-v3.2
 * Quiz model: google/gemini-flash-2.0 (fast)
 * Endpoint: https://routerai.ru/api/v1 (OpenAI-compatible)
 */

const ROUTERAI_URL = 'https://routerai.ru/api/v1/chat/completions';
const MODEL = 'deepseek/deepseek-v3.2'; // chat, explanations
const QUIZ_MODEL = 'google/gemini-flash-2.0'; // fast — quiz generation
const SITE_URL = import.meta.env.VITE_SITE_URL || window.location.origin;

/**
 * Strip markdown formatting from AI responses — clean plain text output
 */
function stripMarkdown(text) {
    return text
        // Remove headers: # ## ### etc
        .replace(/^#{1,6}\s+/gm, '')
        // Remove bold: **text** or __text__
        .replace(/\*\*(.+?)\*\*/g, '$1')
        .replace(/__(.+?)__/g, '$1')
        // Remove italic: *text* or _text_ (but not inside words)
        .replace(/(?<!\w)\*(.+?)\*(?!\w)/g, '$1')
        .replace(/(?<!\w)_(.+?)_(?!\w)/g, '$1')
        // Remove horizontal rules ---
        .replace(/^-{3,}$/gm, '')
        // Convert markdown bullets (* or -) to dash
        .replace(/^[\*\-]\s+/gm, '– ')
        // Remove numbered list dots: "1. " -> "1) "
        .replace(/^(\d+)\.\s+/gm, '$1) ')
        // Remove code backticks
        .replace(/`([^`]+)`/g, '$1')
        // Clean multiple blank lines
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

function getApiKey() {
    return import.meta.env.VITE_OPENROUTER_API_KEY || import.meta.env.VITE_AI_API_KEY || '';
}

/**
 * Base chat completion request to OpenRouter
 */
async function chatCompletion(messages, options = {}) {
    const apiKey = getApiKey();
    if (!apiKey) {
        throw new Error('RouterAI API ключ не настроен. Добавьте VITE_OPENROUTER_API_KEY в .env');
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120000);

    let response;
    try {
        response = await fetch(ROUTERAI_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: options.model || MODEL,
                messages,
                temperature: options.temperature ?? 0.3,
                max_tokens: options.max_tokens ?? 2000,
            }),
            signal: controller.signal,
        });
    } finally {
        clearTimeout(timeout);
    }

    if (!response.ok) {
        const err = await response.text();
        throw new Error(`RouterAI error ${response.status}: ${err}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error('Пустой ответ от AI');
    return options.raw ? content : stripMarkdown(content);
}

/**
 * Generate auscultation quiz questions
 * @param {object} params - { count, category, difficulty, soundRecords, language }
 * @returns {Promise<Array>} questions array
 */
export async function generateQuizQuestions({ count = 5, category = 'all', difficulty = 'medium', soundRecords = [], language = 'ru' }) {
    const isEnglish = language === 'en';

    const categoryLabel = isEnglish
        ? (category === 'cardiac' ? 'cardiology (heart sounds and murmurs)' :
           category === 'pulmonary' ? 'pulmonology (breath sounds)' :
           'cardiology and pulmonology')
        : (category === 'cardiac' ? 'кардиологии (сердечные шумы, тоны)' :
           category === 'pulmonary' ? 'пульмонологии (дыхательные звуки)' :
           'кардиологии и пульмонологии');

    const diffLabel = isEnglish
        ? (difficulty === 'easy' ? 'basic level' :
           difficulty === 'hard' ? 'advanced level' :
           'intermediate level')
        : (difficulty === 'easy' ? 'базового уровня' :
           difficulty === 'hard' ? 'продвинутого уровня' :
           'среднего уровня');

    // Include real sound names from DB for context-aware questions
    const soundContext = soundRecords.length > 0
        ? (isEnglish
            ? `\nAvailable audio records in database: ${soundRecords.slice(0, 20).map(r => r.name || r.description).filter(Boolean).join(', ')}.`
            : `\nДоступные аудиозаписи в базе: ${soundRecords.slice(0, 20).map(r => r.name || r.description).filter(Boolean).join(', ')}.`)
        : '';

    const systemPrompt = `Ты — эксперт по аускультации, создающий тесты для студентов 4–6 курса медвуза.

Правила:
1. Каждый вопрос — клиническая виньетка: пол, возраст, жалобы → аускультативная находка → вопрос.
2. Дистракторы клинически правдоподобные, различаются по аускультативным признакам.
3. Объяснения: 2–4 предложения, ключевой признак + механизм + дифдиагностика.
4. КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО: markdown (**, ##, *курсив*), ASCII-таблицы, псевдографика, рамки.
5. Пиши чистым текстом без разметки. Объяснения — живым языком преподавателя.
6. Только русский язык.`;

    const userPrompt = `Создай ${count} тестовых вопроса по аускультации в области ${categoryLabel}, ${diffLabel}.${soundContext}

Формат каждого вопроса — клиническая виньетка:
«Пациент(ка) N лет, поступил(а) с жалобами на ... При аускультации [точка] выслушивается [описание звука]. Какой аускультативный феномен наиболее вероятен?»

Требования:
- Виньетка должна содержать: пол, возраст, ключевые жалобы, точку аускультации, описание звука
- 4 варианта ответа (a, b, c, d) — клинически правдоподобные
- Один правильный ответ
- Объяснение (2–4 предложения): ключевой признак, механизм, чем отличается от дистракторов
- НЕ используй ASCII-таблицы или псевдографику в объяснениях

Верни ТОЛЬКО валидный JSON без markdown-обёртки:
{
  "questions": [
    {
      "id": "q1",
      "question": "Текст клинической виньетки",
      "options": {
        "a": "Вариант А",
        "b": "Вариант Б",
        "c": "Вариант В",
        "d": "Вариант Г"
      },
      "correct_answer": "a",
      "explanation": "Краткое клиническое объяснение с дифференциальной диагностикой",
      "category": "${category === 'all' ? 'mixed' : category}",
      "difficulty": "${difficulty}"
    }
  ]
}`;

    // Scale max_tokens based on question count (each question ~200 tokens)
    const estimatedTokens = Math.max(2000, count * 400);

    const content = await chatCompletion([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
    ], { model: QUIZ_MODEL, temperature: 0.4, max_tokens: estimatedTokens, raw: true });

    // Parse JSON — strip markdown if present
    const jsonStr = content.replace(/```(?:json)?\s*([\s\S]*?)```/g, '$1').trim();
    const parsed = JSON.parse(jsonStr);
    return parsed.questions || [];
}

/**
 * Get AI explanation for a specific auscultation sound
 * @param {object} record - audio record from DB
 * @param {string} language - 'ru' | 'en'
 * @param {Array} history - previous messages [{role, content}]
 * @returns {Promise<string>} explanation text
 */
export async function getAuscultationExplanation(record, language = 'ru', history = []) {
    const lang = language === 'en' ? 'English' : 'Russian';

    const systemPrompt = `Ты — преподаватель пропедевтики внутренних болезней. Объясняешь аускультативные феномены студентам 4–6 курса.

Структура: Определение → Механизм → Характеристики звука (фаза, тембр, точка максимума) → Клиника → Дифференциальная диагностика.

ФОРМАТ — СТРОГИЕ ПРАВИЛА:
– Пиши живым языком, как у постели больного. Не как робот.
– КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО: markdown (**, ##, ###, *курсив*), ASCII-таблицы, псевдографика, рамки.
– Для списков используй тире (–) в начале строки, не звёздочки.
– Можно эмодзи умеренно (🫀🩺🫁).
– Русские термины с латинскими в скобках при первом упоминании.
– Компактно: до 250 слов. Без воды.
– Только русский.`;

    const contextInfo = [
        record.name && `Феномен: ${record.name}`,
        record.category && `Система: ${record.category === 'cardiology' ? 'Кардиология' : 'Пульмонология'}`,
        record.auscultationPoint && `Точка аускультации: ${record.auscultationPoint}`,
        record.clinicalContext && `Клинический контекст: ${record.clinicalContext}`,
        record.description && `Описание пациента: ${record.description}`,
        record.difficulty && `Уровень сложности: ${record.difficulty}`,
    ].filter(Boolean).join('\n');

    const initialMessage = language === 'ru'
        ? `Объясни аускультативный феномен:\n${contextInfo}`
        : `Explain this auscultatory finding:\n${contextInfo}`;

    const messages = [
        { role: 'system', content: systemPrompt },
        ...(history.length === 0 ? [{ role: 'user', content: initialMessage }] : history),
    ];

    return await chatCompletion(messages, { temperature: 0.5, max_tokens: 1500 });
}

/**
 * Chat continuation for AI assistant
 */
export async function continueChat(messages) {
    return await chatCompletion(messages, { temperature: 0.5, max_tokens: 1500 });
}
