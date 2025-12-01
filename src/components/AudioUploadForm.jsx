import { useState } from 'react';
import { Form, Input, Select, Button, Upload, Card, message, Image } from 'antd';
import { UploadOutlined, InboxOutlined, PictureOutlined } from '@ant-design/icons';
import { addSound } from '../services/api';

const { Option } = Select;
const { Dragger } = Upload;

function AudioUploadForm({ onUploadSuccess }) {
    const [form] = Form.useForm();
    const [uploading, setUploading] = useState(false);
    const [fileList, setFileList] = useState([]);
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);

    const handleUpload = async (values) => {
        if (fileList.length === 0) {
            message.error('Пожалуйста, выберите аудиофайл');
            return;
        }

        const file = fileList[0];
        setUploading(true);

        try {
            await addSound(values, file, imageFile);
            message.success('Аудиозапись успешно добавлена');
            form.resetFields();
            setFileList([]);
            setImageFile(null);
            setImagePreview(null);
            if (onUploadSuccess) onUploadSuccess();
        } catch (error) {
            console.error('Upload error:', error);
            message.error('Ошибка при загрузке: ' + error.message);
        } finally {
            setUploading(false);
        }
    };

    const uploadProps = {
        onRemove: (file) => {
            const index = fileList.indexOf(file);
            const newFileList = fileList.slice();
            newFileList.splice(index, 1);
            setFileList(newFileList);
        },
        beforeUpload: (file) => {
            const isAudio = file.type.startsWith('audio/');
            if (!isAudio) {
                message.error('Можно загружать только аудио файлы!');
                return Upload.LIST_IGNORE;
            }
            setFileList([file]);
            return false;
        },
        fileList,
    };

    const imageUploadProps = {
        beforeUpload: (file) => {
            const isImage = file.type.startsWith('image/');
            if (!isImage) {
                message.error('Можно загружать только изображения!');
                return Upload.LIST_IGNORE;
            }
            setImageFile(file);
            const reader = new FileReader();
            reader.onload = (e) => setImagePreview(e.target.result);
            reader.readAsDataURL(file);
            return false;
        },
        onRemove: () => {
            setImageFile(null);
            setImagePreview(null);
        },
        fileList: imageFile ? [imageFile] : [],
    };

    return (
        <Card title="Добавить новую запись" style={{ marginBottom: 32 }}>
            <Form
                form={form}
                layout="vertical"
                onFinish={handleUpload}
            >
                <Form.Item
                    name="name"
                    label="Название"
                    rules={[{ required: true, message: 'Введите название' }]}
                >
                    <Input placeholder="Например: Стеноз аорты" />
                </Form.Item>

                <Form.Item
                    name="category"
                    label="Категория"
                    rules={[{ required: true, message: 'Выберите категорию' }]}
                >
                    <Select placeholder="Выберите категорию">
                        <Option value="cardiac">Кардиология</Option>
                        <Option value="pulmonary">Пульмонология</Option>
                    </Select>
                </Form.Item>

                <Form.Item
                    name="position"
                    label="Точка аускультации"
                    rules={[{ required: true, message: 'Укажите точку аускультации' }]}
                >
                    <Input placeholder="Например: 2-е межреберье справа" />
                </Form.Item>

                <Form.Item
                    name="description"
                    label="Описание"
                    rules={[{ required: true, message: 'Введите описание' }]}
                >
                    <Input.TextArea rows={4} placeholder="Опишите характеристики звука..." />
                </Form.Item>

                <Form.Item label="Изображение (необязательно)">
                    <Upload {...imageUploadProps} listType="picture-card" maxCount={1}>
                        {!imageFile && (
                            <div>
                                <PictureOutlined />
                                <div style={{ marginTop: 8 }}>Загрузить</div>
                            </div>
                        )}
                    </Upload>
                    {imagePreview && (
                        <Image
                            src={imagePreview}
                            alt="Preview"
                            style={{ marginTop: 8, maxWidth: 200 }}
                        />
                    )}
                </Form.Item>

                <Form.Item label="Аудиофайл" required>
                    <Dragger {...uploadProps} style={{ padding: 20 }}>
                        <p className="ant-upload-drag-icon">
                            <InboxOutlined />
                        </p>
                        <p className="ant-upload-text">Нажмите или перетащите файл сюда</p>
                        <p className="ant-upload-hint">
                            Поддерживаются MP3, WAV файлы
                        </p>
                    </Dragger>
                </Form.Item>

                <Form.Item>
                    <Button
                        type="primary"
                        htmlType="submit"
                        loading={uploading}
                        icon={<UploadOutlined />}
                        size="large"
                        block
                    >
                        {uploading ? 'Загрузка...' : 'Сохранить запись'}
                    </Button>
                </Form.Item>
            </Form>
        </Card>
    );
}

export default AudioUploadForm;
