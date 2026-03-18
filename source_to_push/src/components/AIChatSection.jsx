import { useState, useRef, useEffect } from 'react';
import { Card, Input, Button, Typography, Space, Alert, Avatar, Tag } from 'antd';
import { SendOutlined, RobotOutlined, UserOutlined, ClearOutlined } from '@ant-design/icons';
import { supabase } from '../services/supabase';
import { trackChatMessage } from '../services/analytics';
import './AIChatSection.css';

const { Title, Text } = Typography;
const { TextArea } = Input;

const MODE_LABELS = {
  cardiac:   'кардиология',
  pulmonary: 'пульмонология',
  both:      'смешанный',
};

// Chips зависят от наличия результата теста
function getChips(lastTestResult) {
  if (lastTestResult) {
    return [
      'Разбери мои ошибки в тесте',
      'Почему я путаю эти звуки?',
      'Дай клинический случай по теме',
      'Как лучше это запомнить?',
    ];
  }
  return [
    'С чего начать изучение аускультации?',
    'Объясни тоны сердца I и II',
    'Чем крепитация отличается от хрипов?',
    'Дай клинический случай',
  ];
}

const CHAT_STORAGE_KEY = 'ai_chat_history';

function AIChatSection({ userProfile, currentSection, lastTestResult }) {
  const [messages, setMessages] = useState(() => {
    try {
      const saved = sessionStorage.getItem(CHAT_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastMessageTime, setLastMessageTime] = useState(0);
  const messagesEndRef = useRef(null);

  // Сохраняем историю в sessionStorage при каждом обновлении
  useEffect(() => {
    try {
      sessionStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages));
    } catch { /* ignore quota errors */ }
  }, [messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (text) => {
    const userMessage = (text ?? inputValue).trim();
    if (!userMessage || loading) return;

    // Throttle: не чаще одного сообщения в 3 секунды
    const now = Date.now();
    if (now - lastMessageTime < 3000) {
      return;
    }
    setLastMessageTime(now);

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
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          message: userMessage,
          history: messages.slice(-6),
          context: {
            userRole: userProfile?.role || 'student',
            lastTestResult: lastTestResult || null,
            currentSection: currentSection || 'chat',
          },
        }),
      });

      if (!response.ok) throw new Error('Ошибка при получении ответа');

      const data = await response.json();
      if (data.error) throw new Error(data.error);

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

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    setMessages([]);
    setError(null);
    sessionStorage.removeItem(CHAT_STORAGE_KEY);
  };

  // Контекстная плашка
  const contextBadge = (() => {
    if (lastTestResult) {
      const modeLabel = MODE_LABELS[lastTestResult.mode] || lastTestResult.mode;
      const passed = lastTestResult.score >= 70;
      return (
        <Alert
          type={passed ? 'success' : 'warning'}
          showIcon={false}
          className="context-badge"
          message={
            <Text style={{ fontSize: 12 }}>
              📋 Последний тест:{' '}
              <Text strong style={{ fontSize: 12 }}>{lastTestResult.score}%</Text>
              {' · '}{modeLabel}
              {' · '}{lastTestResult.wrongCount} {lastTestResult.wrongCount === 1 ? 'ошибка' : 'ошибок'}
            </Text>
          }
        />
      );
    }
    if (currentSection === 'learning' || currentSection === 'theory') {
      return (
        <Alert
          type="info"
          showIcon={false}
          className="context-badge"
          message={<Text style={{ fontSize: 12 }}>📖 Режим: изучение материала</Text>}
        />
      );
    }
    return null;
  })();

  const chips = getChips(lastTestResult);

  return (
    <div className="ai-chat-section">
      <div className="chat-header">
        <Title level={2}>
          <RobotOutlined /> ИИ-помощник
        </Title>
        <Text type="secondary">
          Куратор по аускультации — задаёт вопросы, разбирает ошибки, даёт клинические случаи
        </Text>
      </div>

      <Card className="chat-container">
        {messages.length === 0 ? (
          /* ── Welcome экран ───────────────────────────────────── */
          <div className="chat-welcome">
            <RobotOutlined className="welcome-icon" />
            <Title level={4} style={{ marginBottom: 8 }}>ИИ-помощник по аускультации</Title>
            <Text type="secondary" style={{ marginBottom: 16, display: 'block' }}>
              Задайте вопрос или выберите тему ниже
            </Text>

            {contextBadge && (
              <div style={{ width: '100%', maxWidth: 520, marginBottom: 20 }}>
                {contextBadge}
              </div>
            )}

            <div className="chips-row">
              {chips.map((chip) => (
                <Tag
                  key={chip}
                  className="chip"
                  onClick={() => sendMessage(chip)}
                  style={{ cursor: 'pointer' }}
                >
                  {chip}
                </Tag>
              ))}
            </div>
          </div>
        ) : (
          /* ── История сообщений ───────────────────────────────── */
          <div className="messages-container">
            {/* Контекстная плашка над историей */}
            {contextBadge && (
              <div style={{ marginBottom: 12 }}>{contextBadge}</div>
            )}

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
                <div className="message-content typing-indicator">
                  <span /><span /><span />
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

        {/* ── Поле ввода ─────────────────────────────────────── */}
        <div className="chat-input-container">
          <Space.Compact style={{ width: '100%' }}>
            <TextArea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Введите вопрос или нажмите Enter…"
              autoSize={{ minRows: 1, maxRows: 4 }}
              disabled={loading}
              className="chat-input"
            />
            <Button
              type="primary"
              icon={<SendOutlined />}
              onClick={() => sendMessage()}
              loading={loading}
              disabled={!inputValue.trim()}
              className="send-button"
            >
              <span className="send-label">Отправить</span>
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
