import { estimateDeliveryEta } from "@/lib/delivery-eta";

export function DeliveryEtaBadge({
  productType,
  minDays,
  maxDays,
  locale,
  className = "",
}: {
  productType?: string | null;
  minDays?: number | null;
  maxDays?: number | null;
  locale?: string;
  className?: string;
}) {
  const eta = estimateDeliveryEta({ productType, minDays, maxDays, locale });
  if (!eta) return null;
  return (
    <p className={`text-sm font-medium text-emerald-800 ${className}`}>
      <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />
      {eta.summary}
    </p>
  );
}
