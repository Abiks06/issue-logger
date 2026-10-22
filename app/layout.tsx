import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { Toaster } from "react-hot-toast";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"], display: "swap" });
const mono = JetBrains_Mono({ variable: "--font-mono-face", subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: { default: "Issue Logger", template: "%s · Issue Logger" },
  description: "Plan, track and resolve issues with your team — and log errors straight from your services.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbfbfc" },
    { media: "(prefers-color-scheme: dark)", color: "#0e0e11" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${mono.variable}`}>
      <body className="font-sans">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          {children}
          <Toaster
            position="bottom-right"
            toastOptions={{
              className: "!text-[13px] !font-medium",
              style: {
                borderRadius: "10px",
                border: "1px solid var(--border)",
                background: "var(--surface)",
                color: "var(--text)",
                boxShadow: "var(--shadow-lg)",
              },
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
