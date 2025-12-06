import AudioPlayer from 'react-h5-audio-player';
import 'react-h5-audio-player/lib/styles.css';
import { HeartOutlined, SoundOutlined } from '@ant-design/icons';

function PlayerPanel({ selectedAudio }) {
    if (!selectedAudio) return null;

    const iconBg = selectedAudio.category === 'cardiac'
        ? 'linear-gradient(135deg, #ff6b6b 0%, #ee5a5a 100%)'
        : 'linear-gradient(135deg, #635bff 0%, #00d4ff 100%)';

    return (
        <div style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 1000,
            background: '#fff',
            borderTop: '1px solid #e3e8ee',
            boxShadow: '0 -2px 12px rgba(0, 0, 0, 0.06)'
        }}>
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                padding: '0 24px',
                maxWidth: 1200,
                margin: '0 auto'
            }}>
                {/* Track Info */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    minWidth: 200,
                    maxWidth: 280,
                    padding: '12px 0'
                }}>
                    <div style={{
                        width: 36,
                        height: 36,
                        borderRadius: 6,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: iconBg,
                        flexShrink: 0
                    }}>
                        {selectedAudio.category === 'cardiac'
                            ? <HeartOutlined style={{ color: '#fff', fontSize: 14 }} />
                            : <SoundOutlined style={{ color: '#fff', fontSize: 14 }} />
                        }
                    </div>
                    <div style={{ minWidth: 0 }}>
                        <div style={{
                            fontSize: 13,
                            fontWeight: 500,
                            color: '#0a2540',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                        }}>
                            {selectedAudio.name}
                        </div>
                        <div style={{ fontSize: 11, color: '#697386' }}>
                            {selectedAudio.position}
                        </div>
                    </div>
                </div>

                {/* Audio Player */}
                <div style={{ flex: 1, minWidth: 0 }}>
                    <AudioPlayer
                        src={selectedAudio.audioUrl}
                        showJumpControls={false}
                        showDownloadProgress={false}
                        showFilledProgress={true}
                        customAdditionalControls={[]}
                        customVolumeControls={['VOLUME']}
                        layout="horizontal"
                        style={{
                            boxShadow: 'none',
                            background: 'transparent',
                            padding: 0
                        }}
                    />
                </div>
            </div>
        </div>
    );
}

export default PlayerPanel;
