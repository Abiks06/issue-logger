"use client";

import Link from "next/link";
import { IoMdBug } from "react-icons/io";
import { MdOutlineDashboard } from "react-icons/md";
import { FaBug } from "react-icons/fa";
import { HiSun, HiMoon } from "react-icons/hi2";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import classNames from "classnames";

interface NavBarProps {
  openIssueCount?: number;
}

const NavBar = ({ openIssueCount = 0 }: NavBarProps) => {
  const links = [
    { label: "Dashboard", href: "/", icon: <MdOutlineDashboard className="text-lg" /> },
    { label: "Issues", href: "/issues", icon: <IoMdBug className="text-lg" />, count: openIssueCount },
  ];

  const currentPathname = usePathname();
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleTheme = () => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  };

  return (
    <nav className="sticky top-0 z-50 flex items-center justify-between border-b border-slate-200 bg-white/80 px-5 py-3 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/80">
      {/* Logo */}
      <Link
        href="/"
        className="flex items-center gap-2 font-bold text-slate-800 transition-opacity hover:opacity-80 dark:text-slate-100"
        aria-label="Issue Logger home"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-sm">
          <FaBug className="text-sm" />
        </span>
        <span className="text-sm font-semibold tracking-tight">Issue Logger</span>
      </Link>

      {/* Navigation links */}
      <ul className="flex items-center gap-1">
        {links.map((link) => {
          const isActive =
            link.href === "/"
              ? currentPathname === "/"
              : currentPathname === link.href ||
                currentPathname.startsWith(`${link.href}/`);

          return (
            <li key={link.href}>
              <Link
                href={link.href}
                className={classNames(
                  "relative flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium transition-all",
                  {
                    "bg-cyan-50 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300": isActive,
                    "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100": !isActive,
                  }
                )}
              >
                {link.icon}
                {link.label}
                {/* Open issue count badge */}
                {link.count !== undefined && link.count > 0 && (
                  <span className="ml-0.5 flex h-4.5 min-w-[1.125rem] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold leading-none text-white">
                    {link.count > 99 ? "99+" : link.count}
                  </span>
                )}
                {/* Active indicator */}
                {isActive && (
                  <span className="absolute inset-x-3 -bottom-0.5 h-0.5 rounded-full bg-cyan-500" />
                )}
              </Link>
            </li>
          );
        })}
      </ul>

      {/* Theme toggle */}
      <button
        onClick={toggleTheme}
        aria-label="Toggle colour theme"
        className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
      >
        {mounted ? (
          resolvedTheme === "dark" ? (
            <HiSun className="text-lg" />
          ) : (
            <HiMoon className="text-lg" />
          )
        ) : (
          <span className="h-5 w-5 rounded-full bg-slate-200 dark:bg-slate-700" />
        )}
      </button>
    </nav>
  );
};

export default NavBar;
