import { useState, useEffect, useMemo } from 'react';
import { Card, Table, Statistic, Row, Col, Button, DatePicker, Space, Typography, Spin, Empty, Tabs, Tag, Progress } from 'antd';
import {
    DownloadOutlined, ReloadOutlined, UserOutlined,
    FileTextOutlined, TrophyOutlined,
    CheckCircleOutlined, CloseCircleOutlined
} from '@ant-design/icons';
import { getAllStatisticsForAdmin, exportToCSV } from '../services/analytics';
import dayjs from 'dayjs';

const { Text } = Typography;
const { RangePicker } = DatePicker;

const ROLE_LABELS = { student: 'Студент', resident: 'Ординатор', doctor: 'Врач', teacher: 'Преподаватель', admin: 'Администратор' };

const ACHIEVEMENT_LABELS = {
    first_test:      '🏁 Первый тест',
    cardio_novice:   '❤️ Кардиолог-новичок',
    pulmo_novice:    '🫁 Пульмонолог-новичок',
    sharp_ear:       '👂 Острый слух',
    auscult_expert:  '🏆 Эксперт аускультации',
    theory_reader:   '📚 Теоретик',
    polyglot:        '🌐 Полиглот'
};

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

    useEffect(() => { loadStats(); }, []);

    // --- helpers ---

    const filterByDate = (items, field) => {
        if (!dateRange?.[0] || !dateRange?.[1] || !items) return items || [];
        return items.filter(item => {
            const d = dayjs(item[field]);
            return d.isAfter(dateRange[0].startOf('day')) && d.isBefore(dateRange[1].endOf('day'));
        });
    };

    // user_id -> "Фамилия Имя Отчество" или email
    const profileMap = useMemo(() => {
        if (!stats?.profiles) return {};
        return Object.fromEntries(
            stats.profiles.map(p => [
                p.id,
                [p.last_name, p.first_name, p.middle_name].filter(Boolean).join(' ') || p.email || (p.id?.slice(0, 8) + '...')
            ])
        );
    }, [stats]);

    const filteredAttempts     = useMemo(() => filterByDate(stats?.testAttempts,  'completed_at'), [stats, dateRange]);
    const filteredAchievements = useMemo(() => filterByDate(stats?.achievements,   'unlocked_at'),  [stats, dateRange]);

    const summary = useMemo(() => {
        if (!stats) return {};
        const totalUsers = (stats.profiles || []).filter(p => p.role !== 'admin').length;
        const totalTests = filteredAttempts.length;
        const avgScore   = totalTests > 0
            ? Math.round(filteredAttempts.reduce((s, t) => s + (t.score_percent || 0), 0) / totalTests)
            : 0;
        const passRate   = totalTests > 0
            ? Math.round(filteredAttempts.filter(t => t.score_percent >= 70).length / totalTests * 100)
            : 0;
        return { totalUsers, totalTests, avgScore, passRate };
    }, [stats, filteredAttempts]);

    // --- column definitions ---

    const testColumns = [
        {
            title: 'Студент',
            dataIndex: 'user_id',
            key: 'student',
            render: (id) => (
                <Space>
                    <UserOutlined style={{ color: '#635bff' }} />
                    <Text>{profileMap[id] || (id?.slice(0, 8) + '...')}</Text>
                </Space>
            )
        },
        {
            title: 'Результат',
            dataIndex: 'score_percent',
            key: 'score',
            sorter: (a, b) => a.score_percent - b.score_percent,
            render: (score) => (
                <Space direction="vertical" size={2}>
                    <Tag color={score >= 70 ? 'green' : score >= 50 ? 'orange' : 'red'}>{score}%</Tag>
                    <Progress
                        percent={score}
                        size="small"
                        showInfo={false}
                        strokeColor={score >= 70 ? '#52c41a' : score >= 50 ? '#faad14' : '#ff4d4f'}
                        style={{ width: 80 }}
                    />
                </Space>
            )
        },
        {
            title: 'Верно / Всего',
            key: 'correct',
            render: (_, r) => `${r.correct_count ?? '—'} / ${r.total_count ?? '—'}`,
            sorter: (a, b) => (a.correct_count || 0) - (b.correct_count || 0)
        },
        {
            title: 'Дата',
            dataIndex: 'completed_at',
            key: 'date',
            defaultSortOrder: 'descend',
            sorter: (a, b) => new Date(a.completed_at) - new Date(b.completed_at),
            render: (d) => d ? dayjs(d).format('DD.MM.YYYY HH:mm') : '—'
        }
    ];

    const expandedRowRender = (record) => {
        const details = record.details || [];
        if (!details.length) {
            return <Text type="secondary">Детальная информация недоступна</Text>;
        }
        const cols = [
            { title: '#',    dataIndex: 'questionNumber', key: 'n', width: 50 },
            { title: 'Аудио', dataIndex: 'audioName',    key: 'a', render: (n) => <Text strong>{n || '—'}</Text> },
            { title: 'Ответ пользователя', dataIndex: 'userAnswer', key: 'u' },
            {
                title: 'Итог', dataIndex: 'isCorrect', key: 'r', width: 110,
                render: (ok) => ok
                    ? <Tag icon={<CheckCircleOutlined />} color="success">Верно</Tag>
                    : <Tag icon={<CloseCircleOutlined />} color="error">Неверно</Tag>
            }
        ];
        return (
            <Table
                columns={cols}
                dataSource={details}
                rowKey={(_, i) => i}
                pagination={false}
                size="small"
            />
        );
    };

    const achievementColumns = [
        {
            title: 'Студент',
            dataIndex: 'user_id',
            key: 'student',
            render: (id) => profileMap[id] || (id?.slice(0, 8) + '...')
        },
        {
            title: 'Достижение',
            dataIndex: 'achievement_key',
            key: 'ach',
            render: (key) => <Tag color="blue">{ACHIEVEMENT_LABELS[key] || key}</Tag>
        },
        {
            title: 'Получено',
            dataIndex: 'unlocked_at',
            key: 'date',
            defaultSortOrder: 'descend',
            sorter: (a, b) => new Date(a.unlocked_at) - new Date(b.unlocked_at),
            render: (d) => d ? dayjs(d).format('DD.MM.YYYY HH:mm') : '—'
        }
    ];

    const profileColumns = [
        {
            title: 'ФИО',
            key: 'name',
            render: (_, p) =>
                [p.last_name, p.first_name, p.middle_name].filter(Boolean).join(' ') || '—'
        },
        { title: 'Email', dataIndex: 'email', key: 'email' },
        {
            title: 'Статус',
            dataIndex: 'role',
            key: 'role',
            render: (r) => <Tag>{ROLE_LABELS[r] || r}</Tag>
        },
        {
            title: 'Учреждение',
            dataIndex: 'institution',
            key: 'inst',
            render: (v) => v || '—'
        },
        {
            title: 'Зарегистрирован',
            dataIndex: 'created_at',
            key: 'reg',
            render: (d) => d ? dayjs(d).format('DD.MM.YYYY') : '—'
        }
    ];

    // --- render ---

    if (loading) {
        return (
            <div style={{ textAlign: 'center', padding: 50 }}>
                <Spin size="large" />
            </div>
        );
    }

    const hasData = stats && (stats.testAttempts?.length > 0 || stats.profiles?.length > 0);
    const students = (stats?.profiles || []).filter(p => p.role !== 'admin');

    const tabItems = [
        {
            key: 'overview',
            label: 'Обзор',
            children: (
                <Row gutter={[16, 16]}>
                    <Col xs={12} sm={6}>
                        <Card>
                            <Statistic
                                title="Зарегистрировано"
                                value={summary.totalUsers}
                                prefix={<UserOutlined />}
                            />
                        </Card>
                    </Col>
                    <Col xs={12} sm={6}>
                        <Card>
                            <Statistic
                                title="Тестов пройдено"
                                value={summary.totalTests}
                                prefix={<FileTextOutlined />}
                            />
                        </Card>
                    </Col>
                    <Col xs={12} sm={6}>
                        <Card>
                            <Statistic
                                title="Средний балл"
                                value={summary.avgScore}
                                suffix="%"
                                valueStyle={{ color: summary.avgScore >= 70 ? '#52c41a' : '#faad14' }}
                            />
                        </Card>
                    </Col>
                    <Col xs={12} sm={6}>
                        <Card>
                            <Statistic
                                title="Успешно сдали"
                                value={summary.passRate}
                                suffix="%"
                                prefix={<TrophyOutlined />}
                                valueStyle={{ color: summary.passRate >= 50 ? '#52c41a' : '#ff4d4f' }}
                            />
                        </Card>
                    </Col>
                </Row>
            )
        },
        {
            key: 'tests',
            label: `Тесты (${filteredAttempts.length})`,
            children: (
                <div>
                    <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end' }}>
                        <Button
                            icon={<DownloadOutlined />}
                            onClick={() => exportToCSV(filteredAttempts, 'test_results')}
                            disabled={!filteredAttempts.length}
                        >
                            Экспорт CSV
                        </Button>
                    </div>
                    <Table
                        dataSource={filteredAttempts}
                        columns={testColumns}
                        rowKey="id"
                        pagination={{ pageSize: 15, showSizeChanger: false }}
                        scroll={{ x: 600 }}
                        expandable={{
                            expandedRowRender,
                            rowExpandable: (r) => r.details?.length > 0
                        }}
                        locale={{ emptyText: <Empty description="Нет результатов за выбранный период" /> }}
                    />
                </div>
            )
        },
        {
            key: 'achievements',
            label: `Достижения (${filteredAchievements.length})`,
            children: (
                <div>
                    <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end' }}>
                        <Button
                            icon={<DownloadOutlined />}
                            onClick={() => exportToCSV(filteredAchievements, 'achievements')}
                            disabled={!filteredAchievements.length}
                        >
                            Экспорт CSV
                        </Button>
                    </div>
                    <Table
                        dataSource={filteredAchievements}
                        columns={achievementColumns}
                        rowKey="id"
                        pagination={{ pageSize: 20, showSizeChanger: false }}
                        locale={{ emptyText: <Empty description="Достижений за выбранный период нет" /> }}
                    />
                </div>
            )
        },
        {
            key: 'profiles',
            label: `Студенты (${students.length})`,
            children: (
                <div>
                    <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end' }}>
                        <Button
                            icon={<DownloadOutlined />}
                            onClick={() => exportToCSV(students, 'profiles')}
                            disabled={!students.length}
                        >
                            Экспорт CSV
                        </Button>
                    </div>
                    <Table
                        dataSource={students}
                        columns={profileColumns}
                        rowKey="id"
                        pagination={{ pageSize: 20, showSizeChanger: false }}
                        locale={{ emptyText: <Empty description="Нет зарегистрированных студентов" /> }}
                    />
                </div>
            )
        }
    ];

    return (
        <div>
            {/* Панель фильтрации */}
            <div style={{
                marginBottom: 24,
                display: 'flex',
                flexWrap: 'wrap',
                gap: 16,
                alignItems: 'center',
                justifyContent: 'space-between'
            }}>
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
                <Button
                    type="primary"
                    icon={<DownloadOutlined />}
                    onClick={() => {
                        if (filteredAttempts.length)  exportToCSV(filteredAttempts,     'test_results');
                        if (students.length)           exportToCSV(students,             'profiles');
                        if (filteredAchievements.length) exportToCSV(filteredAchievements, 'achievements');
                    }}
                    disabled={!hasData}
                >
                    Экспорт всего
                </Button>
            </div>

            {!hasData ? (
                <Empty description="Данных статистики пока нет" />
            ) : (
                <Tabs items={tabItems} />
            )}
        </div>
    );
}

export default StatisticsPanel;
