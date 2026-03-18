/**
 * AI service — RouterAI → DeepSeek V3.2
 * Endpoint: https://routerai.ru/api/v1 (OpenAI-compatible)
 */

const ROUTERAI_URL = 'https://routerai.ru/api/v1/chat/completions';
const MODEL = 'mistralai/mistral-small-2603'; // ~5-7s response, no reasoning overhead
const SITE_URL = import.meta.env.VITE_SITE_URL || window.location.origin;

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
    const timeout = setTimeout(() => controller.abort(), 45000);

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
    return content;
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
        ? (difficulty === 'easy' ? 'basic level (1-2 year medical students)' :
           difficulty === 'hard' ? 'advanced level (residents, doctors)' :
           'intermediate level (3-5 year medical students)')
        : (difficulty === 'easy' ? 'базового уровня (1-2 курс медвуза)' :
           difficulty === 'hard' ? 'продвинутого уровня (ординатура, врачи)' :
           'среднего уровня (3-5 курс медвуза)');

    // Include real sound names from DB for context-aware questions
    const soundContext = soundRecords.length > 0
        ? (isEnglish
            ? `\nAvailable audio records in database: ${soundRecords.slice(0, 20).map(r => r.name || r.description).filter(Boolean).join(', ')}.`
            : `\nДоступные аудиозаписи в базе: ${soundRecords.slice(0, 20).map(r => r.name || r.description).filter(Boolean).join(', ')}.`)
        : '';

    const systemPrompt = `Ты — эксперт-кардиолог и пульмонолог, разрабатывающий обучающие тесты по аускультации для студентов 4–6 курса медвуза и ординаторов.

Правила генерации вопросов:
1. Каждый вопрос — клиническая виньетка (мини-кейс): пол, возраст, жалобы, анамнез → аускультативная находка → вопрос «что это?» или «какой диагноз?».
2. Дистракторы (неправильные варианты) должны быть клинически правдоподобными и отличаться по конкретным аускультативным признакам (фаза, тембр, точка максимума, иррадиация).
3. Объяснения: краткие (2–4 предложения), с указанием ключевого аускультативного признака, механизма и дифференциальной диагностики.
4. ЗАПРЕЩЕНО: ASCII-таблицы, псевдографика, рамки из символов. Только текст и маркированные списки.
5. Используй клиническую терминологию на уровне пропедевтики внутренних болезней.
6. Отвечай строго на русском.`;

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

    const content = await chatCompletion([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
    ], { temperature: 0.4, max_tokens: 2000 });

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

    const systemPrompt = `Ты — опытный преподаватель пропедевтики внутренних болезней с экспертизой в кардиологии и пульмонологии.

Объясняй аускультативные феномены по структуре:
1. Определение (1–2 предложения)
2. Механизм возникновения звука
3. Аускультативные характеристики (фаза дыхания/сердечного цикла, тембр, частота, точка максимума)
4. Клиническое значение (при каких заболеваниях)
5. Дифференциальная диагностика (от чего отличать и по каким признакам)

Правила:
- Клинический язык уровня 4–6 курса медвуза, русские термины с латинскими эквивалентами в скобках
- ЗАПРЕЩЕНО: ASCII-таблицы, псевдографика. Используй маркированные списки
- Компактно, до 250 слов
- Отвечай на русском`;

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
