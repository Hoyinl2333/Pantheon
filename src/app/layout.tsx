import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SidebarNav } from "@/components/sidebar-nav";
import { CommandPalette } from "@/components/command-palette";
import { PwaRegister } from "@/components/pwa-register";
import { PwaInstallPrompt } from "@/components/pwa-install-prompt";
import { Providers } from "@/components/providers";
import { ErrorBoundary } from "@/components/error-boundary";
import { NavProgress } from "@/components/nav-progress";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Pantheon",
  description: "AI Agent Orchestration Platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" type="image/svg+xml" href="/logo.svg" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#7c3aed" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Pantheon" />
        <link rel="apple-touch-icon" href="/icons/icon-192.svg" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('theme');
                  var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                  if (theme === 'dark' || (!theme && prefersDark)) {
                    document.documentElement.classList.add('dark');
                  }
                  var locale = localStorage.getItem('locale');
                  if (locale) {
                    document.documentElement.lang = locale;
                  }
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>
          {/* Skip to main content link for keyboard/screen-reader users */}
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:top-2 focus:left-2 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:text-sm"
          >
            Skip to main content
          </a>
          <NavProgress />
          <div className="flex h-dvh">
            <SidebarNav />
            <CommandPalette />
            <PwaRegister />
            <PwaInstallPrompt />

            {/* Main Content */}
            <main
              id="main-content"
              role="main"
              className="flex-1 overflow-auto p-3 sm:p-4 lg:p-6 pt-14 sm:pt-14 lg:pt-6"
            >
              <ErrorBoundary>
                {children}
              </ErrorBoundary>
            </main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
