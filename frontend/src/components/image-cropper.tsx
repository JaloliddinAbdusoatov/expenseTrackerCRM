import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';
import Cropper, { Area } from 'react-easy-crop';

interface ImageCropperProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageSrc: string;
  onCrop: (croppedImageBlob: Blob) => void;
  aspectRatio?: number;
}

export function ImageCropper({ 
  open, 
  onOpenChange, 
  imageSrc, 
  onCrop,
  aspectRatio = 1 
}: ImageCropperProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const onCropComplete = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const image = new Image();
      image.addEventListener('load', () => resolve(image));
      image.addEventListener('error', (error) => reject(error));
      image.src = url;
    });

  const getCroppedImg = async (
    imageSrc: string,
    pixelCrop: Area
  ): Promise<Blob> => {
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('No 2d context');
    }

    // Set canvas size to match the cropped area
    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;

    // Draw circular crop
    ctx.save();
    ctx.beginPath();
    ctx.arc(
      pixelCrop.width / 2,
      pixelCrop.height / 2,
      Math.min(pixelCrop.width, pixelCrop.height) / 2,
      0,
      Math.PI * 2
    );
    ctx.clip();

    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      pixelCrop.width,
      pixelCrop.height
    );

    ctx.restore();

    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Canvas is empty'));
        }
      }, 'image/jpeg', 0.95);
    });
  };

  const handleCrop = useCallback(async () => {
    if (!croppedAreaPixels) return;

    try {
      const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels);
      onCrop(croppedImage);
      onOpenChange(false);
      // Reset state
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCroppedAreaPixels(null);
    } catch (error) {
      console.error('Error cropping image:', error);
    }
  }, [croppedAreaPixels, imageSrc, onCrop, onOpenChange]);

  // Reset when dialog closes
  React.useEffect(() => {
    if (!open) {
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCroppedAreaPixels(null);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[95vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader className="px-0">
          <DialogTitle>Обрезка фото</DialogTitle>
          <DialogDescription>
            Переместите и увеличьте фото, чтобы выбрать нужную область. Фото будет круглым.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div
            className="relative w-full bg-muted rounded-lg overflow-hidden"
            style={{ aspectRatio: '1 / 1', minHeight: '400px', maxHeight: 'min(600px, calc(95vh - 180px))' }}
          >
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={aspectRatio}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
              cropShape="round"
              showGrid={false}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Масштаб</label>
            <Slider
              value={[zoom]}
              onValueChange={(value: number[]) => setZoom(value[0])}
              min={1}
              max={3}
              step={0.1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>1x</span>
              <span>3x</span>
            </div>
          </div>
        </div>
        <DialogFooter className="px-0 pb-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1 sm:flex-initial">
            Отмена
          </Button>
          <Button onClick={handleCrop} disabled={!croppedAreaPixels} className="flex-1 sm:flex-initial">
            Применить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
