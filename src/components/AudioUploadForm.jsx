import { useState, useEffect } from 'react';
import { Form, Input, Select, Button, Upload, message, Row, Col } from 'antd';
import { UploadOutlined, SoundOutlined } from '@ant-design/icons';
import { addSound } from '../services/api';

const { Option } = Select;

function AudioUploadForm({ onUploadSuccess, initialNodeKey = null, initialNodeName = null }) {
    const [form] = Form.useForm();
    const [uploading, setUploading] = useState(false);
    const [fileList, setFileList] = useState([]);

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
                name: initialNodeName || values.position,
                description: values.position,
                category: values.category,
                position: values.position,
                linked_node_key: initialNodeKey
            };

            await addSound(submissionData, file, null, null);
            message.success('Аудиозапись добавлена');
            form.resetFields();
            setFileList([]);
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

    return (
        <div>
            <Form
                form={form}
                layout="vertical"
                onFinish={handleUpload}
                size="small"
            >
                <Row gutter={12}>
                    <Col span={12}>
                        <Form.Item
                            name="position"
                            label="Информация о пациенте"
                            rules={[{ required: true, message: 'Обязательно' }]}
                            style={{ marginBottom: 8 }}
                        >
                            <Input placeholder="М, 54 года, анамнез..." />
                        </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item
                            name="category"
                            label="Категория"
                            initialValue="cardiac"
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

                <Form.Item
                    label="Аудиофайл"
                    required
                    style={{ marginBottom: 12 }}
                >
                    <Upload {...audioUploadProps} maxCount={1}>
                        <Button icon={<SoundOutlined />} block>
                            {fileList.length ? fileList[0].name : 'Выбрать MP3/WAV'}
                        </Button>
                    </Upload>
                </Form.Item>

                <Button
                    type="primary"
                    htmlType="submit"
                    loading={uploading}
                    icon={<UploadOutlined />}
                    block
                >
                    Добавить
                </Button>
            </Form>
        </div>
    );
}

export default AudioUploadForm;
