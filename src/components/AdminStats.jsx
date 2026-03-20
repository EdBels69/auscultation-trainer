/**
 * AdminStats — NIR Dashboard
 * - Configurable research periods (admin defines date ranges)
 * - Auto-assigns test sessions to periods by date
 * - KPI cards, score dynamics, error analysis, SUS + confidence
 * - XLSX export
 */
import { useState, useEffect, useCallback } from 'react';
import {
    Card, Row, Col, Statistic, Table, Button, Select, DatePicker,
    Alert, Typography, Tag, Progress, Spin, Space, Divider, message,
    Input, Modal, Popconfirm, Empty, Tooltip,
} from 'antd';
import {
    DownloadOutlined, ReloadOutlined, TrophyOutlined,
    UserOutlined, FileTextOutlined, BarChartOutlined, FormOutlined,
    PlusOutlined, DeleteOutlined, EditOutlined, CalendarOutlined,
    SettingOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
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
   Research Periods — stored in Supabase (research_periods table)
   with localStorage fallback
   ════════════════════════════════════════════════════════════════ */
const STORAGE_KEY = 'nir_research_periods';
const DEFAULT_PERIODS = [
    { id: '1', name: 'T1 — Входное тестирование', color: '#1890ff', startDate: null, endDate: null },
    { id: '2', name: 'T2 — После обучения', color: '#52c41a', startDate: null, endDate: null },
    { id: '3', name: 'T3 — Отсроченный контроль', color: '#722ed1', startDate: null, endDate: null },
];

function loadPeriods() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_PERIODS;
}

function savePeriods(periods) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(periods));
}

/** Assign a session to a period by its completed_at date */
function assignPeriod(sessionDate, periods) {
    const d = new Date(sessionDate);
    for (const p of periods) {
        if (!p.startDate || !p.endDate) continue;
        const start = new Date(p.startDate);
        const end = new Date(p.endDate);
        end.setHours(23, 59, 59, 999);
        if (d >= start && d <= end) return p;
    }
    return null;
}

/* ════════════════════════════════════════════════════════════════
   XLSX download
   ════════════════════════════════════════════════════════════════ */
function downloadWorkbook(sheets, filename) {
    const wb = XLSX.utils.book_new();
    sheets.forEach(({ name, data }) => {
        const safeName = name.slice(0, 31).replace(/[:\\/?*[\]]/g, '_');
        const ws = XLSX.utils.json_to_sheet(data.length ? data : [{ '(нет данных)': '' }]);
        XLSX.utils.book_append_sheet(wb, ws, safeName);
    });
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
   Survey export
   ════════════════════════════════════════════════════════════════ */
const SUS_KEYS = [1,2,3,4,5,6,7,8,9,10].map(i => `sus_${i}`);
const CONF_KEYS = ['c1','c2','c3','c4','c5'];

function buildSurveySheets(surveys) {
    const fmt = (s) => new Date(s.created_at).toLocaleString('ru');
    const susRows = surveys.filter(s => s.survey_type === 'sus').map(s => {
        const r = s.responses || {};
        const row = { 'User ID': s.user_id || '—', 'Дата': fmt(s), 'SUS балл': s.score ?? '—' };
        SUS_KEYS.forEach((k, i) => { row[`Вопрос ${i+1}`] = r[k] ?? '—'; });
        return row;
    });
    const confPreRows = surveys.filter(s => s.survey_type === 'confidence_pre').map(s => {
        const r = s.responses || {};
        const vals = CONF_KEYS.map(k => Number(r[k]) || 0).filter(v => v > 0);
        const avg = vals.length ? round(mean(vals)) : '—';
        const row = { 'User ID': s.user_id || '—', 'Дата': fmt(s), 'Среднее (1-5)': avg };
        CONF_KEYS.forEach((k, i) => { row[`C${i+1}`] = r[k] ?? '—'; });
        return row;
    });
    const confPostRows = surveys.filter(s => s.survey_type === 'confidence_post').map(s => {
        const r = s.responses || {};
        const vals = CONF_KEYS.map(k => Number(r[k]) || 0).filter(v => v > 0);
        const avg = vals.length ? round(mean(vals)) : '—';
        const row = { 'User ID': s.user_id || '—', 'Дата': fmt(s), 'Среднее (1-5)': avg };
        CONF_KEYS.forEach((k, i) => { row[`C${i+1}`] = r[k] ?? '—'; });
        return row;
    });
    const demoRows = surveys.filter(s => s.survey_type === 'demographics').map(s => {
        const r = s.responses || {};
        return {
            'User ID': s.user_id || '—', 'Дата': fmt(s),
            'Возраст': r.age ?? '—', 'Слух': r.hearing ?? '—',
            'Опыт аускультации': r.auscultation_exp ?? '—',
            'Цифровые тренажёры ранее': r.prior_digital ?? '—',
            'Устройство': r.device ?? '—',
        };
    });
    const feedbackRows = surveys.filter(s => s.survey_type === 'feedback').map(s => {
        const r = s.responses || {};
        return {
            'User ID': s.user_id || '—', 'Дата': fmt(s),
            'Что понравилось': r.likes ?? '—', 'Что не понравилось': r.dislikes ?? '—',
            'Предложения': r.suggestions ?? '—', 'Оценка ИИ': r.ai_quality ?? '—',
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
   Period Manager Component
   ════════════════════════════════════════════════════════════════ */
function PeriodManager({ periods, onChange }) {
    const [editModal, setEditModal] = useState(null); // null or period object
    const [editName, setEditName] = useState('');
    const [editDates, setEditDates] = useState(null);

    const addPeriod = () => {
        const newPeriod = {
            id: String(Date.now()),
            name: `Период ${periods.length + 1}`,
            color: ['#1890ff', '#52c41a', '#722ed1', '#fa8c16', '#eb2f96', '#13c2c2'][periods.length % 6],
            startDate: null,
            endDate: null,
        };
        onChange([...periods, newPeriod]);
    };

    const removePeriod = (id) => {
        onChange(periods.filter(p => p.id !== id));
    };

    const openEdit = (period) => {
        setEditModal(period);
        setEditName(period.name);
        setEditDates(period.startDate && period.endDate
            ? [dayjs(period.startDate), dayjs(period.endDate)]
            : null);
    };

    const saveEdit = () => {
        onChange(periods.map(p => p.id === editModal.id ? {
            ...p,
            name: editName,
            startDate: editDates?.[0]?.toISOString() || null,
            endDate: editDates?.[1]?.toISOString() || null,
        } : p));
        setEditModal(null);
    };

    const fmtDate = (d) => d ? new Date(d).toLocaleDateString('ru') : '—';

    return (
        <Card
            title={<><CalendarOutlined /> Периоды исследования</>}
            size="small"
            extra={<Button size="small" icon={<PlusOutlined />} onClick={addPeriod}>Добавить</Button>}
        >
            {periods.length === 0 && (
                <Empty description="Нет периодов. Добавьте период, чтобы распределить сессии по этапам." image={Empty.PRESENTED_IMAGE_SIMPLE} />
            )}
            {periods.map((p, i) => (
                <div key={p.id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '8px 0', borderBottom: i < periods.length - 1 ? '1px solid #f0f0f0' : 'none',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 12, height: 12, borderRadius: 2, background: p.color, flexShrink: 0 }} />
                        <div>
                            <Text strong style={{ display: 'block' }}>{p.name}</Text>
                            <Text type="secondary" style={{ fontSize: 11 }}>
                                {p.startDate ? `${fmtDate(p.startDate)} — ${fmtDate(p.endDate)}` : 'Даты не заданы'}
                            </Text>
                        </div>
                    </div>
                    <Space size={4}>
                        <Button size="small" type="text" icon={<EditOutlined />} onClick={() => openEdit(p)} />
                        <Popconfirm title="Удалить период?" onConfirm={() => removePeriod(p.id)} okText="Да" cancelText="Нет">
                            <Button size="small" type="text" danger icon={<DeleteOutlined />} />
                        </Popconfirm>
                    </Space>
                </div>
            ))}

            <Modal
                title="Настройка периода"
                open={!!editModal}
                onOk={saveEdit}
                onCancel={() => setEditModal(null)}
                okText="Сохранить"
                cancelText="Отмена"
            >
                <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                    <div>
                        <Text strong style={{ display: 'block', marginBottom: 4 }}>Название:</Text>
                        <Input value={editName} onChange={e => setEditName(e.target.value)} placeholder="Например: T1 — Входное тестирование" />
                    </div>
                    <div>
                        <Text strong style={{ display: 'block', marginBottom: 4 }}>Даты периода:</Text>
                        <RangePicker
                            value={editDates}
                            onChange={setEditDates}
                            format="DD.MM.YYYY"
                            placeholder={['Начало', 'Конец']}
                            style={{ width: '100%' }}
                        />
                    </div>
                </Space>
            </Modal>
        </Card>
    );
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
    const [periods, setPeriods] = useState(loadPeriods);
    const [showPeriodSettings, setShowPeriodSettings] = useState(false);

    const handlePeriodsChange = useCallback((newPeriods) => {
        setPeriods(newPeriods);
        savePeriods(newPeriods);
    }, []);

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

    // Assign sessions to periods by date
    const sessionsByPeriod = {};
    periods.forEach(p => { sessionsByPeriod[p.id] = []; });
    filtered.forEach(s => {
        const period = assignPeriod(s.created_at || s.completed_at, periods);
        if (period) sessionsByPeriod[period.id].push(s);
    });

    // Period scores
    const periodScores = periods.map(p => {
        const sess = sessionsByPeriod[p.id] || [];
        const scores = sess.map(s => s.score).filter(v => v != null);
        return { ...p, sessions: sess, scores, avg: round(mean(scores)) };
    });

    // Compute delta between first two periods with data
    const periodsWithData = periodScores.filter(p => p.scores.length > 0);
    const delta = periodsWithData.length >= 2
        ? round(periodsWithData[1].avg - periodsWithData[0].avg)
        : null;
    const deltaLabel = periodsWithData.length >= 2
        ? `${periodsWithData[0].name.split('—')[0].trim()} → ${periodsWithData[1].name.split('—')[0].trim()}`
        : 'Дельта';

    // Paired users between first two periods
    const pairedUsers = [];
    const userDeltas = [];
    if (periodsWithData.length >= 2) {
        const p1Sess = periodsWithData[0].sessions;
        const p2Sess = periodsWithData[1].sessions;
        const usersP1 = new Set(p1Sess.map(s => s.user_id).filter(Boolean));
        const usersP2 = new Set(p2Sess.map(s => s.user_id).filter(Boolean));
        const paired = [...usersP1].filter(u => usersP2.has(u));
        pairedUsers.push(...paired);

        paired.forEach(uid => {
            const u1 = p1Sess.filter(s => s.user_id === uid);
            const u2 = p2Sess.filter(s => s.user_id === uid);
            const profile = profiles.find(p => p.id === uid);
            userDeltas.push({
                user_id: uid,
                role: profile?.role,
                p1_name: periodsWithData[0].name.split('—')[0].trim(),
                p2_name: periodsWithData[1].name.split('—')[0].trim(),
                p1_score: round(mean(u1.map(s => s.score))),
                p2_score: round(mean(u2.map(s => s.score))),
                delta: round(mean(u2.map(s => s.score)) - mean(u1.map(s => s.score))),
            });
        });
        userDeltas.sort((a, b) => b.delta - a.delta);
    }

    // Error analysis
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

    /* ── Student progress table ──────────────────────────────── */
    const studentProgress = profiles.map(profile => {
        const userSessions = filtered.filter(s => s.user_id === profile.id);
        const scores = userSessions.map(s => s.score).filter(v => v != null);
        const lastSession = userSessions[0]; // already sorted by created_at desc

        // Per-period scores
        const perPeriod = {};
        periods.forEach(p => {
            const pSess = (sessionsByPeriod[p.id] || []).filter(s => s.user_id === profile.id);
            const pScores = pSess.map(s => s.score).filter(v => v != null);
            perPeriod[p.id] = pScores.length ? round(mean(pScores)) : null;
        });

        return {
            user_id: profile.id,
            full_name: profile.full_name || '—',
            role: profile.role,
            total_sessions: userSessions.length,
            avg_score: scores.length ? round(mean(scores)) : null,
            best_score: scores.length ? Math.max(...scores) : null,
            last_date: lastSession?.created_at || null,
            perPeriod,
        };
    }).filter(s => s.total_sessions > 0).sort((a, b) => (b.avg_score || 0) - (a.avg_score || 0));

    /* ── exports ─────────────────────────────────────────────── */
    const handleExportSessions = () => {
        const summaryData = [
            { Показатель: 'Всего участников', Значение: profiles.length },
            ...periodScores.map(p => ({ Показатель: `Сессий (${p.name})`, Значение: p.sessions.length })),
            ...periodScores.map(p => ({ Показатель: `Средний балл ${p.name} (%)`, Значение: p.avg || 0 })),
            { Показатель: 'Участников с парными данными', Значение: pairedUsers.length },
            { Показатель: delta !== null ? `Дельта ${deltaLabel} (пп)` : 'Дельта (пп)', Значение: delta ?? '—' },
            { Показатель: 'Средний SUS', Значение: avgSUS || 0 },
            { Показатель: 'SUS >= 68 (%)', Значение: susScores.length ? round((sus68 / susScores.length) * 100) : 0 },
            { Показатель: 'Уверенность до (1-5)', Значение: avgConfPre || 0 },
            { Показатель: 'Уверенность после (1-5)', Значение: avgConfPost || 0 },
        ];

        const p1Name = periodsWithData[0]?.name.split('—')[0].trim() || 'P1';
        const p2Name = periodsWithData[1]?.name.split('—')[0].trim() || 'P2';

        const sheets = [
            { name: 'Сводка НИР', data: summaryData },
            {
                name: 'Дельта по участникам',
                data: userDeltas.map(u => ({
                    'ID пользователя': u.user_id,
                    'Роль': u.role || '—',
                    [`${p1Name} (%)`]: u.p1_score,
                    [`${p2Name} (%)`]: u.p2_score,
                    'Дельта (пп)': u.delta,
                })),
            },
            {
                name: 'Все сессии',
                data: sessions.map(s => {
                    const period = assignPeriod(s.created_at, periods);
                    return {
                        'ID': s.id,
                        'User ID': s.user_id || '—',
                        'Период': period?.name || '(вне периодов)',
                        'Балл (%)': s.score,
                        'Правильных': s.correct_q,
                        'Всего вопросов': s.total_q,
                        'Время (сек)': s.duration_sec,
                        'Дата': new Date(s.created_at).toLocaleString('ru'),
                    };
                }),
            },
            {
                name: 'Прогресс студентов',
                data: studentProgress.map(s => {
                    const row = {
                        'ФИО': s.full_name,
                        'Роль': s.role || '—',
                        'Всего сессий': s.total_sessions,
                        'Средний балл (%)': s.avg_score,
                        'Лучший (%)': s.best_score,
                        'Последний тест': s.last_date ? new Date(s.last_date).toLocaleDateString('ru') : '—',
                    };
                    periods.forEach(p => {
                        row[p.name.split('—')[0].trim()] = s.perPeriod[p.id] ?? '—';
                    });
                    return row;
                }),
            },
            {
                name: 'Анализ ошибок',
                data: errorData.map(e => ({ 'Звук / категория': e.name, 'Число ошибок': e.count })),
            },
            {
                name: 'Участники',
                data: profiles.map(p => ({
                    'ID': p.id, 'ФИО': p.full_name || '—', 'Роль': p.role || '—',
                    'Курс': p.year_of_study || '—', 'Учреждение': p.institution || '—',
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
        { title: periodsWithData[0]?.name.split('—')[0].trim() || 'P1', dataIndex: 'p1_score', sorter: (a, b) => a.p1_score - b.p1_score },
        { title: periodsWithData[1]?.name.split('—')[0].trim() || 'P2', dataIndex: 'p2_score', sorter: (a, b) => a.p2_score - b.p2_score },
        {
            title: 'Дельта (пп)', dataIndex: 'delta',
            sorter: (a, b) => a.delta - b.delta, defaultSortOrder: 'descend',
            render: (v) => <Tag color={v >= 20 ? 'green' : v >= 0 ? 'blue' : 'red'}>{v > 0 ? '+' : ''}{v}</Tag>,
        },
    ];

    const errorColumns = [
        { title: 'Звук / категория', dataIndex: 'name', ellipsis: true },
        {
            title: 'Ошибок', dataIndex: 'count',
            sorter: (a, b) => a.count - b.count, defaultSortOrder: 'descend',
            render: (v) => <Tag color={v > 10 ? 'red' : v > 5 ? 'orange' : 'default'}>{v}</Tag>,
        },
    ];

    // Student progress columns
    const progressColumns = [
        { title: 'ФИО', dataIndex: 'full_name', ellipsis: true, width: 180 },
        { title: 'Роль', dataIndex: 'role', render: roleBadge, width: 120 },
        { title: 'Сессий', dataIndex: 'total_sessions', sorter: (a, b) => a.total_sessions - b.total_sessions, width: 80 },
        {
            title: 'Средний', dataIndex: 'avg_score', sorter: (a, b) => (a.avg_score || 0) - (b.avg_score || 0),
            defaultSortOrder: 'descend', width: 90,
            render: (v) => v != null ? <Tag color={v >= 70 ? 'green' : v >= 50 ? 'orange' : 'red'}>{v}%</Tag> : '—',
        },
        {
            title: 'Лучший', dataIndex: 'best_score', width: 90,
            render: (v) => v != null ? `${v}%` : '—',
        },
        ...periods.filter(p => p.startDate && p.endDate).map(p => ({
            title: <Tooltip title={p.name}>{p.name.split('—')[0].trim()}</Tooltip>,
            key: `period_${p.id}`,
            width: 80,
            render: (_, record) => {
                const v = record.perPeriod[p.id];
                return v != null ? <Tag color={v >= 70 ? 'green' : v >= 50 ? 'orange' : 'red'}>{v}%</Tag> : '—';
            },
            sorter: (a, b) => (a.perPeriod[p.id] || 0) - (b.perPeriod[p.id] || 0),
        })),
        {
            title: 'Последний тест', dataIndex: 'last_date', width: 120,
            render: (v) => v ? new Date(v).toLocaleDateString('ru') : '—',
            sorter: (a, b) => new Date(a.last_date || 0) - new Date(b.last_date || 0),
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
                    <Button
                        icon={<SettingOutlined />}
                        onClick={() => setShowPeriodSettings(!showPeriodSettings)}
                        type={showPeriodSettings ? 'primary' : 'default'}
                    >
                        Периоды
                    </Button>
                    <Button icon={<ReloadOutlined />} onClick={loadData}>Обновить</Button>
                    <Button type="primary" icon={<DownloadOutlined />} onClick={handleExportSessions}>
                        Сессии XLSX
                    </Button>
                    <Button icon={<FormOutlined />} onClick={handleExportSurveys}>
                        Опросники XLSX
                    </Button>
                </Space>
            </div>

            {/* Period settings (collapsible) */}
            {showPeriodSettings && (
                <div style={{ marginBottom: 16 }}>
                    <PeriodManager periods={periods} onChange={handlePeriodsChange} />
                </div>
            )}

            {/* Empty state */}
            {sessions.length === 0 && profiles.length === 0 && (
                <Alert
                    type="info"
                    showIcon
                    message="Данных пока нет"
                    description="После того как участники пройдут тесты, здесь появится статистика. Настройте периоды исследования через кнопку «Периоды»."
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
                            title={`Дельта ${deltaLabel}`}
                            value={delta !== null ? delta : '—'}
                            suffix={delta !== null ? 'пп' : ''}
                            valueStyle={{ color: delta >= 20 ? '#52c41a' : delta >= 0 ? '#1890ff' : '#ff4d4f' }}
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
                {/* Score dynamics by period */}
                <Col xs={24} md={12}>
                    <Card title="Динамика по периодам">
                        {periodScores.length === 0 && (
                            <Alert type="info" message="Настройте периоды через кнопку «Периоды» вверху" showIcon />
                        )}
                        {periodScores.map(row => (
                            <div key={row.id} style={{ marginBottom: 12 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                    <Text>{row.name}</Text>
                                    <Text strong>
                                        {row.scores.length ? `${row.avg}%` : '—'}
                                        <Text type="secondary" style={{ fontSize: 11, marginLeft: 4 }}>
                                            (n={row.scores.length})
                                        </Text>
                                    </Text>
                                </div>
                                <Progress
                                    percent={row.scores.length ? row.avg : 0}
                                    strokeColor={row.color}
                                    trailColor="#f0f0f0"
                                    showInfo={false}
                                />
                            </div>
                        ))}
                        <Divider style={{ margin: '8px 0' }} />
                        <Row>
                            <Col span={12}>
                                <Statistic title="Парных участников" value={pairedUsers.length} />
                            </Col>
                            <Col span={12}>
                                <Statistic
                                    title="Дельта средняя"
                                    value={delta !== null ? delta : '—'}
                                    suffix={delta !== null ? 'пп' : ''}
                                    valueStyle={{ color: delta >= 20 ? '#52c41a' : '#faad14' }}
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

            {/* Student progress table */}
            <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
                <Col span={24}>
                    <Card title={`Прогресс студентов (n=${studentProgress.length})`}>
                        {studentProgress.length === 0 ? (
                            <Alert type="info" message="Нет участников с пройденными тестами" showIcon />
                        ) : (
                            <Table
                                dataSource={studentProgress}
                                columns={progressColumns}
                                rowKey="user_id"
                                size="small"
                                pagination={{ pageSize: 15 }}
                                scroll={{ x: true }}
                            />
                        )}
                    </Card>
                </Col>
            </Row>

            <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
                {/* Delta per user */}
                <Col xs={24} lg={14}>
                    <Card title={`Дельта по участникам (n=${userDeltas.length})`}>
                        {userDeltas.length === 0 ? (
                            <Alert type="info" message="Нет участников с данными в двух периодах" showIcon />
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
                                kpi: `Дельта ${deltaLabel} (цель ≥ 20 пп)`,
                                fact: delta !== null ? `${delta} пп` : '—',
                                ok: delta !== null && delta >= 20,
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
