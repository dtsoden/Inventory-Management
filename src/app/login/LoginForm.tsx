'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Package, Loader2, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

interface LoginBranding {
  primaryColor: string;
  logoUrlLight: string | null;
  logoUrlDark: string | null;
  appName: string;
  themeMode: string;
}

export default function LoginForm({ branding }: { branding?: LoginBranding }) {
  const primaryColor = branding?.primaryColor || 'var(--brand-green)';
  const logoUrlLight = branding?.logoUrlLight || null;
  const logoUrlDark = branding?.logoUrlDark || null;
  const appName = branding?.appName || 'Inventory Management Platform';
  const themeMode = branding?.themeMode || 'auto';
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError('Invalid email or password. Please try again.');
      } else {
        router.push('/');
        router.refresh();
      }
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="flex min-h-screen items-center justify-center px-4"
      style={{
        background:
          `linear-gradient(to bottom right, ${primaryColor}12, rgba(116, 40, 115, 0.08))`,
      }}
    >
      {/* Inject branding color as CSS variable for this page */}
      <style dangerouslySetInnerHTML={{ __html: `:root { --brand-green: ${primaryColor}; }` }} />
      {/* Force theme class on <html> when tenant locks the theme mode */}
      {themeMode !== 'auto' && (
        <script
          dangerouslySetInnerHTML={{
            __html: `document.documentElement.classList.remove('light','dark');document.documentElement.classList.add('${themeMode}');document.documentElement.style.colorScheme='${themeMode}';`,
          }}
        />
      )}
      <Card className="w-full max-w-md">
        <CardHeader className="flex flex-col items-center gap-4 pb-2">
          {logoUrlLight || logoUrlDark ? (
            <>
              {logoUrlLight && (
                <img
                  src={logoUrlLight}
                  alt={appName}
                  className={`h-14 max-w-[200px] object-contain ${logoUrlDark ? 'dark:hidden' : ''}`}
                />
              )}
              {logoUrlDark && (
                <img
                  src={logoUrlDark}
                  alt={appName}
                  className={`h-14 max-w-[200px] object-contain ${logoUrlLight ? 'hidden dark:block' : ''}`}
                />
              )}
            </>
          ) : (
            <div
              className="flex h-14 w-14 items-center justify-center rounded-full"
              style={{ backgroundColor: primaryColor }}
            >
              <Package className="h-7 w-7 text-white" />
            </div>
          )}
          <CardTitle className="text-2xl font-bold">Sign In</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {error && (
              <div className="rounded-md bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">
                {error}
              </div>
            )}

            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                disabled={loading}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  disabled={loading}
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
            </div>

            <Button
              type="submit"
              className="btn-pill mt-2 w-full text-white hover:opacity-90"
              style={{ backgroundColor: primaryColor, color: '#fff' }}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
