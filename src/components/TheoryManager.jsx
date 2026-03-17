import { useState, useEffect } from 'react';
import {
    Tree,
    Button,
    Input,
    Form,
    Modal,
    Select,
    message,
    Space,
    Popconfirm,
    Switch,
    Drawer
} from 'antd';
import {
    PlusOutlined,
    EditOutlined,
    DeleteOutlined,
    FolderOutlined,
    FileTextOutlined,
    DownOutlined,
    FormOutlined,
    AppstoreOutlined,
    HolderOutlined
} from '@ant-design/icons';
import { getTheoryNodes, addTheoryNode, updateTheoryNode, deleteTheoryNode } from '../services/api';
import TheoryEditor from './editor/TheoryEditor';
import IconPicker, { renderIconByName } from './IconPicker';

const { Option } = Select;

function TheoryManager() {
    const [nodes, setNodes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [isIconPickerOpen, setIsIconPickerOpen] = useState(false);
    const [editingNode, setEditingNode] = useState(null);
    const [contentEditingNode, setContentEditingNode] = useState(null);
    const [selectedIcon, setSelectedIcon] = useState('FileTextOutlined');
    const [saving, setSaving] = useState(false);
    const [form] = Form.useForm();
    const [expandedKeys, setExpandedKeys] = useState([]);

    useEffect(() => {
        loadNodes();
    }, []);

    const loadNodes = async () => {
        try {
            const data = await getTheoryNodes();
            // Sort by sort_order
            const sorted = data.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
            setNodes(buildTree(sorted));
            setLoading(false);
        } catch (error) {
            message.error('Ошибка загрузки теории');
        }
    };

    const buildTree = (data) => {
        const tree = [];
        const map = {};

        data.forEach(item => {
            map[item.id] = { ...item, key: item.id, children: [] };
        });

        data.forEach(item => {
            if (item.parent_id && map[item.parent_id]) {
                map[item.parent_id].children.push(map[item.id]);
            } else {
                tree.push(map[item.id]);
            }
        });

        // Sort children by sort_order
        const sortChildren = (nodes) => {
            nodes.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
            nodes.forEach(n => {
                if (n.children && n.children.length > 0) {
                    sortChildren(n.children);
                }
            });
        };
        sortChildren(tree);

        return tree;
    };

    const handleAdd = (parentId = null) => {
        setEditingNode(null);
        form.resetFields();
        form.setFieldsValue({ parent_id: parentId, is_folder: true });
        setSelectedIcon('FolderOutlined');
        setIsModalVisible(true);
    };

    const handleEdit = (node) => {
        setEditingNode(node);
        form.setFieldsValue({
            title: node.title,
            sidebar_title: node.sidebar_title,
            title_en: node.title_en,
            sidebar_title_en: node.sidebar_title_en,
            category: node.category,
            is_folder: node.is_folder,
            parent_id: node.parent_id
        });
        setSelectedIcon(node.icon || (node.is_folder ? 'FolderOutlined' : 'FileTextOutlined'));
        setIsModalVisible(true);
    };

    const handleEditContent = (node) => {
        setContentEditingNode(node);
        setIsEditorOpen(true);
    };

    const handleDelete = async (id) => {
        try {
            await deleteTheoryNode(id);
            message.success('Удалено');
            loadNodes();
        } catch (error) {
            message.error('Ошибка удаления');
        }
    };

    const handleSave = async (values) => {
        try {
            const saveData = { ...values, icon: selectedIcon };
            if (editingNode) {
                await updateTheoryNode(editingNode.id, saveData);
                message.success('Обновлено');
            } else {
                await addTheoryNode(saveData);
                message.success('Создано');
            }
            setIsModalVisible(false);
            loadNodes();
        } catch (error) {
            message.error('Ошибка сохранения');
        }
    };

    const handleSaveContent = async (html) => {
        if (!contentEditingNode) return;

        setSaving(true);
        try {
            await updateTheoryNode(contentEditingNode.id, { content: html });
            message.success('Содержимое сохранено');
            loadNodes();
        } catch (error) {
            message.error('Ошибка сохранения');
        } finally {
            setSaving(false);
        }
    };

    // Handle drag & drop
    const handleDrop = async (info) => {
        const dropKey = info.node.key;
        const dragKey = info.dragNode.key;
        const dropPos = info.node.pos.split('-');
        const dropPosition = info.dropPosition - Number(dropPos[dropPos.length - 1]);

        const findNode = (data, key, callback) => {
            for (let i = 0; i < data.length; i++) {
                if (data[i].key === key) {
                    return callback(data[i], i, data);
                }
                if (data[i].children) {
                    findNode(data[i].children, key, callback);
                }
            }
        };

        const data = [...nodes];
        let dragObj;

        findNode(data, dragKey, (item, index, arr) => {
            arr.splice(index, 1);
            dragObj = item;
        });

        if (!info.dropToGap) {
            // Drop on the content (into folder)
            findNode(data, dropKey, (item) => {
                item.children = item.children || [];
                item.children.unshift(dragObj);
                dragObj.parent_id = item.id;
            });
        } else {
            let ar = [];
            let i;
            findNode(data, dropKey, (_item, index, arr) => {
                ar = arr;
                i = index;
            });

            if (dropPosition === -1) {
                ar.splice(i, 0, dragObj);
            } else {
                ar.splice(i + 1, 0, dragObj);
            }

            // Update parent_id based on sibling
            const dropNode = ar.find(n => n.key === dropKey);
            dragObj.parent_id = dropNode?.parent_id || null;
        }

        setNodes(data);

        // Save new order to database
        try {
            const flattenWithOrder = (nodes, parentId = null) => {
                let result = [];
                nodes.forEach((node, index) => {
                    result.push({ id: node.id, sort_order: index, parent_id: parentId });
                    if (node.children && node.children.length > 0) {
                        result = result.concat(flattenWithOrder(node.children, node.id));
                    }
                });
                return result;
            };

            const updates = flattenWithOrder(data);

            // Update each node
            for (const update of updates) {
                await updateTheoryNode(update.id, {
                    sort_order: update.sort_order,
                    parent_id: update.parent_id
                });
            }

            message.success('Порядок сохранён');
        } catch (error) {
            console.error('Failed to save order:', error);
            message.error('Ошибка сохранения порядка');
            loadNodes(); // Reload original order
        }
    };

    const getNodeIcon = (item) => {
        if (item.icon) {
            return renderIconByName(item.icon, { fontSize: 16 });
        }
        return item.is_folder ? <FolderOutlined /> : <FileTextOutlined />;
    };

    const renderTreeNodes = (data) =>
        data.map((item) => ({
            title: (
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', gap: 10, alignItems: 'center' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {getNodeIcon(item)} {item.title}
                    </span>
                    <Space onClick={(e) => e.stopPropagation()}>
                        <Button
                            size="small"
                            type="primary"
                            icon={<FormOutlined />}
                            onClick={() => handleEditContent(item)}
                            style={{ background: '#667eea', borderColor: '#667eea' }}
                        >
                            Редактор
                        </Button>
                        <Button
                            size="small"
                            icon={<EditOutlined />}
                            onClick={() => handleEdit(item)}
                        />
                        <Button
                            size="small"
                            icon={<PlusOutlined />}
                            onClick={() => handleAdd(item.id)}
                            title="Добавить подпункт"
                        />
                        <Popconfirm title="Удалить?" onConfirm={() => handleDelete(item.id)}>
                            <Button size="small" danger icon={<DeleteOutlined />} />
                        </Popconfirm>
                    </Space>
                </div>
            ),
            key: item.id,
            children: item.children ? renderTreeNodes(item.children) : [],
            isLeaf: item.children?.length === 0
        }));

    return (
        <div style={{ padding: 24 }}>
            <div style={{ marginBottom: 16, display: 'flex', gap: 12, alignItems: 'center' }}>
                <Button type="primary" icon={<PlusOutlined />} onClick={() => handleAdd(null)}>
                    Добавить корневой раздел
                </Button>
                <span style={{ color: '#888', fontSize: 13 }}>
                    💡 Перетаскивайте элементы для изменения порядка
                </span>
            </div>

            <Tree
                showLine
                draggable
                switcherIcon={<DownOutlined />}
                treeData={renderTreeNodes(nodes)}
                expandedKeys={expandedKeys}
                onExpand={setExpandedKeys}
                onDrop={handleDrop}
                blockNode
            />

            {/* Node Properties Modal */}
            <Modal
                title={editingNode ? "Редактировать" : "Создать"}
                open={isModalVisible}
                onCancel={() => setIsModalVisible(false)}
                onOk={form.submit}
                width={600}
            >
                <Form form={form} layout="vertical" onFinish={handleSave}>
                    {/* RU Title */}
                    <Form.Item name="title" label="Полное название (RU)" rules={[{ required: true }]}>
                        <Input placeholder="Полный заголовок статьи" />
                    </Form.Item>

                    <Form.Item name="sidebar_title" label="Заголовок для сайдбара (RU)">
                        <Input placeholder="Короткое название для меню" maxLength={30} showCount />
                    </Form.Item>

                    {/* EN Title */}
                    <Form.Item name="title_en" label="Full title (EN)">
                        <Input placeholder="Full article title in English" />
                    </Form.Item>

                    <Form.Item name="sidebar_title_en" label="Sidebar title (EN)">
                        <Input placeholder="Short English title for menu" maxLength={30} showCount />
                    </Form.Item>

                    <Form.Item label="Иконка">
                        <Button
                            icon={renderIconByName(selectedIcon, { fontSize: 18 }) || <AppstoreOutlined />}
                            onClick={() => setIsIconPickerOpen(true)}
                            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 8 }}
                        >
                            {selectedIcon.replace(/Outlined|Filled/g, '')}
                        </Button>
                    </Form.Item>

                    <Form.Item name="is_folder" label="Это папка?" valuePropName="checked">
                        <Switch />
                    </Form.Item>

                    <Form.Item name="category" label="Категория">
                        <Select allowClear>
                            <Option value="cardiac">Кардиология</Option>
                            <Option value="pulmonary">Пульмонология</Option>
                        </Select>
                    </Form.Item>

                    <Form.Item name="parent_id" label="Родитель" hidden>
                        <Input />
                    </Form.Item>
                </Form>
            </Modal>

            {/* Icon Picker Modal */}
            <IconPicker
                visible={isIconPickerOpen}
                onClose={() => setIsIconPickerOpen(false)}
                onSelect={setSelectedIcon}
                currentIcon={selectedIcon}
            />

            {/* Content Editor Drawer */}
            <Drawer
                title={
                    <span>
                        <FormOutlined style={{ marginRight: 8 }} />
                        Редактор: {contentEditingNode?.title}
                    </span>
                }
                placement="right"
                width="80%"
                open={isEditorOpen}
                onClose={() => setIsEditorOpen(false)}
                destroyOnClose
            >
                {contentEditingNode && (
                    <TheoryEditor
                        initialContent={contentEditingNode.content || ''}
                        onSave={handleSaveContent}
                        saving={saving}
                    />
                )}
            </Drawer>
        </div>
    );
}

export default TheoryManager;
