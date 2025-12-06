import { useRef, useEffect, useState } from 'react';
import { Button } from 'antd';
import { PlayCircleOutlined, PauseCircleOutlined } from '@ant-design/icons';
import WaveSurfer from 'wavesurfer.js';

function AudioPlayer({ audioUrl }) {
  const containerRef = useRef(null);
  const waveformRef = useRef(null);
  const wavesurfer = useRef(null);
  const [playing, setPlaying] = useState(false);

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

    wavesurfer.current.on('click', () => {
      wavesurfer.current.play();
      setPlaying(true);
    });

    wavesurfer.current.on('finish', () => setPlaying(false));

    return () => wavesurfer.current?.destroy();
  }, [audioUrl]);

  const togglePlay = () => {
    wavesurfer.current?.playPause();
    setPlaying(p => !p);
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
      {/* Контейнер с ограниченной шириной и прокруткой */}
      <div style={{
        width: '100%',
        maxWidth: 400,
        overflow: 'hidden',
        borderRadius: 4
      }}>
        <div ref={waveformRef} />
      </div>

      <Button
        type="primary"
        icon={playing ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
        onClick={togglePlay}
        style={{ marginTop: 8, background: '#4F4A85', border: 'none' }}
      >
        {playing ? 'Пауза' : 'Играть'}
      </Button>
    </div>
  );
}

export default AudioPlayer;
