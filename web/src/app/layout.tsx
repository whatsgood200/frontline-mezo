import type { Metadata } from "next";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import "./globals.css";
import { MockPanel } from "@/components/mock-panel";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { env } from "@/lib/env";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: { default: "Frontline: a redemption market for MUSD", template: "%s | Frontline" },
  description: "Borrowers stop being redeemed by paying BTC holders who are glad to be redeemed first. Built on Mezo's MUSD.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="min-h-screen bg-page text-ink">
        <Providers>
          <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-surface focus:px-3 focus:py-2">
            Skip to content
          </a>
          <SiteHeader />
          <main id="main" className="mx-auto max-w-[1200px] px-4 py-10 sm:px-6 sm:py-12">
            {children}
          </main>
          <SiteFooter />
          {env.adapter === "mock" ? <MockPanel /> : null}
        </Providers>
      </body>
    </html>
  );
}
