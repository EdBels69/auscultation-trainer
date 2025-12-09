import { useState, useRef } from 'react';
import { Card, Button, Radio, Typography, Progress, Space, Alert, Statistic, Row, Col, Select, Spin } from 'antd';
import {
    PlayCircleOutlined,
    CheckCircleOutlined,
    CloseCircleOutlined,
    TrophyOutlined,
    ReloadOutlined,
    RobotOutlined,
    SoundOutlined
} from '@ant-design/icons';
import './AIQuizSection.css';

const { Title, Text, Paragraph } = Typography;

// n8n webhook URL
const N8N_WEBHOOK_URL = 'https://n8n-usi.ru/webhook-test/4ac6c045-41c3-48b7-8d33-2c98a800d479';

function AIQuizSection() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [testStarted, setTestStarted] = useState(false);
    const [questions, setQuestions] = useState([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [userAnswers, setUserAnswers] = useState({});
    const [showExplanation, setShowExplanation] = useState(false);
    const [testCompleted, setTestCompleted] = useState(false);
    const [results, setResults] = useState(null);
    const [questionCount, setQuestionCount] = useState(5);
    const [category, setCategory] = useState('all');
    const [difficulty, setDifficulty] = useState('low');
    const audioRef = useRef(null);

    const generateQuiz = async () => {
        setLoading(true);
        setError(null);

        // Helper function to try to fix common JSON errors from AI
        const tryParseJSON = (str) => {
            try {
                return JSON.parse(str);
            } catch (e) {
                // Try to fix common errors like missing quotes
                try {
                    // Fix patterns like {"id: "b" -> {"id": "b"
                    const fixed = str.replace(/\{"id:\s*"/g, '{"id": "');
                    return JSON.parse(fixed);
                } catch (e2) {
                    console.error('Failed to parse JSON even after fix attempt:', e2);
                    return null;
                }
            }
        };

        try {
            const response = await fetch(N8N_WEBHOOK_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    count: questionCount,
                    category: category,
                    difficulty: difficulty
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            // Debug: log what we received
            console.log('n8n response:', JSON.stringify(data, null, 2));

            // Parse different response formats from n8n
            let parsedQuestions = [];

            // Format 1: { questions: [...] }
            if (data.questions && Array.isArray(data.questions)) {
                parsedQuestions = data.questions;
            }
            // Format 2: { output: { questions: [...] } } or { output: "[...]" }
            else if (data.output) {
                try {
                    const parsed = typeof data.output === 'string'
                        ? tryParseJSON(data.output)
                        : data.output;
                    if (parsed) {
                        parsedQuestions = parsed.questions || (Array.isArray(parsed) ? parsed : []);
                    }
                } catch (e) {
                    console.error('Failed to parse output:', e);
                }
            }
            // Format 3: Array with output objects - [{ output: { questions: [...] } }]
            else if (Array.isArray(data) && data.length > 0) {
                // Check if first item has output
                if (data[0]?.output) {
                    data.forEach(item => {
                        const output = item.output;
                        if (output?.questions && Array.isArray(output.questions)) {
                            parsedQuestions.push(...output.questions);
                        }
                    });
                }
                // Or direct array of questions
                else if (data[0]?.question) {
                    parsedQuestions = data;
                }
            }

            console.log('Parsed questions:', parsedQuestions);

            // Normalize question format (handle is_correct vs isCorrect, string booleans)
            const normalizedQuestions = parsedQuestions.map((q, index) => ({
                id: q.id || index + 1,
                question: q.question,
                audio_url: q.audio_url || q.audioUrl,
                audiogram_url: (q.audiogram_url === 'null' || q.audiogram_url === null) ? null : q.audiogram_url,
                explanation: q.explanation || q.topic || '',
                options: (q.options || []).map((opt, optIndex) => ({
                    id: opt.id || String.fromCharCode(97 + optIndex),
                    text: opt.text,
                    // Handle string booleans "true"/"false" and actual booleans
                    isCorrect: opt.isCorrect === true || opt.isCorrect === 'true' ||
                        opt.is_correct === true || opt.is_correct === 'true',
                    audio_url: opt.audio_url
                }))
            }));

            if (normalizedQuestions.length > 0) {
                setQuestions(normalizedQuestions);
                setCurrentQuestionIndex(0);
                setUserAnswers({});
                setShowExplanation(false);
                setTestCompleted(false);
                setResults(null);
                setTestStarted(true);
            } else {
                throw new Error('Не удалось получить вопросы от AI');
            }
        } catch (err) {
            console.error('Quiz generation error:', err);
            setError(err.message || 'Ошибка при генерации квиза');
        } finally {
            setLoading(false);
        }
    };

    const handleAnswer = (answerId) => {
        setUserAnswers({
            ...userAnswers,
            [currentQuestionIndex]: answerId
        });
        setShowExplanation(true);
    };

    const handleNext = () => {
        if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex(currentQuestionIndex + 1);
            setShowExplanation(false);
        } else {
            finishTest();
        }
    };

    const finishTest = () => {
        let correct = 0;
        let wrong = 0;

        questions.forEach((question, index) => {
            const userAnswer = userAnswers[index];
            const correctOption = question.options.find(opt => opt.isCorrect);

            if (userAnswer === correctOption?.id) {
                correct++;
            } else if (userAnswer) {
                wrong++;
            }
        });

        const total = questions.length;
        const unanswered = total - correct - wrong;
        const score = Math.round((correct / total) * 100);

        setResults({
            total,
            correct,
            wrong,
            unanswered,
            score,
            passed: score >= 70
        });
        setTestCompleted(true);
    };

    const playAudio = () => {
        if (audioRef.current) {
            audioRef.current.play();
        }
    };

    const resetQuiz = () => {
        setTestStarted(false);
        setQuestions([]);
        setCurrentQuestionIndex(0);
        setUserAnswers({});
        setShowExplanation(false);
        setTestCompleted(false);
        setResults(null);
    };

    // Start screen
    if (!testStarted) {
        return (
            <div className="ai-quiz-section">
                <Title level={2}>
                    <RobotOutlined /> AI Квиз
                </Title>

                <Card className="ai-quiz-start-card">
                    <Space direction="vertical" size="large" style={{ width: '100%' }}>
                        <div className="ai-quiz-intro">
                            <Title level={4}>Тестирование с AI</Title>
                            <Paragraph type="secondary">
                                Вопросы генерируются искусственным интеллектом на основе
                                реальных звуков аускультации из нашей базы данных.
                            </Paragraph>
                        </div>

                        <div className="ai-quiz-settings">
                            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                                <div>
                                    <Text strong>Количество вопросов:</Text>
                                    <Select
                                        value={questionCount}
                                        onChange={setQuestionCount}
                                        style={{ width: '100%', marginTop: 8 }}
                                        options={[
                                            { value: 1, label: '1 вопрос' },
                                            { value: 5, label: '5 вопросов' },
                                            { value: 10, label: '10 вопросов' },
                                            { value: 30, label: '30 вопросов' },
                                        ]}
                                    />
                                </div>
                                <div>
                                    <Text strong>Категория:</Text>
                                    <Select
                                        value={category}
                                        onChange={setCategory}
                                        style={{ width: '100%', marginTop: 8 }}
                                        options={[
                                            { value: 'all', label: 'Все звуки' },
                                            { value: 'cardiac', label: 'Сердце' },
                                            { value: 'pulmonary', label: 'Лёгкие' },
                                        ]}
                                    />
                                </div>
                                <div>
                                    <Text strong>Сложность:</Text>
                                    <Select
                                        value={difficulty}
                                        onChange={setDifficulty}
                                        style={{ width: '100%', marginTop: 8 }}
                                        options={[
                                            { value: 'low', label: 'Лёгкий' },
                                            { value: 'hard', label: 'Сложный' },
                                        ]}
                                    />
                                </div>
                            </Space>
                        </div>

                        {error && (
                            <Alert
                                message="Ошибка"
                                description={error}
                                type="error"
                                showIcon
                                closable
                                onClose={() => setError(null)}
                            />
                        )}

                        <Button
                            type="primary"
                            size="large"
                            onClick={generateQuiz}
                            loading={loading}
                            icon={<RobotOutlined />}
                            block
                        >
                            {loading ? 'AI генерирует вопросы...' : 'Сгенерировать квиз'}
                        </Button>
                    </Space>
                </Card>
            </div>
        );
    }

    // Results screen
    if (testCompleted && results) {
        return (
            <div className="ai-quiz-section">
                <Title level={2}>Результаты AI Квиза</Title>

                <Card className="ai-quiz-results-card">
                    <div className="results-header">
                        <TrophyOutlined className={`trophy-icon ${results.passed ? 'passed' : 'failed'}`} />
                        <Title level={3}>
                            {results.passed ? 'Тест пройден!' : 'Попробуйте еще раз'}
                        </Title>
                    </div>

                    <Row gutter={16} className="results-stats">
                        <Col span={6}>
                            <Statistic
                                title="Ваш балл"
                                value={results.score}
                                suffix="%"
                                valueStyle={{ color: results.passed ? '#52c41a' : '#faad14' }}
                            />
                        </Col>
                        <Col span={6}>
                            <Statistic
                                title="Правильно"
                                value={results.correct}
                                suffix={`/ ${results.total}`}
                                valueStyle={{ color: '#52c41a' }}
                            />
                        </Col>
                        <Col span={6}>
                            <Statistic
                                title="Неправильно"
                                value={results.wrong}
                                valueStyle={{ color: '#ff4d4f' }}
                            />
                        </Col>
                        <Col span={6}>
                            <Statistic
                                title="Пропущено"
                                value={results.unanswered}
                                valueStyle={{ color: '#8c8c8c' }}
                            />
                        </Col>
                    </Row>

                    <Space direction="vertical" size="small" style={{ width: '100%' }}>
                        {results.passed ? (
                            <Alert
                                message="Отличная работа!"
                                description="Вы успешно прошли AI-тест."
                                type="success"
                                showIcon
                            />
                        ) : (
                            <Alert
                                message="Требуется больше практики"
                                description="Изучите звуки в разделе 'Обучение' и попробуйте снова."
                                type="warning"
                                showIcon
                            />
                        )}

                        <Space style={{ width: '100%', marginTop: 16 }}>
                            <Button
                                type="primary"
                                size="large"
                                onClick={generateQuiz}
                                icon={<RobotOutlined />}
                            >
                                Новый AI квиз
                            </Button>
                            <Button
                                size="large"
                                onClick={resetQuiz}
                                icon={<ReloadOutlined />}
                            >
                                Изменить настройки
                            </Button>
                        </Space>
                    </Space>
                </Card>
            </div>
        );
    }

    // Question screen
    const currentQuestion = questions[currentQuestionIndex];
    const userAnswer = userAnswers[currentQuestionIndex];
    const correctOption = currentQuestion?.options?.find(opt => opt.isCorrect);
    const isCorrect = userAnswer === correctOption?.id;
    const progress = Math.round(((currentQuestionIndex + 1) / questions.length) * 100);

    return (
        <div className="ai-quiz-section">
            <div className="quiz-progress-header">
                <div className="quiz-progress-info">
                    <Title level={2} style={{ margin: 0 }}>
                        Вопрос {currentQuestionIndex + 1} из {questions.length}
                    </Title>
                    <Text type="secondary">Прогресс: {progress}%</Text>
                </div>
                <Progress percent={progress} showInfo={false} />
            </div>

            <Card className="ai-quiz-question-card">
                <Space direction="vertical" size="large" style={{ width: '100%' }}>
                    <div className="question-header">
                        <Title level={4}>{currentQuestion?.question}</Title>

                        {/* Audio player with controls */}
                        {currentQuestion?.audio_url && (
                            <div className="audio-player-container">
                                <audio
                                    ref={audioRef}
                                    src={currentQuestion.audio_url}
                                    controls
                                    style={{ width: '100%', marginTop: 12 }}
                                />
                            </div>
                        )}

                        {/* Audiogram image */}
                        {currentQuestion?.audiogram_url && (
                            <div className="audiogram-container">
                                <Text type="secondary">Аудиограмма:</Text>
                                <img
                                    src={currentQuestion.audiogram_url}
                                    alt="Аудиограмма"
                                    className="audiogram-image"
                                />
                            </div>
                        )}
                    </div>

                    <Radio.Group
                        value={userAnswer}
                        onChange={(e) => handleAnswer(e.target.value)}
                        disabled={showExplanation}
                        style={{ width: '100%' }}
                    >
                        <Space direction="vertical" style={{ width: '100%' }}>
                            {currentQuestion?.options?.map((option) => (
                                <Radio
                                    key={option.id}
                                    value={option.id}
                                    className={`quiz-option ${showExplanation
                                        ? option.isCorrect
                                            ? 'correct'
                                            : option.id === userAnswer && !option.isCorrect
                                                ? 'incorrect'
                                                : ''
                                        : ''
                                        }`}
                                >
                                    <span className="option-text">{option.text}</span>
                                    {showExplanation && option.isCorrect && (
                                        <CheckCircleOutlined className="option-icon correct" />
                                    )}
                                    {showExplanation && option.id === userAnswer && !option.isCorrect && (
                                        <CloseCircleOutlined className="option-icon incorrect" />
                                    )}
                                </Radio>
                            ))}
                        </Space>
                    </Radio.Group>

                    {
                        showExplanation && (
                            <Alert
                                message={isCorrect ? 'Правильно!' : 'Неправильно'}
                                description={currentQuestion?.explanation}
                                type={isCorrect ? 'success' : 'error'}
                                showIcon
                            />
                        )
                    }

                    {
                        showExplanation && (
                            <Button
                                type="primary"
                                size="large"
                                onClick={handleNext}
                                block
                            >
                                {currentQuestionIndex < questions.length - 1 ? 'Следующий вопрос' : 'Завершить тест'}
                            </Button>
                        )
                    }
                </Space >
            </Card >
        </div >
    );
}

export default AIQuizSection;
