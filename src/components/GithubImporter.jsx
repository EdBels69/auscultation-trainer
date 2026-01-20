import { useState, useEffect } from 'react';
import { Modal, Button, Progress, Alert, Typography } from 'antd';
import { CloudDownloadOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { getAllRecords } from '../utils/indexedDB';
import { importAudioFiles } from '../utils/githubImport';

const { Title, Text } = Typography;

function GitHubImporter({ onImportComplete }) {
    const [showModal, setShowModal] = useState(false);
    const [importing, setImporting] = useState(false);
    const [progress, setProgress] = useState(0);
    const [status, setStatus] = useState('');
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        checkIfImportNeeded();
    }, []);

    const checkIfImportNeeded = async () => {
        try {
            const records = await getAllRecords();
            if (records.length === 0) {
                setShowModal(true);
            }
        } catch (error) {
            console.error('Error checking records:', error);
        }
    };

    const handleImport = async () => {
        setImporting(true);
        setError(null);

        try {
            await importAudioFiles((current, total, fileName) => {
                setProgress(Math.round((current / total) * 100));
                setStatus(`Загрузка ${current} из ${total}: ${fileName}`);
            });

            setSuccess(true);
            setStatus('Импорт завершен успешно!');

            setTimeout(() => {
                setShowModal(false);
                if (onImportComplete) {
                    onImportComplete();
                }
            }, 1500);
        } catch (err) {
            console.error('Import error:', err);
            setError('Ошибка импорта. Возможно, проблема с CORS. Попробуйте загрузить файлы вручную через раздел "Управление".');
            setImporting(false);
        }
    };

    return (
        <Modal
            open={showModal}
            title={<span><CloudDownloadOutlined /> Импорт аудиозаписей</span>}
            footer={null}
            closable={!importing}
            onCancel={() => !importing && setShowModal(false)}
            width={500}
        >
            <div style={{ padding: '16px 0' }}>
                {!importing && !success && !error && (
                    <>
                        <Alert
                            message="База данных пуста"
                            description="Хотите импортировать примеры аудиозаписей из GitHub? Будет загружено 10 файлов (5 кардио + 5 пульмо)."
                            type="info"
                            showIcon
                            style={{ marginBottom: 16 }}
                        />
                        <div style={{ display: 'flex', gap: 8 }}>
                            <Button
                                type="primary"
                                onClick={handleImport}
                                icon={<CloudDownloadOutlined />}
                                block
                            >
                                Импортировать
                            </Button>
                            <Button onClick={() => setShowModal(false)}>
                                Отмена
                            </Button>
                        </div>
                    </>
                )}

                {importing && (
                    <div>
                        <Progress percent={progress} status="active" />
                        <Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
                            {status}
                        </Text>
                    </div>
                )}

                {success && (
                    <Alert
                        message="Импорт завершен"
                        description="Аудиозаписи успешно загружены из GitHub"
                        type="success"
                        showIcon
                        icon={<CheckCircleOutlined />}
                    />
                )}

                {error && (
                    <>
                        <Alert
                            message="Ошибка импорта"
                            description={error}
                            type="error"
                            showIcon
                            icon={<CloseCircleOutlined />}
                            style={{ marginBottom: 16 }}
                        />
                        <Button onClick={() => setShowModal(false)} block>
                            Закрыть
                        </Button>
                    </>
                )}
            </div>
        </Modal>
    );
}

export default GitHubImporter;
