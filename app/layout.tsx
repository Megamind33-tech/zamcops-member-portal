import React from "react";
import type { Metadata, Viewport } from "next";
import { Manrope, Space_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";
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
    "ZAMCOPS Artist Membership Portal - register works, submit songs and albums, track royalties and manage your membership with the Zambian Music Copyright Protection Society.",
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
  themeColor: "#070814",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${manrope.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable} h-full`}>
      <body className="h-full bg-canvas font-sans text-ink antialiased">
        <AppProvider>{children}</AppProvider>
        <PWARegister />
      </body>
    </html>
  );
}
