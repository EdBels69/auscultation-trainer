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
    Upload,
    Row,
    Col,
} from 'antd';
import {
    EditOutlined,
    SaveOutlined,
    CloseOutlined,
    DeleteOutlined,
    SoundOutlined,
    UploadOutlined,
    ArrowUpOutlined,
    ArrowDownOutlined
} from '@ant-design/icons';
import { updateSound, updateSoundWithFile, deleteSound, updateSoundPositions } from '../services/api';
import AudioPlayer from './AudioPlayer';

const { Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const AUSCULTATION_POINTS = [
    { value: 'A', label: 'A — Аортальная' },
    { value: 'P', label: 'P — Пульмональная' },
    { value: 'E', label: 'E — Эрба (Боткина)' },
    { value: 'T', label: 'T — Трикуспидальная' },
    { value: 'M', label: 'M — Митральная (верхушка)' },
];

function AudioList({ audioRecords, onUpdate }) {
    const [editingId, setEditingId] = useState(null);
    const [editForm] = Form.useForm();
    const [audioFile, setAudioFile] = useState(null);

    const [editCategory, setEditCategory] = useState(null);

    const startEditing = (record) => {
        setEditingId(record.id);
        setAudioFile(null);
        setEditCategory(record.category || 'cardiac');
        editForm.setFieldsValue({
            name: record.name,
            description: record.description,
            category: record.category,
            auscultation_point: record.auscultationPoint || undefined,
            explanation: record.explanation || '',
            clinical_context: record.clinicalContext || '',
            difficulty: record.difficulty || 'medium',
        });
    };

    const cancelEditing = () => {
        setEditingId(null);
        setAudioFile(null);
        setEditCategory(null);
        editForm.resetFields();
    };

    const handleUpdate = async (item) => {
        try {
            const values = await editForm.validateFields();

            const updateData = {
                name: values.name,
                description: values.description,
                category: values.category,
                linked_node_key: item.linkedNodeKey,
                auscultation_point: values.category === 'cardiac' ? (values.auscultation_point || null) : null,
                explanation: values.explanation || null,
                clinical_context: values.clinical_context || null,
                difficulty: values.difficulty || 'medium',
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

    const handleMoveUp = async (item) => {
        const categoryRecords = audioRecords.filter(r => r.category === item.category);
        const currentIndex = categoryRecords.findIndex(r => r.id === item.id);

        if (currentIndex <= 0) return;

        const prevItem = categoryRecords[currentIndex - 1];
        const updates = [
            { id: item.id, position: prevItem.position },
            { id: prevItem.id, position: item.position }
        ];

        try {
            await updateSoundPositions(updates);
            message.success('Запись перемещена');
            if (onUpdate) onUpdate();
        } catch (error) {
            console.error('Move error:', error);
            message.error('Ошибка перемещения');
        }
    };

    const handleMoveDown = async (item) => {
        const categoryRecords = audioRecords.filter(r => r.category === item.category);
        const currentIndex = categoryRecords.findIndex(r => r.id === item.id);

        if (currentIndex >= categoryRecords.length - 1) return;

        const nextItem = categoryRecords[currentIndex + 1];
        const updates = [
            { id: item.id, position: nextItem.position },
            { id: nextItem.id, position: item.position }
        ];

        try {
            await updateSoundPositions(updates);
            message.success('Запись перемещена');
            if (onUpdate) onUpdate();
        } catch (error) {
            console.error('Move error:', error);
            message.error('Ошибка перемещения');
        }
    };

    const canMoveUp = (item) => {
        const categoryRecords = audioRecords.filter(r => r.category === item.category);
        const currentIndex = categoryRecords.findIndex(r => r.id === item.id);
        return currentIndex > 0;
    };

    const canMoveDown = (item) => {
        const categoryRecords = audioRecords.filter(r => r.category === item.category);
        const currentIndex = categoryRecords.findIndex(r => r.id === item.id);
        return currentIndex < categoryRecords.length - 1;
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
                                    <Row gutter={12}>
                                        <Col span={14}>
                                            <Form.Item
                                                name="description"
                                                label="Информация о пациенте"
                                                style={{ marginBottom: 8 }}
                                            >
                                                <Input placeholder="М, 54 года, анамнез..." />
                                            </Form.Item>
                                        </Col>
                                        <Col span={10}>
                                            <Form.Item
                                                name="category"
                                                label="Категория"
                                                rules={[{ required: true }]}
                                                style={{ marginBottom: 8 }}
                                            >
                                                <Select onChange={(v) => setEditCategory(v)}>
                                                    <Option value="cardiac">Кардиология</Option>
                                                    <Option value="pulmonary">Пульмонология</Option>
                                                </Select>
                                            </Form.Item>
                                        </Col>
                                    </Row>

                                    <Row gutter={12}>
                                        <Col span={14}>
                                            {editCategory === 'cardiac' && (
                                                <Form.Item
                                                    name="auscultation_point"
                                                    label="Точка аускультации"
                                                    style={{ marginBottom: 8 }}
                                                >
                                                    <Select allowClear placeholder="Выберите точку">
                                                        {AUSCULTATION_POINTS.map(p => (
                                                            <Option key={p.value} value={p.value}>{p.label}</Option>
                                                        ))}
                                                    </Select>
                                                </Form.Item>
                                            )}
                                        </Col>
                                        <Col span={10}>
                                            <Form.Item
                                                name="difficulty"
                                                label="Сложность"
                                                style={{ marginBottom: 8 }}
                                            >
                                                <Select>
                                                    <Option value="easy"><Tag color="green">Лёгкий</Tag></Option>
                                                    <Option value="medium"><Tag color="orange">Средний</Tag></Option>
                                                    <Option value="hard"><Tag color="red">Сложный</Tag></Option>
                                                </Select>
                                            </Form.Item>
                                        </Col>
                                    </Row>

                                    <Form.Item
                                        name="explanation"
                                        label="Объяснение для теста"
                                        style={{ marginBottom: 8 }}
                                    >
                                        <TextArea rows={2} placeholder="Почему этот ответ правильный..." />
                                    </Form.Item>

                                    <Form.Item
                                        name="clinical_context"
                                        label="Клинический контекст для ИИ"
                                        style={{ marginBottom: 8 }}
                                    >
                                        <TextArea rows={2} placeholder="Диагноз, механизм, дифдиагноз..." />
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
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                                <SoundOutlined style={{ color: hasAudio(item) ? '#52c41a' : '#faad14' }} />
                                                <Text strong>{item.name}</Text>
                                                <Tag color={item.category === 'cardiac' ? 'red' : 'blue'}>
                                                    {item.category === 'cardiac' ? 'Кард' : 'Пульм'}
                                                </Tag>
                                                {item.auscultationPoint && (
                                                    <Tag color="purple">{item.auscultationPoint}</Tag>
                                                )}
                                                {item.difficulty && item.difficulty !== 'medium' && (
                                                    <Tag color={item.difficulty === 'easy' ? 'green' : 'red'}>
                                                        {item.difficulty === 'easy' ? 'Лёгкий' : 'Сложный'}
                                                    </Tag>
                                                )}
                                                {item.explanation && (
                                                    <Tag color="cyan" style={{ fontSize: 11 }}>✓ объяснение</Tag>
                                                )}
                                                {item.clinicalContext && (
                                                    <Tag color="geekblue" style={{ fontSize: 11 }}>✓ ИИ-контекст</Tag>
                                                )}
                                            </div>
                                            {item.description && (
                                                <Text type="secondary" style={{ fontSize: 12 }}>
                                                    {item.description}
                                                </Text>
                                            )}
                                        </div>
                                        <Space>
                                            <Button
                                                size="small"
                                                icon={<ArrowUpOutlined />}
                                                onClick={() => handleMoveUp(item)}
                                                disabled={!canMoveUp(item)}
                                                title="Переместить выше"
                                            />
                                            <Button
                                                size="small"
                                                icon={<ArrowDownOutlined />}
                                                onClick={() => handleMoveDown(item)}
                                                disabled={!canMoveDown(item)}
                                                title="Переместить ниже"
                                            />
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
                                    {hasAudio(item) && (
                                        <div style={{
                                            background: '#f7f9fb',
                                            padding: 12,
                                            borderRadius: 6,
                                            border: '1px solid #e3e8ee'
                                        }}>
                                            <AudioPlayer audioUrl={item.audioUrl} />
                                        </div>
                                    )}
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
