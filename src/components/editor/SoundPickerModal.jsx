import React, { useState, useEffect } from 'react';
import { Modal, Input, List, Avatar, Tag, Button, Empty, Spin } from 'antd';
import { SoundOutlined, PlayCircleOutlined, PauseCircleOutlined } from '@ant-design/icons';
import { getSounds } from '../../services/api';

const { Search } = Input;

function SoundPickerModal({ visible, onClose, onSelect }) {
    const [sounds, setSounds] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [playingId, setPlayingId] = useState(null);
    const audioRef = React.useRef(null);

    useEffect(() => {
        if (visible) {
            loadSounds();
        }
    }, [visible]);

    const loadSounds = async () => {
        setLoading(true);
        try {
            const data = await getSounds();
            setSounds(data);
        } catch (error) {
            console.error('Failed to load sounds:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredSounds = sounds.filter(sound =>
        sound.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (sound.description && sound.description.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const handleSelect = (sound) => {
        onSelect({
            soundId: sound.id,
            soundName: sound.name,
            audioUrl: sound.audioUrl,
            imageUrl: sound.imageUrl,
        });
        onClose();
    };

    const togglePreview = (sound, e) => {
        e.stopPropagation();

        if (playingId === sound.id) {
            audioRef.current?.pause();
            setPlayingId(null);
        } else {
            if (audioRef.current) {
                audioRef.current.pause();
            }
            audioRef.current = new Audio(sound.audioUrl);
            audioRef.current.play();
            audioRef.current.onended = () => setPlayingId(null);
            setPlayingId(sound.id);
        }
    };

    const getCategoryColor = (category) => {
        return category === 'cardiac' ? 'red' : 'blue';
    };

    const getCategoryLabel = (category) => {
        return category === 'cardiac' ? 'Сердце' : 'Лёгкие';
    };

    return (
        <Modal
            title={
                <span>
                    <SoundOutlined style={{ marginRight: 8 }} />
                    Выбрать аудио из базы
                </span>
            }
            open={visible}
            onCancel={onClose}
            footer={null}
            width={600}
            destroyOnClose
        >
            <div className="sound-picker-search">
                <Search
                    placeholder="Поиск по названию..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    allowClear
                />
            </div>

            <div className="sound-picker-list">
                {loading ? (
                    <div style={{ textAlign: 'center', padding: 40 }}>
                        <Spin size="large" />
                    </div>
                ) : filteredSounds.length === 0 ? (
                    <Empty description="Аудио не найдено" />
                ) : (
                    <List
                        dataSource={filteredSounds}
                        renderItem={(sound) => (
                            <div
                                className="sound-picker-item"
                                onClick={() => handleSelect(sound)}
                            >
                                {sound.imageUrl ? (
                                    <img
                                        src={sound.imageUrl}
                                        alt={sound.name}
                                        className="sound-picker-item-image"
                                    />
                                ) : (
                                    <Avatar
                                        size={48}
                                        icon={<SoundOutlined />}
                                        className="sound-picker-item-image"
                                        style={{ background: '#667eea' }}
                                    />
                                )}
                                <div className="sound-picker-item-info">
                                    <div className="sound-picker-item-name">
                                        {sound.name}
                                    </div>
                                    <div className="sound-picker-item-category">
                                        <Tag color={getCategoryColor(sound.category)}>
                                            {getCategoryLabel(sound.category)}
                                        </Tag>
                                        {sound.position && (
                                            <span>{sound.position}</span>
                                        )}
                                    </div>
                                </div>
                                <div className="sound-picker-item-preview">
                                    <Button
                                        type="text"
                                        icon={playingId === sound.id ?
                                            <PauseCircleOutlined style={{ fontSize: 24 }} /> :
                                            <PlayCircleOutlined style={{ fontSize: 24 }} />
                                        }
                                        onClick={(e) => togglePreview(sound, e)}
                                    />
                                </div>
                            </div>
                        )}
                    />
                )}
            </div>
        </Modal>
    );
}

export default SoundPickerModal;
