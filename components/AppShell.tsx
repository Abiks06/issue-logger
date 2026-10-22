"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  FolderKanban, Inbox, LayoutDashboard, LogOut, Menu, Monitor, Moon, Plus, Search, Settings, Sun, X,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { Avatar, ProjectBadge } from "@/components/ui/bits";
import CommandPalette from "@/components/CommandPalette";
import { signOutAction } from "@/actions/session";

export type ShellProject = { key: string; name: string; color: string };

type Props = {
  user: { id: string; name: string; email: string };
  projects: ShellProject[];
  unread: number;
  children: React.ReactNode;
};

function isTyping(target: EventTarget | null) {
  const el = target as HTMLElement | null;
  return Boolean(el && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName)));
}

/** Project key from the current URL, if inside a project. */
function currentProjectKey(pathname: string) {
  return /^\/projects\/([^/]+)/.exec(pathname)?.[1]?.toUpperCase() ?? null;
}

export default function AppShell({ user, projects, unread, children }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [lastPath, setLastPath] = useState(pathname);

  // Close the mobile drawer on navigation (state adjusted during render, not in an effect).
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setNavOpen(false);
  }

  const projectKey = currentProjectKey(pathname);
  const newIssueHref = projectKey
    ? `/projects/${projectKey}/issues/new`
    : projects[0]
      ? `/projects/${projects[0].key}/issues/new`
      : "/projects/new";

  // Global shortcuts: ⌘K / Ctrl+K palette, "/" search, "c" create, "g" then i/p/h to navigate.
  useEffect(() => {
    let pendingG = 0;
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target) || document.querySelector("dialog[open]")) return;
      if (e.key === "/") {
        e.preventDefault();
        setPaletteOpen(true);
      } else if (e.key === "c") {
        e.preventDefault();
        router.push(newIssueHref);
      } else if (e.key === "g") {
        pendingG = Date.now();
      } else if (Date.now() - pendingG < 800) {
        const dest = { i: "/inbox", h: "/", p: "/projects" }[e.key];
        if (dest) router.push(dest);
        pendingG = 0;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router, newIssueHref]);

  const sidebar = (
    <nav className="flex h-full flex-col gap-1 px-3 py-3" aria-label="Main">
      <div className="mb-2 flex items-center justify-between px-1">
        <Link href="/" className="flex items-center gap-2 text-sm font-semibold">
          <Logo className="h-6 w-6" />
          Issue Logger
        </Link>
        <button className="btn-icon md:hidden" onClick={() => setNavOpen(false)} aria-label="Close menu">
          <X className="h-4 w-4" />
        </button>
      </div>

      <button
        onClick={() => setPaletteOpen(true)}
        className="mb-1 flex h-8 items-center gap-2 rounded-md border border-line bg-surface px-2.5 text-[13px] text-faint shadow-[var(--shadow-sm)] hover:text-muted"
      >
        <Search className="h-3.5 w-3.5" />
        Search or jump to…
        <span className="kbd ml-auto">⌘K</span>
      </button>
      <Link href={newIssueHref} className="btn-primary mb-3 w-full justify-start">
        <Plus className="h-4 w-4" />
        New issue
        <span className="ml-auto rounded bg-white/20 px-1 font-mono text-[10px]">C</span>
      </Link>

      <NavLink href="/" icon={<LayoutDashboard className="h-4 w-4" />} active={pathname === "/"}>
        My work
      </NavLink>
      <NavLink href="/inbox" icon={<Inbox className="h-4 w-4" />} active={pathname === "/inbox"}>
        Inbox
        {unread > 0 && (
          <span className="ml-auto rounded-full bg-accent px-1.5 text-[11px] font-semibold text-accent-fg">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </NavLink>
      <NavLink href="/projects" icon={<FolderKanban className="h-4 w-4" />} active={pathname === "/projects"}>
        All projects
      </NavLink>

      <div className="mt-4 flex items-center justify-between px-2 text-[11px] font-semibold uppercase tracking-wider text-faint">
        Projects
        <Link href="/projects/new" className="rounded p-0.5 hover:bg-surface-3 hover:text-fg" aria-label="New project">
          <Plus className="h-3.5 w-3.5" />
        </Link>
      </div>
      <div className="-mx-1 flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto px-1">
        {projects.length === 0 && <p className="px-2 py-1 text-[13px] text-faint">No projects yet</p>}
        {projects.map((p) => (
          <NavLink
            key={p.key}
            href={`/projects/${p.key}/board`}
            icon={<ProjectBadge projectKey={p.key} color={p.color} size={18} />}
            active={projectKey === p.key}
          >
            <span className="truncate">{p.name}</span>
          </NavLink>
        ))}
      </div>

      <div className="mt-2 border-t border-line pt-2">
        <ThemeSwitch />
        <div className="flex items-center gap-2 rounded-md px-2 py-1.5">
          <Avatar name={user.name} size={24} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-medium">{user.name}</p>
            <p className="truncate text-[11px] text-faint">{user.email}</p>
          </div>
          <Link href="/settings" className="btn-icon h-7 w-7" aria-label="Account settings">
            <Settings className="h-3.5 w-3.5" />
          </Link>
          <form action={signOutAction}>
            <button className="btn-icon h-7 w-7" aria-label="Sign out" title="Sign out">
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </form>
        </div>
      </div>
    </nav>
  );

  return (
    <div className="flex h-full">
      <aside className="hidden w-60 shrink-0 border-r border-line bg-sidebar md:block">{sidebar}</aside>

      {navOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setNavOpen(false)} />
          <aside className="animate-fade-up absolute inset-y-0 left-0 w-72 max-w-[85vw] border-r border-line bg-sidebar">{sidebar}</aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-12 shrink-0 items-center gap-2 border-b border-line px-3 md:hidden">
          <button className="btn-icon" onClick={() => setNavOpen(true)} aria-label="Open menu">
            <Menu className="h-4 w-4" />
          </button>
          <Logo className="h-5 w-5" />
          <span className="text-sm font-semibold">Issue Logger</span>
          <button className="btn-icon ml-auto" onClick={() => setPaletteOpen(true)} aria-label="Search">
            <Search className="h-4 w-4" />
          </button>
          <Link href="/inbox" className="btn-icon relative" aria-label={`Inbox, ${unread} unread`}>
            <Inbox className="h-4 w-4" />
            {unread > 0 && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-accent" />}
          </Link>
        </header>
        <main className="min-h-0 flex-1 overflow-y-auto">{children}</main>
      </div>

      {paletteOpen && <CommandPalette projects={projects} onClose={() => setPaletteOpen(false)} newIssueHref={newIssueHref} />}
    </div>
  );
}

function NavLink({ href, icon, active, children }: { href: string; icon: React.ReactNode; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`flex h-8 items-center gap-2 rounded-md px-2 text-[13px] font-medium transition-colors ${
        active ? "bg-surface-3 text-fg" : "text-muted hover:bg-surface-2 hover:text-fg"
      }`}
    >
      <span className="flex w-[18px] justify-center">{icon}</span>
      {children}
    </Link>
  );
}

function ThemeSwitch() {
  const { theme, setTheme } = useTheme();
  const options = [
    { value: "light", icon: Sun, label: "Light" },
    { value: "dark", icon: Moon, label: "Dark" },
    { value: "system", icon: Monitor, label: "System" },
  ];
  return (
    <div className="mb-1 flex rounded-md bg-surface-2 p-0.5" role="radiogroup" aria-label="Theme">
      {options.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          role="radio"
          aria-checked={theme === value}
          aria-label={label}
          title={label}
          onClick={() => setTheme(value)}
          // The theme is only known on the client; the server renders none selected.
          suppressHydrationWarning
          className={`flex h-6 flex-1 items-center justify-center rounded transition-colors ${
            theme === value ? "bg-surface text-fg shadow-[var(--shadow-sm)]" : "text-faint hover:text-muted"
          }`}
        >
          <Icon className="h-3.5 w-3.5" />
        </button>
      ))}
    </div>
  );
}
