import { useState, useRef, useEffect, useCallback } from 'react';
import { Card, Button, Radio, Typography, Progress, Space, Alert, Statistic, Row, Col, message as antMessage } from 'antd';
import {
    PlayCircleOutlined,
    PauseCircleOutlined,
    CheckCircleOutlined,
    CloseCircleOutlined,
    TrophyOutlined,
    ReloadOutlined,
    LockOutlined
} from '@ant-design/icons';
import { generateTest, calculateResults } from '../utils/testGenerator';
import { supabase } from '../services/supabase';
import { checkTestAchievements, notifyAchievements } from '../services/achievements';

const { Title, Text, Paragraph } = Typography;

function TestSection({ audioRecords, user, participant }) {
    const [testStarted, setTestStarted] = useState(false);
    const [questions, setQuestions] = useState([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [userAnswers, setUserAnswers] = useState({});
    const [showExplanation, setShowExplanation] = useState(false);
    const [testCompleted, setTestCompleted] = useState(false);
    const [results, setResults] = useState(null);
    const [startTime, setStartTime] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const audioRef = useRef(null);

    const minRecordsRequired = 5;
    const questionsPerTest = 10;

    // Stop and reset audio when question changes
    useEffect(() => {
        const audio = audioRef.current;
        if (audio) {
            audio.pause();
            audio.currentTime = 0;
            setIsPlaying(false);
        }
    }, [currentQuestionIndex]);

    // Track audio play/pause/ended events
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const onPlay = () => setIsPlaying(true);
        const onPause = () => setIsPlaying(false);
        const onEnded = () => setIsPlaying(false);

        audio.addEventListener('play', onPlay);
        audio.addEventListener('pause', onPause);
        audio.addEventListener('ended', onEnded);

        return () => {
            audio.removeEventListener('play', onPlay);
            audio.removeEventListener('pause', onPause);
            audio.removeEventListener('ended', onEnded);
        };
    }, [testStarted]);

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

    const startTest = () => {
        const test = generateTest(audioRecords, questionsPerTest);
        setQuestions(test);
        setCurrentQuestionIndex(0);
        setUserAnswers({});
        setShowExplanation(false);
        setTestCompleted(false);
        setResults(null);
        setStartTime(Date.now());
        setTestStarted(true);
        setIsPlaying(false);
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

        const testResults = calculateResults(questions, userAnswers);
        setResults(testResults);
        setTestCompleted(true);

        // Save to Supabase if participant or user is available
        const canSave = !!(participant || user);
        if (canSave) {
            const durationSec = startTime ? Math.round((Date.now() - startTime) / 1000) : null;
            const answersPayload = questions.map((q, i) => ({
                question: q.question,
                audio_url: q.audioUrl,
                user_answer: userAnswers[i] ?? null,
                correct_answer: q.correctAnswerId,
                is_correct: userAnswers[i] === q.correctAnswerId,
            }));

            const { error } = await supabase.from('test_sessions').insert({
                user_id: user?.id || null,
                participant_id: participant?.id || null,
                session_type: 'test',
                score: testResults.score,
                total_q: testResults.total,
                correct_q: testResults.correct,
                duration_sec: durationSec,
                answers: answersPayload,
            });

            if (!error) {
                const identityId = participant?.id || user?.id;
                const idField = participant ? 'participant_id' : 'user_id';
                const awarded = await checkTestAchievements(identityId, testResults.score, idField);
                if (awarded.length > 0) notifyAchievements(antMessage, awarded);
            } else {
                console.error('Error saving test session:', error);
            }
        }
    };

    const toggleAudio = useCallback(() => {
        const audio = audioRef.current;
        if (!audio) return;
        if (audio.paused) {
            audio.play().catch(() => {});
        } else {
            audio.pause();
            audio.currentTime = 0;
        }
    }, []);

    // Require participant or user to take test
    if (!participant && !user) {
        return (
            <div style={{ padding: '32px 0' }}>
                <Title level={2}>Тестирование знаний</Title>
                <Card style={{ maxWidth: 600, marginTop: 24, textAlign: 'center' }}>
                    <LockOutlined style={{ fontSize: 48, color: '#8c8c8c', marginBottom: 16 }} />
                    <Title level={4}>Необходимо войти</Title>
                    <Paragraph type="secondary">
                        Для прохождения теста нажмите «Войти» и введите свои данные.
                        Результаты тестирования привязываются к вашему коду участника.
                    </Paragraph>
                </Card>
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

    if (!testStarted) {
        return (
            <div style={{ padding: '32px 0' }}>
                <Title level={2}>Тестирование знаний</Title>
                <Card style={{ maxWidth: 600, marginTop: 24 }}>
                    <Space direction="vertical" size="large" style={{ width: '100%' }}>
                        <div>
                            <Title level={4}>Проверьте свои знания!</Title>
                            <Paragraph type="secondary">
                                Тест состоит из {questionsPerTest} вопросов. Вам нужно определить звук или точку аускультации.
                            </Paragraph>
                            <Paragraph type="secondary">
                                • Доступно записей: {audioRecords.length}<br />
                                • Минимальный балл для прохождения: 70%<br />
                                • Вы можете прослушать каждый звук несколько раз
                            </Paragraph>
                        </div>
                        <Button
                            type="primary"
                            size="large"
                            onClick={startTest}
                            icon={<PlayCircleOutlined />}
                            block
                        >
                            Начать тест
                        </Button>
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
                            onClick={startTest}
                            icon={<ReloadOutlined />}
                            block
                            style={{ marginTop: 16 }}
                        >
                            Пройти тест заново
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

            <Card style={{ maxWidth: 800 }}>
                <audio ref={audioRef} src={currentQuestion?.audioUrl} preload="auto" />

                <Space direction="vertical" size="large" style={{ width: '100%' }}>
                    <div>
                        <div style={{ whiteSpace: 'pre-line' }}>
                            <Title level={4} style={{ whiteSpace: 'pre-line' }}>{currentQuestion?.question}</Title>
                        </div>

                        {/* Audio play/stop button */}
                        <Button
                            type="primary"
                            icon={isPlaying ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
                            onClick={toggleAudio}
                            style={{ marginTop: 8 }}
                        >
                            {isPlaying ? 'Остановить' : 'Прослушать звук'}
                        </Button>
                    </div>

                    {/* Auscultation point image */}
                    {currentQuestion?.imageUrl && (
                        <div style={{
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            background: '#fff',
                            border: '1px solid #e3e8ee',
                            borderRadius: 8,
                            padding: 16
                        }}>
                            <img
                                src={currentQuestion.imageUrl}
                                alt="Точка аускультации"
                                style={{
                                    maxWidth: '100%',
                                    maxHeight: 280,
                                    objectFit: 'contain',
                                    borderRadius: 4
                                }}
                            />
                        </div>
                    )}

                    {/* Audiogram if available */}
                    {currentQuestion?.audiogramUrl && (
                        <div style={{
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            background: '#fff',
                            border: '1px solid #e3e8ee',
                            borderRadius: 8,
                            padding: 16
                        }}>
                            <div>
                                <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>Аудиограмма:</Text>
                                <img
                                    src={currentQuestion.audiogramUrl}
                                    alt="Аудиограмма"
                                    style={{
                                        maxWidth: '100%',
                                        maxHeight: 200,
                                        objectFit: 'contain',
                                        borderRadius: 4
                                    }}
                                />
                            </div>
                        </div>
                    )}

                    {/* Position info */}
                    {currentQuestion?.position && currentQuestion.type !== 'identify_position' && (
                        <Text type="secondary">
                            Точка аускультации: {currentQuestion.position}
                        </Text>
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
        </div>
    );
}

export default TestSection;
