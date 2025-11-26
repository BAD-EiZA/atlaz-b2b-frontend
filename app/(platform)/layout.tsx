import type React from "react";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { Header } from "@/components/header";
import ClientMounted from "@/components/common/ClientMounted";
import TanstackProvider from "@/components/common/TanstackProvider";

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "B2B Atlaz Prediction Management",
  description: "Manage your organization for Prediction Test",
  icons: {
    icon: [
      {
        url: "/icon.png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/icon.png",
        media: "(prefers-color-scheme: dark)",
      },
      {
        url: "/icon.png",
        type: "image/svg+xml",
      },
    ],
    apple: "/icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`font-sans antialiased`}>
        <ClientMounted>
          <Header />
          <main className="bg-muted/30 min-h-screen">
            <TanstackProvider>{children}</TanstackProvider>
          </main>
          <Analytics />
        </ClientMounted>
      </body>
    </html>
  );
}
