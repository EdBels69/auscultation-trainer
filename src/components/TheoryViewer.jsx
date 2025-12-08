import React, { useEffect, useRef } from 'react';
import './editor/TheoryEditor.css';

/**
 * TheoryViewer - Renders HTML content with custom audio players
 */
function TheoryViewer({ content }) {
    const containerRef = useRef(null);

    useEffect(() => {
        if (!containerRef.current || !content) return;

        const audioBlocks = containerRef.current.querySelectorAll('[data-audio-block]');

        audioBlocks.forEach((block) => {
            if (block.dataset.processed) return;

            const soundName = block.dataset.soundName || 'Аудио';
            const audioUrl = block.dataset.audioUrl;
            const imageUrl = block.dataset.imageUrl;
            const float = block.dataset.float || 'none';

            if (!audioUrl) return;

            // Apply float styles
            if (float === 'left') {
                block.style.float = 'left';
                block.style.marginRight = '16px';
                block.style.marginBottom = '8px';
            } else if (float === 'right') {
                block.style.float = 'right';
                block.style.marginLeft = '16px';
                block.style.marginBottom = '8px';
            } else {
                block.style.display = 'inline-block';
                block.style.margin = '8px 0';
            }

            const blockId = `audio-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

            block.innerHTML = `
                <div id="${blockId}" style="
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    border-radius: 10px;
                    padding: 8px 12px;
                    color: white;
                    display: inline-flex;
                    align-items: center;
                    gap: 10px;
                    box-shadow: 0 3px 10px rgba(102, 126, 234, 0.3);
                ">
                    ${imageUrl && imageUrl !== 'null' ? `
                        <img src="${imageUrl}" alt="" style="width: 36px; height: 36px; border-radius: 6px; object-fit: cover;" />
                    ` : `
                        <div style="width: 36px; height: 36px; border-radius: 6px; background: rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center; font-size: 18px;">
                            🔊
                        </div>
                    `}
                    <span style="font-weight: 600; font-size: 13px; max-width: 100px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                        ${soundName}
                    </span>
                    <div style="display: flex; gap: 4px;">
                        <button class="play-btn" style="
                            width: 28px; height: 28px; border-radius: 50%; border: none;
                            background: #52c41a; color: #fff; cursor: pointer;
                            display: flex; align-items: center; justify-content: center; font-size: 12px;
                        " title="Воспроизвести">▶</button>
                        <button class="stop-btn" style="
                            width: 28px; height: 28px; border-radius: 50%; border: none;
                            background: rgba(255,255,255,0.2); color: #fff; cursor: pointer;
                            display: flex; align-items: center; justify-content: center; font-size: 12px;
                        " title="Стоп">⏹</button>
                    </div>
                    <div style="display: flex; align-items: center; gap: 4px;">
                        <span style="font-size: 14px;">🔈</span>
                        <input type="range" class="volume-slider" min="0" max="1" step="0.1" value="0.8" 
                            style="width: 50px; height: 4px; cursor: pointer;" />
                    </div>
                    <audio src="${audioUrl}" preload="metadata"></audio>
                </div>
            `;

            // Add event listeners
            const container = block.querySelector(`#${blockId}`);
            const audio = container.querySelector('audio');
            const playBtn = container.querySelector('.play-btn');
            const stopBtn = container.querySelector('.stop-btn');
            const volumeSlider = container.querySelector('.volume-slider');

            let isPlaying = false;
            audio.volume = 0.8;

            playBtn.addEventListener('click', () => {
                if (isPlaying) {
                    audio.pause();
                    playBtn.innerHTML = '▶';
                    playBtn.style.background = '#52c41a';
                    isPlaying = false;
                } else {
                    audio.play();
                    playBtn.innerHTML = '⏸';
                    playBtn.style.background = '#faad14';
                    isPlaying = true;
                }
            });

            stopBtn.addEventListener('click', () => {
                audio.pause();
                audio.currentTime = 0;
                playBtn.innerHTML = '▶';
                playBtn.style.background = '#52c41a';
                isPlaying = false;
            });

            volumeSlider.addEventListener('input', (e) => {
                audio.volume = parseFloat(e.target.value);
            });

            audio.addEventListener('ended', () => {
                playBtn.innerHTML = '▶';
                playBtn.style.background = '#52c41a';
                isPlaying = false;
            });

            block.dataset.processed = 'true';
        });
    }, [content]);

    if (!content) {
        return (
            <div className="theory-viewer theory-empty">
                <p>Содержимое не найдено</p>
            </div>
        );
    }

    return (
        <div
            ref={containerRef}
            className="theory-viewer"
            dangerouslySetInnerHTML={{ __html: content }}
            style={{ overflow: 'hidden' }}
        />
    );
}

export default TheoryViewer;
