import type { Metadata } from "next";
import { Noto_Nastaliq_Urdu } from "next/font/google";

import { AppShell } from "@/components/app-shell";
import { PassportProvider } from "@/components/passport-provider";

import "./globals.css";

const urdu = Noto_Nastaliq_Urdu({
  subsets: ["arabic"],
  weight: ["400", "700"],
  variable: "--font-nastaliq",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SehatPass",
  description:
    "A fictional prototype that organizes scattered records into a health history a patient can verify and carry to the next doctor.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${urdu.variable} font-sans`}>
      <head>
        <link rel="preconnect" href="https://api.fontshare.com" />
        <link rel="preconnect" href="https://cdn.fontshare.com" crossOrigin="" />
        <link
          href="https://api.fontshare.com/v2/css?f[]=erode@400,500,600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">
        <PassportProvider>
          <AppShell>{children}</AppShell>
        </PassportProvider>
      </body>
    </html>
  );
}
