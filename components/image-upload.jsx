'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, X, Camera } from 'lucide-react';
import { uploadAPI } from '@/lib/api';
import { toast } from 'sonner';

export default function ImageUpload({ value, onChange, label = 'Product Image', token }) {
  const [preview, setPreview] = useState(value || null);
  const [isUploading, setIsUploading] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [objectKey, setObjectKey] = useState(null);
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const uploadFile = async (file) => {
    if (!token) {
      toast.error('Not authenticated');
      return;
    }
    setIsUploading(true);
    try {
      const result = await uploadAPI.uploadImage(file, token);
      const url = result.data?.url;
      const key = result.data?.objectKey;
      setPreview(url);
      setObjectKey(key);
      onChange(url);
    } catch (err) {
      toast.error(err.message || 'Failed to upload image');
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Please select an image file'); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error('Image size must be less than 5MB'); return; }
    await uploadFile(file);
    e.target.value = '';
  };

  const handleRemove = async () => {
    if (objectKey && token) {
      try { await uploadAPI.deleteImage(objectKey, token); } catch (_) { /* best-effort */ }
    }
    setPreview(null);
    setObjectKey(null);
    onChange('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleUrlInput = (e) => {
    const url = e.target.value;
    setPreview(url || null);
    setObjectKey(null);
    onChange(url);
  };

  const handleCameraClick = () => {
    if (showCamera) { stopCamera(); setShowCamera(false); }
    else setShowCamera(true);
  };

  const startCamera = async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        toast.error('Camera not supported in this browser');
        setShowCamera(false);
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => videoRef.current.play().catch(() => {});
      }
    } catch (error) {
      setShowCamera(false);
      if (error.name === 'NotAllowedError') toast.error('Camera permission denied');
      else if (error.name === 'NotFoundError') toast.error('No camera found on this device');
      else toast.error('Unable to access camera');
    }
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  };

  const capturePhoto = async () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    stopCamera();
    setShowCamera(false);
    canvas.toBlob(async (blob) => {
      if (!blob) { toast.error('Failed to capture photo'); return; }
      const file = new File([blob], 'capture.jpg', { type: 'image/jpeg' });
      await uploadFile(file);
    }, 'image/jpeg', 0.85);
  };

  useEffect(() => {
    if (value !== preview) setPreview(value || null);
  }, [value]);

  useEffect(() => {
    if (showCamera && videoRef.current) startCamera();
  }, [showCamera]);

  useEffect(() => () => stopCamera(), []);

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="space-y-4">
        {preview && (
          <div className="relative w-full h-48 border rounded-lg overflow-hidden bg-muted">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="Preview" className="w-full h-full object-contain" />
            <Button
              type="button" variant="destructive" size="icon"
              className="absolute top-2 right-2"
              onClick={handleRemove}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button" variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="w-full"
            >
              <Upload className="h-4 w-4 mr-2" />
              {isUploading ? 'Uploading...' : 'Upload Image'}
            </Button>
            <Button
              type="button" variant="outline"
              onClick={handleCameraClick}
              disabled={isUploading}
              className="w-full"
            >
              <Camera className="h-4 w-4 mr-2" />
              {showCamera ? 'Stop Camera' : 'Capture Image'}
            </Button>
          </div>

          {showCamera && (
            <div className="space-y-2">
              <div className="relative w-full h-48 border rounded-lg overflow-hidden bg-black">
                <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="default" onClick={capturePhoto} className="flex-1">
                  <Camera className="h-4 w-4 mr-2" /> Capture Photo
                </Button>
                <Button type="button" variant="outline" onClick={() => { stopCamera(); setShowCamera(false); }}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {preview && !showCamera && (
            <Button type="button" variant="outline" onClick={handleRemove} className="w-full">
              <X className="h-4 w-4 mr-2" /> Remove Image
            </Button>
          )}

          <Input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
        </div>

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
              <Button type="button" variant="outline" size="icon" onClick={handleRemove}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Supported formats: JPG, PNG, WebP, GIF (Max 5MB) — uploaded to cloud storage
        </p>
      </div>
    </div>
  );
}
