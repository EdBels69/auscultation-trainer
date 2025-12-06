import { useState, useEffect } from 'react';
import { Button, Typography, Spin, Tabs } from 'antd';
import { supabase, signOut } from '../services/supabase';
import { getSounds } from '../services/api';
import StructureManager from './StructureManager';
import TheoryManager from './TheoryManager';
import AdminLogin from './AdminLogin';

const { Title } = Typography;

function AdminPanel({ audioRecords, onAudioRecordsUpdate }) {
    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(true);

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
