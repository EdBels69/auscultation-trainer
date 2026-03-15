import { useState, useRef, useEffect, useMemo } from 'react';
import { Card, Button, Radio, Typography, Progress, Space, Alert, Statistic, Row, Col, Spin, Segmented, InputNumber, Tag, Divider, message } from 'antd';
import {
    PlayCircleOutlined,
    PauseCircleOutlined,
    CheckCircleOutlined,
    CloseCircleOutlined,
    TrophyOutlined,
    ReloadOutlined,
    HeartOutlined,
    ExperimentOutlined,
    MinusCircleOutlined,
    SoundOutlined,
    EnvironmentOutlined
} from '@ant-design/icons';
import { generateTest, calculateResults, enrichQuestionsWithAI } from '../utils/testGenerator';
import { getLearningNodes } from '../services/api';
import { saveTestAttempt, trackTestStart, checkAndUnlockAchievements, ACHIEVEMENT_DEFINITIONS } from '../services/analytics';

const { Title, Text } = Typography;

// Small audio replay button for the review screen
function ReviewAudioButton({ audioUrl }) {
    const [playing, setPlaying] = useState(false);
    const ref = useRef(null);

    const toggle = () => {
        if (!ref.current) return;
        if (playing) {
            ref.current.pause();
            ref.current.currentTime = 0;
            setPlaying(false);
        } else {
            ref.current.play();
            setPlaying(true);
        }
    };

    return (
        <>
            <audio ref={ref} src={audioUrl} onEnded={() => setPlaying(false)} />
            <Button
                size="small"
                type={playing ? 'primary' : 'default'}
                icon={<SoundOutlined />}
                onClick={toggle}
                style={{ flexShrink: 0 }}
            >
                {playing ? 'Стоп' : 'Слушать'}
            </Button>
        </>
    );
}

function TestSection({ audioRecords, onTestComplete }) {
    const [testStarted, setTestStarted] = useState(false);
    const [questions, setQuestions] = useState([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [userAnswers, setUserAnswers] = useState({});
    const [showExplanation, setShowExplanation] = useState(false);
    const [testCompleted, setTestCompleted] = useState(false);
    const [results, setResults] = useState(null);
    const [learningNodes, setLearningNodes] = useState([]);
    const [loadingNodes, setLoadingNodes] = useState(true);
    const [testStartTime, setTestStartTime] = useState(null);
    const audioRef = useRef(null);
    const [audioPlaying, setAudioPlaying] = useState(false);

    const [testMode, setTestMode] = useState('both');
    const [difficulty, setDifficulty] = useState('medium');
    const [questionCount, setQuestionCount] = useState(10);
    const [loadingTest, setLoadingTest] = useState(false);

    const minRecordsRequired = 5;

    useEffect(() => {
        const loadNodes = async () => {
            try {
                const nodes = await getLearningNodes();
                setLearningNodes(nodes);
            } catch (error) {
                console.error('Error loading nodes:', error);
            } finally {
                setLoadingNodes(false);
            }
        };
        loadNodes();
    }, []);

    const availableRecords = useMemo(() => {
        if (testMode === 'both') return audioRecords.filter(r => r.audioUrl);
        return audioRecords.filter(r => r.audioUrl && r.category === testMode);
    }, [audioRecords, testMode]);

    useEffect(() => {
        const max = availableRecords.length;
        if (questionCount > max && max >= 5) {
            setQuestionCount(max);
        }
    }, [availableRecords.length, questionCount]);

    const startTest = async () => {
        setLoadingTest(true);
        try {
            const test = generateTest(audioRecords, learningNodes, {
                count: questionCount,
                mode: testMode,
                difficulty
            });

            let enrichedTest = test;
            if (difficulty !== 'easy') {
                enrichedTest = await enrichQuestionsWithAI(
                    test,
                    difficulty,
                    import.meta.env.VITE_SUPABASE_URL,
                    import.meta.env.VITE_SUPABASE_ANON_KEY
                );
            }

            setQuestions(enrichedTest);
            setCurrentQuestionIndex(0);
            setUserAnswers({});
            setShowExplanation(false);
            setTestCompleted(false);
            setResults(null);
            setTestStarted(true);
            setTestStartTime(Date.now());
            trackTestStart('local');
        } catch (error) {
            console.error('Error starting test:', error);
        } finally {
            setLoadingTest(false);
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
        const testResults = calculateResults(questions, userAnswers);
        setResults(testResults);
        setTestCompleted(true);

        const durationSeconds = testStartTime ? Math.round((Date.now() - testStartTime) / 1000) : 0;
        await saveTestAttempt('local', testResults, durationSeconds, {
            mode: testMode,
            difficulty,
            questionCount
        });

        // Проверяем и выдаём достижения
        checkAndUnlockAchievements(testResults, { mode: testMode, difficulty })
            .then((unlockedKeys) => {
                if (unlockedKeys && unlockedKeys.length > 0) {
                    const def = ACHIEVEMENT_DEFINITIONS.find(a => a.key === unlockedKeys[0]);
                    if (def) {
                        message.success(`${def.icon} Достижение разблокировано: ${def.label}!`, 4);
                    }
                }
            })
            .catch(() => {});

        // Передаём результат наверх (для контекста ИИ-помощника)
        onTestComplete?.(testResults, { mode: testMode, difficulty, questionCount });
    };

    const toggleAudio = () => {
        if (!audioRef.current) return;
        if (audioPlaying) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
            setAudioPlaying(false);
        } else {
            audioRef.current.play();
            setAudioPlaying(true);
        }
    };

    // Reset audio state when question changes
    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
        }
        setAudioPlaying(false);
    }, [currentQuestionIndex]);

    if (loadingNodes) {
        return (
            <div style={{ padding: '32px 0', textAlign: 'center' }}>
                <Spin size="large" />
            </div>
        );
    }

    if (audioRecords.length < minRecordsRequired) {
        return (
            <div style={{ padding: '32px 0' }}>
                <Title level={2}>Тестирование</Title>
                <Alert
                    message="Недостаточно записей"
                    description={`Для тестирования необходимо минимум ${minRecordsRequired} аудиозаписей. Сейчас доступно: ${audioRecords.length}`}
                    type="info"
                    showIcon
                    style={{ maxWidth: 600 }}
                />
            </div>
        );
    }

    const modeOptions = [
        { label: <span><HeartOutlined /> Кардио</span>, value: 'cardiac' },
        { label: <span><ExperimentOutlined /> Пульмо</span>, value: 'pulmonary' },
        { label: 'Все', value: 'both' }
    ];

    const difficultyOptions = [
        { label: 'Легкий', value: 'easy' },
        { label: 'Средний', value: 'medium' },
        { label: 'Сложный', value: 'hard' }
    ];

    const getModeLabel = (mode) => {
        if (mode === 'cardiac') return 'Кардиология';
        if (mode === 'pulmonary') return 'Пульмонология';
        return 'Все разделы';
    };

    const getDifficultyLabel = (diff) => {
        if (diff === 'easy') return 'Легкий (2 варианта)';
        if (diff === 'hard') return 'Сложный (5 вариантов)';
        return 'Средний (4 варианта)';
    };

    if (!testStarted) {
        return (
            <div style={{ padding: '32px 0' }}>
                <Title level={2}>Тестирование знаний</Title>
                <Card style={{ maxWidth: 600, marginTop: 24 }}>
                    <Space direction="vertical" size="large" style={{ width: '100%' }}>
                        <div>
                            <Title level={4}>Настройки теста</Title>
                        </div>

                        <div>
                            <Text strong style={{ display: 'block', marginBottom: 8 }}>Раздел</Text>
                            <Segmented
                                options={modeOptions}
                                value={testMode}
                                onChange={setTestMode}
                                block
                            />
                            <Text type="secondary" style={{ display: 'block', marginTop: 4, fontSize: 12 }}>
                                Доступно записей: {availableRecords.length}
                            </Text>
                        </div>

                        <div>
                            <Text strong style={{ display: 'block', marginBottom: 8 }}>Сложность</Text>
                            <Segmented
                                options={difficultyOptions}
                                value={difficulty}
                                onChange={setDifficulty}
                                block
                            />
                        </div>

                        <div>
                            <Text strong style={{ display: 'block', marginBottom: 8 }}>
                                Количество вопросов
                            </Text>
                            <InputNumber
                                min={5}
                                max={Math.min(50, availableRecords.length)}
                                step={1}
                                value={questionCount}
                                onChange={v => v && setQuestionCount(v)}
                                style={{ width: 120 }}
                            />
                        </div>

                        <Alert
                            type="info"
                            showIcon
                            message="Информация о тесте"
                            description={
                                <ul style={{ margin: 0, paddingLeft: 20 }}>
                                    <li>Минимальный балл для прохождения: 70%</li>
                                    <li>Вы можете прослушать каждый звук несколько раз</li>
                                    <li>Результаты сохраняются в вашем профиле</li>
                                </ul>
                            }
                        />

                        <Button
                            type="primary"
                            size="large"
                            onClick={startTest}
                            icon={<PlayCircleOutlined />}
                            block
                            disabled={availableRecords.length < minRecordsRequired || loadingTest}
                            loading={loadingTest}
                        >
                            {loadingTest ? 'Загрузка...' : 'Начать тест'}
                        </Button>

                        {availableRecords.length < minRecordsRequired && (
                            <Alert
                                type="warning"
                                message={`Недостаточно записей для выбранного раздела (минимум ${minRecordsRequired})`}
                            />
                        )}
                    </Space>
                </Card>
            </div>
        );
    }

    if (testCompleted && results) {
        return (
            <div style={{ padding: '32px 0' }}>
                <Title level={2}>Результаты теста</Title>

                {/* ── Score card ─────────────────────────────────── */}
                <Card style={{ maxWidth: 800, marginTop: 24, borderRadius: 12 }}>
                    <div style={{ textAlign: 'center', marginBottom: 24 }}>
                        <TrophyOutlined style={{
                            fontSize: 56,
                            color: results.passed ? '#52c41a' : '#faad14',
                            marginBottom: 8
                        }} />
                        <Title level={3} style={{ margin: 0 }}>
                            {results.passed ? 'Тест пройден!' : 'Попробуйте ещё раз'}
                        </Title>
                        <Text type="secondary">
                            {getModeLabel(testMode)} · {getDifficultyLabel(difficulty)}
                        </Text>
                    </div>

                    <Row gutter={16} style={{ marginBottom: 24 }}>
                        <Col xs={12} sm={6}>
                            <Statistic title="Балл" value={results.score} suffix="%" valueStyle={{ color: results.passed ? '#52c41a' : '#faad14' }} />
                        </Col>
                        <Col xs={12} sm={6}>
                            <Statistic title="Правильно" value={results.correct} suffix={`/ ${results.total}`} valueStyle={{ color: '#52c41a' }} />
                        </Col>
                        <Col xs={12} sm={6}>
                            <Statistic title="Ошибок" value={results.wrong} valueStyle={{ color: '#ff4d4f' }} />
                        </Col>
                        <Col xs={12} sm={6}>
                            <Statistic title="Пропущено" value={results.unanswered} valueStyle={{ color: '#8c8c8c' }} />
                        </Col>
                    </Row>

                    {results.passed ? (
                        <Alert message="Отличная работа!" description="Вы успешно прошли тест." type="success" showIcon />
                    ) : (
                        <Alert message="Требуется больше практики" description="Повторите материал в разделе «Обучение» и попробуйте снова." type="warning" showIcon />
                    )}
                </Card>

                {/* ── Detailed review ────────────────────────────── */}
                <div style={{ maxWidth: 800, marginTop: 24 }}>
                    <Title level={4} style={{ marginBottom: 12 }}>
                        Разбор вопросов
                    </Title>

                    <Space direction="vertical" size={12} style={{ width: '100%' }}>
                        {results.details.map((detail, idx) => {
                            const question = questions[idx];
                            const isCorrect = detail.isCorrect;
                            const isSkipped = detail.userAnswer === 'Не отвечено';

                            const borderColor = isCorrect ? '#b7eb8f' : isSkipped ? '#d9d9d9' : '#ffa39e';
                            const bgColor = isCorrect ? '#f6ffed' : isSkipped ? '#fafafa' : '#fff2f0';

                            return (
                                <Card
                                    key={idx}
                                    size="small"
                                    style={{
                                        borderRadius: 8,
                                        border: `1px solid ${borderColor}`,
                                        background: bgColor
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                                        {/* Status icon */}
                                        <div style={{ flexShrink: 0, marginTop: 2 }}>
                                            {isCorrect
                                                ? <CheckCircleOutlined style={{ fontSize: 20, color: '#52c41a' }} />
                                                : isSkipped
                                                    ? <MinusCircleOutlined style={{ fontSize: 20, color: '#8c8c8c' }} />
                                                    : <CloseCircleOutlined style={{ fontSize: 20, color: '#ff4d4f' }} />
                                            }
                                        </div>

                                        {/* Content */}
                                        <div style={{ flex: 1 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                                                <Text strong>Вопрос {detail.questionNumber}</Text>
                                                <Tag color={detail.category === 'cardiac' ? 'red' : 'blue'} style={{ margin: 0 }}>
                                                    {detail.category === 'cardiac' ? 'Кардио' : 'Пульмо'}
                                                </Tag>
                                                {isCorrect
                                                    ? <Tag color="success" style={{ margin: 0 }}>Правильно</Tag>
                                                    : isSkipped
                                                        ? <Tag color="default" style={{ margin: 0 }}>Пропущено</Tag>
                                                        : <Tag color="error" style={{ margin: 0 }}>Ошибка</Tag>
                                                }
                                            </div>

                                            {/* Correct answer */}
                                            <div style={{ marginBottom: 4 }}>
                                                <Text type="secondary" style={{ fontSize: 12 }}>Правильный ответ: </Text>
                                                <Text strong style={{ color: '#52c41a' }}>{detail.correctAnswer}</Text>
                                            </div>

                                            {/* User answer (only if wrong) */}
                                            {!isCorrect && !isSkipped && (
                                                <div style={{ marginBottom: 4 }}>
                                                    <Text type="secondary" style={{ fontSize: 12 }}>Ваш ответ: </Text>
                                                    <Text strong style={{ color: '#ff4d4f' }}>{detail.userAnswer}</Text>
                                                </div>
                                            )}

                                            {/* Clinical case / theory hint */}
                                            {detail.clinicalCase && (
                                                <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 4 }}>
                                                    📋 {detail.clinicalCase}
                                                </Text>
                                            )}
                                            {detail.theoryQuestion && (
                                                <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 4 }}>
                                                    📚 {detail.theoryQuestion}
                                                </Text>
                                            )}
                                        </div>

                                        {/* Audio replay button */}
                                        {question?.audioUrl && (
                                            <ReviewAudioButton audioUrl={question.audioUrl} />
                                        )}
                                    </div>
                                </Card>
                            );
                        })}
                    </Space>
                </div>

                <div style={{ maxWidth: 800, marginTop: 24 }}>
                    <Button
                        type="primary"
                        size="large"
                        onClick={() => setTestStarted(false)}
                        icon={<ReloadOutlined />}
                        block
                    >
                        Новый тест
                    </Button>
                </div>
            </div>
        );
    }

    const currentQuestion = questions[currentQuestionIndex];
    const userAnswer = userAnswers[currentQuestionIndex];
    const isCorrect = userAnswer === currentQuestion?.correctAnswerId;
    const progress = Math.round(((currentQuestionIndex + 1) / questions.length) * 100);

    return (
        <div style={{ padding: '32px 0' }}>
            <div style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <Title level={2} style={{ margin: 0 }}>
                        Вопрос {currentQuestionIndex + 1} из {questions.length}
                    </Title>
                    <Text type="secondary">Прогресс: {progress}%</Text>
                </div>
                <Progress percent={progress} showInfo={false} />
            </div>

            <Card style={{ maxWidth: 900 }}>
                <audio
                    ref={audioRef}
                    src={currentQuestion?.audioUrl}
                    onEnded={() => setAudioPlaying(false)}
                />

                <Space direction="vertical" size="large" style={{ width: '100%' }}>
                    <div>
                        <Title level={4}>{currentQuestion?.question}</Title>
                        {currentQuestion?.theoryQuestion && (
                            <Alert
                                message="Дополнительный вопрос по теории"
                                description={currentQuestion.theoryQuestion}
                                type="info"
                                showIcon
                                style={{ marginTop: 12, marginBottom: 12 }}
                            />
                        )}
                        {currentQuestion?.clinicalCase && (
                            <Alert
                                message="Клинический случай"
                                description={currentQuestion.clinicalCase}
                                type="warning"
                                showIcon
                                style={{ marginTop: 12, marginBottom: 12 }}
                            />
                        )}
                        <Button
                            type={audioPlaying ? 'default' : 'primary'}
                            icon={audioPlaying ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
                            onClick={toggleAudio}
                            style={{ marginTop: 8 }}
                            danger={audioPlaying}
                        >
                            {audioPlaying ? 'Остановить' : 'Прослушать звук'}
                        </Button>
                    </div>

                    {currentQuestion?.position && (
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            padding: '10px 14px',
                            background: '#f0f5ff',
                            border: '1px solid #adc6ff',
                            borderRadius: 8,
                            fontSize: 14,
                            color: '#2f54eb'
                        }}>
                            <EnvironmentOutlined style={{ fontSize: 16, flexShrink: 0 }} />
                            <span><strong>Точка аускультации:</strong> {currentQuestion.position}</span>
                        </div>
                    )}

                    {(currentQuestion?.imageUrl || currentQuestion?.audiogramUrl) && (
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: currentQuestion?.imageUrl && currentQuestion?.audiogramUrl ? '1fr 1fr' : '1fr',
                            gap: 16,
                            marginBottom: 8
                        }}>
                            {currentQuestion?.imageUrl && (
                                <div style={{
                                    background: '#fafafa',
                                    border: '1px solid #e8e8e8',
                                    borderRadius: 8,
                                    padding: 12,
                                    textAlign: 'center'
                                }}>
                                    <Text type="secondary" style={{ display: 'block', marginBottom: 8, fontSize: 12 }}>
                                        Точка аускультации
                                    </Text>
                                    <img
                                        src={currentQuestion.imageUrl}
                                        alt="Точка аускультации"
                                        style={{ maxWidth: '100%', maxHeight: 200, objectFit: 'contain', borderRadius: 4 }}
                                    />
                                </div>
                            )}
                            {currentQuestion?.audiogramUrl && (
                                <div style={{
                                    background: '#fafafa',
                                    border: '1px solid #e8e8e8',
                                    borderRadius: 8,
                                    padding: 12,
                                    textAlign: 'center'
                                }}>
                                    <Text type="secondary" style={{ display: 'block', marginBottom: 8, fontSize: 12 }}>
                                        Аудиограмма
                                    </Text>
                                    <img
                                        src={currentQuestion.audiogramUrl}
                                        alt="Аудиограмма"
                                        style={{ maxWidth: '100%', maxHeight: 120, objectFit: 'contain', borderRadius: 4 }}
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    <Radio.Group
                        value={userAnswer}
                        onChange={(e) => handleAnswer(e.target.value)}
                        disabled={showExplanation}
                        style={{ width: '100%' }}
                    >
                        <Space direction="vertical" style={{ width: '100%' }}>
                            {currentQuestion?.answers.map((answer) => (
                                <Radio
                                    key={answer.id}
                                    value={answer.id}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        padding: 12,
                                        border: '1px solid #d9d9d9',
                                        borderRadius: 4,
                                        backgroundColor: showExplanation
                                            ? answer.isCorrect
                                                ? '#f6ffed'
                                                : answer.id === userAnswer && !answer.isCorrect
                                                    ? '#fff2f0'
                                                    : 'transparent'
                                            : 'transparent'
                                    }}
                                >
                                    <span style={{ flex: 1, display: 'block' }}>{answer.text}</span>
                                    {showExplanation && answer.isCorrect && (
                                        <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 18, marginLeft: 8 }} />
                                    )}
                                    {showExplanation && answer.id === userAnswer && !answer.isCorrect && (
                                        <CloseCircleOutlined style={{ color: '#ff4d4f', fontSize: 18, marginLeft: 8 }} />
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
        </div >
    );
}

export default TestSection;
