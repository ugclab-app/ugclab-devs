const LABELS: Record<string, string> = {
  vip: "VIP",
  repeat: "Repeat",
  new: "No orders",
  active: "Active",
};

export function CustomerSegmentBadges({ segment }: { segment: string[] }) {
  if (!segment.length) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {segment.map((tag) => (
        <span
          key={tag}
          className={
            tag === "vip"
              ? "rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800"
              : tag === "repeat"
                ? "rounded-full bg-violet-50 px-2 py-0.5 text-xs font-medium text-violet-700"
                : tag === "new"
                  ? "rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600"
                  : "rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700"
          }
        >
          {LABELS[tag] ?? tag}
        </span>
      ))}
    </div>
  );
}
