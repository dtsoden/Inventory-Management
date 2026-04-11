'use client';

import { useEffect, useState, useCallback } from 'react';
import { Search, Sun, Moon, Bell, LogOut, User, CheckCheck, Bot, HelpCircle, BookOpen, ShieldCheck, GitCompare, Sparkles } from 'lucide-react';
import { useTheme } from 'next-themes';
import { signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useCurrentUser } from '@/hooks/useSession';
import { useNotifications } from '@/hooks/useNotifications';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { useChatContext } from '@/components/providers/ChatProvider';
import { ChatPanel } from '@/components/shared/ChatPanel';
import { useBranding } from '@/components/providers/BrandingProvider';

export function Header() {
  const { theme, setTheme } = useTheme();
  const { branding } = useBranding();
  const themeLocked = branding.themeMode === 'light' || branding.themeMode === 'dark';
  const user = useCurrentUser();
  const router = useRouter();
  const { togglePanel } = useChatContext();
  const { notifications, unreadCount, markAsRead, markAllAsRead } =
    useNotifications();

  const initials = user
    ? `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase()
    : '??';

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const refreshAvatar = useCallback(async () => {
    try {
      const res = await fetch('/api/profile');
      const json = await res.json();
      if (json.success && json.data) {
        setAvatarUrl(json.data.avatarUrl ?? null);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    refreshAvatar();
    const handler = () => refreshAvatar();
    window.addEventListener('profile:avatar-updated', handler);
    return () => window.removeEventListener('profile:avatar-updated', handler);
  }, [refreshAvatar]);

  return (
    <header className="flex h-16 items-center justify-between border-b bg-card px-4">
      {/* Search */}
      <button className="flex w-[35%] min-w-[200px] items-center gap-2 rounded-lg border bg-background px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent">
        <Search className="h-4 w-4 shrink-0" />
        <span className="truncate">Search inventory, vendors, orders... (Ctrl+K)</span>
      </button>

      {/* Right side actions */}
      <div className="flex items-center gap-2">
        {/* AI Assistant toggle */}
        <Button
          variant="outline"
          size="sm"
          onClick={togglePanel}
          className="gap-1.5"
        >
          <Bot className="h-4 w-4" />
          <span className="hidden sm:inline">AI Assistant</span>
        </Button>

        {/* AI Insights, role-gated to procurement managers */}
        {(user?.role === 'ADMIN' ||
          user?.role === 'MANAGER' ||
          user?.role === 'PURCHASING_MANAGER') && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/insights')}
            className="gap-1.5"
          >
            <Sparkles className="h-4 w-4" />
            <span className="hidden sm:inline">AI Insights</span>
          </Button>
        )}

        {/* Theme toggle: hidden when the tenant has locked the theme mode */}
        {!themeLocked && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            aria-label="Toggle theme"
          >
            <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </Button>
        )}

        {/* Help / Documentation dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                aria-label="Help and documentation"
              />
            }
          >
            <HelpCircle className="h-5 w-5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem
              onClick={() => window.open('/docs/user/getting-started', '_blank')}
            >
              <BookOpen className="mr-2 h-4 w-4" />
              User Guide
            </DropdownMenuItem>
            {user?.role === 'ADMIN' && (
              <>
                <DropdownMenuItem
                  onClick={() => window.open('/docs/admin/setup-wizard', '_blank')}
                >
                  <ShieldCheck className="mr-2 h-4 w-4" />
                  Admin Guide
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => window.open('/docs/comparison', '_blank')}
                >
                  <GitCompare className="mr-2 h-4 w-4" />
                  Shane Comparison
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Notification bell with dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                aria-label="Notifications"
                className="relative"
              />
            }
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-white">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            {(() => {
              const unread = notifications.filter((n) => !n.isRead);
              const visible = unread.slice(0, 5);
              const extra = unread.length - visible.length;
              return (
                <>
                  <div className="flex items-center justify-between px-3 py-2">
                    <p className="text-sm font-medium">Notifications</p>
                    {unread.length > 0 && (
                      <button
                        onClick={markAllAsRead}
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <CheckCheck className="h-3 w-3" />
                        Mark all read
                      </button>
                    )}
                  </div>
                  <DropdownMenuSeparator />
                  {unread.length === 0 ? (
                    <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                      No unread notifications
                    </div>
                  ) : (
                    <>
                      {visible.map((notif) => (
                        <DropdownMenuItem
                          key={notif.id}
                          className="flex flex-col items-start gap-1 px-3 py-2"
                          onClick={() => {
                            if (!notif.isRead) markAsRead(notif.id);
                            if (notif.link) router.push(notif.link);
                          }}
                        >
                          <div className="flex items-center gap-2 w-full">
                            <span className="h-2 w-2 shrink-0 rounded-full bg-brand-green" />
                            <span className="font-medium text-sm truncate flex-1">
                              {notif.title}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2 pl-4">
                            {notif.message}
                          </p>
                        </DropdownMenuItem>
                      ))}
                      {extra > 0 && (
                        <div className="px-3 py-1.5 text-center text-xs text-muted-foreground">
                          + {extra} more unread
                        </div>
                      )}
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="justify-center text-sm font-medium text-brand-green"
                    onClick={() => router.push('/notifications')}
                  >
                    View notification center
                  </DropdownMenuItem>
                </>
              );
            })()}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger className="cursor-pointer rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <Avatar>
              {avatarUrl && <AvatarImage src={avatarUrl} alt="Profile" />}
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="bottom" sideOffset={8} className="w-64">
            {user && (
              <div className="px-2 py-1.5 text-sm">
                <p className="font-medium">
                  {user.firstName} {user.lastName}
                </p>
                <p className="text-xs text-muted-foreground">{user.email}</p>
              </div>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => router.push('/profile')}
            >
              <User className="mr-2 h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => signOut({ callbackUrl: '/login' })}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Chat Panel */}
      <ChatPanel />
    </header>
  );
}
