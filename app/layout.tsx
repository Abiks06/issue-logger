import "@radix-ui/themes/styles.css";
import type { Metadata } from "next";
import { Maven_Pro } from "next/font/google";
import "./globals.css";
import NavBar from "./NavBar";

import { Theme } from "@radix-ui/themes";
import { ThemeProvider } from "next-themes";

const mavenPro = Maven_Pro({
  variable: "--font-maven-pro",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Issue Logger",
  description: "Track, manage, and resolve issues efficiently.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <Theme
            appearance="inherit"
            accentColor="tomato"
            grayColor="mauve"
            radius="large"
          >
            <NavBar />
            <main className={`flex-1 p-6 ${mavenPro.className}`}>{children}</main>
          </Theme>
        </ThemeProvider>
      </body>
    </html>
  );
}
