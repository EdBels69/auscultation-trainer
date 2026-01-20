import { useState, useRef, useEffect } from 'react';
import { Card, Input, Button, Typography, Space, Alert, Spin, Avatar } from 'antd';
import { SendOutlined, RobotOutlined, UserOutlined, ClearOutlined } from '@ant-design/icons';
import { supabase } from '../services/supabase';
import { trackChatMessage } from '../services/analytics';
import './AIChatSection.css';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

function AIChatSection() {
    const [messages, setMessages] = useState([]);
    const [inputValue, setInputValue] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const sendMessage = async () => {
        if (!inputValue.trim() || loading) return;

        const userMessage = inputValue.trim();
        setInputValue('');
        setError(null);

        setMessages(prev => [...prev, { role: 'user', content: userMessage }]);

        setLoading(true);

        try {
            const { data: { session } } = await supabase.auth.getSession();

            const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`;

            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY}`,
                    'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY
                },
                body: JSON.stringify({
                    message: userMessage,
                    history: messages.slice(-10)
                })
            });

            if (!response.ok) {
                throw new Error('Ошибка при получении ответа');
            }

            const data = await response.json();

            if (data.error) {
                throw new Error(data.error);
            }

            setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);

            trackChatMessage();
        } catch (err) {
            console.error('Chat error:', err);
            setError(err.message || 'Не удалось получить ответ от ИИ');
            setMessages(prev => prev.slice(0, -1));
        } finally {
            setLoading(false);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    const clearChat = () => {
        setMessages([]);
        setError(null);
    };

    return (
        <div className="ai-chat-section">
            <div className="chat-header">
                <Title level={2}>
                    <RobotOutlined /> ИИ-помощник
                </Title>
                <Text type="secondary">
                    Задавайте вопросы по аускультации сердца и легких
                </Text>
            </div>

            <Card className="chat-container">
                {messages.length === 0 ? (
                    <div className="chat-welcome">
                        <RobotOutlined className="welcome-icon" />
                        <Title level={4}>Добро пожаловать!</Title>
                        <Paragraph type="secondary">
                            Я помогу вам разобраться в сердечных и легочных шумах.
                            Вы можете спросить меня о:
                        </Paragraph>
                        <ul className="topic-list">
                            <li>Характеристиках различных шумов (систолические, диастолические)</li>
                            <li>Точках аускультации и их значении</li>
                            <li>Дифференциальной диагностике по звуковым феноменам</li>
                            <li>Патофизиологии, связанной с аускультативными находками</li>
                        </ul>
                    </div>
                ) : (
                    <div className="messages-container">
                        {messages.map((msg, index) => (
                            <div
                                key={index}
                                className={`message ${msg.role === 'user' ? 'user-message' : 'assistant-message'}`}
                            >
                                <Avatar
                                    icon={msg.role === 'user' ? <UserOutlined /> : <RobotOutlined />}
                                    className={`message-avatar ${msg.role}`}
                                />
                                <div className="message-content">
                                    <div className="message-text">{msg.content}</div>
                                </div>
                            </div>
                        ))}
                        {loading && (
                            <div className="message assistant-message">
                                <Avatar icon={<RobotOutlined />} className="message-avatar assistant" />
                                <div className="message-content">
                                    <Spin size="small" /> <Text type="secondary">Думаю...</Text>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>
                )}

                {error && (
                    <Alert
                        message="Ошибка"
                        description={error}
                        type="error"
                        showIcon
                        closable
                        onClose={() => setError(null)}
                        style={{ marginBottom: 16 }}
                    />
                )}

                <div className="chat-input-container">
                    <Space.Compact style={{ width: '100%' }}>
                        <TextArea
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyPress={handleKeyPress}
                            placeholder="Введите ваш вопрос..."
                            autoSize={{ minRows: 1, maxRows: 4 }}
                            disabled={loading}
                            className="chat-input"
                        />
                        <Button
                            type="primary"
                            icon={<SendOutlined />}
                            onClick={sendMessage}
                            loading={loading}
                            disabled={!inputValue.trim()}
                            className="send-button"
                        >
                            Отправить
                        </Button>
                    </Space.Compact>
                    {messages.length > 0 && (
                        <Button
                            type="text"
                            icon={<ClearOutlined />}
                            onClick={clearChat}
                            className="clear-button"
                        >
                            Очистить чат
                        </Button>
                    )}
                </div>
            </Card>
        </div>
    );
}

export default AIChatSection;
