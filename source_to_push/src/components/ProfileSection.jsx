import { useState, useEffect } from 'react';
import {
    Card, Row, Col, Statistic, Table, Tag, Form, Input,
    Button, Space, Typography, Avatar, message, Spin
} from 'antd';
import {
    EditOutlined, SaveOutlined, CloseOutlined,
    UserOutlined, TrophyOutlined, LineChartOutlined
} from '@ant-design/icons';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid,
    Tooltip, ReferenceLine, ResponsiveContainer
} from 'recharts';
import { getMyTestHistory, getMyAchievements, ACHIEVEMENT_DEFINITIONS } from '../services/analytics';
import { updateUserProfile } from '../services/supabase';

const { Title, Text } = Typography;

const ROLE_LABELS = {
    student:  'Студент',
    resident: 'Ординатор',
    doctor:   'Врач',
    teacher:  'Преподаватель',
    admin:    'Администратор',
};

function ProfileSection({ userProfile, onProfileUpdate }) {
    const [testHistory, setTestHistory]   = useState([]);
    const [achievements, setAchievements] = useState([]);
    const [dataLoading, setDataLoading]   = useState(true);
    const [editing, setEditing]           = useState(false);
    const [saving, setSaving]             = useState(false);
    const [form] = Form.useForm();

    useEffect(() => {
        const loadData = async () => {
            setDataLoading(true);
            try {
                const [history, achs] = await Promise.all([
                    getMyTestHistory(),
                    getMyAchievements(),
                ]);
                setTestHistory(history);
                setAchievements(achs);
            } catch (err) {
                console.error('Error loading profile data:', err);
            } finally {
                setDataLoading(false);
            }
        };
        loadData();
    }, []);

    const handleEdit = () => {
        form.setFieldsValue({
            last_name:   userProfile?.last_name   || '',
            first_name:  userProfile?.first_name  || '',
            middle_name: userProfile?.middle_name || '',
            institution: userProfile?.institution || '',
        });
        setEditing(true);
    };

    const handleSave = async () => {
        try {
            const values = await form.validateFields();
            setSaving(true);
            const updated = await updateUserProfile(values);
            onProfileUpdate?.(updated);
            setEditing(false);
            message.success('Профиль обновлён');
        } catch (err) {
            if (err.errorFields) return;
            message.error('Ошибка при сохранении: ' + (err.message || ''));
        } finally {
            setSaving(false);
        }
    };

    // ── KPI ─────────────────────────────────────────────
    const totalTests = testHistory.length;
    const avgScore   = totalTests > 0
        ? Math.round(testHistory.reduce((sum, t) => sum + t.score_percent, 0) / totalTests)
        : 0;
    const bestScore  = totalTests > 0
        ? Math.max(...testHistory.map(t => t.score_percent))
        : 0;
    const unlockedCount = achievements.length;

    // ── График: последние 30 попыток, по возрастанию ────
    const chartData = [...testHistory]
        .reverse()
        .slice(-30)
        .map((t) => ({
            name:  new Date(t.completed_at).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' }),
            score: t.score_percent,
        }));

    // ── Таблица истории ──────────────────────────────────
    const columns = [
        {
            title: 'Дата',
            dataIndex: 'completed_at',
            key: 'date',
            render: (val) => new Date(val).toLocaleString('ru-RU', {
                day: '2-digit', month: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit'
            }),
            width: 150,
        },
        {
            title: 'Балл',
            dataIndex: 'score_percent',
            key: 'score',
            render: (val) => (
                <Tag color={val >= 70 ? 'success' : 'error'}>{val}%</Tag>
            ),
            width: 80,
        },
        {
            title: 'Правильно',
            key: 'correct',
            render: (_, r) => `${r.correct_count} / ${r.total_count}`,
            width: 110,
        },
    ];

    const unlockedKeys = new Set(achievements.map(a => a.achievement_key));
    const fio = [userProfile?.last_name, userProfile?.first_name, userProfile?.middle_name]
        .filter(Boolean).join(' ');

    if (dataLoading) {
        return <div style={{ padding: '60px 0', textAlign: 'center' }}><Spin size="large" /></div>;
    }

    return (
        <div style={{ padding: '32px 0' }}>
            <Title level={2}>Мой профиль</Title>

            {/* ── Профиль ──────────────────────────────── */}
            <Card style={{ marginBottom: 24, maxWidth: 700 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: editing ? 20 : 0 }}>
                    <Avatar size={56} icon={<UserOutlined />} style={{ background: '#667eea', flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <Text strong style={{ fontSize: 16, display: 'block' }}>
                            {fio || userProfile?.email}
                        </Text>
                        <Text type="secondary">{userProfile?.email}</Text>
                        <div style={{ marginTop: 6, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                            <Tag color="blue">{ROLE_LABELS[userProfile?.role] || userProfile?.role}</Tag>
                            {userProfile?.institution && (
                                <Text type="secondary" style={{ fontSize: 12 }}>{userProfile.institution}</Text>
                            )}
                        </div>
                    </div>
                    {!editing && (
                        <Button icon={<EditOutlined />} onClick={handleEdit}>Редактировать</Button>
                    )}
                </div>

                {editing && (
                    <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
                        <Row gutter={12}>
                            <Col xs={24} sm={8}>
                                <Form.Item name="last_name" label="Фамилия"
                                    rules={[{ required: true, message: 'Введите фамилию' }]}>
                                    <Input placeholder="Фамилия" />
                                </Form.Item>
                            </Col>
                            <Col xs={24} sm={8}>
                                <Form.Item name="first_name" label="Имя"
                                    rules={[{ required: true, message: 'Введите имя' }]}>
                                    <Input placeholder="Имя" />
                                </Form.Item>
                            </Col>
                            <Col xs={24} sm={8}>
                                <Form.Item name="middle_name" label="Отчество">
                                    <Input placeholder="Отчество" />
                                </Form.Item>
                            </Col>
                        </Row>
                        <Form.Item name="institution" label="Учреждение">
                            <Input placeholder="Университет, больница..." />
                        </Form.Item>
                        <Space>
                            <Button
                                type="primary"
                                icon={<SaveOutlined />}
                                onClick={handleSave}
                                loading={saving}
                            >
                                Сохранить
                            </Button>
                            <Button icon={<CloseOutlined />} onClick={() => setEditing(false)}>
                                Отмена
                            </Button>
                        </Space>
                    </Form>
                )}
            </Card>

            {/* ── KPI-карточки ──────────────────────────── */}
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col xs={12} sm={6}>
                    <Card>
                        <Statistic title="Тестов пройдено" value={totalTests} />
                    </Card>
                </Col>
                <Col xs={12} sm={6}>
                    <Card>
                        <Statistic
                            title="Средний балл"
                            value={avgScore}
                            suffix="%"
                            valueStyle={{ color: avgScore >= 70 ? '#52c41a' : '#faad14' }}
                        />
                    </Card>
                </Col>
                <Col xs={12} sm={6}>
                    <Card>
                        <Statistic
                            title="Лучший балл"
                            value={bestScore}
                            suffix="%"
                            valueStyle={{ color: '#1677ff' }}
                        />
                    </Card>
                </Col>
                <Col xs={12} sm={6}>
                    <Card>
                        <Statistic
                            title="Достижений"
                            value={unlockedCount}
                            suffix="/ 7"
                            prefix={<TrophyOutlined />}
                            valueStyle={{ color: unlockedCount > 0 ? '#fa8c16' : undefined }}
                        />
                    </Card>
                </Col>
            </Row>

            {/* ── График прогресса ──────────────────────── */}
            {chartData.length > 1 && (
                <Card
                    title={<span><LineChartOutlined style={{ marginRight: 8 }} />Динамика результатов</span>}
                    style={{ marginBottom: 24 }}
                >
                    <ResponsiveContainer width="100%" height={220}>
                        <LineChart data={chartData} margin={{ top: 8, right: 24, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                            <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
                            <Tooltip formatter={(val) => [`${val}%`, 'Балл']} />
                            <ReferenceLine
                                y={70}
                                stroke="#faad14"
                                strokeDasharray="6 3"
                                label={{ value: '70%', position: 'right', fontSize: 11, fill: '#faad14' }}
                            />
                            <Line
                                type="monotone"
                                dataKey="score"
                                stroke="#667eea"
                                strokeWidth={2}
                                dot={{ r: 3 }}
                                activeDot={{ r: 5 }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </Card>
            )}

            {/* ── История тестов ────────────────────────── */}
            <Card title="История тестов" style={{ marginBottom: 24 }}>
                {testHistory.length === 0 ? (
                    <Text type="secondary">
                        Вы ещё не проходили тесты. Перейдите в раздел «Тестирование»!
                    </Text>
                ) : (
                    <Table
                        dataSource={testHistory}
                        columns={columns}
                        rowKey="id"
                        pagination={{ pageSize: 10, showSizeChanger: false }}
                        scroll={{ x: 'max-content' }}
                        size="small"
                    />
                )}
            </Card>

            {/* ── Достижения ────────────────────────────── */}
            <Card title={<span><TrophyOutlined style={{ marginRight: 8 }} />Достижения</span>}>
                <Row gutter={[12, 12]}>
                    {ACHIEVEMENT_DEFINITIONS.map((def) => {
                        const unlocked   = unlockedKeys.has(def.key);
                        const achRecord  = achievements.find(a => a.achievement_key === def.key);
                        return (
                            <Col xs={12} sm={8} key={def.key}>
                                <Card
                                    size="small"
                                    style={{
                                        opacity:    unlocked ? 1 : 0.5,
                                        background: unlocked ? '#f6ffed' : '#fafafa',
                                        border:     unlocked ? '1px solid #b7eb8f' : '1px solid #d9d9d9',
                                        textAlign:  'center',
                                        height:     '100%',
                                    }}
                                >
                                    <div style={{ fontSize: 28, marginBottom: 4 }}>{def.icon}</div>
                                    <Text strong style={{ display: 'block', fontSize: 13 }}>{def.label}</Text>
                                    <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 6 }}>
                                        {def.description}
                                    </Text>
                                    {unlocked ? (
                                        <Tag color="success" style={{ fontSize: 11 }}>
                                            {achRecord
                                                ? new Date(achRecord.unlocked_at).toLocaleDateString('ru-RU')
                                                : '✓'}
                                        </Tag>
                                    ) : (
                                        <Tag color="default" style={{ fontSize: 11 }}>Не получено</Tag>
                                    )}
                                </Card>
                            </Col>
                        );
                    })}
                </Row>
            </Card>
        </div>
    );
}

export default ProfileSection;
