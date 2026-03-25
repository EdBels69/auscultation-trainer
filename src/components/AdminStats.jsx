/**
 * AdminStats — НИР Dashboard (v2)
 * - Research periods stored in PostgreSQL (research_periods table)
 * - Aggregated stats via server-side RPC (no 1000-row limit)
 * - Active participants only (those who actually used the system)
 * - KPI cards, score dynamics, error analysis, SUS + confidence
 * - XLSX export
 */
import { useState, useEffect, useCallback } from 'react';
import {
    Card, Row, Col, Statistic, Table, Button, Select, DatePicker,
    Alert, Typography, Tag, Progress, Spin, Space, Divider, message,
    Input, Modal, Popconfirm, Empty, Tooltip, Badge,
} from 'antd';
import {
    DownloadOutlined, ReloadOutlined, TrophyOutlined,
    UserOutlined, FileTextOutlined, BarChartOutlined, FormOutlined,
    PlusOutlined, DeleteOutlined, EditOutlined, CalendarOutlined,
    SettingOutlined, CheckCircleOutlined, TeamOutlined,
    ExperimentOutlined, SafetyOutlined,
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
        admin: ['red', 'Админ'],
    };
    const [color, label] = map[role] || ['default', role || '—'];
    return <Tag color={color}>{label}</Tag>;
}

/** Assign a session to a period by its completed_at date */
function assignPeriod(sessionDate, periods) {
    if (!sessionDate) return null;
    const d = new Date(sessionDate);
    for (const p of periods) {
        if (!p.start_date || !p.end_date) continue;
        const start = new Date(p.start_date);
        const end = new Date(p.end_date);
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
const SUS_KEYS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(i => `sus_${i}`);
const CONF_KEYS = ['c1', 'c2', 'c3', 'c4', 'c5'];

function buildSurveySheets(surveys) {
    const fmt = (s) => new Date(s.created_at).toLocaleString('ru');
    const idCol = (s) => s.participant_id || s.user_id || '—';
    const susRows = surveys.filter(s => s.survey_type === 'sus').map(s => {
        const r = s.responses || {};
        const row = { 'ID участника': idCol(s), 'Дата': fmt(s), 'SUS балл': s.score ?? '—' };
        SUS_KEYS.forEach((k, i) => { row[`Вопрос ${i + 1}`] = r[k] ?? '—'; });
        return row;
    });
    const confPreRows = surveys.filter(s => s.survey_type === 'confidence_pre').map(s => {
        const r = s.responses || {};
        const vals = CONF_KEYS.map(k => Number(r[k]) || 0).filter(v => v > 0);
        const avg = vals.length ? round(mean(vals)) : '—';
        const row = { 'ID участника': idCol(s), 'Дата': fmt(s), 'Среднее (1-5)': avg };
        CONF_KEYS.forEach((k, i) => { row[`C${i + 1}`] = r[k] ?? '—'; });
        return row;
    });
    const confPostRows = surveys.filter(s => s.survey_type === 'confidence_post').map(s => {
        const r = s.responses || {};
        const vals = CONF_KEYS.map(k => Number(r[k]) || 0).filter(v => v > 0);
        const avg = vals.length ? round(mean(vals)) : '—';
        const row = { 'ID участника': idCol(s), 'Дата': fmt(s), 'Среднее (1-5)': avg };
        CONF_KEYS.forEach((k, i) => { row[`C${i + 1}`] = r[k] ?? '—'; });
        return row;
    });
    const demoRows = surveys.filter(s => s.survey_type === 'demographics').map(s => {
        const r = s.responses || {};
        return {
            'ID участника': idCol(s), 'Дата': fmt(s),
            'Возраст': r.age ?? '—', 'Слух': r.hearing ?? '—',
            'Опыт аускультации': r.auscultation_exp ?? '—',
            'Цифровые тренажёры ранее': r.prior_digital ?? '—',
            'Устройство': r.device ?? '—',
        };
    });
    const feedbackRows = surveys.filter(s => s.survey_type === 'feedback').map(s => {
        const r = s.responses || {};
        return {
            'ID участника': idCol(s), 'Дата': fmt(s),
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
   Period Manager Component — saves to PostgreSQL
   ════════════════════════════════════════════════════════════════ */
function PeriodManager({ periods, onChange, saving }) {
    const [editModal, setEditModal] = useState(null);
    const [editName, setEditName] = useState('');
    const [editDates, setEditDates] = useState(null);

    const addPeriod = async () => {
        const newPeriod = {
            name: `Период ${periods.length + 1}`,
            color: ['#1890ff', '#52c41a', '#722ed1', '#fa8c16', '#eb2f96', '#13c2c2'][periods.length % 6],
            start_date: null,
            end_date: null,
            sort_order: periods.length + 1,
        };
        const { data, error } = await supabase.from('research_periods').insert(newPeriod).select().single();
        if (error) {
            message.error('Ошибка создания периода');
            return;
        }
        onChange([...periods, data]);
    };

    const removePeriod = async (id) => {
        const { error } = await supabase.from('research_periods').delete().eq('id', id);
        if (error) {
            message.error('Ошибка удаления');
            return;
        }
        onChange(periods.filter(p => p.id !== id));
    };

    const openEdit = (period) => {
        setEditModal(period);
        setEditName(period.name);
        setEditDates(period.start_date && period.end_date
            ? [dayjs(period.start_date), dayjs(period.end_date)]
            : null);
    };

    const saveEdit = async () => {
        const updates = {
            name: editName,
            start_date: editDates?.[0]?.toISOString() || null,
            end_date: editDates?.[1]?.toISOString() || null,
        };
        const { error } = await supabase.from('research_periods').update(updates).eq('id', editModal.id);
        if (error) {
            message.error('Ошибка сохранения');
            return;
        }
        onChange(periods.map(p => p.id === editModal.id ? { ...p, ...updates } : p));
        setEditModal(null);
        message.success('Период сохранён');
    };

    const fmtDate = (d) => d ? new Date(d).toLocaleDateString('ru') : '—';

    return (
        <Card
            title={<><CalendarOutlined /> Периоды исследования <Tag color="green">PostgreSQL</Tag></>}
            size="small"
            extra={<Button size="small" icon={<PlusOutlined />} onClick={addPeriod}>Добавить</Button>}
        >
            <Alert
                type="info"
                showIcon
                message="Периоды хранятся в базе данных и доступны для всех администраторов"
                style={{ marginBottom: 12, fontSize: 12 }}
            />
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
                                {p.start_date ? `${fmtDate(p.start_date)} — ${fmtDate(p.end_date)}` : 'Даты не заданы'}
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
    const [profiles, setProfiles] = useState([]);       // Only active participants
    const [dashStats, setDashStats] = useState(null);    // Aggregated server stats
    const [achievements, setAchievements] = useState([]);
    const [dateRange, setDateRange] = useState(null);
    const [periods, setPeriods] = useState([]);
    const [showPeriodSettings, setShowPeriodSettings] = useState(false);

    /* ── load ────────────────────────────────────────────────── */
    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [sessRes, survRes, activeRes, statsRes, periodRes, achRes] = await Promise.all([
                supabase.from('test_sessions').select('*').order('completed_at', { ascending: false }),
                supabase.from('survey_responses').select('*').order('created_at', { ascending: false }),
                supabase.rpc('get_active_participants'),
                supabase.rpc('get_dashboard_stats'),
                supabase.from('research_periods').select('*').order('sort_order'),
                supabase.from('achievements').select('*').order('created_at', { ascending: false }),
            ]);

            setSessions(sessRes.data || []);
            setSurveys(survRes.data || []);
            setProfiles(activeRes.data || []);
            setDashStats(statsRes.data || null);
            setPeriods(periodRes.data || []);
            setAchievements(achRes.data || []);
        } catch (e) {
            message.error('Ошибка загрузки: ' + e.message);
        }
        setLoading(false);
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    /* ── filters & derived data ──────────────────────────────── */
    const filtered = dateRange
        ? sessions.filter(s => {
            const d = new Date(s.completed_at);
            return d >= dateRange[0].toDate() && d <= dateRange[1].toDate();
        })
        : sessions;

    // Assign sessions to periods by date
    const sessionsByPeriod = {};
    periods.forEach(p => { sessionsByPeriod[p.id] = []; });
    filtered.forEach(s => {
        const period = assignPeriod(s.completed_at, periods);
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

    /** Get the identity ID from a session */
    const getSessionIdentity = (s) => s.participant_id || s.user_id;

    // Paired users between first two periods
    const pairedUsers = [];
    const userDeltas = [];
    if (periodsWithData.length >= 2) {
        const p1Sess = periodsWithData[0].sessions;
        const p2Sess = periodsWithData[1].sessions;
        const usersP1 = new Set(p1Sess.map(getSessionIdentity).filter(Boolean));
        const usersP2 = new Set(p2Sess.map(getSessionIdentity).filter(Boolean));
        const paired = [...usersP1].filter(u => usersP2.has(u));
        pairedUsers.push(...paired);

        paired.forEach(uid => {
            const u1 = p1Sess.filter(s => getSessionIdentity(s) === uid);
            const u2 = p2Sess.filter(s => getSessionIdentity(s) === uid);
            const profile = profiles.find(p => p.id === uid);
            userDeltas.push({
                user_id: uid,
                code: profile?.code,
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

    // Stats from RPC (accurate counts)
    const totalParticipants = dashStats?.total_participants || 0;
    const activeParticipants = dashStats?.active_participants || profiles.length;
    const byRoleActive = dashStats?.by_role || {};
    const surveysByType = dashStats?.surveys_by_type || {};

    // Achievements summary
    const achievementsByType = achievements.reduce((acc, a) => {
        acc[a.achievement_type || a.type || 'unknown'] = (acc[a.achievement_type || a.type || 'unknown'] || 0) + 1;
        return acc;
    }, {});

    /* ── Student progress table (active participants only) ──── */
    const studentProgress = profiles
        .filter(p => p.role !== 'admin')
        .map(profile => {
            const userSessions = filtered.filter(s => s.participant_id === profile.id || s.user_id === profile.id);
            const scores = userSessions.map(s => s.score).filter(v => v != null);
            const lastSession = userSessions[0];
            const userSurveys = surveys.filter(s => s.participant_id === profile.id || s.user_id === profile.id);
            const userAchievements = achievements.filter(a => a.participant_id === profile.id || a.user_id === profile.id);

            // Per-period scores
            const perPeriod = {};
            periods.forEach(p => {
                const pSess = (sessionsByPeriod[p.id] || []).filter(s => s.participant_id === profile.id || s.user_id === profile.id);
                const pScores = pSess.map(s => s.score).filter(v => v != null);
                perPeriod[p.id] = pScores.length ? round(mean(pScores)) : null;
            });

            return {
                user_id: profile.id,
                code: profile.code || null,
                full_name: profile.full_name || '—',
                role: profile.role,
                total_sessions: userSessions.length,
                total_surveys: userSurveys.length,
                total_achievements: userAchievements.length,
                avg_score: scores.length ? round(mean(scores)) : null,
                best_score: scores.length ? Math.max(...scores) : null,
                last_date: lastSession?.completed_at || null,
                perPeriod,
            };
        })
        .sort((a, b) => {
            // Sort: those with sessions first (by avg_score desc), then by surveys, then by achievements
            if (a.total_sessions !== b.total_sessions) return b.total_sessions - a.total_sessions;
            return (b.avg_score || 0) - (a.avg_score || 0);
        });

    /* ── exports ─────────────────────────────────────────────── */
    const handleExportSessions = () => {
        const summaryData = [
            { Показатель: 'Всего зарегистрировано', Значение: totalParticipants },
            { Показатель: 'Активных участников', Значение: activeParticipants },
            { Показатель: 'Тестовых сессий', Значение: sessions.length },
            { Показатель: 'Анкет заполнено', Значение: surveys.length },
            { Показатель: 'Достижений выдано', Значение: achievements.length },
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
                    'ID участника': u.user_id,
                    'Код': u.code || '—',
                    'Роль': u.role || '—',
                    [`${p1Name} (%)`]: u.p1_score,
                    [`${p2Name} (%)`]: u.p2_score,
                    'Дельта (пп)': u.delta,
                })),
            },
            {
                name: 'Все сессии',
                data: sessions.map(s => {
                    const period = assignPeriod(s.completed_at, periods);
                    return {
                        'ID': s.id,
                        'ID участника': s.participant_id || s.user_id || '—',
                        'Период': period?.name || '(вне периодов)',
                        'Балл (%)': s.score,
                        'Правильных': s.correct_q,
                        'Всего вопросов': s.total_q,
                        'Время (сек)': s.duration_sec,
                        'Дата': new Date(s.completed_at).toLocaleString('ru'),
                    };
                }),
            },
            {
                name: 'Прогресс студентов',
                data: studentProgress.map(s => {
                    const row = {
                        'Код': s.code || '—',
                        'ФИО': s.full_name,
                        'Роль': s.role || '—',
                        'Тестов': s.total_sessions,
                        'Анкет': s.total_surveys,
                        'Достижений': s.total_achievements,
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
                name: 'Достижения',
                data: achievements.map(a => ({
                    'ID участника': a.participant_id || a.user_id || '—',
                    'Тип': a.achievement_type || a.type || '—',
                    'Название': a.title || a.name || '—',
                    'Дата': new Date(a.created_at).toLocaleString('ru'),
                })),
            },
            {
                name: 'Анализ ошибок',
                data: errorData.map(e => ({ 'Звук / категория': e.name, 'Число ошибок': e.count })),
            },
            {
                name: 'Участники',
                data: profiles.map(p => ({
                    'ID': p.id, 'Код': p.code || '—', 'ФИО': p.full_name || '—', 'Роль': p.role || '—',
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
        { title: 'Код', dataIndex: 'code', width: 90, render: (v) => v ? <Tag style={{ fontFamily: 'monospace' }}>{v}</Tag> : '—' },
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
        { title: 'Код', dataIndex: 'code', width: 90, render: (v) => v ? <Tag style={{ fontFamily: 'monospace' }}>{v}</Tag> : '—' },
        { title: 'ФИО', dataIndex: 'full_name', ellipsis: true, width: 160 },
        { title: 'Роль', dataIndex: 'role', render: roleBadge, width: 110 },
        { title: 'Тестов', dataIndex: 'total_sessions', sorter: (a, b) => a.total_sessions - b.total_sessions, width: 70 },
        { title: 'Анкет', dataIndex: 'total_surveys', sorter: (a, b) => a.total_surveys - b.total_surveys, width: 70 },
        {
            title: 'Средний', dataIndex: 'avg_score', sorter: (a, b) => (a.avg_score || 0) - (b.avg_score || 0),
            defaultSortOrder: 'descend', width: 85,
            render: (v) => v != null ? <Tag color={v >= 70 ? 'green' : v >= 50 ? 'orange' : 'red'}>{v}%</Tag> : '—',
        },
        {
            title: 'Лучший', dataIndex: 'best_score', width: 80,
            render: (v) => v != null ? `${v}%` : '—',
        },
        ...periods.filter(p => p.start_date && p.end_date).map(p => ({
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

    if (loading) return <div style={{ padding: 48, textAlign: 'center' }}><Spin size="large" tip="Загрузка данных из PostgreSQL..." /></div>;

    /* ════════════════════════════════════════════════════════════
       Render
       ════════════════════════════════════════════════════════════ */
    return (
        <div style={{ padding: '0 0 32px' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
                <Title level={4} style={{ margin: 0 }}>
                    <BarChartOutlined /> Дашборд НИР
                    <Tag color="green" style={{ marginLeft: 8, fontSize: 11, verticalAlign: 'middle' }}>
                        PostgreSQL
                    </Tag>
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
                    <PeriodManager periods={periods} onChange={setPeriods} />
                </div>
            )}

            {/* Empty state */}
            {sessions.length === 0 && activeParticipants === 0 && (
                <Alert
                    type="info"
                    showIcon
                    message="Данных пока нет"
                    description="После того как участники пройдут тесты, здесь появится статистика. Настройте периоды исследования через кнопку «Периоды»."
                    style={{ marginBottom: 16 }}
                />
            )}

            {/* KPI Cards — Row 1: Activity overview */}
            <Row gutter={[12, 12]}>
                <Col xs={12} sm={6}>
                    <Card size="small">
                        <Statistic
                            title={<><TeamOutlined /> Активные участники</>}
                            value={activeParticipants}
                            suffix={<Text type="secondary" style={{ fontSize: 12 }}>/ {totalParticipants}</Text>}
                            valueStyle={{ color: '#635bff' }}
                        />
                    </Card>
                </Col>
                <Col xs={12} sm={6}>
                    <Card size="small">
                        <Statistic
                            title={<><FileTextOutlined /> Тестовые сессии</>}
                            value={filtered.length}
                            valueStyle={{ color: '#1890ff' }}
                        />
                        {filtered.length > 0 && (
                            <Text type="secondary" style={{ fontSize: 11 }}>
                                Средний балл: {round(mean(filtered.map(s => s.score).filter(v => v != null)))}%
                            </Text>
                        )}
                    </Card>
                </Col>
                <Col xs={12} sm={6}>
                    <Card size="small">
                        <Statistic
                            title={<><FormOutlined /> Анкеты</>}
                            value={surveys.length}
                            valueStyle={{ color: '#52c41a' }}
                        />
                        {Object.keys(surveysByType).length > 0 && (
                            <Text type="secondary" style={{ fontSize: 11 }}>
                                {Object.entries(surveysByType).map(([t, c]) => `${t}: ${c}`).join(', ')}
                            </Text>
                        )}
                    </Card>
                </Col>
                <Col xs={12} sm={6}>
                    <Card size="small">
                        <Statistic
                            title={<><TrophyOutlined /> Достижения</>}
                            value={achievements.length}
                            valueStyle={{ color: '#faad14' }}
                        />
                    </Card>
                </Col>
            </Row>

            {/* KPI Cards — Row 2: Research metrics */}
            <Row gutter={[12, 12]} style={{ marginTop: 12 }}>
                <Col xs={12} sm={6}>
                    <Card size="small">
                        <Statistic
                            title="Дельта (тест)"
                            value={delta !== null ? delta : '—'}
                            suffix={delta !== null ? 'пп' : ''}
                            valueStyle={{ color: delta >= 20 ? '#52c41a' : delta >= 0 ? '#1890ff' : '#ff4d4f' }}
                        />
                        <Text type="secondary" style={{ fontSize: 10 }}>
                            {delta !== null ? deltaLabel : 'Нужны данные в 2+ периодах'}
                        </Text>
                    </Card>
                </Col>
                <Col xs={12} sm={6}>
                    <Card size="small">
                        <Statistic
                            title="Средний SUS"
                            value={susScores.length ? avgSUS : '—'}
                            suffix={susScores.length ? '/ 100' : ''}
                            valueStyle={{ color: avgSUS >= 68 ? '#52c41a' : '#faad14' }}
                        />
                        <Text type="secondary" style={{ fontSize: 10 }}>
                            {susScores.length ? `Цель: ≥ 68 (n=${susScores.length})` : 'Нет данных SUS'}
                        </Text>
                    </Card>
                </Col>
                <Col xs={12} sm={6}>
                    <Card size="small">
                        <Statistic
                            title="Уверенность (до)"
                            value={confPre.length ? avgConfPre : '—'}
                            suffix={confPre.length ? '/ 5' : ''}
                        />
                        <Text type="secondary" style={{ fontSize: 10 }}>n={confPre.length}</Text>
                    </Card>
                </Col>
                <Col xs={12} sm={6}>
                    <Card size="small">
                        <Statistic
                            title="Уверенность (после)"
                            value={confPost.length ? avgConfPost : '—'}
                            suffix={confPost.length ? '/ 5' : ''}
                            valueStyle={{ color: avgConfPost > avgConfPre ? '#52c41a' : undefined }}
                        />
                        <Text type="secondary" style={{ fontSize: 10 }}>n={confPost.length}</Text>
                    </Card>
                </Col>
            </Row>

            <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
                {/* Score dynamics by period */}
                <Col xs={24} md={12}>
                    <Card title="Динамика по периодам" size="small">
                        {periodScores.every(p => !p.start_date || !p.end_date) && (
                            <Alert
                                type="warning"
                                message="Задайте даты периодов через кнопку «Периоды» вверху"
                                showIcon
                                style={{ marginBottom: 12 }}
                            />
                        )}
                        {periodScores.map(row => (
                            <div key={row.id} style={{ marginBottom: 12 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                    <Text style={{ fontSize: 13 }}>{row.name}</Text>
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
                                <Statistic title="Парных участников" value={pairedUsers.length} valueStyle={{ fontSize: 20 }} />
                            </Col>
                            <Col span={12}>
                                <Statistic
                                    title="Дельта средняя"
                                    value={delta !== null ? delta : '—'}
                                    suffix={delta !== null ? 'пп' : ''}
                                    valueStyle={{ color: delta >= 20 ? '#52c41a' : '#faad14', fontSize: 20 }}
                                />
                            </Col>
                        </Row>
                    </Card>
                </Col>

                {/* Active participants by role + Achievements */}
                <Col xs={24} md={12}>
                    <Card title="Состав активных участников" size="small">
                        <Row gutter={16}>
                            <Col span={12}>
                                <Text strong style={{ display: 'block', marginBottom: 8 }}>По ролям:</Text>
                                {Object.entries(byRoleActive).length === 0 ? (
                                    <Text type="secondary">Нет данных</Text>
                                ) : (
                                    Object.entries(byRoleActive).map(([role, count]) => (
                                        <div key={role} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                            {roleBadge(role)}
                                            <Text strong>{count}</Text>
                                        </div>
                                    ))
                                )}
                            </Col>
                            <Col span={12}>
                                <Text strong style={{ display: 'block', marginBottom: 8 }}>Анкеты:</Text>
                                {Object.entries(surveysByType).length === 0 ? (
                                    <Text type="secondary">Нет данных</Text>
                                ) : (
                                    Object.entries(surveysByType).map(([type, count]) => (
                                        <div key={type} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                            <Tag>{type}</Tag>
                                            <Text strong>{count}</Text>
                                        </div>
                                    ))
                                )}
                            </Col>
                        </Row>
                        {Object.keys(achievementsByType).length > 0 && (
                            <>
                                <Divider style={{ margin: '8px 0' }} />
                                <Text strong style={{ display: 'block', marginBottom: 8 }}>Достижения по типам:</Text>
                                {Object.entries(achievementsByType).map(([type, count]) => (
                                    <div key={type} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                        <Tag color="gold"><TrophyOutlined /> {type}</Tag>
                                        <Text strong>{count}</Text>
                                    </div>
                                ))}
                            </>
                        )}
                    </Card>
                </Col>
            </Row>

            {/* Student progress table */}
            <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
                <Col span={24}>
                    <Card title={`Активные участники (n=${studentProgress.length})`} size="small">
                        {studentProgress.length === 0 ? (
                            <Alert type="info" message="Нет активных участников" showIcon />
                        ) : (
                            <Table
                                dataSource={studentProgress}
                                columns={progressColumns}
                                rowKey="user_id"
                                size="small"
                                pagination={{ pageSize: 20, showSizeChanger: true, pageSizeOptions: ['10', '20', '50'] }}
                                scroll={{ x: true }}
                            />
                        )}
                    </Card>
                </Col>
            </Row>

            <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
                {/* Delta per user */}
                <Col xs={24} lg={14}>
                    <Card title={`Дельта по участникам (n=${userDeltas.length})`} size="small">
                        {userDeltas.length === 0 ? (
                            <Alert type="info" message="Нет участников с данными в двух периодах. Задайте даты периодов и дождитесь тестирования." showIcon />
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
                    <Card title="Анализ ошибок (топ-20)" size="small">
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

            {/* KPI summary */}
            <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
                <Col span={24}>
                    <Card title={<><SafetyOutlined /> Сводка КПЭ НИР</>} size="small">
                        <Row gutter={[16, 8]}>
                            {[
                                {
                                    kpi: 'Активные участники (цель ≥ 50)',
                                    fact: `${activeParticipants}`,
                                    ok: activeParticipants >= 50,
                                    progress: Math.min(100, Math.round((activeParticipants / 50) * 100)),
                                },
                                {
                                    kpi: `Дельта ${deltaLabel} (цель ≥ 20 пп)`,
                                    fact: delta !== null ? `${delta} пп` : '—',
                                    ok: delta !== null && delta >= 20,
                                    progress: delta !== null ? Math.min(100, Math.round((delta / 20) * 100)) : 0,
                                },
                                {
                                    kpi: 'SUS >= 68',
                                    fact: susScores.length ? `${avgSUS} (${round((sus68 / susScores.length) * 100)}% ≥ 68)` : '—',
                                    ok: susScores.length > 0 && avgSUS >= 68,
                                    progress: susScores.length ? Math.min(100, Math.round((avgSUS / 68) * 100)) : 0,
                                },
                                {
                                    kpi: 'Анкет демографии заполнено',
                                    fact: String(surveysByType.demographics || 0),
                                    ok: (surveysByType.demographics || 0) >= 10,
                                    progress: Math.min(100, Math.round(((surveysByType.demographics || 0) / 50) * 100)),
                                },
                                {
                                    kpi: 'Тестовых сессий проведено',
                                    fact: String(sessions.length),
                                    ok: sessions.length >= 20,
                                    progress: Math.min(100, Math.round((sessions.length / 50) * 100)),
                                },
                            ].map(row => (
                                <Col xs={24} sm={12} md={8} key={row.kpi}>
                                    <div style={{
                                        padding: '12px 16px',
                                        borderRadius: 8,
                                        background: row.ok === true ? '#f6ffed' : row.ok === false ? '#fff2f0' : '#f0f5ff',
                                        border: `1px solid ${row.ok === true ? '#b7eb8f' : row.ok === false ? '#ffccc7' : '#adc6ff'}`,
                                    }}>
                                        <Text style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>{row.kpi}</Text>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <Text strong style={{ fontSize: 16 }}>{row.fact}</Text>
                                            {row.ok === true && <CheckCircleOutlined style={{ color: '#52c41a' }} />}
                                        </div>
                                        <Progress
                                            percent={row.progress}
                                            size="small"
                                            strokeColor={row.ok === true ? '#52c41a' : row.ok === false ? '#ff4d4f' : '#1890ff'}
                                            showInfo={false}
                                            style={{ marginTop: 4 }}
                                        />
                                    </div>
                                </Col>
                            ))}
                        </Row>
                    </Card>
                </Col>
            </Row>
        </div>
    );
}

export default AdminStats;
