import type { Metadata, Viewport } from "next";
import { Geist, JetBrains_Mono } from "next/font/google";
import "./globals.css";

// Two voices (Stitch design system): Geist for the interface, JetBrains Mono for data.
const ui = Geist({
  variable: "--font-ui",
  subsets: ["latin"],
});

const data = JetBrains_Mono({
  variable: "--font-data",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: "Nexora", template: "%s · Nexora" },
  description: "Personal intelligence workspace.",
};

export const viewport: Viewport = { themeColor: "#0b0d11", colorScheme: "dark" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" className={`${ui.variable} ${data.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
