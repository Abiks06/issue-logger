"use client";

import Link from "next/link";
import { IoMdBug } from "react-icons/io";
import { MdOutlineDashboard } from "react-icons/md";
import { FaBug } from "react-icons/fa";
import { HiSun, HiMoon, HiOutlineBars3, HiOutlineXMark } from "react-icons/hi2";
import { HiOutlineLogout } from "react-icons/hi";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { data: session } = useSession();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close mobile menu when route changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [currentPathname]);

  const toggleTheme = () => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  };

  const initials = session?.user?.name
    ? session.user.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "?";

  return (
    <nav className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/80 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/85">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2 font-bold text-slate-800 transition-opacity hover:opacity-80 dark:text-slate-100"
          aria-label="Issue Logger home"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-linear-to-br from-cyan-500 to-blue-600 text-white shadow-sm">
            <FaBug className="text-sm" />
          </span>
          <span className="text-sm font-semibold tracking-tight sm:text-base">Issue Logger</span>
        </Link>

        {/* Desktop Navigation links */}
        <ul className="hidden items-center gap-1 sm:flex">
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
                  {link.count !== undefined && link.count > 0 && (
                    <span className="ml-0.5 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold leading-none text-white">
                      {link.count > 99 ? "99+" : link.count}
                    </span>
                  )}
                  {isActive && (
                    <span className="absolute inset-x-3 -bottom-0.5 h-0.5 rounded-full bg-cyan-500" />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>

        {/* Right controls */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            aria-label="Toggle colour theme"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100 cursor-pointer"
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

          {/* Desktop User avatar + sign out */}
          {session?.user && (
            <div className="hidden items-center gap-2 border-l border-slate-200 pl-2 dark:border-slate-700 sm:flex">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-linear-to-br from-cyan-500 to-blue-600 text-xs font-bold text-white shadow-sm">
                  {initials}
                </span>
                <span className="text-xs font-semibold text-slate-900 dark:text-slate-300 max-w-25 truncate">
                  {session.user.name}
                </span>
              </div>
              <button
                onClick={() => signOut({ callbackUrl: "/auth/login" })}
                title="Sign out"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:text-slate-400 dark:hover:bg-rose-950/30 dark:hover:text-rose-400 cursor-pointer"
              >
                <HiOutlineLogout className="text-base" />
              </button>
            </div>
          )}

          {/* Mobile menu hamburger button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileMenuOpen}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 sm:hidden cursor-pointer"
          >
            {mobileMenuOpen ? (
              <HiOutlineXMark className="text-xl" />
            ) : (
              <HiOutlineBars3 className="text-xl" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Dropdown */}
      {mobileMenuOpen && (
        <div className="border-t border-slate-200/70 bg-white/95 px-4 py-4 dark:border-slate-800 dark:bg-slate-950/95 sm:hidden">
          <ul className="flex flex-col gap-1.5">
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
                    onClick={() => setMobileMenuOpen(false)}
                    className={classNames(
                      "flex items-center justify-between rounded-xl px-4 py-3 text-sm font-medium transition-all",
                      {
                        "bg-cyan-50 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300": isActive,
                        "text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800": !isActive,
                      }
                    )}
                  >
                    <div className="flex items-center gap-3">
                      {link.icon}
                      <span>{link.label}</span>
                    </div>
                    {link.count !== undefined && link.count > 0 && (
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 text-xs font-bold text-white">
                        {link.count > 99 ? "99+" : link.count}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>

          {session?.user && (
            <div className="mt-4 flex items-center justify-between border-t border-slate-200/80 pt-4 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-linear-to-br from-cyan-500 to-blue-600 text-xs font-bold text-white shadow-sm">
                  {initials}
                </span>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    {session.user.name}
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-44">
                    {session.user.email}
                  </span>
                </div>
              </div>

              <button
                onClick={() => signOut({ callbackUrl: "/auth/login" })}
                className="flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300 transition-colors cursor-pointer"
              >
                <HiOutlineLogout className="text-sm" />
                Sign out
              </button>
            </div>
          )}
        </div>
      )}
    </nav>
  );
};

export default NavBar;
