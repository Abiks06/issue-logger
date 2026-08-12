"use client";

import { PropsWithChildren } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle } from "lucide-react";

const ErrorMessage = ({ children }: PropsWithChildren) => {
  return (
    <AnimatePresence>
      {children && (
        <motion.p
          initial={{ opacity: 0, y: -4, height: 0 }}
          animate={{ opacity: 1, y: 0, height: "auto" }}
          exit={{ opacity: 0, y: -4, height: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="flex items-center gap-1.5 text-sm font-medium text-rose-600 dark:text-rose-400"
        >
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          {children}
        </motion.p>
      )}
    </AnimatePresence>
  );
};

export default ErrorMessage;
