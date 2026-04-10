'use client';

import { useEffect, useState } from 'react';
import { User, Mail, Shield, Calendar, Key, Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface ProfileData {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  tenant: {
    name: string;
  };
}

const roleLabelMap: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  ORG_ADMIN: 'Org Admin',
  MANAGER: 'Manager',
  WAREHOUSE_STAFF: 'Warehouse Staff',
};

const roleVariantMap: Record<string, 'default' | 'secondary' | 'outline'> = {
  SUPER_ADMIN: 'default',
  ORG_ADMIN: 'default',
  MANAGER: 'secondary',
  WAREHOUSE_STAFF: 'outline',
};

export default function ProfilePage() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  // Profile form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  // Password form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  // Validation
  const [nameError, setNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [currentPwError, setCurrentPwError] = useState('');
  const [newPwError, setNewPwError] = useState('');
  const [confirmPwError, setConfirmPwError] = useState('');

  useEffect(() => {
    fetchProfile();
  }, []);

  async function fetchProfile() {
    try {
      const res = await fetch('/api/profile');
      const json = await res.json();
      if (json.success && json.data) {
        setProfile(json.data);
        setName(json.data.name);
        setEmail(json.data.email);
      } else {
        toast.error('Failed to load profile');
      }
    } catch {
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  }

  function validateProfile(): boolean {
    let valid = true;
    setNameError('');
    setEmailError('');

    if (!name.trim()) {
      setNameError('Name is required');
      valid = false;
    }
    if (!email.trim() || !email.includes('@')) {
      setEmailError('A valid email is required');
      valid = false;
    }
    return valid;
  }

  function validatePassword(): boolean {
    let valid = true;
    setCurrentPwError('');
    setNewPwError('');
    setConfirmPwError('');

    if (!currentPassword) {
      setCurrentPwError('Current password is required');
      valid = false;
    }
    if (!newPassword) {
      setNewPwError('New password is required');
      valid = false;
    } else if (newPassword.length < 8) {
      setNewPwError('Must be at least 8 characters');
      valid = false;
    }
    if (!confirmPassword) {
      setConfirmPwError('Please confirm your new password');
      valid = false;
    } else if (newPassword !== confirmPassword) {
      setConfirmPwError('Passwords do not match');
      valid = false;
    }
    return valid;
  }

  async function handleSaveProfile() {
    if (!validateProfile()) return;
    setSavingProfile(true);
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email: email.trim() }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        setProfile(json.data);
        toast.success('Profile updated successfully');
      } else {
        toast.error(json.error || 'Failed to update profile');
      }
    } catch {
      toast.error('Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleChangePassword() {
    if (!validatePassword()) return;
    setSavingPassword(true);
    try {
      const res = await fetch('/api/profile/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success('Password changed successfully');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        toast.error(json.error || 'Failed to change password');
      }
    } catch {
      toast.error('Failed to change password');
    } finally {
      setSavingPassword(false);
    }
  }

  function getInitials(fullName: string): string {
    const parts = fullName.split(' ').filter(Boolean);
    if (parts.length === 0) return '??';
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  function formatDate(dateStr: string | null): string {
    if (!dateStr) return 'Never';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  function formatDateTime(dateStr: string | null): string {
    if (!dateStr) return 'Never';
    return new Date(dateStr).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <p className="text-muted-foreground">Unable to load profile.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 md:p-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Profile</h1>
        <p className="text-sm text-muted-foreground">
          Manage your account settings and preferences.
        </p>
      </div>

      {/* Avatar and identity */}
      <Card>
        <CardContent className="flex flex-col items-center gap-4 pt-6 sm:flex-row sm:items-start">
          <Avatar className="h-20 w-20 text-2xl">
            <AvatarFallback className="bg-purple-600 text-white">
              {getInitials(profile.name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 text-center sm:text-left">
            <h2 className="text-xl font-semibold">{profile.name}</h2>
            <p className="text-sm text-muted-foreground">{profile.email}</p>
            <div className="mt-2 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              <Badge variant={roleVariantMap[profile.role] ?? 'outline'}>
                <Shield className="mr-1 h-3 w-3" />
                {roleLabelMap[profile.role] ?? profile.role}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {profile.tenant.name}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Profile details */}
      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
          <CardDescription>Update your name and email address.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="profile-name">
                <User className="mr-1 inline h-4 w-4" />
                Full Name
              </Label>
              <Input
                id="profile-name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (nameError) setNameError('');
                }}
                placeholder="Your full name"
              />
              {nameError && (
                <p className="text-xs text-destructive">{nameError}</p>
              )}
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="profile-email">
                <Mail className="mr-1 inline h-4 w-4" />
                Email
              </Label>
              <Input
                id="profile-email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (emailError) setEmailError('');
                }}
                placeholder="you@example.com"
              />
              {emailError && (
                <p className="text-xs text-destructive">{emailError}</p>
              )}
            </div>
          </div>

          {/* Read-only fields */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-muted-foreground">
                <Shield className="mr-1 inline h-4 w-4" />
                Role
              </Label>
              <div className="rounded-md border bg-muted/50 px-3 py-2 text-sm">
                {roleLabelMap[profile.role] ?? profile.role}
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">
                <Calendar className="mr-1 inline h-4 w-4" />
                Member Since
              </Label>
              <div className="rounded-md border bg-muted/50 px-3 py-2 text-sm">
                {formatDate(profile.createdAt)}
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-muted-foreground">Organization</Label>
              <div className="rounded-md border bg-muted/50 px-3 py-2 text-sm">
                {profile.tenant.name}
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">Last Login</Label>
              <div className="rounded-md border bg-muted/50 px-3 py-2 text-sm">
                {formatDateTime(profile.lastLoginAt)}
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSaveProfile} disabled={savingProfile}>
              {savingProfile ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save Changes
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Password change */}
      <Card>
        <CardHeader>
          <CardTitle>
            <Key className="mr-2 inline h-5 w-5" />
            Change Password
          </CardTitle>
          <CardDescription>
            Update your password. You will need to enter your current password for verification.
          </CardDescription>
        </CardHeader>
        <Separator />
        <CardContent className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="current-password">Current Password</Label>
            <Input
              id="current-password"
              type="password"
              value={currentPassword}
              onChange={(e) => {
                setCurrentPassword(e.target.value);
                if (currentPwError) setCurrentPwError('');
              }}
              placeholder="Enter current password"
            />
            {currentPwError && (
              <p className="text-xs text-destructive">{currentPwError}</p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  if (newPwError) setNewPwError('');
                }}
                placeholder="At least 8 characters"
              />
              {newPwError && (
                <p className="text-xs text-destructive">{newPwError}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm New Password</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (confirmPwError) setConfirmPwError('');
                }}
                placeholder="Repeat new password"
              />
              {confirmPwError && (
                <p className="text-xs text-destructive">{confirmPwError}</p>
              )}
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleChangePassword} disabled={savingPassword}>
              {savingPassword ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Key className="mr-2 h-4 w-4" />
              )}
              Change Password
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
