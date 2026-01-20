import { Node, mergeAttributes } from '@tiptap/core';
import { NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react';
import { DeleteOutlined } from '@ant-design/icons';
import React from 'react';

// Image component with delete button
const ImageComponent = ({ node, deleteNode, selected }) => {
    return (
        <NodeViewWrapper className="image-node-wrapper">
            <div className={`image-container ${selected ? 'selected' : ''}`}>
                <img src={node.attrs.src} alt={node.attrs.alt || ''} />
                <button
                    className="image-delete-btn"
                    onClick={deleteNode}
                    title="Удалить изображение"
                    type="button"
                >
                    <DeleteOutlined />
                </button>
            </div>
        </NodeViewWrapper>
    );
};

// Custom Image Extension with React NodeView
const ImageExtension = Node.create({
    name: 'image',

    group: 'block',

    atom: true,

    addAttributes() {
        return {
            src: {
                default: null,
            },
            alt: {
                default: null,
            },
            title: {
                default: null,
            },
        };
    },

    parseHTML() {
        return [
            {
                tag: 'img[src]',
            },
        ];
    },

    renderHTML({ HTMLAttributes }) {
        return ['img', mergeAttributes(HTMLAttributes)];
    },

    addNodeView() {
        return ReactNodeViewRenderer(ImageComponent);
    },

    addCommands() {
        return {
            setImage: options => ({ commands }) => {
                return commands.insertContent({
                    type: this.name,
                    attrs: options,
                });
            },
        };
    },
});

export default ImageExtension;
