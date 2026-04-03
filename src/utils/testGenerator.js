/**
 * Test question generator — v2.0
 * Generates clinical-vignette-style quiz questions from audio records
 * with varied question types and auscultation-point diagrams
 */

export const QUESTION_TYPES = {
    IDENTIFY_SOUND: 'identify_sound',
    CLINICAL_SIGNIFICANCE: 'clinical_significance',
    MECHANISM: 'mechanism',
    PHASE_CHARACTERISTICS: 'phase_characteristics',
};

// ── Clinical context data ──────────────────────────────────────────────
// Maps sound names (or substrings) to clinical vignettes & meta

const CLINICAL_CONTEXT = {
    'стеноз аорт': {
        vignettes: [
            'Мужчина 72 лет жалуется на одышку при подъёме по лестнице и эпизоды головокружения. При аускультации во 2-м межреберье справа от грудины выслушивается грубый шум.',
            'Пациент 68 лет, АД 150/60 мм рт. ст. На яремной вырезке пальпируется систолическое дрожание. При аускультации — интенсивный шум с проведением на сонные артерии.',
        ],
        mechanism: 'Турбулентный поток крови через суженное устье аорты при систоле',
        phase: 'Систолический шум изгнания — ромбовидный (crescendo-decrescendo), возникает после I тона',
        clinical: 'Кальцинирующий аортальный стеноз — самый частый клапанный порок у пожилых',
        differentials: ['Гипертрофическая кардиомиопатия', 'Функциональный систолический шум'],
        position_desc: '2-е межреберье справа от грудины (точка аорты)',
    },
    'стеноз митрал': {
        vignettes: [
            'Женщина 45 лет, ревматический анамнез с детства. Жалобы на одышку, сердцебиение, кровохарканье. На верхушке — хлопающий I тон, тон открытия митрального клапана.',
            'Пациентка 52 лет с мерцательной аритмией. Facies mitralis. При аускультации на верхушке — диастолический шум с пресистолическим усилением.',
        ],
        mechanism: 'Турбулентный поток крови через суженное митральное отверстие из левого предсердия в желудочек в диастолу',
        phase: 'Диастолический шум — протомезодиастолический с пресистолическим усилением (при синусовом ритме)',
        clinical: 'Митральный стеноз — чаще всего ревматической этиологии',
        differentials: ['Шум Остина Флинта при аортальной недостаточности', 'Миксома левого предсердия'],
        position_desc: 'Верхушка сердца (точка митрального клапана)',
    },
    'хлопающий': {
        vignettes: [
            'Пациентка 48 лет с ревматическим анамнезом. На верхушке выслушивается необычно громкий, резкий первый тон с «щёлкающим» оттенком.',
        ],
        mechanism: 'Ригидные створки митрального клапана при стенозе захлопываются из крайнего положения, создавая резкий звук',
        phase: 'Усиленный I тон — в начале систолы',
        clinical: 'Митральный стеноз при сохранённой подвижности створок',
        differentials: ['Нормальный I тон у астеника', 'Тахикардия с укорочением диастолы'],
        position_desc: 'Верхушка сердца',
    },
    'недостаточность аортал': {
        vignettes: [
            'Мужчина 55 лет, АД 180/40 мм рт. ст. «Танец каротид», симптом Мюссе. В точке Боткина–Эрба и во 2-м межреберье справа — мягкий убывающий шум.',
            'Пациент 60 лет с двойным тоном Траубе на бедренной артерии. На аорте — протодиастолический дующий шум.',
        ],
        mechanism: 'Обратный ток крови из аорты в левый желудочек через не полностью сомкнутые полулунные створки в диастолу',
        phase: 'Диастолический убывающий (decrescendo) шум — начинается сразу после II тона',
        clinical: 'Аортальная недостаточность — большое пульсовое давление, «периферические» сосудистые признаки',
        differentials: ['Шум Грехема Стилла при лёгочной гипертензии', 'Диастолический шум митрального стеноза'],
        position_desc: '3-е межреберье справа или точка Боткина–Эрба',
    },
    'недостаточность митрал': {
        vignettes: [
            'Мужчина 62 лет, перенёс инфаркт миокарда. На верхушке — дующий шум, проводящийся в левую подмышечную область. Ослабленный I тон.',
            'Женщина 35 лет с пролапсом МК. На верхушке — поздний систолический шум после среднесистолического клика.',
        ],
        mechanism: 'Обратный ток крови из левого желудочка в левое предсердие через несостоятельный митральный клапан в систолу',
        phase: 'Пансистолический (голосистолический) дующий шум — занимает всю систолу, сливаясь с I и II тоном',
        clinical: 'Митральная недостаточность — ишемическая, дегенеративная, ревматическая этиология',
        differentials: ['Дефект межжелудочковой перегородки', 'Трикуспидальная недостаточность'],
        position_desc: 'Верхушка сердца с проведением в подмышечную область',
    },
    'трени.*плевр': {
        vignettes: [
            'Пациент 40 лет, боль в грудной клетке при глубоком вдохе. Повышение температуры до 38 °C. При аускультации — шум, синхронный с дыханием, не исчезающий после кашля.',
            'Женщина 55 лет, жалобы на колющую боль в боку. При надавливании стетоскопом шум усиливается. Шум слышен в обе фазы дыхания.',
        ],
        mechanism: 'Трение воспалённых, шероховатых листков висцеральной и париетальной плевры друг о друга',
        phase: 'Выслушивается в обе фазы дыхания (вдох и выдох), в отличие от хрипов не меняется после кашля',
        clinical: 'Сухой (фибринозный) плеврит — инфекционный, туберкулёзный, опухолевый',
        differentials: ['Крепитация', 'Влажные хрипы', 'Шум трения перикарда'],
        position_desc: 'Над областью поражения (боковая или задняя поверхность грудной клетки)',
    },
    'крепитац': {
        vignettes: [
            'Пациент 58 лет, прогрессирующая одышка в течение 2 лет. В базальных отделах — мелкие «треск целлофана». Барабанные пальцы.',
            'Мужчина 70 лет, лихорадка 39 °C, кашель с ржавой мокротой. В нижней доле правого лёгкого — нежная крепитация на вдохе.',
        ],
        mechanism: 'Разлипание стенок альвеол на вдохе при наличии в них воспалительного экссудата или фиброза',
        phase: 'Только на высоте вдоха (конечноинспираторная), в отличие от хрипов — не меняется после кашля',
        clinical: 'Крупозная пневмония (crepitatio indux/redux), интерстициальные заболевания лёгких (ИЛФ)',
        differentials: ['Мелкопузырчатые влажные хрипы', 'Шум трения плевры'],
        position_desc: 'Базальные отделы лёгких',
    },
    'ларинготрахеал': {
        vignettes: [
            'Студент 22 лет, без жалоб. При аускультации над гортанью и трахеей — громкое дыхание с шумным удлинённым выдохом.',
        ],
        mechanism: 'Прохождение воздуха через узкую голосовую щель и трахею с турбулентным потоком',
        phase: 'Выдох длиннее и громче вдоха — физиологическое бронхиальное (ларинготрахеальное) дыхание',
        clinical: 'Норма над гортанью и трахеей; патология — если выслушивается над лёгкими (уплотнение, каверна)',
        differentials: ['Патологическое бронхиальное дыхание', 'Стридор'],
        position_desc: 'Гортань и трахея',
    },
    'полифонич': {
        vignettes: [
            'Мужчина 65 лет, курильщик со стажем 40 лет. Бочкообразная грудная клетка. На выдохе — множественные свистящие звуки разной тональности.',
            'Женщина 30 лет, приступ удушья. ЧДД 28/мин. При аускультации — диффузные свисты и жужжание на выдохе.',
        ],
        mechanism: 'Прохождение воздуха через множество суженных бронхов разного калибра создаёт звуки разной частоты',
        phase: 'Преимущественно на выдохе, при тяжёлой обструкции — в обе фазы',
        clinical: 'ХОБЛ, бронхиальная астма — признак диффузной бронхообструкции',
        differentials: ['Монофонический свист (опухоль бронха)', 'Стридор'],
        position_desc: 'Над всей поверхностью лёгких',
    },
    'свистящ': {
        vignettes: [
            'Девушка 25 лет, аллергоанамнез. После контакта с кошкой — приступ удушья, экспираторная одышка. При аускультации — высокочастотный свист.',
        ],
        mechanism: 'Высокоскоростной поток воздуха через суженные мелкие бронхи (бронхоспазм, отёк слизистой)',
        phase: 'На выдохе (экспираторные); при тяжёлом бронхоспазме — в обе фазы',
        clinical: 'Бронхиальная астма, бронхоспазм',
        differentials: ['Стридор (инспираторный)', 'Сухие басовые хрипы'],
        position_desc: 'Над всей поверхностью лёгких',
    },
};

// ── Question templates by type ─────────────────────────────────────────

function getContextForRecord(record) {
    const name = (record.name || '').toLowerCase();
    for (const [pattern, ctx] of Object.entries(CLINICAL_CONTEXT)) {
        if (new RegExp(pattern, 'i').test(name)) return ctx;
    }
    return null;
}

// ── Question generators per type ───────────────────────────────────────

function buildIdentifySoundQuestion(correct, wrongRecords, ctx) {
    const vignette = ctx?.vignettes
        ? ctx.vignettes[Math.floor(Math.random() * ctx.vignettes.length)]
        : null;

    const question = vignette
        ? `${vignette}\nКакой аускультативный феномен наиболее вероятен?`
        : pickRandom(SOUND_QUESTIONS_V2);

    const allAnswers = shuffleArray([
        { ...correct, _isCorrect: true },
        ...wrongRecords.map(r => ({ ...r, _isCorrect: false }))
    ]);

    return {
        type: QUESTION_TYPES.IDENTIFY_SOUND,
        question,
        audioUrl: correct.audioUrl,
        imageUrl: correct.imageUrl || null,
        audiogramUrl: correct.audiogramUrl || null,
        position: correct.position || null,
        answers: allAnswers.map(r => ({ id: r.id, text: r.name, isCorrect: r._isCorrect })),
        correctAnswerId: correct.id,
        explanation: ctx
            ? `${correct.name}. ${ctx.mechanism}. ${ctx.clinical}.`
            : correct.description,
    };
}

function buildClinicalSignificanceQuestion(correct, wrongRecords, ctx) {
    if (!ctx) return null; // fallback handled in caller

    const vignette = ctx.vignettes[Math.floor(Math.random() * ctx.vignettes.length)];
    const question = `${vignette}\nКакое заболевание наиболее вероятно?`;

    // Build plausible clinical answer options
    const correctAnswer = ctx.clinical;
    const distractors = ctx.differentials || [];
    // Supplement from wrong records
    const extraDistractors = wrongRecords
        .map(r => {
            const rCtx = getContextForRecord(r);
            return rCtx?.clinical || `Патология: ${r.name}`;
        })
        .filter(d => d !== correctAnswer);

    const allDistractors = [...new Set([...distractors, ...extraDistractors])].slice(0, 3);

    const options = shuffleArray([
        { id: 'correct', text: correctAnswer, isCorrect: true },
        ...allDistractors.map((d, i) => ({ id: `wrong_${i}`, text: d, isCorrect: false }))
    ]);

    return {
        type: QUESTION_TYPES.CLINICAL_SIGNIFICANCE,
        question,
        audioUrl: correct.audioUrl,
        imageUrl: correct.imageUrl || null,
        audiogramUrl: correct.audiogramUrl || null,
        position: correct.position || null,
        answers: options,
        correctAnswerId: 'correct',
        explanation: `${ctx.clinical}. ${ctx.mechanism}.`,
    };
}

function buildMechanismQuestion(correct, wrongRecords, ctx) {
    if (!ctx) return null;

    const question = `Чем обусловлено возникновение феномена «${correct.name}»?`;

    const correctMech = ctx.mechanism;
    const wrongMechs = wrongRecords
        .map(r => {
            const rCtx = getContextForRecord(r);
            return rCtx?.mechanism;
        })
        .filter(Boolean)
        .filter(m => m !== correctMech);

    const genericMechs = [
        'Разрыв хорд клапана с пролабированием створки',
        'Вибрация стенок расширенной полости (аневризма)',
        'Высокоскоростной ламинарный поток при анемии',
    ];

    const allDistractors = [...new Set([...wrongMechs, ...genericMechs])]
        .filter(d => d !== correctMech)
        .slice(0, 3);

    const options = shuffleArray([
        { id: 'correct', text: correctMech, isCorrect: true },
        ...allDistractors.map((d, i) => ({ id: `wrong_${i}`, text: d, isCorrect: false }))
    ]);

    return {
        type: QUESTION_TYPES.MECHANISM,
        question,
        audioUrl: correct.audioUrl,
        imageUrl: correct.imageUrl || null,
        audiogramUrl: correct.audiogramUrl || null,
        position: correct.position || null,
        answers: options,
        correctAnswerId: 'correct',
        explanation: `${ctx.mechanism}. ${ctx.phase}.`,
    };
}

function buildPhaseQuestion(correct, wrongRecords, ctx) {
    if (!ctx) return null;

    const question = `Укажите фазовую характеристику звука «${correct.name}»:`;

    const correctPhase = ctx.phase;
    const wrongPhases = wrongRecords
        .map(r => {
            const rCtx = getContextForRecord(r);
            return rCtx?.phase;
        })
        .filter(Boolean)
        .filter(p => p !== correctPhase);

    const genericPhases = [
        'Непрерывный шум (систоло-диастолический), не зависит от фазы',
        'Голосистолический шум — от I до II тона без перерыва',
        'Пресистолический шум — нарастающий к I тону',
    ];

    const allDistractors = [...new Set([...wrongPhases, ...genericPhases])]
        .filter(d => d !== correctPhase)
        .slice(0, 3);

    const options = shuffleArray([
        { id: 'correct', text: correctPhase, isCorrect: true },
        ...allDistractors.map((d, i) => ({ id: `wrong_${i}`, text: d, isCorrect: false }))
    ]);

    return {
        type: QUESTION_TYPES.PHASE_CHARACTERISTICS,
        question,
        audioUrl: correct.audioUrl,
        imageUrl: correct.imageUrl || null,
        audiogramUrl: correct.audiogramUrl || null,
        position: correct.position || null,
        answers: options,
        correctAnswerId: 'correct',
        explanation: `${correct.name}: ${ctx.phase}. ${ctx.clinical}.`,
    };
}

// ── Main API ───────────────────────────────────────────────────────────

const QUESTION_BUILDERS = {
    [QUESTION_TYPES.IDENTIFY_SOUND]: buildIdentifySoundQuestion,
    [QUESTION_TYPES.CLINICAL_SIGNIFICANCE]: buildClinicalSignificanceQuestion,
    [QUESTION_TYPES.MECHANISM]: buildMechanismQuestion,
    [QUESTION_TYPES.PHASE_CHARACTERISTICS]: buildPhaseQuestion,
};

/**
 * Generate a random question from audio records
 */
export function generateQuestion(audioRecords, type = null, usedRecordIds = new Set()) {
    if (!audioRecords || audioRecords.length < 3) return null;

    const availableForCorrect = audioRecords.filter(r => !usedRecordIds.has(r.id));
    if (availableForCorrect.length === 0) return null;

    const correctAnswer = pickRandom(availableForCorrect);
    const ctx = getContextForRecord(correctAnswer);
    const questionType = type || getWeightedQuestionType(ctx);

    // Get wrong answers
    const wrongAnswers = getWrongAnswers(audioRecords, correctAnswer, 3, questionType);

    // Try the requested builder; fallback to identify_sound if ctx-dependent type can't build
    const builder = QUESTION_BUILDERS[questionType];
    let question = builder(correctAnswer, wrongAnswers, ctx);

    if (!question) {
        question = buildIdentifySoundQuestion(correctAnswer, wrongAnswers, ctx);
    }

    return question;
}

/**
 * Generate multiple questions for a test
 */
export function generateTest(audioRecords, numberOfQuestions = 10) {
    const questions = [];
    const usedRecordIds = new Set();
    const usedTypes = new Set();
    const maxQuestions = Math.min(numberOfQuestions, audioRecords.length);

    while (questions.length < maxQuestions) {
        // Pass null as type — let generateQuestion pick based on record's clinical context
        const question = generateQuestion(audioRecords, null, usedRecordIds);

        if (!question) break;

        questions.push(question);
        usedRecordIds.add(question.correctAnswerId);
    }

    return questions;
}

/**
 * Calculate test results
 */
export function calculateResults(questions, userAnswers) {
    let correct = 0;
    let wrong = 0;
    let unanswered = 0;

    questions.forEach((question, index) => {
        const userAnswer = userAnswers[index];
        if (!userAnswer) {
            unanswered++;
        } else if (userAnswer === question.correctAnswerId) {
            correct++;
        } else {
            wrong++;
        }
    });

    const total = questions.length;
    const score = Math.round((correct / total) * 100);

    return { total, correct, wrong, unanswered, score, passed: score >= 70 };
}

// ── Helpers ─────────────────────────────────────────────────────────────

const ALL_TYPES = Object.values(QUESTION_TYPES);

function getWeightedQuestionType(ctx, usedTypes = new Set()) {
    // If clinical context available, weight towards richer types
    const weights = ctx
        ? {
            [QUESTION_TYPES.IDENTIFY_SOUND]: 30,
            [QUESTION_TYPES.CLINICAL_SIGNIFICANCE]: 30,
            [QUESTION_TYPES.MECHANISM]: 25,
            [QUESTION_TYPES.PHASE_CHARACTERISTICS]: 15,
        }
        : {
            [QUESTION_TYPES.IDENTIFY_SOUND]: 100,
            [QUESTION_TYPES.CLINICAL_SIGNIFICANCE]: 0,
            [QUESTION_TYPES.MECHANISM]: 0,
            [QUESTION_TYPES.PHASE_CHARACTERISTICS]: 0,
        };

    // Prefer unused types
    const available = ALL_TYPES.filter(t => !usedTypes.has(t) && weights[t] > 0);
    if (available.length > 0) {
        const totalW = available.reduce((s, t) => s + weights[t], 0);
        let r = Math.random() * totalW;
        for (const t of available) {
            r -= weights[t];
            if (r <= 0) return t;
        }
        return available[available.length - 1];
    }

    // All used — fully random from non-zero
    const nonZero = ALL_TYPES.filter(t => weights[t] > 0);
    return pickRandom(nonZero);
}

function pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

const SOUND_QUESTIONS_V2 = [
    'Прослушайте запись. Какой аускультативный феномен вы определяете?',
    'Определите аускультативный феномен на записи:',
    'Прослушайте аудиозапись и выберите наиболее вероятный феномен:',
    'Какой звук выслушивается в данной записи?',
    'Какой аускультативный феномен наиболее соответствует записи?',
];

/**
 * Get wrong answers, deduplicating by display text
 */
function getWrongAnswers(allRecords, correctRecord, count, questionType) {
    const wrong = allRecords.filter(r => r.id !== correctRecord.id);
    const shuffled = shuffleArray(wrong);

    const seen = new Set();
    const correctText = correctRecord.name;
    seen.add(correctText);

    const result = [];
    for (const record of shuffled) {
        const text = record.name;
        if (!text || seen.has(text)) continue;
        seen.add(text);
        result.push(record);
        if (result.length >= count) break;
    }
    return result;
}

function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}
