import type { Metadata, Viewport } from "next";
import { Bungee, Rubik } from "next/font/google";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import "./globals.css";

const display = Bungee({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-display",
});

const body = Rubik({
  subsets: ["latin"],
  variable: "--font-body",
});

export const metadata: Metadata = {
  title: "Bored Box — tiny games for restless brains",
  description:
    "Competitive offline arcade — local multiplayer, solo high scores, installable PWA. Synk ID coming soon.",
  applicationName: "Bored Box",
  appleWebApp: {
    capable: true,
    title: "Bored Box",
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/favicon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#c8f542",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} h-full`}>
      <body className="flex min-h-full flex-col antialiased">
        <ServiceWorkerRegister />
        {children}
      </body>
    </html>
  );
}
