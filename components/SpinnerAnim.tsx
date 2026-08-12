interface SpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeMap = {
  sm: "h-4 w-4 border-2",
  md: "h-6 w-6 border-2",
  lg: "h-9 w-9 border-[3px]",
};

const Spinner = ({ size = "md", className = "" }: SpinnerProps) => {
  return (
    <div role="status" className={className}>
      <div
        className={`${sizeMap[size]} animate-spin rounded-full border-slate-200 border-t-cyan-500 dark:border-slate-700 dark:border-t-cyan-400`}
      />
      <span className="sr-only">Loading…</span>
    </div>
  );
};

export default Spinner;
