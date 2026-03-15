import React, { useState } from 'react';
import { Modal, Input, Tooltip, Segmented } from 'antd';
import * as Icons from '@ant-design/icons';

const { Search } = Input;

// Medical and common icons for selection
const ICON_LIST = [
    // Medical
    'HeartOutlined', 'HeartFilled', 'MedicineBoxOutlined', 'MedicineBoxFilled',
    'ExperimentOutlined', 'ExperimentFilled', 'AlertOutlined', 'AlertFilled',
    'SafetyCertificateOutlined', 'SafetyCertificateFilled',
    // Files & Folders
    'FileTextOutlined', 'FileTextFilled', 'FolderOutlined', 'FolderFilled',
    'FolderOpenOutlined', 'FolderOpenFilled', 'FileOutlined', 'FileFilled',
    'BookOutlined', 'BookFilled', 'ReadOutlined',
    // Education
    'BulbOutlined', 'BulbFilled', 'TrophyOutlined', 'TrophyFilled',
    'StarOutlined', 'StarFilled', 'FireOutlined', 'FireFilled',
    'ThunderboltOutlined', 'ThunderboltFilled', 'RocketOutlined', 'RocketFilled',
    // Sound & Media
    'SoundOutlined', 'SoundFilled', 'AudioOutlined', 'AudioFilled',
    'CustomerServiceOutlined', 'CustomerServiceFilled',
    'PlayCircleOutlined', 'PlayCircleFilled',
    // Misc
    'HomeOutlined', 'HomeFilled', 'SettingOutlined', 'SettingFilled',
    'InfoCircleOutlined', 'InfoCircleFilled', 'QuestionCircleOutlined',
    'CheckCircleOutlined', 'CheckCircleFilled', 'CloseCircleOutlined',
    'EyeOutlined', 'EyeFilled', 'TagOutlined', 'TagFilled',
    'PushpinOutlined', 'PushpinFilled', 'ClockCircleOutlined',
    'CalendarOutlined', 'ScheduleOutlined', 'ProfileOutlined',
    // Arrows & Shapes
    'RightCircleOutlined', 'DownCircleOutlined', 'UpCircleOutlined',
    'AppstoreOutlined', 'AppstoreFilled', 'DatabaseOutlined', 'DatabaseFilled',
];

// Emoji list with categories
const EMOJI_LIST = [
    // Medical & Body
    { emoji: '❤️', name: 'Сердце' },
    { emoji: '🫀', name: 'Анатомическое сердце' },
    { emoji: '🫁', name: 'Лёгкие' },
    { emoji: '🧠', name: 'Мозг' },
    { emoji: '🦷', name: 'Зуб' },
    { emoji: '🦴', name: 'Кость' },
    { emoji: '👁️', name: 'Глаз' },
    { emoji: '👂', name: 'Ухо' },
    { emoji: '👃', name: 'Нос' },
    { emoji: '🩺', name: 'Стетоскоп' },
    { emoji: '💉', name: 'Шприц' },
    { emoji: '💊', name: 'Таблетка' },
    { emoji: '🩹', name: 'Пластырь' },
    { emoji: '🩻', name: 'Рентген' },
    { emoji: '🧬', name: 'ДНК' },
    { emoji: '🔬', name: 'Микроскоп' },
    { emoji: '🧪', name: 'Пробирка' },
    { emoji: '⚕️', name: 'Медицина' },
    { emoji: '🏥', name: 'Больница' },
    { emoji: '🚑', name: 'Скорая' },
    // Education & Learning
    { emoji: '📚', name: 'Книги' },
    { emoji: '📖', name: 'Книга' },
    { emoji: '📝', name: 'Заметка' },
    { emoji: '✏️', name: 'Карандаш' },
    { emoji: '🎓', name: 'Выпускник' },
    { emoji: '🧑‍⚕️', name: 'Врач' },
    { emoji: '👨‍🔬', name: 'Учёный' },
    { emoji: '📋', name: 'Планшет' },
    { emoji: '📊', name: 'Диаграмма' },
    { emoji: '📈', name: 'График' },
    // Sound & Audio
    { emoji: '🔊', name: 'Звук' },
    { emoji: '🎧', name: 'Наушники' },
    { emoji: '🎵', name: 'Нота' },
    { emoji: '🎶', name: 'Ноты' },
    { emoji: '🔔', name: 'Колокол' },
    // Symbols & Misc
    { emoji: '⭐', name: 'Звезда' },
    { emoji: '✅', name: 'Галочка' },
    { emoji: '❌', name: 'Крестик' },
    { emoji: '⚠️', name: 'Внимание' },
    { emoji: '💡', name: 'Лампочка' },
    { emoji: '🎯', name: 'Цель' },
    { emoji: '🏆', name: 'Кубок' },
    { emoji: '📁', name: 'Папка' },
    { emoji: '📂', name: 'Открытая папка' },
    { emoji: '🔍', name: 'Поиск' },
    { emoji: '⚙️', name: 'Настройки' },
    { emoji: '🔗', name: 'Ссылка' },
    { emoji: '💬', name: 'Сообщение' },
];

function IconPicker({ visible, onClose, onSelect, currentIcon }) {
    const [searchQuery, setSearchQuery] = useState('');
    const [mode, setMode] = useState('emoji');

    const filteredIcons = ICON_LIST.filter(name =>
        name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredEmojis = EMOJI_LIST.filter(item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const renderIcon = (iconName) => {
        const IconComponent = Icons[iconName];
        if (!IconComponent) return null;
        return <IconComponent style={{ fontSize: 24 }} />;
    };

    const isSelected = (value) => currentIcon === value;

    const itemStyle = (value) => ({
        padding: 12,
        borderRadius: 8,
        cursor: 'pointer',
        background: isSelected(value) ? '#667eea' : '#f5f5f5',
        color: isSelected(value) ? '#fff' : '#333',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        transition: 'all 0.2s',
        fontSize: mode === 'emoji' ? 24 : 'inherit',
    });

    return (
        <Modal
            title="Выберите иконку"
            open={visible}
            onCancel={onClose}
            footer={null}
            width={500}
        >
            <Segmented
                value={mode}
                onChange={setMode}
                options={[
                    { label: '😊 Эмодзи', value: 'emoji' },
                    { label: '🎨 Иконки', value: 'icons' },
                ]}
                block
                style={{ marginBottom: 12 }}
            />
            <Search
                placeholder="Поиск..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ marginBottom: 16 }}
                allowClear
            />
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(8, 1fr)',
                gap: 8,
                maxHeight: 350,
                overflowY: 'auto'
            }}>
                {mode === 'emoji' ? (
                    filteredEmojis.map((item) => (
                        <Tooltip key={item.emoji} title={item.name}>
                            <div
                                onClick={() => { onSelect(item.emoji); onClose(); }}
                                style={itemStyle(item.emoji)}
                                onMouseEnter={(e) => {
                                    if (!isSelected(item.emoji)) {
                                        e.currentTarget.style.background = '#e6f7ff';
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (!isSelected(item.emoji)) {
                                        e.currentTarget.style.background = '#f5f5f5';
                                    }
                                }}
                            >
                                {item.emoji}
                            </div>
                        </Tooltip>
                    ))
                ) : (
                    filteredIcons.map((iconName) => (
                        <Tooltip key={iconName} title={iconName.replace(/Outlined|Filled/g, '')}>
                            <div
                                onClick={() => { onSelect(iconName); onClose(); }}
                                style={itemStyle(iconName)}
                                onMouseEnter={(e) => {
                                    if (!isSelected(iconName)) {
                                        e.currentTarget.style.background = '#e6f7ff';
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (!isSelected(iconName)) {
                                        e.currentTarget.style.background = '#f5f5f5';
                                    }
                                }}
                            >
                                {renderIcon(iconName)}
                            </div>
                        </Tooltip>
                    ))
                )}
            </div>
        </Modal>
    );
}

// Helper to render icon by name (supports both Ant icons and emojis)
export function renderIconByName(iconName, style = {}) {
    if (!iconName) return null;

    // Check if it's an emoji (not an Ant Design icon name)
    const isEmoji = !iconName.includes('Outlined') && !iconName.includes('Filled');

    if (isEmoji) {
        return <span style={{ fontSize: 20, ...style }}>{iconName}</span>;
    }

    const IconComponent = Icons[iconName];
    if (!IconComponent) return null;
    return <IconComponent style={style} />;
}

export default IconPicker;
