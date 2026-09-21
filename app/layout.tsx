import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Docsentis • Secure University Assignment Viewer",
  description:
    "Production-ready, secure web platform for sharing university assignment documents with authorized users. Download restricted with dynamic watermarking and real-time access revocation. Developed by PEAKSORA.",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/logo.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
    apple: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-background text-primary font-sans antialiased flex flex-col">
        {children}
      </body>
    </html>
  );
}
