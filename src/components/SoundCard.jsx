import { Card, Typography, Tag } from 'antd';
import { HeartOutlined, SoundOutlined } from '@ant-design/icons';

const { Text, Paragraph } = Typography;

function SoundCard({ record, isSelected, onClick }) {
    return (
        <Card
            hoverable
            onClick={onClick}
            style={{
                height: '100%',
                minHeight: 200,
                border: isSelected ? '2px solid #1890ff' : '1px solid #f0f0f0',
                transition: 'all 0.3s',
                cursor: 'pointer',
                background: isSelected ? '#f0f5ff' : '#fff',
                boxShadow: isSelected
                    ? '0 4px 12px rgba(24,144,255,0.15)'
                    : '0 2px 8px rgba(0,0,0,0.06)'
            }}
        >
            {record.image_url && (
                <div style={{
                    width: '100%',
                    height: 120,
                    borderRadius: 8,
                    overflow: 'hidden',
                    marginBottom: 12,
                    background: '#f5f5f5'
                }}>
                    <img
                        src={record.image_url}
                        alt={record.name}
                        style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover'
                        }}
                    />
                </div>
            )}
            <div style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12,
                marginBottom: 12
            }}>
                <div style={{
                    width: 44,
                    height: 44,
                    borderRadius: '50%',
                    background: record.category === 'cardiac' ? '#ffe7e6' : '#e6f4ff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: record.category === 'cardiac' ? '#ff4d4f' : '#1890ff',
                    fontSize: 18,
                    flexShrink: 0
                }}>
                    {record.category === 'cardiac' ? <HeartOutlined /> : <SoundOutlined />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <Text
                        strong
                        style={{
                            fontSize: 14,
                            display: 'block',
                            marginBottom: 6,
                            lineHeight: 1.4,
                            wordBreak: 'break-word',
                            color: '#262626'
                        }}
                    >
                        {record.name}
                    </Text>
                    <Tag
                        style={{
                            margin: 0,
                            fontSize: 11,
                            padding: '2px 8px',
                            border: 'none',
                            background: '#f5f5f5',
                            color: '#595959'
                        }}
                    >
                        {record.position}
                    </Tag>
                </div>
            </div>

            <Paragraph
                ellipsis={{ rows: 2 }}
                style={{
                    fontSize: 13,
                    color: '#8c8c8c',
                    marginBottom: 0,
                    lineHeight: 1.6
                }}
            >
                {record.description}
            </Paragraph>
        </Card>
    );
}

export default SoundCard;
