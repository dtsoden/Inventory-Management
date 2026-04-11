'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { WelcomeStep } from './WelcomeStep';
import { AdminStep } from './AdminStep';
import { OrgStep } from './OrgStep';
import { BrandingStep } from './BrandingStep';
import { IntegrationsStep } from './IntegrationsStep';
import { CorsStep } from './CorsStep';
import { ReviewStep } from './ReviewStep';

export interface SetupData {
  passphrase: string;
  platformName: string;
  adminEmail: string;
  adminPassword: string;
  adminFirstName: string;
  adminLastName: string;
  orgName: string;
  orgSlug: string;
  openaiApiKey: string;
  smtpHost: string;
  smtpPort: string;
  smtpUser: string;
  smtpPassword: string;
  catalogApiUrl: string;
  corsOrigins: string;
  seedDemoData: boolean;
  // Branding fields
  brandingAppName: string;
  brandingPrimaryColorLight: string;
  brandingPrimaryColorDark: string;
  brandingLogoPreviewLight: string;
  brandingLogoFileLight?: File;
  brandingLogoPreviewDark: string;
  brandingLogoFileDark?: File;
  brandingThemeMode: 'auto' | 'light' | 'dark';
}

const STEP_TITLES = [
  'Welcome',
  'Admin Account',
  'Organization',
  'Branding',
  'Integrations',
  'CORS & Security',
  'Review & Launch',
];

const initialData: SetupData = {
  passphrase: '',
  platformName: '',
  adminEmail: '',
  adminPassword: '',
  adminFirstName: '',
  adminLastName: '',
  orgName: '',
  orgSlug: '',
  openaiApiKey: '',
  smtpHost: '',
  smtpPort: '587',
  smtpUser: '',
  smtpPassword: '',
  catalogApiUrl: '',
  corsOrigins: '*',
  seedDemoData: true,
  // Branding defaults
  brandingAppName: 'Inventory Management Platform',
  brandingPrimaryColorLight: '#7ed321',
  brandingPrimaryColorDark: '#7ed321',
  brandingLogoPreviewLight: '',
  brandingLogoPreviewDark: '',
  brandingThemeMode: 'auto',
};

export function SetupWizard() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [data, setData] = useState<SetupData>(initialData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const progress = ((currentStep + 1) / STEP_TITLES.length) * 100;

  function updateData(updates: Partial<SetupData>) {
    setData((prev) => ({ ...prev, ...updates }));
  }

  function validateCurrentStep(): string | null {
    switch (currentStep) {
      case 0: // Welcome
        if (!data.platformName.trim()) return 'Platform name is required.';
        if (data.passphrase.length < 12) return 'Encryption passphrase must be at least 12 characters.';
        return null;
      case 1: // Admin
        if (!data.adminFirstName.trim()) return 'First name is required.';
        if (!data.adminLastName.trim()) return 'Last name is required.';
        if (!data.adminEmail.includes('@')) return 'A valid email address is required.';
        if (data.adminPassword.length < 8) return 'Password must be at least 8 characters.';
        return null;
      case 2: // Org
        if (!data.orgName.trim()) return 'Organization name is required.';
        if (!data.orgSlug.trim()) return 'URL slug is required.';
        return null;
      case 3: // Branding (all optional)
        return null;
      case 4: // Integrations
        if (!data.openaiApiKey.trim()) return 'OpenAI API key is required for AI features.';
        return null;
      case 5: // CORS (has default *)
        if (!data.corsOrigins.trim()) return 'CORS origins are required. Use * for all origins.';
        return null;
      default:
        return null;
    }
  }

  function handleNext() {
    const validationError = validateCurrentStep();
    if (validationError) {
      setError(validationError);
      return;
    }
    if (currentStep < STEP_TITLES.length - 1) {
      setCurrentStep((s) => s + 1);
      setError(null);
    }
  }

  function handleBack() {
    if (currentStep > 0) {
      setCurrentStep((s) => s - 1);
      setError(null);
    }
  }

  async function handleSubmit() {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          passphrase: data.passphrase,
          platformName: data.platformName,
          adminEmail: data.adminEmail,
          adminPassword: data.adminPassword,
          adminFirstName: data.adminFirstName,
          adminLastName: data.adminLastName,
          orgName: data.orgName,
          orgSlug: data.orgSlug,
          openaiApiKey: data.openaiApiKey,
          corsOrigins: data.corsOrigins,
          smtpHost: data.smtpHost || undefined,
          smtpPort: data.smtpPort || undefined,
          smtpUser: data.smtpUser || undefined,
          smtpPassword: data.smtpPassword || undefined,
          catalogApiUrl: data.catalogApiUrl || undefined,
          seedDemoData: data.seedDemoData,
          branding: {
            appName: data.brandingAppName || 'Inventory Management Platform',
            primaryColorLight: data.brandingPrimaryColorLight || '#7ed321',
            primaryColorDark: data.brandingPrimaryColorDark || '#7ed321',
            themeMode: data.brandingThemeMode || 'auto',
            // Pass logos as data URLs so the setup API can persist them.
            // These are only used during initial setup; after that the logo
            // upload endpoint is used for subsequent changes.
            logoDataUrlLight: data.brandingLogoPreviewLight || null,
            logoDataUrlDark: data.brandingLogoPreviewDark || null,
          },
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || 'Setup failed. Please try again.');
        return;
      }

      router.push('/login');
    } catch {
      setError('An unexpected error occurred. Please check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  const stepComponent = [
    <WelcomeStep key="welcome" data={data} onChange={updateData} />,
    <AdminStep key="admin" data={data} onChange={updateData} />,
    <OrgStep key="org" data={data} onChange={updateData} />,
    <BrandingStep key="branding" data={data} onChange={updateData} />,
    <IntegrationsStep key="integrations" data={data} onChange={updateData} />,
    <CorsStep key="cors" data={data} onChange={updateData} />,
    <ReviewStep
      key="review"
      data={data}
      onChange={updateData}
      onSubmit={handleSubmit}
      isSubmitting={isSubmitting}
    />,
  ];

  const isLastStep = currentStep === STEP_TITLES.length - 1;

  return (
    <Card className="w-full max-w-2xl shadow-lg">
      <CardHeader className="space-y-4">
        <CardTitle className="text-2xl font-bold text-center">
          {STEP_TITLES[currentStep]}
        </CardTitle>
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>
              Step {currentStep + 1} of {STEP_TITLES.length}
            </span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {stepComponent[currentStep]}

        {error && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="flex justify-between pt-4">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 0}
            className="btn-pill"
          >
            Back
          </Button>

          {!isLastStep && (
            <Button
              onClick={handleNext}
              className="btn-pill"
              style={{ backgroundColor: 'var(--brand-green)', color: '#fff' }}
            >
              Next
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
