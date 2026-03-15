import { useState } from 'react';
import { Form, Input, Button, Card, Alert, message } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { signIn } from '../services/supabase';

function AdminLogin({ onLoginSuccess }) {
    const [loading, setLoading] = useState(false);

    const handleLogin = async (values) => {
        setLoading(true);
        const { error } = await signIn(values.email, values.password);
        if (error) {
            message.error(error.message);
        } else {
            if (onLoginSuccess) onLoginSuccess();
        }
        setLoading(false);
    };

    return (
        <div style={{ maxWidth: 400, margin: '100px auto', padding: 24 }}>
            <Card title="Вход в админ-панель">
                <Alert
                    message="Требуется авторизация"
                    description="Для управления записями необходимо войти в систему."
                    type="info"
                    showIcon
                    style={{ marginBottom: 24 }}
                />
                <Form
                    name="login"
                    onFinish={handleLogin}
                    layout="vertical"
                >
                    <Form.Item
                        name="email"
                        rules={[{ required: true, message: 'Введите Email' }]}
                    >
                        <Input prefix={<UserOutlined />} placeholder="Email" />
                    </Form.Item>
                    <Form.Item
                        name="password"
                        rules={[{ required: true, message: 'Введите пароль' }]}
                    >
                        <Input.Password prefix={<LockOutlined />} placeholder="Пароль" />
                    </Form.Item>
                    <Form.Item>
                        <Button type="primary" htmlType="submit" block loading={loading}>
                            Войти
                        </Button>
                    </Form.Item>
                </Form>
            </Card>
        </div>
    );
}

export default AdminLogin;
