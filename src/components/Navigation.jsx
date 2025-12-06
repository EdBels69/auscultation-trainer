import { Layout, Menu, Typography } from 'antd';
import { BookOutlined, FileTextOutlined, SettingOutlined, ReadOutlined } from '@ant-design/icons';

const { Header } = Layout;
const { Title } = Typography;

function Navigation({ currentSection, onSectionChange }) {
    const items = [
        { key: 'learning', label: 'Обучение', icon: <BookOutlined /> },
        { key: 'theory', label: 'Теория', icon: <ReadOutlined /> },
        { key: 'test', label: 'Тест', icon: <FileTextOutlined /> },
        { key: 'admin', label: 'Управление', icon: <SettingOutlined /> },
    ];

    return (
        <Header style={{
            background: '#fff',
            padding: '0 40px',
            borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
            display: 'flex',
            alignItems: 'center',
            gap: '56px',
            boxShadow: '0 1px 3px rgba(50, 50, 93, 0.05), 0 1px 0 rgba(0, 0, 0, 0.02)',
            position: 'sticky',
            top: 0,
            zIndex: 100
        }}>
            <Title
                level={4}
                style={{
                    margin: 0,
                    minWidth: '200px',
                    background: 'linear-gradient(135deg, #635bff 0%, #00d4ff 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    fontWeight: 700,
                    fontSize: '18px'
                }}
            >
                🎧 Аускультация
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
        </Header>
    );
}

export default Navigation;
