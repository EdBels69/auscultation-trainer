import React, { useState } from 'react';
import { Modal, Input, Tooltip } from 'antd';
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

function IconPicker({ visible, onClose, onSelect, currentIcon }) {
    const [searchQuery, setSearchQuery] = useState('');

    const filteredIcons = ICON_LIST.filter(name =>
        name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const renderIcon = (iconName) => {
        const IconComponent = Icons[iconName];
        if (!IconComponent) return null;
        return <IconComponent style={{ fontSize: 24 }} />;
    };

    return (
        <Modal
            title="Выберите иконку"
            open={visible}
            onCancel={onClose}
            footer={null}
            width={500}
        >
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
                maxHeight: 400,
                overflowY: 'auto'
            }}>
                {filteredIcons.map((iconName) => (
                    <Tooltip key={iconName} title={iconName.replace(/Outlined|Filled/g, '')}>
                        <div
                            onClick={() => { onSelect(iconName); onClose(); }}
                            style={{
                                padding: 12,
                                borderRadius: 8,
                                cursor: 'pointer',
                                background: currentIcon === iconName ? '#667eea' : '#f5f5f5',
                                color: currentIcon === iconName ? '#fff' : '#333',
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                                transition: 'all 0.2s',
                            }}
                            onMouseEnter={(e) => {
                                if (currentIcon !== iconName) {
                                    e.currentTarget.style.background = '#e6f7ff';
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (currentIcon !== iconName) {
                                    e.currentTarget.style.background = '#f5f5f5';
                                }
                            }}
                        >
                            {renderIcon(iconName)}
                        </div>
                    </Tooltip>
                ))}
            </div>
        </Modal>
    );
}

// Helper to render icon by name
export function renderIconByName(iconName, style = {}) {
    if (!iconName) return null;
    const IconComponent = Icons[iconName];
    if (!IconComponent) return null;
    return <IconComponent style={style} />;
}

export default IconPicker;
