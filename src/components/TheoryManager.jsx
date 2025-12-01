import { useState, useEffect } from 'react';
import {
    Tree,
    Button,
    Input,
    Form,
    Modal,
    Select,
    message,
    Card,
    Space,
    Popconfirm,
    Switch
} from 'antd';
import {
    PlusOutlined,
    EditOutlined,
    DeleteOutlined,
    FolderOutlined,
    FileTextOutlined,
    DownOutlined
} from '@ant-design/icons';
import { getTheoryNodes, addTheoryNode, updateTheoryNode, deleteTheoryNode } from '../services/api';

const { TextArea } = Input;
const { Option } = Select;

function TheoryManager() {
    const [nodes, setNodes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingNode, setEditingNode] = useState(null);
    const [form] = Form.useForm();
    const [expandedKeys, setExpandedKeys] = useState([]);

    useEffect(() => {
        loadNodes();
    }, []);

    const loadNodes = async () => {
        try {
            const data = await getTheoryNodes();
            setNodes(buildTree(data));
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

        return tree;
    };

    const handleAdd = (parentId = null) => {
        setEditingNode(null);
        form.resetFields();
        form.setFieldsValue({ parent_id: parentId, is_folder: true });
        setIsModalVisible(true);
    };

    const handleEdit = (node) => {
        setEditingNode(node);
        form.setFieldsValue({
            title: node.title,
            content: node.content,
            category: node.category,
            is_folder: node.is_folder,
            parent_id: node.parent_id
        });
        setIsModalVisible(true);
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
            if (editingNode) {
                await updateTheoryNode(editingNode.id, values);
                message.success('Обновлено');
            } else {
                await addTheoryNode(values);
                message.success('Создано');
            }
            setIsModalVisible(false);
            loadNodes();
        } catch (error) {
            message.error('Ошибка сохранения');
        }
    };

    const renderTreeNodes = (data) =>
        data.map((item) => ({
            title: (
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', gap: 10 }}>
                    <span>
                        {item.is_folder ? <FolderOutlined /> : <FileTextOutlined />} {item.title}
                    </span>
                    <Space onClick={(e) => e.stopPropagation()}>
                        <Button
                            size="small"
                            icon={<EditOutlined />}
                            onClick={() => handleEdit(item)}
                        />
                        {item.is_folder && (
                            <Button
                                size="small"
                                icon={<PlusOutlined />}
                                onClick={() => handleAdd(item.id)}
                            />
                        )}
                        <Popconfirm title="Удалить?" onConfirm={() => handleDelete(item.id)}>
                            <Button size="small" danger icon={<DeleteOutlined />} />
                        </Popconfirm>
                    </Space>
                </div>
            ),
            key: item.id,
            children: item.children ? renderTreeNodes(item.children) : [],
            isLeaf: !item.is_folder
        }));

    return (
        <div style={{ padding: 24 }}>
            <div style={{ marginBottom: 16 }}>
                <Button type="primary" icon={<PlusOutlined />} onClick={() => handleAdd(null)}>
                    Добавить корневой раздел
                </Button>
            </div>

            <Tree
                showLine
                switcherIcon={<DownOutlined />}
                treeData={renderTreeNodes(nodes)}
                expandedKeys={expandedKeys}
                onExpand={setExpandedKeys}
                blockNode
            />

            <Modal
                title={editingNode ? "Редактировать" : "Создать"}
                open={isModalVisible}
                onCancel={() => setIsModalVisible(false)}
                onOk={form.submit}
                width={800}
            >
                <Form form={form} layout="vertical" onFinish={handleSave}>
                    <Form.Item name="title" label="Название" rules={[{ required: true }]}>
                        <Input />
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

                    <Form.Item
                        noStyle
                        shouldUpdate={(prev, current) => prev.is_folder !== current.is_folder}
                    >
                        {({ getFieldValue }) =>
                            !getFieldValue('is_folder') && (
                                <Form.Item name="content" label="Содержание (Markdown)">
                                    <TextArea rows={10} placeholder="# Заголовок\n\nТекст..." />
                                </Form.Item>
                            )
                        }
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}

export default TheoryManager;
