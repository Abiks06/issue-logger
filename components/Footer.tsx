"use client";

import { motion } from "framer-motion";
import { Bug, Heart } from "lucide-react";

const Footer = () => {
  return (
    <footer className="relative mt-auto border-t border-slate-200/50 bg-white/60 py-8 backdrop-blur-xl dark:border-slate-800/50 dark:bg-slate-950/60">
      {/* Top gradient accent line */}
      <div className="pointer-events-none absolute inset-x-0 -top-px mx-auto h-px w-2/3 bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent dark:via-cyan-500/25" />

      <div className="mx-auto flex w-full max-w-7xl flex-col items-center gap-4 px-4 sm:flex-row sm:justify-between sm:px-6 lg:px-8">
        {/* Brand */}
        <div className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-sm shadow-cyan-500/15">
            <Bug className="h-3.5 w-3.5" />
          </span>
          <span className="text-sm font-semibold tracking-tight text-slate-800 dark:text-slate-200">
            Issue<span className="text-cyan-600 dark:text-cyan-400">Logger</span>
          </span>
          <span className="rounded-full border border-slate-200/80 bg-slate-100/80 px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:border-slate-700/80 dark:bg-slate-800/80 dark:text-slate-400">
            v0.1.0
          </span>
        </div>

        {/* Made with love */}
        <p className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400">
          Made with
          <motion.span
            animate={{ scale: [1, 1.25, 1, 1.15, 1] }}
            transition={{ duration: 1.3, repeat: Infinity, ease: "easeInOut" }}
            className="inline-flex text-rose-500 drop-shadow-[0_0_6px_rgba(244,63,94,0.45)]"
          >
            <Heart className="h-4 w-4 fill-current" />
          </motion.span>
          by
          <span className="font-semibold text-slate-700 dark:text-slate-200">Abiks</span>
        </p>

        {/* Copyright */}
        <p className="text-xs text-slate-500 dark:text-slate-500">
          © {new Date().getFullYear()} Issue Logger. All rights reserved.
        </p>
      </div>
    </footer>
  );
};

export default Footer;
