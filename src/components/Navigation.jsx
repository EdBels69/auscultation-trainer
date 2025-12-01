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
            padding: '0 32px',
            borderBottom: '1px solid #f0f0f0',
            display: 'flex',
            alignItems: 'center',
            gap: '48px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
        }}>
            <Title level={4} style={{ margin: 0, minWidth: '200px', color: '#1890ff' }}>
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
                    fontSize: 15
                }}
            />
        </Header>
    );
}

export default Navigation;
