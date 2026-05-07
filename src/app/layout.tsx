import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "OpenRadio Cloud",
    template: "%s | OpenRadio Cloud"
  },
  description:
    "Open-source self-hosted internet radio platform for live broadcasting, AutoDJ playlists, and station growth.",
  metadataBase: new URL("https://openradio-cloud.local")
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
