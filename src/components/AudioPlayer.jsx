import { useRef, useEffect, useState } from 'react';
import { Button, Slider } from 'antd';
import { PlayCircleOutlined, PauseCircleOutlined, SoundOutlined } from '@ant-design/icons';
import WaveSurfer from 'wavesurfer.js';

// Уникальный ID для каждого плеера
let playerIdCounter = 0;

function AudioPlayer({ audioUrl }) {
  const containerRef = useRef(null);
  const waveformRef = useRef(null);
  const wavesurfer = useRef(null);
  const playerId = useRef(++playerIdCounter);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(80);

  useEffect(() => {
    if (!waveformRef.current || !audioUrl) return;

    // Зум на 2-3 секунды с прокруткой
    wavesurfer.current = WaveSurfer.create({
      container: waveformRef.current,
      waveColor: '#4F4A85',
      progressColor: '#383351',
      height: 60,
      minPxPerSec: 150,
      autoScroll: true,
      autoCenter: true,
    });

    wavesurfer.current.load(audioUrl);

    wavesurfer.current.on('ready', () => {
      wavesurfer.current.setVolume(volume / 100);
    });

    wavesurfer.current.on('click', () => {
      // Останавливаем другие плееры
      window.dispatchEvent(new CustomEvent('stopOtherPlayers', { detail: playerId.current }));
      wavesurfer.current.play();
      setPlaying(true);
    });

    wavesurfer.current.on('finish', () => setPlaying(false));

    // Слушаем событие остановки от других плееров
    const handleStopOther = (e) => {
      if (e.detail !== playerId.current && wavesurfer.current) {
        wavesurfer.current.pause();
        setPlaying(false);
      }
    };
    window.addEventListener('stopOtherPlayers', handleStopOther);

    return () => {
      window.removeEventListener('stopOtherPlayers', handleStopOther);
      wavesurfer.current?.destroy();
    };
  }, [audioUrl]);

  const togglePlay = () => {
    if (!playing) {
      // Останавливаем другие плееры перед воспроизведением
      window.dispatchEvent(new CustomEvent('stopOtherPlayers', { detail: playerId.current }));
    }
    wavesurfer.current?.playPause();
    setPlaying(p => !p);
  };

  const handleVolumeChange = (value) => {
    setVolume(value);
    wavesurfer.current?.setVolume(value / 100);
  };

  if (!audioUrl) return null;

  return (
    <div
      ref={containerRef}
      style={{
        background: '#fff',
        borderRadius: 8,
        border: '1px solid #e3e8ee',
        padding: 12,
        maxWidth: '100%'
      }}
    >
      {/* Контейнер волны на полную ширину */}
      <div style={{
        width: '100%',
        overflow: 'hidden',
        borderRadius: 4
      }}>
        <div ref={waveformRef} />
      </div>

      {/* Контролы */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
        <Button
          type="primary"
          icon={playing ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
          onClick={togglePlay}
          style={{ background: '#4F4A85', border: 'none' }}
        >
          {playing ? 'Пауза' : 'Играть'}
        </Button>

        {/* Громкость */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, width: 100 }}>
          <SoundOutlined style={{ color: '#888', fontSize: 14 }} />
          <Slider
            value={volume}
            onChange={handleVolumeChange}
            style={{ flex: 1, margin: 0 }}
            tooltip={{ formatter: (v) => `${v}%` }}
          />
        </div>
      </div>
    </div>
  );
}

export default AudioPlayer;
