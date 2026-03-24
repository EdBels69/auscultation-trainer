/**
 * ParticipantModal — Login by pre-assigned ID + shared password.
 * 1000 IDs (AT-0001 … AT-1000) are pre-generated in the database.
 * No registration flow — just enter ID & password.
 */
import { useState } from 'react';
import { Modal, Form, Input, Button, Alert, message, Typography } from 'antd';
import { KeyOutlined, LockOutlined } from '@ant-design/icons';
import { loginParticipant, storeParticipant } from '../services/participants';

const { Text } = Typography;

function ParticipantModal({ open, onClose, onParticipantReady }) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [form] = Form.useForm();

    const handleLogin = async (vals) => {
        setError(null);
        setLoading(true);

        const { participant, error: loginError } = await loginParticipant(vals.code, vals.password);
        setLoading(false);

        if (loginError) {
            setError(loginError);
            return;
        }

        storeParticipant(participant);
        message.success(`Добро пожаловать, ${participant.code}!`);
        form.resetFields();
        setError(null);
        onParticipantReady(participant);
        onClose();
    };

    return (
        <Modal
            title="Вход в тренажёр"
            open={open}
            footer={null}
            onCancel={onClose}
            width={420}
            destroyOnClose
            maskClosable={false}
        >
            <div style={{ marginBottom: 20 }}>
                <Alert
                    type="info"
                    showIcon
                    message="Введите ваш ID участника и пароль"
                    description="ID выдаётся исследователем перед началом работы с тренажёром."
                    style={{ borderRadius: 8 }}
                />
            </div>

            {error && (
                <Alert
                    type="error"
                    showIcon
                    message={error}
                    style={{ marginBottom: 16, borderRadius: 8 }}
                    closable
                    onClose={() => setError(null)}
                />
            )}

            <Form form={form} layout="vertical" onFinish={handleLogin}>
                <Form.Item
                    name="code"
                    label="ID участника"
                    rules={[{ required: true, message: 'Введите ID' }]}
                >
                    <Input
                        prefix={<KeyOutlined />}
                        placeholder="AT-0001"
                        size="large"
                        style={{ fontFamily: 'monospace', fontSize: 20, letterSpacing: 2, textAlign: 'center' }}
                        maxLength={10}
                        autoComplete="off"
                        onInput={(e) => { e.target.value = e.target.value.toUpperCase(); }}
                        autoFocus
                    />
                </Form.Item>

                <Form.Item
                    name="password"
                    label="Пароль"
                    rules={[{ required: true, message: 'Введите пароль' }]}
                >
                    <Input.Password
                        prefix={<LockOutlined />}
                        placeholder="Пароль"
                        size="large"
                    />
                </Form.Item>

                <Button type="primary" htmlType="submit" block size="large" loading={loading}>
                    Войти
                </Button>

                <Text type="secondary" style={{ display: 'block', textAlign: 'center', marginTop: 16, fontSize: 12 }}>
                    Участвуя, вы соглашаетесь на участие в НИР и обработку данных
                    согласно разрешению ЛЭК № 1 от 16.09.2025
                </Text>
            </Form>
        </Modal>
    );
}

export default ParticipantModal;
