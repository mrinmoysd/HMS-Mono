'use client';

import { useRef, useState } from 'react';
import { FileText, Upload, X } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Upload control backed by a base64 data-URL, which is how every attachment in
 * this app is stored (documents, patient photos, email attachments).
 *
 * Consolidates ~6 hand-rolled `<label><input type="file" className="hidden">`
 * blocks, none of which supported drag-and-drop or showed what was attached.
 */
export function FileDrop({
  value,
  onChange,
  accept,
  hint,
  disabled,
  /** Renders an image preview instead of a file chip (patient photos, logos). */
  preview,
  className,
}: {
  value: string;
  onChange: (dataUrl: string, file: File | null) => void;
  accept?: string;
  hint?: React.ReactNode;
  disabled?: boolean;
  preview?: boolean;
  className?: string;
}) {
  const [dragging, setDragging] = useState(false);
  const [name, setName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  function read(file: File | undefined) {
    if (!file) return;
    setName(file.name);
    const reader = new FileReader();
    reader.onload = () => onChange(String(reader.result), file);
    reader.readAsDataURL(file);
  }

  function clear() {
    setName('');
    onChange('', null);
    if (inputRef.current) inputRef.current.value = '';
  }

  if (value) {
    return (
      <div className={cn('flex items-center gap-3 rounded-sm border border-line p-2', className)}>
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element -- data: URL, no loader involved
          <img src={value} alt="" className="h-12 w-12 shrink-0 rounded-sm object-cover" />
        ) : (
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm bg-primary-soft text-primary">
            <FileText className="h-4 w-4" />
          </span>
        )}
        <span className="min-w-0 flex-1 truncate text-sm">{name || 'Attached file'}</span>
        <button
          type="button"
          onClick={clear}
          disabled={disabled}
          aria-label="Remove file"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-sm text-fg-muted transition hover:bg-danger-soft hover:text-danger"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <label
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        if (!disabled) read(e.dataTransfer.files?.[0]);
      }}
      className={cn(
        'flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-sm border border-dashed px-4 py-6 text-center transition',
        dragging ? 'border-primary bg-primary-soft' : 'border-line-strong hover:border-primary',
        disabled && 'cursor-not-allowed opacity-60',
        className,
      )}
    >
      <Upload className={cn('h-5 w-5', dragging ? 'text-primary' : 'text-fg-subtle')} />
      <span className="text-sm text-fg-muted">
        Drop a file here or <span className="font-medium text-primary">browse</span>
      </span>
      {hint && <span className="text-xs text-fg-subtle">{hint}</span>}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        disabled={disabled}
        onChange={(e) => read(e.target.files?.[0])}
        className="hidden"
      />
    </label>
  );
}
