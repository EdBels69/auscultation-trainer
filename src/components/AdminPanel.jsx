import { useState, useEffect, lazy, Suspense } from 'react';
import { Button, Typography, Spin, Tabs, Switch, Card, Space, Result } from 'antd';
import { supabase, signOut, getUserProfile } from '../services/supabase';
import { getSounds } from '../services/api';
import StructureManager from './StructureManager';
import TheoryManager from './TheoryManager';
import AdminLogin from './AdminLogin';
import { BugOutlined, RocketOutlined, BarChartOutlined } from '@ant-design/icons';

const StatisticsPanel = lazy(() => import('./StatisticsPanel'));

const { Title } = Typography;

function AdminPanel({ audioRecords, onAudioRecordsUpdate }) {
    const [session, setSession] = useState(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(true);
    const [isTestMode, setIsTestMode] = useState(() => {
        return localStorage.getItem('webhookTestMode') === 'true';
    });

    const handleWebhookModeChange = (checked) => {
        setIsTestMode(checked);
        localStorage.setItem('webhookTestMode', checked.toString());
    };

    const checkAdminRole = async () => {
        const profile = await getUserProfile();
        setIsAdmin(profile?.role === 'admin');
    };

    useEffect(() => {
        const init = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            setSession(session);
            if (session) {
                await checkAdminRole();
            }
            setLoading(false);
        };
        init();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            if (session) {
                (async () => {
                    await checkAdminRole();
                })();
            } else {
                setIsAdmin(false);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const handleLogout = async () => {
        await signOut();
    };

    const refreshRecords = async () => {
        try {
            const updatedRecords = await getSounds(true); // Force refresh cache
            onAudioRecordsUpdate(updatedRecords);
        } catch (error) {
            console.error('Error refreshing records:', error);
        }
    };

    if (loading) {
        return <div style={{ padding: 50, textAlign: 'center' }}><Spin size="large" /></div>;
    }

    if (!session) {
        return <AdminLogin />;
    }

    if (!isAdmin) {
        return (
            <div style={{ padding: '100px 20px' }}>
                <Result
                    status="403"
                    title="Доступ запрещен"
                    subTitle="У вас нет прав администратора для доступа к этому разделу."
                    extra={
                        <Button onClick={handleLogout}>Выйти</Button>
                    }
                />
            </div>
        );
    }

    const items = [
        {
            key: '1',
            label: 'Структура Обучения',
            children: <StructureManager audioRecords={audioRecords} onAudioUpdate={refreshRecords} />,
        },
        {
            key: '2',
            label: 'Теория',
            children: <TheoryManager />,
        },
        {
            key: '3',
            label: (
                <span><BarChartOutlined /> Статистика</span>
            ),
            children: (
                <Suspense fallback={<div style={{ padding: 50, textAlign: 'center' }}><Spin /></div>}>
                    <StatisticsPanel />
                </Suspense>
            ),
        },
        {
            key: '4',
            label: 'Настройки',
            children: (
                <Card title="Настройки квиза" style={{ maxWidth: 500 }}>
                    <Space direction="vertical" size="middle">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <Switch
                                checked={isTestMode}
                                onChange={handleWebhookModeChange}
                                checkedChildren={<BugOutlined />}
                                unCheckedChildren={<RocketOutlined />}
                            />
                            <span>
                                {isTestMode ? (
                                    <><BugOutlined style={{ color: '#faad14' }} /> Тестовый режим (webhook-test)</>) : (
                                    <><RocketOutlined style={{ color: '#52c41a' }} /> Продакшн (webhook)</>)}
                            </span>
                        </div>
                        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                            Тестовый режим использует webhook-test для отладки в n8n
                        </Typography.Text>
                    </Space>
                </Card>
            ),
        },
    ];

    return (
        <div style={{ padding: '32px 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
                <Title level={2} style={{ margin: 0 }}>Управление</Title>
                <Button onClick={handleLogout}>Выйти</Button>
            </div>

            <Tabs defaultActiveKey="1" items={items} />
        </div>
    );
}

export default AdminPanel;
