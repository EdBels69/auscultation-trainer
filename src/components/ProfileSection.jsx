/**
 * ProfileSection — user profile view (read-only)
 * Shows: personal info, role, training statistics summary, badge/achievements preview
 */
import { useState, useEffect, useCallback } from 'react';
import {
    Card, Avatar, Typography,
    Divider, Row, Col, Statistic, Tag, Spin, Space, Alert, Progress,
} from 'antd';
import {
    UserOutlined, TrophyOutlined,
    CheckCircleOutlined, BookOutlined, BarChartOutlined,
} from '@ant-design/icons';
import { supabase } from '../services/supabase';

const { Title, Text, Paragraph } = Typography;

const ROLE_OPTIONS = [
    { value: 'student', label: 'Студент' },
    { value: 'resident', label: 'Ординатор' },
    { value: 'doctor', label: 'Врач' },
    { value: 'teacher', label: 'Преподаватель' },
];

const ROLE_COLORS = {
    student: 'blue',
    resident: 'purple',
    doctor: 'green',
    teacher: 'orange',
};

const BADGE_META = {
    first_session: { label: 'Первая тренировка', icon: '🎯', color: '#635bff' },
    score_80: { label: 'Отлично (≥80%)', icon: '⭐', color: '#faad14' },
    score_100: { label: 'Идеально (100%)', icon: '🏆', color: '#f5222d' },
    five_sessions: { label: '5 тренировок', icon: '🔥', color: '#fa8c16' },
    ten_sessions: { label: '10 тренировок', icon: '💪', color: '#eb2f96' },
    sus_done: { label: 'SUS пройден', icon: '📋', color: '#13c2c2' },
    all_surveys: { label: 'Все анкеты', icon: '📊', color: '#52c41a' },
    theory_reader: { label: 'Изучил теорию', icon: '📚', color: '#1890ff' },
};

function ProfileSection({ user, participant }) {
    const [stats, setStats] = useState(null);
    const [achievements, setAchievements] = useState([]);
    const [loading, setLoading] = useState(true);

    const identityId = participant?.id || user?.id;
    const idField = participant ? 'participant_id' : 'user_id';

    const loadProfile = useCallback(async () => {
        if (!identityId) return;
        setLoading(true);
        try {
            // Load test session stats
            const { data: sessions } = await supabase
                .from('test_sessions')
                .select('score, total_q, correct_q, session_type, created_at')
                .eq(idField, identityId)
                .order('created_at', { ascending: false });

            if (sessions && sessions.length > 0) {
                const totalSessions = sessions.length;
                const avgScore = sessions.reduce((s, r) => s + (r.score || 0), 0) / totalSessions;
                const bestScore = Math.max(...sessions.map(r => r.score || 0));
                const t1 = sessions.filter(s => s.session_type === 'T1');
                const t2 = sessions.filter(s => s.session_type === 'T2');
                const avgT1 = t1.length ? t1.reduce((s, r) => s + (r.score || 0), 0) / t1.length : null;
                const avgT2 = t2.length ? t2.reduce((s, r) => s + (r.score || 0), 0) / t2.length : null;
                setStats({ totalSessions, avgScore, bestScore, avgT1, avgT2, lastSession: sessions[0]?.created_at });
            } else {
                setStats({ totalSessions: 0, avgScore: 0, bestScore: 0 });
            }

            // Load achievements
            const { data: achData } = await supabase
                .from('achievements')
                .select('badge_key, earned_at')
                .eq(idField, identityId)
                .order('earned_at', { ascending: true });

            setAchievements(achData || []);
        } catch (err) {
            console.error('Error loading profile:', err);
        } finally {
            setLoading(false);
        }
    }, [identityId, idField]);

    useEffect(() => {
        loadProfile();
    }, [loadProfile]);

    if (!participant && !user) {
        return (
            <div style={{ padding: '48px 0', textAlign: 'center' }}>
                <Alert
                    type="info"
                    showIcon
                    message="Необходимо войти"
                    description="Нажмите «Войти» для просмотра профиля и статистики."
                    style={{ maxWidth: 460, margin: '0 auto' }}
                />
            </div>
        );
    }

    if (loading) {
        return <div style={{ padding: 80, textAlign: 'center' }}><Spin size="large" /></div>;
    }

    const displayName = participant?.full_name || user?.user_metadata?.full_name || 'Участник';
    const role = participant?.role || user?.user_metadata?.role;
    const roleLabel = ROLE_OPTIONS.find(r => r.value === role)?.label;

    return (
        <div style={{ maxWidth: 860, margin: '32px auto', padding: '0 8px' }}>
            {/* Header card */}
            <Card style={{ marginBottom: 24, borderRadius: 12 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20, flexWrap: 'wrap' }}>
                    <Avatar
                        size={72}
                        icon={<UserOutlined />}
                        style={{ background: 'linear-gradient(135deg, #635bff 0%, #00d4ff 100%)', flexShrink: 0 }}
                    />
                    <div style={{ flex: 1, minWidth: 200 }}>
                        <Title level={3} style={{ margin: 0 }}>{displayName}</Title>
                        <Space size={8} style={{ marginTop: 6 }}>
                            {roleLabel && <Tag color={ROLE_COLORS[role] || 'default'}>{roleLabel}</Tag>}
                        </Space>
                        {participant?.code && (
                            <div style={{ marginTop: 4 }}>
                                <Text type="secondary" style={{ fontSize: 12, fontFamily: 'monospace' }}>
                                    Код: {participant.code}
                                </Text>
                            </div>
                        )}
                        {!participant && user?.email && (
                            <div style={{ marginTop: 4 }}>
                                <Text type="secondary" style={{ fontSize: 12 }}>{user.email}</Text>
                            </div>
                        )}
                    </div>
                </div>
            </Card>

            {/* Stats row */}
            <Row gutter={16} style={{ marginBottom: 24 }}>
                <Col xs={12} sm={6}>
                    <Card style={{ borderRadius: 10, textAlign: 'center' }}>
                        <Statistic
                            title="Тренировок"
                            value={stats?.totalSessions || 0}
                            prefix={<BookOutlined style={{ color: '#635bff' }} />}
                        />
                    </Card>
                </Col>
                <Col xs={12} sm={6}>
                    <Card style={{ borderRadius: 10, textAlign: 'center' }}>
                        <Statistic
                            title="Средний балл"
                            value={stats?.avgScore ? stats.avgScore.toFixed(1) : '—'}
                            suffix={stats?.avgScore ? '%' : ''}
                            prefix={<BarChartOutlined style={{ color: '#1890ff' }} />}
                        />
                    </Card>
                </Col>
                <Col xs={12} sm={6}>
                    <Card style={{ borderRadius: 10, textAlign: 'center' }}>
                        <Statistic
                            title="Лучший результат"
                            value={stats?.bestScore ? stats.bestScore.toFixed(1) : '—'}
                            suffix={stats?.bestScore ? '%' : ''}
                            prefix={<TrophyOutlined style={{ color: '#faad14' }} />}
                        />
                    </Card>
                </Col>
                <Col xs={12} sm={6}>
                    <Card style={{ borderRadius: 10, textAlign: 'center' }}>
                        <Statistic
                            title="Достижений"
                            value={achievements.length}
                            prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
                        />
                    </Card>
                </Col>
            </Row>

            {/* T1 → T2 delta if available */}
            {stats?.avgT1 != null && stats?.avgT2 != null && (
                <Card title={<><BarChartOutlined /> Прогресс T1 → T2</>} style={{ borderRadius: 12, marginBottom: 24 }}>
                    <Row gutter={24}>
                        <Col xs={24} sm={8}>
                            <div style={{ marginBottom: 12 }}>
                                <Text type="secondary">Исходный уровень (T1)</Text>
                                <div style={{ fontSize: 24, fontWeight: 700, color: '#595959' }}>
                                    {stats.avgT1.toFixed(1)}%
                                </div>
                            </div>
                        </Col>
                        <Col xs={24} sm={8}>
                            <div style={{ marginBottom: 12 }}>
                                <Text type="secondary">После обучения (T2)</Text>
                                <div style={{ fontSize: 24, fontWeight: 700, color: '#1890ff' }}>
                                    {stats.avgT2.toFixed(1)}%
                                </div>
                            </div>
                        </Col>
                        <Col xs={24} sm={8}>
                            <div style={{ marginBottom: 12 }}>
                                <Text type="secondary">Прирост ΔДоля</Text>
                                <div style={{
                                    fontSize: 24, fontWeight: 700,
                                    color: (stats.avgT2 - stats.avgT1) >= 20 ? '#52c41a' : '#fa8c16'
                                }}>
                                    {(stats.avgT2 - stats.avgT1) >= 0 ? '+' : ''}{(stats.avgT2 - stats.avgT1).toFixed(1)}%
                                </div>
                            </div>
                        </Col>
                    </Row>
                    <Progress
                        percent={Math.round(stats.avgT2)}
                        success={{ percent: Math.round(stats.avgT1), strokeColor: '#d9d9d9' }}
                        strokeColor={(stats.avgT2 - stats.avgT1) >= 20 ? '#52c41a' : '#1890ff'}
                        size="large"
                    />
                </Card>
            )}

            {/* Achievements */}
            <Card
                title={<><TrophyOutlined style={{ color: '#faad14' }} /> Достижения</>}
                style={{ borderRadius: 12, marginBottom: 24 }}
            >
                {achievements.length === 0 ? (
                    <Paragraph type="secondary" style={{ textAlign: 'center', padding: '24px 0', margin: 0 }}>
                        Пока нет достижений — пройдите тест или заполните анкеты, чтобы получить первые!
                    </Paragraph>
                ) : (
                    <Row gutter={[12, 12]}>
                        {achievements.map(ach => {
                            const meta = BADGE_META[ach.badge_key] || { label: ach.badge_key, icon: '🏅', color: '#bfbfbf' };
                            return (
                                <Col key={ach.badge_key} xs={12} sm={8} md={6}>
                                    <Card
                                        size="small"
                                        style={{
                                            borderRadius: 8,
                                            textAlign: 'center',
                                            borderColor: meta.color,
                                            background: meta.color + '10',
                                        }}
                                    >
                                        <div style={{ fontSize: 28 }}>{meta.icon}</div>
                                        <div style={{ fontWeight: 600, fontSize: 12, marginTop: 4, color: meta.color }}>
                                            {meta.label}
                                        </div>
                                        <div style={{ fontSize: 10, color: '#8c8c8c', marginTop: 2 }}>
                                            {new Date(ach.earned_at).toLocaleDateString('ru-RU')}
                                        </div>
                                    </Card>
                                </Col>
                            );
                        })}
                    </Row>
                )}

                {/* Show locked badges */}
                {achievements.length < Object.keys(BADGE_META).length && (
                    <>
                        <Divider style={{ margin: '16px 0' }}>
                            <Text type="secondary" style={{ fontSize: 12 }}>Ещё не получены</Text>
                        </Divider>
                        <Row gutter={[12, 12]}>
                            {Object.entries(BADGE_META)
                                .filter(([key]) => !achievements.find(a => a.badge_key === key))
                                .map(([key, meta]) => (
                                    <Col key={key} xs={12} sm={8} md={6}>
                                        <Card
                                            size="small"
                                            style={{
                                                borderRadius: 8,
                                                textAlign: 'center',
                                                opacity: 0.4,
                                                filter: 'grayscale(100%)',
                                            }}
                                        >
                                            <div style={{ fontSize: 28 }}>{meta.icon}</div>
                                            <div style={{ fontWeight: 600, fontSize: 12, marginTop: 4 }}>
                                                {meta.label}
                                            </div>
                                        </Card>
                                    </Col>
                                ))}
                        </Row>
                    </>
                )}
            </Card>
        </div>
    );
}

export default ProfileSection;
