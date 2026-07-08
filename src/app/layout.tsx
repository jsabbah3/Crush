import type { Metadata } from "next";
import { DM_Sans, Geist_Mono } from "next/font/google";
import "./globals.css";
import { PostHogProvider } from "@/components/posthog-provider";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  style: ["normal", "italic"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Crush — Your company crushes, now hiring",
  description:
    "Crush is your built-in VC best friend — a curated watchlist of dream companies that alerts you the moment your exact role opens. No job boards, no noise. Just the companies you'd actually leave for.",
  keywords: ["startup jobs", "tech job alerts", "dream company hiring", "job tracker", "startup hiring", "tech jobs", "job alerts"],
  openGraph: {
    title: "Crush — Your company crushes, now hiring",
    description: "A curated watchlist of dream companies. Get alerted the moment your exact role opens — before it hits LinkedIn.",
    url: "https://crushco.app",
    siteName: "Crush",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Crush — Your company crushes, now hiring",
    description: "A curated watchlist of dream companies. Get alerted the moment your exact role opens — before it hits LinkedIn.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${dmSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <PostHogProvider>
          {children}
        </PostHogProvider>
      </body>
    </html>
  );
}
