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

type LogoMode = 'light' | 'dark';

function isValidHex(color: string): boolean {
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(color);
}

export function BrandingStep({ data, onChange }: BrandingStepProps) {
  const lightInputRef = useRef<HTMLInputElement>(null);
  const darkInputRef = useRef<HTMLInputElement>(null);
  const [dragOverMode, setDragOverMode] = useState<LogoMode | null>(null);

  const handleFile = useCallback(
    (file: File, mode: LogoMode) => {
      const allowed = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp'];
      if (!allowed.includes(file.type)) return;
      if (file.size > 2 * 1024 * 1024) return;

      const reader = new FileReader();
      reader.onload = () => {
        if (mode === 'light') {
          onChange({
            brandingLogoPreviewLight: reader.result as string,
            brandingLogoFileLight: file,
          });
        } else {
          onChange({
            brandingLogoPreviewDark: reader.result as string,
            brandingLogoFileDark: file,
          });
        }
      };
      reader.readAsDataURL(file);
    },
    [onChange],
  );

  function renderLogoUploader(mode: LogoMode) {
    const isLight = mode === 'light';
    const preview = isLight
      ? data.brandingLogoPreviewLight
      : data.brandingLogoPreviewDark;
    const inputRef = isLight ? lightInputRef : darkInputRef;
    const isDragOver = dragOverMode === mode;
    const label = isLight ? 'Light Mode Logo' : 'Dark Mode Logo';
    const bgPreviewClass = isLight ? 'bg-white' : 'bg-neutral-900';

    return (
      <div className="space-y-2">
        <Label>{label}</Label>
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOverMode(mode);
          }}
          onDragLeave={() => setDragOverMode(null)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOverMode(null);
            const file = e.dataTransfer.files[0];
            if (file) handleFile(file, mode);
          }}
          onClick={() => inputRef.current?.click()}
          className={`relative flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 transition-colors ${bgPreviewClass} ${
            isDragOver
              ? 'border-brand-green bg-brand-green/5'
              : 'border-muted-foreground/25 hover:border-muted-foreground/50'
          }`}
        >
          {preview ? (
            <div className="relative">
              <img
                src={preview}
                alt={`${label} preview`}
                className="max-h-20 max-w-full object-contain"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/80"
                onClick={(e) => {
                  e.stopPropagation();
                  if (isLight) {
                    onChange({
                      brandingLogoPreviewLight: '',
                      brandingLogoFileLight: undefined,
                    });
                  } else {
                    onChange({
                      brandingLogoPreviewDark: '',
                      brandingLogoFileDark: undefined,
                    });
                  }
                }}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            <>
              <Upload
                className={`h-8 w-8 ${isLight ? 'text-neutral-400' : 'text-neutral-500'}`}
              />
              <p
                className={`mt-2 text-sm ${isLight ? 'text-neutral-600' : 'text-neutral-400'}`}
              >
                Click or drag to upload
              </p>
              <p
                className={`text-xs ${isLight ? 'text-neutral-500' : 'text-neutral-500'}`}
              >
                PNG, JPG, SVG, or WebP. Max 2MB.
              </p>
            </>
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/svg+xml,image/webp"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file, mode);
          }}
        />
      </div>
    );
  }

  const themeModes: Array<{
    value: 'auto' | 'light' | 'dark';
    label: string;
  }> = [
    { value: 'auto', label: 'Auto' },
    { value: 'light', label: 'Light Only' },
    { value: 'dark', label: 'Dark Only' },
  ];

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

      {/* Theme Mode Selector */}
      <div className="space-y-2">
        <Label>Theme Mode</Label>
        <div className="grid grid-cols-3 gap-2">
          {themeModes.map((mode) => {
            const active = data.brandingThemeMode === mode.value;
            return (
              <button
                key={mode.value}
                type="button"
                onClick={() => onChange({ brandingThemeMode: mode.value })}
                className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? 'border-brand-green bg-brand-green/10 text-foreground'
                    : 'border-muted-foreground/25 hover:border-muted-foreground/50'
                }`}
              >
                {mode.label}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground">
          Auto allows users to toggle between light and dark mode. Light Only or Dark Only
          locks the app to that mode.
        </p>
      </div>

      {/* Logo Uploads */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {renderLogoUploader('light')}
        {renderLogoUploader('dark')}
      </div>
    </div>
  );
}
