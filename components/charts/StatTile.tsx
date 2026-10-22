export default function StatTile({
  label,
  value,
  detail,
  tone,
}: {
  label: string;
  value: React.ReactNode;
  detail?: React.ReactNode;
  tone?: "danger";
}) {
  return (
    <div className="card p-4">
      <p className="text-xs font-medium text-muted">{label}</p>
      <p className={`mt-1.5 text-2xl font-semibold tabular-nums tracking-tight ${tone === "danger" ? "text-danger" : "text-fg"}`}>{value}</p>
      {detail && <p className="mt-0.5 text-[11px] text-faint">{detail}</p>}
    </div>
  );
}
