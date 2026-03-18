/**
 * SurveySection — NRI questionnaires:
 *   1. SUS (System Usability Scale) — 10 questions, score 0-100
 *   2. Confidence pre/post — 5 questions
 *   3. Demographics (shown on first login)
 *   4. Free feedback
 */
import { useState, useEffect } from 'react';
import {
    Card, Radio, Button, Typography, Progress, Space, Alert, message,
    Select, Input, Form, Steps, Tag, Statistic, Row, Col, Divider, Tabs,
} from 'antd';
import {
    CheckCircleOutlined, FormOutlined, StarOutlined,
    MessageOutlined, ExperimentOutlined,
} from '@ant-design/icons';
import { supabase } from '../services/supabase';
import { checkSurveyAchievements, notifyAchievements } from '../services/achievements';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

/* ════════════════════════════════════════════════════════════════
   SUS — 10 standard questions (EN original → RU adapted)
   Scoring: odd items: score-1, even items: 5-score → sum×2.5
   ════════════════════════════════════════════════════════════════ */
const SUS_QUESTIONS = [
    { id: 1, text: 'Я думаю, что хотел(а) бы пользоваться этой системой регулярно.', positive: true },
    { id: 2, text: 'Я нашёл(а) систему излишне сложной.', positive: false },
    { id: 3, text: 'Я счёл(а) систему лёгкой в использовании.', positive: true },
    { id: 4, text: 'Мне понадобится помощь технического специалиста, чтобы пользоваться этой системой.', positive: false },
    { id: 5, text: 'Я нашёл(а), что различные функции системы хорошо интегрированы между собой.', positive: true },
    { id: 6, text: 'В системе слишком много несогласованностей.', positive: false },
    { id: 7, text: 'Думаю, большинство людей очень быстро научится пользоваться этой системой.', positive: true },
    { id: 8, text: 'Пользоваться системой очень неудобно.', positive: false },
    { id: 9, text: 'Я чувствовал(а) себя уверенно при использовании этой системы.', positive: true },
    { id: 10, text: 'Мне пришлось многому научиться, прежде чем я смог(ла) начать работу с этой системой.', positive: false },
];

const LIKERT = [
    { value: 1, label: '1\nКатегорически не согласен(на)' },
    { value: 2, label: '2\nНе согласен(на)' },
    { value: 3, label: '3\nНейтрально' },
    { value: 4, label: '4\nСогласен(на)' },
    { value: 5, label: '5\nПолностью согласен(на)' },
];

/* ════════════════════════════════════════════════════════════════
   Confidence Questionnaire (pre/post) — based on NRI annotation
   ════════════════════════════════════════════════════════════════ */
const CONFIDENCE_QUESTIONS = [
    { id: 'c1', text: 'Я уверен(а) в своей способности распознать нормальные тоны сердца при аускультации.' },
    { id: 'c2', text: 'Я уверен(а) в своей способности распознать патологические шумы сердца.' },
    { id: 'c3', text: 'Я уверен(а) в своей способности распознать нормальное дыхание при аускультации.' },
    { id: 'c4', text: 'Я уверен(а) в своей способности распознать патологические дыхательные звуки.' },
    { id: 'c5', text: 'Я считаю себя подготовленным(ой) к самостоятельной клинической работе в части аускультации.' },
];

/* ════════════════════════════════════════════════════════════════
   Demographics questionnaire
   ════════════════════════════════════════════════════════════════ */
const AUSCULTATION_EXPERIENCE = [
    { value: 'none', label: 'Нет опыта' },
    { value: 'student', label: 'В рамках учёбы' },
    { value: '1y', label: 'До 1 года практики' },
    { value: '3y', label: '1–3 года практики' },
    { value: '5y', label: '3–5 лет практики' },
    { value: '5plus', label: 'Более 5 лет практики' },
];

/* ════════════════════════════════════════════════════════════════
   Helper: compute SUS score
   ════════════════════════════════════════════════════════════════ */
function computeSUS(responses) {
    let sum = 0;
    SUS_QUESTIONS.forEach(q => {
        const val = Number(responses[`sus_${q.id}`] || 3);
        sum += q.positive ? (val - 1) : (5 - val);
    });
    return Math.round(sum * 2.5);
}

/* ════════════════════════════════════════════════════════════════
   SUS Form Component
   ════════════════════════════════════════════════════════════════ */
function SUSForm({ onSubmit, loading }) {
    const [answers, setAnswers] = useState({});
    const answered = Object.keys(answers).length;
    const total = SUS_QUESTIONS.length;

    const handleChange = (qId, val) => setAnswers(prev => ({ ...prev, [`sus_${qId}`]: val }));

    const handleSubmit = () => {
        if (answered < total) { message.warning('Пожалуйста, ответьте на все вопросы'); return; }
        const score = computeSUS(answers);
        onSubmit({ survey_type: 'sus', responses: answers, score });
    };

    return (
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <Alert
                type="info"
                showIcon
                message="Шкала удобства использования (SUS)"
                description="Оцените каждое утверждение по шкале от 1 (категорически не согласен) до 5 (полностью согласен). Примерное время — 3 минуты."
            />
            <Progress percent={Math.round((answered / total) * 100)} size="small" />

            {SUS_QUESTIONS.map((q, idx) => (
                <Card key={q.id} size="small" style={{ background: answers[`sus_${q.id}`] ? '#f6ffed' : '#fafafa' }}>
                    <Text strong>{idx + 1}. </Text>
                    <Text>{q.text}</Text>
                    <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {LIKERT.map(opt => (
                            <Button
                                key={opt.value}
                                size="small"
                                type={answers[`sus_${q.id}`] === opt.value ? 'primary' : 'default'}
                                onClick={() => handleChange(q.id, opt.value)}
                                style={{ minWidth: 48 }}
                            >
                                {opt.value}
                            </Button>
                        ))}
                    </div>
                    <div style={{ marginTop: 4, display: 'flex', justifyContent: 'space-between' }}>
                        <Text type="secondary" style={{ fontSize: 11 }}>Категорически не согласен</Text>
                        <Text type="secondary" style={{ fontSize: 11 }}>Полностью согласен</Text>
                    </div>
                </Card>
            ))}

            <Button type="primary" block size="large" onClick={handleSubmit} loading={loading}
                disabled={answered < total}>
                {`Отправить ответы (${answered}/${total})`}
            </Button>
        </Space>
    );
}

/* ════════════════════════════════════════════════════════════════
   Confidence Form
   ════════════════════════════════════════════════════════════════ */
function ConfidenceForm({ type, onSubmit, loading }) {
    const [answers, setAnswers] = useState({});
    const answered = Object.keys(answers).length;
    const total = CONFIDENCE_QUESTIONS.length;

    const handleSubmit = () => {
        if (answered < total) { message.warning('Ответьте на все вопросы'); return; }
        onSubmit({ survey_type: type, responses: answers });
    };

    const titleLabel = type === 'confidence_pre'
        ? 'Самооценка уверенности (до обучения)'
        : 'Самооценка уверенности (после обучения)';

    return (
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <Alert
                type={type === 'confidence_pre' ? 'warning' : 'success'}
                showIcon
                message={titleLabel}
                description="Оцените свою уверенность по каждому пункту от 1 до 5."
            />
            <Progress percent={Math.round((answered / total) * 100)} size="small" />

            {CONFIDENCE_QUESTIONS.map((q, idx) => (
                <Card key={q.id} size="small" style={{ background: answers[q.id] ? '#f6ffed' : '#fafafa' }}>
                    <Text strong>{idx + 1}. </Text>
                    <Text>{q.text}</Text>
                    <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {LIKERT.map(opt => (
                            <Button
                                key={opt.value}
                                size="small"
                                type={answers[q.id] === opt.value ? 'primary' : 'default'}
                                onClick={() => setAnswers(prev => ({ ...prev, [q.id]: opt.value }))}
                                style={{ minWidth: 48 }}
                            >
                                {opt.value}
                            </Button>
                        ))}
                    </div>
                </Card>
            ))}

            <Button type="primary" block size="large" onClick={handleSubmit} loading={loading}
                disabled={answered < total}>
                {`Отправить (${answered}/${total})`}
            </Button>
        </Space>
    );
}

/* ════════════════════════════════════════════════════════════════
   Demographics Form
   ════════════════════════════════════════════════════════════════ */
function DemographicsForm({ onSubmit, loading }) {
    const [form] = Form.useForm();

    return (
        <Form form={form} layout="vertical" onFinish={(vals) => onSubmit({ survey_type: 'demographics', responses: vals })}>
            <Alert type="info" showIcon
                message="Анкета участника НИР"
                description="Ответьте на несколько вопросов для формирования базы данных исследования (разрешение ЛЭК № 1 от 16.09.2025)."
                style={{ marginBottom: 16 }}
            />
            <Form.Item name="age" label="Возраст" rules={[{ required: true, message: 'Укажите возраст' }]}>
                <Select placeholder="Возрастная группа">
                    <Select.Option value="18-22">18–22 года</Select.Option>
                    <Select.Option value="23-27">23–27 лет</Select.Option>
                    <Select.Option value="28-35">28–35 лет</Select.Option>
                    <Select.Option value="36-45">36–45 лет</Select.Option>
                    <Select.Option value="46+">46 лет и старше</Select.Option>
                </Select>
            </Form.Item>
            <Form.Item name="hearing" label="Слух" initialValue="normal"
                rules={[{ required: true }]}>
                <Select>
                    <Select.Option value="normal">Нормальный</Select.Option>
                    <Select.Option value="mild_loss">Лёгкое снижение (скоррегировано)</Select.Option>
                    <Select.Option value="aids">Слуховой аппарат</Select.Option>
                </Select>
            </Form.Item>
            <Form.Item name="auscultation_exp" label="Опыт аускультации"
                rules={[{ required: true, message: 'Укажите опыт' }]}>
                <Select placeholder="Выберите">
                    {AUSCULTATION_EXPERIENCE.map(o => <Select.Option key={o.value} value={o.value}>{o.label}</Select.Option>)}
                </Select>
            </Form.Item>
            <Form.Item name="prior_digital" label="Ранее использовали цифровые тренажёры аускультации?">
                <Select placeholder="Выберите" defaultValue="no">
                    <Select.Option value="no">Нет</Select.Option>
                    <Select.Option value="yes_similar">Да, аналогичные</Select.Option>
                    <Select.Option value="yes_other">Да, другие типы</Select.Option>
                </Select>
            </Form.Item>
            <Form.Item name="device" label="Устройство для работы">
                <Select placeholder="Основное устройство">
                    <Select.Option value="desktop">Настольный ПК</Select.Option>
                    <Select.Option value="laptop">Ноутбук</Select.Option>
                    <Select.Option value="tablet">Планшет</Select.Option>
                    <Select.Option value="phone">Смартфон</Select.Option>
                </Select>
            </Form.Item>
            <Button type="primary" htmlType="submit" block loading={loading}>
                Сохранить
            </Button>
        </Form>
    );
}

/* ════════════════════════════════════════════════════════════════
   Feedback Form
   ════════════════════════════════════════════════════════════════ */
function FeedbackForm({ onSubmit, loading }) {
    const [form] = Form.useForm();
    return (
        <Form form={form} layout="vertical"
            onFinish={(vals) => onSubmit({ survey_type: 'feedback', responses: vals })}>
            <Alert type="info" showIcon
                message="Свободная обратная связь"
                description="Ваши замечания помогают улучшить тренажёр и используются в научном анализе."
                style={{ marginBottom: 16 }}
            />
            <Form.Item name="likes" label="Что понравилось в тренажёре?">
                <TextArea rows={3} placeholder="Опишите положительные стороны..." />
            </Form.Item>
            <Form.Item name="dislikes" label="Что не понравилось или вызвало затруднения?">
                <TextArea rows={3} placeholder="Опишите проблемы или пожелания..." />
            </Form.Item>
            <Form.Item name="suggestions" label="Предложения по улучшению">
                <TextArea rows={3} placeholder="Что бы вы добавили или изменили?" />
            </Form.Item>
            <Form.Item name="ai_quality" label="Как оцените качество ИИ-пояснений?">
                <Select placeholder="Оценка">
                    <Select.Option value="5">5 — Отлично, точные и полезные</Select.Option>
                    <Select.Option value="4">4 — Хорошо</Select.Option>
                    <Select.Option value="3">3 — Удовлетворительно</Select.Option>
                    <Select.Option value="2">2 — Плохо</Select.Option>
                    <Select.Option value="1">1 — Бесполезно</Select.Option>
                </Select>
            </Form.Item>
            <Button type="primary" htmlType="submit" block loading={loading}>
                Отправить отзыв
            </Button>
        </Form>
    );
}

/* ════════════════════════════════════════════════════════════════
   MAIN SurveySection
   ════════════════════════════════════════════════════════════════ */
function SurveySection({ user }) {
    const [loading, setLoading] = useState(false);
    const [completed, setCompleted] = useState({});
    const [scores, setScores] = useState({});

    // Load already-submitted surveys
    useEffect(() => {
        if (!user) return;
        const load = async () => {
            const { data } = await supabase
                .from('survey_responses')
                .select('survey_type, score, created_at')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });
            if (data) {
                const done = {};
                const sc = {};
                data.forEach(r => {
                    if (!done[r.survey_type]) {
                        done[r.survey_type] = true;
                        sc[r.survey_type] = r.score;
                    }
                });
                setCompleted(done);
                setScores(sc);
            }
        };
        load();
    }, [user]);

    const submitSurvey = async ({ survey_type, responses, score = null }) => {
        setLoading(true);
        const payload = {
            user_id: user?.id || null,
            survey_type,
            responses,
            score,
        };
        const { error } = await supabase.from('survey_responses').insert(payload);
        setLoading(false);
        if (error) {
            message.error('Ошибка сохранения: ' + error.message);
        } else {
            message.success('Ответы сохранены! Спасибо.');
            setCompleted(prev => ({ ...prev, [survey_type]: true }));
            if (score !== null) setScores(prev => ({ ...prev, [survey_type]: score }));
            // Check achievements
            if (user?.id) {
                const awarded = await checkSurveyAchievements(user.id, survey_type);
                if (awarded.length > 0) notifyAchievements(message, awarded);
            }
        }
    };

    const getSUSLabel = (score) => {
        if (score >= 85) return { label: 'Превосходно', color: '#52c41a' };
        if (score >= 72) return { label: 'Хорошо', color: '#73d13d' };
        if (score >= 52) return { label: 'Удовлетворительно', color: '#faad14' };
        return { label: 'Требует улучшения', color: '#ff4d4f' };
    };

    const tabItems = [
        {
            key: 'demographics',
            label: (
                <span>
                    <FormOutlined />
                    Анкета участника
                    {completed.demographics && <Tag color="green" style={{ marginLeft: 4 }}>✓</Tag>}
                </span>
            ),
            children: completed.demographics ? (
                <Alert type="success" showIcon message="Анкета участника уже заполнена" />
            ) : (
                <DemographicsForm onSubmit={submitSurvey} loading={loading} />
            ),
        },
        {
            key: 'confidence_pre',
            label: (
                <span>
                    <ExperimentOutlined />
                    Уверенность (до)
                    {completed.confidence_pre && <Tag color="green" style={{ marginLeft: 4 }}>✓</Tag>}
                </span>
            ),
            children: completed.confidence_pre ? (
                <Alert type="success" showIcon message="Опрос «Уверенность до обучения» уже пройден" />
            ) : (
                <ConfidenceForm type="confidence_pre" onSubmit={submitSurvey} loading={loading} />
            ),
        },
        {
            key: 'sus',
            label: (
                <span>
                    <StarOutlined />
                    Удобство (SUS)
                    {completed.sus && <Tag color="green" style={{ marginLeft: 4 }}>✓</Tag>}
                </span>
            ),
            children: completed.sus ? (
                <Card>
                    <Row gutter={24} align="middle">
                        <Col span={12}>
                            <Statistic
                                title="Ваш SUS-балл"
                                value={scores.sus}
                                suffix="/ 100"
                                valueStyle={{ color: getSUSLabel(scores.sus).color, fontSize: 40 }}
                            />
                        </Col>
                        <Col span={12}>
                            <Tag color={scores.sus >= 68 ? 'green' : 'orange'} style={{ fontSize: 14, padding: '4px 12px' }}>
                                {getSUSLabel(scores.sus).label}
                            </Tag>
                            <Paragraph type="secondary" style={{ marginTop: 8 }}>
                                Целевое значение по НИР: SUS ≥ 68
                            </Paragraph>
                        </Col>
                    </Row>
                </Card>
            ) : (
                <SUSForm onSubmit={submitSurvey} loading={loading} />
            ),
        },
        {
            key: 'confidence_post',
            label: (
                <span>
                    <ExperimentOutlined />
                    Уверенность (после)
                    {completed.confidence_post && <Tag color="green" style={{ marginLeft: 4 }}>✓</Tag>}
                </span>
            ),
            children: completed.confidence_post ? (
                <Alert type="success" showIcon message="Опрос «Уверенность после обучения» уже пройден" />
            ) : (
                <ConfidenceForm type="confidence_post" onSubmit={submitSurvey} loading={loading} />
            ),
        },
        {
            key: 'feedback',
            label: (
                <span>
                    <MessageOutlined />
                    Отзыв
                    {completed.feedback && <Tag color="green" style={{ marginLeft: 4 }}>✓</Tag>}
                </span>
            ),
            children: completed.feedback ? (
                <Alert type="success" showIcon message="Отзыв уже оставлен. Спасибо!" />
            ) : (
                <FeedbackForm onSubmit={submitSurvey} loading={loading} />
            ),
        },
    ];

    if (!user) {
        return (
            <div style={{ maxWidth: 600, margin: '60px auto', padding: '0 16px' }}>
                <Alert
                    type="info"
                    showIcon
                    message="Требуется авторизация"
                    description="Войдите или зарегистрируйтесь, чтобы заполнить анкеты и участвовать в НИР."
                />
            </div>
        );
    }

    return (
        <div style={{ maxWidth: 780, margin: '0 auto', padding: '24px 16px' }}>
            <Title level={2} style={{ marginBottom: 4 }}>
                <FormOutlined /> Анкеты и обратная связь
            </Title>
            <Paragraph type="secondary" style={{ marginBottom: 24 }}>
                В рамках НИР «Апробация цифрового тренажёра аускультации» заполните, пожалуйста, опросники. Данные используются только в обезличенном виде для научного анализа.
            </Paragraph>

            <Tabs items={tabItems} />
        </div>
    );
}

export default SurveySection;
