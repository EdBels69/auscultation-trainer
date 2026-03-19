/**
 * Test question generator
 * Generates random quiz questions from audio records
 */

export const QUESTION_TYPES = {
    IDENTIFY_SOUND: 'identify_sound',
    IDENTIFY_POSITION: 'identify_position'
};

/**
 * Generate a random question from audio records
 * @param {Array} audioRecords - available records
 * @param {string|null} type - question type or null for random
 * @param {Set} usedRecordIds - IDs already used as correct answers (to avoid duplication)
 */
export function generateQuestion(audioRecords, type = null, usedRecordIds = new Set()) {
    if (!audioRecords || audioRecords.length < 3) {
        return null;
    }

    // Filter out already-used records for the correct answer
    const availableForCorrect = audioRecords.filter(r => !usedRecordIds.has(r.id));
    if (availableForCorrect.length === 0) return null;

    const questionType = type || getRandomQuestionType();
    const correctAnswer = getRandomRecord(availableForCorrect);
    const wrongAnswers = getWrongAnswers(audioRecords, correctAnswer, 3, questionType);
    const allAnswers = shuffleArray([
        { ...correctAnswer, _isCorrect: true },
        ...wrongAnswers.map(r => ({ ...r, _isCorrect: false }))
    ]);

    switch (questionType) {
        case QUESTION_TYPES.IDENTIFY_SOUND:
            return {
                type: questionType,
                question: 'Какой звук вы слышите?',
                audioUrl: correctAnswer.audioUrl,
                imageUrl: correctAnswer.imageUrl || null,
                audiogramUrl: correctAnswer.audiogramUrl || null,
                position: correctAnswer.position || null,
                answers: allAnswers.map(r => ({
                    id: r.id,
                    text: r.name,
                    isCorrect: r._isCorrect
                })),
                correctAnswerId: correctAnswer.id,
                explanation: correctAnswer.description
            };

        case QUESTION_TYPES.IDENTIFY_POSITION:
            return {
                type: questionType,
                question: `Где выслушивается звук "${correctAnswer.name}"?`,
                audioUrl: correctAnswer.audioUrl,
                imageUrl: correctAnswer.imageUrl || null,
                audiogramUrl: correctAnswer.audiogramUrl || null,
                position: correctAnswer.position || null,
                answers: allAnswers.map(r => ({
                    id: r.id,
                    text: r.position,
                    isCorrect: r._isCorrect
                })),
                correctAnswerId: correctAnswer.id,
                explanation: `${correctAnswer.name} выслушивается в точке: ${correctAnswer.position}`
            };

        default:
            return null;
    }
}

/**
 * Generate multiple questions for a test
 */
export function generateTest(audioRecords, numberOfQuestions = 10) {
    const questions = [];
    const usedRecordIds = new Set();

    // Cap to available records (each record used at most once as the correct answer)
    const maxQuestions = Math.min(numberOfQuestions, audioRecords.length);

    while (questions.length < maxQuestions) {
        const type = getRandomQuestionType();
        const question = generateQuestion(audioRecords, type, usedRecordIds);

        if (!question) break; // no more available records

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

    return {
        total,
        correct,
        wrong,
        unanswered,
        score,
        passed: score >= 70
    };
}

// Helper functions
function getRandomQuestionType() {
    const types = Object.values(QUESTION_TYPES);
    return types[Math.floor(Math.random() * types.length)];
}

function getRandomRecord(records) {
    return records[Math.floor(Math.random() * records.length)];
}

/**
 * Get wrong answers, deduplicating by display text to avoid
 * showing the same position/name twice
 */
function getWrongAnswers(allRecords, correctRecord, count, questionType) {
    const wrong = allRecords.filter(r => r.id !== correctRecord.id);
    const shuffled = shuffleArray(wrong);

    // Deduplicate by the text field that will be displayed
    const seen = new Set();
    const correctText = questionType === QUESTION_TYPES.IDENTIFY_POSITION
        ? correctRecord.position
        : correctRecord.name;
    seen.add(correctText);

    const result = [];
    for (const record of shuffled) {
        const text = questionType === QUESTION_TYPES.IDENTIFY_POSITION
            ? record.position
            : record.name;
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
