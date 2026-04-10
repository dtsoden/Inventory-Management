'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Camera, X, Keyboard } from 'lucide-react';

interface Props {
  onScan: (value: string) => void;
  onClose: () => void;
}

export function BarcodeScanner({ onScan, onClose }: Props) {
  const [mode, setMode] = useState<'camera' | 'manual'>('camera');
  const [manualValue, setManualValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const scannerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const mountedRef = useRef(true);

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        const state = scannerRef.current.getState();
        // State 2 = SCANNING, State 3 = PAUSED
        if (state === 2 || state === 3) {
          await scannerRef.current.stop();
        }
      } catch {
        // Ignore stop errors during cleanup
      }
      try {
        await scannerRef.current.clear();
      } catch {
        // Ignore clear errors
      }
      scannerRef.current = null;
    }
  }, []);

  const startScanner = useCallback(async () => {
    if (!containerRef.current || scannerRef.current) return;

    try {
      // Dynamically import html5-qrcode (it requires window/document)
      const { Html5Qrcode } = await import('html5-qrcode');

      const scannerId = 'barcode-scanner-viewfinder';
      // Ensure the container element exists
      if (!document.getElementById(scannerId)) return;

      const scanner = new Html5Qrcode(scannerId);
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 280, height: 150 },
          aspectRatio: 1.5,
        },
        (decodedText: string) => {
          if (mountedRef.current) {
            onScan(decodedText);
          }
        },
        () => {
          // Ignore scan failures (no code found in frame)
        }
      );

      if (mountedRef.current) {
        setScanning(true);
      }
    } catch (err: any) {
      if (!mountedRef.current) return;

      const message =
        err?.message || err?.toString() || 'Camera access failed';
      if (
        message.includes('NotAllowedError') ||
        message.includes('Permission') ||
        message.includes('denied')
      ) {
        setError('Camera permission denied. Use manual input instead.');
        setMode('manual');
      } else if (
        message.includes('NotFoundError') ||
        message.includes('no camera')
      ) {
        setError('No camera found on this device. Use manual input instead.');
        setMode('manual');
      } else {
        setError(`Camera error: ${message}`);
        setMode('manual');
      }
    }
  }, [onScan]);

  useEffect(() => {
    mountedRef.current = true;

    if (mode === 'camera') {
      // Small delay to let the container render
      const timer = setTimeout(() => {
        startScanner();
      }, 100);
      return () => {
        clearTimeout(timer);
        mountedRef.current = false;
        stopScanner();
      };
    }

    return () => {
      mountedRef.current = false;
      stopScanner();
    };
  }, [mode, startScanner, stopScanner]);

  const handleManualSubmit = () => {
    const trimmed = manualValue.trim();
    if (trimmed) {
      onScan(trimmed);
      setManualValue('');
    }
  };

  return (
    <div className="rounded-xl border bg-card p-4">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {mode === 'camera' ? (
            <Camera className="size-5 text-primary" />
          ) : (
            <Keyboard className="size-5 text-primary" />
          )}
          <span className="font-medium">
            {mode === 'camera' ? 'Scan Barcode' : 'Manual Entry'}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setError(null);
              setMode(mode === 'camera' ? 'manual' : 'camera');
            }}
          >
            {mode === 'camera' ? (
              <>
                <Keyboard className="mr-1 size-4" />
                Type
              </>
            ) : (
              <>
                <Camera className="mr-1 size-4" />
                Scan
              </>
            )}
          </Button>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="size-4" />
          </Button>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-3 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Camera viewfinder */}
      {mode === 'camera' && (
        <div ref={containerRef} className="overflow-hidden rounded-lg">
          <div
            id="barcode-scanner-viewfinder"
            className="w-full"
            style={{ minHeight: 250 }}
          />
          {!scanning && !error && (
            <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
              Starting camera...
            </div>
          )}
        </div>
      )}

      {/* Manual input */}
      {mode === 'manual' && (
        <div className="flex gap-2">
          <Input
            placeholder="Type or paste barcode value..."
            value={manualValue}
            onChange={(e) => setManualValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleManualSubmit();
            }}
            autoFocus
            className="h-12 flex-1 text-lg"
          />
          <Button
            onClick={handleManualSubmit}
            disabled={!manualValue.trim()}
            className="h-12"
          >
            Submit
          </Button>
        </div>
      )}
    </div>
  );
}
