import type { Metadata } from "next";
import { Archivo, Besley, IBM_Plex_Mono, Reenie_Beanie } from "next/font/google";
import "./globals.css";
import { PostHogProvider } from "@/components/posthog-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";

// Besley: a Clarendon — the face of stamps, wanted posters, and letterheads.
const besley = Besley({
  variable: "--font-besley",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

// Archivo carries the interface; its width axis doubles as the narrow caps of
// a sorting label (.label-caps, .rubber).
const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["wdth"],
});

// Typewritten: addresses, dates, counts.
const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

// Ballpoint in the margin. Used sparingly.
const reenie = Reenie_Beanie({
  variable: "--font-reenie",
  subsets: ["latin"],
  weight: "400",
});

const SITE_JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://crushco.app/#organization",
      name: "Crush",
      url: "https://crushco.app",
    },
    {
      "@type": "WebSite",
      "@id": "https://crushco.app/#website",
      name: "Crush",
      url: "https://crushco.app",
      publisher: { "@id": "https://crushco.app/#organization" },
    },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL("https://crushco.app"),
  title: "Crush — The companies you'd actually leave for",
  description:
    "Tell Crush which companies you'd actually leave for. We watch their job boards every morning and write to you the day your exact role opens. One letter, nothing else.",
  keywords: ["startup jobs", "tech job alerts", "dream company hiring", "job tracker", "startup hiring", "tech jobs", "job alerts"],
  openGraph: {
    title: "Crush — The companies you'd actually leave for",
    description: "Name the companies you'd actually leave for. We watch their job boards and write the day your exact role opens. One letter, nothing else.",
    url: "https://crushco.app",
    siteName: "Crush",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Crush — The companies you'd actually leave for",
    description: "Name the companies you'd actually leave for. We watch their job boards and write the day your exact role opens. One letter, nothing else.",
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
      className={`${besley.variable} ${archivo.variable} ${plexMono.variable} ${reenie.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(SITE_JSON_LD) }}
        />
        <ThemeProvider>
          <PostHogProvider>
            {children}
          </PostHogProvider>
          <Toaster position="bottom-center" />
        </ThemeProvider>
      </body>
    </html>
  );
}
