import { Layout, Menu, Typography, Button, Space, Dropdown, Avatar } from 'antd';
import { BookOutlined, FileTextOutlined, SettingOutlined, ReadOutlined, MessageOutlined, UserOutlined, LogoutOutlined, BarChartOutlined } from '@ant-design/icons';
import { useLanguage } from '../contexts/LanguageContext';
import LanguageSwitcher from './LanguageSwitcher';

const { Header } = Layout;
const { Title, Text } = Typography;

function Navigation({ currentSection, onSectionChange, user, onLoginClick, onLogout }) {
    const { t } = useLanguage();

    const isAdmin = user?.role === 'admin';

    const items = [
        { key: 'learning', label: t('nav.learning'), icon: <BookOutlined /> },
        { key: 'theory', label: t('nav.theory'), icon: <ReadOutlined /> },
        { key: 'test', label: t('testing.title'), icon: <FileTextOutlined /> },
        { key: 'chat', label: t('nav.aiChat'), icon: <MessageOutlined /> },
        ...(isAdmin ? [
            { key: 'dashboard', label: 'Дашборд', icon: <BarChartOutlined /> },
            { key: 'admin', label: t('nav.admin'), icon: <SettingOutlined /> },
        ] : []),
    ];

    const userMenuItems = [
        {
            key: 'profile',
            label: user?.display_name || user?.email || t('admin.title'),
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

    return (
        <Header style={{
            background: '#fff',
            padding: '0 40px',
            borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
            display: 'flex',
            alignItems: 'center',
            gap: '32px',
            boxShadow: '0 1px 3px rgba(50, 50, 93, 0.05), 0 1px 0 rgba(0, 0, 0, 0.02)',
            position: 'sticky',
            top: 0,
            zIndex: 100
        }}>
            <Title
                level={4}
                style={{
                    margin: 0,
                    minWidth: '180px',
                    background: 'linear-gradient(135deg, #635bff 0%, #00d4ff 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    fontWeight: 700,
                    fontSize: '18px',
                    whiteSpace: 'nowrap'
                }}
            >
                Аускультация
            </Title>
            <Menu
                mode="horizontal"
                selectedKeys={[currentSection]}
                items={items}
                onClick={({ key }) => onSectionChange(key)}
                style={{
                    flex: 1,
                    border: 'none',
                    fontSize: 14,
                    fontWeight: 500
                }}
            />
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <LanguageSwitcher />
                {user ? (
                    <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
                        <Space style={{ cursor: 'pointer' }}>
                            <Avatar icon={<UserOutlined />} style={{ background: '#667eea' }} />
                            <Text style={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {user.display_name || user.email?.split('@')[0]}
                            </Text>
                        </Space>
                    </Dropdown>
                ) : (
                    <Button type="primary" onClick={onLoginClick}>
                        {t('admin.login')}
                    </Button>
                )}
            </div>
        </Header>
    );
}

export default Navigation;
