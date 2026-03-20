/**
 * AuthModal — Login + Register for regular users (students, doctors)
 * Separate from AdminLogin (which is admin-only)
 */
import { useState } from 'react';
import {
    Modal, Form, Input, Button, Alert, message, Tabs, Select,
    Typography, Divider,
} from 'antd';
import { UserOutlined, LockOutlined, MailOutlined, BankOutlined } from '@ant-design/icons';
import { signIn, signUp, sendPasswordReset } from '../services/supabase';

const { Text } = Typography;
const { Option } = Select;

const ROLE_OPTIONS = [
    { value: 'student',  label: 'Студент' },
    { value: 'resident', label: 'Клинический ординатор' },
    { value: 'doctor',   label: 'Врач' },
    { value: 'teacher',  label: 'Преподаватель' },
];

function AuthModal({ open, onClose, onAuthSuccess }) {
    const [tab, setTab] = useState('login');
    const [loading, setLoading] = useState(false);
    const [forgotMode, setForgotMode] = useState(false);
    const [forgotDone, setForgotDone] = useState(false);
    const [loginForm] = Form.useForm();
    const [regForm] = Form.useForm();
    const [forgotForm] = Form.useForm();

    /* ── LOGIN ─────────────────────────────────────────────────── */
    const handleLogin = async (vals) => {
        setLoading(true);
        const { error } = await signIn(vals.email, vals.password);
        setLoading(false);
        if (error) {
            message.error('Неверный email или пароль');
        } else {
            message.success('Добро пожаловать!');
            loginForm.resetFields();
            if (onAuthSuccess) onAuthSuccess();
            onClose();
        }
    };

    /* ── REGISTER ───────────────────────────────────────────────── */
    const handleRegister = async (vals) => {
        setLoading(true);
        const metadata = {
            full_name: vals.full_name,
            role: vals.role,
            year_of_study: vals.year_of_study,
            institution: vals.institution || 'ФГБОУ ВО РязГМУ Минздрава России',
        };
        const { data, error } = await signUp(vals.email, vals.password, metadata);
        setLoading(false);
        if (error) {
            message.error(error.message);
        } else if (data?.user?.identities?.length === 0) {
            // User already exists
            message.error('Пользователь с таким email уже зарегистрирован. Попробуйте войти.');
            setTab('login');
        } else if (data?.session) {
            // Auto-login successful (email confirmation disabled)
            message.success('Регистрация прошла успешно!');
            regForm.resetFields();
            if (onAuthSuccess) onAuthSuccess();
            onClose();
        } else {
            // Email confirmation required — fallback message
            message.success('Регистрация прошла! Проверьте почту для подтверждения, затем войдите.');
            regForm.resetFields();
            setTab('login');
        }
    };

    /* ── FORGOT PASSWORD ────────────────────────────────────────── */
    const handleForgot = async (vals) => {
        setLoading(true);
        const { error } = await sendPasswordReset(vals.email);
        setLoading(false);
        if (error) {
            message.error('Ошибка: ' + error.message);
        } else {
            setForgotDone(true);
        }
    };

    const resetForgot = () => { setForgotMode(false); setForgotDone(false); forgotForm.resetFields(); };

    /* ── RENDER ─────────────────────────────────────────────────── */
    return (
        <Modal
            title={forgotMode ? 'Восстановление пароля' : 'Войти / Зарегистрироваться'}
            open={open}
            footer={null}
            onCancel={() => { onClose(); resetForgot(); }}
            width={440}
            destroyOnClose
        >
            {/* FORGOT PASSWORD FLOW */}
            {forgotMode ? (
                <>
                    {forgotDone ? (
                        <Alert type="success" showIcon
                            message="Письмо отправлено"
                            description="Проверьте почту и перейдите по ссылке. Ссылка действительна 1 час."
                            style={{ marginBottom: 16 }}
                        />
                    ) : (
                        <Form form={forgotForm} layout="vertical" onFinish={handleForgot}>
                            <Alert type="info" showIcon
                                message="Введите email — пришлём ссылку для смены пароля."
                                style={{ marginBottom: 16 }}
                            />
                            <Form.Item name="email"
                                rules={[{ required: true, type: 'email', message: 'Введите корректный email' }]}>
                                <Input prefix={<MailOutlined />} placeholder="Email" size="large" />
                            </Form.Item>
                            <Button type="primary" htmlType="submit" block loading={loading}>
                                Отправить ссылку
                            </Button>
                        </Form>
                    )}
                    <Divider />
                    <Button type="link" block onClick={resetForgot}>← Назад к входу</Button>
                </>
            ) : (
                <Tabs activeKey={tab} onChange={setTab} centered items={[
                    {
                        key: 'login',
                        label: 'Войти',
                        children: (
                            <Form form={loginForm} layout="vertical" onFinish={handleLogin} style={{ marginTop: 8 }}>
                                <Form.Item name="email"
                                    rules={[{ required: true, type: 'email', message: 'Введите корректный email' }]}>
                                    <Input prefix={<UserOutlined />} placeholder="Email" size="large" />
                                </Form.Item>
                                <Form.Item name="password"
                                    rules={[{ required: true, message: 'Введите пароль' }]}>
                                    <Input.Password prefix={<LockOutlined />} placeholder="Пароль" size="large" />
                                </Form.Item>
                                <Form.Item style={{ marginBottom: 4 }}>
                                    <Button type="primary" htmlType="submit" block size="large" loading={loading}>
                                        Войти
                                    </Button>
                                </Form.Item>
                                <div style={{ textAlign: 'center', marginTop: 8 }}>
                                    <Button type="link" size="small" onClick={() => setForgotMode(true)}>
                                        Забыли пароль?
                                    </Button>
                                </div>
                            </Form>
                        ),
                    },
                    {
                        key: 'register',
                        label: 'Регистрация',
                        children: (
                            <Form form={regForm} layout="vertical" onFinish={handleRegister} style={{ marginTop: 8 }}>
                                <Form.Item name="full_name" label="ФИО"
                                    rules={[{ required: true, message: 'Введите ФИО' }]}>
                                    <Input prefix={<UserOutlined />} placeholder="Иванов Иван Иванович" />
                                </Form.Item>
                                <Form.Item name="role" label="Статус"
                                    rules={[{ required: true, message: 'Выберите статус' }]}
                                    initialValue="student">
                                    <Select size="large">
                                        {ROLE_OPTIONS.map(o => <Option key={o.value} value={o.value}>{o.label}</Option>)}
                                    </Select>
                                </Form.Item>

                                {/* Dynamic: year for students */}
                                <Form.Item noStyle shouldUpdate={(prev, cur) => prev.role !== cur.role}>
                                    {({ getFieldValue }) => getFieldValue('role') === 'student' && (
                                        <Form.Item name="year_of_study" label="Курс"
                                            rules={[{ required: true, message: 'Выберите курс' }]}>
                                            <Select size="large" placeholder="Курс обучения">
                                                {[1,2,3,4,5,6].map(y => <Option key={y} value={y}>{y} курс</Option>)}
                                            </Select>
                                        </Form.Item>
                                    )}
                                </Form.Item>

                                <Form.Item name="institution" label="Учреждение">
                                    <Input prefix={<BankOutlined />} placeholder="ФГБОУ ВО РязГМУ Минздрава России" />
                                </Form.Item>
                                <Form.Item name="email" label="Email"
                                    rules={[{ required: true, type: 'email', message: 'Введите корректный email' }]}>
                                    <Input prefix={<MailOutlined />} placeholder="example@mail.ru" />
                                </Form.Item>
                                <Form.Item name="password" label="Пароль"
                                    rules={[{ required: true }, { min: 8, message: 'Минимум 8 символов' }]}>
                                    <Input.Password prefix={<LockOutlined />} placeholder="Минимум 8 символов" />
                                </Form.Item>
                                <Button type="primary" htmlType="submit" block size="large" loading={loading}>
                                    Зарегистрироваться
                                </Button>
                                <Text type="secondary" style={{ display: 'block', textAlign: 'center', marginTop: 12, fontSize: 12 }}>
                                    Регистрируясь, вы соглашаетесь на участие в НИР и обработку персональных данных согласно разрешению ЛЭК № 1 от 16.09.2025
                                </Text>
                            </Form>
                        ),
                    },
                ]} />
            )}
        </Modal>
    );
}

export default AuthModal;
