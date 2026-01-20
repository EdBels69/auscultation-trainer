import { useState, useEffect } from 'react';
import { Card, Table, Statistic, Row, Col, Button, DatePicker, Space, Typography, Spin, Empty, Tabs, Tag, List } from 'antd';
import { DownloadOutlined, ReloadOutlined, UserOutlined, BookOutlined, FileTextOutlined, MessageOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { getAllStatisticsForAdmin, exportToCSV } from '../services/analytics';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

function StatisticsPanel() {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState(null);
    const [dateRange, setDateRange] = useState([dayjs().subtract(30, 'day'), dayjs()]);

    const loadStats = async () => {
        setLoading(true);
        try {
            const data = await getAllStatisticsForAdmin();
            setStats(data);
        } catch (error) {
            console.error('Error loading statistics:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadStats();
    }, []);

    const filterByDate = (items, dateField) => {
        if (!dateRange || !dateRange[0] || !dateRange[1]) return items;
        return items.filter(item => {
            const date = dayjs(item[dateField]);
            return date.isAfter(dateRange[0].startOf('day')) && date.isBefore(dateRange[1].endOf('day'));
        });
    };

    const getFilteredStats = () => {
        if (!stats) return null;
        return {
            sessions: filterByDate(stats.sessions, 'started_at'),
            actions: filterByDate(stats.actions, 'created_at'),
            testAttempts: filterByDate(stats.testAttempts, 'completed_at'),
            profiles: stats.profiles
        };
    };

    const filteredStats = getFilteredStats();

    const getSummaryStats = () => {
        if (!filteredStats) return {};

        const uniqueUsers = new Set(filteredStats.sessions.map(s => s.anonymous_id)).size;
        const totalSessions = filteredStats.sessions.length;
        const totalActions = filteredStats.actions.length;
        const totalTests = filteredStats.testAttempts.length;
        const avgScore = filteredStats.testAttempts.length > 0
            ? Math.round(filteredStats.testAttempts.reduce((sum, t) => sum + t.score_percent, 0) / filteredStats.testAttempts.length)
            : 0;

        const actionCounts = filteredStats.actions.reduce((acc, a) => {
            acc[a.action_type] = (acc[a.action_type] || 0) + 1;
            return acc;
        }, {});

        return {
            uniqueUsers,
            totalSessions,
            totalActions,
            totalTests,
            avgScore,
            soundPlays: actionCounts['sound_play'] || 0,
            pageViews: actionCounts['page_view'] || 0,
            chatMessages: actionCounts['chat_message'] || 0
        };
    };

    const summary = getSummaryStats();

    const handleExportSessions = () => {
        if (filteredStats?.sessions) {
            exportToCSV(filteredStats.sessions, 'sessions');
        }
    };

    const handleExportActions = () => {
        if (filteredStats?.actions) {
            exportToCSV(filteredStats.actions, 'actions');
        }
    };

    const handleExportTests = () => {
        if (filteredStats?.testAttempts) {
            const exportData = filteredStats.testAttempts.map(t => ({
                anonymous_id: t.anonymous_id,
                test_type: t.test_type,
                total_questions: t.total_questions,
                correct_answers: t.correct_answers,
                score_percent: t.score_percent,
                duration_seconds: t.duration_seconds,
                completed_at: t.completed_at
            }));
            exportToCSV(exportData, 'test_results');
        }
    };

    const handleExportAll = () => {
        if (filteredStats) {
            const combinedData = filteredStats.testAttempts.map(test => {
                const userActions = filteredStats.actions.filter(a => a.anonymous_id === test.anonymous_id);
                const userSessions = filteredStats.sessions.filter(s => s.anonymous_id === test.anonymous_id);

                return {
                    anonymous_id: test.anonymous_id,
                    test_date: test.completed_at,
                    test_type: test.test_type,
                    score: test.score_percent,
                    questions_total: test.total_questions,
                    questions_correct: test.correct_answers,
                    duration_sec: test.duration_seconds,
                    total_sessions: userSessions.length,
                    total_actions: userActions.length,
                    sounds_played: userActions.filter(a => a.action_type === 'sound_play').length,
                    chat_messages: userActions.filter(a => a.action_type === 'chat_message').length
                };
            });
            exportToCSV(combinedData, 'full_statistics');
        }
    };

    const difficultyLabel = {
        easy: 'Простой',
        medium: 'Средний',
        hard: 'Сложный'
    };

    const modeLabel = {
        cardiac: 'Кардио',
        pulmonary: 'Пульмо',
        both: 'Смешанный'
    };

    const testColumns = [
        {
            title: 'ID',
            dataIndex: 'anonymous_id',
            key: 'anonymous_id',
            render: (id) => <Text copyable={{ text: id }}>{id.slice(0, 8)}...</Text>
        },
        {
            title: 'Тип',
            dataIndex: 'test_type',
            key: 'test_type',
            render: (type) => (
                <Tag color={type === 'ai_quiz' ? 'blue' : 'green'}>
                    {type === 'ai_quiz' ? 'AI Квиз' : 'Локальный'}
                </Tag>
            )
        },
        {
            title: 'Уровень',
            dataIndex: 'difficulty',
            key: 'difficulty',
            render: (difficulty) => (
                <Tag color={difficulty === 'easy' ? 'blue' : difficulty === 'medium' ? 'orange' : 'red'}>
                    {difficultyLabel[difficulty] || difficulty}
                </Tag>
            )
        },
        {
            title: 'Режим',
            dataIndex: 'mode',
            key: 'mode',
            render: (mode) => <Tag>{modeLabel[mode] || mode}</Tag>
        },
        {
            title: 'Вопросов',
            dataIndex: 'question_count',
            key: 'question_count'
        },
        {
            title: 'Результат',
            dataIndex: 'score_percent',
            key: 'score_percent',
            sorter: (a, b) => a.score_percent - b.score_percent,
            render: (score) => (
                <Tag color={score >= 70 ? 'green' : score >= 50 ? 'orange' : 'red'}>
                    {score}%
                </Tag>
            )
        },
        {
            title: 'Правильно',
            key: 'correct',
            render: (_, record) => `${record.correct_answers}/${record.total_questions}`
        },
        {
            title: 'Время (сек)',
            dataIndex: 'duration_seconds',
            key: 'duration_seconds',
            sorter: (a, b) => a.duration_seconds - b.duration_seconds
        },
        {
            title: 'Дата',
            dataIndex: 'completed_at',
            key: 'completed_at',
            sorter: (a, b) => new Date(a.completed_at) - new Date(b.completed_at),
            render: (date) => dayjs(date).format('DD.MM.YYYY HH:mm')
        }
    ];

    const expandedRowRender = (record) => {
        const details = record.details || [];
        if (details.length === 0) {
            return <Text type="secondary">Детальная информация недоступна</Text>;
        }

        const detailColumns = [
            {
                title: '#',
                dataIndex: 'questionNumber',
                key: 'questionNumber',
                width: 50
            },
            {
                title: 'Аудио',
                dataIndex: 'audioName',
                key: 'audioName',
                render: (name) => <Text strong>{name}</Text>
            },
            {
                title: 'Ответ пользователя',
                dataIndex: 'userAnswer',
                key: 'userAnswer'
            },
            {
                title: 'Результат',
                dataIndex: 'isCorrect',
                key: 'isCorrect',
                width: 100,
                render: (isCorrect) => isCorrect
                    ? <Tag icon={<CheckCircleOutlined />} color="success">Верно</Tag>
                    : <Tag icon={<CloseCircleOutlined />} color="error">Неверно</Tag>
            }
        ];

        return (
            <Table
                columns={detailColumns}
                dataSource={details}
                rowKey={(item, idx) => `${record.id}-${idx}`}
                pagination={false}
                size="small"
            />
        );
    };

    const actionColumns = [
        {
            title: 'ID',
            dataIndex: 'anonymous_id',
            key: 'anonymous_id',
            render: (id) => id?.slice(0, 8) + '...'
        },
        {
            title: 'Действие',
            dataIndex: 'action_type',
            key: 'action_type',
            filters: [
                { text: 'Просмотр страницы', value: 'page_view' },
                { text: 'Прослушивание звука', value: 'sound_play' },
                { text: 'Начало теста', value: 'test_start' },
                { text: 'Сообщение в чат', value: 'chat_message' }
            ],
            onFilter: (value, record) => record.action_type === value,
            render: (type) => {
                const labels = {
                    'page_view': 'Просмотр страницы',
                    'sound_play': 'Прослушивание звука',
                    'test_start': 'Начало теста',
                    'chat_message': 'Сообщение в чат'
                };
                return labels[type] || type;
            }
        },
        {
            title: 'Данные',
            dataIndex: 'action_data',
            key: 'action_data',
            render: (data) => data ? JSON.stringify(data).slice(0, 50) : '-'
        },
        {
            title: 'Дата',
            dataIndex: 'created_at',
            key: 'created_at',
            sorter: (a, b) => new Date(a.created_at) - new Date(b.created_at),
            render: (date) => dayjs(date).format('DD.MM.YYYY HH:mm')
        }
    ];

    if (loading) {
        return (
            <div style={{ textAlign: 'center', padding: 50 }}>
                <Spin size="large" />
            </div>
        );
    }

    const items = [
        {
            key: 'overview',
            label: 'Обзор',
            children: (
                <div>
                    <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                        <Col xs={12} sm={8} md={6}>
                            <Card>
                                <Statistic
                                    title="Уникальных пользователей"
                                    value={summary.uniqueUsers}
                                    prefix={<UserOutlined />}
                                />
                            </Card>
                        </Col>
                        <Col xs={12} sm={8} md={6}>
                            <Card>
                                <Statistic
                                    title="Всего сессий"
                                    value={summary.totalSessions}
                                />
                            </Card>
                        </Col>
                        <Col xs={12} sm={8} md={6}>
                            <Card>
                                <Statistic
                                    title="Пройдено тестов"
                                    value={summary.totalTests}
                                    prefix={<FileTextOutlined />}
                                />
                            </Card>
                        </Col>
                        <Col xs={12} sm={8} md={6}>
                            <Card>
                                <Statistic
                                    title="Средний балл"
                                    value={summary.avgScore}
                                    suffix="%"
                                    valueStyle={{ color: summary.avgScore >= 70 ? '#52c41a' : '#faad14' }}
                                />
                            </Card>
                        </Col>
                        <Col xs={12} sm={8} md={6}>
                            <Card>
                                <Statistic
                                    title="Прослушиваний звуков"
                                    value={summary.soundPlays}
                                    prefix={<BookOutlined />}
                                />
                            </Card>
                        </Col>
                        <Col xs={12} sm={8} md={6}>
                            <Card>
                                <Statistic
                                    title="Сообщений в чат"
                                    value={summary.chatMessages}
                                    prefix={<MessageOutlined />}
                                />
                            </Card>
                        </Col>
                    </Row>
                </div>
            )
        },
        {
            key: 'tests',
            label: 'Результаты тестов',
            children: (
                <div>
                    <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end' }}>
                        <Button icon={<DownloadOutlined />} onClick={handleExportTests}>
                            Экспорт в CSV
                        </Button>
                    </div>
                    <Table
                        dataSource={filteredStats?.testAttempts || []}
                        columns={testColumns}
                        rowKey="id"
                        pagination={{ pageSize: 10 }}
                        scroll={{ x: 800 }}
                        expandable={{
                            expandedRowRender,
                            rowExpandable: (record) => record.details && record.details.length > 0
                        }}
                    />
                </div>
            )
        },
        {
            key: 'actions',
            label: 'Действия пользователей',
            children: (
                <div>
                    <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end' }}>
                        <Button icon={<DownloadOutlined />} onClick={handleExportActions}>
                            Экспорт в CSV
                        </Button>
                    </div>
                    <Table
                        dataSource={filteredStats?.actions?.slice(0, 100) || []}
                        columns={actionColumns}
                        rowKey="id"
                        pagination={{ pageSize: 10 }}
                        scroll={{ x: 800 }}
                    />
                    {(filteredStats?.actions?.length || 0) > 100 && (
                        <Text type="secondary">Показаны последние 100 записей. Экспортируйте CSV для полных данных.</Text>
                    )}
                </div>
            )
        }
    ];

    return (
        <div>
            <div style={{ marginBottom: 24, display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center', justifyContent: 'space-between' }}>
                <Space wrap>
                    <Text strong>Период:</Text>
                    <RangePicker
                        value={dateRange}
                        onChange={setDateRange}
                        format="DD.MM.YYYY"
                    />
                    <Button icon={<ReloadOutlined />} onClick={loadStats}>
                        Обновить
                    </Button>
                </Space>
                <Button type="primary" icon={<DownloadOutlined />} onClick={handleExportAll}>
                    Экспорт всей статистики
                </Button>
            </div>

            {!stats || (stats.sessions.length === 0 && stats.testAttempts.length === 0) ? (
                <Empty description="Данных статистики пока нет" />
            ) : (
                <Tabs items={items} />
            )}
        </div>
    );
}

export default StatisticsPanel;
