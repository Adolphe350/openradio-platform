import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { PersistentPlayerHost } from "@/components/persistent-player-host";
import "./globals.css";
import "./studio.css";

// Self-hosted (the build server cannot always reach Google Fonts).
const sora = localFont({
  src: "../fonts/Sora-var.woff2",
  variable: "--font-sora",
  weight: "300 800",
  display: "swap",
});

const mono = localFont({
  src: "../fonts/JetBrainsMono-var.woff2",
  variable: "--font-mono",
  weight: "400 700",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0F1115",
};

export const metadata: Metadata = {
  title: {
    default: "OpenRadio Cloud",
    template: "%s | OpenRadio Cloud"
  },
  description:
    "Internet radio hosting: upload your music, schedule shows, go live from any Icecast encoder and embed your player anywhere.",
  metadataBase: new URL(process.env.APP_BASE_URL || "https://openradio.iraady.com"),
  openGraph: {
    type: "website",
    siteName: "OpenRadio Cloud",
    title: "OpenRadio Cloud",
    description: "Upload, schedule and broadcast your own internet radio station.",
  },
  twitter: {
    card: "summary_large_image",
  },
};

// Runs before paint so the saved studio theme never flashes.
const themeScript = `try{var t=localStorage.getItem("or-theme");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t;}catch(e){}`;

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${sora.variable} ${mono.variable}`} data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        {children}
        <PersistentPlayerHost />
      </body>
    </html>
  );
}
