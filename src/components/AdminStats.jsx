/**
 * AdminStats — NIR Dashboard
 * - KPI cards: participants, sessions, delta, SUS
 * - Score dynamics T1/T2/T3
 * - Error analysis by sound category
 * - SUS + confidence
 * - XLSX export (sessions) + separate survey XLSX export
 */
import { useState, useEffect, useCallback } from 'react';
import {
    Card, Row, Col, Statistic, Table, Button, Select, DatePicker,
    Alert, Typography, Tag, Progress, Spin, Space, Divider, message,
} from 'antd';
import {
    DownloadOutlined, ReloadOutlined, TrophyOutlined,
    UserOutlined, FileTextOutlined, BarChartOutlined, FormOutlined,
} from '@ant-design/icons';
import { supabase } from '../services/supabase';
import * as XLSX from 'xlsx';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

/* ════════════════════════════════════════════════════════════════
   Helpers
   ════════════════════════════════════════════════════════════════ */
const mean = (arr) => arr.length ? (arr.reduce((a, b) => a + b, 0) / arr.length) : 0;
const round = (v, d = 1) => Math.round(v * 10 ** d) / 10 ** d;

function roleBadge(role) {
    const map = {
        student: ['blue', 'Студент'], resident: ['purple', 'Ординатор'],
        doctor: ['green', 'Врач'], teacher: ['orange', 'Преподаватель'],
    };
    const [color, label] = map[role] || ['default', role || '—'];
    return <Tag color={color}>{label}</Tag>;
}

/* ════════════════════════════════════════════════════════════════
   XLSX download via Blob (works reliably in all browsers)
   ════════════════════════════════════════════════════════════════ */
function downloadWorkbook(sheets, filename) {
    const wb = XLSX.utils.book_new();
    sheets.forEach(({ name, data }) => {
        // Excel sheet name: max 31 chars, no special chars
        const safeName = name.slice(0, 31).replace(/[:\\/?*[\]]/g, '_');
        const ws = XLSX.utils.json_to_sheet(data.length ? data : [{ '(нет данных)': '' }]);
        XLSX.utils.book_append_sheet(wb, ws, safeName);
    });
    // Write as ArrayBuffer → Blob → download
    const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/* ════════════════════════════════════════════════════════════════
   Survey export: expand responses JSONB into readable columns
   ════════════════════════════════════════════════════════════════ */
const SUS_KEYS = [1,2,3,4,5,6,7,8,9,10].map(i => `sus_${i}`);
const CONF_KEYS = ['c1','c2','c3','c4','c5'];

function buildSurveySheets(surveys) {
    const fmt = (s) => new Date(s.created_at).toLocaleString('ru');

    // --- SUS ---
    const susRows = surveys.filter(s => s.survey_type === 'sus').map(s => {
        const r = s.responses || {};
        const row = { 'User ID': s.user_id || '—', 'Дата': fmt(s), 'SUS балл': s.score ?? '—' };
        SUS_KEYS.forEach((k, i) => { row[`Вопрос ${i+1}`] = r[k] ?? '—'; });
        return row;
    });

    // --- Confidence pre ---
    const confPreRows = surveys.filter(s => s.survey_type === 'confidence_pre').map(s => {
        const r = s.responses || {};
        const vals = CONF_KEYS.map(k => Number(r[k]) || 0).filter(v => v > 0);
        const avg = vals.length ? round(mean(vals)) : '—';
        const row = { 'User ID': s.user_id || '—', 'Дата': fmt(s), 'Среднее (1-5)': avg };
        CONF_KEYS.forEach((k, i) => { row[`C${i+1}`] = r[k] ?? '—'; });
        return row;
    });

    // --- Confidence post ---
    const confPostRows = surveys.filter(s => s.survey_type === 'confidence_post').map(s => {
        const r = s.responses || {};
        const vals = CONF_KEYS.map(k => Number(r[k]) || 0).filter(v => v > 0);
        const avg = vals.length ? round(mean(vals)) : '—';
        const row = { 'User ID': s.user_id || '—', 'Дата': fmt(s), 'Среднее (1-5)': avg };
        CONF_KEYS.forEach((k, i) => { row[`C${i+1}`] = r[k] ?? '—'; });
        return row;
    });

    // --- Demographics ---
    const demoRows = surveys.filter(s => s.survey_type === 'demographics').map(s => {
        const r = s.responses || {};
        return {
            'User ID': s.user_id || '—',
            'Дата': fmt(s),
            'Возраст': r.age ?? '—',
            'Слух': r.hearing ?? '—',
            'Опыт аускультации': r.auscultation_exp ?? '—',
            'Цифровые тренажёры ранее': r.prior_digital ?? '—',
            'Устройство': r.device ?? '—',
        };
    });

    // --- Feedback ---
    const feedbackRows = surveys.filter(s => s.survey_type === 'feedback').map(s => {
        const r = s.responses || {};
        return {
            'User ID': s.user_id || '—',
            'Дата': fmt(s),
            'Что понравилось': r.likes ?? '—',
            'Что не понравилось': r.dislikes ?? '—',
            'Предложения': r.suggestions ?? '—',
            'Оценка ИИ': r.ai_quality ?? '—',
        };
    });

    return [
        { name: 'SUS', data: susRows },
        { name: 'Уверенность (до)', data: confPreRows },
        { name: 'Уверенность (после)', data: confPostRows },
        { name: 'Демография', data: demoRows },
        { name: 'Обратная связь', data: feedbackRows },
    ];
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

    /* ── load ────────────────────────────────────────────────── */
    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [sessRes, survRes, profRes] = await Promise.all([
                supabase.from('test_sessions').select('*').order('created_at', { ascending: false }),
                supabase.from('survey_responses').select('*').order('created_at', { ascending: false }),
                supabase.from('profiles').select('*'),
            ]);
            setSessions(sessRes.data || []);
            setSurveys(survRes.data || []);
            setProfiles(profRes.data || []);
        } catch (e) {
            message.error('Ошибка загрузки: ' + e.message);
        }
        setLoading(false);
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    /* ── filters & derived data ──────────────────────────────── */
    const filtered = dateRange
        ? sessions.filter(s => {
            const d = new Date(s.created_at);
            return d >= dateRange[0].toDate() && d <= dateRange[1].toDate();
        })
        : sessions;

    const byType = (type) => filtered.filter(s => s.session_type === type);
    const t1 = byType('T1'), t2 = byType('T2'), t3 = byType('T3');
    const t1Scores = t1.map(s => s.score).filter(v => v != null);
    const t2Scores = t2.map(s => s.score).filter(v => v != null);
    const t3Scores = t3.map(s => s.score).filter(v => v != null);
    const deltaT1T2 = round(mean(t2Scores) - mean(t1Scores));

    // Paired users (T1 + T2)
    const usersT1 = new Set(t1.map(s => s.user_id).filter(Boolean));
    const usersT2 = new Set(t2.map(s => s.user_id).filter(Boolean));
    const pairedUsers = [...usersT1].filter(u => usersT2.has(u));

    const userDeltas = pairedUsers.map(uid => {
        const u1 = t1.filter(s => s.user_id === uid);
        const u2 = t2.filter(s => s.user_id === uid);
        const profile = profiles.find(p => p.id === uid);
        return {
            user_id: uid,
            role: profile?.role,
            t1_score: round(mean(u1.map(s => s.score))),
            t2_score: round(mean(u2.map(s => s.score))),
            delta: round(mean(u2.map(s => s.score)) - mean(u1.map(s => s.score))),
        };
    }).sort((a, b) => b.delta - a.delta);

    // Error analysis — field is is_correct (not correct)
    const errorMap = {};
    filtered.forEach(s => {
        (s.answers || []).forEach(a => {
            const isWrong = a.is_correct === false || a.is_correct === 0 || a.correct === false;
            if (isWrong) {
                const key = a.sound_name || a.category || s.category || 'unknown';
                errorMap[key] = (errorMap[key] || 0) + 1;
            }
        });
    });
    const errorData = Object.entries(errorMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20)
        .map(([name, count]) => ({ name, count }));

    // SUS
    const susResponses = surveys.filter(s => s.survey_type === 'sus' && s.score != null);
    const susScores = susResponses.map(s => Number(s.score));
    const avgSUS = round(mean(susScores));
    const sus68 = susScores.filter(s => s >= 68).length;

    // Confidence delta
    const confPre = surveys.filter(s => s.survey_type === 'confidence_pre');
    const confPost = surveys.filter(s => s.survey_type === 'confidence_post');
    const getConfAvg = (rows) => mean(rows.map(s => {
        const vals = CONF_KEYS.map(k => Number((s.responses || {})[k])).filter(v => !isNaN(v) && v > 0);
        return vals.length ? mean(vals) : null;
    }).filter(v => v !== null));
    const avgConfPre = round(getConfAvg(confPre));
    const avgConfPost = round(getConfAvg(confPost));

    // Participants by role
    const byRole = profiles.reduce((acc, p) => {
        acc[p.role || 'unknown'] = (acc[p.role || 'unknown'] || 0) + 1;
        return acc;
    }, {});

    /* ── exports ─────────────────────────────────────────────── */
    const handleExportSessions = () => {
        const sheets = [
            {
                name: 'Сводка НИР',
                data: [
                    { Показатель: 'Всего участников', Значение: profiles.length },
                    { Показатель: 'Сессий T1', Значение: t1.length },
                    { Показатель: 'Сессий T2', Значение: t2.length },
                    { Показатель: 'Сессий T3', Значение: t3.length },
                    { Показатель: 'Средний балл T1 (%)', Значение: round(mean(t1Scores)) || 0 },
                    { Показатель: 'Средний балл T2 (%)', Значение: round(mean(t2Scores)) || 0 },
                    { Показатель: 'Дельта T1-T2 (пп)', Значение: deltaT1T2 },
                    { Показатель: 'Участников с T1 и T2', Значение: pairedUsers.length },
                    { Показатель: 'Средний SUS', Значение: avgSUS || 0 },
                    { Показатель: 'SUS >= 68 (%)', Значение: susScores.length ? round((sus68 / susScores.length) * 100) : 0 },
                    { Показатель: 'Уверенность до (1-5)', Значение: avgConfPre || 0 },
                    { Показатель: 'Уверенность после (1-5)', Значение: avgConfPost || 0 },
                ],
            },
            {
                name: 'Дельта по участникам',
                data: userDeltas.map(u => ({
                    'ID пользователя': u.user_id,
                    'Роль': u.role || '—',
                    'T1 (%)': u.t1_score,
                    'T2 (%)': u.t2_score,
                    'Дельта (пп)': u.delta,
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
                    'Дата': new Date(s.created_at).toLocaleString('ru'),
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
                name: 'Участники',
                data: profiles.map(p => ({
                    'ID': p.id,
                    'ФИО': p.full_name || '—',
                    'Роль': p.role || '—',
                    'Курс': p.year_of_study || '—',
                    'Учреждение': p.institution || '—',
                    'Дата регистрации': new Date(p.created_at).toLocaleString('ru'),
                })),
            },
        ];
        downloadWorkbook(sheets, `NIR_Sessii_${new Date().toISOString().slice(0, 10)}.xlsx`);
        message.success('Файл сессий скачивается');
    };

    const handleExportSurveys = () => {
        const sheets = buildSurveySheets(surveys);
        downloadWorkbook(sheets, `NIR_Oprosniki_${new Date().toISOString().slice(0, 10)}.xlsx`);
        message.success('Файл опросников скачивается');
    };

    /* ── table columns ───────────────────────────────────────── */
    const deltaColumns = [
        { title: 'Роль', dataIndex: 'role', render: roleBadge, width: 130 },
        { title: 'T1 (%)', dataIndex: 't1_score', sorter: (a, b) => a.t1_score - b.t1_score },
        { title: 'T2 (%)', dataIndex: 't2_score', sorter: (a, b) => a.t2_score - b.t2_score },
        {
            title: 'Дельта (пп)',
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
                    <Button type="primary" icon={<DownloadOutlined />} onClick={handleExportSessions}>
                        Сессии XLSX
                    </Button>
                    <Button icon={<FormOutlined />} onClick={handleExportSurveys}>
                        Опросники XLSX
                    </Button>
                </Space>
            </div>

            {/* Empty state */}
            {sessions.length === 0 && profiles.length === 0 && (
                <Alert
                    type="info"
                    showIcon
                    message="Данных пока нет"
                    description="После того как участники пройдут тесты и заполнят анкеты, здесь появится статистика."
                    style={{ marginBottom: 16 }}
                />
            )}

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
                            title="Дельта T1→T2"
                            value={pairedUsers.length ? deltaT1T2 : '—'}
                            suffix={pairedUsers.length ? 'пп' : ''}
                            valueStyle={{ color: deltaT1T2 >= 20 ? '#52c41a' : deltaT1T2 >= 0 ? '#1890ff' : '#ff4d4f' }}
                        />
                        <Text type="secondary" style={{ fontSize: 11 }}>Цель: ≥ 20 пп</Text>
                    </Card>
                </Col>
                <Col xs={12} sm={6}>
                    <Card>
                        <Statistic
                            title="Средний SUS"
                            value={susScores.length ? avgSUS : '—'}
                            suffix={susScores.length ? '/ 100' : ''}
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
                            { label: 'T1 (входное)', scores: t1Scores, color: '#1890ff' },
                            { label: 'T2 (+7 дней)', scores: t2Scores, color: '#52c41a' },
                            { label: 'T3 (отсроченное)', scores: t3Scores, color: '#722ed1' },
                        ].map(row => (
                            <div key={row.label} style={{ marginBottom: 12 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                    <Text>{row.label}</Text>
                                    <Text strong>
                                        {row.scores.length ? `${round(mean(row.scores))}%` : '—'}
                                        <Text type="secondary" style={{ fontSize: 11, marginLeft: 4 }}>
                                            (n={row.scores.length})
                                        </Text>
                                    </Text>
                                </div>
                                <Progress
                                    percent={row.scores.length ? round(mean(row.scores)) : 0}
                                    strokeColor={row.color}
                                    trailColor="#f0f0f0"
                                    showInfo={false}
                                />
                            </div>
                        ))}
                        <Divider style={{ margin: '8px 0' }} />
                        <Row>
                            <Col span={12}>
                                <Statistic title="Парных (T1+T2)" value={pairedUsers.length} />
                            </Col>
                            <Col span={12}>
                                <Statistic
                                    title="Дельта средняя"
                                    value={pairedUsers.length ? deltaT1T2 : '—'}
                                    suffix={pairedUsers.length ? 'пп' : ''}
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
                                <Statistic title="Средний SUS" value={susScores.length ? avgSUS : '—'} />
                                <Statistic
                                    title="SUS >= 68"
                                    value={susScores.length ? `${round((sus68 / susScores.length) * 100)}%` : '—'}
                                    valueStyle={{ color: sus68 / (susScores.length || 1) >= 0.5 ? '#52c41a' : '#faad14' }}
                                />
                            </div>
                            {susScores.length > 0 && (
                                <Progress
                                    percent={avgSUS}
                                    strokeColor={avgSUS >= 85 ? '#52c41a' : avgSUS >= 68 ? '#1890ff' : '#faad14'}
                                    showInfo={false}
                                    style={{ marginTop: 8 }}
                                />
                            )}
                        </div>
                        <Divider style={{ margin: '8px 0' }} />
                        <Text strong>Самооценка уверенности (1–5)</Text>
                        <Row gutter={16} style={{ marginTop: 8 }}>
                            <Col span={12}>
                                <Statistic title="До обучения" value={confPre.length ? avgConfPre : '—'}
                                    suffix={confPre.length ? '/ 5' : ''} />
                            </Col>
                            <Col span={12}>
                                <Statistic title="После обучения" value={confPost.length ? avgConfPost : '—'}
                                    suffix={confPost.length ? '/ 5' : ''}
                                    valueStyle={{ color: avgConfPost > avgConfPre ? '#52c41a' : undefined }} />
                            </Col>
                        </Row>
                    </Card>
                </Col>
            </Row>

            <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
                {/* Delta per user */}
                <Col xs={24} lg={14}>
                    <Card title={`Дельта T1→T2 по участникам (n=${userDeltas.length})`}>
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
                    <Card title="Анализ ошибок (топ-20)">
                        {errorData.length === 0 ? (
                            <Alert type="info" message="Нет данных об ошибках" showIcon />
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

            <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
                {/* Participants by role */}
                <Col xs={24} md={12}>
                    <Card title="Состав участников">
                        {profiles.length === 0 ? (
                            <Alert type="info" message="Нет зарегистрированных участников" showIcon />
                        ) : (
                            Object.entries(byRole).map(([role, count]) => (
                                <div key={role} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                    {roleBadge(role)}
                                    <Text strong>{count}</Text>
                                </div>
                            ))
                        )}
                    </Card>
                </Col>

                {/* KPI summary */}
                <Col xs={24} md={12}>
                    <Card title="Сводка КПЭ НИР">
                        {[
                            {
                                kpi: 'Участники (цель ≥ 400)',
                                fact: `${profiles.length} / 400`,
                                ok: profiles.length >= 400,
                            },
                            {
                                kpi: 'Дельта T1→T2 (цель ≥ 20 пп)',
                                fact: pairedUsers.length ? `${deltaT1T2} пп` : '—',
                                ok: pairedUsers.length > 0 && deltaT1T2 >= 20,
                            },
                            {
                                kpi: 'SUS >= 68 (% участников)',
                                fact: susScores.length ? `${round((sus68 / susScores.length) * 100)}%` : '—',
                                ok: susScores.length > 0 && (sus68 / susScores.length) >= 0.5,
                            },
                            {
                                kpi: 'Анкет SUS заполнено',
                                fact: String(susScores.length),
                                ok: null,
                            },
                            {
                                kpi: 'Анкет демографии',
                                fact: String(surveys.filter(s => s.survey_type === 'demographics').length),
                                ok: null,
                            },
                        ].map(row => (
                            <div key={row.kpi} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, alignItems: 'center' }}>
                                <Text style={{ fontSize: 12 }}>{row.kpi}</Text>
                                <Tag color={row.ok === true ? 'green' : row.ok === false ? 'red' : 'blue'}>
                                    {row.fact}
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
