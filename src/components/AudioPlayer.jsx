import { useRef, useEffect, useState } from 'react';
import { Button, Slider } from 'antd';
import {
  PlayCircleOutlined,
  PauseCircleOutlined,
  SoundOutlined
} from '@ant-design/icons';
import WaveSurfer from 'wavesurfer.js';

function AudioPlayer({ audioUrl }) {
  const waveformRef = useRef(null);
  const wavesurfer = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(80);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!waveformRef.current || !audioUrl) return;

    wavesurfer.current = WaveSurfer.create({
      container: waveformRef.current,
      waveColor: '#e3e8ee',
      progressColor: '#635bff',
      cursorColor: 'transparent',
      barWidth: 2,
      barGap: 1,
      barRadius: 2,
      height: 28,
      normalize: true,
      fillParent: true,
      scrollParent: false,
      minPxPerSec: 1,
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

  if (!audioUrl) return null;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      {/* Play Button */}
      <Button
        type="primary"
        shape="circle"
        size="middle"
        icon={playing ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
        onClick={togglePlay}
        disabled={loading}
        style={{
          background: '#635bff',
          border: 'none',
          boxShadow: 'none',
          width: 36,
          height: 36,
          minWidth: 36
        }}
      />

      {/* Waveform */}
      <div
        ref={waveformRef}
        style={{
          flex: 1,
          opacity: loading ? 0.5 : 1,
          cursor: 'pointer',
          minWidth: 100
        }}
      />

      {/* Time */}
      <div style={{
        fontSize: 11,
        color: '#697386',
        fontVariantNumeric: 'tabular-nums',
        whiteSpace: 'nowrap'
      }}>
        {formatTime(currentTime)} / {formatTime(duration)}
      </div>

      {/* Volume */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, width: 80 }}>
        <SoundOutlined style={{ color: '#697386', fontSize: 12 }} />
        <Slider
          value={volume}
          onChange={handleVolumeChange}
          style={{ flex: 1, margin: 0 }}
          tooltip={{ formatter: null }}
          trackStyle={{ backgroundColor: '#635bff', height: 3 }}
          railStyle={{ height: 3 }}
          handleStyle={{
            borderColor: '#635bff',
            boxShadow: 'none',
            width: 10,
            height: 10,
            marginTop: -3.5
          }}
        />
      </div>
    </div>
  );
}

export default AudioPlayer;
