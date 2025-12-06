import { useState } from 'react';
import {
    List,
    Card,
    Button,
    Popconfirm,
    Form,
    Input,
    Select,
    Typography,
    Space,
    Tag,
    message,
    Collapse,
    Upload,
    Alert
} from 'antd';
import {
    EditOutlined,
    SaveOutlined,
    CloseOutlined,
    DeleteOutlined,
    SoundOutlined,
    UploadOutlined,
    CheckCircleOutlined,
    WarningOutlined,
    PictureOutlined
} from '@ant-design/icons';
import { updateSound, updateSoundWithFile, deleteSound } from '../services/api';

const { Title, Text } = Typography;
const { Option } = Select;
const { Panel } = Collapse;

function AudioList({ audioRecords, onUpdate }) {
    const [editingId, setEditingId] = useState(null);
    const [editForm] = Form.useForm();
    const [audioFile, setAudioFile] = useState(null);
    const [imageFile, setImageFile] = useState(null);

    const startEditing = (record) => {
        setEditingId(record.id);
        setAudioFile(null);
        setImageFile(null);
        editForm.setFieldsValue({
            name: record.name,
            description: record.description,
            category: record.category,
            position: record.position
        });
    };

    const cancelEditing = () => {
        setEditingId(null);
        setAudioFile(null);
        setImageFile(null);
        editForm.resetFields();
    };

    const handleUpdate = async (item) => {
        try {
            const values = await editForm.validateFields();

            // Use file upload version if new files provided
            if (audioFile || imageFile) {
                await updateSoundWithFile(
                    item.id,
                    { ...values, linked_node_key: item.linkedNodeKey },
                    audioFile,
                    imageFile,
                    item.filePath
                );
            } else {
                await updateSound(item.id, { ...values, linked_node_key: item.linkedNodeKey });
            }

            message.success('Запись обновлена');
            setEditingId(null);
            setAudioFile(null);
            setImageFile(null);
            if (onUpdate) onUpdate();
        } catch (error) {
            console.error('Update error:', error);
            message.error('Ошибка обновления: ' + error.message);
        }
    };

    const handleDelete = async (id, filePath) => {
        try {
            await deleteSound(id, filePath);
            message.success('Запись удалена');
            if (onUpdate) onUpdate();
        } catch (error) {
            console.error('Delete error:', error);
            message.error('Ошибка удаления');
        }
    };

    const audioUploadProps = {
        beforeUpload: (file) => {
            const isAudio = file.type.startsWith('audio/');
            if (!isAudio) {
                message.error('Можно загружать только аудио файлы!');
                return Upload.LIST_IGNORE;
            }
            setAudioFile(file);
            return false;
        },
        onRemove: () => setAudioFile(null),
        fileList: audioFile ? [audioFile] : [],
    };

    const imageUploadProps = {
        beforeUpload: (file) => {
            const isImage = file.type.startsWith('image/');
            if (!isImage) {
                message.error('Можно загружать только изображения!');
                return Upload.LIST_IGNORE;
            }
            setImageFile(file);
            return false;
        },
        onRemove: () => setImageFile(null),
        fileList: imageFile ? [imageFile] : [],
    };

    // Grouping logic
    const groupedRecords = audioRecords.reduce((acc, record) => {
        const key = record.name.trim();
        if (!acc[key]) {
            acc[key] = [];
        }
        acc[key].push(record);
        return acc;
    }, {});

    const hasAudio = (item) => item.filePath && item.filePath !== 'placeholder';

    const renderRecordCard = (item) => (
        <Card
            key={item.id}
            style={{ marginBottom: 16 }}
            actions={[
                editingId === item.id ? (
                    <Button
                        type="link"
                        icon={<SaveOutlined />}
                        onClick={() => handleUpdate(item)}
                    >
                        Сохранить
                    </Button>
                ) : (
                    <Button
                        type="text"
                        icon={<EditOutlined />}
                        onClick={() => startEditing(item)}
                    >
                        Изменить
                    </Button>
                ),
                editingId === item.id ? (
                    <Button
                        type="link"
                        danger
                        icon={<CloseOutlined />}
                        onClick={cancelEditing}
                    >
                        Отмена
                    </Button>
                ) : (
                    <Popconfirm
                        title="Удалить запись?"
                        description="Это действие нельзя отменить"
                        onConfirm={() => handleDelete(item.id, item.filePath)}
                        okText="Да"
                        cancelText="Нет"
                    >
                        <Button type="text" danger icon={<DeleteOutlined />}>
                            Удалить
                        </Button>
                    </Popconfirm>
                )
            ]}
        >
            {editingId === item.id ? (
                <Form form={editForm} layout="vertical">
                    <Form.Item name="name" label="Название" style={{ marginBottom: 8 }}>
                        <Input />
                    </Form.Item>
                    <Form.Item name="category" label="Категория" style={{ marginBottom: 8 }}>
                        <Select>
                            <Option value="cardiac">Кардиология</Option>
                            <Option value="pulmonary">Пульмонология</Option>
                        </Select>
                    </Form.Item>
                    <Form.Item name="position" label="Точка аускультации" style={{ marginBottom: 8 }}>
                        <Input />
                    </Form.Item>
                    <Form.Item name="description" label="Описание" style={{ marginBottom: 8 }}>
                        <Input.TextArea rows={3} />
                    </Form.Item>

                    {/* Audio File Upload */}
                    <Form.Item label="Аудиофайл" style={{ marginBottom: 8 }}>
                        {hasAudio(item) ? (
                            <Alert
                                message={`Текущий файл: ${item.fileName || 'Загружен'}`}
                                type="success"
                                showIcon
                                icon={<CheckCircleOutlined />}
                                style={{ marginBottom: 8 }}
                            />
                        ) : (
                            <Alert
                                message="Аудиофайл не загружен!"
                                type="warning"
                                showIcon
                                icon={<WarningOutlined />}
                                style={{ marginBottom: 8 }}
                            />
                        )}
                        <Upload {...audioUploadProps}>
                            <Button icon={<UploadOutlined />}>
                                {hasAudio(item) ? 'Заменить аудио' : 'Загрузить аудио'}
                            </Button>
                        </Upload>
                    </Form.Item>

                    {/* Image Upload */}
                    <Form.Item label="Изображение (необязательно)" style={{ marginBottom: 0 }}>
                        <Upload {...imageUploadProps}>
                            <Button icon={<PictureOutlined />}>
                                {item.imageUrl ? 'Заменить изображение' : 'Добавить изображение'}
                            </Button>
                        </Upload>
                    </Form.Item>
                </Form>
            ) : (
                <>
                    <Card.Meta
                        avatar={
                            <div style={{ position: 'relative' }}>
                                <SoundOutlined style={{
                                    fontSize: 24,
                                    color: item.category === 'cardiac' ? '#ff4d4f' : '#1890ff'
                                }} />
                                {!hasAudio(item) && (
                                    <WarningOutlined style={{
                                        position: 'absolute',
                                        top: -4,
                                        right: -8,
                                        fontSize: 12,
                                        color: '#faad14'
                                    }} />
                                )}
                            </div>
                        }
                        title={
                            <Space>
                                {item.name}
                                {!hasAudio(item) && (
                                    <Tag color="warning" style={{ fontSize: 10 }}>Нет аудио</Tag>
                                )}
                            </Space>
                        }
                        description={
                            <Space direction="vertical" size={4} style={{ width: '100%' }}>
                                <Tag color={item.category === 'cardiac' ? 'red' : 'blue'}>
                                    {item.category === 'cardiac' ? 'Кардиология' : 'Пульмонология'}
                                </Tag>
                                <Text type="secondary" style={{ fontSize: 12 }}>
                                    {item.position}
                                </Text>
                                <Text ellipsis={{ tooltip: item.description }}>
                                    {item.description}
                                </Text>
                                {item.fileName && hasAudio(item) && (
                                    <Text type="secondary" style={{ fontSize: 10 }}>
                                        Файл: {item.fileName}
                                    </Text>
                                )}
                            </Space>
                        }
                    />
                </>
            )}
        </Card>
    );

    return (
        <>
            <Title level={3}>Список записей ({audioRecords.length})</Title>
            {Object.entries(groupedRecords).map(([name, records]) => {
                if (records.length === 1) {
                    return renderRecordCard(records[0]);
                }
                return (
                    <Collapse key={name} style={{ marginBottom: 16 }}>
                        <Panel header={`${name} (${records.length} вариантов)`} key="1">
                            <List
                                grid={{ gutter: 16, xs: 1, sm: 1, md: 2, lg: 2, xl: 3, xxl: 3 }}
                                dataSource={records}
                                renderItem={renderRecordCard}
                            />
                        </Panel>
                    </Collapse>
                );
            })}
        </>
    );
}

export default AudioList;
