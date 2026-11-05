import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Plus_Jakarta_Sans } from "next/font/google";
import { headers } from "next/headers";
import { Providers } from "@/components/providers";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({ variable: "--font-jakarta", subsets: ["latin", "latin-ext", "cyrillic-ext", "vietnamese"], display: "swap" });
const mono = JetBrains_Mono({ variable: "--font-jetbrains", subsets: ["latin", "latin-ext", "cyrillic-ext"], display: "swap" });

export const metadata: Metadata = {
  title: { default: "DiscoNotify Dashboard", template: "%s · DiscoNotify" },
  description: "Set up and manage DiscoNotify alerts for your Discord servers.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#e6e8ef" },
    { media: "(prefers-color-scheme: dark)", color: "#0f1118" },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    <html lang="en" className={`${jakarta.variable} ${mono.variable} antialiased`} suppressHydrationWarning>
      <body className="min-h-dvh">
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-100 focus:rounded-md focus:bg-btn-solid focus:px-4 focus:py-2 focus:text-btn-solid-ink">
          Skip to content
        </a>
        <Providers nonce={nonce}>{children}</Providers>
      </body>
    </html>
  );
}
