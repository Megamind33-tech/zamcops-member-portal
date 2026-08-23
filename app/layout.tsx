import React from "react";
import type { Metadata, Viewport } from "next";
import { Manrope, Space_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { AppProvider } from "@/lib/store";
import { PWARegister } from "@/components/PWARegister";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["500", "600", "700"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ZAMCOPS Member Portal",
  description:
    "ZAMCOPS Member Portal for composers, authors and publishers — register songs and artwork, download official documents, and follow royalty receiving and distribution.",
  manifest: "/manifest.webmanifest",
  applicationName: "ZAMCOPS",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "ZAMCOPS",
  },
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#F26C21",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${manrope.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable} h-full`}>
      <body className="h-full bg-zam-canvas font-sans text-zam-ink antialiased">
        <AppProvider>{children}</AppProvider>
        <Toaster
          position="top-right"
          toastOptions={{ style: { borderRadius: "12px", border: "1px solid #E7E9ED", fontFamily: "var(--font-sans), Manrope, sans-serif" } }}
        />
        <PWARegister />
      </body>
    </html>
  );
}
