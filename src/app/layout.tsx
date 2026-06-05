import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NDA Store — Inventory & Sales",
  description: "Inventory and sales management system",
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#166534',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full antialiased">{children}</body>
    </html>
  );
}
