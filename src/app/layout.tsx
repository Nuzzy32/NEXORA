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

export const viewport: Viewport = { themeColor: "#0b0d11", colorScheme: "dark light" };

/** Applies the per-device theme choice before first paint, so a light page never flashes dark. */
const THEME_SCRIPT = `try{var t=localStorage.getItem("nexora-theme");if(t==="light"||t==="system")document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" className={`${ui.variable} ${data.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
