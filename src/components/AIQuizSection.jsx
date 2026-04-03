import { useState, useRef, useEffect } from 'react';
import { Card, Button, Radio, Typography, Progress, Space, Alert, Statistic, Row, Col, Select, Spin } from 'antd';
import {
    PlayCircleOutlined,
    PauseCircleOutlined,
    CheckCircleOutlined,
    CloseCircleOutlined,
    TrophyOutlined,
    ReloadOutlined,
    RobotOutlined,
    SoundOutlined,
    LockOutlined
} from '@ant-design/icons';
import { generateQuizQuestions } from '../services/ai';
import { supabase } from '../services/supabase';
import './AIQuizSection.css';

const { Title, Text, Paragraph } = Typography;

function AIQuizSection({ user, participant }) {
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
    const [isPlaying, setIsPlaying] = useState(false);
    const audioRef = useRef(null);

    // Stop audio when question changes
    useEffect(() => {
        const audio = audioRef.current;
        if (audio) {
            audio.pause();
            audio.currentTime = 0;
            setIsPlaying(false);
        }
    }, [currentQuestionIndex]);

    // Cleanup audio on unmount
    useEffect(() => {
        return () => {
            const audio = audioRef.current;
            if (audio) {
                audio.pause();
                audio.currentTime = 0;
            }
        };
    }, []);

    const generateQuiz = async () => {
        setLoading(true);
        setError(null);

        try {
            const rawQuestions = await generateQuizQuestions({
                count: questionCount,
                category,
                difficulty,
                language: 'ru',
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
                ? 'Превышено время ожидания. Попробуйте ещё раз или выберите меньше вопросов.'
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

    const finishTest = async () => {
        // Stop audio
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
        }

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

        const quizResults = { total, correct, wrong, unanswered, score, passed: score >= 70 };
        setResults(quizResults);
        setTestCompleted(true);

        // Save quiz results to test_sessions (same table as Test)
        const canSave = !!(participant || user);
        if (canSave) {
            const answersPayload = questions.map((q, i) => {
                const selectedId = userAnswers[i] ?? null;
                const correctOpt = q.options.find(opt => opt.isCorrect);
                const selectedOpt = selectedId ? q.options.find(opt => opt.id === selectedId) : null;
                return {
                    question: q.question,
                    user_answer: selectedOpt?.text || selectedId,
                    correct_answer: correctOpt?.text || '',
                    is_correct: selectedId === correctOpt?.id,
                };
            });

            const { error } = await supabase.from('test_sessions').insert({
                user_id: user?.id || null,
                participant_id: participant?.id || null,
                session_type: 'quiz',
                score: quizResults.score,
                total_q: quizResults.total,
                correct_q: quizResults.correct,
                answers: answersPayload,
                category: category,
            });

            if (error) {
                console.error('Error saving quiz session:', error);
            }
        }
    };

    const toggleAudio = () => {
        const audio = audioRef.current;
        if (!audio) return;
        if (audio.paused) {
            audio.play().catch(() => {});
        } else {
            audio.pause();
            audio.currentTime = 0;
        }
    };

    const resetQuiz = () => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
        }
        setTestStarted(false);
        setQuestions([]);
        setCurrentQuestionIndex(0);
        setUserAnswers({});
        setShowExplanation(false);
        setTestCompleted(false);
        setResults(null);
        setIsPlaying(false);
    };

    // Auth gate — require login (participant OR user)
    if (!user && !participant) {
        return (
            <div className="ai-quiz-section">
                <Title level={2}>
                    <RobotOutlined /> Квиз
                </Title>
                <Card style={{ maxWidth: 600, textAlign: 'center' }}>
                    <LockOutlined style={{ fontSize: 48, color: '#8c8c8c', marginBottom: 16 }} />
                    <Title level={4}>Требуется авторизация</Title>
                    <Paragraph type="secondary">
                        Для прохождения квиза необходимо войти в аккаунт или зарегистрироваться.
                    </Paragraph>
                </Card>
            </div>
        );
    }

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
                                            { value: 'easy', label: 'Базовый' },
                                            { value: 'medium', label: 'Средний' },
                                            { value: 'hard', label: 'Продвинутый' },
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

                        {/* Audio player with play/stop */}
                        {currentQuestion?.audio_url && (
                            <div className="audio-player-container">
                                <audio
                                    ref={audioRef}
                                    src={currentQuestion.audio_url}
                                    preload="auto"
                                    onPlay={() => setIsPlaying(true)}
                                    onPause={() => setIsPlaying(false)}
                                    onEnded={() => setIsPlaying(false)}
                                />
                                <Button
                                    type="primary"
                                    icon={isPlaying ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
                                    onClick={toggleAudio}
                                    style={{ marginTop: 8 }}
                                >
                                    {isPlaying ? 'Остановить' : 'Прослушать звук'}
                                </Button>
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

                    {showExplanation && (
                        <Alert
                            message={isCorrect ? 'Правильно!' : 'Неправильно'}
                            description={currentQuestion?.explanation}
                            type={isCorrect ? 'success' : 'error'}
                            showIcon
                        />
                    )}

                    {showExplanation && (
                        <Button
                            type="primary"
                            size="large"
                            onClick={handleNext}
                            block
                        >
                            {currentQuestionIndex < questions.length - 1 ? 'Следующий вопрос' : 'Завершить тест'}
                        </Button>
                    )}
                </Space>
            </Card>
        </div>
    );
}

export default AIQuizSection;
