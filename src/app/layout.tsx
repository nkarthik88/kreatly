import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Providers from "./providers";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Kreatly — Your Notion-Powered Workspace",
  description: "Supercharge your Notion workspace with AI, real-time sync, and smart reminders. Just $9/month.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#0a0a0a] text-zinc-200">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
