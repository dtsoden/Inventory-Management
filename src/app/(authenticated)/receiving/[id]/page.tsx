'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Camera,
  Upload,
  Scan,
  Check,
  Package,
  Truck,
  ChevronLeft,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { BarcodeScanner } from '@/components/shared/BarcodeScanner';
import { apiFetch } from '@/lib/client/BaseApiClient';

// ------------------------------------------------------------------
// Types
// ------------------------------------------------------------------

interface ExtractedLineItem {
  name: string;
  quantity: number;
  serialNumbers: string[];
}

interface PackingSlipExtraction {
  orderNumber: string | null;
  vendorName: string | null;
  lineItems: ExtractedLineItem[];
}

interface ReceivingSession {
  id: string;
  purchaseOrderId: string | null;
  status: string;
  aiExtractionData: PackingSlipExtraction | null;
  createdAt: string;
  completedAt: string | null;
}

interface TaggedAsset {
  itemName: string;
  assetTag: string;
  serialNumber?: string;
}

// ------------------------------------------------------------------
// Steps
// ------------------------------------------------------------------

const STEPS = [
  { label: 'Capture', icon: Camera },
  { label: 'Review', icon: Package },
  { label: 'Tag', icon: Scan },
  { label: 'Complete', icon: Check },
];

// ------------------------------------------------------------------
// Progress Stepper Component
// ------------------------------------------------------------------

function ProgressStepper({
  currentStep,
  steps,
}: {
  currentStep: number;
  steps: { label: string; icon: React.ElementType }[];
}) {
  return (
    <div className="flex items-center justify-between px-2">
      {steps.map((step, index) => {
        const Icon = step.icon;
        const isActive = index === currentStep;
        const isCompleted = index < currentStep;

        return (
          <div key={step.label} className="flex flex-1 items-center">
            <div className="flex flex-col items-center gap-1">
              <div
                className={`flex size-10 items-center justify-center rounded-full transition-colors ${
                  isCompleted
                    ? 'bg-emerald-500 text-white'
                    : isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                }`}
              >
                {isCompleted ? (
                  <Check className="size-5" />
                ) : (
                  <Icon className="size-5" />
                )}
              </div>
              <span
                className={`text-xs font-medium ${
                  isActive
                    ? 'text-primary'
                    : isCompleted
                      ? 'text-emerald-600'
                      : 'text-muted-foreground'
                }`}
              >
                {step.label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div
                className={`mx-2 h-0.5 flex-1 ${
                  isCompleted ? 'bg-emerald-500' : 'bg-muted'
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ------------------------------------------------------------------
// Main Page Component
// ------------------------------------------------------------------

export default function ReceivingFlowPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.id as string;

  const [session, setSession] = useState<ReceivingSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);

  // Step 1: Capture state
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
  const tagInputRef = useRef<HTMLInputElement>(null);

  // Step 2: Extraction state
  const [extraction, setExtraction] = useState<PackingSlipExtraction | null>(
    null
  );

  // Step 3: Tagging state
  const [taggedAssets, setTaggedAssets] = useState<TaggedAsset[]>([]);
  const [activeTagItem, setActiveTagItem] = useState<number | null>(null);
  const [assetTagInput, setAssetTagInput] = useState('');
  const [serialInput, setSerialInput] = useState('');
  const [tagging, setTagging] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [autoScan, setAutoScan] = useState(false);

  // Step 4: Complete state
  const [completing, setCompleting] = useState(false);
  const [completed, setCompleted] = useState(false);

  // Fetch session data
  const fetchSession = useCallback(async () => {
    try {
      const res = await apiFetch(`/api/receiving/${sessionId}`);
      const json = await res.json();
      if (json.success) {
        setSession(json.data);
        // If session already has extraction data, skip to tagging
        if (json.data.aiExtractionData) {
          setExtraction(json.data.aiExtractionData);
          setCurrentStep(2);
        }
        if (json.data.status === 'COMPLETED') {
          setCompleted(true);
          setCurrentStep(3);
        }
      }
    } catch {
      console.error('Failed to fetch session');
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  // ------------------------------------------------------------------
  // Step 1: Image Capture
  // ------------------------------------------------------------------

  const handleCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      setCapturedImage(base64);
      setUploadedFile(null);
    };
    reader.readAsDataURL(file);
  };

  const handleFileUpload = (file: File) => {
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        setCapturedImage(base64);
        setUploadedFile(null);
      };
      reader.readAsDataURL(file);
    } else {
      setUploadedFile(file);
      setCapturedImage(null);
    }
  };

  const handleDocInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  };

  const handleProcess = async () => {
    if (!capturedImage && !uploadedFile) return;
    setProcessing(true);

    try {
      let res: Response;

      if (uploadedFile) {
        const formData = new FormData();
        formData.append('file', uploadedFile);
        res = await apiFetch(`/api/receiving/${sessionId}/extract`, {
          method: 'POST',
          body: formData,
        });
      } else {
        res = await apiFetch(`/api/receiving/${sessionId}/extract`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64: capturedImage }),
        });
      }

      const json = await res.json();
      if (json.success) {
        setExtraction(json.data);
        setCurrentStep(1);
      } else {
        alert(json.error ?? 'Failed to process packing slip');
      }
    } catch {
      alert('Failed to process packing slip. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  // ------------------------------------------------------------------
  // Step 2: Confirm extraction
  // ------------------------------------------------------------------

  const handleConfirmExtraction = () => {
    setCurrentStep(2);
    // Auto-open the first untagged item
    if (extraction) {
      const firstUntagged = extraction.lineItems.findIndex(
        (item) => getTagCountForItem(item.name) < item.quantity,
      );
      if (firstUntagged >= 0) setActiveTagItem(firstUntagged);
    }
  };

  // ------------------------------------------------------------------
  // Step 3: Asset tagging
  // ------------------------------------------------------------------

  const handleTagAsset = async (itemIndex: number) => {
    const trimmed = assetTagInput.trim();
    if (!trimmed || !extraction) return;
    if (taggedAssets.some((a) => a.assetTag === trimmed)) {
      alert(`Duplicate: ${trimmed} has already been scanned.`);
      return;
    }

    const item = extraction.lineItems[itemIndex];
    setTagging(true);

    try {
      // Send the extracted item name so the server can resolve it to a real catalog item
      const res = await apiFetch(`/api/receiving/${sessionId}/tag`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemName: item.name,
          assetTag: assetTagInput.trim(),
          serialNumber: serialInput.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (json.success) {
        const newTag = {
          itemName: item.name,
          assetTag: assetTagInput.trim(),
          serialNumber: serialInput.trim() || undefined,
        };
        const updatedTags = [...taggedAssets, newTag];
        setTaggedAssets(updatedTags);
        setAssetTagInput('');
        setSerialInput('');

        // Auto-advance: check if this item is now complete, find next untagged
        const newCountForItem = updatedTags.filter((a) => a.itemName === item.name).length;
        if (newCountForItem >= item.quantity && extraction) {
          const nextUntagged = extraction.lineItems.findIndex((li, idx) => {
            if (idx === itemIndex) return false;
            const count = updatedTags.filter((a) => a.itemName === li.name).length;
            return count < li.quantity;
          });
          setActiveTagItem(nextUntagged >= 0 ? nextUntagged : null);
        }
      } else {
        alert(json.error ?? 'Failed to tag asset');
      }
    } catch {
      alert('Failed to tag asset');
    } finally {
      setTagging(false);
    }
  };

  // Auto-focus the tag input when active item changes
  useEffect(() => {
    if (activeTagItem !== null) {
      setTimeout(() => tagInputRef.current?.focus(), 50);
    }
  }, [activeTagItem]);

  // ------------------------------------------------------------------
  // Step 4: Complete
  // ------------------------------------------------------------------

  const handleComplete = async () => {
    setCompleting(true);
    try {
      const res = await apiFetch(`/api/receiving/${sessionId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const json = await res.json();
      if (json.success) {
        setCompleted(true);
        setCurrentStep(3);
      } else {
        alert(json.error ?? 'Failed to complete session');
      }
    } catch {
      alert('Failed to complete session');
    } finally {
      setCompleting(false);
    }
  };

  // ------------------------------------------------------------------
  // Computed values
  // ------------------------------------------------------------------

  const totalExpectedItems = extraction
    ? extraction.lineItems.reduce((sum, item) => sum + item.quantity, 0)
    : 0;

  const totalTagged = taggedAssets.length;

  const getTagCountForItem = (itemName: string) =>
    taggedAssets.filter((a) => a.itemName === itemName).length;

  // ------------------------------------------------------------------
  // Loading state
  // ------------------------------------------------------------------

  if (loading) {
    return (
      <div className="mx-auto max-w-lg px-4 py-6">
        <Skeleton className="mb-4 h-8 w-48" />
        <Skeleton className="mb-6 h-16 w-full" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="mx-auto max-w-lg px-4 py-6 text-center">
        <p className="text-muted-foreground">Session not found</p>
        <Button
          variant="outline"
          onClick={() => router.push('/receiving')}
          className="mt-4"
        >
          Back to Receiving
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push('/receiving')}
        >
          <ChevronLeft className="size-5" />
        </Button>
        <div>
          <h1 className="text-xl font-bold">Receiving</h1>
          <p className="text-xs text-muted-foreground">
            Session {sessionId.substring(0, 8)}...
          </p>
        </div>
      </div>

      {/* Progress Stepper */}
      <div className="mb-8">
        <ProgressStepper currentStep={currentStep} steps={STEPS} />
      </div>

      {/* Step Content */}

      {/* ============================================================ */}
      {/* STEP 0: Capture Packing Slip */}
      {/* ============================================================ */}
      {currentStep === 0 && (
        <div className="space-y-6">
          <div className="text-center">
            <h2 className="text-lg font-semibold">Capture Packing Slip</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Photograph the packing slip or upload a file (image, PDF, DOCX, CSV, Excel)
            </p>
          </div>

          {/* Hidden file inputs */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleCapture}
            className="hidden"
          />
          <input
            ref={docInputRef}
            type="file"
            accept="image/*,.pdf,.docx,.doc,.csv,.xlsx,.xls"
            onChange={handleDocInput}
            className="hidden"
          />

          {!capturedImage && !uploadedFile ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* Camera capture */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-primary/30 bg-primary/5 py-12 transition-colors hover:border-primary/50 hover:bg-primary/10 active:bg-primary/15"
              >
                <div className="flex size-16 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Camera className="size-8" />
                </div>
                <p className="mt-3 text-base font-semibold text-primary">
                  Capture with Camera
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Take a photo of the packing slip
                </p>
              </button>

              {/* File upload with drag-and-drop */}
              <button
                onClick={() => docInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed py-12 transition-colors ${
                  dragOver
                    ? 'border-primary bg-primary/10'
                    : 'border-muted-foreground/30 bg-muted/30 hover:border-muted-foreground/50 hover:bg-muted/50'
                } active:bg-muted/60`}
              >
                <div className="flex size-16 items-center justify-center rounded-full bg-muted-foreground/10 text-muted-foreground">
                  <Upload className="size-8" />
                </div>
                <p className="mt-3 text-base font-semibold text-foreground">
                  Upload File
                </p>
                <p className="mt-1 text-xs text-muted-foreground text-center px-4">
                  Drag and drop or tap to browse
                </p>
                <p className="mt-0.5 text-[10px] text-muted-foreground">
                  PDF, DOCX, CSV, Excel, or image
                </p>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Preview */}
              {capturedImage && (
                <div className="overflow-hidden rounded-xl border">
                  <img
                    src={`data:image/jpeg;base64,${capturedImage}`}
                    alt="Captured packing slip"
                    className="w-full"
                  />
                </div>
              )}
              {uploadedFile && (
                <div className="flex items-center gap-3 rounded-xl border p-4">
                  <Upload className="size-8 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{uploadedFile.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(uploadedFile.size / 1024).toFixed(0)} KB
                    </p>
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setCapturedImage(null);
                    setUploadedFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                    if (docInputRef.current) docInputRef.current.value = '';
                  }}
                  className="flex-1"
                >
                  {capturedImage ? 'Retake' : 'Remove'}
                </Button>
                <Button
                  onClick={handleProcess}
                  disabled={processing}
                  className="flex-1"
                >
                  {processing ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    'Process'
                  )}
                </Button>
              </div>

              {processing && (
                <div className="rounded-xl border bg-muted/50 p-4 text-center">
                  <Loader2 className="mx-auto size-8 animate-spin text-primary" />
                  <p className="mt-3 font-medium">
                    Analyzing packing slip...
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    AI is extracting line items and details
                  </p>
                  <div className="mt-4 space-y-2">
                    <Skeleton className="h-4 w-3/4 mx-auto" />
                    <Skeleton className="h-4 w-1/2 mx-auto" />
                    <Skeleton className="h-4 w-2/3 mx-auto" />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* STEP 1: AI Extraction Results (editable) */}
      {/* ============================================================ */}
      {currentStep === 1 && extraction && (
        <div className="space-y-6">
          <div className="text-center">
            <h2 className="text-lg font-semibold">Review Extracted Data</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Edit any fields the AI got wrong before continuing
            </p>
          </div>

          {/* Order Info (editable) */}
          <div className="rounded-xl border bg-card p-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium uppercase text-muted-foreground">
                  Order Number
                </label>
                <Input
                  value={extraction.orderNumber ?? ''}
                  onChange={(e) => setExtraction({
                    ...extraction,
                    orderNumber: e.target.value || null,
                  })}
                  placeholder="Enter order number..."
                  className="h-10"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium uppercase text-muted-foreground">
                  Vendor
                </label>
                <Input
                  value={extraction.vendorName ?? ''}
                  onChange={(e) => setExtraction({
                    ...extraction,
                    vendorName: e.target.value || null,
                  })}
                  placeholder="Enter vendor name..."
                  className="h-10"
                />
              </div>
            </div>
          </div>

          {/* Line Items (editable) */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase text-muted-foreground">
                Line Items ({extraction.lineItems.length})
              </h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setExtraction({
                  ...extraction,
                  lineItems: [...extraction.lineItems, { name: '', quantity: 1, serialNumbers: [] }],
                })}
              >
                + Add Item
              </Button>
            </div>
            <div className="space-y-3">
              {extraction.lineItems.map((item, index) => (
                <div key={index} className="rounded-xl border bg-card p-4">
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1 space-y-2">
                      <Input
                        value={item.name}
                        onChange={(e) => {
                          const updated = [...extraction.lineItems];
                          updated[index] = { ...updated[index], name: e.target.value };
                          setExtraction({ ...extraction, lineItems: updated });
                        }}
                        placeholder="Item name..."
                        className="h-9 text-sm font-medium"
                      />
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-muted-foreground">Qty:</label>
                        <Input
                          type="number"
                          min={1}
                          value={item.quantity}
                          onChange={(e) => {
                            const updated = [...extraction.lineItems];
                            updated[index] = { ...updated[index], quantity: Math.max(1, parseInt(e.target.value) || 1) };
                            setExtraction({ ...extraction, lineItems: updated });
                          }}
                          className="h-8 w-20 text-sm"
                        />
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const updated = extraction.lineItems.filter((_, i) => i !== index);
                        setExtraction({ ...extraction, lineItems: updated });
                      }}
                      className="shrink-0 text-destructive hover:text-destructive"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </Button>
                  </div>
                  <div className="mt-2">
                    <div className="mb-1 flex items-center justify-between">
                      <p className="text-xs font-medium text-muted-foreground">
                        Serial Numbers ({item.serialNumbers.length})
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          const updated = [...extraction.lineItems];
                          updated[index] = {
                            ...updated[index],
                            serialNumbers: [...updated[index].serialNumbers, ''],
                          };
                          setExtraction({ ...extraction, lineItems: updated });
                        }}
                        className="text-xs font-medium text-primary hover:underline"
                      >
                        + Add
                      </button>
                    </div>
                    {item.serialNumbers.length > 0 && (
                      <div className="space-y-1">
                        {item.serialNumbers.map((sn, snIdx) => (
                          <div key={snIdx} className="flex items-center gap-1">
                            <Input
                              value={sn}
                              onChange={(e) => {
                                const updated = [...extraction.lineItems];
                                const sns = [...updated[index].serialNumbers];
                                sns[snIdx] = e.target.value;
                                updated[index] = { ...updated[index], serialNumbers: sns };
                                setExtraction({ ...extraction, lineItems: updated });
                              }}
                              placeholder="Serial number..."
                              className="h-7 font-mono text-xs"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const updated = [...extraction.lineItems];
                                const sns = updated[index].serialNumbers.filter((_, i) => i !== snIdx);
                                updated[index] = { ...updated[index], serialNumbers: sns };
                                setExtraction({ ...extraction, lineItems: updated });
                              }}
                              className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-destructive"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setCurrentStep(0);
                setCapturedImage(null);
                setUploadedFile(null);
                setExtraction(null);
              }}
              className="flex-1"
            >
              Re-scan
            </Button>
            <Button
              onClick={handleConfirmExtraction}
              disabled={extraction.lineItems.length === 0 || extraction.lineItems.some((li) => !li.name.trim())}
              className="h-14 flex-1 text-lg font-semibold"
            >
              <Check className="mr-2 size-5" />
              Confirm &amp; Continue
            </Button>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* STEP 2: Asset Tagging */}
      {/* ============================================================ */}
      {currentStep === 2 && extraction && (
        <div className="space-y-6">
          <div className="text-center">
            <h2 className="text-lg font-semibold">Tag Assets</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Scan or enter asset tags for each item
            </p>
          </div>

          {/* ---- MOBILE: persistent camera with status overlay ---- */}
          {activeTagItem !== null && (() => {
            const activeItem = extraction.lineItems[activeTagItem];
            const activeTagged = getTagCountForItem(activeItem.name);
            return (
              <div className="md:hidden space-y-3">
                {/* Status bar: what am I scanning and how many */}
                <div className="rounded-xl border bg-card p-3">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{activeItem.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Scanning {activeTagged + 1} of {activeItem.quantity}
                      </p>
                    </div>
                    <Badge variant="secondary" className="shrink-0">
                      {totalTagged} / {totalExpectedItems} total
                    </Badge>
                  </div>
                  <Progress
                    value={totalExpectedItems > 0 ? (totalTagged / totalExpectedItems) * 100 : 0}
                    className="mt-2 h-1.5"
                  />
                </div>

                {/* Camera always open */}
                <BarcodeScanner
                  onScan={async (value) => {
                    const trimmed = value.trim();
                    if (!trimmed || tagging) return;
                    if (taggedAssets.some((a) => a.assetTag === trimmed)) {
                      alert(`Duplicate: ${trimmed} has already been scanned.`);
                      return;
                    }
                    setTagging(true);
                    try {
                      const res = await apiFetch(`/api/receiving/${sessionId}/tag`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          itemName: activeItem.name,
                          assetTag: trimmed,
                        }),
                      });
                      const json = await res.json();
                      if (json.success) {
                        const newTag = { itemName: activeItem.name, assetTag: trimmed };
                        const updatedTags = [...taggedAssets, newTag];
                        setTaggedAssets(updatedTags);
                        const newCount = updatedTags.filter((a) => a.itemName === activeItem.name).length;
                        if (newCount >= activeItem.quantity) {
                          const nextUntagged = extraction.lineItems.findIndex((li, idx) => {
                            if (idx === activeTagItem) return false;
                            return updatedTags.filter((a) => a.itemName === li.name).length < li.quantity;
                          });
                          setActiveTagItem(nextUntagged >= 0 ? nextUntagged : null);
                        }
                      }
                    } catch { /* ignore */ }
                    finally { setTagging(false); }
                  }}
                  onClose={() => setActiveTagItem(null)}
                />

                {/* Tagged items with delete capability */}
                {taggedAssets.length > 0 && (
                  <div className="max-h-32 overflow-y-auto rounded-lg border bg-card p-2 space-y-1">
                    {[...taggedAssets].reverse().map((asset, i) => (
                      <div key={i} className="flex items-center gap-2 rounded-md bg-emerald-50 px-2 py-1 text-xs dark:bg-emerald-950/40">
                        <CheckCircle2 className="size-3 shrink-0 text-emerald-500" />
                        <span className="truncate font-mono">{asset.assetTag}</span>
                        <span className="shrink-0 text-muted-foreground">{asset.itemName}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setTaggedAssets((prev) => prev.filter(
                              (a) => !(a.itemName === asset.itemName && a.assetTag === asset.assetTag),
                            ));
                          }}
                          className="ml-auto shrink-0 rounded p-0.5 text-muted-foreground hover:text-destructive"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}

          {/* ---- DESKTOP: item list with inline inputs ---- */}

          {/* Overall Progress - desktop */}
          <div className="hidden rounded-xl border bg-card p-4 md:block">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-semibold">
                {totalTagged} / {totalExpectedItems} tagged
              </span>
            </div>
            <Progress
              value={
                totalExpectedItems > 0
                  ? (totalTagged / totalExpectedItems) * 100
                  : 0
              }
            />
          </div>

          {/* Items to tag - desktop */}
          <div className="hidden space-y-3 md:block">
            {extraction.lineItems.map((item, index) => {
              const tagged = getTagCountForItem(item.name);
              const isComplete = tagged >= item.quantity;
              const isActive = activeTagItem === index;

              return (
                <div
                  key={index}
                  className={`rounded-xl border bg-card p-4 transition-colors ${
                    isComplete
                      ? 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/30'
                      : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {isComplete ? (
                        <CheckCircle2 className="size-6 text-emerald-500" />
                      ) : (
                        <Package className="size-6 text-muted-foreground" />
                      )}
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {tagged} of {item.quantity} tagged
                        </p>
                      </div>
                    </div>

                    {!isComplete && !isActive && (
                      <Button
                        size="sm"
                        onClick={() => setActiveTagItem(index)}
                      >
                        <Scan className="mr-1 size-4" />
                        Scan
                      </Button>
                    )}
                  </div>

                  {/* Tag input form - desktop only */}
                  {isActive && !isComplete && (
                    <div className="mt-4 space-y-3 border-t pt-4">
                      <div>
                        <label className="mb-1 block text-sm font-medium">
                          Asset Tag *
                        </label>
                        <Input
                          ref={tagInputRef}
                          placeholder="Scan or type asset tag..."
                          value={assetTagInput}
                          onChange={(e) => setAssetTagInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleTagAsset(index);
                          }}
                          autoFocus
                          className="h-12 text-lg"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium">
                          Serial Number
                        </label>
                        <Input
                          placeholder="Optional serial number..."
                          value={serialInput}
                          onChange={(e) => setSerialInput(e.target.value)}
                          className="h-12 text-lg"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setActiveTagItem(null);
                            setAssetTagInput('');
                            setSerialInput('');
                          }}
                          className="flex-1"
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={() => handleTagAsset(index)}
                          disabled={!assetTagInput.trim() || tagging}
                          className="flex-1"
                        >
                          {tagging ? (
                            <Loader2 className="mr-2 size-4 animate-spin" />
                          ) : (
                            <Check className="mr-2 size-4" />
                          )}
                          Tag Asset
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Show tagged assets for this item */}
                  {tagged > 0 && (
                    <div className="mt-3 space-y-1">
                      {taggedAssets
                        .filter((a) => a.itemName === item.name)
                        .map((asset, aIdx) => (
                          <div
                            key={aIdx}
                            className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-1.5 text-sm dark:bg-emerald-950/40"
                          >
                            <CheckCircle2 className="size-4 text-emerald-500" />
                            <span className="flex-1 font-mono">{asset.assetTag}</span>
                            {asset.serialNumber && (
                              <span className="text-muted-foreground">
                                (SN: {asset.serialNumber})
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                setTaggedAssets((prev) => {
                                  const filtered = prev.filter(
                                    (a) => !(a.itemName === asset.itemName && a.assetTag === asset.assetTag),
                                  );
                                  return filtered;
                                });
                                if (!isActive) setActiveTagItem(index);
                              }}
                              className="ml-1 rounded p-0.5 text-muted-foreground hover:text-destructive"
                              title="Remove tag"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                            </button>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Mobile: summary + edit when camera is closed */}
          {activeTagItem === null && taggedAssets.length > 0 && (
            <div className="space-y-3 md:hidden">
              <div className="rounded-xl border bg-card p-3">
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-semibold">{totalTagged} / {totalExpectedItems} tagged</span>
                </div>
                <Progress value={totalExpectedItems > 0 ? (totalTagged / totalExpectedItems) * 100 : 0} className="h-1.5" />
              </div>
              <div className="max-h-48 overflow-y-auto rounded-lg border bg-card p-2 space-y-1">
                {taggedAssets.map((asset, i) => (
                  <div key={i} className="flex items-center gap-2 rounded-md bg-emerald-50 px-2 py-1.5 text-xs dark:bg-emerald-950/40">
                    <CheckCircle2 className="size-3 shrink-0 text-emerald-500" />
                    <span className="truncate font-mono flex-1">{asset.assetTag}</span>
                    <span className="shrink-0 text-muted-foreground">{asset.itemName}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setTaggedAssets((prev) => prev.filter(
                          (a) => !(a.itemName === asset.itemName && a.assetTag === asset.assetTag),
                        ));
                        if (extraction) {
                          const idx = extraction.lineItems.findIndex((li) => li.name === asset.itemName);
                          if (idx >= 0) setActiveTagItem(idx);
                        }
                      }}
                      className="ml-1 shrink-0 rounded p-0.5 text-muted-foreground hover:text-destructive"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  </div>
                ))}
              </div>
              {totalTagged < totalExpectedItems && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    if (extraction) {
                      const nextUntagged = extraction.lineItems.findIndex(
                        (li) => taggedAssets.filter((a) => a.itemName === li.name).length < li.quantity,
                      );
                      if (nextUntagged >= 0) setActiveTagItem(nextUntagged);
                    }
                  }}
                >
                  <Camera className="mr-2 size-4" />
                  Resume Scanning
                </Button>
              )}
            </div>
          )}

          <Button
            onClick={handleComplete}
            disabled={completing || totalTagged === 0}
            className="h-14 w-full text-lg font-semibold"
          >
            {completing ? (
              <>
                <Loader2 className="mr-2 size-5 animate-spin" />
                Completing...
              </>
            ) : (
              <>
                <Truck className="mr-2 size-5" />
                Complete Receiving
              </>
            )}
          </Button>
        </div>
      )}

      {/* ============================================================ */}
      {/* STEP 3: Complete */}
      {/* ============================================================ */}
      {currentStep === 3 && completed && (
        <div className="space-y-6 text-center">
          {/* Success animation */}
          <div className="flex flex-col items-center py-8">
            <div className="flex size-24 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/50">
              <CheckCircle2 className="size-14 text-emerald-500 animate-in zoom-in duration-500" />
            </div>
            <h2 className="mt-6 text-2xl font-bold">Receiving Complete!</h2>
            <p className="mt-2 text-muted-foreground">
              All items have been received and tagged successfully
            </p>
          </div>

          {/* Summary */}
          {extraction && (
            <div className="rounded-xl border bg-card p-4 text-left">
              <h3 className="mb-3 text-sm font-semibold uppercase text-muted-foreground">
                Summary
              </h3>
              {extraction.orderNumber && (
                <p className="text-sm">
                  <span className="text-muted-foreground">Order:</span>{' '}
                  <span className="font-medium">{extraction.orderNumber}</span>
                </p>
              )}
              {extraction.vendorName && (
                <p className="mt-1 text-sm">
                  <span className="text-muted-foreground">Vendor:</span>{' '}
                  <span className="font-medium">{extraction.vendorName}</span>
                </p>
              )}
              <p className="mt-1 text-sm">
                <span className="text-muted-foreground">Items Tagged:</span>{' '}
                <span className="font-medium">{taggedAssets.length}</span>
              </p>

              <div className="mt-3 space-y-1">
                {taggedAssets.map((asset, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 text-sm"
                  >
                    <CheckCircle2 className="size-4 text-emerald-500" />
                    <span>{asset.itemName}</span>
                    <span className="font-mono text-muted-foreground">
                      {asset.assetTag}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Button
            onClick={() => router.push('/receiving')}
            className="h-14 w-full text-lg font-semibold"
          >
            Back to Receiving
          </Button>
        </div>
      )}
    </div>
  );
}
