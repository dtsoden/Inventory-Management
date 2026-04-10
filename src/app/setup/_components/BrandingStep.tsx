'use client';

import { useCallback, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { SetupData } from './SetupWizard';

interface BrandingStepProps {
  data: SetupData;
  onChange: (updates: Partial<SetupData>) => void;
}

function isValidHex(color: string): boolean {
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(color);
}

export function BrandingStep({ data, onChange }: BrandingStepProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = useCallback(
    (file: File) => {
      const allowed = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp'];
      if (!allowed.includes(file.type)) return;
      if (file.size > 2 * 1024 * 1024) return;

      const reader = new FileReader();
      reader.onload = () => {
        onChange({
          brandingLogoPreview: reader.result as string,
          brandingLogoFile: file,
        });
      };
      reader.readAsDataURL(file);
    },
    [onChange],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  return (
    <div className="space-y-6">
      <p className="text-muted-foreground text-sm">
        Customize the look and feel of your platform. All settings can be changed later.
      </p>

      {/* App Name */}
      <div className="space-y-2">
        <Label htmlFor="brandingAppName">Application Name</Label>
        <Input
          id="brandingAppName"
          placeholder="Inventory Management Platform"
          value={data.brandingAppName}
          onChange={(e) => onChange({ brandingAppName: e.target.value })}
        />
        <p className="text-xs text-muted-foreground">
          Displayed in the sidebar, browser tab, and throughout the app.
        </p>
      </div>

      {/* Primary Color Light */}
      <div className="space-y-2">
        <Label htmlFor="brandingColorLight">Primary Color (Light Mode)</Label>
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={isValidHex(data.brandingPrimaryColorLight) ? data.brandingPrimaryColorLight : '#7ed321'}
            onChange={(e) => onChange({ brandingPrimaryColorLight: e.target.value })}
            className="h-10 w-12 cursor-pointer rounded border p-0.5"
          />
          <Input
            id="brandingColorLight"
            placeholder="#7ed321"
            value={data.brandingPrimaryColorLight}
            onChange={(e) => onChange({ brandingPrimaryColorLight: e.target.value })}
            className="flex-1"
          />
          {data.brandingPrimaryColorLight && isValidHex(data.brandingPrimaryColorLight) && (
            <div
              className="h-10 w-10 shrink-0 rounded-lg border"
              style={{ backgroundColor: data.brandingPrimaryColorLight }}
            />
          )}
        </div>
        {data.brandingPrimaryColorLight && !isValidHex(data.brandingPrimaryColorLight) && (
          <p className="text-xs text-destructive">
            Enter a valid hex color (e.g. #7ed321)
          </p>
        )}
      </div>

      {/* Primary Color Dark */}
      <div className="space-y-2">
        <Label htmlFor="brandingColorDark">Primary Color (Dark Mode)</Label>
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={isValidHex(data.brandingPrimaryColorDark) ? data.brandingPrimaryColorDark : '#7ed321'}
            onChange={(e) => onChange({ brandingPrimaryColorDark: e.target.value })}
            className="h-10 w-12 cursor-pointer rounded border p-0.5"
          />
          <Input
            id="brandingColorDark"
            placeholder="#7ed321"
            value={data.brandingPrimaryColorDark}
            onChange={(e) => onChange({ brandingPrimaryColorDark: e.target.value })}
            className="flex-1"
          />
          {data.brandingPrimaryColorDark && isValidHex(data.brandingPrimaryColorDark) && (
            <div
              className="h-10 w-10 shrink-0 rounded-lg border"
              style={{ backgroundColor: data.brandingPrimaryColorDark }}
            />
          )}
        </div>
        {data.brandingPrimaryColorDark && !isValidHex(data.brandingPrimaryColorDark) && (
          <p className="text-xs text-destructive">
            Enter a valid hex color (e.g. #7ed321)
          </p>
        )}
      </div>

      {/* Logo Upload */}
      <div className="space-y-2">
        <Label>Logo (Optional)</Label>
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`relative flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 transition-colors ${
            dragOver
              ? 'border-brand-green bg-brand-green/5'
              : 'border-muted-foreground/25 hover:border-muted-foreground/50'
          }`}
        >
          {data.brandingLogoPreview ? (
            <div className="relative">
              <img
                src={data.brandingLogoPreview}
                alt="Logo preview"
                className="max-h-20 max-w-full object-contain"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/80"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange({
                    brandingLogoPreview: '',
                    brandingLogoFile: undefined,
                  });
                }}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            <>
              <Upload className="h-8 w-8 text-muted-foreground/50" />
              <p className="mt-2 text-sm text-muted-foreground">
                Click or drag to upload a logo
              </p>
              <p className="text-xs text-muted-foreground">
                PNG, JPG, SVG, or WebP. Max 2MB.
              </p>
            </>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/svg+xml,image/webp"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />
      </div>
    </div>
  );
}
