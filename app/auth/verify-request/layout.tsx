import type { Metadata } from "next";

export const metadata: Metadata = { title: "Check your inbox" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
