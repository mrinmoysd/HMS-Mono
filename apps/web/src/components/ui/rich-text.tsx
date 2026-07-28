'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Bold, Italic, List, ListOrdered } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Lightweight WYSIWYG editor (TipTap) for rich-text note fields (Patient Visit parity V2
 * decision, 2026-07-11: real editor over plain textareas). Value/onChange carry HTML —
 * uncontrolled after mount, so remount (change `key`) to reset content from outside.
 */
export function RichText({
  value,
  onChange,
  className,
}: {
  value: string;
  onChange: (html: string) => void;
  className?: string;
}) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: value,
    immediatelyRender: false,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class: 'prose-sm max-w-none min-h-[100px] px-3 py-2 text-sm outline-none [&_p]:my-1 [&_ul]:my-1 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-1 [&_ol]:list-decimal [&_ol]:pl-5',
      },
    },
  });

  if (!editor) return null;

  return (
    <div className={cn('rounded-sm border border-border bg-surface', className)}>
      <div className="flex items-center gap-1 border-b border-border px-2 py-1">
        <ToolbarButton active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()} icon={Bold} label="Bold" />
        <ToolbarButton active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()} icon={Italic} label="Italic" />
        <ToolbarButton active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()} icon={List} label="Bullet list" />
        <ToolbarButton active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()} icon={ListOrdered} label="Numbered list" />
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}

function ToolbarButton({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        'flex h-7 w-7 items-center justify-center rounded-sm text-fg-muted hover:bg-border/50',
        active && 'bg-primary/10 text-primary',
      )}
    >
      <Icon className="h-3.5 w-3.5" />
    </button>
  );
}
