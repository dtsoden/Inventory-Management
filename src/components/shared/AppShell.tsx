'use client';

import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { ChatProvider } from '@/components/providers/ChatProvider';
import { BrandingProvider } from '@/components/providers/BrandingProvider';

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <BrandingProvider>
      <ChatProvider>
        <div className="flex h-screen overflow-hidden">
          <Sidebar />
          <div className="flex flex-1 flex-col overflow-hidden">
            <Header />
            <main className="flex-1 overflow-y-auto bg-background p-6">
              {children}
            </main>
          </div>
        </div>
      </ChatProvider>
    </BrandingProvider>
  );
}
