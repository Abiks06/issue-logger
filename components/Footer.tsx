"use client";

const BEAT = "animate-[heartbeat_1.3s_ease-in-out_infinite]";

const Footer = () => {
  return (
    <footer className="relative mt-auto border-t border-slate-200/80 bg-white/70 py-8 shadow-[0_-4px_16px_-12px_rgba(15,23,42,0.08)] backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/70 dark:shadow-none">
      {/* Top glow accent */}
      <div className="pointer-events-none absolute inset-x-0 -top-px mx-auto h-px w-2/3 bg-linear-to-r from-transparent via-cyan-400/60 to-transparent dark:via-cyan-500/40" />

      <div className="mx-auto flex w-full max-w-7xl flex-col items-center gap-4 px-4 sm:flex-row sm:justify-between sm:px-6 lg:px-8">
        {/* Brand */}
        <div className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-linear-to-br from-cyan-500 to-blue-600 text-[13px] text-white shadow-sm shadow-cyan-500/20">
            🐞
          </span>
          <span className="text-sm font-semibold tracking-tight text-slate-900 dark:text-slate-200">
            Issue Logger
          </span>
          <span className="rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
            v0.1.0
          </span>
        </div>

        {/* Made with love */}
        <p className="flex items-center gap-1.5 text-sm text-slate-700 dark:text-slate-400">
          Made with
          <span className={`inline-block ${BEAT} text-rose-500 drop-shadow-[0_0_6px_rgba(244,63,94,0.55)]`} aria-hidden="true">
            ❤️
          </span>
          by
          <span className="font-semibold text-slate-700 dark:text-slate-200">Abiks</span>
        </p>

        {/* Copyright */}
        <p className="text-xs text-slate-600 dark:text-slate-500">
          © {new Date().getFullYear()} Issue Logger. All rights reserved.
        </p>
      </div>
    </footer>
  );
};

export default Footer;
