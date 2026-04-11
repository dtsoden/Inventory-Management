import type { Metadata } from "next";
import "./globals.css";
import { Roboto } from "next/font/google";
import { cn } from "@/lib/utils";
import { SessionProvider } from "@/components/providers/SessionProvider";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { prisma } from "@/lib/db";

const roboto = Roboto({
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
  variable: "--font-sans",
});

export async function generateMetadata(): Promise<Metadata> {
  let title = "Inventory Management Platform";
  try {
    const tenant = await prisma.tenant.findFirst({ select: { name: true } });
    if (tenant?.name) title = tenant.name;
  } catch {
    // DB not ready (e.g. pre-setup) — fall back to default
  }
  return {
    title,
    description: title,
    icons: {
      icon: '/api/favicon',
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn("font-sans", roboto.variable)} suppressHydrationWarning>
      <body>
        <SessionProvider>
          <ThemeProvider>
            {children}
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
