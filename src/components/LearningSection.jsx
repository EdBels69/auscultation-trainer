import { useState, useEffect } from 'react';
import { Tabs, Row, Col, Typography, Empty } from 'antd';
import { HeartOutlined, AimOutlined } from '@ant-design/icons';
import SoundCard from './SoundCard';
import PlayerPanel from './PlayerPanel';

const { Title, Text } = Typography;

function LearningSection({ audioRecords }) {
    const [selectedCategory, setSelectedCategory] = useState('cardiac');
    const [selectedAudio, setSelectedAudio] = useState(null);

    const filteredRecords = audioRecords.filter(r => r.category === selectedCategory);

    // Auto-select first audio when category changes or records load
    useEffect(() => {
        if (filteredRecords.length > 0) {
            setSelectedAudio(filteredRecords[0]);
        } else {
            setSelectedAudio(null);
        }
    }, [selectedCategory, audioRecords]);

    const tabItems = [
        {
            key: 'cardiac',
            label: (
                <span style={{ fontSize: 15 }}>
                    <HeartOutlined /> Кардиология ({audioRecords.filter(r => r.category === 'cardiac').length})
                </span>
            ),
        },
        {
            key: 'pulmonary',
            label: (
                <span style={{ fontSize: 15 }}>
                    <AimOutlined /> Пульмонология ({audioRecords.filter(r => r.category === 'pulmonary').length})
                </span>
            ),
        },
    ];

    return (
        <div style={{
            padding: '32px 0',
            paddingBottom: selectedAudio ? 'calc(70vh + 32px)' : '32px'
        }}>
            <div style={{ marginBottom: 32 }}>
                <Title level={2} style={{ marginBottom: 8 }}>Обучение</Title>
                <Text type="secondary" style={{ fontSize: 15 }}>
                    Изучите звуки аускультации легких и сердца
                </Text>
            </div>

            <Tabs
                activeKey={selectedCategory}
                items={tabItems}
                onChange={(key) => setSelectedCategory(key)}
                size="large"
            />

            {filteredRecords.length === 0 ? (
                <Empty
                    description="Нет доступных записей"
                    style={{ marginTop: 64 }}
                >
                    <Text type="secondary">
                        Перейдите в раздел "Управление" чтобы добавить аудиозаписи
                    </Text>
                </Empty>
            ) : (
                <Row gutter={24}>
                    <Col xs={24} lg={selectedAudio ? 14 : 24}>
                        <Row gutter={[16, 16]}>
                            {filteredRecords.map((record) => (
                                <Col
                                    xs={24}
                                    sm={12}
                                    md={selectedAudio ? 12 : 8}
                                    key={record.id}
                                >
                                    <SoundCard
                                        record={record}
                                        isSelected={selectedAudio?.id === record.id}
                                        onClick={() => setSelectedAudio(record)}
                                    />
                                </Col>
                            ))}
                        </Row>
                    </Col>

                    <Col xs={0} lg={selectedAudio ? 10 : 0}>
                        {/* Desktop placeholder for layout */}
                    </Col>
                </Row>
            )}

            <PlayerPanel selectedAudio={selectedAudio} />
        </div>
    );
}

export default LearningSection;
