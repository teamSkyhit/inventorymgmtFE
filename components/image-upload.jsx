'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import Image from 'next/image';

export default function ImageUpload({ value, onChange, label = 'Product Image' }) {
  const [preview, setPreview] = useState(value || null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image size must be less than 5MB');
      return;
    }

    setIsUploading(true);

    try {
      // For now, convert to base64 data URL
      // In production, you would upload to a cloud service (S3, Cloudinary, etc.)
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result;
        setPreview(base64String);
        onChange(base64String);
        setIsUploading(false);
      };
      reader.onerror = () => {
        alert('Failed to read image file');
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error processing image:', error);
      alert('Failed to process image');
      setIsUploading(false);
    }
  };

  const handleRemove = () => {
    setPreview(null);
    onChange('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUrlInput = (e) => {
    const url = e.target.value;
    if (url) {
      setPreview(url);
      onChange(url);
    }
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="space-y-4">
        {/* Image Preview */}
        {preview && (
          <div className="relative w-full h-48 border rounded-lg overflow-hidden bg-muted">
            <Image
              src={preview}
              alt="Preview"
              fill
              className="object-contain"
              unoptimized
            />
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute top-2 right-2"
              onClick={handleRemove}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Upload Options */}
        <div className="space-y-2">
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="flex-1"
            >
              <Upload className="h-4 w-4 mr-2" />
              {isUploading ? 'Uploading...' : 'Upload Image'}
            </Button>
            {preview && (
              <Button
                type="button"
                variant="outline"
                onClick={handleRemove}
              >
                <X className="h-4 w-4 mr-2" />
                Remove
              </Button>
            )}
          </div>
          <Input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>

        {/* Or Enter URL */}
        <div className="space-y-2">
          <Label className="text-sm text-muted-foreground">Or enter image URL</Label>
          <div className="flex gap-2">
            <Input
              type="url"
              placeholder="https://example.com/image.jpg"
              value={preview && preview.startsWith('http') ? preview : ''}
              onChange={handleUrlInput}
              className="flex-1"
            />
            {preview && preview.startsWith('http') && (
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleRemove}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Supported formats: JPG, PNG, GIF, WebP (Max 5MB)
        </p>
      </div>
    </div>
  );
}

