/**
 * AdminStats — NRI Dashboard
 * Covers:
 *   - Total sessions, participants by role
 *   - T1/T2/T3 score comparison (ΔДоля)
 *   - Error analysis by sound category
 *   - SUS score distribution
 *   - Confidence pre/post
 *   - Export to XLSX
 */
import { useState, useEffect, useCallback } from 'react';
import {
    Card, Row, Col, Statistic, Table, Button, Select, DatePicker,
    Alert, Typography, Tag, Progress, Spin, Space, Divider, message,
} from 'antd';
import {
    DownloadOutlined, ReloadOutlined, TrophyOutlined,
    UserOutlined, FileTextOutlined, BarChartOutlined,
} from '@ant-design/icons';
import { supabase } from '../services/supabase';
import * as XLSX from 'xlsx';

const { Title, Text, Paragraph } = Typography;
const { RangePicker } = DatePicker;

/* ════════════════════════════════════════════════════════════════
   Helpers
   ════════════════════════════════════════════════════════════════ */
const mean = (arr) => arr.length ? (arr.reduce((a, b) => a + b, 0) / arr.length) : 0;
const round = (v, d = 1) => Math.round(v * 10 ** d) / 10 ** d;

function roleBadge(role) {
    const map = { student: ['blue', 'Студент'], resident: ['purple', 'Ординатор'],
                  doctor: ['green', 'Врач'], teacher: ['orange', 'Преподаватель'] };
    const [color, label] = map[role] || ['default', role || '—'];
    return <Tag color={color}>{label}</Tag>;
}

/* ════════════════════════════════════════════════════════════════
   XLSX export helpers
   ════════════════════════════════════════════════════════════════ */
function exportWorkbook(sheets) {
    const wb = XLSX.utils.book_new();
    sheets.forEach(({ name, data }) => {
        const ws = XLSX.utils.json_to_sheet(data);
        XLSX.utils.book_append_sheet(wb, ws, name);
    });
    XLSX.writeFile(wb, `NIR_Stats_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

/* ════════════════════════════════════════════════════════════════
   Main Component
   ════════════════════════════════════════════════════════════════ */
function AdminStats() {
    const [loading, setLoading] = useState(false);
    const [sessions, setSessions] = useState([]);
    const [surveys, setSurveys] = useState([]);
    const [profiles, setProfiles] = useState([]);
    const [dateRange, setDateRange] = useState(null);

    /* ── load data ──────────────────────────────────────────────── */
    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [sessRes, survRes, profRes] = await Promise.all([
                supabase.from('test_sessions').select('*').order('completed_at', { ascending: false }),
                supabase.from('survey_responses').select('*').order('created_at', { ascending: false }),
                supabase.from('profiles').select('*'),
            ]);
            setSessions(sessRes.data || []);
            setSurveys(survRes.data || []);
            setProfiles(profRes.data || []);
        } catch (e) {
            message.error('Ошибка загрузки данных: ' + e.message);
        }
        setLoading(false);
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    /* ── filtered data ─────────────────────────────────────────── */
    const filtered = dateRange
        ? sessions.filter(s => {
            const d = new Date(s.completed_at);
            return d >= dateRange[0].toDate() && d <= dateRange[1].toDate();
        })
        : sessions;

    /* ── aggregated stats ──────────────────────────────────────── */
    const byType = (type) => filtered.filter(s => s.session_type === type);
    const t1 = byType('T1'), t2 = byType('T2'), t3 = byType('T3');
    const t1Scores = t1.map(s => s.score).filter(Boolean);
    const t2Scores = t2.map(s => s.score).filter(Boolean);
    const t3Scores = t3.map(s => s.score).filter(Boolean);
    const deltaT1T2 = round(mean(t2Scores) - mean(t1Scores));

    // Users with both T1 and T2
    const usersT1 = new Set(t1.map(s => s.user_id).filter(Boolean));
    const usersT2 = new Set(t2.map(s => s.user_id).filter(Boolean));
    const pairedUsers = [...usersT1].filter(u => usersT2.has(u));

    // Per-user delta
    const userDeltas = pairedUsers.map(uid => {
        const u1 = t1.filter(s => s.user_id === uid);
        const u2 = t2.filter(s => s.user_id === uid);
        const sc1 = mean(u1.map(s => s.score));
        const sc2 = mean(u2.map(s => s.score));
        const profile = profiles.find(p => p.id === uid);
        return {
            user_id: uid,
            role: profile?.role,
            t1_score: round(sc1),
            t2_score: round(sc2),
            delta: round(sc2 - sc1),
        };
    }).sort((a, b) => b.delta - a.delta);

    // Error analysis: which answer categories have most errors
    const errorMap = {};
    filtered.forEach(s => {
        (s.answers || []).forEach(a => {
            if (!a.correct) {
                const cat = a.category || s.category || 'unknown';
                const key = a.sound_name || cat;
                errorMap[key] = (errorMap[key] || 0) + 1;
            }
        });
    });
    const errorData = Object.entries(errorMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20)
        .map(([name, count]) => ({ name, count }));

    // SUS scores
    const susResponses = surveys.filter(s => s.survey_type === 'sus' && s.score != null);
    const susScores = susResponses.map(s => Number(s.score));
    const avgSUS = round(mean(susScores));
    const sus68 = susScores.filter(s => s >= 68).length;

    // Confidence delta
    const confPre = surveys.filter(s => s.survey_type === 'confidence_pre');
    const confPost = surveys.filter(s => s.survey_type === 'confidence_post');
    const avgConfPre = round(mean(confPre.map(s => {
        const vals = Object.values(s.responses || {}).map(Number).filter(v => !isNaN(v));
        return vals.length ? mean(vals) : 0;
    })));
    const avgConfPost = round(mean(confPost.map(s => {
        const vals = Object.values(s.responses || {}).map(Number).filter(v => !isNaN(v));
        return vals.length ? mean(vals) : 0;
    })));

    // Profile breakdown
    const byRole = profiles.reduce((acc, p) => {
        acc[p.role || 'unknown'] = (acc[p.role || 'unknown'] || 0) + 1;
        return acc;
    }, {});

    /* ── export ────────────────────────────────────────────────── */
    const handleExport = () => {
        const sheets = [
            {
                name: 'Сводка',
                data: [
                    { Показатель: 'Всего участников', Значение: profiles.length },
                    { Показатель: 'Сессий T1', Значение: t1.length },
                    { Показатель: 'Сессий T2', Значение: t2.length },
                    { Показатель: 'Сессий T3', Значение: t3.length },
                    { Показатель: 'Средний балл T1 (%)', Значение: round(mean(t1Scores)) },
                    { Показатель: 'Средний балл T2 (%)', Значение: round(mean(t2Scores)) },
                    { Показатель: 'ΔДоля T1→T2 (п.п.)', Значение: deltaT1T2 },
                    { Показатель: 'Участников с T1 и T2', Значение: pairedUsers.length },
                    { Показатель: 'Средний SUS', Значение: avgSUS },
                    { Показатель: 'SUS ≥ 68 (%)', Значение: susScores.length ? round((sus68 / susScores.length) * 100) : 0 },
                    { Показатель: 'Средняя уверенность до (1-5)', Значение: avgConfPre },
                    { Показатель: 'Средняя уверенность после (1-5)', Значение: avgConfPost },
                ],
            },
            {
                name: 'ΔДоля по участникам',
                data: userDeltas.map(u => ({
                    'ID пользователя': u.user_id,
                    'Роль': u.role || '—',
                    'T1 (%)': u.t1_score,
                    'T2 (%)': u.t2_score,
                    'Δ (п.п.)': u.delta,
                })),
            },
            {
                name: 'Все сессии',
                data: sessions.map(s => ({
                    'ID': s.id,
                    'User ID': s.user_id || '—',
                    'Тип': s.session_type,
                    'Категория': s.category || '—',
                    'Балл (%)': s.score,
                    'Правильных': s.correct_q,
                    'Всего вопросов': s.total_q,
                    'Время (сек)': s.duration_sec,
                    'Дата': new Date(s.completed_at).toLocaleString('ru'),
                })),
            },
            {
                name: 'Анализ ошибок',
                data: errorData.map(e => ({
                    'Звук / категория': e.name,
                    'Число ошибок': e.count,
                })),
            },
            {
                name: 'SUS',
                data: susResponses.map(s => ({
                    'User ID': s.user_id || '—',
                    'SUS балл': s.score,
                    'Дата': new Date(s.created_at).toLocaleString('ru'),
                })),
            },
            {
                name: 'Анкеты (все)',
                data: surveys.map(s => ({
                    'ID': s.id,
                    'User ID': s.user_id || '—',
                    'Тип анкеты': s.survey_type,
                    'Балл': s.score || '—',
                    'Дата': new Date(s.created_at).toLocaleString('ru'),
                    'Ответы (JSON)': JSON.stringify(s.responses),
                })),
            },
            {
                name: 'Участники',
                data: profiles.map(p => ({
                    'ID': p.id,
                    'ФИО': p.full_name || '—',
                    'Роль': p.role || '—',
                    'Курс': p.year_of_study || '—',
                    'Учреждение': p.institution || '—',
                    'Специальность': p.specialty || '—',
                    'Дата регистрации': new Date(p.created_at).toLocaleString('ru'),
                })),
            },
        ];
        exportWorkbook(sheets);
        message.success('XLSX-файл скачивается');
    };

    /* ── columns for tables ────────────────────────────────────── */
    const deltaColumns = [
        { title: 'Роль', dataIndex: 'role', render: roleBadge, width: 120 },
        { title: 'T1 (%)', dataIndex: 't1_score', sorter: (a, b) => a.t1_score - b.t1_score },
        { title: 'T2 (%)', dataIndex: 't2_score', sorter: (a, b) => a.t2_score - b.t2_score },
        {
            title: 'Δ (п.п.)',
            dataIndex: 'delta',
            sorter: (a, b) => a.delta - b.delta,
            defaultSortOrder: 'descend',
            render: (v) => (
                <Tag color={v >= 20 ? 'green' : v >= 0 ? 'blue' : 'red'}>
                    {v > 0 ? '+' : ''}{v}
                </Tag>
            ),
        },
    ];

    const errorColumns = [
        { title: 'Звук / категория', dataIndex: 'name', ellipsis: true },
        {
            title: 'Ошибок',
            dataIndex: 'count',
            sorter: (a, b) => a.count - b.count,
            defaultSortOrder: 'descend',
            render: (v) => <Tag color={v > 10 ? 'red' : v > 5 ? 'orange' : 'default'}>{v}</Tag>,
        },
    ];

    if (loading) return <div style={{ padding: 48, textAlign: 'center' }}><Spin size="large" /></div>;

    return (
        <div style={{ padding: '0 0 32px' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
                <Title level={4} style={{ margin: 0 }}>
                    <BarChartOutlined /> Дашборд НИР
                </Title>
                <Space wrap>
                    <RangePicker onChange={setDateRange} format="DD.MM.YYYY" placeholder={['Начало', 'Конец']} />
                    <Button icon={<ReloadOutlined />} onClick={loadData}>Обновить</Button>
                    <Button type="primary" icon={<DownloadOutlined />} onClick={handleExport}>
                        Скачать XLSX
                    </Button>
                </Space>
            </div>

            {/* KPI Cards */}
            <Row gutter={[16, 16]}>
                <Col xs={12} sm={6}>
                    <Card><Statistic title="Участников" value={profiles.length} prefix={<UserOutlined />} /></Card>
                </Col>
                <Col xs={12} sm={6}>
                    <Card><Statistic title="Сессий (всего)" value={filtered.length} prefix={<FileTextOutlined />} /></Card>
                </Col>
                <Col xs={12} sm={6}>
                    <Card>
                        <Statistic
                            title="ΔДоля T1→T2"
                            value={deltaT1T2}
                            suffix="п.п."
                            valueStyle={{ color: deltaT1T2 >= 20 ? '#52c41a' : deltaT1T2 >= 0 ? '#1890ff' : '#ff4d4f' }}
                        />
                        <Text type="secondary" style={{ fontSize: 11 }}>Цель НИР: ≥ 20 п.п.</Text>
                    </Card>
                </Col>
                <Col xs={12} sm={6}>
                    <Card>
                        <Statistic
                            title="Средний SUS"
                            value={avgSUS || '—'}
                            suffix={avgSUS ? '/ 100' : ''}
                            valueStyle={{ color: avgSUS >= 68 ? '#52c41a' : '#faad14' }}
                        />
                        <Text type="secondary" style={{ fontSize: 11 }}>Цель: SUS ≥ 68</Text>
                    </Card>
                </Col>
            </Row>

            <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
                {/* Score dynamics */}
                <Col xs={24} md={12}>
                    <Card title="Динамика тестирования">
                        {[
                            { label: 'T1 (входное)', scores: t1Scores, color: '#1890ff', target: null },
                            { label: 'T2 (+7 дней)', scores: t2Scores, color: '#52c41a', target: null },
                            { label: 'T3 (отсроченное)', scores: t3Scores, color: '#722ed1', target: null },
                        ].map(row => (
                            <div key={row.label} style={{ marginBottom: 12 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                    <Text>{row.label}</Text>
                                    <Text strong>{round(mean(row.scores)) || '—'}%
                                        <Text type="secondary" style={{ fontSize: 11, marginLeft: 4 }}>
                                            (n={row.scores.length})
                                        </Text>
                                    </Text>
                                </div>
                                <Progress
                                    percent={round(mean(row.scores)) || 0}
                                    strokeColor={row.color}
                                    trailColor="#f0f0f0"
                                    showInfo={false}
                                />
                            </div>
                        ))}
                        <Divider style={{ margin: '8px 0' }} />
                        <Row>
                            <Col span={12}>
                                <Statistic title="Парных участников (T1+T2)" value={pairedUsers.length} />
                            </Col>
                            <Col span={12}>
                                <Statistic
                                    title="Δ средний"
                                    value={deltaT1T2}
                                    suffix="п.п."
                                    valueStyle={{ color: deltaT1T2 >= 20 ? '#52c41a' : '#faad14' }}
                                />
                            </Col>
                        </Row>
                    </Card>
                </Col>

                {/* SUS + Confidence */}
                <Col xs={24} md={12}>
                    <Card title="Удовлетворённость и уверенность">
                        <div style={{ marginBottom: 16 }}>
                            <Text strong>SUS (n={susScores.length})</Text>
                            <div style={{ display: 'flex', gap: 12, marginTop: 8, flexWrap: 'wrap' }}>
                                <Statistic title="Средний SUS" value={avgSUS || '—'} />
                                <Statistic
                                    title="SUS ≥ 68"
                                    value={susScores.length ? `${round((sus68 / susScores.length) * 100)}%` : '—'}
                                    valueStyle={{ color: (sus68 / susScores.length) >= 0.5 ? '#52c41a' : '#faad14' }}
                                />
                            </div>
                            <Progress
                                percent={avgSUS}
                                strokeColor={avgSUS >= 85 ? '#52c41a' : avgSUS >= 68 ? '#1890ff' : '#faad14'}
                                showInfo={false}
                                style={{ marginTop: 8 }}
                            />
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                                {[52, 68, 85, 100].map(v => (
                                    <Text key={v} type="secondary" style={{ fontSize: 10 }}>{v}</Text>
                                ))}
                            </div>
                        </div>
                        <Divider style={{ margin: '8px 0' }} />
                        <Text strong>Самооценка уверенности (1–5)</Text>
                        <Row gutter={16} style={{ marginTop: 8 }}>
                            <Col span={12}>
                                <Statistic title="До обучения" value={avgConfPre || '—'}
                                    suffix={avgConfPre ? '/ 5' : ''} />
                            </Col>
                            <Col span={12}>
                                <Statistic title="После обучения" value={avgConfPost || '—'}
                                    suffix={avgConfPost ? '/ 5' : ''}
                                    valueStyle={{ color: avgConfPost > avgConfPre ? '#52c41a' : undefined }} />
                            </Col>
                        </Row>
                    </Card>
                </Col>
            </Row>

            <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
                {/* Delta per user */}
                <Col xs={24} lg={14}>
                    <Card title={`ΔДоля T1→T2 по участникам (n=${userDeltas.length})`}>
                        {userDeltas.length === 0 ? (
                            <Alert type="info" message="Нет участников с завершёнными T1 и T2" showIcon />
                        ) : (
                            <Table
                                dataSource={userDeltas}
                                columns={deltaColumns}
                                rowKey="user_id"
                                size="small"
                                pagination={{ pageSize: 10 }}
                                scroll={{ x: true }}
                            />
                        )}
                    </Card>
                </Col>

                {/* Error analysis */}
                <Col xs={24} lg={10}>
                    <Card title="Анализ ошибок (топ-20 звуков)">
                        {errorData.length === 0 ? (
                            <Alert type="info" message="Недостаточно данных для анализа ошибок" showIcon />
                        ) : (
                            <Table
                                dataSource={errorData}
                                columns={errorColumns}
                                rowKey="name"
                                size="small"
                                pagination={{ pageSize: 10 }}
                                scroll={{ x: true }}
                            />
                        )}
                    </Card>
                </Col>
            </Row>

            {/* Participants breakdown */}
            <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
                <Col xs={24} md={12}>
                    <Card title="Состав участников по роли">
                        {Object.entries(byRole).map(([role, count]) => (
                            <div key={role} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                {roleBadge(role)}
                                <Text strong>{count}</Text>
                            </div>
                        ))}
                        {profiles.length === 0 && <Alert type="info" message="Нет зарегистрированных участников" showIcon />}
                    </Card>
                </Col>
                <Col xs={24} md={12}>
                    <Card title="Сводка НИР (KPI vs факт)">
                        {[
                            { kpi: 'Участники (цель ≥ 400)', fact: profiles.length, target: 400 },
                            { kpi: 'ΔДоля T1→T2 (цель ≥ 20 п.п.)', fact: `${deltaT1T2} п.п.`, target: null, ok: deltaT1T2 >= 20 },
                            { kpi: 'SUS ≥ 68 (% участников)', fact: susScores.length ? `${round((sus68 / susScores.length) * 100)}%` : '—', target: null, ok: (sus68 / susScores.length) >= 0.5 },
                            { kpi: 'Анкет SUS заполнено', fact: susScores.length, target: null },
                        ].map(row => (
                            <div key={row.kpi} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                <Text style={{ fontSize: 12 }}>{row.kpi}</Text>
                                <Tag color={row.ok === true ? 'green' : row.ok === false ? 'red' : 'blue'}>
                                    {typeof row.fact === 'number' && row.target
                                        ? `${row.fact} / ${row.target}`
                                        : row.fact}
                                </Tag>
                            </div>
                        ))}
                    </Card>
                </Col>
            </Row>
        </div>
    );
}

export default AdminStats;
