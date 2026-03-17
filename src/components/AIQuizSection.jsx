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
import { generateQuizQuestions } from '../services/ai';
import './AIQuizSection.css';

const { Title, Text, Paragraph } = Typography;

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
    const [difficulty, setDifficulty] = useState('medium');
    const audioRef = useRef(null);

    const generateQuiz = async () => {
        setLoading(true);
        setError(null);

        try {
            // Use OpenRouter/DeepSeek directly — no n8n dependency
            const rawQuestions = await generateQuizQuestions({
                count: questionCount,
                category,
                difficulty,
            });

            // Convert from AI format {options: {a,b,c,d}, correct_answer: "a"}
            // to internal format {options: [{id, text, isCorrect}]}
            const normalizedQuestions = rawQuestions.map((q, index) => {
                const optionsObj = q.options || {};
                const correctKey = (q.correct_answer || '').toLowerCase();
                return {
                    id: q.id || `q${index + 1}`,
                    question: q.question,
                    audio_url: null,
                    audiogram_url: null,
                    explanation: q.explanation || '',
                    options: Object.entries(optionsObj).map(([key, text]) => ({
                        id: key,
                        text: String(text),
                        isCorrect: key === correctKey,
                        audio_url: null,
                    })),
                };
            });

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
            console.error('Quiz generation error:', err.message || err);
            const msg = err.name === 'AbortError'
                ? 'Превышено время ожидания (45с). Попробуйте ещё раз или выберите меньше вопросов.'
                : (err.message || 'Ошибка генерации. Попробуйте ещё раз.');
            setError(msg);
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
                    <RobotOutlined /> Квиз
                </Title>

                <Card className="ai-quiz-start-card">
                    <Space direction="vertical" size="large" style={{ width: '100%' }}>
                        <div className="ai-quiz-intro">
                            <Title level={4}>Тестирование</Title>
                            <Paragraph type="secondary">
                                Вопросы генерируются на основе
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
                                            { value: 'easy', label: 'Базовый (1-2 курс)' },
                                            { value: 'medium', label: 'Средний (3-5 курс)' },
                                            { value: 'hard', label: 'Продвинутый (ординатура)' },
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
                            {loading ? 'Генерация вопросов...' : 'Сгенерировать квиз'}
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
                <Title level={2}>Результаты квиза</Title>

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
                                description="Вы успешно прошли тест."
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
                                Новый квиз
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
