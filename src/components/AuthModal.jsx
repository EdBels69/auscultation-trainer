import { useState } from 'react';
import { Modal, Form, Input, Button, Tabs, message, Alert } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined } from '@ant-design/icons';
import { signIn, signUp } from '../services/supabase';

function AuthModal({ open, onClose, onSuccess }) {
    const [activeTab, setActiveTab] = useState('login');
    const [loading, setLoading] = useState(false);
    const [loginForm] = Form.useForm();
    const [registerForm] = Form.useForm();

    const handleLogin = async (values) => {
        setLoading(true);
        const { error } = await signIn(values.email, values.password);
        if (error) {
            message.error(error.message);
        } else {
            message.success('Вход выполнен');
            loginForm.resetFields();
            onSuccess?.();
            onClose();
        }
        setLoading(false);
    };

    const handleRegister = async (values) => {
        setLoading(true);
        const { data, error } = await signUp(values.email, values.password, values.displayName);
        if (error) {
            message.error(error.message);
        } else if (data?.user) {
            message.success('Регистрация успешна! Вы можете войти.');
            registerForm.resetFields();
            setActiveTab('login');
        }
        setLoading(false);
    };

    const items = [
        {
            key: 'login',
            label: 'Вход',
            children: (
                <Form form={loginForm} onFinish={handleLogin} layout="vertical">
                    <Form.Item
                        name="email"
                        rules={[
                            { required: true, message: 'Введите Email' },
                            { type: 'email', message: 'Некорректный Email' }
                        ]}
                    >
                        <Input prefix={<MailOutlined />} placeholder="Email" size="large" />
                    </Form.Item>
                    <Form.Item
                        name="password"
                        rules={[{ required: true, message: 'Введите пароль' }]}
                    >
                        <Input.Password prefix={<LockOutlined />} placeholder="Пароль" size="large" />
                    </Form.Item>
                    <Form.Item>
                        <Button type="primary" htmlType="submit" block size="large" loading={loading}>
                            Войти
                        </Button>
                    </Form.Item>
                </Form>
            )
        },
        {
            key: 'register',
            label: 'Регистрация',
            children: (
                <Form form={registerForm} onFinish={handleRegister} layout="vertical">
                    <Alert
                        message="Регистрация для студентов"
                        description="После регистрации вы получите доступ к обучению, тестированию и чату с ИИ-помощником."
                        type="info"
                        showIcon
                        style={{ marginBottom: 16 }}
                    />
                    <Form.Item
                        name="displayName"
                        rules={[{ required: true, message: 'Введите имя' }]}
                    >
                        <Input prefix={<UserOutlined />} placeholder="Ваше имя" size="large" />
                    </Form.Item>
                    <Form.Item
                        name="email"
                        rules={[
                            { required: true, message: 'Введите Email' },
                            { type: 'email', message: 'Некорректный Email' }
                        ]}
                    >
                        <Input prefix={<MailOutlined />} placeholder="Email" size="large" />
                    </Form.Item>
                    <Form.Item
                        name="password"
                        rules={[
                            { required: true, message: 'Введите пароль' },
                            { min: 6, message: 'Минимум 6 символов' }
                        ]}
                    >
                        <Input.Password prefix={<LockOutlined />} placeholder="Пароль" size="large" />
                    </Form.Item>
                    <Form.Item
                        name="confirmPassword"
                        dependencies={['password']}
                        rules={[
                            { required: true, message: 'Подтвердите пароль' },
                            ({ getFieldValue }) => ({
                                validator(_, value) {
                                    if (!value || getFieldValue('password') === value) {
                                        return Promise.resolve();
                                    }
                                    return Promise.reject(new Error('Пароли не совпадают'));
                                },
                            }),
                        ]}
                    >
                        <Input.Password prefix={<LockOutlined />} placeholder="Подтвердите пароль" size="large" />
                    </Form.Item>
                    <Form.Item>
                        <Button type="primary" htmlType="submit" block size="large" loading={loading}>
                            Зарегистрироваться
                        </Button>
                    </Form.Item>
                </Form>
            )
        }
    ];

    return (
        <Modal
            open={open}
            onCancel={onClose}
            footer={null}
            width={420}
            centered
            destroyOnClose
        >
            <div style={{ padding: '8px 0' }}>
                <Tabs
                    activeKey={activeTab}
                    onChange={setActiveTab}
                    items={items}
                    centered
                />
            </div>
        </Modal>
    );
}

export default AuthModal;
