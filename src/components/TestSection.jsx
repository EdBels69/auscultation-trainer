import { useState, useRef, useEffect } from 'react';
import { Card, Button, Radio, Typography, Progress, Space, Alert, Statistic, Row, Col } from 'antd';
import {
    PlayCircleOutlined,
    CheckCircleOutlined,
    CloseCircleOutlined,
    TrophyOutlined,
    ReloadOutlined
} from '@ant-design/icons';
import { generateTest, calculateResults } from '../utils/testGenerator';

const { Title, Text, Paragraph } = Typography;

function TestSection({ audioRecords }) {
    const [testStarted, setTestStarted] = useState(false);
    const [questions, setQuestions] = useState([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [userAnswers, setUserAnswers] = useState({});
    const [showExplanation, setShowExplanation] = useState(false);
    const [testCompleted, setTestCompleted] = useState(false);
    const [results, setResults] = useState(null);
    const audioRef = useRef(null);

    const minRecordsRequired = 5;
    const questionsPerTest = 10;

    const startTest = () => {
        const test = generateTest(audioRecords, questionsPerTest);
        setQuestions(test);
        setCurrentQuestionIndex(0);
        setUserAnswers({});
        setShowExplanation(false);
        setTestCompleted(false);
        setResults(null);
        setTestStarted(true);
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
        const testResults = calculateResults(questions, userAnswers);
        setResults(testResults);
        setTestCompleted(true);
    };

    const playAudio = () => {
        if (audioRef.current) {
            audioRef.current.play();
        }
    };

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
                                Тест состоит из {questionsPerTest} вопросов. Вам нужно определить звук, точку аускультации или категорию.
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
                <audio ref={audioRef} src={currentQuestion?.audioUrl} />

                <Space direction="vertical" size="large" style={{ width: '100%' }}>
                    <div>
                        <Title level={4}>{currentQuestion?.question}</Title>
                        <Button
                            type="primary"
                            icon={<PlayCircleOutlined />}
                            onClick={playAudio}
                            style={{ marginTop: 8 }}
                        >
                            Прослушать звук
                        </Button>
                    </div>

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
