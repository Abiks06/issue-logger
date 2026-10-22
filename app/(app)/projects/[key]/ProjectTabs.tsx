"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Columns3, List, Settings } from "lucide-react";

export default function ProjectTabs({ projectKey, canManage }: { projectKey: string; canManage: boolean }) {
  const pathname = usePathname();
  const base = `/projects/${projectKey}`;
  const tabs = [
    { href: `${base}/board`, label: "Board", icon: Columns3 },
    { href: `${base}/issues`, label: "Issues", icon: List },
    { href: `${base}/insights`, label: "Insights", icon: BarChart3 },
    { href: `${base}/settings`, label: canManage ? "Settings" : "Members", icon: Settings },
  ];

  return (
    <nav className="-mb-px flex gap-1 overflow-x-auto px-3 sm:px-5" aria-label="Project">
      {tabs.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || (href.endsWith("/issues") && pathname.startsWith(`${href}/`));
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`flex h-10 items-center gap-1.5 border-b-2 px-2.5 text-[13px] font-medium whitespace-nowrap transition-colors ${
              active ? "border-accent text-fg" : "border-transparent text-muted hover:text-fg"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
