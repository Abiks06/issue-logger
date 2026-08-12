"use client";

import Link from "next/link";
import { Bug, LayoutDashboard, CircleDot, Sun, Moon, Menu, X, LogOut } from "lucide-react";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import classNames from "classnames";

interface NavBarProps {
  openIssueCount?: number;
}

const NavBar = ({ openIssueCount = 0 }: NavBarProps) => {
  const links = [
    { label: "Dashboard", href: "/", icon: <LayoutDashboard className="h-4 w-4" /> },
    { label: "Issues", href: "/issues", icon: <CircleDot className="h-4 w-4" />, count: openIssueCount },
  ];

  const currentPathname = usePathname();
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { data: session } = useSession();

  useEffect(() => {
    setMounted(true);
  }, []);

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
    <nav className="sticky top-0 z-50 glass-card border-b border-transparent">
      {/* Subtle bottom gradient line */}
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent" />

      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        {/* Logo */}
        <Link
          href="/"
          className="group flex items-center gap-2.5 font-bold text-slate-800 transition-all hover:opacity-90 dark:text-slate-100"
          aria-label="Issue Logger home"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/20 transition-transform group-hover:scale-105">
            <Bug className="h-4 w-4" />
          </span>
          <span className="text-sm font-bold tracking-tight sm:text-base">
            Issue<span className="text-cyan-600 dark:text-cyan-400">Logger</span>
          </span>
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
                    "relative flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-medium transition-all duration-200",
                    {
                      "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300": isActive,
                      "text-slate-500 hover:bg-slate-500/8 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100": !isActive,
                    }
                  )}
                >
                  {link.icon}
                  {link.label}
                  {link.count !== undefined && link.count > 0 && (
                    <span className="ml-0.5 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold leading-none text-white shadow-sm shadow-rose-500/30">
                      {link.count > 99 ? "99+" : link.count}
                    </span>
                  )}
                  {isActive && (
                    <motion.span
                      layoutId="nav-active"
                      className="absolute inset-0 rounded-xl bg-cyan-500/10 dark:bg-cyan-400/10"
                      style={{ zIndex: -1 }}
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>

        {/* Right controls */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Theme toggle */}
          <motion.button
            onClick={toggleTheme}
            aria-label="Toggle colour theme"
            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-500/8 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 cursor-pointer"
            whileTap={{ scale: 0.9, rotate: 15 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
          >
            {mounted ? (
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={resolvedTheme}
                  initial={{ opacity: 0, rotate: -90, scale: 0 }}
                  animate={{ opacity: 1, rotate: 0, scale: 1 }}
                  exit={{ opacity: 0, rotate: 90, scale: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  {resolvedTheme === "dark" ? (
                    <Sun className="h-[18px] w-[18px]" />
                  ) : (
                    <Moon className="h-[18px] w-[18px]" />
                  )}
                </motion.span>
              </AnimatePresence>
            ) : (
              <span className="h-5 w-5 rounded-full bg-slate-200 dark:bg-slate-700" />
            )}
          </motion.button>

          {/* Desktop User avatar + sign out */}
          {session?.user && (
            <div className="hidden items-center gap-2 border-l border-slate-200/60 pl-3 dark:border-slate-700/60 sm:flex">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 text-xs font-bold text-white shadow-sm">
                  {initials}
                </span>
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-300 max-w-25 truncate">
                  {session.user.name}
                </span>
              </div>
              <motion.button
                onClick={() => signOut({ callbackUrl: "/auth/login" })}
                title="Sign out"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30 dark:hover:text-rose-400 cursor-pointer"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <LogOut className="h-4 w-4" />
              </motion.button>
            </div>
          )}

          {/* Mobile menu hamburger button */}
          <motion.button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileMenuOpen}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-600 transition-colors hover:bg-slate-500/8 dark:text-slate-300 sm:hidden cursor-pointer"
            whileTap={{ scale: 0.9 }}
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={mobileMenuOpen ? "close" : "open"}
                initial={{ opacity: 0, rotate: -90 }}
                animate={{ opacity: 1, rotate: 0 }}
                exit={{ opacity: 0, rotate: 90 }}
                transition={{ duration: 0.15 }}
              >
                {mobileMenuOpen ? (
                  <X className="h-5 w-5" />
                ) : (
                  <Menu className="h-5 w-5" />
                )}
              </motion.span>
            </AnimatePresence>
          </motion.button>
        </div>
      </div>

      {/* Mobile Drawer Dropdown */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] as const }}
            className="overflow-hidden border-t border-slate-200/50 bg-white/95 backdrop-blur-xl dark:border-slate-800/50 dark:bg-slate-950/95 sm:hidden"
          >
            <div className="px-4 py-4">
              <motion.ul
                className="flex flex-col gap-1.5"
                initial="hidden"
                animate="visible"
                variants={{
                  hidden: {},
                  visible: { transition: { staggerChildren: 0.05 } },
                }}
              >
                {links.map((link) => {
                  const isActive =
                    link.href === "/"
                      ? currentPathname === "/"
                      : currentPathname === link.href ||
                        currentPathname.startsWith(`${link.href}/`);

                  return (
                    <motion.li
                      key={link.href}
                      variants={{
                        hidden: { opacity: 0, x: -12 },
                        visible: { opacity: 1, x: 0 },
                      }}
                    >
                      <Link
                        href={link.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={classNames(
                          "flex items-center justify-between rounded-xl px-4 py-3 text-sm font-medium transition-all",
                          {
                            "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300": isActive,
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
                    </motion.li>
                  );
                })}
              </motion.ul>

              {session?.user && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.15 }}
                  className="mt-4 flex items-center justify-between border-t border-slate-200/80 pt-4 dark:border-slate-800"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 text-xs font-bold text-white shadow-sm">
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
                    <LogOut className="h-3.5 w-3.5" />
                    Sign out
                  </button>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default NavBar;
