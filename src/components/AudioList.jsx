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
    Collapse
} from 'antd';
import {
    EditOutlined,
    SaveOutlined,
    CloseOutlined,
    DeleteOutlined,
    SoundOutlined
} from '@ant-design/icons';
import { updateSound, deleteSound } from '../services/api';

const { Title, Text } = Typography;
const { Option } = Select;
const { Panel } = Collapse;

function AudioList({ audioRecords, onUpdate }) {
    const [editingId, setEditingId] = useState(null);
    const [editForm] = Form.useForm();

    const startEditing = (record) => {
        setEditingId(record.id);
        editForm.setFieldsValue({
            name: record.name,
            description: record.description,
            category: record.category,
            position: record.position
        });
    };

    const cancelEditing = () => {
        setEditingId(null);
        editForm.resetFields();
    };

    const handleUpdate = async (id) => {
        try {
            const values = await editForm.validateFields();
            await updateSound(id, values);
            message.success('Запись обновлена');
            setEditingId(null);
            if (onUpdate) onUpdate();
        } catch (error) {
            console.error('Update error:', error);
            message.error('Ошибка обновления');
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

    // Grouping logic
    const groupedRecords = audioRecords.reduce((acc, record) => {
        const key = record.name.trim();
        if (!acc[key]) {
            acc[key] = [];
        }
        acc[key].push(record);
        return acc;
    }, {});

    const renderRecordCard = (item) => (
        <Card
            key={item.id}
            style={{ marginBottom: 16 }}
            actions={[
                editingId === item.id ? (
                    <Button
                        type="link"
                        icon={<SaveOutlined />}
                        onClick={() => handleUpdate(item.id)}
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
                        onConfirm={() => handleDelete(item.id, item.file_path)}
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
                    <Form.Item name="name" style={{ marginBottom: 8 }}>
                        <Input />
                    </Form.Item>
                    <Form.Item name="category" style={{ marginBottom: 8 }}>
                        <Select>
                            <Option value="cardiac">Кардиология</Option>
                            <Option value="pulmonary">Пульмонология</Option>
                        </Select>
                    </Form.Item>
                    <Form.Item name="position" style={{ marginBottom: 8 }}>
                        <Input />
                    </Form.Item>
                    <Form.Item name="description" style={{ marginBottom: 8 }}>
                        <Input.TextArea rows={3} />
                    </Form.Item>
                </Form>
            ) : (
                <>
                    <Card.Meta
                        avatar={
                            <SoundOutlined style={{
                                fontSize: 24,
                                color: item.category === 'cardiac' ? '#ff4d4f' : '#1890ff'
                            }} />
                        }
                        title={item.name}
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
                                {item.fileName && (
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
