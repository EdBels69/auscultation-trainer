/**
 * AIChatSection — ИИ-помощник по аускультации
 * - Поддерживает свободный диалог
 * - При первом открытии подтягивает последние ошибки из test_sessions
 * - Предлагает разобрать ошибки одной кнопкой
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import {
    Card, Input, Button, Typography, Space, Spin, Alert, Tag, Avatar,
    Tooltip, Divider
} from 'antd';
import {
    SendOutlined, RobotOutlined, UserOutlined,
    BulbOutlined, ReloadOutlined, WarningOutlined
} from '@ant-design/icons';
import { continueChat } from '../services/ai';
import { supabase } from '../services/supabase';

const { Text, Paragraph } = Typography;
const { TextArea } = Input;

const SYSTEM_PROMPT = `Ты — ИИ-помощник по аускультации для студентов медицинских вузов (4–6 курс) и врачей-ординаторов.
Ты помогаешь разобраться в аускультативных феноменах сердца и лёгких на уровне клинической пропедевтики.

В базе тренажёра 27 эталонных аудиозаписей:
• Лёгкие (21): сухие свистящие хрипы (БА — 3 вар., ХОБЛ — 4 вар.), амфорическое дыхание, бронхиальное дыхание, везикулярное дыхание, сухие жужжащие хрипы, крепитация (3 вар.: ИЛФ, пневмония, пневмонит), ларинготрахеальное дыхание, влажные хрипы (мелко-, средне-, крупнопузырчатые), стридор, смешанные шумы (сердечная астма), шум трения плевры.
• Сердце (6): аортальный стеноз (дегенеративный), митральный стеноз (ХРБС), хлопающий I тон (ХРБС), митральная недостаточность (ХРБС), ДМПП (систоло-диастолический шум), сочетанный аортальный порок.

Принципы ответа:
1. Структура: «Суть в 1–2 предложения → Механизм → Клиническое значение → Как не перепутать (дифференциальная диагностика)».
2. Используй клинический язык уровня пропедевтики внутренних болезней (Мухин, Стражеско). Термины давай по-русски с латинскими эквивалентами в скобках при первом упоминании.
3. ЗАПРЕЩЕНО: ASCII-таблицы, псевдографика, рамки из символов. Для сравнений используй маркированные списки или текст.
4. При разборе ошибок: объясняй, чем отличается правильный ответ от выбранного, с акцентом на аускультативные признаки (фаза, тембр, точка максимума, иррадиация).
5. Если вопрос касается конкретного звука из базы — упоминай диагноз пациента и точку аускультации.
6. Отвечай на русском, компактно (до 300 слов), без воды.`;

const INITIAL_MESSAGE = {
    role: 'assistant',
    content: 'Привет! Я помогу разобраться с аускультацией — сердечными тонами, шумами и дыхательными звуками.\n\nМогу объяснить любой феномен, разобрать ваши ошибки из последнего теста или ответить на вопросы по клинике.',
};

function ChatBubble({ message, isLast }) {
    const isUser = message.role === 'user';
    return (
        <div style={{
            display: 'flex',
            justifyContent: isUser ? 'flex-end' : 'flex-start',
            marginBottom: 12,
            gap: 8,
            alignItems: 'flex-start',
        }}>
            {!isUser && (
                <Avatar
                    size={32}
                    icon={<RobotOutlined />}
                    style={{ background: 'linear-gradient(135deg, #635bff, #00d4ff)', flexShrink: 0, marginTop: 2 }}
                />
            )}
            <div style={{
                maxWidth: '75%',
                background: isUser ? 'linear-gradient(135deg, #635bff, #00aaff)' : '#f5f5f5',
                color: isUser ? '#fff' : '#0a2540',
                borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                padding: '10px 14px',
                fontSize: 14,
                lineHeight: 1.6,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                boxShadow: isUser ? '0 2px 8px rgba(99,91,255,0.25)' : '0 1px 4px rgba(0,0,0,0.08)',
            }}>
                {message.content}
                {isLast && message.role === 'assistant' && (
                    <span style={{
                        display: 'inline-block',
                        width: 6,
                        height: 14,
                        background: '#635bff',
                        marginLeft: 4,
                        borderRadius: 2,
                        animation: 'blink 1s infinite',
                        verticalAlign: 'text-bottom',
                        opacity: 0,
                    }} />
                )}
            </div>
            {isUser && (
                <Avatar
                    size={32}
                    icon={<UserOutlined />}
                    style={{ background: '#0a2540', flexShrink: 0, marginTop: 2 }}
                />
            )}
        </div>
    );
}

function AIChatSection({ user }) {
    const [messages, setMessages] = useState([INITIAL_MESSAGE]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [lastMistakes, setLastMistakes] = useState(null);
    const [loadingMistakes, setLoadingMistakes] = useState(false);
    const bottomRef = useRef(null);
    const inputRef = useRef(null);

    // Scroll to bottom on new messages
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, loading]);

    // Load last test mistakes if user is logged in
    useEffect(() => {
        if (user?.id) {
            loadLastMistakes(user.id);
        }
    }, [user?.id]);

    const loadLastMistakes = async (userId) => {
        setLoadingMistakes(true);
        try {
            const { data } = await supabase
                .from('test_sessions')
                .select('score, correct_q, total_q, created_at, answers, session_type, category')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            if (data && data.answers) {
                const wrong = (data.answers || []).filter(a => !a.is_correct && a.question);
                if (wrong.length > 0) {
                    setLastMistakes({ session: data, wrong });
                }
            }
        } catch {
            // No sessions yet — silent fail
        } finally {
            setLoadingMistakes(false);
        }
    };

    const buildHistory = (msgs) => [
        { role: 'system', content: SYSTEM_PROMPT },
        ...msgs,
    ];

    const sendMessage = useCallback(async (text) => {
        const trimmed = (text || input).trim();
        if (!trimmed || loading) return;

        const userMsg = { role: 'user', content: trimmed };
        const newMessages = [...messages, userMsg];
        setMessages(newMessages);
        setInput('');
        setError(null);
        setLoading(true);

        try {
            const reply = await continueChat(buildHistory(newMessages));
            setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
        } catch (e) {
            setError(e.message || 'Ошибка ИИ');
        } finally {
            setLoading(false);
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [input, messages, loading]);

    const analyzeMyMistakes = () => {
        if (!lastMistakes) return;
        const { session, wrong } = lastMistakes;
        const date = new Date(session.created_at).toLocaleDateString('ru');
        const type = session.session_type === 'T1' ? 'Т1 (входной)'
                   : session.session_type === 'T2' ? 'Т2 (+7 дней)'
                   : session.session_type === 'T3' ? 'Т3 (отсроченный)'
                   : 'практика';

        const mistakesList = wrong.slice(0, 5).map((m, i) =>
            `${i + 1}. Вопрос: «${m.question}»\n   Мой ответ: ${m.user_answer || '—'}\n   Правильный ответ: ${m.correct_answer || '—'}`
        ).join('\n\n');

        const prompt = `Разбери мои ошибки из теста (${type}, ${date}, результат ${session.correct_q}/${session.total_q}):\n\n${mistakesList}\n\nОбъясни каждую ошибку: чем отличается правильный ответ, механизм звука и как запомнить.`;
        sendMessage(prompt);
    };

    const quickQuestions = [
        'Как отличить митральный стеноз от митральной регургитации?',
        'Чем крепитация отличается от мелкопузырчатых хрипов?',
        'Где выслушивать аортальный стеноз и куда он проводится?',
        'Что такое тон открытия митрального клапана?',
    ];

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    return (
        <div style={{ padding: '16px 0 32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <Avatar
                    size={40}
                    icon={<RobotOutlined />}
                    style={{ background: 'linear-gradient(135deg, #635bff, #00d4ff)' }}
                />
                <div>
                    <div style={{ fontWeight: 700, fontSize: 18, color: '#0a2540' }}>
                        ИИ-помощник по аускультации
                    </div>
                    <div style={{ fontSize: 12, color: '#8898aa' }}>
                        Mistral · объясняет, разбирает ошибки, отвечает на вопросы
                    </div>
                </div>
            </div>

            {/* Mistakes panel */}
            {user && lastMistakes && (
                <Alert
                    style={{ marginBottom: 12 }}
                    type="warning"
                    showIcon
                    icon={<WarningOutlined />}
                    message={
                        <span>
                            Найдены ошибки в последнем тесте ({lastMistakes.wrong.length} шт.,{' '}
                            {lastMistakes.session.session_type},{' '}
                            {lastMistakes.session.correct_q}/{lastMistakes.session.total_q})
                        </span>
                    }
                    action={
                        <Button size="small" type="primary" danger onClick={analyzeMyMistakes} loading={loading}>
                            Разобрать ошибки
                        </Button>
                    }
                />
            )}
            {user && !lastMistakes && !loadingMistakes && (
                <Alert
                    style={{ marginBottom: 12 }}
                    type="info"
                    showIcon
                    message="Пройдите тест — я разберу ваши ошибки и объясню правильные ответы."
                />
            )}

            {/* Chat window */}
            <Card
                bodyStyle={{ padding: 0 }}
                style={{ borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}
            >
                {/* Messages */}
                <div style={{
                    height: 440,
                    overflowY: 'auto',
                    padding: '16px 16px 8px',
                    background: '#fafafa',
                }}>
                    {messages.map((msg, i) => (
                        <ChatBubble
                            key={i}
                            message={msg}
                            isLast={i === messages.length - 1 && loading}
                        />
                    ))}
                    {loading && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                            <Avatar
                                size={32}
                                icon={<RobotOutlined />}
                                style={{ background: 'linear-gradient(135deg, #635bff, #00d4ff)', flexShrink: 0 }}
                            />
                            <div style={{
                                background: '#f0f0f0',
                                borderRadius: '16px 16px 16px 4px',
                                padding: '10px 16px',
                                display: 'flex',
                                gap: 4,
                                alignItems: 'center',
                            }}>
                                {[0, 1, 2].map(i => (
                                    <span key={i} style={{
                                        width: 8, height: 8,
                                        borderRadius: '50%',
                                        background: '#aaa',
                                        display: 'inline-block',
                                        animation: `bounce 1.2s ${i * 0.2}s infinite`,
                                    }} />
                                ))}
                            </div>
                        </div>
                    )}
                    <div ref={bottomRef} />
                </div>

                {/* Quick questions */}
                {messages.length <= 1 && (
                    <>
                        <Divider style={{ margin: '0 16px', width: 'auto' }} />
                        <div style={{ padding: '8px 16px 4px' }}>
                            <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 6 }}>
                                <BulbOutlined /> Быстрые вопросы:
                            </Text>
                            <Space wrap size={[6, 6]}>
                                {quickQuestions.map((q, i) => (
                                    <Tag
                                        key={i}
                                        style={{ cursor: 'pointer', padding: '2px 8px', fontSize: 12 }}
                                        color="blue"
                                        onClick={() => sendMessage(q)}
                                    >
                                        {q}
                                    </Tag>
                                ))}
                            </Space>
                        </div>
                    </>
                )}

                {/* Error */}
                {error && (
                    <Alert
                        message={error}
                        type="error"
                        showIcon
                        style={{ margin: '8px 16px', borderRadius: 8 }}
                        action={
                            <Button size="small" onClick={() => setError(null)}>
                                Закрыть
                            </Button>
                        }
                    />
                )}

                {/* Input area */}
                <div style={{
                    padding: '8px 12px 12px',
                    borderTop: '1px solid #f0f0f0',
                    background: '#fff',
                    display: 'flex',
                    gap: 8,
                    alignItems: 'flex-end',
                }}>
                    <TextArea
                        ref={inputRef}
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Введите вопрос... (Enter — отправить, Shift+Enter — перенос)"
                        autoSize={{ minRows: 1, maxRows: 4 }}
                        disabled={loading}
                        style={{ borderRadius: 20, resize: 'none', fontSize: 14, flex: 1 }}
                    />
                    <Tooltip title="Отправить (Enter)">
                        <Button
                            type="primary"
                            shape="circle"
                            icon={<SendOutlined />}
                            onClick={() => sendMessage()}
                            loading={loading}
                            disabled={!input.trim()}
                            style={{
                                background: 'linear-gradient(135deg, #635bff, #00aaff)',
                                border: 'none',
                                flexShrink: 0,
                            }}
                        />
                    </Tooltip>
                    <Tooltip title="Очистить чат">
                        <Button
                            shape="circle"
                            icon={<ReloadOutlined />}
                            onClick={() => { setMessages([INITIAL_MESSAGE]); setError(null); }}
                            disabled={loading || messages.length <= 1}
                            style={{ flexShrink: 0 }}
                        />
                    </Tooltip>
                </div>
            </Card>

            <style>{`
                @keyframes bounce {
                    0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
                    30% { transform: translateY(-6px); opacity: 1; }
                }
                @keyframes blink {
                    0%, 100% { opacity: 0; }
                    50% { opacity: 1; }
                }
            `}</style>
        </div>
    );
}

export default AIChatSection;
