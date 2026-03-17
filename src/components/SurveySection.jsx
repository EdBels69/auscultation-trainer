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
import { useLanguage, tx } from '../contexts/LanguageContext';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

/* ════════════════════════════════════════════════════════════════
   SUS — 10 standard questions (EN original → RU adapted)
   Scoring: odd items: score-1, even items: 5-score → sum×2.5
   ════════════════════════════════════════════════════════════════ */
const SUS_QUESTIONS = [
    { id: 1, text: { ru: 'Я думаю, что хотел(а) бы пользоваться этой системой регулярно.', en: 'I think that I would like to use this system frequently.' }, positive: true },
    { id: 2, text: { ru: 'Я нашёл(а) систему излишне сложной.', en: 'I found the system unnecessarily complex.' }, positive: false },
    { id: 3, text: { ru: 'Я счёл(а) систему лёгкой в использовании.', en: 'I thought the system was easy to use.' }, positive: true },
    { id: 4, text: { ru: 'Мне понадобится помощь технического специалиста, чтобы пользоваться этой системой.', en: 'I think that I would need the support of a technical person to be able to use this system.' }, positive: false },
    { id: 5, text: { ru: 'Я нашёл(а), что различные функции системы хорошо интегрированы между собой.', en: 'I found the various functions in this system were well integrated.' }, positive: true },
    { id: 6, text: { ru: 'В системе слишком много несогласованностей.', en: 'I thought there was too much inconsistency in this system.' }, positive: false },
    { id: 7, text: { ru: 'Думаю, большинство людей очень быстро научится пользоваться этой системой.', en: 'I would imagine that most people would learn to use this system very quickly.' }, positive: true },
    { id: 8, text: { ru: 'Пользоваться системой очень неудобно.', en: 'I found the system very cumbersome to use.' }, positive: false },
    { id: 9, text: { ru: 'Я чувствовал(а) себя уверенно при использовании этой системы.', en: 'I felt very confident using the system.' }, positive: true },
    { id: 10, text: { ru: 'Мне пришлось многому научиться, прежде чем я смог(ла) начать работу с этой системой.', en: 'I needed to learn a lot of things before I could get going with this system.' }, positive: false },
];

const LIKERT = [
    { value: 1, label: { ru: '1\nКатегорически не согласен(на)', en: '1\nStrongly disagree' } },
    { value: 2, label: { ru: '2\nНе согласен(на)', en: '2\nDisagree' } },
    { value: 3, label: { ru: '3\nНейтрально', en: '3\nNeutral' } },
    { value: 4, label: { ru: '4\nСогласен(на)', en: '4\nAgree' } },
    { value: 5, label: { ru: '5\nПолностью согласен(на)', en: '5\nStrongly agree' } },
];

/* ════════════════════════════════════════════════════════════════
   Confidence Questionnaire (pre/post) — based on NRI annotation
   ════════════════════════════════════════════════════════════════ */
const CONFIDENCE_QUESTIONS = [
    { id: 'c1', text: { ru: 'Я уверен(а) в своей способности распознать нормальные тоны сердца при аускультации.', en: 'I am confident in my ability to recognize normal heart sounds during auscultation.' } },
    { id: 'c2', text: { ru: 'Я уверен(а) в своей способности распознать патологические шумы сердца.', en: 'I am confident in my ability to recognize pathological heart murmurs.' } },
    { id: 'c3', text: { ru: 'Я уверен(а) в своей способности распознать нормальное дыхание при аускультации.', en: 'I am confident in my ability to recognize normal breathing sounds during auscultation.' } },
    { id: 'c4', text: { ru: 'Я уверен(а) в своей способности распознать патологические дыхательные звуки.', en: 'I am confident in my ability to recognize pathological breath sounds.' } },
    { id: 'c5', text: { ru: 'Я считаю себя подготовленным(ой) к самостоятельной клинической работе в части аускультации.', en: 'I consider myself prepared for independent clinical work in auscultation.' } },
];

/* ════════════════════════════════════════════════════════════════
   Demographics questionnaire
   ════════════════════════════════════════════════════════════════ */
const AUSCULTATION_EXPERIENCE = [
    { value: 'none', label: { ru: 'Нет опыта', en: 'No experience' } },
    { value: 'student', label: { ru: 'В рамках учёбы', en: 'Academic training only' } },
    { value: '1y', label: { ru: 'До 1 года практики', en: 'Less than 1 year of practice' } },
    { value: '3y', label: { ru: '1–3 года практики', en: '1–3 years of practice' } },
    { value: '5y', label: { ru: '3–5 лет практики', en: '3–5 years of practice' } },
    { value: '5plus', label: { ru: 'Более 5 лет практики', en: 'More than 5 years of practice' } },
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
function SUSForm({ onSubmit, loading, lang }) {
    const [answers, setAnswers] = useState({});
    const answered = Object.keys(answers).length;
    const total = SUS_QUESTIONS.length;

    const handleChange = (qId, val) => setAnswers(prev => ({ ...prev, [`sus_${qId}`]: val }));

    const handleSubmit = () => {
        if (answered < total) { message.warning(tx(lang, 'Пожалуйста, ответьте на все вопросы', 'Please answer all questions')); return; }
        const score = computeSUS(answers);
        onSubmit({ survey_type: 'sus', responses: answers, score });
    };

    return (
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <Alert
                type="info"
                showIcon
                message={tx(lang, 'Шкала удобства использования (SUS)', 'System Usability Scale (SUS)')}
                description={tx(lang, 'Оцените каждое утверждение по шкале от 1 (категорически не согласен) до 5 (полностью согласен). Примерное время — 3 минуты.', 'Rate each statement on a scale from 1 (strongly disagree) to 5 (strongly agree). Estimated time — 3 minutes.')}
            />
            <Progress percent={Math.round((answered / total) * 100)} size="small" />

            {SUS_QUESTIONS.map((q, idx) => (
                <Card key={q.id} size="small" style={{ background: answers[`sus_${q.id}`] ? '#f6ffed' : '#fafafa' }}>
                    <Text strong>{idx + 1}. </Text>
                    <Text>{typeof q.text === 'string' ? q.text : q.text[lang]}</Text>
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
                        <Text type="secondary" style={{ fontSize: 11 }}>{tx(lang, 'Категорически не согласен', 'Strongly disagree')}</Text>
                        <Text type="secondary" style={{ fontSize: 11 }}>{tx(lang, 'Полностью согласен', 'Strongly agree')}</Text>
                    </div>
                </Card>
            ))}

            <Button type="primary" block size="large" onClick={handleSubmit} loading={loading}
                disabled={answered < total}>
                {tx(lang, 'Отправить ответы ({answered}/{total})', 'Submit answers ({answered}/{total})').replace('{answered}', answered).replace('{total}', total)}
            </Button>
        </Space>
    );
}

/* ════════════════════════════════════════════════════════════════
   Confidence Form
   ════════════════════════════════════════════════════════════════ */
function ConfidenceForm({ type, onSubmit, loading, lang }) {
    const [answers, setAnswers] = useState({});
    const answered = Object.keys(answers).length;
    const total = CONFIDENCE_QUESTIONS.length;

    const handleSubmit = () => {
        if (answered < total) { message.warning(tx(lang, 'Ответьте на все вопросы', 'Answer all questions')); return; }
        onSubmit({ survey_type: type, responses: answers });
    };

    const titleLabel = type === 'confidence_pre'
        ? tx(lang, 'Самооценка уверенности (до обучения)', 'Self-assessment of confidence (before training)')
        : tx(lang, 'Самооценка уверенности (после обучения)', 'Self-assessment of confidence (after training)');

    return (
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <Alert
                type={type === 'confidence_pre' ? 'warning' : 'success'}
                showIcon
                message={titleLabel}
                description={tx(lang, 'Оцените свою уверенность по каждому пункту от 1 до 5.', 'Rate your confidence on each item from 1 to 5.')}
            />
            <Progress percent={Math.round((answered / total) * 100)} size="small" />

            {CONFIDENCE_QUESTIONS.map((q, idx) => (
                <Card key={q.id} size="small" style={{ background: answers[q.id] ? '#f6ffed' : '#fafafa' }}>
                    <Text strong>{idx + 1}. </Text>
                    <Text>{typeof q.text === 'string' ? q.text : q.text[lang]}</Text>
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
                {tx(lang, 'Отправить ({answered}/{total})', 'Submit ({answered}/{total})').replace('{answered}', answered).replace('{total}', total)}
            </Button>
        </Space>
    );
}

/* ════════════════════════════════════════════════════════════════
   Demographics Form
   ════════════════════════════════════════════════════════════════ */
function DemographicsForm({ onSubmit, loading, lang }) {
    const [form] = Form.useForm();

    return (
        <Form form={form} layout="vertical" onFinish={(vals) => onSubmit({ survey_type: 'demographics', responses: vals })}>
            <Alert type="info" showIcon
                message={tx(lang, 'Анкета участника НИР', 'Research Participant Questionnaire')}
                description={tx(lang, 'Ответьте на несколько вопросов для формирования базы данных исследования (разрешение ЛЭК № 1 от 16.09.2025).', 'Please answer a few questions for the research database (Ethics Committee approval No. 1 dated 16.09.2025).')}
                style={{ marginBottom: 16 }}
            />
            <Form.Item name="age" label={tx(lang, 'Возраст', 'Age')} rules={[{ required: true, message: tx(lang, 'Укажите возраст', 'Select age group') }]}>
                <Select placeholder={tx(lang, 'Возрастная группа', 'Age group')}>
                    <Select.Option value="18-22">{tx(lang, '18–22 года', '18–22 years')}</Select.Option>
                    <Select.Option value="23-27">{tx(lang, '23–27 лет', '23–27 years')}</Select.Option>
                    <Select.Option value="28-35">{tx(lang, '28–35 лет', '28–35 years')}</Select.Option>
                    <Select.Option value="36-45">{tx(lang, '36–45 лет', '36–45 years')}</Select.Option>
                    <Select.Option value="46+">{tx(lang, '46 лет и старше', '46+ years')}</Select.Option>
                </Select>
            </Form.Item>
            <Form.Item name="hearing" label={tx(lang, 'Слух', 'Hearing')} initialValue="normal"
                rules={[{ required: true }]}>
                <Select>
                    <Select.Option value="normal">{tx(lang, 'Нормальный', 'Normal')}</Select.Option>
                    <Select.Option value="mild_loss">{tx(lang, 'Лёгкое снижение (скоррегировано)', 'Mild loss (corrected)')}</Select.Option>
                    <Select.Option value="aids">{tx(lang, 'Слуховой аппарат', 'Hearing aids')}</Select.Option>
                </Select>
            </Form.Item>
            <Form.Item name="auscultation_exp" label={tx(lang, 'Опыт аускультации', 'Auscultation experience')}
                rules={[{ required: true, message: tx(lang, 'Укажите опыт', 'Select experience') }]}>
                <Select placeholder={tx(lang, 'Выберите', 'Select')}>
                    {AUSCULTATION_EXPERIENCE.map(o => <Select.Option key={o.value} value={o.value}>{typeof o.label === 'string' ? o.label : o.label[lang]}</Select.Option>)}
                </Select>
            </Form.Item>
            <Form.Item name="prior_digital" label={tx(lang, 'Ранее использовали цифровые тренажёры аускультации?', 'Have you previously used digital auscultation trainers?')}>
                <Select placeholder={tx(lang, 'Выберите', 'Select')} defaultValue="no">
                    <Select.Option value="no">{tx(lang, 'Нет', 'No')}</Select.Option>
                    <Select.Option value="yes_similar">{tx(lang, 'Да, аналогичные', 'Yes, similar ones')}</Select.Option>
                    <Select.Option value="yes_other">{tx(lang, 'Да, другие типы', 'Yes, other types')}</Select.Option>
                </Select>
            </Form.Item>
            <Form.Item name="device" label={tx(lang, 'Устройство для работы', 'Device used')}>
                <Select placeholder={tx(lang, 'Основное устройство', 'Main device')}>
                    <Select.Option value="desktop">{tx(lang, 'Настольный ПК', 'Desktop PC')}</Select.Option>
                    <Select.Option value="laptop">{tx(lang, 'Ноутбук', 'Laptop')}</Select.Option>
                    <Select.Option value="tablet">{tx(lang, 'Планшет', 'Tablet')}</Select.Option>
                    <Select.Option value="phone">{tx(lang, 'Смартфон', 'Smartphone')}</Select.Option>
                </Select>
            </Form.Item>
            <Button type="primary" htmlType="submit" block loading={loading}>
                {tx(lang, 'Сохранить', 'Save')}
            </Button>
        </Form>
    );
}

/* ════════════════════════════════════════════════════════════════
   Feedback Form
   ════════════════════════════════════════════════════════════════ */
function FeedbackForm({ onSubmit, loading, lang }) {
    const [form] = Form.useForm();
    return (
        <Form form={form} layout="vertical"
            onFinish={(vals) => onSubmit({ survey_type: 'feedback', responses: vals })}>
            <Alert type="info" showIcon
                message={tx(lang, 'Свободная обратная связь', 'Open Feedback')}
                description={tx(lang, 'Ваши замечания помогают улучшить тренажёр и используются в научном анализе.', 'Your feedback helps improve the trainer and is used in scientific analysis.')}
                style={{ marginBottom: 16 }}
            />
            <Form.Item name="likes" label={tx(lang, 'Что понравилось в тренажёре?', 'What did you like about the trainer?')}>
                <TextArea rows={3} placeholder={tx(lang, 'Опишите положительные стороны...', 'Describe the positive aspects...')} />
            </Form.Item>
            <Form.Item name="dislikes" label={tx(lang, 'Что не понравилось или вызвало затруднения?', 'What did you dislike or find difficult?')}>
                <TextArea rows={3} placeholder={tx(lang, 'Опишите проблемы или пожелания...', 'Describe problems or suggestions...')} />
            </Form.Item>
            <Form.Item name="suggestions" label={tx(lang, 'Предложения по улучшению', 'Suggestions for improvement')}>
                <TextArea rows={3} placeholder={tx(lang, 'Что бы вы добавили или изменили?', 'What would you add or change?')} />
            </Form.Item>
            <Form.Item name="ai_quality" label={tx(lang, 'Как оцените качество ИИ-пояснений?', 'How would you rate the quality of AI explanations?')}>
                <Select placeholder={tx(lang, 'Оценка', 'Rating')}>
                    <Select.Option value="5">{tx(lang, '5 — Отлично, точные и полезные', '5 — Excellent, accurate and useful')}</Select.Option>
                    <Select.Option value="4">{tx(lang, '4 — Хорошо', '4 — Good')}</Select.Option>
                    <Select.Option value="3">{tx(lang, '3 — Удовлетворительно', '3 — Acceptable')}</Select.Option>
                    <Select.Option value="2">{tx(lang, '2 — Плохо', '2 — Poor')}</Select.Option>
                    <Select.Option value="1">{tx(lang, '1 — Бесполезно', '1 — Useless')}</Select.Option>
                </Select>
            </Form.Item>
            <Button type="primary" htmlType="submit" block loading={loading}>
                {tx(lang, 'Отправить отзыв', 'Submit feedback')}
            </Button>
        </Form>
    );
}

/* ════════════════════════════════════════════════════════════════
   MAIN SurveySection
   ════════════════════════════════════════════════════════════════ */
function SurveySection({ user }) {
    const lang = useLanguage();
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
            message.error(tx(lang, 'Ошибка сохранения: ', 'Save error: ') + error.message);
        } else {
            message.success(tx(lang, 'Ответы сохранены! Спасибо.', 'Responses saved! Thank you.'));
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
        if (score >= 85) return { label: tx(lang, 'Превосходно', 'Excellent'), color: '#52c41a' };
        if (score >= 72) return { label: tx(lang, 'Хорошо', 'Good'), color: '#73d13d' };
        if (score >= 52) return { label: tx(lang, 'Удовлетворительно', 'Acceptable'), color: '#faad14' };
        return { label: tx(lang, 'Требует улучшения', 'Needs improvement'), color: '#ff4d4f' };
    };

    const tabItems = [
        {
            key: 'demographics',
            label: (
                <span>
                    <FormOutlined />
                    {tx(lang, 'Анкета участника', 'Participant Form')}
                    {completed.demographics && <Tag color="green" style={{ marginLeft: 4 }}>✓</Tag>}
                </span>
            ),
            children: completed.demographics ? (
                <Alert type="success" showIcon message={tx(lang, 'Анкета участника уже заполнена', 'Participant form already completed')} />
            ) : (
                <DemographicsForm onSubmit={submitSurvey} loading={loading} lang={lang} />
            ),
        },
        {
            key: 'confidence_pre',
            label: (
                <span>
                    <ExperimentOutlined />
                    {tx(lang, 'Уверенность (до)', 'Confidence (pre)')}
                    {completed.confidence_pre && <Tag color="green" style={{ marginLeft: 4 }}>✓</Tag>}
                </span>
            ),
            children: completed.confidence_pre ? (
                <Alert type="success" showIcon message={tx(lang, 'Опрос «Уверенность до обучения» уже пройден', 'Pre-training confidence survey already completed')} />
            ) : (
                <ConfidenceForm type="confidence_pre" onSubmit={submitSurvey} loading={loading} lang={lang} />
            ),
        },
        {
            key: 'sus',
            label: (
                <span>
                    <StarOutlined />
                    SUS
                    {completed.sus && <Tag color="green" style={{ marginLeft: 4 }}>✓</Tag>}
                </span>
            ),
            children: completed.sus ? (
                <Card>
                    <Row gutter={24} align="middle">
                        <Col span={12}>
                            <Statistic
                                title={tx(lang, 'Ваш SUS-балл', 'Your SUS score')}
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
                                {tx(lang, 'Целевое значение по НИР: SUS ≥ 68', 'Research target: SUS ≥ 68')}
                            </Paragraph>
                        </Col>
                    </Row>
                </Card>
            ) : (
                <SUSForm onSubmit={submitSurvey} loading={loading} lang={lang} />
            ),
        },
        {
            key: 'confidence_post',
            label: (
                <span>
                    <ExperimentOutlined />
                    {tx(lang, 'Уверенность (после)', 'Confidence (post)')}
                    {completed.confidence_post && <Tag color="green" style={{ marginLeft: 4 }}>✓</Tag>}
                </span>
            ),
            children: completed.confidence_post ? (
                <Alert type="success" showIcon message={tx(lang, 'Опрос «Уверенность после обучения» уже пройден', 'Post-training confidence survey already completed')} />
            ) : (
                <ConfidenceForm type="confidence_post" onSubmit={submitSurvey} loading={loading} lang={lang} />
            ),
        },
        {
            key: 'feedback',
            label: (
                <span>
                    <MessageOutlined />
                    {tx(lang, 'Отзыв', 'Feedback')}
                    {completed.feedback && <Tag color="green" style={{ marginLeft: 4 }}>✓</Tag>}
                </span>
            ),
            children: completed.feedback ? (
                <Alert type="success" showIcon message={tx(lang, 'Отзыв уже оставлен. Спасибо!', 'Feedback already submitted. Thank you!')} />
            ) : (
                <FeedbackForm onSubmit={submitSurvey} loading={loading} lang={lang} />
            ),
        },
    ];

    if (!user) {
        return (
            <div style={{ maxWidth: 600, margin: '60px auto', padding: '0 16px' }}>
                <Alert
                    type="info"
                    showIcon
                    message={tx(lang, 'Требуется авторизация', 'Authorization required')}
                    description={tx(lang, 'Войдите или зарегистрируйтесь, чтобы заполнить анкеты и участвовать в НИР.', 'Log in or register to fill in the questionnaires and participate in the research.')}
                />
            </div>
        );
    }

    return (
        <div style={{ maxWidth: 780, margin: '0 auto', padding: '24px 16px' }}>
            <Title level={2} style={{ marginBottom: 4 }}>
                <FormOutlined /> {tx(lang, 'Анкеты и обратная связь', 'Surveys & Feedback')}
            </Title>
            <Paragraph type="secondary" style={{ marginBottom: 24 }}>
                {tx(lang, 'В рамках НИР «Апробация цифрового тренажёра аускультации» заполните, пожалуйста, опросники. Данные используются только в обезличенном виде для научного анализа.', 'As part of the research "Approbation of a digital auscultation trainer", please fill in the questionnaires. Data is used only in anonymized form for scientific analysis.')}
            </Paragraph>

            <Tabs items={tabItems} />
        </div>
    );
}

export default SurveySection;
