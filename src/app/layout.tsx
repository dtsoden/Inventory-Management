import type { Metadata } from "next";
import "./globals.css";
import { Roboto } from "next/font/google";
import { cn } from "@/lib/utils";
import { SessionProvider } from "@/components/providers/SessionProvider";
import { ThemeProvider } from "@/components/providers/ThemeProvider";

const roboto = Roboto({
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Inventory Management Platform",
  description: "Inventory management platform",
  icons: {
    icon: '/api/favicon',
  },
};

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
