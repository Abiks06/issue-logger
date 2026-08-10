import "@radix-ui/themes/styles.css";
import type { Metadata } from "next";
import { Maven_Pro } from "next/font/google";
import "./globals.css";
import NavBar from "@/components/NavBar";
import Footer from "@/components/Footer";
import { Toaster } from "react-hot-toast";
import { Theme } from "@radix-ui/themes";
import { ThemeProvider } from "next-themes";
import { SessionProvider } from "next-auth/react";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";

const mavenPro = Maven_Pro({
  variable: "--font-maven-pro",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Issue Logger",
    template: "%s | Issue Logger",
  },
  description: "Track, manage, and resolve issues efficiently with Issue Logger.",
};


export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let session = null;
  try {
    session = await auth();
  } catch (err: unknown) {
    const errorObj = err as Record<string, unknown>;
    if (errorObj?.digest === "DYNAMIC_SERVER_USAGE" || (errorObj?.message as string)?.includes("DYNAMIC_SERVER_USAGE")) {
      throw err;
    }
    console.error("Failed to retrieve auth session in RootLayout:", err);
  }

  const userId = session?.user?.id ? parseInt(session.user.id, 10) : undefined;

  let openIssueCount = 0;
  if (userId) {
    try {
      openIssueCount = await prisma.issue.count({ where: { status: "OPEN", userId } });
    } catch {
      // Fall back to 0 if the database query fails — layout renders anyway
      openIssueCount = 0;
    }
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`min-h-full flex flex-col bg-background text-foreground ${mavenPro.className}`}>
        <SessionProvider>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            <Theme
              appearance="inherit"
              accentColor="cyan"
              grayColor="slate"
              radius="large"
            >
              <NavBar openIssueCount={openIssueCount} />
              <main className="flex-1">{children}</main>
              <Footer />
              <Toaster
                position="bottom-right"
                toastOptions={{
                  className: "font-medium text-sm",
                  style: {
                    borderRadius: "0.75rem",
                    border: "1px solid rgba(148,163,184,0.2)",
                  },
                }}
              />
            </Theme>
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
