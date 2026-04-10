'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Camera,
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
  const [processing, setProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Step 4: Complete state
  const [completing, setCompleting] = useState(false);
  const [completed, setCompleted] = useState(false);

  // Fetch session data
  const fetchSession = useCallback(async () => {
    try {
      const res = await fetch(`/api/receiving/${sessionId}`);
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
      // Extract base64 portion after the data URL prefix
      const base64 = result.split(',')[1];
      setCapturedImage(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleProcess = async () => {
    if (!capturedImage) return;
    setProcessing(true);

    try {
      const res = await fetch(`/api/receiving/${sessionId}/extract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: capturedImage }),
      });
      const json = await res.json();
      if (json.success) {
        setExtraction(json.data);
        setCurrentStep(1); // Move to review
      } else {
        alert(json.error ?? 'Failed to process packing slip');
      }
    } catch {
      alert('Failed to process image. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  // ------------------------------------------------------------------
  // Step 2: Confirm extraction
  // ------------------------------------------------------------------

  const handleConfirmExtraction = () => {
    setCurrentStep(2); // Move to tagging
  };

  // ------------------------------------------------------------------
  // Step 3: Asset tagging
  // ------------------------------------------------------------------

  const handleTagAsset = async (itemIndex: number) => {
    if (!assetTagInput.trim() || !extraction) return;

    const item = extraction.lineItems[itemIndex];
    setTagging(true);

    try {
      // We need an itemId; for now, we use a placeholder approach.
      // In a real flow, we'd match extraction names to catalog items.
      const res = await fetch(`/api/receiving/${sessionId}/tag`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId: 'placeholder', // Would be matched from catalog
          assetTag: assetTagInput.trim(),
          serialNumber: serialInput.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setTaggedAssets((prev) => [
          ...prev,
          {
            itemName: item.name,
            assetTag: assetTagInput.trim(),
            serialNumber: serialInput.trim() || undefined,
          },
        ]);
        setAssetTagInput('');
        setSerialInput('');
        setActiveTagItem(null);
      } else {
        alert(json.error ?? 'Failed to tag asset');
      }
    } catch {
      alert('Failed to tag asset');
    } finally {
      setTagging(false);
    }
  };

  // ------------------------------------------------------------------
  // Step 4: Complete
  // ------------------------------------------------------------------

  const handleComplete = async () => {
    setCompleting(true);
    try {
      const res = await fetch(`/api/receiving/${sessionId}/complete`, {
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
              Take a photo of the packing slip from the shipment
            </p>
          </div>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleCapture}
            className="hidden"
          />

          {!capturedImage ? (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-primary/30 bg-primary/5 py-16 transition-colors hover:border-primary/50 hover:bg-primary/10 active:bg-primary/15"
            >
              <div className="flex size-20 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Camera className="size-10" />
              </div>
              <p className="mt-4 text-lg font-semibold text-primary">
                Tap to Capture
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Use your camera to photograph the packing slip
              </p>
            </button>
          ) : (
            <div className="space-y-4">
              {/* Preview */}
              <div className="overflow-hidden rounded-xl border">
                <img
                  src={`data:image/jpeg;base64,${capturedImage}`}
                  alt="Captured packing slip"
                  className="w-full"
                />
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setCapturedImage(null);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  className="flex-1"
                >
                  Retake
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
      {/* STEP 1: AI Extraction Results */}
      {/* ============================================================ */}
      {currentStep === 1 && extraction && (
        <div className="space-y-6">
          <div className="text-center">
            <h2 className="text-lg font-semibold">Review Extracted Data</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Verify the extracted information is correct
            </p>
          </div>

          {/* Order Info */}
          <div className="rounded-xl border bg-card p-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-medium uppercase text-muted-foreground">
                  Order Number
                </p>
                <p className="mt-1 font-semibold">
                  {extraction.orderNumber ?? 'Not detected'}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase text-muted-foreground">
                  Vendor
                </p>
                <p className="mt-1 font-semibold">
                  {extraction.vendorName ?? 'Not detected'}
                </p>
              </div>
            </div>
          </div>

          {/* Line Items */}
          <div>
            <h3 className="mb-3 text-sm font-semibold uppercase text-muted-foreground">
              Line Items ({extraction.lineItems.length})
            </h3>
            <div className="space-y-3">
              {extraction.lineItems.map((item, index) => (
                <div
                  key={index}
                  className="rounded-xl border bg-card p-4"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Qty: {item.quantity}
                      </p>
                    </div>
                    <Badge variant="secondary">
                      {item.quantity} unit{item.quantity !== 1 ? 's' : ''}
                    </Badge>
                  </div>
                  {item.serialNumbers.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs font-medium text-muted-foreground">
                        Serial Numbers:
                      </p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {item.serialNumbers.map((sn, snIdx) => (
                          <Badge
                            key={snIdx}
                            variant="outline"
                            className="font-mono text-xs"
                          >
                            {sn}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <Button
            onClick={handleConfirmExtraction}
            className="h-14 w-full text-lg font-semibold"
          >
            <Check className="mr-2 size-5" />
            Confirm &amp; Continue
          </Button>
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

          {/* Overall Progress */}
          <div className="rounded-xl border bg-card p-4">
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

          {/* Items to tag */}
          <div className="space-y-3">
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

                  {/* Tag input form */}
                  {isActive && !isComplete && (
                    <div className="mt-4 space-y-3 border-t pt-4">
                      <div>
                        <label className="mb-1 block text-sm font-medium">
                          Asset Tag *
                        </label>
                        <Input
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
                            <span className="font-mono">{asset.assetTag}</span>
                            {asset.serialNumber && (
                              <span className="text-muted-foreground">
                                (SN: {asset.serialNumber})
                              </span>
                            )}
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

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
