import { useState, useRef, useEffect, useMemo } from 'react';
import { Card, Button, Radio, Typography, Progress, Space, Alert, Statistic, Row, Col, Spin, Segmented, InputNumber, Skeleton } from 'antd';
import {
    PlayCircleOutlined,
    CheckCircleOutlined,
    CloseCircleOutlined,
    TrophyOutlined,
    ReloadOutlined,
    HeartOutlined,
    ExperimentOutlined
} from '@ant-design/icons';
import { generateTest, calculateResults, enrichQuestionsWithAI } from '../utils/testGenerator';
import { getLearningNodes } from '../services/api';
import { saveTestAttempt, trackTestStart } from '../services/analytics';

const { Title, Text, Paragraph } = Typography;

function TestSection({ audioRecords }) {
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
    };

    const playAudio = () => {
        if (audioRef.current) {
            audioRef.current.play();
        }
    };

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

                <Card style={{ maxWidth: 700, marginTop: 24 }}>
                    <div style={{ textAlign: 'center', marginBottom: 32 }}>
                        <TrophyOutlined style={{
                            fontSize: 64,
                            color: results.passed ? '#52c41a' : '#faad14',
                            marginBottom: 16
                        }} />
                        <Title level={3}>
                            {results.passed ? 'Тест пройден!' : 'Попробуйте еще раз'}
                        </Title>
                        <Text type="secondary">
                            {getModeLabel(testMode)} | {getDifficultyLabel(difficulty)}
                        </Text>
                    </div>

                    <Row gutter={16} style={{ marginBottom: 32 }}>
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
                                description="Вы успешно прошли тест и показали хорошее знание аускультации."
                                type="success"
                                showIcon
                            />
                        ) : (
                            <Alert
                                message="Требуется больше практики"
                                description="Рекомендуем повторить материалы в разделе 'Обучение' и попробовать снова."
                                type="warning"
                                showIcon
                            />
                        )}

                        <Button
                            type="primary"
                            size="large"
                            onClick={() => setTestStarted(false)}
                            icon={<ReloadOutlined />}
                            block
                            style={{ marginTop: 16 }}
                        >
                            Новый тест
                        </Button>
                    </Space>
                </Card>
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
                <audio ref={audioRef} src={currentQuestion?.audioUrl} />

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
                            type="primary"
                            icon={<PlayCircleOutlined />}
                            onClick={playAudio}
                            style={{ marginTop: 8 }}
                        >
                            Прослушать звук
                        </Button>
                    </div>

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
