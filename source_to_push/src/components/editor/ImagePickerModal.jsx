import React, { useState, useEffect } from 'react';
import { Modal, Input, List, Empty, Spin, Tabs, Upload, Button, message } from 'antd';
import { PictureOutlined, UploadOutlined, DatabaseOutlined } from '@ant-design/icons';
import { getSounds } from '../../services/api';
import { supabase } from '../../services/supabase';

const { Search } = Input;

function ImagePickerModal({ visible, onClose, onSelect }) {
    const [sounds, setSounds] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [uploading, setUploading] = useState(false);
    const [activeTab, setActiveTab] = useState('database');

    useEffect(() => {
        if (visible) {
            loadSounds();
        }
    }, [visible]);

    const loadSounds = async () => {
        setLoading(true);
        try {
            const data = await getSounds();
            // Filter sounds that have images
            setSounds(data.filter(s => s.imageUrl));
        } catch (error) {
            console.error('Failed to load sounds:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredSounds = sounds.filter(sound =>
        sound.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleSelect = (imageUrl) => {
        onSelect(imageUrl);
        onClose();
    };

    const handleUpload = async (file) => {
        setUploading(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `theory_img_${Date.now()}.${fileExt}`;
            const filePath = `theory/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('sounds')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('sounds')
                .getPublicUrl(filePath);

            onSelect(publicUrl);
            onClose();
            message.success('Изображение загружено');
        } catch (error) {
            console.error('Upload error:', error);
            message.error('Ошибка загрузки');
        } finally {
            setUploading(false);
        }
    };

    const tabItems = [
        {
            key: 'database',
            label: (
                <span>
                    <DatabaseOutlined />
                    Из базы данных
                </span>
            ),
            children: (
                <>
                    <div className="sound-picker-search">
                        <Search
                            placeholder="Поиск по названию..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            allowClear
                        />
                    </div>

                    <div className="image-picker-grid">
                        {loading ? (
                            <div style={{ textAlign: 'center', padding: 40 }}>
                                <Spin size="large" />
                            </div>
                        ) : filteredSounds.length === 0 ? (
                            <Empty description="Изображения не найдены" />
                        ) : (
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(3, 1fr)',
                                gap: 12,
                                maxHeight: 400,
                                overflowY: 'auto'
                            }}>
                                {filteredSounds.map((sound) => (
                                    <div
                                        key={sound.id}
                                        className="image-picker-item"
                                        onClick={() => handleSelect(sound.imageUrl)}
                                        style={{
                                            cursor: 'pointer',
                                            borderRadius: 8,
                                            overflow: 'hidden',
                                            border: '2px solid #e8e8e8',
                                            transition: 'all 0.2s'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.borderColor = '#667eea'}
                                        onMouseLeave={(e) => e.currentTarget.style.borderColor = '#e8e8e8'}
                                    >
                                        <img
                                            src={sound.imageUrl}
                                            alt={sound.name}
                                            style={{
                                                width: '100%',
                                                height: 120,
                                                objectFit: 'cover'
                                            }}
                                        />
                                        <div style={{
                                            padding: 8,
                                            fontSize: 12,
                                            textAlign: 'center',
                                            background: '#fafafa',
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis'
                                        }}>
                                            {sound.name}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </>
            )
        },
        {
            key: 'upload',
            label: (
                <span>
                    <UploadOutlined />
                    Загрузить новое
                </span>
            ),
            children: (
                <div style={{ padding: 40, textAlign: 'center' }}>
                    <Upload
                        accept="image/*"
                        showUploadList={false}
                        beforeUpload={(file) => {
                            handleUpload(file);
                            return false;
                        }}
                    >
                        <Button
                            type="primary"
                            icon={<UploadOutlined />}
                            size="large"
                            loading={uploading}
                            style={{ background: '#667eea', borderColor: '#667eea' }}
                        >
                            Выбрать файл
                        </Button>
                    </Upload>
                    <p style={{ marginTop: 16, color: '#888' }}>
                        Поддерживаются: JPG, PNG, GIF, WebP
                    </p>
                </div>
            )
        }
    ];

    return (
        <Modal
            title={
                <span>
                    <PictureOutlined style={{ marginRight: 8 }} />
                    Вставить изображение
                </span>
            }
            open={visible}
            onCancel={onClose}
            footer={null}
            width={700}
            destroyOnClose
        >
            <Tabs
                activeKey={activeTab}
                onChange={setActiveTab}
                items={tabItems}
            />
        </Modal>
    );
}

export default ImagePickerModal;
