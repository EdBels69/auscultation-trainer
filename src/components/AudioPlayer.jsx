import { useRef, useEffect, useState } from 'react';
import { Button, Slider, Space } from 'antd';
import {
  PlayCircleOutlined,
  PauseCircleOutlined,
  SoundOutlined,
  StepBackwardOutlined
} from '@ant-design/icons';
import WaveSurfer from 'wavesurfer.js';

function AudioPlayer({ audioUrl, sticky = false, isMobile = false }) {
  const waveformRef = useRef(null);
  const wavesurfer = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(80);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!waveformRef.current || !audioUrl) return;

    // Create WaveSurfer instance
    wavesurfer.current = WaveSurfer.create({
      container: waveformRef.current,
      waveColor: '#d9d9d9',
      progressColor: '#1890ff',
      cursorColor: '#ff4d4f',
      barWidth: 3,
      barGap: 2,
      barRadius: 3,
      height: isMobile ? 60 : 80,
      normalize: true,
      responsive: false,
      backend: 'WebAudio',
      minPxPerSec: isMobile ? 100 : 200, // Less zoom on mobile
      scrollParent: true,
      autoCenter: true,
      fillParent: false,
    });

    wavesurfer.current.load(audioUrl);

    wavesurfer.current.on('ready', () => {
      setDuration(wavesurfer.current.getDuration());
      setLoading(false);
      wavesurfer.current.setVolume(volume / 100);
    });

    wavesurfer.current.on('audioprocess', () => {
      setCurrentTime(wavesurfer.current.getCurrentTime());
    });

    wavesurfer.current.on('seek', () => {
      setCurrentTime(wavesurfer.current.getCurrentTime());
    });

    wavesurfer.current.on('finish', () => {
      setPlaying(false);
    });

    return () => {
      if (wavesurfer.current) {
        wavesurfer.current.destroy();
      }
    };
  }, [audioUrl]);

  const togglePlay = () => {
    if (wavesurfer.current) {
      wavesurfer.current.playPause();
      setPlaying(!playing);
    }
  };

  const handleReset = () => {
    if (wavesurfer.current) {
      wavesurfer.current.stop();
      setPlaying(false);
      setCurrentTime(0);
    }
  };

  const handleVolumeChange = (value) => {
    setVolume(value);
    if (wavesurfer.current) {
      wavesurfer.current.setVolume(value / 100);
    }
  };

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!audioUrl) {
    return null;
  }

  const playerContent = (
    <div style={{
      background: '#fff',
      padding: '16px 24px',
      borderRadius: sticky ? 0 : 12,
      boxShadow: sticky ? '0 -2px 8px rgba(0,0,0,0.1)' : '0 2px 8px rgba(0,0,0,0.06)',
    }}>
      {/* Waveform */}
      <div
        style={{
          marginBottom: 16,
          opacity: loading ? 0.5 : 1,
          transition: 'opacity 0.3s',
          overflow: 'auto',
          maxWidth: '100%',
        }}
      >
        <div ref={waveformRef} />
      </div>

      {/* Controls */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        flexWrap: 'wrap'
      }}>
        <Space size="small">
          <Button
            type="primary"
            shape="circle"
            size="large"
            icon={playing ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
            onClick={togglePlay}
            disabled={loading}
          />
          <Button
            shape="circle"
            icon={<StepBackwardOutlined />}
            onClick={handleReset}
            disabled={loading}
          />
        </Space>

        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          minWidth: 200
        }}>
          <span style={{ fontSize: 12, color: '#8c8c8c', minWidth: 38 }}>
            {formatTime(currentTime)}
          </span>
          <div style={{
            flex: 1,
            height: 4,
            background: '#f0f0f0',
            borderRadius: 2,
            position: 'relative'
          }}>
            <div style={{
              position: 'absolute',
              left: 0,
              top: 0,
              height: '100%',
              width: `${duration ? (currentTime / duration) * 100 : 0}%`,
              background: '#1890ff',
              borderRadius: 2,
              transition: 'width 0.1s'
            }} />
          </div>
          <span style={{ fontSize: 12, color: '#8c8c8c', minWidth: 38 }}>
            {formatTime(duration)}
          </span>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          minWidth: 150
        }}>
          <SoundOutlined style={{ color: '#8c8c8c', fontSize: 16 }} />
          <Slider
            value={volume}
            onChange={handleVolumeChange}
            style={{ flex: 1, margin: 0 }}
            tooltip={{ formatter: (val) => `${val}%` }}
          />
        </div>
      </div>
    </div>
  );

  if (sticky) {
    return (
      <div style={{
        position: 'sticky',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        width: '100%'
      }}>
        {playerContent}
      </div>
    );
  }

  return playerContent;
}

export default AudioPlayer;
