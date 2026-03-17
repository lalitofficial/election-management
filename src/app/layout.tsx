import type { Metadata } from "next";
import { Roboto, Roboto_Mono } from "next/font/google";
import { AppThemeProvider } from "@/components/app-theme-provider";
import "./globals.css";

const sans = Roboto({
  variable: "--font-roboto",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

const mono = Roboto_Mono({
  variable: "--font-roboto-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "IITM Election Manager",
  description: "Roster-based turnout operations console for IIT Madras Student General Elections.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${sans.variable} ${mono.variable} antialiased`}>
        <AppThemeProvider>{children}</AppThemeProvider>
      </body>
    </html>
  );
}
