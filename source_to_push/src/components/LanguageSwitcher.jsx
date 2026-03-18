import React from 'react';
import { Button } from 'antd';
import { GlobalOutlined } from '@ant-design/icons';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';

function LanguageSwitcher() {
    const { language, toggleLanguage } = useLanguage();
    const { isDark } = useTheme();

    return (
        <Button
            icon={<GlobalOutlined />}
            onClick={toggleLanguage}
            type="text"
            style={{
                color: isDark ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.65)',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
            }}
        >
            {language === 'ru' ? 'EN' : 'RU'}
        </Button>
    );
}

export default LanguageSwitcher;
