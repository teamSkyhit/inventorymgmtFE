'use client';
import { useRef, useState } from 'react';
import { uploadAPI } from '@/lib/api';
import { Label } from '@/components/ui/label';
import { ImageIcon, Loader2, X, RefreshCw } from 'lucide-react';

/**
 * Props:
 *   value    — current image URL (string or '')
 *   onChange — called with new URL after upload, or '' on remove
 *   label    — optional field label shown above
 *   token    — auth token (user?.token)
 */
export default function ImageUpload({ value, onChange, label, token }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  // track objectKey of image uploaded this session so we can delete it on remove/replace
  const [uploadedKey, setUploadedKey] = useState(null);

  const handleFile = async (file) => {
    if (!file) return;
    setError('');
    setUploading(true);

    // if replacing an existing upload from this session, delete the old one
    if (uploadedKey) {
      try { await uploadAPI.deleteImage(uploadedKey, token); } catch {}
      setUploadedKey(null);
    }

    try {
      const res = await uploadAPI.uploadImage(file, token);
      const { url, objectKey } = res.data;
      setUploadedKey(objectKey);
      onChange(url);
    } catch (e) {
      setError(e.message || 'Upload failed. Max 5MB, JPEG/PNG/WebP/GIF only.');
    } finally {
      setUploading(false);
      // reset input so same file can be re-selected
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleRemove = async () => {
    if (uploadedKey) {
      try { await uploadAPI.deleteImage(uploadedKey, token); } catch {}
      setUploadedKey(null);
    }
    onChange('');
    if (inputRef.current) inputRef.current.value = '';
    setError('');
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div className="space-y-2">
      {label && <Label>{label}</Label>}

      {value ? (
        // Preview state
        <div className="relative w-32 h-32">
          <img
            src={value}
            alt="Uploaded"
            className="w-32 h-32 rounded-lg object-cover border border-border"
          />
          {/* Remove button */}
          <button
            type="button"
            onClick={handleRemove}
            className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-0.5 shadow-sm hover:opacity-90 transition-opacity"
            title="Remove image"
          >
            <X className="h-3.5 w-3.5" />
          </button>
          {/* Change button */}
          <button
            type="button"
            onClick={() => !uploading && inputRef.current?.click()}
            disabled={uploading}
            className="absolute bottom-1.5 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-background/85 backdrop-blur-sm text-foreground text-xs px-2 py-0.5 rounded border border-border shadow-sm hover:bg-background transition-colors disabled:opacity-50"
          >
            {uploading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <RefreshCw className="h-3 w-3" />
            )}
            {uploading ? 'Uploading…' : 'Change'}
          </button>
        </div>
      ) : (
        // Drop zone / empty state
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => !uploading && inputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && !uploading && inputRef.current?.click()}
          className="flex flex-col items-center justify-center w-32 h-32 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/60 hover:bg-muted/30 transition-colors select-none"
        >
          {uploading ? (
            <>
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mb-1" />
              <span className="text-xs text-muted-foreground">Uploading…</span>
            </>
          ) : (
            <>
              <ImageIcon className="h-6 w-6 text-muted-foreground mb-1" />
              <span className="text-xs text-muted-foreground text-center leading-tight px-2">
                Click or drag image
              </span>
              <span className="text-[10px] text-muted-foreground/60 mt-0.5">
                Max 5 MB
              </span>
            </>
          )}
        </div>
      )}

      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
    </div>
  );
}
