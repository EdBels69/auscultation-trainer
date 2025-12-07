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
    Upload
} from 'antd';
import {
    EditOutlined,
    SaveOutlined,
    CloseOutlined,
    DeleteOutlined,
    SoundOutlined,
    UploadOutlined
} from '@ant-design/icons';
import { updateSound, updateSoundWithFile, deleteSound } from '../services/api';

const { Text } = Typography;
const { Option } = Select;

function AudioList({ audioRecords, onUpdate }) {
    const [editingId, setEditingId] = useState(null);
    const [editForm] = Form.useForm();
    const [audioFile, setAudioFile] = useState(null);

    const startEditing = (record) => {
        setEditingId(record.id);
        setAudioFile(null);
        editForm.setFieldsValue({
            position: record.position,
            category: record.category
        });
    };

    const cancelEditing = () => {
        setEditingId(null);
        setAudioFile(null);
        editForm.resetFields();
    };

    const handleUpdate = async (item) => {
        try {
            const values = await editForm.validateFields();

            const updateData = {
                ...values,
                name: item.name,
                description: values.position,
                linked_node_key: item.linkedNodeKey
            };

            if (audioFile) {
                await updateSoundWithFile(
                    item.id,
                    updateData,
                    audioFile,
                    null,
                    null,
                    item.filePath
                );
            } else {
                await updateSound(item.id, updateData);
            }

            message.success('Запись обновлена');
            setEditingId(null);
            setAudioFile(null);
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

    const hasAudio = (record) => record.audioUrl && record.audioUrl !== '';

    const audioUploadProps = {
        accept: 'audio/*',
        beforeUpload: (file) => {
            setAudioFile(file);
            return false;
        },
        onRemove: () => setAudioFile(null),
        fileList: audioFile ? [audioFile] : []
    };

    if (!audioRecords || audioRecords.length === 0) {
        return (
            <div style={{
                textAlign: 'center',
                padding: 24,
                background: '#fafbfc',
                borderRadius: 8,
                color: '#8898aa'
            }}>
                Нет аудиозаписей
            </div>
        );
    }

    return (
        <div>
            <List
                dataSource={audioRecords}
                renderItem={(item) => {
                    const isEditing = editingId === item.id;

                    return (
                        <Card
                            size="small"
                            style={{ marginBottom: 8 }}
                            bodyStyle={{ padding: 12 }}
                        >
                            {isEditing ? (
                                <Form form={editForm} layout="vertical" size="small">
                                    <Form.Item
                                        name="position"
                                        label="Информация о пациенте"
                                        rules={[{ required: true }]}
                                        style={{ marginBottom: 8 }}
                                    >
                                        <Input placeholder="М, 54 года, анамнез..." />
                                    </Form.Item>

                                    <Form.Item
                                        name="category"
                                        label="Категория"
                                        rules={[{ required: true }]}
                                        style={{ marginBottom: 8 }}
                                    >
                                        <Select>
                                            <Option value="cardiac">Кардиология</Option>
                                            <Option value="pulmonary">Пульмонология</Option>
                                        </Select>
                                    </Form.Item>

                                    <div style={{ marginBottom: 12 }}>
                                        <Upload {...audioUploadProps} maxCount={1}>
                                            <Button icon={<UploadOutlined />} size="small">
                                                {hasAudio(item) ? 'Заменить аудио' : 'Загрузить аудио'}
                                            </Button>
                                        </Upload>
                                        {audioFile && (
                                            <Text type="success" style={{ fontSize: 11, marginLeft: 8 }}>
                                                ✓ {audioFile.name}
                                            </Text>
                                        )}
                                    </div>

                                    <Space>
                                        <Button
                                            type="primary"
                                            size="small"
                                            icon={<SaveOutlined />}
                                            onClick={() => handleUpdate(item)}
                                        >
                                            Сохранить
                                        </Button>
                                        <Button
                                            size="small"
                                            icon={<CloseOutlined />}
                                            onClick={cancelEditing}
                                        >
                                            Отмена
                                        </Button>
                                    </Space>
                                </Form>
                            ) : (
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <SoundOutlined style={{ color: hasAudio(item) ? '#52c41a' : '#faad14' }} />
                                            <Text strong>{item.name}</Text>
                                            <Tag color={item.category === 'cardiac' ? 'red' : 'blue'}>
                                                {item.category === 'cardiac' ? 'Кард' : 'Пульм'}
                                            </Tag>
                                        </div>
                                        <Text type="secondary" style={{ fontSize: 12 }}>
                                            {item.position}
                                        </Text>
                                    </div>
                                    <Space>
                                        <Button
                                            size="small"
                                            icon={<EditOutlined />}
                                            onClick={() => startEditing(item)}
                                        >
                                            Изменить
                                        </Button>
                                        <Popconfirm
                                            title="Удалить запись?"
                                            onConfirm={() => handleDelete(item.id, item.filePath)}
                                            okText="Да"
                                            cancelText="Нет"
                                        >
                                            <Button size="small" danger icon={<DeleteOutlined />}>
                                                Удалить
                                            </Button>
                                        </Popconfirm>
                                    </Space>
                                </div>
                            )}
                        </Card>
                    );
                }}
            />
        </div>
    );
}

export default AudioList;
