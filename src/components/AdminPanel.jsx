import { useState, useEffect } from 'react';
import { Button, Typography, Spin, Tabs, Switch, Card, Space } from 'antd';
import { supabase, signOut } from '../services/supabase';
import { getSounds } from '../services/api';
import StructureManager from './StructureManager';
import TheoryManager from './TheoryManager';
import AdminLogin from './AdminLogin';
import AdminStats from './AdminStats';
import BatchImportModal from './BatchImportModal';
import { BugOutlined, RocketOutlined, BarChartOutlined, ImportOutlined } from '@ant-design/icons';

const { Title } = Typography;

function AdminPanel({ audioRecords, onAudioRecordsUpdate }) {
    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(true);
    const [batchImportOpen, setBatchImportOpen] = useState(false);
    const [isTestMode, setIsTestMode] = useState(() => {
        return localStorage.getItem('webhookTestMode') === 'true';
    });

    const handleWebhookModeChange = (checked) => {
        setIsTestMode(checked);
        localStorage.setItem('webhookTestMode', checked.toString());
    };

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setLoading(false);
        });

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
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
            key: 'stats',
            label: <><BarChartOutlined /> Дашборд НИР</>,
            children: <AdminStats />,
        },
        {
            key: '3',
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
                                    <><RocketOutlined style={{ color: '#52c41a' }} /> Продакшн (OpenRouter/DeepSeek)</>)}
                            </span>
                        </div>
                        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                            ИИ-квиз теперь работает напрямую через OpenRouter API (DeepSeek). n8n не используется.
                        </Typography.Text>
                        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                            Чтобы сменить модель — измените значение MODEL в src/services/ai.js
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
                <Space>
                    <Button icon={<ImportOutlined />} onClick={() => setBatchImportOpen(true)}>
                        Пакетный импорт
                    </Button>
                    <Button onClick={handleLogout}>Выйти</Button>
                </Space>
            </div>

            <BatchImportModal
                open={batchImportOpen}
                onClose={() => setBatchImportOpen(false)}
                onSuccess={refreshRecords}
            />

            <Tabs defaultActiveKey="1" items={items} />
        </div>
    );
}

export default AdminPanel;
