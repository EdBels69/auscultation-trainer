import { useState, useEffect } from 'react';
import { Layout, Menu, Typography, Drawer, Button, Avatar, Dropdown } from 'antd';
import {
    BookOutlined, FileTextOutlined, SettingOutlined,
    ReadOutlined, RobotOutlined, MenuOutlined,
    UserOutlined, LogoutOutlined, FormOutlined, ProfileOutlined,
    MessageOutlined,
} from '@ant-design/icons';

const { Header } = Layout;
const { Title } = Typography;

const ROLE_LABELS = {
    student: 'Студент',
    resident: 'Ординатор',
    doctor: 'Врач',
    teacher: 'Преподаватель',
};

function Navigation({ currentSection, onSectionChange, user, participant, onAuthClick, onSignOut }) {
    const [isMobile, setIsMobile] = useState(false);
    const [drawerOpen, setDrawerOpen] = useState(false);

    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth < 768);
        check();
        window.addEventListener('resize', check);
        return () => window.removeEventListener('resize', check);
    }, []);

    const items = [
        { key: 'learning', label: 'Обучение', icon: <BookOutlined /> },
        { key: 'theory', label: 'Теория', icon: <ReadOutlined /> },
        { key: 'test', label: 'Тест', icon: <FileTextOutlined /> },
        { key: 'aiquiz', label: 'ИИ-Квиз', icon: <RobotOutlined /> },
        { key: 'chat', label: 'ИИ-Чат', icon: <MessageOutlined /> },
        { key: 'surveys', label: 'Анкеты', icon: <FormOutlined /> },
        { key: 'admin', label: 'Управление', icon: <SettingOutlined /> },
    ];

    const handleSelect = ({ key }) => {
        onSectionChange(key);
        setDrawerOpen(false);
    };

    // Show participant info if available, otherwise fall back to auth user
    const isLoggedIn = !!(participant || user);
    const role = participant?.role || user?.user_metadata?.role;
    const name = participant?.full_name || user?.user_metadata?.full_name || user?.email || '';
    const participantCode = participant?.code;

    const userMenuItems = [
        {
            key: 'profile',
            label: 'Мой профиль',
            icon: <ProfileOutlined />,
            onClick: () => onSectionChange('profile'),
        },
        {
            key: 'surveys',
            label: 'Мои анкеты',
            icon: <FormOutlined />,
            onClick: () => onSectionChange('surveys'),
        },
        { type: 'divider' },
        {
            key: 'logout',
            label: 'Выйти',
            icon: <LogoutOutlined />,
            danger: true,
            onClick: onSignOut,
        },
    ];

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
                    🎧 {isMobile ? 'Аускультация' : 'Тренажёр аускультации'}
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
                    {isLoggedIn ? (
                        <Dropdown menu={{ items: userMenuItems }} placement="bottomRight" trigger={['click']}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                                <Avatar size={28} icon={<UserOutlined />} style={{ background: '#635bff' }} />
                                {!isMobile && (
                                    <div style={{ lineHeight: 1.3 }}>
                                        <div style={{ fontSize: 12, fontWeight: 600, color: '#0a2540' }}>
                                            {name.split(' ')[0] || 'Участник'}
                                        </div>
                                        {participantCode ? (
                                            <div style={{ fontSize: 10, color: '#635bff', fontFamily: 'monospace' }}>
                                                {participantCode}
                                            </div>
                                        ) : role && (
                                            <div style={{ fontSize: 10, color: '#8898aa' }}>
                                                {ROLE_LABELS[role] || role}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </Dropdown>
                    ) : (
                        <Button size="small" onClick={onAuthClick} style={{ fontSize: 12 }}>
                            Войти
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
                title="Меню"
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
                {!isLoggedIn && (
                    <div style={{ padding: '16px' }}>
                        <Button block onClick={() => { onAuthClick(); setDrawerOpen(false); }}>
                            Войти
                        </Button>
                    </div>
                )}
            </Drawer>
        </>
    );
}

export default Navigation;
