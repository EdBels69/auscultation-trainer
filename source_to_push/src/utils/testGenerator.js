export async function enrichQuestionsWithAI(questions, difficulty, supabaseUrl, supabaseKey) {
    if (difficulty === 'easy') {
        return questions;
    }

    try {
        const apiUrl = `${supabaseUrl}/functions/v1/generate-quiz`;
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${supabaseKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                difficulty,
                count: questions.length,
                language: 'ru'
            })
        });

        if (!response.ok) {
            console.warn('AI enrichment failed, returning plain questions');
            return questions;
        }

        const aiData = await response.json();
        if (!aiData.questions) return questions;

        return questions.map((q, idx) => {
            const aiQuestion = aiData.questions[idx];
            if (!aiQuestion) return q;

            if (difficulty === 'medium') {
                return {
                    ...q,
                    theoryQuestion: aiQuestion.question
                };
            } else if (difficulty === 'hard') {
                return {
                    ...q,
                    clinicalCase: aiQuestion.question
                };
            }
            return q;
        });
    } catch (error) {
        console.error('Error enriching questions with AI:', error);
        return questions;
    }
}

export function generateTest(audioRecords, learningNodes = [], options = {}) {
    const { count = 10, mode = 'both', difficulty = 'medium' } = options;

    if (!audioRecords || audioRecords.length === 0) {
        return [];
    }

    let validRecords = audioRecords.filter(r => r.audioUrl && r.audioUrl !== '');

    if (mode !== 'both') {
        validRecords = validRecords.filter(r => r.category === mode);
    }

    if (validRecords.length === 0) {
        return [];
    }

    const nodeMap = {};
    learningNodes.forEach(node => {
        nodeMap[node.key] = node;
    });

    const shuffled = [...validRecords].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, Math.min(count, validRecords.length));

    return selected.map((record, index) => {
        const linkedNode = record.linkedNodeKey ? nodeMap[record.linkedNodeKey] : null;
        const answers = generateAnswers(record, validRecords, difficulty);
        const questionType = getQuestionTypeByDifficulty(difficulty);

        return {
            id: record.id,
            questionNumber: index + 1,
            question: getQuestionByDifficulty(difficulty),
            audioUrl: record.audioUrl,
            imageUrl: linkedNode?.image_url || record.auscultationImageUrl || null,
            audiogramUrl: linkedNode?.audiogram_url || null,
            position: record.auscultationPoint || null,
            correctAnswerId: record.id,
            answers: answers,
            explanation: record.description || `Это ${record.name}`,
            category: record.category,
            difficulty,
            type: questionType,
            theoryQuestion: null,
            clinicalCase: null
        };
    });
}

function getQuestionByDifficulty(difficulty) {
    switch (difficulty) {
        case 'easy':
            return 'Какой звук вы слышите? (выберите из 2 вариантов)';
        case 'medium':
            return 'Какой звук вы слышите? (выберите из 4 вариантов)';
        case 'hard':
            return 'Определите звук и клинический случай (выберите из 5 вариантов)';
        default:
            return 'Какой звук вы слышите?';
    }
}

export function getQuestionTypeByDifficulty(difficulty) {
    switch (difficulty) {
        case 'easy':
            return 'audio_only';
        case 'medium':
            return 'audio_with_theory';
        case 'hard':
            return 'audio_with_clinical_case';
        default:
            return 'audio_only';
    }
}

function generateAnswers(correctRecord, allRecords, difficulty = 'medium') {
    const wrongCount = difficulty === 'easy' ? 1 : difficulty === 'hard' ? 4 : 3;

    const sameCategory = allRecords.filter(
        r => r.category === correctRecord.category && r.id !== correctRecord.id
    );

    const shuffledOptions = [...sameCategory].sort(() => Math.random() - 0.5);
    const wrongRecords = shuffledOptions.slice(0, wrongCount);

    const answers = [
        { id: correctRecord.id, text: correctRecord.name, isCorrect: true },
        ...wrongRecords.map(r => ({ id: r.id, text: r.name, isCorrect: false }))
    ];

    return answers.sort(() => Math.random() - 0.5);
}

export function calculateResults(questions, userAnswers) {
    let correct = 0;
    let wrong = 0;
    let unanswered = 0;
    let total = questions.length;

    const details = questions.map((question, index) => {
        const userAnswer = userAnswers[index];
        const correctAnswer = question.answers.find(a => a.isCorrect);
        const isCorrect = userAnswer === correctAnswer?.id;

        if (!userAnswer) {
            unanswered++;
        } else if (isCorrect) {
            correct++;
        } else {
            wrong++;
        }

        return {
            questionNumber: question.questionNumber,
            audioId: question.id,
            audioName: correctAnswer?.text || '',
            correctAnswer: correctAnswer?.text || '',
            userAnswer: userAnswer ? question.answers.find(a => a.id === userAnswer)?.text : 'Не отвечено',
            isCorrect: isCorrect,
            category: question.category,
            type: question.type,
            theoryQuestion: question.theoryQuestion || null,
            clinicalCase: question.clinicalCase || null
        };
    });

    const score = total > 0 ? Math.round((correct / total) * 100) : 0;

    return {
        correct,
        wrong,
        unanswered,
        total,
        score,
        passed: score >= 70,
        details
    };
}
