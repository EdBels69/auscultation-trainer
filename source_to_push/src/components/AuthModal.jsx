import { useState } from 'react';
import { Modal, Form, Input, Button, Tabs, Select, message, Alert } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined, BankOutlined } from '@ant-design/icons';
import { signIn, signUp, resetPassword } from '../services/supabase';

const ROLE_OPTIONS = [
    { value: 'student',  label: 'Студент' },
    { value: 'resident', label: 'Ординатор' },
    { value: 'doctor',   label: 'Врач' },
    { value: 'teacher',  label: 'Преподаватель' }
];

function AuthModal({ open, onClose, onSuccess }) {
    const [activeTab, setActiveTab] = useState('login');
    const [loading, setLoading] = useState(false);
    const [showReset, setShowReset] = useState(false);
    const [resetSent, setResetSent] = useState(false);
    const [loginForm] = Form.useForm();
    const [registerForm] = Form.useForm();
    const [resetForm] = Form.useForm();

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

    const handleResetPassword = async (values) => {
        setLoading(true);
        try {
            await resetPassword(values.email);
            setResetSent(true);
        } catch (err) {
            message.error(err.message || 'Ошибка отправки письма');
        }
        setLoading(false);
    };

    const handleRegister = async (values) => {
        setLoading(true);
        const profileData = {
            last_name:   values.last_name.trim(),
            first_name:  values.first_name.trim(),
            middle_name: values.middle_name?.trim() || '',
            role:        values.role || 'student',
            institution: values.institution?.trim() || ''
        };
        const { data, error } = await signUp(values.email, values.password, profileData);
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
            children: showReset ? (
                <div>
                    {resetSent ? (
                        <Alert
                            message="Письмо отправлено!"
                            description={`Проверьте почту — там будет ссылка для сброса пароля. Если не видите письмо, проверьте папку «Спам».`}
                            type="success"
                            showIcon
                            style={{ marginBottom: 16 }}
                        />
                    ) : (
                        <>
                            <Alert
                                message="Восстановление пароля"
                                description="Введите email — пришлём ссылку для сброса пароля."
                                type="info"
                                showIcon
                                style={{ marginBottom: 16 }}
                            />
                            <Form form={resetForm} onFinish={handleResetPassword} layout="vertical">
                                <Form.Item
                                    name="email"
                                    rules={[
                                        { required: true, message: 'Введите Email' },
                                        { type: 'email', message: 'Некорректный Email' }
                                    ]}
                                >
                                    <Input prefix={<MailOutlined />} placeholder="Ваш email" size="large" />
                                </Form.Item>
                                <Form.Item>
                                    <Button type="primary" htmlType="submit" block size="large" loading={loading}>
                                        Отправить ссылку
                                    </Button>
                                </Form.Item>
                            </Form>
                        </>
                    )}
                    <Button
                        type="link"
                        block
                        onClick={() => { setShowReset(false); setResetSent(false); resetForm.resetFields(); }}
                    >
                        ← Вернуться ко входу
                    </Button>
                </div>
            ) : (
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
                    <div style={{ textAlign: 'center' }}>
                        <Button type="link" onClick={() => setShowReset(true)} style={{ padding: 0 }}>
                            Забыл пароль?
                        </Button>
                    </div>
                </Form>
            )
        },
        {
            key: 'register',
            label: 'Регистрация',
            children: (
                <Form form={registerForm} onFinish={handleRegister} layout="vertical">
                    <Alert
                        message="Регистрация для обучающихся"
                        description="После регистрации вы получите доступ к обучению, тестированию и ИИ-помощнику."
                        type="info"
                        showIcon
                        style={{ marginBottom: 16 }}
                    />

                    {/* ФИО */}
                    <Form.Item
                        name="last_name"
                        label="Фамилия"
                        rules={[{ required: true, message: 'Введите фамилию' }]}
                    >
                        <Input prefix={<UserOutlined />} placeholder="Иванов" size="large" />
                    </Form.Item>

                    <Form.Item
                        name="first_name"
                        label="Имя"
                        rules={[{ required: true, message: 'Введите имя' }]}
                    >
                        <Input prefix={<UserOutlined />} placeholder="Иван" size="large" />
                    </Form.Item>

                    <Form.Item name="middle_name" label="Отчество (необязательно)">
                        <Input prefix={<UserOutlined />} placeholder="Иванович" size="large" />
                    </Form.Item>

                    {/* Роль */}
                    <Form.Item
                        name="role"
                        label="Статус"
                        initialValue="student"
                        rules={[{ required: true, message: 'Выберите статус' }]}
                    >
                        <Select size="large" options={ROLE_OPTIONS} placeholder="Выберите статус" />
                    </Form.Item>

                    {/* Место учёбы/работы */}
                    <Form.Item name="institution" label="Учебное заведение / место работы (необязательно)">
                        <Input prefix={<BankOutlined />} placeholder="РНИМУ им. Пирогова" size="large" />
                    </Form.Item>

                    {/* Email / пароль */}
                    <Form.Item
                        name="email"
                        label="Email"
                        rules={[
                            { required: true, message: 'Введите Email' },
                            { type: 'email', message: 'Некорректный Email' }
                        ]}
                    >
                        <Input prefix={<MailOutlined />} placeholder="ivanov@mail.ru" size="large" />
                    </Form.Item>

                    <Form.Item
                        name="password"
                        label="Пароль"
                        rules={[
                            { required: true, message: 'Введите пароль' },
                            { min: 6, message: 'Минимум 6 символов' }
                        ]}
                    >
                        <Input.Password prefix={<LockOutlined />} placeholder="Пароль" size="large" />
                    </Form.Item>

                    <Form.Item
                        name="confirmPassword"
                        label="Подтверждение пароля"
                        dependencies={['password']}
                        rules={[
                            { required: true, message: 'Подтвердите пароль' },
                            ({ getFieldValue }) => ({
                                validator(_, value) {
                                    if (!value || getFieldValue('password') === value) {
                                        return Promise.resolve();
                                    }
                                    return Promise.reject(new Error('Пароли не совпадают'));
                                }
                            })
                        ]}
                    >
                        <Input.Password prefix={<LockOutlined />} placeholder="Повторите пароль" size="large" />
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

    const handleClose = () => {
        setShowReset(false);
        setResetSent(false);
        resetForm.resetFields();
        onClose();
    };

    return (
        <Modal
            open={open}
            onCancel={handleClose}
            footer={null}
            width={460}
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
