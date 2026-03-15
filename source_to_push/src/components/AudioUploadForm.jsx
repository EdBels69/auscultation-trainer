import { useState, useEffect } from 'react';
import { Form, Input, Select, Button, Upload, message, Row, Col, Divider, Image } from 'antd';
import { UploadOutlined, SoundOutlined, PictureOutlined } from '@ant-design/icons';
import { addSound } from '../services/api';

const { Option } = Select;

const AUSCULTATION_POINTS = [
    {
        value: 'A',
        label: 'A - Аортальная область',
        description: '2-е межреберье справа от грудины'
    },
    {
        value: 'P',
        label: 'P - Пульмональная область',
        description: '2-е межреберье слева от грудины'
    },
    {
        value: 'E',
        label: 'E - Точка Эрба (Боткина)',
        description: '3-е межреберье слева от грудины'
    },
    {
        value: 'T',
        label: 'T - Трикуспидальная область',
        description: 'У нижнего края грудины слева'
    },
    {
        value: 'M',
        label: 'M - Митральная область (верхушка)',
        description: '5-е межреберье по среднеключичной линии'
    }
];

function AudioUploadForm({ onUploadSuccess, initialNodeKey = null, initialNodeName = null }) {
    const [form] = Form.useForm();
    const [uploading, setUploading] = useState(false);
    const [fileList, setFileList] = useState([]);
    const [imageFileList, setImageFileList] = useState([]);
    const [category, setCategory] = useState('cardiac');
    const [imagePreview, setImagePreview] = useState(null);

    useEffect(() => {
        if (initialNodeName) {
            form.setFieldsValue({ name: initialNodeName });
        }
    }, [initialNodeName, form]);

    const handleCategoryChange = (value) => {
        setCategory(value);
        if (value !== 'cardiac') {
            form.setFieldsValue({ auscultation_point: undefined });
        }
    };

    const handleUpload = async (values) => {
        if (fileList.length === 0) {
            message.error('Выберите аудиофайл');
            return;
        }

        const file = fileList[0];
        const imageFile = imageFileList.length > 0 ? imageFileList[0] : null;
        setUploading(true);

        try {
            const submissionData = {
                name: initialNodeName || values.description,
                description: values.description,
                category: values.category,
                linked_node_key: initialNodeKey,
                auscultation_point: values.category === 'cardiac' ? values.auscultation_point : null
            };

            await addSound(submissionData, file, imageFile);
            message.success('Аудиозапись добавлена');
            form.resetFields();
            setFileList([]);
            setImageFileList([]);
            setImagePreview(null);
            setCategory('cardiac');
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
        onRemove: () => {
            setImageFileList([]);
            setImagePreview(null);
        },
        beforeUpload: (file) => {
            if (!file.type.startsWith('image/')) {
                message.error('Только изображения!');
                return Upload.LIST_IGNORE;
            }
            setImageFileList([file]);
            const reader = new FileReader();
            reader.onload = (e) => setImagePreview(e.target.result);
            reader.readAsDataURL(file);
            return false;
        },
        fileList: imageFileList,
        showUploadList: false,
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
                            name="description"
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
                            <Select placeholder="Выбрать" onChange={handleCategoryChange}>
                                <Option value="cardiac">Кардиология</Option>
                                <Option value="pulmonary">Пульмонология</Option>
                            </Select>
                        </Form.Item>
                    </Col>
                </Row>

                {category === 'cardiac' && (
                    <Form.Item
                        name="auscultation_point"
                        label="Точка аускультации"
                        style={{ marginBottom: 8 }}
                    >
                        <Select
                            placeholder="Выберите точку выслушивания"
                            allowClear
                            optionLabelProp="label"
                        >
                            {AUSCULTATION_POINTS.map(point => (
                                <Option key={point.value} value={point.value} label={point.label}>
                                    <div>
                                        <div style={{ fontWeight: 500 }}>{point.label}</div>
                                        <div style={{ fontSize: 11, color: '#888' }}>{point.description}</div>
                                    </div>
                                </Option>
                            ))}
                        </Select>
                    </Form.Item>
                )}

                <Row gutter={12}>
                    <Col span={12}>
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
                    </Col>
                    <Col span={12}>
                        <Form.Item
                            label="Изображение точки выслушивания"
                            style={{ marginBottom: 12 }}
                        >
                            <Upload {...imageUploadProps} maxCount={1}>
                                <Button icon={<PictureOutlined />} block>
                                    {imageFileList.length ? imageFileList[0].name : 'Загрузить изображение'}
                                </Button>
                            </Upload>
                        </Form.Item>
                    </Col>
                </Row>

                {imagePreview && (
                    <div style={{ marginBottom: 12, textAlign: 'center' }}>
                        <Image
                            src={imagePreview}
                            alt="Preview"
                            style={{ maxHeight: 120, borderRadius: 4 }}
                        />
                    </div>
                )}

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
