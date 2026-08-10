import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TRAIL — shared replay",
  description: "Review a session shared with TRAIL.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark h-full antialiased">
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
