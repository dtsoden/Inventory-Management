'use client';

import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import type { SetupData } from './SetupWizard';

interface AdminStepProps {
  data: SetupData;
  onChange: (updates: Partial<SetupData>) => void;
}

export function AdminStep({ data, onChange }: AdminStepProps) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="space-y-6">
      <p className="text-muted-foreground text-sm">
        Create the first administrator account. This user will have full
        platform access.
      </p>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="adminFirstName">First Name</Label>
          <Input
            id="adminFirstName"
            placeholder="First name"
            value={data.adminFirstName}
            onChange={(e) => onChange({ adminFirstName: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="adminLastName">Last Name</Label>
          <Input
            id="adminLastName"
            placeholder="Last name"
            value={data.adminLastName}
            onChange={(e) => onChange({ adminLastName: e.target.value })}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="adminEmail">Email</Label>
        <Input
          id="adminEmail"
          type="email"
          placeholder="admin@example.com"
          value={data.adminEmail}
          onChange={(e) => onChange({ adminEmail: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="adminPassword">Password</Label>
        <div className="relative">
          <Input
            id="adminPassword"
            type={showPassword ? 'text' : 'password'}
            placeholder="Minimum 8 characters"
            value={data.adminPassword}
            onChange={(e) => onChange({ adminPassword: e.target.value })}
            minLength={8}
            className="pr-10"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
            onClick={() => setShowPassword(!showPassword)}
            tabIndex={-1}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4 text-muted-foreground" />
            ) : (
              <Eye className="h-4 w-4 text-muted-foreground" />
            )}
          </Button>
        </div>
        {data.adminPassword.length > 0 && data.adminPassword.length < 8 && (
          <p className="text-xs text-destructive">
            Password must be at least 8 characters.
          </p>
        )}
      </div>
    </div>
  );
}
