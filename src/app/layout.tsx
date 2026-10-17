import type { Metadata } from "next";
import { Atkinson_Hyperlegible, Fraunces, Noto_Naskh_Arabic, Noto_Nastaliq_Urdu } from "next/font/google";

import { AppShell } from "@/components/app-shell";
import { PassportProvider } from "@/components/passport-provider";

import "./globals.css";

const sans = Atkinson_Hyperlegible({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-atkinson",
  display: "swap",
});

const serif = Fraunces({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-fraunces",
  display: "swap",
});

const urdu = Noto_Nastaliq_Urdu({
  subsets: ["arabic"],
  weight: ["400", "700"],
  variable: "--font-nastaliq",
  display: "swap",
});

const naskh = Noto_Naskh_Arabic({
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-naskh",
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
    <html lang="en">
      <body className={`${sans.variable} ${serif.variable} ${urdu.variable} ${naskh.variable} antialiased`}>
        <PassportProvider>
          <AppShell>{children}</AppShell>
        </PassportProvider>
      </body>
    </html>
  );
}
