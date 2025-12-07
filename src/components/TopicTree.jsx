import { useState, useCallback } from 'react';

function TopicTree({ onSelect, selectedCategory, systems = [] }) {
    // Track expanded nodes by their keys
    const [expandedNodes, setExpandedNodes] = useState({
        cardiology: true // Default expand cardiology
    });

    // Toggle expansion of a node
    const toggleNode = useCallback((nodeKey) => {
        setExpandedNodes(prev => ({
            ...prev,
            [nodeKey]: !prev[nodeKey]
        }));
    }, []);

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
        nodeButton: {
            display: 'flex',
            alignItems: 'center',
            width: '100%',
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            textAlign: 'left',
            transition: 'all 0.15s ease',
            borderRadius: 6,
            margin: '1px 0'
        },
        systemIcon: {
            width: 24,
            height: 24,
            borderRadius: 6,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 12,
            flexShrink: 0
        },
        chevron: {
            fontSize: 8,
            color: '#8898aa',
            transition: 'transform 0.2s ease',
            marginRight: 6,
            flexShrink: 0
        },
        divider: {
            height: 1,
            background: '#e3e8ee',
            margin: '8px 0'
        }
    };

    // Recursive tree node renderer
    const renderTreeNode = (node, depth = 0, systemKey = null, parentHasChildren = false) => {
        const isSystem = node.type === 'system';
        const isCategory = node.type === 'category';
        const isItem = node.type === 'item';
        const isSubtype = node.type === 'subtype';

        // Determine children based on node type
        let children = [];
        if (isSystem) children = node.categories || [];
        else if (isCategory) children = node.items || [];
        else children = node.subtypes || [];

        const hasChildren = children.length > 0;
        const isExpanded = expandedNodes[node.key];
        const isActive = selectedCategory === node.key;
        const currentSystemKey = isSystem ? node.key : systemKey;

        // Calculate padding based on depth
        const basePadding = isSystem ? 20 : 20;
        const indentPerLevel = 20;
        const paddingLeft = basePadding + (depth * indentPerLevel);

        // Get icon for systems
        const getSystemIcon = () => {
            if (!isSystem) return null;
            const iconBg = node.key === 'cardiology'
                ? 'linear-gradient(135deg, #ff6b6b 0%, #ee5a5a 100%)'
                : 'linear-gradient(135deg, #635bff 0%, #00d4ff 100%)';
            const iconEmoji = node.key === 'cardiology' ? '❤️' : '🫁';
            return (
                <span style={{ ...styles.systemIcon, background: iconBg }}>
                    {iconEmoji}
                </span>
            );
        };

        // Node styling based on type and state
        const getNodeStyle = () => {
            const baseStyle = {
                ...styles.nodeButton,
                paddingLeft,
                paddingRight: 12,
                paddingTop: isSystem ? 12 : (isCategory ? 10 : 8),
                paddingBottom: isSystem ? 12 : (isCategory ? 10 : 8),
                fontSize: isSystem ? 14 : (isCategory ? 13 : 12),
                fontWeight: isSystem ? 600 : (isActive ? 500 : 400),
                color: isActive ? '#635bff' : (isSystem ? '#0a2540' : '#3c4257'),
                gap: isSystem ? 10 : 6,
            };

            if (isActive && !isSystem) {
                baseStyle.background = 'rgba(99, 91, 255, 0.08)';
                baseStyle.color = '#635bff';
            }

            return baseStyle;
        };

        const handleClick = () => {
            if (hasChildren) {
                toggleNode(node.key);
            }
            // Always notify parent for selection (except systems just toggle)
            if (!isSystem) {
                onSelect(node.key, currentSystemKey);
            }
        };

        const handleMouseEnter = (e) => {
            if (!isActive || isSystem) {
                e.currentTarget.style.background = 'rgba(99, 91, 255, 0.04)';
            }
        };

        const handleMouseLeave = (e) => {
            if (!isActive) {
                e.currentTarget.style.background = 'transparent';
            } else if (!isSystem) {
                e.currentTarget.style.background = 'rgba(99, 91, 255, 0.08)';
            } else {
                e.currentTarget.style.background = 'transparent';
            }
        };

        return (
            <div key={node.key}>
                <button
                    style={getNodeStyle()}
                    onClick={handleClick}
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                >
                    {/* Chevron for expandable items */}
                    {hasChildren && (
                        <span style={{
                            ...styles.chevron,
                            transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)'
                        }}>
                            ▶
                        </span>
                    )}
                    {/* Empty space for alignment when no chevron */}
                    {!hasChildren && depth > 0 && (
                        <span style={{ width: 14, marginRight: 6, flexShrink: 0 }} />
                    )}

                    {/* System icon */}
                    {getSystemIcon()}

                    {/* Node name */}
                    <span style={{
                        flex: 1,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                    }}>
                        {node.name}
                    </span>

                    {/* Active indicator dot */}
                    {isActive && !isSystem && (
                        <span style={{
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            background: '#635bff',
                            marginLeft: 6,
                            flexShrink: 0
                        }} />
                    )}
                </button>

                {/* Render children if expanded */}
                {hasChildren && isExpanded && (
                    <div>
                        {children.map(child =>
                            renderTreeNode(child, depth + 1, currentSystemKey, hasChildren)
                        )}
                    </div>
                )}

                {/* Divider after systems */}
                {isSystem && <div style={styles.divider} />}
            </div>
        );
    };

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <span style={styles.title}>Аускультация</span>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
                {systems.map(system => renderTreeNode(system, 0))}
            </div>
        </div>
    );
}

export default TopicTree;
