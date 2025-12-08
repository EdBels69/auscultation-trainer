import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';
import React, { useState, useRef } from 'react';

// Custom Audio Player with Play/Pause/Stop buttons
const AudioBlockComponent = ({ node, deleteNode, updateAttributes }) => {
    const { soundName, audioUrl, imageUrl, float } = node.attrs;
    const [isPlaying, setIsPlaying] = useState(false);
    const [volume, setVolume] = useState(0.8);
    const audioRef = useRef(null);

    const handlePlay = () => {
        if (audioRef.current) {
            audioRef.current.play();
            setIsPlaying(true);
        }
    };

    const handlePause = () => {
        if (audioRef.current) {
            audioRef.current.pause();
            setIsPlaying(false);
        }
    };

    const handleStop = () => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
            setIsPlaying(false);
        }
    };

    const handleVolumeChange = (e) => {
        const newVolume = parseFloat(e.target.value);
        setVolume(newVolume);
        if (audioRef.current) {
            audioRef.current.volume = newVolume;
        }
    };

    const toggleFloat = () => {
        const newFloat = float === 'left' ? 'right' : float === 'right' ? 'none' : 'left';
        updateAttributes({ float: newFloat });
    };

    const getFloatStyle = () => {
        if (float === 'left') return { float: 'left', marginRight: 16, marginBottom: 8 };
        if (float === 'right') return { float: 'right', marginLeft: 16, marginBottom: 8 };
        return { display: 'inline-block', margin: '8px 0' };
    };

    const getFloatLabel = () => {
        if (float === 'left') return '◀';
        if (float === 'right') return '▶';
        return '▬';
    };

    const buttonStyle = {
        width: 28,
        height: 28,
        borderRadius: '50%',
        border: 'none',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 12,
        transition: 'all 0.2s',
    };

    return (
        <NodeViewWrapper style={getFloatStyle()}>
            <audio ref={audioRef} src={audioUrl} preload="metadata" />

            <div contentEditable={false} style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                borderRadius: 10,
                padding: '8px 12px',
                color: 'white',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 10,
                boxShadow: '0 3px 10px rgba(102, 126, 234, 0.3)',
                position: 'relative',
            }}>
                {/* Control buttons (top right) */}
                <div style={{ position: 'absolute', top: -6, right: -6, display: 'flex', gap: 3 }}>
                    <button
                        onClick={toggleFloat}
                        style={{ ...buttonStyle, width: 18, height: 18, background: '#fff', color: '#667eea' }}
                        title="Обтекание"
                    >
                        {getFloatLabel()}
                    </button>
                    <button
                        onClick={deleteNode}
                        style={{ ...buttonStyle, width: 18, height: 18, background: '#ff4d4f', color: '#fff' }}
                        title="Удалить"
                    >
                        ×
                    </button>
                </div>

                {/* Image/Icon */}
                {imageUrl ? (
                    <img src={imageUrl} alt="" style={{ width: 36, height: 36, borderRadius: 6, objectFit: 'cover' }} />
                ) : (
                    <div style={{
                        width: 36, height: 36, borderRadius: 6,
                        background: 'rgba(255,255,255,0.2)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 18
                    }}>
                        🔊
                    </div>
                )}

                {/* Name */}
                <span style={{
                    fontWeight: 600,
                    fontSize: 13,
                    maxWidth: 100,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                }}>
                    {soundName || 'Аудио'}
                </span>

                {/* Play/Pause/Stop buttons */}
                <div style={{ display: 'flex', gap: 4 }}>
                    {!isPlaying ? (
                        <button
                            onClick={handlePlay}
                            style={{ ...buttonStyle, background: '#52c41a', color: '#fff' }}
                            title="Воспроизвести"
                        >
                            ▶
                        </button>
                    ) : (
                        <button
                            onClick={handlePause}
                            style={{ ...buttonStyle, background: '#faad14', color: '#fff' }}
                            title="Пауза"
                        >
                            ⏸
                        </button>
                    )}
                    <button
                        onClick={handleStop}
                        style={{ ...buttonStyle, background: 'rgba(255,255,255,0.2)', color: '#fff' }}
                        title="Стоп"
                    >
                        ⏹
                    </button>
                </div>

                {/* Volume */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ fontSize: 14 }}>🔈</span>
                    <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={volume}
                        onChange={handleVolumeChange}
                        style={{ width: 50, height: 4, cursor: 'pointer' }}
                    />
                </div>
            </div>
        </NodeViewWrapper>
    );
};

// TipTap Extension
export const AudioBlockExtension = Node.create({
    name: 'audioBlock',
    group: 'block',
    atom: true,
    draggable: true,

    addAttributes() {
        return {
            soundId: { default: null },
            soundName: { default: 'Аудио' },
            audioUrl: { default: null },
            imageUrl: { default: null },
            float: { default: 'none' },
        };
    },

    parseHTML() {
        return [{ tag: 'div[data-audio-block]' }];
    },

    renderHTML({ HTMLAttributes }) {
        return ['div', mergeAttributes(HTMLAttributes, {
            'data-audio-block': '',
            'data-sound-id': HTMLAttributes.soundId,
            'data-sound-name': HTMLAttributes.soundName,
            'data-audio-url': HTMLAttributes.audioUrl,
            'data-image-url': HTMLAttributes.imageUrl,
            'data-float': HTMLAttributes.float,
        })];
    },

    addNodeView() {
        return ReactNodeViewRenderer(AudioBlockComponent);
    },
});

export default AudioBlockExtension;
