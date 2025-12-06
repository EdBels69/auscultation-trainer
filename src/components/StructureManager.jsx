import { useState, useEffect, useRef } from 'react';
import {
    Tree,
    Button,
    Input,
    Form,
    Modal,
    message,
    Space,
    Popconfirm,
    Tag,
    Checkbox,
    Tooltip,
    Spin
} from 'antd';
import {
    PlusOutlined,
    EditOutlined,
    DeleteOutlined,
    FolderOutlined,
    FileTextOutlined,
    DownOutlined,
    SoundOutlined,
    CheckCircleOutlined,
    ExclamationCircleOutlined
} from '@ant-design/icons';
import {
    getLearningNodes,
    addLearningNode,
    updateLearningNode,
    deleteLearningNode,
    addSound
} from '../services/api';
import { learningStructure } from '../data/learningStructure';
import AudioUploadForm from './AudioUploadForm';
import AudioList from './AudioList';

// Helper: транслитерация русского текста в латиницу для генерации ключа
const transliterate = (text) => {
    const rus = 'абвгдеёжзийклмнопрстуфхцчшщъыьэюя';
    const eng = ['a', 'b', 'v', 'g', 'd', 'e', 'yo', 'zh', 'z', 'i', 'y', 'k', 'l', 'm', 'n', 'o', 'p', 'r', 's', 't', 'u', 'f', 'h', 'ts', 'ch', 'sh', 'shch', '', 'y', '', 'e', 'yu', 'ya'];

    return text
        .toLowerCase()
        .split('')
        .map(char => {
            const idx = rus.indexOf(char);
            if (idx >= 0) return eng[idx];
            if (/[a-z0-9]/.test(char)) return char;
            if (char === ' ' || char === '-') return '_';
            return '';
        })
        .join('')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '');
};

// Определяем тип дочернего элемента по типу родителя
const getChildType = (parentType) => {
    switch (parentType) {
        case 'system': return 'category';
        case 'category': return 'item';
        case 'item': return 'subtype';
        case 'subtype': return 'subtype'; // Можно вкладывать подтипы
        default: return 'system';
    }
};

function StructureManager({ audioRecords, onAudioUpdate }) {
    const [nodes, setNodes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [initializing, setInitializing] = useState(false);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingNode, setEditingNode] = useState(null);
    const [parentNodeForAdd, setParentNodeForAdd] = useState(null);
    const [form] = Form.useForm();
    const [expandedKeys, setExpandedKeys] = useState([]);
    const initAttempted = useRef(false);

    // Content Management State
    const [contentModalVisible, setContentModalVisible] = useState(false);
    const [selectedNodeForContent, setSelectedNodeForContent] = useState(null);

    useEffect(() => {
        loadNodes();
    }, []);

    const loadNodes = async () => {
        try {
            const data = await getLearningNodes();

            // Автоинициализация если база пуста (только один раз)
            if (data.length === 0 && !initAttempted.current) {
                initAttempted.current = true;
                await initializeFromDefault();
                return;
            }

            setNodes(buildTree(data));
            setLoading(false);

            // Auto expand ALL nodes
            const allKeys = data.map(n => n.key);
            setExpandedKeys(allKeys);
        } catch (error) {
            console.error(error);
            message.error('Ошибка загрузки структуры');
            setLoading(false);
        }
    };

    const buildTree = (data) => {
        const tree = [];
        const map = {};

        // Sort by order or creation
        const sortedData = [...data].sort((a, b) => (a.order || 0) - (b.order || 0));

        sortedData.forEach(item => {
            map[item.id] = { ...item, key: item.key, children: [] };
        });

        sortedData.forEach(item => {
            if (item.parent_id && map[item.parent_id]) {
                map[item.parent_id].children.push(map[item.id]);
            } else {
                tree.push(map[item.id]);
            }
        });

        return tree;
    };

    const initializeFromDefault = async () => {
        try {
            setInitializing(true);
            setLoading(true);
            const systems = learningStructure.systems;

            let order = 0;
            for (const system of systems) {
                // Create System
                const sysNode = await addLearningNode({
                    key: system.key,
                    name: system.name,
                    type: 'system',
                    order: order++
                });

                if (system.categories) {
                    for (const category of system.categories) {
                        // Create Category
                        const catNode = await addLearningNode({
                            key: category.key,
                            name: category.name,
                            type: 'category',
                            parent_id: sysNode.id,
                            order: order++
                        });

                        if (category.items) {
                            for (const item of category.items) {
                                // Create Item
                                const itemNode = await addLearningNode({
                                    key: item.key,
                                    name: item.name,
                                    type: 'item',
                                    parent_id: catNode.id,
                                    order: order++
                                });

                                if (item.subtypes) {
                                    for (let i = 0; i < item.subtypes.length; i++) {
                                        const subtype = item.subtypes[i];
                                        const subtypeName = typeof subtype === 'string' ? subtype : subtype.name;
                                        const subtypeKey = `${item.key}_sub_${i}`;

                                        await addLearningNode({
                                            key: subtypeKey,
                                            name: subtypeName,
                                            type: 'subtype',
                                            parent_id: itemNode.id,
                                            order: order++
                                        });
                                    }
                                }
                            }
                        }
                    }
                }
            }
            message.success('Структура автоматически инициализирована');

            // Перезагрузить данные
            const data = await getLearningNodes();
            setNodes(buildTree(data));
            const allKeys = data.map(n => n.key);
            setExpandedKeys(allKeys);
            setLoading(false);
            setInitializing(false);
        } catch (error) {
            console.error(error);
            message.error('Ошибка инициализации: ' + error.message);
            setLoading(false);
            setInitializing(false);
        }
    };

    // Упрощенное добавление - просто название
    const handleAdd = (parentNode = null) => {
        setEditingNode(null);
        setParentNodeForAdd(parentNode);
        form.resetFields();
        setIsModalVisible(true);
    };

    const handleEdit = (node) => {
        setEditingNode(node);
        setParentNodeForAdd(null);
        form.setFieldsValue({
            name: node.name,
            is_hidden: node.is_hidden,
            order: node.order
        });
        setIsModalVisible(true);
    };

    const handleDelete = async (id) => {
        try {
            await deleteLearningNode(id);
            message.success('Удалено');
            loadNodes();
        } catch (error) {
            message.error('Ошибка удаления (возможно есть дочерние элементы)');
        }
    };

    const handleManageContent = (node) => {
        setSelectedNodeForContent(node);
        setContentModalVisible(true);
    };

    // Получаем следующий порядковый номер для нового элемента
    const getNextOrder = (parentNode) => {
        if (!parentNode) {
            // Корневой уровень
            return nodes.length;
        }
        return parentNode.children ? parentNode.children.length : 0;
    };

    const handleSave = async (values) => {
        try {
            if (editingNode) {
                // Update
                await updateLearningNode(editingNode.id, {
                    name: values.name,
                    is_hidden: values.is_hidden,
                    order: values.order,
                    parent_id: editingNode.parent_id
                });
                message.success('Обновлено');
            } else {
                // Create - автогенерация ключа и типа
                const nodeType = parentNodeForAdd
                    ? getChildType(parentNodeForAdd.type)
                    : 'system';

                // Генерируем уникальный ключ
                const baseKey = transliterate(values.name);
                const timestamp = Date.now().toString(36);
                const uniqueKey = `${baseKey}_${timestamp}`;

                const nodeData = {
                    name: values.name,
                    key: uniqueKey,
                    type: nodeType,
                    parent_id: parentNodeForAdd ? parentNodeForAdd.id : null,
                    order: getNextOrder(parentNodeForAdd),
                    is_hidden: values.is_hidden || false
                };

                await addLearningNode(nodeData);
                message.success('Создано');
            }
            setIsModalVisible(false);
            loadNodes();
        } catch (error) {
            console.error(error);
            message.error('Ошибка сохранения');
        }
    };

    const getTypeName = (type) => {
        switch (type) {
            case 'system': return 'Система';
            case 'category': return 'Категория';
            case 'item': return 'Элемент';
            case 'subtype': return 'Подтип';
            default: return type;
        }
    };

    // Проверка полноты контента для узла
    const getContentStatus = (nodeKey) => {
        if (!audioRecords) return null;
        const record = audioRecords.find(r => r.linkedNodeKey === nodeKey);
        if (!record) return 'empty'; // Нет записи

        const hasAudio = record.audioUrl && record.audioUrl !== '';
        const hasImage = record.imageUrl && record.imageUrl !== '';
        const hasDescription = record.description && record.description.trim() !== '';

        if (hasAudio && hasImage && hasDescription) return 'complete';
        return 'incomplete';
    };

    const renderTreeNodes = (data) =>
        data.map((item) => ({
            title: (
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', gap: 10, alignItems: 'center' }}>
                    <span>
                        {item.type === 'system' && '🫁/❤️ '}
                        {item.type === 'category' && <FolderOutlined />}
                        {(item.type === 'item' || item.type === 'subtype') && (
                            item.children && item.children.length > 0
                                ? <FolderOutlined />
                                : <FileTextOutlined />
                        )}
                        {' '}
                        <span style={item.is_hidden ? { color: '#ccc', textDecoration: 'line-through' } : {}}>
                            {item.name}
                        </span>
                        {item.is_hidden && <Tag style={{ marginLeft: 8 }}>H</Tag>}
                    </span>
                    <Space onClick={(e) => e.stopPropagation()}>
                        {/* Status icon for leaf nodes */}
                        {(!item.children || item.children.length === 0) && (() => {
                            const status = getContentStatus(item.key);
                            if (status === 'complete') {
                                return (
                                    <Tooltip title="Контент заполнен полностью">
                                        <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 14 }} />
                                    </Tooltip>
                                );
                            } else if (status === 'incomplete') {
                                return (
                                    <Tooltip title="Контент заполнен частично">
                                        <ExclamationCircleOutlined style={{ color: '#faad14', fontSize: 14 }} />
                                    </Tooltip>
                                );
                            }
                            return null; // empty - no icon
                        })()}
                        {(!item.children || item.children.length === 0) && (
                            <Tooltip title="Управление контентом (аудио)">
                                <Button
                                    size="small"
                                    icon={<SoundOutlined />}
                                    onClick={() => handleManageContent(item)}
                                    style={{ color: '#1890ff', borderColor: '#1890ff' }}
                                />
                            </Tooltip>
                        )}
                        <Tooltip title="Редактировать">
                            <Button
                                size="small"
                                icon={<EditOutlined />}
                                onClick={() => handleEdit(item)}
                            />
                        </Tooltip>
                        <Tooltip title={`Добавить ${getTypeName(getChildType(item.type)).toLowerCase()}`}>
                            <Button
                                size="small"
                                icon={<PlusOutlined />}
                                onClick={() => handleAdd(item)}
                            />
                        </Tooltip>
                        <Popconfirm title="Удалить?" onConfirm={() => handleDelete(item.id)}>
                            <Button size="small" danger icon={<DeleteOutlined />} />
                        </Popconfirm>
                    </Space>
                </div>
            ),
            key: item.key,
            children: item.children ? renderTreeNodes(item.children) : [],
            selectable: false
        }));

    // Filter records for the selected node
    const nodeAudioRecords = selectedNodeForContent && audioRecords
        ? audioRecords.filter(r => r.linkedNodeKey === selectedNodeForContent.key)
        : [];

    // Показываем лоадер пока идёт инициализация
    if (initializing) {
        return (
            <div style={{ padding: 48, textAlign: 'center' }}>
                <Spin size="large" />
                <div style={{ marginTop: 16, color: '#666' }}>
                    Инициализация структуры обучения...
                </div>
            </div>
        );
    }

    // Определяем тип создаваемого элемента для модального окна
    const newNodeType = parentNodeForAdd
        ? getChildType(parentNodeForAdd.type)
        : 'system';

    return (
        <div>
            <div style={{ marginBottom: 16 }}>
                <Button type="primary" icon={<PlusOutlined />} onClick={() => handleAdd(null)}>
                    Добавить корневую систему
                </Button>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: 40 }}>
                    <Spin />
                </div>
            ) : (
                <Tree
                    showLine
                    switcherIcon={<DownOutlined />}
                    treeData={renderTreeNodes(nodes)}
                    expandedKeys={expandedKeys}
                    onExpand={setExpandedKeys}
                    blockNode
                    style={{ background: 'transparent' }}
                />
            )}

            {/* Упрощённая форма создания/редактирования */}
            <Modal
                title={
                    editingNode
                        ? `Редактировать: ${editingNode.name}`
                        : `Добавить ${getTypeName(newNodeType).toLowerCase()}${parentNodeForAdd ? ` в "${parentNodeForAdd.name}"` : ''}`
                }
                open={isModalVisible}
                onCancel={() => setIsModalVisible(false)}
                onOk={form.submit}
                okText={editingNode ? 'Сохранить' : 'Создать'}
                cancelText="Отмена"
            >
                <Form form={form} layout="vertical" onFinish={handleSave}>
                    <Form.Item
                        name="name"
                        label="Название"
                        rules={[{ required: true, message: 'Введите название' }]}
                    >
                        <Input
                            placeholder="Например: Хрипы, Шум трения плевры..."
                            autoFocus
                        />
                    </Form.Item>

                    {editingNode && (
                        <Form.Item name="order" label="Порядок сортировки">
                            <Input type="number" />
                        </Form.Item>
                    )}

                    <Form.Item name="is_hidden" valuePropName="checked">
                        <Checkbox>Скрытый раздел (не показывать пользователям)</Checkbox>
                    </Form.Item>
                </Form>
            </Modal>

            {/* Content Management Modal */}
            <Modal
                title={`Контент: ${selectedNodeForContent?.name || ''}`}
                open={contentModalVisible}
                onCancel={() => setContentModalVisible(false)}
                footer={null}
                width={800}
            >
                {selectedNodeForContent && (
                    <>
                        <AudioUploadForm
                            onUploadSuccess={onAudioUpdate}
                            initialNodeKey={selectedNodeForContent.key}
                            initialNodeName={selectedNodeForContent.name}
                        />
                        <div style={{ marginTop: 24 }}>
                            <AudioList
                                audioRecords={nodeAudioRecords}
                                onUpdate={onAudioUpdate}
                            />
                        </div>
                    </>
                )}
            </Modal>
        </div>
    );
}

export default StructureManager;
