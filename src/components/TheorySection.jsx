import { useState, useEffect } from 'react';
import { Layout, Tree, Typography, Spin, message, Empty } from 'antd';
import {
    FolderOutlined,
    FileTextOutlined,
    HeartOutlined,
    ExperimentOutlined,
    BookOutlined,
    DownOutlined
} from '@ant-design/icons';
import TheoryViewer from './TheoryViewer';
import { renderIconByName } from './IconPicker';
import { getLearningNodes, getTheoryNodes } from '../services/api';

const { Sider, Content } = Layout;
const { Title, Paragraph } = Typography;

function TheorySection() {
    const [nodes, setNodes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedNode, setSelectedNode] = useState(null);
    const [treeData, setTreeData] = useState([]);
    const [expandedKeys, setExpandedKeys] = useState([]);
    const [selectedKeys, setSelectedKeys] = useState([]);

    useEffect(() => {
        loadNodes();
    }, []);

    const loadNodes = async () => {
        try {
            const data = await getTheoryNodes();
            const tree = buildTree(data);
            setNodes(tree);
            setTreeData(convertTreeToTreeData(tree));
            // Auto-expand root folders
            const rootKeys = tree.map(n => n.id);
            setExpandedKeys(rootKeys);
        } catch (error) {
            console.error(error);
            message.error('Ошибка загрузки теории.');
        } finally {
            setLoading(false);
        }
    };

    const buildTree = (data) => {
        const tree = [];
        const map = {};

        // Sort by sort_order first
        const sorted = [...data].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

        sorted.forEach(item => map[item.id] = { ...item, children: [] });
        sorted.forEach(item => {
            if (item.parent_id && map[item.parent_id]) {
                map[item.parent_id].children.push(map[item.id]);
            } else {
                tree.push(map[item.id]);
            }
        });

        // Sort children recursively
        const sortChildren = (nodes) => {
            nodes.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
            nodes.forEach(n => {
                if (n.children?.length > 0) sortChildren(n.children);
            });
        };
        sortChildren(tree);

        return tree;
    };

    const getCategoryIcon = (category) => {
        const iconStyle = { fontSize: 16 };
        if (category === 'cardiac') return <HeartOutlined style={{ ...iconStyle, color: '#ff4d4f' }} />;
        if (category === 'pulmonary') return <ExperimentOutlined style={{ ...iconStyle, color: '#1890ff' }} />;
        return <FolderOutlined style={{ ...iconStyle, color: '#8c8c8c' }} />;
    };

    const convertTreeToTreeData = (tree, level = 0) => {
        return tree.map(node => {
            let icon;
            const iconStyle = { fontSize: 16 };

            // Use custom icon if set
            if (node.icon) {
                icon = renderIconByName(node.icon, { ...iconStyle, color: node.category === 'cardiac' ? '#ff4d4f' : node.category === 'pulmonary' ? '#1890ff' : '#667eea' });
            } else if (node.category) {
                icon = getCategoryIcon(node.category);
            } else if (node.is_folder) {
                icon = <FolderOutlined style={{ ...iconStyle, color: level === 0 ? '#722ed1' : '#8c8c8c' }} />;
            } else {
                icon = <FileTextOutlined style={{ ...iconStyle, color: '#52c41a' }} />;
            }

            const menuTitle = node.sidebar_title || node.title;

            return {
                key: node.id,
                title: (
                    <span style={{ fontSize: 14 }} title={node.title}>
                        {icon} <span style={{ marginLeft: 8 }}>{menuTitle}</span>
                    </span>
                ),
                children: node.children.length > 0 ? convertTreeToTreeData(node.children, level + 1) : undefined,
                nodeData: node, // Store node data for selection
            };
        });
    };

    const handleSelect = (selectedKeys, info) => {
        if (selectedKeys.length > 0 && info.node.nodeData) {
            setSelectedKeys(selectedKeys);
            setSelectedNode(info.node.nodeData);
        }
    };

    if (loading) {
        return (
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: 'calc(100vh - 64px)'
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
                <div style={{
                    height: 'calc(100% - 72px)',
                    overflow: 'auto',
                    padding: '16px 8px'
                }}>
                    <Tree
                        showLine={{ showLeafIcon: false }}
                        switcherIcon={<DownOutlined />}
                        treeData={treeData}
                        expandedKeys={expandedKeys}
                        onExpand={setExpandedKeys}
                        selectedKeys={selectedKeys}
                        onSelect={handleSelect}
                        blockNode
                        style={{ fontSize: 14 }}
                    />
                </div>
            </Sider>

            <Content style={{ padding: '32px 48px', overflow: 'auto' }}>
                {selectedNode ? (
                    <div style={{
                        background: '#fff',
                        borderRadius: 12,
                        padding: '32px 40px',
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)'
                    }}>
                        <Title level={2} style={{ marginBottom: 24, color: '#1a1a2e' }}>
                            {selectedNode.title}
                        </Title>

                        {selectedNode.content ? (
                            <TheoryViewer content={selectedNode.content} />
                        ) : (
                            <div style={{
                                textAlign: 'center',
                                padding: '60px 20px',
                                color: '#8c8c8c'
                            }}>
                                <FileTextOutlined style={{ fontSize: 48, marginBottom: 16, opacity: 0.5 }} />
                                <Paragraph type="secondary">
                                    Содержимое ещё не добавлено.
                                    <br />
                                    Используйте панель управления для редактирования.
                                </Paragraph>
                            </div>
                        )}
                    </div>
                ) : (
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: '100%',
                        minHeight: 400
                    }}>
                        <Empty
                            description={
                                <span style={{ color: '#8c8c8c' }}>
                                    Выберите раздел из меню слева
                                </span>
                            }
                        />
                    </div>
                )}
            </Content>
        </Layout>
    );
}

export default TheorySection;
