import { useState } from 'react';
import { Modal, Form, Input, Button, Alert, message } from 'antd';
import { LockOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { supabase } from '../services/supabase';

function ResetPasswordModal({ open, onClose }) {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [done, setDone] = useState(false);

    const handleSubmit = async (values) => {
        if (values.password !== values.confirm) {
            message.error('Пароли не совпадают');
            return;
        }
        setLoading(true);
        const { error } = await supabase.auth.updateUser({ password: values.password });
        setLoading(false);
        if (error) {
            message.error('Ошибка: ' + error.message);
        } else {
            setDone(true);
            message.success('Пароль успешно изменён');
            setTimeout(() => {
                setDone(false);
                form.resetFields();
                onClose();
            }, 2000);
        }
    };

    return (
        <Modal
            title="Новый пароль"
            open={open}
            footer={null}
            onCancel={onClose}
            maskClosable={false}
            width={380}
        >
            {done ? (
                <div style={{ textAlign: 'center', padding: '32px 0' }}>
                    <CheckCircleOutlined style={{ fontSize: 48, color: '#52c41a' }} />
                    <div style={{ marginTop: 16, fontSize: 16 }}>Пароль изменён!</div>
                </div>
            ) : (
                <Form form={form} layout="vertical" onFinish={handleSubmit} style={{ marginTop: 8 }}>
                    <Alert
                        message="Придумайте новый пароль"
                        description="Введите новый пароль дважды для подтверждения."
                        type="info"
                        showIcon
                        style={{ marginBottom: 20 }}
                    />
                    <Form.Item
                        name="password"
                        label="Новый пароль"
                        rules={[
                            { required: true, message: 'Введите пароль' },
                            { min: 8, message: 'Минимум 8 символов' },
                        ]}
                    >
                        <Input.Password prefix={<LockOutlined />} placeholder="Минимум 8 символов" />
                    </Form.Item>
                    <Form.Item
                        name="confirm"
                        label="Подтвердите пароль"
                        rules={[{ required: true, message: 'Повторите пароль' }]}
                    >
                        <Input.Password prefix={<LockOutlined />} placeholder="Повторите пароль" />
                    </Form.Item>
                    <Form.Item style={{ marginBottom: 0 }}>
                        <Button type="primary" htmlType="submit" block loading={loading}>
                            Сохранить новый пароль
                        </Button>
                    </Form.Item>
                </Form>
            )}
        </Modal>
    );
}

export default ResetPasswordModal;
