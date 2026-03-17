import { useState, useEffect } from 'react';
import { Layout, Menu, Typography, Drawer, Button, Avatar, Dropdown } from 'antd';
import {
    BookOutlined, FileTextOutlined, SettingOutlined,
    ReadOutlined, RobotOutlined, MenuOutlined,
    UserOutlined, LogoutOutlined, FormOutlined, ProfileOutlined,
    MessageOutlined,
} from '@ant-design/icons';
import { useLanguage, tx } from '../contexts/LanguageContext';

const { Header } = Layout;
const { Title } = Typography;

const ROLE_LABELS = {
    student: { ru: 'Студент', en: 'Student' },
    resident: { ru: 'Ординатор', en: 'Resident' },
    doctor: { ru: 'Врач', en: 'Doctor' },
    teacher: { ru: 'Преподаватель', en: 'Teacher' },
};

function Navigation({ currentSection, onSectionChange, user, onAuthClick, onSignOut }) {
    const lang = useLanguage();
    const [isMobile, setIsMobile] = useState(false);
    const [drawerOpen, setDrawerOpen] = useState(false);

    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth < 768);
        check();
        window.addEventListener('resize', check);
        return () => window.removeEventListener('resize', check);
    }, []);

    const items = [
        { key: 'learning', label: tx(lang, 'Обучение', 'Learning'), icon: <BookOutlined /> },
        { key: 'theory', label: tx(lang, 'Теория', 'Theory'), icon: <ReadOutlined /> },
        { key: 'test', label: tx(lang, 'Тест', 'Test'), icon: <FileTextOutlined /> },
        { key: 'aiquiz', label: tx(lang, 'ИИ-Квиз', 'AI Quiz'), icon: <RobotOutlined /> },
        { key: 'chat', label: tx(lang, 'ИИ-Чат', 'AI Chat'), icon: <MessageOutlined /> },
        { key: 'surveys', label: tx(lang, 'Анкеты', 'Surveys'), icon: <FormOutlined /> },
        { key: 'admin', label: tx(lang, 'Управление', 'Management'), icon: <SettingOutlined /> },
    ];

    const handleSelect = ({ key }) => {
        onSectionChange(key);
        setDrawerOpen(false);
    };

    const role = user?.user_metadata?.role;
    const name = user?.user_metadata?.full_name || user?.email || '';

    const userMenuItems = [
        {
            key: 'profile',
            label: tx(lang, 'Мой профиль', 'My Profile'),
            icon: <ProfileOutlined />,
            onClick: () => onSectionChange('profile'),
        },
        {
            key: 'surveys',
            label: tx(lang, 'Мои анкеты', 'My Surveys'),
            icon: <FormOutlined />,
            onClick: () => onSectionChange('surveys'),
        },
        { type: 'divider' },
        {
            key: 'logout',
            label: tx(lang, 'Выйти', 'Log out'),
            icon: <LogoutOutlined />,
            danger: true,
            onClick: onSignOut,
        },
    ];

    // Language switcher URLs
    const langSwitcherUrl = lang === 'en'
        ? 'https://edbels9i.beget.tech'
        : 'https://en.edbels9i.beget.tech';

    return (
        <>
            <Header style={{
                background: '#fff',
                padding: isMobile ? '0 12px' : '0 20px',
                borderBottom: '1px solid rgba(0,0,0,0.06)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                boxShadow: '0 1px 3px rgba(50,50,93,0.05)',
                position: 'sticky',
                top: 0,
                zIndex: 100,
                height: 56,
                lineHeight: '56px',
                gap: 8,
            }}>
                {/* Logo */}
                <Title level={4} style={{
                    margin: 0,
                    background: 'linear-gradient(135deg, #635bff 0%, #00d4ff 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    fontWeight: 700,
                    fontSize: isMobile ? '14px' : '16px',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                }}>
                    🎧 {isMobile ? tx(lang, 'Аускультация', 'Auscultation') : tx(lang, 'Тренажёр аускультации', 'Auscultation Trainer')}
                </Title>

                {/* Desktop menu */}
                {!isMobile && (
                    <Menu
                        mode="horizontal"
                        selectedKeys={[currentSection]}
                        items={items}
                        onClick={handleSelect}
                        style={{ flex: 1, border: 'none', fontSize: 13, fontWeight: 500, marginLeft: 16 }}
                        overflowedIndicator={<MenuOutlined />}
                    />
                )}

                {/* User area */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    {/* Language switcher link */}
                    <a href={langSwitcherUrl} style={{
                        fontSize: 12,
                        color: '#8898aa',
                        textDecoration: 'none',
                        padding: '4px 8px',
                        borderRadius: 4,
                        transition: 'all 0.3s',
                    }} onMouseEnter={(e) => {
                        e.target.style.background = 'rgba(0,0,0,0.04)';
                        e.target.style.color = '#0a2540';
                    }} onMouseLeave={(e) => {
                        e.target.style.background = 'transparent';
                        e.target.style.color = '#8898aa';
                    }}>
                        {lang === 'en' ? '🇷🇺 RU' : '🇬🇧 EN'}
                    </a>

                    {user ? (
                        <Dropdown menu={{ items: userMenuItems }} placement="bottomRight" trigger={['click']}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                                <Avatar size={28} icon={<UserOutlined />} style={{ background: '#635bff' }} />
                                {!isMobile && (
                                    <div style={{ lineHeight: 1.3 }}>
                                        <div style={{ fontSize: 12, fontWeight: 600, color: '#0a2540' }}>
                                            {name.split(' ')[0] || tx(lang, 'Пользователь', 'User')}
                                        </div>
                                        {role && (
                                            <div style={{ fontSize: 10, color: '#8898aa' }}>
                                                {ROLE_LABELS[role]?.[lang] || ROLE_LABELS[role]?.ru || role}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </Dropdown>
                    ) : (
                        <Button size="small" onClick={onAuthClick} style={{ fontSize: 12 }}>
                            {tx(lang, 'Войти', 'Log in')}
                        </Button>
                    )}

                    {/* Mobile hamburger */}
                    {isMobile && (
                        <Button
                            type="text"
                            icon={<MenuOutlined style={{ fontSize: 18 }} />}
                            onClick={() => setDrawerOpen(true)}
                            style={{ padding: '4px 6px' }}
                        />
                    )}
                </div>
            </Header>

            {/* Mobile nav drawer */}
            <Drawer
                title={tx(lang, 'Меню', 'Menu')}
                placement="right"
                open={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                width={240}
                bodyStyle={{ padding: 0 }}
            >
                <Menu
                    mode="inline"
                    selectedKeys={[currentSection]}
                    items={items}
                    onClick={handleSelect}
                    style={{ border: 'none', fontSize: 14 }}
                />
                {!user && (
                    <div style={{ padding: '16px' }}>
                        <Button block onClick={() => { onAuthClick(); setDrawerOpen(false); }}>
                            {tx(lang, 'Войти / Зарегистрироваться', 'Log in / Register')}
                        </Button>
                    </div>
                )}
            </Drawer>
        </>
    );
}

export default Navigation;
