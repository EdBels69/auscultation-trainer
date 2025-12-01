import { useRef, useEffect, useState } from 'react';

function WaveformVisualizer({ audioUrl, playing, currentTime = 0 }) {
    const canvasRef = useRef(null);
    const [audioBuffer, setAudioBuffer] = useState(null);
    const animationRef = useRef(null);

    useEffect(() => {
        if (!audioUrl) return;

        const audioContext = new (window.AudioContext || window.webkitAudioContext)();

        fetch(audioUrl)
            .then(response => response.arrayBuffer())
            .then(arrayBuffer => audioContext.decodeAudioData(arrayBuffer))
            .then(buffer => {
                setAudioBuffer(buffer);
                drawWaveform(buffer, 0);
            })
            .catch(err => console.error('Error loading audio:', err));

        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, [audioUrl]);

    useEffect(() => {
        if (!audioBuffer) return;

        if (playing) {
            animate();
        } else {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
            drawWaveform(audioBuffer, currentTime);
        }

        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, [playing, audioBuffer]);

    const animate = () => {
        if (!audioBuffer) return;

        const draw = () => {
            drawWaveform(audioBuffer, currentTime);
            animationRef.current = requestAnimationFrame(draw);
        };
        draw();
    };

    const drawWaveform = (buffer, playPosition = 0) => {
        const canvas = canvasRef.current;
        if (!canvas || !buffer) return;

        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        const data = buffer.getChannelData(0);
        const step = Math.ceil(data.length / width);
        const amp = height / 2;

        ctx.clearRect(0, 0, width, height);

        // Draw background
        ctx.fillStyle = '#f0f2f5';
        ctx.fillRect(0, 0, width, height);

        // Calculate progress position
        const duration = buffer.duration;
        const progressWidth = (playPosition / duration) * width;

        // Draw waveform bars
        const barWidth = 2;
        const barGap = 1;
        const totalBarWidth = barWidth + barGap;

        for (let i = 0; i < width; i += totalBarWidth) {
            let min = 1.0;
            let max = -1.0;

            for (let j = 0; j < step; j++) {
                const datum = data[(i / totalBarWidth) * step + j];
                if (datum < min) min = datum;
                if (datum > max) max = datum;
            }

            const barHeight = Math.max(4, (max - min) * amp * 0.8);
            const x = i;
            const y = (height - barHeight) / 2;

            // Color based on playback position
            if (i < progressWidth) {
                ctx.fillStyle = '#1890ff'; // Played portion - blue
            } else {
                ctx.fillStyle = '#d9d9d9'; // Unplayed portion - gray
            }

            ctx.fillRect(x, y, barWidth, barHeight);
        }

        // Draw playhead
        if (playing && progressWidth > 0) {
            ctx.strokeStyle = '#ff4d4f';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(progressWidth, 0);
            ctx.lineTo(progressWidth, height);
            ctx.stroke();
        }
    };

    return (
        <canvas
            ref={canvasRef}
            width={600}
            height={80}
            style={{
                width: '100%',
                maxWidth: 600,
                height: 80,
                borderRadius: 8,
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            }}
        />
    );
}

export default WaveformVisualizer;
