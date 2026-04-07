import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "QR Tracking Service",
  description: "Foundation setup for the QR tracking and PDF print service.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
