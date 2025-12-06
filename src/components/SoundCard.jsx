import { Typography, Tag } from 'antd';
import { HeartOutlined, SoundOutlined } from '@ant-design/icons';

const { Text } = Typography;

function SoundCard({ record, isSelected, onClick }) {
    const styles = {
        card: {
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '14px 16px',
            border: isSelected ? '1.5px solid #635bff' : '1px solid #e3e8ee',
            borderRadius: 8,
            cursor: 'pointer',
            background: isSelected ? 'rgba(99, 91, 255, 0.04)' : '#fff',
            transition: 'all 0.15s ease',
            minHeight: 64
        },
        icon: {
            width: 36,
            height: 36,
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            fontSize: 14
        },
        content: {
            flex: 1,
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 4
        },
        title: {
            fontSize: 14,
            fontWeight: 500,
            color: '#0a2540',
            lineHeight: 1.3,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden'
        },
        tag: {
            fontSize: 11,
            padding: '2px 8px',
            margin: 0,
            border: '1px solid #e3e8ee',
            borderRadius: 4,
            background: '#f7f9fc',
            color: '#697386',
            display: 'inline-block',
            width: 'fit-content'
        }
    };

    const iconBg = record.category === 'cardiac'
        ? 'linear-gradient(135deg, #ff6b6b 0%, #ee5a5a 100%)'
        : 'linear-gradient(135deg, #635bff 0%, #00d4ff 100%)';

    return (
        <div
            style={styles.card}
            onClick={onClick}
            onMouseEnter={(e) => {
                if (!isSelected) {
                    e.currentTarget.style.borderColor = '#635bff';
                    e.currentTarget.style.background = 'rgba(99, 91, 255, 0.02)';
                }
            }}
            onMouseLeave={(e) => {
                if (!isSelected) {
                    e.currentTarget.style.borderColor = '#e3e8ee';
                    e.currentTarget.style.background = '#fff';
                }
            }}
        >
            {/* Icon */}
            <div style={{ ...styles.icon, background: iconBg }}>
                {record.category === 'cardiac'
                    ? <HeartOutlined style={{ color: '#fff' }} />
                    : <SoundOutlined style={{ color: '#fff' }} />
                }
            </div>

            {/* Content - always in column: title on top, tag below */}
            <div style={styles.content}>
                <div style={styles.title}>{record.name}</div>
                <Tag style={styles.tag}>{record.position}</Tag>
            </div>
        </div>
    );
}

export default SoundCard;
