import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FlowTalk - Multilingual Chat",
  description: "Real-time multilingual chat application with automatic translation",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
