/**
 * ParticipantModal — Anonymous participant entry
 * Two modes: "new" (register with name+role, get code) and "return" (enter existing code)
 * Replaces AuthModal for regular users; admin login stays separate.
 */
import { useState } from 'react';
import {
    Modal, Form, Input, Button, Alert, message, Tabs, Select,
    Typography, Divider, Card, Tag, Space,
} from 'antd';
import { UserOutlined, BankOutlined, KeyOutlined, CopyOutlined } from '@ant-design/icons';
import { createParticipant, findParticipantByCode, storeParticipant } from '../services/participants';

const { Text, Title, Paragraph } = Typography;
const { Option } = Select;

const ROLE_OPTIONS = [
    { value: 'student',  label: 'Студент' },
    { value: 'resident', label: 'Клинический ординатор' },
    { value: 'doctor',   label: 'Врач' },
    { value: 'teacher',  label: 'Преподаватель' },
];

function ParticipantModal({ open, onClose, onParticipantReady }) {
    const [tab, setTab] = useState('new');
    const [loading, setLoading] = useState(false);
    const [createdParticipant, setCreatedParticipant] = useState(null);
    const [newForm] = Form.useForm();
    const [returnForm] = Form.useForm();

    /* ── NEW PARTICIPANT ─────────────────────────────────────── */
    const handleNew = async (vals) => {
        setLoading(true);
        const { participant, error } = await createParticipant({
            full_name: vals.full_name,
            role: vals.role,
            year_of_study: vals.year_of_study,
            institution: vals.institution || 'ФГБОУ ВО РязГМУ Минздрава России',
        });
        setLoading(false);

        if (error) {
            message.error('Ошибка: ' + error.message);
            return;
        }

        setCreatedParticipant(participant);
    };

    const confirmCode = () => {
        storeParticipant(createdParticipant);
        message.success(`Добро пожаловать, ${createdParticipant.full_name}!`);
        setCreatedParticipant(null);
        newForm.resetFields();
        onParticipantReady(createdParticipant);
        onClose();
    };

    /* ── RETURN PARTICIPANT ──────────────────────────────────── */
    const handleReturn = async (vals) => {
        setLoading(true);
        const { participant, error } = await findParticipantByCode(vals.code);
        setLoading(false);

        if (error || !participant) {
            message.error('Код участника не найден. Проверьте правильность ввода.');
            return;
        }

        storeParticipant(participant);
        message.success(`С возвращением, ${participant.full_name}!`);
        returnForm.resetFields();
        onParticipantReady(participant);
        onClose();
    };

    const copyCode = (code) => {
        navigator.clipboard.writeText(code);
        message.success('Код скопирован!');
    };

    /* ── RENDER ───────────────────────────────────────────────── */
    return (
        <Modal
            title="Вход в тренажёр"
            open={open}
            footer={null}
            onCancel={onClose}
            width={480}
            destroyOnClose
            maskClosable={false}
        >
            {/* Show generated code after registration */}
            {createdParticipant ? (
                <div style={{ textAlign: 'center', padding: '16px 0' }}>
                    <Alert
                        type="success"
                        showIcon
                        message="Вы зарегистрированы!"
                        description="Запишите или сфотографируйте ваш код участника — он понадобится для повторного входа."
                        style={{ marginBottom: 24 }}
                    />
                    <Card
                        style={{
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            borderRadius: 16,
                            marginBottom: 24,
                        }}
                    >
                        <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14 }}>
                            Ваш код участника
                        </Text>
                        <Title
                            level={1}
                            style={{
                                color: '#fff',
                                margin: '8px 0',
                                letterSpacing: 4,
                                fontFamily: 'monospace',
                            }}
                        >
                            {createdParticipant.code}
                        </Title>
                        <Button
                            icon={<CopyOutlined />}
                            onClick={() => copyCode(createdParticipant.code)}
                            style={{ borderColor: 'rgba(255,255,255,0.5)', color: '#fff' }}
                            ghost
                        >
                            Скопировать
                        </Button>
                    </Card>
                    <Paragraph type="secondary" style={{ fontSize: 13 }}>
                        <strong>{createdParticipant.full_name}</strong> · {
                            ROLE_OPTIONS.find(r => r.value === createdParticipant.role)?.label || createdParticipant.role
                        }
                    </Paragraph>
                    <Button type="primary" size="large" block onClick={confirmCode}>
                        Я запомнил код — продолжить
                    </Button>
                </div>
            ) : (
                <Tabs activeKey={tab} onChange={setTab} centered items={[
                    {
                        key: 'new',
                        label: 'Новый участник',
                        children: (
                            <Form form={newForm} layout="vertical" onFinish={handleNew} style={{ marginTop: 8 }}>
                                <Form.Item name="full_name" label="Фамилия и имя"
                                    rules={[{ required: true, message: 'Введите фамилию и имя' }]}>
                                    <Input prefix={<UserOutlined />} placeholder="Иванов Иван" size="large" />
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

                                <Button type="primary" htmlType="submit" block size="large" loading={loading}>
                                    Получить код участника
                                </Button>

                                <Text type="secondary" style={{ display: 'block', textAlign: 'center', marginTop: 12, fontSize: 12 }}>
                                    Участвуя, вы соглашаетесь на участие в НИР и обработку данных
                                    согласно разрешению ЛЭК № 1 от 16.09.2025
                                </Text>
                            </Form>
                        ),
                    },
                    {
                        key: 'return',
                        label: 'У меня есть код',
                        children: (
                            <Form form={returnForm} layout="vertical" onFinish={handleReturn} style={{ marginTop: 8 }}>
                                <Alert
                                    type="info"
                                    showIcon
                                    message="Введите код участника, полученный при первом входе"
                                    style={{ marginBottom: 16 }}
                                />
                                <Form.Item name="code"
                                    rules={[{ required: true, message: 'Введите код участника' }]}>
                                    <Input
                                        prefix={<KeyOutlined />}
                                        placeholder="AT-XXXX"
                                        size="large"
                                        style={{ fontFamily: 'monospace', fontSize: 18, letterSpacing: 2, textAlign: 'center' }}
                                        maxLength={7}
                                        onInput={(e) => { e.target.value = e.target.value.toUpperCase(); }}
                                    />
                                </Form.Item>
                                <Button type="primary" htmlType="submit" block size="large" loading={loading}>
                                    Войти по коду
                                </Button>
                            </Form>
                        ),
                    },
                ]} />
            )}
        </Modal>
    );
}

export default ParticipantModal;
