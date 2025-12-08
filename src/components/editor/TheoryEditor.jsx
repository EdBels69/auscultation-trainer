import React, { useState, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import ImageExtension from './ImageExtension';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import { TextStyle } from '@tiptap/extension-text-style';
import FontFamily from '@tiptap/extension-font-family';
import { Color } from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import { Button, Tooltip, Select, ColorPicker } from 'antd';
import {
    BoldOutlined,
    ItalicOutlined,
    UnderlineOutlined,
    StrikethroughOutlined,
    OrderedListOutlined,
    UnorderedListOutlined,
    LinkOutlined,
    PictureOutlined,
    SoundOutlined,
    UndoOutlined,
    RedoOutlined,
    SaveOutlined,
    MinusOutlined,
    AlignLeftOutlined,
    AlignCenterOutlined,
    AlignRightOutlined,
    HighlightOutlined,
    FontColorsOutlined,
} from '@ant-design/icons';
import AudioBlockExtension from './AudioBlockExtension';
import SoundPickerModal from './SoundPickerModal';
import ImagePickerModal from './ImagePickerModal';
import './TheoryEditor.css';

const FONT_FAMILIES = [
    { value: 'Inter, sans-serif', label: 'Inter' },
    { value: 'Arial, sans-serif', label: 'Arial' },
    { value: 'Times New Roman, serif', label: 'Times New Roman' },
    { value: 'Georgia, serif', label: 'Georgia' },
    { value: 'Courier New, monospace', label: 'Courier New' },
    { value: 'Verdana, sans-serif', label: 'Verdana' },
];

const FONT_SIZES = [
    { value: '12px', label: '12' },
    { value: '14px', label: '14' },
    { value: '16px', label: '16' },
    { value: '18px', label: '18' },
    { value: '20px', label: '20' },
    { value: '24px', label: '24' },
    { value: '28px', label: '28' },
    { value: '32px', label: '32' },
];

// Custom extension for font size
const FontSize = TextStyle.extend({
    addAttributes() {
        return {
            ...this.parent?.(),
            fontSize: {
                default: null,
                parseHTML: element => element.style.fontSize || null,
                renderHTML: attributes => {
                    if (!attributes.fontSize) return {};
                    return { style: `font-size: ${attributes.fontSize}` };
                },
            },
        };
    },
});

function TheoryEditor({ initialContent = '', onSave, saving = false }) {
    const [soundPickerVisible, setSoundPickerVisible] = useState(false);
    const [imagePickerVisible, setImagePickerVisible] = useState(false);

    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: { levels: [1, 2, 3, 4] },
            }),
            ImageExtension,
            Link.configure({ openOnClick: false }),
            Placeholder.configure({
                placeholder: 'Начните писать...',
            }),
            Underline,
            TextAlign.configure({
                types: ['heading', 'paragraph'],
            }),
            TextStyle,
            FontFamily,
            FontSize,
            Color,
            Highlight.configure({ multicolor: true }),
            AudioBlockExtension,
        ],
        content: initialContent,
    });

    const handleSave = useCallback(() => {
        if (editor && onSave) {
            onSave(editor.getHTML());
        }
    }, [editor, onSave]);

    const handleSoundSelect = useCallback((soundData) => {
        if (editor) {
            editor.chain().focus().insertContent({
                type: 'audioBlock',
                attrs: soundData,
            }).run();
        }
    }, [editor]);

    const handleImageSelect = useCallback((imageUrl) => {
        if (editor) {
            editor.chain().focus().setImage({ src: imageUrl }).run();
        }
    }, [editor]);

    const addLink = () => {
        const url = window.prompt('Введите URL:');
        if (url && editor) {
            editor.chain().focus().setLink({ href: url }).run();
        }
    };

    const setFontFamily = (font) => {
        if (editor && font) {
            editor.chain().focus().setFontFamily(font).run();
        }
    };

    const setFontSize = (size) => {
        if (editor && size) {
            editor.chain().focus().setMark('textStyle', { fontSize: size }).run();
        }
    };

    const setTextColor = (color) => {
        if (editor && color) {
            const hex = typeof color === 'string' ? color : color.toHexString();
            editor.chain().focus().setColor(hex).run();
        }
    };

    const setHighlightColor = (color) => {
        if (editor && color) {
            const hex = typeof color === 'string' ? color : color.toHexString();
            editor.chain().focus().setHighlight({ color: hex }).run();
        }
    };

    if (!editor) return null;

    return (
        <div className="theory-editor">
            {/* Toolbar Row 1 */}
            <div className="theory-editor-toolbar">
                <Tooltip title="Отменить">
                    <Button size="small" icon={<UndoOutlined />} onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} />
                </Tooltip>
                <Tooltip title="Повторить">
                    <Button size="small" icon={<RedoOutlined />} onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} />
                </Tooltip>

                <div className="theory-editor-divider" />

                <Select
                    size="small"
                    placeholder="Шрифт"
                    style={{ width: 130 }}
                    options={FONT_FAMILIES}
                    onChange={setFontFamily}
                    allowClear
                />
                <Select
                    size="small"
                    placeholder="Размер"
                    style={{ width: 70 }}
                    options={FONT_SIZES}
                    onChange={setFontSize}
                    allowClear
                />

                <div className="theory-editor-divider" />

                <Tooltip title="Жирный">
                    <Button size="small" icon={<BoldOutlined />} onClick={() => editor.chain().focus().toggleBold().run()} className={editor.isActive('bold') ? 'is-active' : ''} />
                </Tooltip>
                <Tooltip title="Курсив">
                    <Button size="small" icon={<ItalicOutlined />} onClick={() => editor.chain().focus().toggleItalic().run()} className={editor.isActive('italic') ? 'is-active' : ''} />
                </Tooltip>
                <Tooltip title="Подчёркнутый">
                    <Button size="small" icon={<UnderlineOutlined />} onClick={() => editor.chain().focus().toggleUnderline().run()} className={editor.isActive('underline') ? 'is-active' : ''} />
                </Tooltip>
                <Tooltip title="Зачёркнутый">
                    <Button size="small" icon={<StrikethroughOutlined />} onClick={() => editor.chain().focus().toggleStrike().run()} className={editor.isActive('strike') ? 'is-active' : ''} />
                </Tooltip>

                <div className="theory-editor-divider" />

                <Tooltip title="Цвет текста">
                    <ColorPicker size="small" onChange={setTextColor}>
                        <Button size="small" icon={<FontColorsOutlined />} />
                    </ColorPicker>
                </Tooltip>
                <Tooltip title="Выделение">
                    <ColorPicker size="small" onChange={setHighlightColor}>
                        <Button size="small" icon={<HighlightOutlined />} />
                    </ColorPicker>
                </Tooltip>

                <div className="theory-editor-divider" />

                <Tooltip title="H1"><Button size="small" onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} className={editor.isActive('heading', { level: 1 }) ? 'is-active' : ''}>H1</Button></Tooltip>
                <Tooltip title="H2"><Button size="small" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={editor.isActive('heading', { level: 2 }) ? 'is-active' : ''}>H2</Button></Tooltip>
                <Tooltip title="H3"><Button size="small" onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} className={editor.isActive('heading', { level: 3 }) ? 'is-active' : ''}>H3</Button></Tooltip>

                <div className="theory-editor-divider" />

                <Tooltip title="Слева">
                    <Button size="small" icon={<AlignLeftOutlined />} onClick={() => editor.chain().focus().setTextAlign('left').run()} className={editor.isActive({ textAlign: 'left' }) ? 'is-active' : ''} />
                </Tooltip>
                <Tooltip title="По центру">
                    <Button size="small" icon={<AlignCenterOutlined />} onClick={() => editor.chain().focus().setTextAlign('center').run()} className={editor.isActive({ textAlign: 'center' }) ? 'is-active' : ''} />
                </Tooltip>
                <Tooltip title="Справа">
                    <Button size="small" icon={<AlignRightOutlined />} onClick={() => editor.chain().focus().setTextAlign('right').run()} className={editor.isActive({ textAlign: 'right' }) ? 'is-active' : ''} />
                </Tooltip>

                <div className="theory-editor-divider" />

                <Tooltip title="Список"><Button size="small" icon={<UnorderedListOutlined />} onClick={() => editor.chain().focus().toggleBulletList().run()} className={editor.isActive('bulletList') ? 'is-active' : ''} /></Tooltip>
                <Tooltip title="Нумерация"><Button size="small" icon={<OrderedListOutlined />} onClick={() => editor.chain().focus().toggleOrderedList().run()} className={editor.isActive('orderedList') ? 'is-active' : ''} /></Tooltip>
                <Tooltip title="Цитата"><Button size="small" onClick={() => editor.chain().focus().toggleBlockquote().run()} className={editor.isActive('blockquote') ? 'is-active' : ''}>❝</Button></Tooltip>
                <Tooltip title="Разделитель"><Button size="small" icon={<MinusOutlined />} onClick={() => editor.chain().focus().setHorizontalRule().run()} /></Tooltip>

                <div className="theory-editor-divider" />

                <Tooltip title="Ссылка"><Button size="small" icon={<LinkOutlined />} onClick={addLink} className={editor.isActive('link') ? 'is-active' : ''} /></Tooltip>
                <Tooltip title="Изображение"><Button size="small" icon={<PictureOutlined />} onClick={() => setImagePickerVisible(true)} /></Tooltip>
                <Button size="small" type="primary" icon={<SoundOutlined />} onClick={() => setSoundPickerVisible(true)} style={{ background: '#667eea', borderColor: '#667eea' }}>Аудио</Button>

                <Button type="primary" icon={<SaveOutlined />} onClick={handleSave} loading={saving} style={{ marginLeft: 'auto', flexShrink: 0 }}>Сохранить</Button>
            </div>

            {/* Editor */}
            <div className="theory-editor-content">
                <EditorContent editor={editor} />
            </div>

            <SoundPickerModal visible={soundPickerVisible} onClose={() => setSoundPickerVisible(false)} onSelect={handleSoundSelect} />
            <ImagePickerModal visible={imagePickerVisible} onClose={() => setImagePickerVisible(false)} onSelect={handleImageSelect} />
        </div>
    );
}

export default TheoryEditor;
