/**
 * AI service — RouterAI → DeepSeek V3.2
 * Endpoint: https://routerai.ru/api/v1 (OpenAI-compatible)
 */

const ROUTERAI_URL = 'https://routerai.ru/api/v1/chat/completions';
const MODEL = 'deepseek/deepseek-v3.2';
const SITE_URL = import.meta.env.VITE_SITE_URL || 'https://auscultation-trainer.ru';

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

    const response = await fetch(ROUTERAI_URL, {
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
    });

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
 * @param {object} params - { count, category, difficulty, soundRecords }
 * @returns {Promise<Array>} questions array
 */
export async function generateQuizQuestions({ count = 5, category = 'all', difficulty = 'medium', soundRecords = [] }) {
    const categoryLabel = category === 'cardiology' ? 'кардиологии (сердечные шумы, тоны)' :
                          category === 'pulmonology' ? 'пульмонологии (дыхательные звуки)' :
                          'кардиологии и пульмонологии';

    const diffLabel = difficulty === 'easy' ? 'базового уровня (1-2 курс медвуза)' :
                      difficulty === 'hard' ? 'продвинутого уровня (ординатура, врачи)' :
                      'среднего уровня (3-5 курс медвуза)';

    // Include real sound names from DB for context-aware questions
    const soundContext = soundRecords.length > 0
        ? `\nДоступные аудиозаписи в базе: ${soundRecords.slice(0, 20).map(r => r.name || r.description).filter(Boolean).join(', ')}.`
        : '';

    const systemPrompt = `Ты — эксперт-кардиолог и пульмонолог, разрабатывающий обучающие тесты для студентов медицинских вузов и врачей.
Твоя задача — создавать клинически достоверные вопросы по аускультации.`;

    const userPrompt = `Создай ${count} тестовых вопроса по аускультации в области ${categoryLabel}, ${diffLabel}.${soundContext}

Требования:
- Вопросы должны быть клинически реалистичными и практически значимыми
- Каждый вопрос должен иметь 4 варианта ответа (a, b, c, d)
- Один правильный ответ
- Подробное объяснение правильного ответа с клинической аргументацией

Верни ТОЛЬКО валидный JSON без markdown-обёртки:
{
  "questions": [
    {
      "id": "q1",
      "question": "Текст вопроса",
      "options": {
        "a": "Вариант А",
        "b": "Вариант Б",
        "c": "Вариант В",
        "d": "Вариант Г"
      },
      "correct_answer": "a",
      "explanation": "Подробное клиническое объяснение правильного ответа",
      "category": "${category === 'all' ? 'mixed' : category}",
      "difficulty": "${difficulty}"
    }
  ]
}`;

    const content = await chatCompletion([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
    ], { temperature: 0.4, max_tokens: 3000 });

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

    const systemPrompt = language === 'ru'
        ? `Ты — опытный преподаватель клинических дисциплин с экспертизой в кардиологии и пульмонологии. Объясняй аускультативные феномены чётко, с клинической аргументацией. Используй структурированный формат: механизм → клиническое значение → диффдиагноз. Отвечай по-русски.`
        : `You are an experienced clinical educator with expertise in cardiology and pulmonology. Explain auscultatory phenomena clearly with clinical reasoning. Use structured format: mechanism → clinical significance → differential diagnosis. Respond in English.`;

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
