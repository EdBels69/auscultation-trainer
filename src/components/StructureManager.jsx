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
    Spin,
    Upload
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
    ExclamationCircleOutlined,
    UploadOutlined,
    PictureOutlined
} from '@ant-design/icons';
import {
    getLearningNodes,
    addLearningNode,
    updateLearningNodeWithFiles,
    updateLearningNode,
    deleteLearningNode,
    addSound
} from '../services/api';
import { learningStructure } from '../data/learningStructure';
import AudioUploadForm from './AudioUploadForm';
import AudioList from './AudioList';
import IconPicker, { renderIconByName } from './IconPicker';

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

    // File upload state for node editing
    const [nodeImageFile, setNodeImageFile] = useState(null);
    const [nodeAudiogramFile, setNodeAudiogramFile] = useState(null);
    const [saving, setSaving] = useState(false);

    // Icon Picker state
    const [isIconPickerOpen, setIsIconPickerOpen] = useState(false);
    const [selectedIcon, setSelectedIcon] = useState(null);

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
            const allKeys = data.map(n => n.id);
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

        // Sort by order_index
        const sortedData = [...data].sort((a, b) => (a.order_index || 0) - (b.order_index || 0));

        sortedData.forEach(item => {
            map[item.id] = { ...item, key: item.id, children: [] };
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
                            parent_key: system.key,
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
                                    parent_key: category.key,
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
                                            parent_key: item.key,
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
            const allKeys = data.map(n => n.id);
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
        setNodeImageFile(null);
        setNodeAudiogramFile(null);
        setSelectedIcon(node.icon || null);
        form.setFieldsValue({
            name: node.name,
            description: node.description || '',
            is_hidden: node.is_hidden,
            order: node.order
        });
        setIsModalVisible(true);
    };

    const handleIconSelect = (icon) => {
        setSelectedIcon(icon);
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
        setSaving(true);
        try {
            if (editingNode) {
                // Update with files if any were selected
                await updateLearningNodeWithFiles(
                    editingNode.id,
                    {
                        name: values.name,
                        title: values.name,
                        description: values.description || null,
                        is_hidden: values.is_hidden,
                        order_index: values.order !== undefined ? values.order : editingNode.order_index,
                        parent_id: editingNode.parent_id,
                        image_url: editingNode.image_url,
                        audiogram_url: editingNode.audiogram_url,
                        icon: selectedIcon
                    },
                    nodeImageFile,
                    nodeAudiogramFile
                );
                setNodeImageFile(null);
                setNodeAudiogramFile(null);
                setSelectedIcon(null);
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
                    title: values.name,
                    key: uniqueKey,
                    type: nodeType,
                    parent_key: parentNodeForAdd ? parentNodeForAdd.key : null,
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
        } finally {
            setSaving(false);
        }
    };

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

            const dropNode = ar.find(n => n.key === dropKey);
            dragObj.parent_id = dropNode?.parent_id || null;
        }

        setNodes(data);

        try {
            const flattenWithOrder = (nodes, parentId = null) => {
                let result = [];
                nodes.forEach((node, index) => {
                    result.push({ id: node.id, order_index: index, parent_id: parentId });
                    if (node.children && node.children.length > 0) {
                        result = result.concat(flattenWithOrder(node.children, node.id));
                    }
                });
                return result;
            };

            const updates = flattenWithOrder(data);

            for (const update of updates) {
                await updateLearningNode(update.id, {
                    order_index: update.order_index,
                    parent_id: update.parent_id
                });
            }

            message.success('Порядок сохранён');
        } catch (error) {
            console.error('Failed to save order:', error);
            message.error('Ошибка сохранения порядка');
            loadNodes();
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

    // Проверка полноты контента для узла - только проверяем наличие аудиозаписей
    const getContentStatus = (nodeKey) => {
        if (!audioRecords) return null;
        const records = audioRecords.filter(r => r.linkedNodeKey === nodeKey);

        if (records.length === 0) return 'empty'; // Нет записей

        // Проверяем что у всех записей есть аудиофайл
        const allHaveAudio = records.every(r => r.audioUrl && r.audioUrl !== '');

        if (allHaveAudio) return 'complete';
        return 'incomplete';
    };

    const renderTreeNodes = (data) =>
        data.map((item) => ({
            title: (
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', gap: 10, alignItems: 'center' }}>
                    <span>
                        {item.icon ? (
                            <span style={{ marginRight: 6 }}>{renderIconByName(item.icon, { fontSize: 16 })}</span>
                        ) : (
                            <>
                                {item.type === 'category' && <FolderOutlined style={{ marginRight: 6 }} />}
                                {(item.type === 'item' || item.type === 'subtype') && (
                                    item.children && item.children.length > 0
                                        ? <FolderOutlined style={{ marginRight: 6 }} />
                                        : <FileTextOutlined style={{ marginRight: 6 }} />
                                )}
                            </>
                        )}
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
                        {/* Кнопка аудио - только для конечных узлов */}
                        {(!item.children || item.children.length === 0) && (
                            <Tooltip title="🎵 Аудиозаписи">
                                <Button
                                    size="small"
                                    icon={<SoundOutlined />}
                                    onClick={() => handleManageContent(item)}
                                    style={{
                                        background: '#e6f7ff',
                                        borderColor: '#1890ff',
                                        color: '#1890ff'
                                    }}
                                />
                            </Tooltip>
                        )}
                        {/* Редактирование */}
                        <Tooltip title="✏️ Редактировать (описание, картинка)">
                            <Button
                                size="small"
                                icon={<EditOutlined />}
                                onClick={() => handleEdit(item)}
                                style={{
                                    background: '#fff7e6',
                                    borderColor: '#ffa940',
                                    color: '#fa8c16'
                                }}
                            />
                        </Tooltip>
                        {/* Добавить подпапку */}
                        <Tooltip title={`➕ Добавить ${getTypeName(getChildType(item.type)).toLowerCase()}`}>
                            <Button
                                size="small"
                                icon={<PlusOutlined />}
                                onClick={() => handleAdd(item)}
                                style={{
                                    background: '#f6ffed',
                                    borderColor: '#52c41a',
                                    color: '#52c41a'
                                }}
                            />
                        </Tooltip>
                        {/* Удалить */}
                        <Popconfirm title="Удалить?" onConfirm={() => handleDelete(item.id)}>
                            <Button
                                size="small"
                                danger
                                icon={<DeleteOutlined />}
                                style={{ background: '#fff1f0' }}
                            />
                        </Popconfirm>
                    </Space>
                </div>
            ),
            key: item.id,
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
            <div style={{ marginBottom: 16, display: 'flex', gap: 12, alignItems: 'center' }}>
                <Button type="primary" icon={<PlusOutlined />} onClick={() => handleAdd(null)}>
                    Добавить корневую систему
                </Button>
                <span style={{ color: '#888', fontSize: 13 }}>
                    Перетаскивайте элементы для изменения порядка
                </span>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: 40 }}>
                    <Spin />
                </div>
            ) : (
                <Tree
                    showLine
                    draggable
                    switcherIcon={<DownOutlined />}
                    treeData={renderTreeNodes(nodes)}
                    expandedKeys={expandedKeys}
                    onExpand={setExpandedKeys}
                    onDrop={handleDrop}
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
                onCancel={() => !saving && setIsModalVisible(false)}
                onOk={form.submit}
                okText={saving ? 'Сохранение...' : (editingNode ? 'Сохранить' : 'Создать')}
                cancelText="Отмена"
                confirmLoading={saving}
                cancelButtonProps={{ disabled: saving }}
            >
                <Form form={form} layout="vertical" onFinish={handleSave}>
                    {/* Icon picker for editing */}
                    {editingNode && (
                        <Form.Item label="Иконка раздела">
                            <Button
                                onClick={() => setIsIconPickerOpen(true)}
                                style={{
                                    height: 48,
                                    minWidth: 80,
                                    fontSize: 24,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 8
                                }}
                            >
                                {selectedIcon ? (
                                    renderIconByName(selectedIcon, { fontSize: 24 })
                                ) : (
                                    <span style={{ color: '#bbb' }}>Выбрать иконку</span>
                                )}
                            </Button>
                        </Form.Item>
                    )}

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
                        <Form.Item name="description" label="Описание раздела">
                            <Input.TextArea
                                rows={4}
                                placeholder="Обобщающий текст для этой категории..."
                            />
                        </Form.Item>
                    )}

                    {/* Image Upload for editing */}
                    {editingNode && (
                        <Form.Item label="Изображение темы" style={{ marginBottom: 12 }}>
                            {editingNode.image_url && !nodeImageFile && (
                                <div style={{ marginBottom: 8 }}>
                                    <img src={editingNode.image_url} alt="Изображение" style={{ height: 80, objectFit: 'contain', borderRadius: 4 }} />
                                </div>
                            )}
                            {nodeImageFile && (
                                <div style={{ marginBottom: 8, color: '#52c41a', fontSize: 12 }}>
                                    ✓ Выбран файл: {nodeImageFile.name}
                                </div>
                            )}
                            <Upload
                                accept="image/*"
                                beforeUpload={(file) => {
                                    setNodeImageFile(file);
                                    return false;
                                }}
                                showUploadList={false}
                            >
                                <Button icon={<PictureOutlined />}>
                                    {editingNode.image_url ? 'Заменить' : 'Загрузить'} изображение
                                </Button>
                            </Upload>
                        </Form.Item>
                    )}

                    {/* Audiogram Upload for editing */}
                    {editingNode && (
                        <Form.Item label="Аудиограмма (необязательно)" style={{ marginBottom: 12 }}>
                            {editingNode.audiogram_url && !nodeAudiogramFile && (
                                <div style={{ marginBottom: 8 }}>
                                    <img src={editingNode.audiogram_url} alt="Аудиограмма" style={{ height: 60, objectFit: 'contain', borderRadius: 4 }} />
                                </div>
                            )}
                            {nodeAudiogramFile && (
                                <div style={{ marginBottom: 8, color: '#52c41a', fontSize: 12 }}>
                                    ✓ Выбран файл: {nodeAudiogramFile.name}
                                </div>
                            )}
                            <Upload
                                accept="image/*"
                                beforeUpload={(file) => {
                                    setNodeAudiogramFile(file);
                                    return false;
                                }}
                                showUploadList={false}
                            >
                                <Button icon={<UploadOutlined />}>
                                    {editingNode.audiogram_url ? 'Заменить' : 'Загрузить'} аудиограмму
                                </Button>
                            </Upload>
                        </Form.Item>
                    )}

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

            {/* Icon Picker Modal */}
            <IconPicker
                visible={isIconPickerOpen}
                onClose={() => setIsIconPickerOpen(false)}
                onSelect={handleIconSelect}
                currentIcon={selectedIcon}
            />

            {/* Content Management Modal */}
            <Modal
                title={
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        color: '#0a2540'
                    }}>
                        <SoundOutlined style={{ color: '#1890ff' }} />
                        <span>Аудиозаписи: <strong>{selectedNodeForContent?.name || ''}</strong></span>
                    </div>
                }
                open={contentModalVisible}
                onCancel={() => setContentModalVisible(false)}
                footer={null}
                width={700}
            >
                {selectedNodeForContent && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                        {/* Секция добавления */}
                        <div style={{
                            background: 'linear-gradient(135deg, #e6f7ff 0%, #f0f9ff 100%)',
                            borderRadius: 12,
                            padding: 20,
                            border: '1px solid #91d5ff'
                        }}>
                            <div style={{
                                fontSize: 14,
                                fontWeight: 600,
                                marginBottom: 16,
                                color: '#0050b3',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8
                            }}>
                                ➕ Добавить новую аудиозапись
                            </div>
                            <AudioUploadForm
                                onUploadSuccess={onAudioUpdate}
                                initialNodeKey={selectedNodeForContent.key}
                                initialNodeName={selectedNodeForContent.name}
                            />
                        </div>

                        {/* Секция списка */}
                        <div style={{
                            background: '#fafbfc',
                            borderRadius: 12,
                            padding: 20,
                            border: '1px solid #e3e8ee'
                        }}>
                            <div style={{
                                fontSize: 14,
                                fontWeight: 600,
                                marginBottom: 16,
                                color: '#0a2540',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8
                            }}>
                                📋 Существующие записи ({nodeAudioRecords.length})
                            </div>
                            <AudioList
                                audioRecords={nodeAudioRecords}
                                onUpdate={onAudioUpdate}
                            />
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}

export default StructureManager;
