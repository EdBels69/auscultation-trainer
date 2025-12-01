import { useState, useEffect } from 'react';
import { Layout, Menu, Typography, Spin, Card, message, Empty } from 'antd';
import {
    FolderOutlined,
    FileTextOutlined,
    HeartOutlined,
    ExperimentOutlined,
    BookOutlined
} from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { getTheoryNodes } from '../services/api';

const { Sider, Content } = Layout;
const { Title, Paragraph } = Typography;

function TheorySection() {
    const [nodes, setNodes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedNode, setSelectedNode] = useState(null);
    const [menuItems, setMenuItems] = useState([]);
    const [expandedKeys, setExpandedKeys] = useState([]);

    useEffect(() => {
        loadNodes();
    }, []);

    const loadNodes = async () => {
        try {
            const data = await getTheoryNodes();
            const tree = buildTree(data);
            setNodes(tree);
            setMenuItems(convertTreeToMenu(tree));
            // Auto-expand root folders
            const rootKeys = tree.map(n => n.id);
            setExpandedKeys(rootKeys);
        } catch (error) {
            console.error(error);
            message.error('Ошибка загрузки теории. Возможно, не создана таблица в базе данных.');
        } finally {
            setLoading(false);
        }
    };

    const buildTree = (data) => {
        const tree = [];
        const map = {};
        data.forEach(item => map[item.id] = { ...item, children: [] });
        data.forEach(item => {
            if (item.parent_id && map[item.parent_id]) {
                map[item.parent_id].children.push(map[item.id]);
            } else {
                tree.push(map[item.id]);
            }
        });
        return tree;
    };

    const getCategoryIcon = (category) => {
        const iconStyle = { fontSize: 16 };
        if (category === 'cardiac') return <HeartOutlined style={{ ...iconStyle, color: '#ff4d4f' }} />;
        if (category === 'pulmonary') return <ExperimentOutlined style={{ ...iconStyle, color: '#1890ff' }} />;
        return <FolderOutlined style={{ ...iconStyle, color: '#8c8c8c' }} />;
    };

    const convertTreeToMenu = (tree, level = 0) => {
        return tree.map(node => {
            let icon;
            const iconStyle = { fontSize: 16 };

            if (node.category) {
                icon = getCategoryIcon(node.category);
            } else if (node.is_folder) {
                icon = <FolderOutlined style={{ ...iconStyle, color: level === 0 ? '#722ed1' : '#8c8c8c' }} />;
            } else {
                icon = <FileTextOutlined style={{ ...iconStyle, color: '#52c41a' }} />;
            }

            return {
                key: node.id,
                icon,
                label: <span style={{ fontSize: 14 }}>{node.title}</span>,
                children: node.children.length > 0 ? convertTreeToMenu(node.children, level + 1) : null,
            };
        });
    };

    const handleSelect = ({ key }) => {
        const findNode = (data, id) => {
            for (const item of data) {
                if (item.id === id) return item;
                if (item.children) {
                    const found = findNode(item.children, id);
                    if (found) return found;
                }
            }
            return null;
        };

        const node = findNode(nodes, key);
        if (node && !node.is_folder) {
            setSelectedNode(node);
        }
    };

    if (loading) {
        return (
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: 'calc(100vh - 64px)'
            }}>
                <Spin size="large" />
            </div>
        );
    }

    return (
        <Layout style={{
            background: 'linear-gradient(to bottom, #f0f2f5, #ffffff)',
            minHeight: 'calc(100vh - 64px)'
        }}>
            <Sider
                width={320}
                style={{
                    background: '#fff',
                    borderRight: '1px solid #e8e8e8',
                    boxShadow: '2px 0 8px rgba(0,0,0,0.05)'
                }}
            >
                <div style={{
                    padding: '24px 16px',
                    borderBottom: '1px solid #f0f0f0',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: '#fff'
                }}>
                    <BookOutlined style={{ fontSize: 24, marginRight: 12 }} />
                    <span style={{ fontSize: 18, fontWeight: 600 }}>База знаний</span>
                </div>
                <Menu
                    mode="inline"
                    style={{
                        height: 'calc(100% - 72px)',
                        borderRight: 0,
                        paddingTop: 16,
                        fontSize: 14
                    }}
                    items={menuItems}
                    onSelect={handleSelect}
                    openKeys={expandedKeys}
                    onOpenChange={setExpandedKeys}
                    className="theory-menu"
                />
                <style>{`
                    .theory-menu .ant-menu-item,
                    .theory-menu .ant-menu-submenu-title {
                        height: 40px;
                        line-height: 40px;
                        margin: 4px 8px;
                        border-radius: 6px;
                    }
                    .theory-menu .ant-menu-item:hover,
                    .theory-menu .ant-menu-submenu-title:hover {
                        background-color: #f0f5ff;
                    }
                    .theory-menu .ant-menu-item-selected {
                        background-color: #e6f7ff;
                        font-weight: 500;
                    }
                    .theory-menu .ant-menu-submenu-title {
                        font-weight: 600;
                    }
                `}</style>
            </Sider>
            <Layout style={{ padding: '32px', background: 'transparent' }}>
                <Content
                    style={{
                        background: '#fff',
                        borderRadius: 12,
                        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                        minHeight: 280,
                    }}
                >
                    {selectedNode ? (
                        <div style={{ padding: '32px 40px' }}>
                            <Title level={2} style={{
                                marginBottom: 8,
                                color: '#262626',
                                borderBottom: '3px solid #1890ff',
                                paddingBottom: 12,
                                display: 'inline-block'
                            }}>
                                {selectedNode.title}
                            </Title>
                            <div style={{
                                marginTop: 24,
                                fontSize: 16,
                                lineHeight: 1.8,
                                color: '#595959'
                            }}>
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                    {selectedNode.content || '_Содержимое пока отсутствует_'}
                                </ReactMarkdown>
                            </div>
                        </div>
                    ) : (
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            alignItems: 'center',
                            minHeight: 500,
                            padding: 48
                        }}>
                            <Empty
                                image={Empty.PRESENTED_IMAGE_SIMPLE}
                                description={
                                    <div>
                                        <Paragraph style={{ fontSize: 18, color: '#8c8c8c', marginBottom: 8 }}>
                                            Выберите тему из меню
                                        </Paragraph>
                                        <Paragraph style={{ fontSize: 14, color: '#bfbfbf' }}>
                                            Используйте навигацию слева для изучения материалов
                                        </Paragraph>
                                    </div>
                                }
                            />
                        </div>
                    )}
                </Content>
            </Layout>
        </Layout>
    );
}

export default TheorySection;
