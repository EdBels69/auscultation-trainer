import { useState, useEffect, useRef } from 'react';
import { Form, Input, Select, Button, Upload, message, Row, Col, Image, Tag } from 'antd';
import { UploadOutlined, SoundOutlined, PictureOutlined, PlayCircleOutlined, PauseCircleOutlined } from '@ant-design/icons';
import { addSound } from '../services/api';

const { Option } = Select;
const { TextArea } = Input;

const AUSCULTATION_POINTS = [
    { value: 'A', label: 'A — Аортальная область',       description: '2-е межреберье справа от грудины' },
    { value: 'P', label: 'P — Пульмональная область',    description: '2-е межреберье слева от грудины' },
    { value: 'E', label: 'E — Точка Эрба (Боткина)',     description: '3-е межреберье слева от грудины' },
    { value: 'T', label: 'T — Трикуспидальная область',  description: 'У нижнего края грудины слева' },
    { value: 'M', label: 'M — Митральная область (верхушка)', description: '5-е межреберье по среднеключичной линии' },
];

const DIFFICULTY_OPTIONS = [
    { value: 'easy',   label: 'Лёгкий',   color: 'green' },
    { value: 'medium', label: 'Средний',  color: 'orange' },
    { value: 'hard',   label: 'Сложный',  color: 'red' },
];

function AudioPreview({ file }) {
    const [playing, setPlaying] = useState(false);
    const audioRef = useRef(null);
    const [url, setUrl] = useState(null);

    useEffect(() => {
        if (!file) { setUrl(null); return; }
        const objUrl = URL.createObjectURL(file);
        setUrl(objUrl);
        return () => URL.revokeObjectURL(objUrl);
    }, [file]);

    if (!url) return null;

    const toggle = () => {
        if (!audioRef.current) return;
        if (playing) { audioRef.current.pause(); setPlaying(false); }
        else         { audioRef.current.play();  setPlaying(true);  }
    };

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6,
                      background: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: 6, padding: '6px 10px' }}>
            <audio ref={audioRef} src={url} onEnded={() => setPlaying(false)} />
            <Button
                size="small"
                type="text"
                icon={playing ? <PauseCircleOutlined style={{ color: '#52c41a', fontSize: 20 }} />
                              : <PlayCircleOutlined  style={{ color: '#52c41a', fontSize: 20 }} />}
                onClick={toggle}
            />
            <span style={{ fontSize: 12, color: '#389e0d' }}>
                {playing ? 'Воспроизводится...' : 'Прослушать перед загрузкой'}
            </span>
        </div>
    );
}

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
                name: initialNodeName || values.patient_info,
                description: values.patient_info,
                category: values.category,
                linked_node_key: initialNodeKey,
                auscultation_point: values.category === 'cardiac' ? (values.auscultation_point || null) : null,
                explanation: values.explanation || null,
                clinical_context: values.clinical_context || null,
                difficulty: values.difficulty || 'medium',
            };

            await addSound(submissionData, file, imageFile);
            message.success('Аудиозапись добавлена');
            form.resetFields();
            if (initialNodeName) form.setFieldsValue({ name: initialNodeName });
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
        onRemove: () => { setImageFileList([]); setImagePreview(null); },
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
        <Form form={form} layout="vertical" onFinish={handleUpload} size="small">

            {/* ── Строка 1: Пациент + Категория ─────────────────── */}
            <Row gutter={12}>
                <Col span={14}>
                    <Form.Item
                        name="patient_info"
                        label="Информация о пациенте"
                        rules={[{ required: true, message: 'Обязательно' }]}
                        style={{ marginBottom: 8 }}
                    >
                        <Input placeholder="М, 54 года, одышка при нагрузке..." />
                    </Form.Item>
                </Col>
                <Col span={10}>
                    <Form.Item
                        name="category"
                        label="Категория"
                        initialValue="cardiac"
                        rules={[{ required: true }]}
                        style={{ marginBottom: 8 }}
                    >
                        <Select onChange={handleCategoryChange}>
                            <Option value="cardiac">Кардиология</Option>
                            <Option value="pulmonary">Пульмонология</Option>
                        </Select>
                    </Form.Item>
                </Col>
            </Row>

            {/* ── Строка 2: Точка аускультации + Сложность ───────── */}
            <Row gutter={12}>
                <Col span={14}>
                    {category === 'cardiac' && (
                        <Form.Item
                            name="auscultation_point"
                            label="Точка аускультации"
                            style={{ marginBottom: 8 }}
                        >
                            <Select placeholder="Точка выслушивания" allowClear optionLabelProp="label">
                                {AUSCULTATION_POINTS.map(p => (
                                    <Option key={p.value} value={p.value} label={p.label}>
                                        <div>
                                            <div style={{ fontWeight: 500 }}>{p.label}</div>
                                            <div style={{ fontSize: 11, color: '#888' }}>{p.description}</div>
                                        </div>
                                    </Option>
                                ))}
                            </Select>
                        </Form.Item>
                    )}
                </Col>
                <Col span={10}>
                    <Form.Item
                        name="difficulty"
                        label="Сложность"
                        initialValue="medium"
                        style={{ marginBottom: 8 }}
                    >
                        <Select>
                            {DIFFICULTY_OPTIONS.map(d => (
                                <Option key={d.value} value={d.value}>
                                    <Tag color={d.color} style={{ margin: 0 }}>{d.label}</Tag>
                                </Option>
                            ))}
                        </Select>
                    </Form.Item>
                </Col>
            </Row>

            {/* ── Объяснение для теста ─────────────────────────────── */}
            <Form.Item
                name="explanation"
                label="Объяснение для теста (почему этот ответ правильный)"
                style={{ marginBottom: 8 }}
            >
                <TextArea
                    rows={2}
                    placeholder="Систолический шум изгнания во 2 т/м объясняется стенозом аортального клапана..."
                />
            </Form.Item>

            {/* ── Клинический контекст для ИИ ─────────────────────── */}
            <Form.Item
                name="clinical_context"
                label="Клинический контекст для ИИ-ассистента"
                style={{ marginBottom: 8 }}
            >
                <TextArea
                    rows={2}
                    placeholder="Аортальный стеноз. Систолический шум изгнания, crescendo-decrescendo, иррадиация в шею. Дифдиагноз: ГКМП, склероз АК..."
                />
            </Form.Item>

            {/* ── Аудио + Изображение ──────────────────────────────── */}
            <Row gutter={12}>
                <Col span={12}>
                    <Form.Item label="Аудиофайл" required style={{ marginBottom: 8 }}>
                        <Upload {...audioUploadProps} maxCount={1}>
                            <Button icon={<SoundOutlined />} block>
                                {fileList.length ? fileList[0].name : 'Выбрать MP3/WAV'}
                            </Button>
                        </Upload>
                        {fileList.length > 0 && <AudioPreview file={fileList[0]} />}
                    </Form.Item>
                </Col>
                <Col span={12}>
                    <Form.Item label="Изображение точки выслушивания" style={{ marginBottom: 8 }}>
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
                    <Image src={imagePreview} alt="Preview" style={{ maxHeight: 100, borderRadius: 4 }} />
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
    );
}

export default AudioUploadForm;
