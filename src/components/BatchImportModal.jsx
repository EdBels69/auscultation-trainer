/**
 * BatchImportModal — bulk import sounds from XLSX metadata + ZIP/7z audio archive
 *
 * Workflow:
 * 1. User uploads XLSX (columns: num, diagnosis, phenomenon, variant, filename)
 * 2. User uploads ZIP archive with MP3 files (filenames start with record number)
 * 3. AI enriches each record with EN name, description, auscultation point, difficulty
 * 4. Preview table shown — user can edit before import
 * 5. Click Import → uploads to Supabase Storage + inserts DB records
 */
import { useState, useCallback } from 'react';
import {
    Modal, Upload, Button, Table, Tag, Progress, Alert, Space,
    Typography, Steps, message, Input, Select
} from 'antd';
import {
    UploadOutlined, RobotOutlined, ImportOutlined,
    FileExcelOutlined, FolderOpenOutlined, CheckCircleOutlined
} from '@ant-design/icons';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import { supabase } from '../services/supabase';

const { Text, Title } = Typography;
const { Option } = Select;

// ── AI enrichment via routerai.ru ──────────────────────
async function enrichWithAI(records, apiKey) {
    const rows = records.map((r, i) =>
        `${i + 1}. Phenomenon: ${r.phenomenon} | Diagnosis: ${r.diagnosis} | Variant ${r.variant}`
    ).join('\n');

    const prompt = `You are a clinical medicine expert. For each auscultation sound record below, return:
1. name_en: concise English clinical name (e.g. "Dry Wheezes - Variant 1 (Bronchial Asthma)")
2. description_en: 1 sentence for medical students explaining what this sound is
3. auscultation_point: anatomical location (e.g. "All lung fields", "Apex", "Aortic area")
4. difficulty: easy/medium/hard

Records:
${rows}

Return ONLY valid JSON array, exactly ${records.length} items, no markdown:
[{"id":1,"name_en":"...","description_en":"...","auscultation_point":"...","difficulty":"medium"}]`;

    const r = await fetch('https://routerai.ru/api/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: 'mistralai/mistral-small-2603',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.2, max_tokens: 3500
        })
    });
    if (!r.ok) throw new Error(`AI error ${r.status}`);
    const data = await r.json();
    let content = data.choices[0].message.content.replace(/```json|```/g, '').trim();
    const enriched = JSON.parse(content);
    return Object.fromEntries(enriched.map(e => [e.id, e]));
}

// ── Parse XLSX ─────────────────────────────────────────
function parseXlsx(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const wb = XLSX.read(e.target.result, { type: 'array' });
                const ws = wb.Sheets[wb.SheetNames[0]];
                const rows = XLSX.utils.sheet_to_json(ws, { header: 1 }).slice(1); // skip header
                const records = rows.filter(r => r[0]).map(r => ({
                    num: Number(r[0]),
                    diagnosis: String(r[1] || ''),
                    phenomenon: String(r[2] || ''),
                    variant: Number(r[3] || 1),
                    filename: String(r[4] || ''),
                    duration_s: Number(r[7] || 0),
                }));
                resolve(records);
            } catch (e) { reject(e); }
        };
        reader.readAsArrayBuffer(file);
    });
}

// ── Extract ZIP and index MP3s by number ──────────────
async function indexZip(file) {
    const zip = await JSZip.loadAsync(file);
    const mp3Map = {};
    for (const [path, entry] of Object.entries(zip.files)) {
        if (entry.dir || !path.toLowerCase().endsWith('.mp3')) continue;
        const fname = path.split('/').pop();
        const match = fname.match(/^(\d+)[\s\u00a0]/);
        if (match) {
            mp3Map[Number(match[1])] = { entry, name: fname };
        }
    }
    return mp3Map;
}

const NODE_MAP = {
    'Сухие свистящие хрипы': 'svistyashchie_hripy_mjx51jtr',
    'Сухие свистящие хрипы на фоне ослабленного везикулярного дыхания': 'svistyashchie_hripy_mjx51jtr',
    'Сухие свистящие хрипы на форсированном выдохе': 'svistyashchie_hripy_mjx51jtr',
    'Амфорическое дыхание': 'amforicheskoe_dyhanie_mjx4yeca',
    'Бронхиальное дыхание': 'bronchial_breathing',
    'Везикулярное дыхание': 'vesicular_breathing',
    'Сухие жужжащие хрипы': 'adventitious_sounds',
    'Крепитация': 'krepitatsiya_mjx4zo6w',
    'Ларинготрахеальное дыхание': 'laringotrahealnoe_dyhanie_mjx52sw1',
    'Мелкопузырчатые влажные хрипы': 'vlazhnye_hripy_melkopuzyrchatye_mjx50wdg',
    'Крупнопузырчатые влажные хрипы': 'vlazhnye_hripy_krupnopuzyrchatye_mjx50e6d',
    'Среднепузырчатые влажные хрипы': 'vlazhnye_hripy_srednepuzyrchatye_mjx50plt',
    'Шум трения плевры': 'pleural_rub',
    'Систолический шум при аортальном стенозе': 'nedostatochnost_aortalnogo_klapana_mjx0kjr6',
    'Диастолический шум при митральном стенозе': 'stenoz_mitralnogo_klapana_mjx0jxod',
    'Хлопающий первый тон на верхушке сердца': 'hlopayushchiy_pervyy_ton_mjwt62ec',
    'Систолический шум при митральной недостаточности на верхушке сердца': 'nedostatochnost_mitralnogo_klapana_mjx0ks7w',
};

function BatchImportModal({ open, onClose, onSuccess }) {
    const [step, setStep] = useState(0);
    const [xlsxFile, setXlsxFile] = useState(null);
    const [zipFile, setZipFile] = useState(null);
    const [records, setRecords] = useState([]);
    const [mp3Map, setMp3Map] = useState({});
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [progressLabel, setProgressLabel] = useState('');
    const [error, setError] = useState('');
    const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;

    const reset = () => {
        setStep(0); setXlsxFile(null); setZipFile(null);
        setRecords([]); setMp3Map({}); setLoading(false);
        setProgress(0); setProgressLabel(''); setError('');
    };

    // Step 1 → 2: Parse files + AI enrich
    const handlePrepare = async () => {
        if (!xlsxFile || !zipFile) { setError('Загрузите оба файла'); return; }
        setLoading(true); setError('');
        try {
            setProgressLabel('Читаю XLSX...');
            const parsed = await parseXlsx(xlsxFile);
            setProgress(20);

            setProgressLabel('Индексирую MP3 из архива...');
            const mp3 = await indexZip(zipFile);
            setMp3Map(mp3);
            setProgress(40);

            setProgressLabel('AI обогащение метаданных...');
            let enMap = {};
            try {
                enMap = await enrichWithAI(parsed, apiKey);
            } catch (e) {
                console.warn('AI enrichment failed:', e);
            }
            setProgress(70);

            const enriched = parsed.map((r, i) => {
                const en = enMap[i + 1] || {};
                return {
                    ...r,
                    nameEn: en.name_en || '',
                    descriptionEn: en.description_en || '',
                    auscultationPoint: en.auscultation_point || '',
                    difficulty: en.difficulty || 'medium',
                    category: r.num >= 22 ? 'cardiac' : 'pulmonary',
                    hasAudio: !!mp3[r.num],
                    nodeKey: NODE_MAP[r.phenomenon] || (r.num >= 22 ? 'heart_murmurs' : 'adventitious_sounds'),
                };
            });

            setRecords(enriched);
            setProgress(100);
            setStep(1);
        } catch (e) {
            setError('Ошибка: ' + e.message);
        } finally {
            setLoading(false);
        }
    };

    // Step 2 → 3: Upload to Supabase
    const handleImport = async () => {
        setLoading(true); setError(''); setStep(2);
        let ok = 0;
        for (let i = 0; i < records.length; i++) {
            const r = records[i];
            setProgressLabel(`Загружаю ${i + 1}/${records.length}: ${r.phenomenon.slice(0, 35)}...`);
            setProgress(Math.round((i / records.length) * 100));

            if (!mp3Map[r.num]) continue;
            try {
                const blob = await mp3Map[r.num].entry.async('blob');
                const safeName = `batch_${r.num}_${Date.now()}.mp3`;
                const { error: upErr } = await supabase.storage.from('sounds').upload(safeName, blob, { contentType: 'audio/mpeg' });
                if (upErr) throw upErr;

                const { data: { publicUrl } } = supabase.storage.from('sounds').getPublicUrl(safeName);
                const { error: dbErr } = await supabase.from('sounds').insert({
                    name: r.phenomenon,
                    name_en: r.nameEn || null,
                    description: r.diagnosis,
                    description_en: r.descriptionEn || null,
                    category: r.category,
                    position: r.auscultationPoint,
                    difficulty: r.difficulty,
                    file_path: safeName,
                    file_name: mp3Map[r.num].name,
                    audio_url: publicUrl,
                    linked_node_key: r.nodeKey,
                });
                if (dbErr) throw dbErr;
                ok++;
            } catch (e) {
                console.error(`Record ${r.num}:`, e);
            }
        }
        setProgress(100);
        setProgressLabel(`✅ Импортировано ${ok}/${records.length}`);
        setLoading(false);
        if (ok > 0 && onSuccess) onSuccess();
        message.success(`Импортировано ${ok} записей`);
    };

    const columns = [
        { title: '№', dataIndex: 'num', width: 45 },
        { title: 'Феномен (RU)', dataIndex: 'phenomenon', width: 200,
          render: (v, r) => <Text style={{ fontSize: 12 }}>{v}{r.variant > 1 ? ` #${r.variant}` : ''}</Text> },
        { title: 'EN name (AI)', dataIndex: 'nameEn', width: 200,
          render: (v, r) => <Input size="small" value={v} onChange={e => {
              const updated = records.map(x => x.num === r.num ? {...x, nameEn: e.target.value} : x);
              setRecords(updated);
          }} /> },
        { title: 'Точка', dataIndex: 'auscultationPoint', width: 130,
          render: (v, r) => <Input size="small" value={v} onChange={e => {
              setRecords(records.map(x => x.num === r.num ? {...x, auscultationPoint: e.target.value} : x));
          }} /> },
        { title: 'Кат.', dataIndex: 'category', width: 80,
          render: v => <Tag color={v === 'cardiac' ? 'red' : 'blue'}>{v === 'cardiac' ? '❤️' : '🫁'}</Tag> },
        { title: 'Слож.', dataIndex: 'difficulty', width: 90,
          render: (v, r) => <Select size="small" value={v} style={{ width: 80 }}
              onChange={val => setRecords(records.map(x => x.num === r.num ? {...x, difficulty: val} : x))}>
              <Option value="easy">easy</Option>
              <Option value="medium">medium</Option>
              <Option value="hard">hard</Option>
          </Select> },
        { title: 'MP3', dataIndex: 'hasAudio', width: 50,
          render: v => v ? <CheckCircleOutlined style={{ color: '#52c41a' }} /> : <Text type="danger">✗</Text> },
    ];

    return (
        <Modal
            title={<><ImportOutlined /> Пакетный импорт аудиотеки</>}
            open={open}
            onCancel={() => { reset(); onClose(); }}
            footer={null}
            width={900}
            destroyOnClose
        >
            <Steps current={step} size="small" style={{ marginBottom: 20 }}
                items={[
                    { title: 'Файлы', icon: <FileExcelOutlined /> },
                    { title: 'Проверка', icon: <RobotOutlined /> },
                    { title: 'Импорт', icon: <ImportOutlined /> },
                ]}
            />

            {error && <Alert type="error" message={error} style={{ marginBottom: 16 }} />}

            {/* Step 0: Upload files */}
            {step === 0 && (
                <Space direction="vertical" style={{ width: '100%' }} size={16}>
                    <div>
                        <Text strong>1. XLSX с метаданными</Text>
                        <Text type="secondary" style={{ display: 'block', fontSize: 12, marginBottom: 8 }}>
                            Колонки: №, Диагноз, Феномен, Вариант, Имя файла, Размер, Формат, Длительность
                        </Text>
                        <Upload beforeUpload={f => { setXlsxFile(f); return false; }} accept=".xlsx,.xls" maxCount={1} fileList={xlsxFile ? [{ name: xlsxFile.name, uid: '1' }] : []}>
                            <Button icon={<FileExcelOutlined />}>{xlsxFile ? xlsxFile.name : 'Выбрать XLSX'}</Button>
                        </Upload>
                    </div>
                    <div>
                        <Text strong>2. ZIP-архив с MP3-файлами</Text>
                        <Text type="secondary" style={{ display: 'block', fontSize: 12, marginBottom: 8 }}>
                            Имена файлов должны начинаться с номера записи: "1 Сухие хрипы.mp3", "22 Стеноз АК.mp3"
                        </Text>
                        <Upload beforeUpload={f => { setZipFile(f); return false; }} accept=".zip,.7z" maxCount={1} fileList={zipFile ? [{ name: zipFile.name, uid: '2' }] : []}>
                            <Button icon={<FolderOpenOutlined />}>{zipFile ? zipFile.name : 'Выбрать ZIP'}</Button>
                        </Upload>
                    </div>
                    {loading && (
                        <div>
                            <Text type="secondary">{progressLabel}</Text>
                            <Progress percent={progress} size="small" />
                        </div>
                    )}
                    <Button type="primary" icon={<RobotOutlined />} onClick={handlePrepare}
                        loading={loading} disabled={!xlsxFile || !zipFile} block>
                        Разобрать и обогатить через AI
                    </Button>
                </Space>
            )}

            {/* Step 1: Preview & edit */}
            {step === 1 && (
                <Space direction="vertical" style={{ width: '100%' }} size={12}>
                    <Alert
                        type="info"
                        message={`${records.length} записей готово к импорту (${records.filter(r => r.hasAudio).length} с аудио). Отредактируйте EN-названия при необходимости.`}
                    />
                    <Table
                        dataSource={records}
                        columns={columns}
                        rowKey="num"
                        size="small"
                        pagination={false}
                        scroll={{ y: 350 }}
                        rowClassName={r => !r.hasAudio ? 'ant-table-row-disabled' : ''}
                    />
                    <Space>
                        <Button onClick={() => setStep(0)}>← Назад</Button>
                        <Button type="primary" icon={<ImportOutlined />} onClick={handleImport} block>
                            Импортировать {records.filter(r => r.hasAudio).length} записей в базу
                        </Button>
                    </Space>
                </Space>
            )}

            {/* Step 2: Progress */}
            {step === 2 && (
                <Space direction="vertical" style={{ width: '100%', textAlign: 'center' }} size={16}>
                    <Progress type="circle" percent={progress} />
                    <Text>{progressLabel}</Text>
                    {!loading && (
                        <Button type="primary" onClick={() => { reset(); onClose(); }}>
                            Закрыть
                        </Button>
                    )}
                </Space>
            )}
        </Modal>
    );
}

export default BatchImportModal;
