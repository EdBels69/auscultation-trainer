import { useState } from 'react';
import { Layout, Menu, Typography, Button, Space, Dropdown, Avatar, Drawer, Grid, Tooltip } from 'antd';
import {
    BookOutlined, FileTextOutlined, SettingOutlined, ReadOutlined,
    MessageOutlined, UserOutlined, LogoutOutlined, BarChartOutlined,
    MenuOutlined, LineChartOutlined, BulbOutlined, BulbFilled
} from '@ant-design/icons';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import LanguageSwitcher from './LanguageSwitcher';

const { Header } = Layout;
const { Title, Text } = Typography;
const { useBreakpoint } = Grid;

function Navigation({ currentSection, onSectionChange, user, onLoginClick, onLogout }) {
    const { t } = useLanguage();
    const { isDark, toggleTheme } = useTheme();
    const screens = useBreakpoint();
    const isMobile = !screens.md;
    const [drawerOpen, setDrawerOpen] = useState(false);

    const isAdmin = user?.role === 'admin';

    const items = [
        { key: 'learning',  label: t('nav.learning'),    icon: <BookOutlined /> },
        { key: 'theory',    label: t('nav.theory'),      icon: <ReadOutlined /> },
        { key: 'test',      label: t('testing.title'),   icon: <FileTextOutlined /> },
        { key: 'chat',      label: t('nav.aiChat'),      icon: <MessageOutlined /> },
        ...(user ? [
            { key: 'profile', label: 'Мой прогресс',    icon: <LineChartOutlined /> },
        ] : []),
        ...(isAdmin ? [
            { key: 'dashboard', label: 'Дашборд',        icon: <BarChartOutlined /> },
            { key: 'admin',     label: t('nav.admin'),   icon: <SettingOutlined /> },
        ] : []),
    ];

    const handleMenuClick = ({ key }) => {
        onSectionChange(key);
        setDrawerOpen(false);
    };

    const userMenuItems = [
        {
            key: 'profile',
            label: user?.first_name || user?.email || t('admin.title'),
            disabled: true
        },
        { type: 'divider' },
        {
            key: 'logout',
            label: t('admin.logout'),
            icon: <LogoutOutlined />,
            onClick: onLogout
        }
    ];

    const logoStyle = {
        margin: 0,
        background: 'linear-gradient(135deg, #635bff 0%, #00d4ff 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
        fontWeight: 700,
        fontSize: '18px',
        whiteSpace: 'nowrap',
        flexShrink: 0,
    };

    const userBlock = user ? (
        <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
            <Space style={{ cursor: 'pointer' }}>
                <Avatar icon={<UserOutlined />} style={{ background: '#667eea' }} />
                {!isMobile && (
                    <Text style={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {[user.last_name, user.first_name].filter(Boolean).join(' ') || user.email?.split('@')[0]}
                    </Text>
                )}
            </Space>
        </Dropdown>
    ) : (
        <Button type="primary" onClick={onLoginClick}>
            {t('admin.login')}
        </Button>
    );

    const themeButton = (
        <Tooltip title={isDark ? 'Светлая тема' : 'Тёмная тема'}>
            <Button
                type="text"
                icon={isDark ? <BulbFilled style={{ color: '#faad14' }} /> : <BulbOutlined />}
                onClick={toggleTheme}
                style={{ fontSize: 16 }}
            />
        </Tooltip>
    );

    return (
        <Header style={{
            background: isDark ? undefined : '#fff',
            padding: isMobile ? '0 16px' : '0 40px',
            borderBottom: '1px solid rgba(0,0,0,0.06)',
            display: 'flex',
            alignItems: 'center',
            gap: isMobile ? '12px' : '32px',
            boxShadow: '0 1px 3px rgba(50,50,93,0.05), 0 1px 0 rgba(0,0,0,0.02)',
            position: 'sticky',
            top: 0,
            zIndex: 100,
        }}>
            {/* Логотип */}
            <Title level={4} style={logoStyle}>Аускультация</Title>

            {isMobile ? (
                /* ── Мобильная версия ─────────────────────────── */
                <>
                    {/* Горизонтальное меню скрыто — вместо него Drawer */}
                    <div style={{ flex: 1 }} />
                    {themeButton}
                    <LanguageSwitcher />
                    {userBlock}
                    <Button
                        icon={<MenuOutlined />}
                        type="text"
                        onClick={() => setDrawerOpen(true)}
                        style={{ fontSize: 18 }}
                    />
                    <Drawer
                        title="Меню"
                        placement="left"
                        width={240}
                        open={drawerOpen}
                        onClose={() => setDrawerOpen(false)}
                        bodyStyle={{ padding: 0 }}
                    >
                        <Menu
                            mode="inline"
                            selectedKeys={[currentSection]}
                            items={items}
                            onClick={handleMenuClick}
                            style={{ border: 'none', fontSize: 14 }}
                        />
                    </Drawer>
                </>
            ) : (
                /* ── Десктоп версия ───────────────────────────── */
                <>
                    <Menu
                        mode="horizontal"
                        selectedKeys={[currentSection]}
                        items={items}
                        onClick={handleMenuClick}
                        style={{ flex: 1, border: 'none', fontSize: 14, fontWeight: 500 }}
                    />
                    <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {themeButton}
                        <LanguageSwitcher />
                        {userBlock}
                    </div>
                </>
            )}
        </Header>
    );
}

export default Navigation;
