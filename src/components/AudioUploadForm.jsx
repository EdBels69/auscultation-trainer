import { useState, useEffect } from 'react';
import { Form, Input, Select, Button, Upload, message, Row, Col } from 'antd';
import { UploadOutlined, SoundOutlined, PictureOutlined } from '@ant-design/icons';
import { addSound } from '../services/api';

const { Option } = Select;

function AudioUploadForm({ onUploadSuccess, initialNodeKey = null, initialNodeName = null }) {
    const [form] = Form.useForm();
    const [uploading, setUploading] = useState(false);
    const [fileList, setFileList] = useState([]);
    const [imageFile, setImageFile] = useState(null);

    useEffect(() => {
        if (initialNodeName) {
            form.setFieldsValue({ name: initialNodeName });
        }
    }, [initialNodeName, form]);

    const handleUpload = async (values) => {
        if (fileList.length === 0) {
            message.error('Выберите аудиофайл');
            return;
        }

        const file = fileList[0];
        setUploading(true);

        try {
            const submissionData = {
                ...values,
                linked_node_key: initialNodeKey
            };

            await addSound(submissionData, file, imageFile);
            message.success('Запись добавлена');
            form.resetFields();
            setFileList([]);
            setImageFile(null);
            if (onUploadSuccess) onUploadSuccess();
        } catch (error) {
            console.error('Upload error:', error);
            message.error('Ошибка: ' + error.message);
        } finally {
            setUploading(false);
        }
    };

    const audioUploadProps = {
        onRemove: () => setFileList([]),
        beforeUpload: (file) => {
            if (!file.type.startsWith('audio/')) {
                message.error('Только аудио файлы!');
                return Upload.LIST_IGNORE;
            }
            setFileList([file]);
            return false;
        },
        fileList,
    };

    const imageUploadProps = {
        beforeUpload: (file) => {
            if (!file.type.startsWith('image/')) {
                message.error('Только изображения!');
                return Upload.LIST_IGNORE;
            }
            setImageFile(file);
            return false;
        },
        onRemove: () => setImageFile(null),
        fileList: imageFile ? [imageFile] : [],
    };

    return (
        <div style={{
            background: '#fafbfc',
            borderRadius: 8,
            padding: 16,
            marginBottom: 16,
            border: '1px solid #e3e8ee'
        }}>
            <div style={{
                fontSize: 13,
                fontWeight: 600,
                marginBottom: 12,
                color: '#0a2540'
            }}>
                Добавить запись
            </div>

            <Form
                form={form}
                layout="vertical"
                onFinish={handleUpload}
                size="small"
            >
                <Row gutter={12}>
                    <Col span={12}>
                        <Form.Item
                            name="name"
                            label="Название"
                            rules={[{ required: true, message: 'Обязательно' }]}
                            style={{ marginBottom: 8 }}
                        >
                            <Input placeholder="Название звука" />
                        </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item
                            name="category"
                            label="Категория"
                            initialValue={initialNodeKey ? "cardiac" : undefined}
                            rules={[{ required: true, message: 'Обязательно' }]}
                            style={{ marginBottom: 8 }}
                        >
                            <Select placeholder="Выбрать">
                                <Option value="cardiac">Кардиология</Option>
                                <Option value="pulmonary">Пульмонология</Option>
                            </Select>
                        </Form.Item>
                    </Col>
                </Row>

                <Row gutter={12}>
                    <Col span={12}>
                        <Form.Item
                            name="position"
                            label="Точка аускультации"
                            rules={[{ required: true, message: 'Обязательно' }]}
                            style={{ marginBottom: 8 }}
                        >
                            <Input placeholder="2-е межреберье" />
                        </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item
                            name="description"
                            label="Описание"
                            rules={[{ required: true, message: 'Обязательно' }]}
                            style={{ marginBottom: 8 }}
                        >
                            <Input placeholder="Краткое описание" />
                        </Form.Item>
                    </Col>
                </Row>

                <Row gutter={12}>
                    <Col span={16}>
                        <Form.Item
                            label="Аудиофайл"
                            required
                            style={{ marginBottom: 8 }}
                        >
                            <Upload {...audioUploadProps} maxCount={1}>
                                <Button icon={<SoundOutlined />} block>
                                    {fileList.length ? fileList[0].name : 'Выбрать MP3/WAV'}
                                </Button>
                            </Upload>
                        </Form.Item>
                    </Col>
                    <Col span={8}>
                        <Form.Item
                            label="Картинка"
                            style={{ marginBottom: 8 }}
                        >
                            <Upload {...imageUploadProps} maxCount={1}>
                                <Button icon={<PictureOutlined />} block>
                                    {imageFile ? '✓' : 'Файл'}
                                </Button>
                            </Upload>
                        </Form.Item>
                    </Col>
                </Row>

                <Button
                    type="primary"
                    htmlType="submit"
                    loading={uploading}
                    icon={<UploadOutlined />}
                    block
                >
                    Сохранить
                </Button>
            </Form>
        </div>
    );
}

export default AudioUploadForm;
