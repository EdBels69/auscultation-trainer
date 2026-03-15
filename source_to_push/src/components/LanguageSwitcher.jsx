import React from 'react';
import { Button } from 'antd';
import { GlobalOutlined } from '@ant-design/icons';
import { useLanguage } from '../contexts/LanguageContext';

function LanguageSwitcher() {
    const { language, toggleLanguage } = useLanguage();

    return (
        <Button
            icon={<GlobalOutlined />}
            onClick={toggleLanguage}
            type="text"
            style={{
                color: 'white',
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
