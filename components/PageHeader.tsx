export default function PageHeader({
  title,
  subtitle,
  children,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <header className="sticky top-0 z-20 flex min-h-14 flex-wrap items-center gap-3 border-b border-line bg-bg/85 px-4 py-2.5 backdrop-blur sm:px-6">
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-[15px] font-semibold">{title}</h1>
        {subtitle && <p className="truncate text-xs text-muted">{subtitle}</p>}
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </header>
  );
}
