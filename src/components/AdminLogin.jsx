import { useState } from 'react';
import { Form, Input, Button, Card, Alert, message, Modal, Typography } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined } from '@ant-design/icons';
import { signIn, sendPasswordReset } from '../services/supabase';

const { Text } = Typography;

function AdminLogin({ onLoginSuccess }) {
    const [loading, setLoading] = useState(false);
    const [forgotOpen, setForgotOpen] = useState(false);
    const [resetLoading, setResetLoading] = useState(false);
    const [resetDone, setResetDone] = useState(false);
    const [forgotForm] = Form.useForm();

    const handleLogin = async (values) => {
        setLoading(true);
        const { error } = await signIn(values.email, values.password);
        if (error) {
            message.error('Неверный email или пароль');
        } else {
            if (onLoginSuccess) onLoginSuccess();
        }
        setLoading(false);
    };

    const handleForgot = async (values) => {
        setResetLoading(true);
        const { error } = await sendPasswordReset(values.email);
        setResetLoading(false);
        if (error) {
            message.error('Ошибка: ' + error.message);
        } else {
            setResetDone(true);
        }
    };

    const closeForgot = () => {
        setForgotOpen(false);
        setResetDone(false);
        forgotForm.resetFields();
    };

    return (
        <>
            <div style={{ maxWidth: 400, margin: '80px auto', padding: 24 }}>
                <Card title="Вход в систему">
                    <Alert
                        message="Требуется авторизация"
                        description="Для управления записями необходимо войти в систему."
                        type="info"
                        showIcon
                        style={{ marginBottom: 24 }}
                    />
                    <Form name="login" onFinish={handleLogin} layout="vertical">
                        <Form.Item
                            name="email"
                            rules={[{ required: true, message: 'Введите Email' }, { type: 'email', message: 'Неверный формат email' }]}
                        >
                            <Input prefix={<UserOutlined />} placeholder="Email" size="large" />
                        </Form.Item>
                        <Form.Item
                            name="password"
                            rules={[{ required: true, message: 'Введите пароль' }]}
                        >
                            <Input.Password prefix={<LockOutlined />} placeholder="Пароль" size="large" />
                        </Form.Item>
                        <Form.Item style={{ marginBottom: 8 }}>
                            <Button type="primary" htmlType="submit" block size="large" loading={loading}>
                                Войти
                            </Button>
                        </Form.Item>
                    </Form>
                    <div style={{ textAlign: 'center', marginTop: 8 }}>
                        <Button type="link" size="small" onClick={() => setForgotOpen(true)}>
                            Забыли пароль?
                        </Button>
                    </div>
                </Card>
            </div>

            {/* Forgot password modal */}
            <Modal
                title="Восстановление пароля"
                open={forgotOpen}
                footer={null}
                onCancel={closeForgot}
                width={380}
            >
                {resetDone ? (
                    <Alert
                        type="success"
                        showIcon
                        message="Письмо отправлено"
                        description="Проверьте почту и перейдите по ссылке для смены пароля. Ссылка действительна 1 час."
                        style={{ marginBottom: 16 }}
                    />
                ) : (
                    <Form form={forgotForm} layout="vertical" onFinish={handleForgot}>
                        <Alert
                            type="info"
                            showIcon
                            message="Введите email вашего аккаунта — мы пришлём ссылку для смены пароля."
                            style={{ marginBottom: 16 }}
                        />
                        <Form.Item
                            name="email"
                            rules={[
                                { required: true, message: 'Введите Email' },
                                { type: 'email', message: 'Неверный формат' },
                            ]}
                        >
                            <Input prefix={<MailOutlined />} placeholder="Email" size="large" />
                        </Form.Item>
                        <Button type="primary" htmlType="submit" block loading={resetLoading}>
                            Отправить ссылку
                        </Button>
                    </Form>
                )}
            </Modal>
        </>
    );
}

export default AdminLogin;
