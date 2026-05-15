import type { Metadata, Viewport } from "next";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#00c8a0",
};

export const metadata: Metadata = {
  title: {
    default: "OpenRadio Cloud",
    template: "%s | OpenRadio Cloud"
  },
  description:
    "Open-source self-hosted internet radio platform for live broadcasting, AutoDJ playlists, and station growth.",
  metadataBase: new URL(process.env.APP_BASE_URL || "https://openradio.iraady.com"),
  openGraph: {
    type: "website",
    siteName: "OpenRadio Cloud",
    title: "OpenRadio Cloud",
    description: "Open-source self-hosted internet radio platform",
  },
  twitter: {
    card: "summary_large_image",
  },
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
