import { useState } from 'react';

function TopicTree({ onSelect, selectedCategory, systems = [] }) {
    const [expandedSystem, setExpandedSystem] = useState('cardiology');

    const styles = {
        container: {
            background: '#fafbfc',
            height: '100%',
            borderRight: '1px solid #e3e8ee',
            display: 'flex',
            flexDirection: 'column'
        },
        header: {
            padding: '20px 20px 16px',
            borderBottom: '1px solid #e3e8ee'
        },
        title: {
            fontSize: 11,
            fontWeight: 600,
            color: '#8898aa',
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
        },
        systemButton: {
            display: 'flex',
            alignItems: 'center',
            width: '100%',
            padding: '12px 20px',
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            fontSize: 14,
            fontWeight: 600,
            color: '#0a2540',
            textAlign: 'left',
            gap: 10,
            transition: 'background 0.15s'
        },
        systemIcon: {
            width: 24,
            height: 24,
            borderRadius: 6,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 12
        },
        categoryList: {
            padding: '4px 0'
        },
        categoryItem: {
            display: 'block',
            width: '100%',
            padding: '10px 20px 10px 54px',
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            fontSize: 13,
            color: '#3c4257',
            textAlign: 'left',
            transition: 'all 0.15s'
        },
        categoryItemActive: {
            color: '#635bff',
            fontWeight: 500,
            background: 'rgba(99, 91, 255, 0.06)'
        },
        divider: {
            height: 1,
            background: '#e3e8ee',
            margin: '8px 0'
        }
    };

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <span style={styles.title}>Аускультация</span>
            </div>

            <div style={{ flex: 1, overflowY: 'auto' }}>
                {systems.map((system) => {
                    const isExpanded = expandedSystem === system.key;
                    const iconBg = system.key === 'cardiology'
                        ? 'linear-gradient(135deg, #ff6b6b 0%, #ee5a5a 100%)'
                        : 'linear-gradient(135deg, #635bff 0%, #00d4ff 100%)';
                    const iconEmoji = system.key === 'cardiology' ? '❤️' : '🫁';

                    return (
                        <div key={system.key}>
                            {/* System Header */}
                            <button
                                style={{
                                    ...styles.systemButton,
                                    background: isExpanded ? 'rgba(0,0,0,0.02)' : 'transparent'
                                }}
                                onClick={() => setExpandedSystem(isExpanded ? null : system.key)}
                                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.02)'}
                                onMouseLeave={(e) => e.currentTarget.style.background = isExpanded ? 'rgba(0,0,0,0.02)' : 'transparent'}
                            >
                                <span style={{
                                    ...styles.systemIcon,
                                    background: iconBg
                                }}>
                                    {iconEmoji}
                                </span>
                                <span style={{ flex: 1 }}>
                                    {system.key === 'cardiology' ? 'Кардиология' : 'Пульмонология'}
                                </span>
                                <span style={{
                                    fontSize: 10,
                                    color: '#8898aa',
                                    transform: isExpanded ? 'rotate(90deg)' : 'rotate(0)',
                                    transition: 'transform 0.2s'
                                }}>▶</span>
                            </button>

                            {/* Categories */}
                            {isExpanded && (
                                <div style={styles.categoryList}>
                                    {(system.categories || []).map((category) => {
                                        const isActive = selectedCategory === category.key;
                                        return (
                                            <button
                                                key={category.key}
                                                style={{
                                                    ...styles.categoryItem,
                                                    ...(isActive ? styles.categoryItemActive : {})
                                                }}
                                                onClick={() => onSelect(category.key, system.key)}
                                                onMouseEnter={(e) => {
                                                    if (!isActive) {
                                                        e.currentTarget.style.color = '#635bff';
                                                        e.currentTarget.style.background = 'rgba(99, 91, 255, 0.03)';
                                                    }
                                                }}
                                                onMouseLeave={(e) => {
                                                    if (!isActive) {
                                                        e.currentTarget.style.color = '#3c4257';
                                                        e.currentTarget.style.background = 'transparent';
                                                    }
                                                }}
                                            >
                                                {category.name}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}

                            <div style={styles.divider} />
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default TopicTree;
