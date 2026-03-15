import { useState, lazy, Suspense } from 'react';
import { Typography, Spin, Tabs, Switch, Card, Space, Result } from 'antd';
import { getSounds } from '../services/api';
import StructureManager from './StructureManager';
import TheoryManager from './TheoryManager';
import { BugOutlined, RocketOutlined, BarChartOutlined } from '@ant-design/icons';

const StatisticsPanel = lazy(() => import('./StatisticsPanel'));

const { Title } = Typography;

function AdminPanel({ audioRecords, onAudioRecordsUpdate, userProfile }) {
    const [isTestMode, setIsTestMode] = useState(() => {
        return localStorage.getItem('webhookTestMode') === 'true';
    });

    const handleWebhookModeChange = (checked) => {
        setIsTestMode(checked);
        localStorage.setItem('webhookTestMode', checked.toString());
    };

    const refreshRecords = async () => {
        try {
            const updatedRecords = await getSounds(true);
            onAudioRecordsUpdate(updatedRecords);
        } catch (error) {
            console.error('Error refreshing records:', error);
        }
    };

    if (!userProfile) {
        return (
            <div style={{ padding: '100px 20px' }}>
                <Result
                    status="403"
                    title="Требуется авторизация"
                    subTitle="Войдите в систему через кнопку в шапке страницы."
                />
            </div>
        );
    }

    if (userProfile.role !== 'admin') {
        return (
            <div style={{ padding: '100px 20px' }}>
                <Result
                    status="403"
                    title="Доступ запрещён"
                    subTitle="У вас нет прав администратора для доступа к этому разделу."
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
            <div style={{ marginBottom: 32 }}>
                <Title level={2} style={{ margin: 0 }}>Управление</Title>
            </div>

            <Tabs defaultActiveKey="1" items={items} />
        </div>
    );
}

export default AdminPanel;
