"use client";

import { PropsWithChildren } from "react";

const ErrorMessage = ({ children }: PropsWithChildren) => {
  if (!children) return null;
  return <p className="text-sm font-medium text-rose-700 dark:text-rose-400">{children}</p>;
};

export default ErrorMessage;
