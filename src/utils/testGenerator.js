/**
 * Test question generator
 * Generates random quiz questions from audio records
 */

export const QUESTION_TYPES = {
    IDENTIFY_SOUND: 'identify_sound',
    IDENTIFY_POSITION: 'identify_position',
    IDENTIFY_CATEGORY: 'identify_category'
};

/**
 * Generate a random question from audio records
 */
export function generateQuestion(audioRecords, type = null) {
    if (!audioRecords || audioRecords.length < 3) {
        return null;
    }

    const questionType = type || getRandomQuestionType();
    const correctAnswer = getRandomRecord(audioRecords);
    const wrongAnswers = getWrongAnswers(audioRecords, correctAnswer, 3);
    const allAnswers = shuffleArray([correctAnswer, ...wrongAnswers]);

    switch (questionType) {
        case QUESTION_TYPES.IDENTIFY_SOUND:
            return {
                type: questionType,
                question: 'Какой звук вы слышите?',
                audioUrl: correctAnswer.audioUrl,
                answers: allAnswers.map(r => ({
                    id: r.id,
                    text: r.name,
                    isCorrect: r.id === correctAnswer.id
                })),
                correctAnswerId: correctAnswer.id,
                explanation: correctAnswer.description
            };

        case QUESTION_TYPES.IDENTIFY_POSITION:
            return {
                type: questionType,
                question: `Где выслушивается звук "${correctAnswer.name}"?`,
                audioUrl: correctAnswer.audioUrl,
                answers: allAnswers.map(r => ({
                    id: r.id,
                    text: r.position,
                    isCorrect: r.id === correctAnswer.id
                })),
                correctAnswerId: correctAnswer.id,
                explanation: `${correctAnswer.name} выслушивается в точке: ${correctAnswer.position}`
            };

        case QUESTION_TYPES.IDENTIFY_CATEGORY:
            return {
                type: questionType,
                question: `К какой категории относится звук "${correctAnswer.name}"?`,
                audioUrl: correctAnswer.audioUrl,
                answers: [
                    {
                        id: 'cardiac',
                        text: 'Кардиология',
                        isCorrect: correctAnswer.category === 'cardiac'
                    },
                    {
                        id: 'pulmonary',
                        text: 'Пульмонология',
                        isCorrect: correctAnswer.category === 'pulmonary'
                    }
                ],
                correctAnswerId: correctAnswer.category,
                explanation: correctAnswer.description
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
    const usedRecords = new Set();

    while (questions.length < numberOfQuestions && usedRecords.size < audioRecords.length) {
        const type = getRandomQuestionType();
        const availableRecords = audioRecords.filter(r => !usedRecords.has(r.id));

        if (availableRecords.length < 3) break;

        const question = generateQuestion(availableRecords, type);
        if (question) {
            questions.push(question);
            usedRecords.add(question.correctAnswerId);
        }
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

function getWrongAnswers(allRecords, correctRecord, count) {
    const wrong = allRecords.filter(r => r.id !== correctRecord.id);
    return shuffleArray(wrong).slice(0, count);
}

function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}
