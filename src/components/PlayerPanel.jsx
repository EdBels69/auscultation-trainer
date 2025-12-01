import { Card, Typography, Tag, Divider } from 'antd';
import { HeartOutlined, SoundOutlined } from '@ant-design/icons';
import AudioPlayer from './AudioPlayer';
import { useEffect, useState } from 'react';

const { Text, Paragraph } = Typography;

function PlayerPanel({ selectedAudio }) {
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 992);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    if (!selectedAudio) return null;

    const panelStyle = isMobile ? {
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        maxHeight: '70vh',
        overflow: 'auto',
        background: '#fff',
        borderTop: '1px solid #f0f0f0',
        boxShadow: '0 -4px 12px rgba(0,0,0,0.1)',
        borderRadius: '16px 16px 0 0'
    } : {
        position: 'fixed',
        top: 80,
        right: 40,
        width: 420,
        maxWidth: 'calc(100vw - 80px)',
        zIndex: 100
    };

    return (
        <div style={panelStyle}>
            <Card
                title={
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {selectedAudio.category === 'cardiac'
                            ? <HeartOutlined style={{ color: '#ff4d4f', fontSize: 18 }} />
                            : <SoundOutlined style={{ color: '#1890ff', fontSize: 18 }} />
                        }
                        <span style={{ fontSize: 15, fontWeight: 500 }}>{selectedAudio.name}</span>
                    </div>
                }
                bordered={false}
                style={{
                    boxShadow: isMobile ? 'none' : '0 2px 8px rgba(0,0,0,0.1)',
                    border: 'none'
                }}
            >
                <AudioPlayer
                    audioUrl={selectedAudio.audioUrl}
                    isMobile={isMobile}
                />

                {selectedAudio.image_url && (
                    <div style={{
                        marginTop: 16,
                        width: '100%',
                        borderRadius: 8,
                        overflow: 'hidden',
                        background: '#f5f5f5'
                    }}>
                        <img
                            src={selectedAudio.image_url}
                            alt={selectedAudio.name}
                            style={{
                                width: '100%',
                                height: 'auto',
                                display: 'block'
                            }}
                        />
                    </div>
                )}

                <Divider />

                <div>
                    <Text type="secondary" style={{ fontSize: 12 }}>КАТЕГОРИЯ</Text>
                    <div style={{ marginBottom: 16, marginTop: 4 }}>
                        <Tag style={{
                            fontSize: 13,
                            padding: '4px 12px',
                            border: 'none',
                            background: selectedAudio.category === 'cardiac' ? '#ffe7e6' : '#e6f4ff',
                            color: selectedAudio.category === 'cardiac' ? '#ff4d4f' : '#1890ff'
                        }}>
                            {selectedAudio.category === 'cardiac' ? 'Кардиология' : 'Пульмонология'}
                        </Tag>
                    </div>

                    <Text type="secondary" style={{ fontSize: 12 }}>ТОЧКА АУСКУЛЬТАЦИИ</Text>
                    <div style={{ marginBottom: 16, marginTop: 4 }}>
                        <Text style={{ fontSize: 14, color: '#262626' }}>{selectedAudio.position}</Text>
                    </div>

                    <Text type="secondary" style={{ fontSize: 12 }}>ОПИСАНИЕ</Text>
                    <div style={{ marginTop: 4 }}>
                        <Paragraph style={{ fontSize: 13, color: '#595959', marginBottom: 0 }}>
                            {selectedAudio.description}
                        </Paragraph>
                    </div>

                    {selectedAudio.fileName && (
                        <>
                            <Divider style={{ margin: '16px 0' }} />
                            <Text type="secondary" style={{ fontSize: 11 }}>
                                Файл: {selectedAudio.fileName}
                            </Text>
                        </>
                    )}
                </div>
            </Card>
        </div>
    );
}

export default PlayerPanel;
