import { useState, useEffect, useMemo } from 'react';
import { Row, Col, Typography, Empty, Drawer, Button, Tag, Spin } from 'antd';
import { MenuOutlined } from '@ant-design/icons';
import SoundCard from './SoundCard';
import TopicTree from './TopicTree';
import { getLearningNodes } from '../services/api';
import { buildLearningTree } from '../utils/structureUtils';
import AudioPlayer from './AudioPlayer';

const { Title, Text } = Typography;

function LearningSection({ audioRecords }) {
    const [structure, setStructure] = useState({ systems: [] });
    const [loading, setLoading] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState('heart_sounds');
    const [selectedSystem, setSelectedSystem] = useState('cardiology');
    const [selectedSubFilter, setSelectedSubFilter] = useState(null);
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

    // Get current category data
    const currentSystem = structure.systems.find(s => s.key === selectedSystem);
    const currentCategory = currentSystem?.categories?.find(c => c.key === selectedCategory);

    // Get items (sub-filters) for the current category
    const subFilters = currentCategory?.items || [];

    // Filter audio records based on selected system and subfilter (memoized)
    const filteredRecords = useMemo(() => {
        return audioRecords.filter(r => {
            // Only show complete records (with audio, image, and description)
            const hasAudio = r.audioUrl && r.audioUrl !== '';
            const hasImage = r.imageUrl && r.imageUrl !== '';
            const hasDescription = r.description && r.description.trim() !== '';
            if (!hasAudio || !hasImage || !hasDescription) return false;

            // First: check system (cardiac/pulmonary)
            let requiredCategory = null;
            if (selectedSystem === 'cardiology') requiredCategory = 'cardiac';
            else if (selectedSystem === 'pulmonology') requiredCategory = 'pulmonary';

            if (requiredCategory && r.category !== requiredCategory) return false;

            // If a specific sub-filter (Item level) is selected, filter by linkedNodeKey
            if (selectedSubFilter) {
                if (r.linkedNodeKey === selectedSubFilter) return true;
                // Check subtypes of the selected item
                const itemConfig = subFilters.find(f => f.key === selectedSubFilter);
                if (itemConfig && itemConfig.subtypes) {
                    const isSubtypeMatch = itemConfig.subtypes.some(sub =>
                        typeof sub === 'string' ? false : r.linkedNodeKey === sub.key
                    );
                    if (isSubtypeMatch) return true;
                }
                return false;
            }

            // Filter by category - check if linkedNodeKey matches category or any of its items/subtypes
            if (currentCategory) {
                // Check if linked to the category itself
                if (r.linkedNodeKey === currentCategory.key) return true;

                // Check if linked to any item in the category
                if (currentCategory.items) {
                    for (const item of currentCategory.items) {
                        if (r.linkedNodeKey === item.key) return true;
                        // Check subtypes
                        if (item.subtypes) {
                            const isSubtypeMatch = item.subtypes.some(sub =>
                                typeof sub === 'string' ? false : r.linkedNodeKey === sub.key
                            );
                            if (isSubtypeMatch) return true;
                        }
                    }
                }
                return false;
            }

            return true;
        });
    }, [audioRecords, selectedSystem, selectedSubFilter, subFilters, currentCategory]);

    // Get first record ID for stable comparison
    const firstRecordId = filteredRecords.length > 0 ? filteredRecords[0].id : null;

    // Auto-select first audio (only when category/filter changes)
    useEffect(() => {
        if (loading) return;

        // If no selection or selection not in current list, select first
        if (!selectedAudio || !filteredRecords.find(r => r.id === selectedAudio.id)) {
            setSelectedAudio(filteredRecords[0] || null);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedCategory, selectedSystem, selectedSubFilter, loading, firstRecordId]);

    const handleCategorySelect = (categoryKey, systemKey) => {
        setSelectedCategory(categoryKey);
        setSelectedSystem(systemKey);
        setSelectedSubFilter(null);
        setMobileMenuOpen(false);
    };

    // Styles
    const styles = {
        layout: {
            display: 'flex',
            minHeight: 'calc(100vh - 64px)'
        },
        sidebar: {
            width: 260,
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
            marginBottom: 8
        },
        breadcrumbLink: {
            color: '#635bff',
            cursor: 'pointer'
        },
        filterBar: {
            display: 'flex',
            gap: 8,
            flexWrap: 'wrap',
            marginBottom: 24,
            paddingBottom: 16,
            borderBottom: '1px solid #e3e8ee'
        },
        filterChip: {
            cursor: 'pointer',
            borderRadius: 16,
            fontSize: 12,
            padding: '4px 12px',
            border: '1px solid #e3e8ee',
            background: '#fff',
            color: '#3c4257',
            transition: 'all 0.15s'
        },
        filterChipActive: {
            background: '#635bff',
            borderColor: '#635bff',
            color: '#fff'
        }
    };

    if (loading) {
        return <div style={{ padding: 50, textAlign: 'center' }}><Spin size="large" /></div>;
    }

    return (
        <div style={styles.layout}>
            {/* Desktop Sidebar */}
            {!isMobile && (
                <div style={styles.sidebar}>
                    <TopicTree
                        onSelect={handleCategorySelect}
                        selectedCategory={selectedCategory}
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
                    onSelect={handleCategorySelect}
                    selectedCategory={selectedCategory}
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

                {/* Header with breadcrumb */}
                <div style={styles.header}>
                    <div style={styles.breadcrumb}>
                        <span style={styles.breadcrumbLink}>
                            {selectedSystem === 'cardiology' ? 'Кардиология' : 'Пульмонология'}
                        </span>
                        <span> / </span>
                        <span>{currentCategory?.name || 'Выберите категорию'}</span>
                    </div>
                    <Title level={3} style={{ margin: 0, color: '#0a2540' }}>
                        {currentCategory?.name || 'Обучение'}
                    </Title>
                </div>

                {/* Sub-filter chips */}
                {subFilters.length > 0 && (
                    <div style={styles.filterBar}>
                        {subFilters.map((item) => (
                            <Tag
                                key={item.key}
                                style={{
                                    ...styles.filterChip,
                                    ...(selectedSubFilter === item.key ? styles.filterChipActive : {})
                                }}
                                onClick={() => setSelectedSubFilter(item.key)}
                            >
                                {item.name}
                            </Tag>
                        ))}
                    </div>
                )}

                {/* Content Grid */}
                {filteredRecords.length === 0 ? (
                    <Empty
                        description="Нет записей в этой категории"
                        style={{ marginTop: 64 }}
                    />
                ) : (
                    <div style={{ display: 'flex', gap: 32 }}>
                        {/* Cards List */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: 360, flexShrink: 0 }}>
                            {filteredRecords.map((record) => (
                                <SoundCard
                                    key={record.id}
                                    record={record}
                                    isSelected={selectedAudio?.id === record.id}
                                    onClick={() => setSelectedAudio(record)}
                                />
                            ))}
                        </div>

                        {/* Description Panel */}
                        {selectedAudio && (
                            <div style={{
                                flex: 1,
                                padding: 24,
                                background: '#fafbfc',
                                borderRadius: 12,
                                border: '1px solid #e3e8ee',
                                alignSelf: 'flex-start'
                            }}>
                                <div style={{
                                    fontSize: 11,
                                    fontWeight: 600,
                                    color: '#8898aa',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em',
                                    marginBottom: 12
                                }}>
                                    Описание
                                </div>
                                <h4 style={{
                                    fontSize: 16,
                                    fontWeight: 600,
                                    color: '#0a2540',
                                    marginBottom: 12,
                                    marginTop: 0
                                }}>
                                    {selectedAudio.name}
                                </h4>
                                <p style={{
                                    fontSize: 14,
                                    color: '#3c4257',
                                    lineHeight: 1.7,
                                    margin: 0
                                }}>
                                    {selectedAudio.description}
                                </p>

                                {/* Auscultation Point with Image */}
                                <div style={{
                                    marginTop: 24,
                                    padding: 20,
                                    background: '#fff',
                                    borderRadius: 8,
                                    border: '1px dashed #e3e8ee',
                                    textAlign: 'center'
                                }}>
                                    {selectedAudio.imageUrl ? (
                                        <img
                                            src={selectedAudio.imageUrl}
                                            alt={`Точка аускультации: ${selectedAudio.position}`}
                                            style={{
                                                maxWidth: '100%',
                                                maxHeight: 300,
                                                borderRadius: 8,
                                                marginBottom: 12,
                                                objectFit: 'contain'
                                            }}
                                        />
                                    ) : (
                                        <div style={{ fontSize: 28, marginBottom: 8 }}>🩺</div>
                                    )}
                                    <div style={{ fontSize: 12, color: '#697386' }}>
                                        Точка аускультации
                                    </div>
                                    <div style={{ fontSize: 13, color: '#0a2540', fontWeight: 500, marginTop: 4 }}>
                                        {selectedAudio.position}
                                    </div>
                                </div>

                                {/* Audio Player */}
                                {selectedAudio.audioUrl && (
                                    <div style={{ marginTop: 20 }}>
                                        <AudioPlayer
                                            audioUrl={selectedAudio.audioUrl}
                                        />
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export default LearningSection;
