import { useState, useEffect, useMemo, useCallback } from 'react';
import { Typography, Empty, Drawer, Button, Spin } from 'antd';
import { MenuOutlined, DownOutlined, UpOutlined } from '@ant-design/icons';

import TopicTree from './TopicTree';
import { getLearningNodes } from '../services/api';
import { buildLearningTree } from '../utils/structureUtils';
import AudioPlayer from './AudioPlayer';

const { Title } = Typography;

/** Collapsible description block — shows first ~200px, expandable */
function CollapsibleDescription({ text }) {
    const [expanded, setExpanded] = useState(false);
    const MAX_HEIGHT = 180;

    if (!text) return null;

    return (
        <div style={{ position: 'relative' }}>
            <div style={{
                fontSize: 15,
                lineHeight: 1.7,
                color: '#3c4257',
                padding: '16px 20px',
                background: '#f8f9fa',
                borderRadius: 8,
                borderLeft: '4px solid #635bff',
                maxHeight: expanded ? 'none' : MAX_HEIGHT,
                overflow: 'hidden',
                transition: 'max-height 0.3s ease',
            }}>
                {text}
            </div>
            {!expanded && text.length > 400 && (
                <div style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: 48,
                    background: 'linear-gradient(transparent, #f8f9fa)',
                    borderRadius: '0 0 8px 8px',
                    pointerEvents: 'none',
                }} />
            )}
            {text.length > 400 && (
                <Button
                    type="link"
                    size="small"
                    onClick={() => setExpanded(!expanded)}
                    style={{ padding: '4px 0', fontSize: 13 }}
                    icon={expanded ? <UpOutlined /> : <DownOutlined />}
                >
                    {expanded ? 'Свернуть' : 'Показать полностью'}
                </Button>
            )}
        </div>
    );
}

function LearningSection({ audioRecords }) {
    const [structure, setStructure] = useState({ systems: [] });
    const [loading, setLoading] = useState(true);
    const [selectedNodeKey, setSelectedNodeKey] = useState('heart_sounds');
    const [selectedSystem, setSelectedSystem] = useState('cardiology');
    const [selectedAudio, setSelectedAudio] = useState(null);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 992);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Load structure
    useEffect(() => {
        const loadStructure = async () => {
            try {
                const nodes = await getLearningNodes();
                // Filter out hidden nodes for client view
                const visibleNodes = nodes.filter(n => !n.is_hidden);
                const tree = buildLearningTree(visibleNodes);
                setStructure(tree);
                setLoading(false);
            } catch (error) {
                console.error("Failed to load structure", error);
                setLoading(false);
            }
        };
        loadStructure();
    }, []);

    // Find node by key recursively
    const findNodeByKey = useCallback((nodes, key) => {
        for (const node of nodes) {
            if (node.key === key) return node;
            // Check categories
            if (node.categories) {
                const found = findNodeByKey(node.categories, key);
                if (found) return found;
            }
            // Check items
            if (node.items) {
                const found = findNodeByKey(node.items, key);
                if (found) return found;
            }
            // Check subtypes
            if (node.subtypes) {
                const found = findNodeByKey(node.subtypes, key);
                if (found) return found;
            }
        }
        return null;
    }, []);

    // Get current selected node
    const currentNode = useMemo(() => {
        return findNodeByKey(structure.systems, selectedNodeKey);
    }, [structure.systems, selectedNodeKey, findNodeByKey]);

    // Build breadcrumb path
    const getBreadcrumbPath = useCallback((nodes, targetKey, path = []) => {
        for (const node of nodes) {
            const newPath = [...path, node];
            if (node.key === targetKey) return newPath;

            const childArrays = [node.categories, node.items, node.subtypes].filter(Boolean);
            for (const children of childArrays) {
                const found = getBreadcrumbPath(children, targetKey, newPath);
                if (found) return found;
            }
        }
        return null;
    }, []);

    const breadcrumbPath = useMemo(() => {
        return getBreadcrumbPath(structure.systems, selectedNodeKey) || [];
    }, [structure.systems, selectedNodeKey, getBreadcrumbPath]);

    // Рекурсивная проверка - ищем совпадение по ключу во всех потомках
    const matchesNodeOrDescendants = useCallback((node, targetKey) => {
        if (!node) return false;
        if (node.key === targetKey) return true;
        // Проверяем items (подкатегории)
        if (node.items) {
            for (const item of node.items) {
                if (matchesNodeOrDescendants(item, targetKey)) return true;
            }
        }
        // Проверяем subtypes (подтипы)
        if (node.subtypes) {
            for (const sub of node.subtypes) {
                if (typeof sub === 'object' && matchesNodeOrDescendants(sub, targetKey)) return true;
            }
        }
        // Проверяем categories
        if (node.categories) {
            for (const cat of node.categories) {
                if (matchesNodeOrDescendants(cat, targetKey)) return true;
            }
        }
        return false;
    }, []);

    // Filter audio records based on selected node (memoized)
    const filteredRecords = useMemo(() => {
        return audioRecords.filter(r => {
            // Only show records with audio file
            const hasAudio = r.audioUrl && r.audioUrl !== '';
            if (!hasAudio) return false;

            // Check system (cardiac/pulmonary)
            let requiredCategory = null;
            if (selectedSystem === 'cardiology') requiredCategory = 'cardiac';
            else if (selectedSystem === 'pulmonology') requiredCategory = 'pulmonary';

            if (requiredCategory && r.category !== requiredCategory) return false;

            // Filter by selected node - ONLY show records linked DIRECTLY to this node
            if (selectedNodeKey && r.linkedNodeKey !== selectedNodeKey) {
                return false;
            }

            return true;
        });
    }, [audioRecords, selectedSystem, selectedNodeKey]);

    // Get first record ID for stable comparison
    const firstRecordId = filteredRecords.length > 0 ? filteredRecords[0].id : null;

    // Auto-select first audio (only when node changes)
    useEffect(() => {
        if (loading) return;

        // If no selection or selection not in current list, select first
        if (!selectedAudio || !filteredRecords.find(r => r.id === selectedAudio.id)) {
            setSelectedAudio(filteredRecords[0] || null);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedNodeKey, selectedSystem, loading, firstRecordId]);

    const handleNodeSelect = (nodeKey, systemKey) => {
        setSelectedNodeKey(nodeKey);
        setSelectedSystem(systemKey);
        setMobileMenuOpen(false);
    };

    // Styles
    const styles = {
        layout: {
            display: 'flex',
            minHeight: 'calc(100vh - 64px)'
        },
        sidebar: {
            width: 280,
            flexShrink: 0,
            position: 'sticky',
            top: 64,
            height: 'calc(100vh - 64px)'
        },
        main: {
            flex: 1,
            padding: isMobile ? '24px 16px' : '32px 40px',
            paddingBottom: 32,
            background: '#fff',
            minWidth: 0
        },
        header: {
            marginBottom: 24
        },
        breadcrumb: {
            fontSize: 13,
            color: '#697386',
            marginBottom: 8,
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: 4
        },
        breadcrumbLink: {
            color: '#635bff',
            cursor: 'pointer',
            transition: 'opacity 0.15s'
        },
        breadcrumbSeparator: {
            color: '#8898aa',
            margin: '0 2px'
        }
    };

    if (loading) {
        return <div style={{ padding: 50, textAlign: 'center' }}><Spin size="large" /></div>;
    }

    // Get display name for system
    const getSystemName = (key) => {
        if (key === 'cardiology') return 'Кардиология';
        if (key === 'pulmonology') return 'Пульмонология';
        return key;
    };

    // Derived data from the first record (representative of the topic)
    const topicRecord = filteredRecords.length > 0 ? filteredRecords[0] : null;

    return (
        <div style={styles.layout}>
            {/* Desktop Sidebar */}
            {!isMobile && (
                <div style={styles.sidebar}>
                    <TopicTree
                        onSelect={handleNodeSelect}
                        selectedCategory={selectedNodeKey}
                        systems={structure.systems}
                    />
                </div>
            )}

            {/* Mobile Drawer */}
            <Drawer
                placement="left"
                onClose={() => setMobileMenuOpen(false)}
                open={mobileMenuOpen}
                bodyStyle={{ padding: 0 }}
                width={280}
            >
                <TopicTree
                    onSelect={handleNodeSelect}
                    selectedCategory={selectedNodeKey}
                    systems={structure.systems}
                />
            </Drawer>

            {/* Main Content */}
            <div style={styles.main}>
                {/* Mobile Menu Button */}
                {isMobile && (
                    <Button
                        icon={<MenuOutlined />}
                        onClick={() => setMobileMenuOpen(true)}
                        style={{ marginBottom: 16 }}
                    >
                        Меню
                    </Button>
                )}

                {/* Breadcrumbs */}
                <div style={styles.header}>
                    <div style={styles.breadcrumb}>
                        {breadcrumbPath.map((node, index) => (
                            <span key={node.key} style={{ display: 'flex', alignItems: 'center' }}>
                                {index > 0 && <span style={styles.breadcrumbSeparator}>/</span>}
                                {index === breadcrumbPath.length - 1 ? (
                                    <span style={{ color: '#3c4257' }}>
                                        {node.type === 'system' ? getSystemName(node.key) : node.name}
                                    </span>
                                ) : (
                                    <span
                                        style={styles.breadcrumbLink}
                                        onClick={() => handleNodeSelect(node.key, selectedSystem)}
                                        onMouseEnter={(e) => e.target.style.opacity = '0.7'}
                                        onMouseLeave={(e) => e.target.style.opacity = '1'}
                                    >
                                        {node.type === 'system' ? getSystemName(node.key) : node.name}
                                    </span>
                                )}
                            </span>
                        ))}
                    </div>
                </div>

                {/* Content View */}
                {(() => {
                    // Check if current node has children (is a folder)
                    const hasChildren = currentNode && (
                        (currentNode.categories && currentNode.categories.length > 0) ||
                        (currentNode.items && currentNode.items.length > 0) ||
                        (currentNode.subtypes && currentNode.subtypes.length > 0)
                    );

                    // Get children array
                    const getChildren = () => {
                        if (!currentNode) return [];
                        return [
                            ...(currentNode.categories || []),
                            ...(currentNode.items || []),
                            ...(currentNode.subtypes || [])
                        ];
                    };

                    // FOLDER VIEW: Show description + child navigation cards
                    // If node has children, always show folder view (not audio records)
                    if (hasChildren) {
                        const children = getChildren();
                        return (
                            <div style={{ maxWidth: 900 }}>
                                {/* Folder Title */}
                                <Title level={2} style={{ marginTop: 0, marginBottom: 16, color: '#0a2540' }}>
                                    {currentNode?.name || 'Раздел'}
                                </Title>

                                {/* Folder Description (from learning_nodes) */}
                                {currentNode?.description && (
                                    <div style={{ marginBottom: 32 }}>
                                        <CollapsibleDescription text={currentNode.description} />
                                    </div>
                                )}

                                {/* Child Navigation Cards */}
                                <div style={{
                                    fontSize: 13,
                                    fontWeight: 600,
                                    color: '#8898aa',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em',
                                    marginBottom: 16
                                }}>
                                    Подразделы ({children.length})
                                </div>

                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                                    gap: 16
                                }}>
                                    {children.map((child) => (
                                        <div
                                            key={child.key}
                                            onClick={() => handleNodeSelect(child.key, selectedSystem)}
                                            className="stripe-card"
                                            style={{
                                                padding: 20,
                                                background: '#fff',
                                                border: '1px solid #e3e8ee',
                                                borderRadius: 12,
                                                cursor: 'pointer'
                                            }}
                                        >
                                            <div style={{
                                                fontSize: 15,
                                                fontWeight: 600,
                                                color: '#0a2540',
                                                marginBottom: 4
                                            }}>
                                                {child.name}
                                            </div>
                                            <div style={{
                                                fontSize: 12,
                                                color: '#8898aa'
                                            }}>
                                                →  Открыть
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    }

                    // LEAF VIEW: Node without children - show audio records directly
                    if (currentNode && !hasChildren) {
                        return (
                            <div>
                                {/* 1. Header: Topic Name from Node */}
                                <Title level={2} style={{ marginTop: 0, marginBottom: 24, color: '#0a2540' }}>
                                    {currentNode.name}
                                </Title>

                                {/* 2. Two-column layout: Description + Image */}
                                {(currentNode.description || currentNode.image_url) && (
                                    <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: currentNode.description && currentNode.image_url
                                            ? '1fr 1fr'
                                            : '1fr',
                                        gap: 24,
                                        marginBottom: 32,
                                        alignItems: 'start'
                                    }}>
                                        {/* Description */}
                                        {currentNode.description && (
                                            <CollapsibleDescription text={currentNode.description} />
                                        )}

                                        {/* Auscultation Image */}
                                        {currentNode.image_url && (
                                            <div style={{
                                                background: '#fff',
                                                border: '1px solid #e3e8ee',
                                                borderRadius: 8,
                                                padding: 16,
                                                display: 'flex',
                                                justifyContent: 'center',
                                                alignItems: 'center'
                                            }}>
                                                <img
                                                    src={currentNode.image_url}
                                                    alt={currentNode.name}
                                                    style={{
                                                        maxWidth: '100%',
                                                        maxHeight: 350,
                                                        objectFit: 'contain',
                                                        borderRadius: 4
                                                    }}
                                                />
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* 3. Audiogram from Node (above audio list) */}
                                {currentNode.audiogram_url && (
                                    <div style={{ marginBottom: 24 }}>
                                        <div style={{
                                            fontSize: 13,
                                            fontWeight: 600,
                                            color: '#8898aa',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.05em',
                                            marginBottom: 12
                                        }}>
                                            Аудиограмма
                                        </div>
                                        <div style={{
                                            background: '#fff',
                                            border: '1px solid #e3e8ee',
                                            borderRadius: 8,
                                            padding: 16,
                                            display: 'flex',
                                            justifyContent: 'center',
                                            alignItems: 'center'
                                        }}>
                                            <img
                                                src={currentNode.audiogram_url}
                                                alt="Аудиограмма"
                                                style={{
                                                    maxWidth: '100%',
                                                    maxHeight: 120,
                                                    objectFit: 'contain',
                                                    borderRadius: 4
                                                }}
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* 4. Audio List */}
                                {filteredRecords.length > 0 ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                        <div style={{
                                            fontSize: 13,
                                            fontWeight: 600,
                                            color: '#8898aa',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.05em',
                                            marginBottom: 8
                                        }}>
                                            Аудиозаписи ({filteredRecords.length})
                                        </div>

                                        {filteredRecords.map((record) => (
                                            <div
                                                key={record.id}
                                                className="audio-card"
                                                style={{
                                                    background: '#fff',
                                                    border: '1px solid #e3e8ee',
                                                    borderRadius: 10,
                                                    padding: '14px 16px'
                                                }}
                                            >
                                                {/* Compact header: icon + patient info + description */}
                                                <div style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 10,
                                                    marginBottom: 10
                                                }}>
                                                    <div style={{
                                                        width: 32,
                                                        height: 32,
                                                        borderRadius: 8,
                                                        background: record.category === 'cardiac'
                                                            ? 'linear-gradient(135deg, #ff6b6b, #ee5a5a)'
                                                            : 'linear-gradient(135deg, #635bff, #00d4ff)',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        flexShrink: 0,
                                                        fontSize: 14,
                                                        color: '#fff'
                                                    }}>
                                                        {record.category === 'cardiac' ? '♥' : '🫁'}
                                                    </div>
                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                        <div style={{
                                                            fontSize: 13,
                                                            fontWeight: 600,
                                                            color: '#0a2540',
                                                            lineHeight: 1.3,
                                                            whiteSpace: 'nowrap',
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis'
                                                        }}>
                                                            {record.position || 'Пациент'}
                                                        </div>
                                                        {record.description && (
                                                            <div style={{
                                                                fontSize: 12,
                                                                color: '#697386',
                                                                lineHeight: 1.3,
                                                                marginTop: 2,
                                                                whiteSpace: 'nowrap',
                                                                overflow: 'hidden',
                                                                textOverflow: 'ellipsis'
                                                            }}>
                                                                {record.description}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Player */}
                                                <AudioPlayer audioUrl={record.audioUrl} />
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div style={{
                                        padding: 24,
                                        background: '#fafbfc',
                                        borderRadius: 8,
                                        textAlign: 'center',
                                        color: '#8898aa'
                                    }}>
                                        Аудиозаписи пока не добавлены
                                    </div>
                                )}
                            </div>
                        );
                    }

                    // Empty state
                    return (
                        <Empty
                            description="Выберите тему или раздел для просмотра материалов"
                            style={{ marginTop: 64 }}
                        />
                    );
                })()}
            </div>
        </div>
    );
}

export default LearningSection;
