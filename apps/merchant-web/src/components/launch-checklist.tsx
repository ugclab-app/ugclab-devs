import { Link } from "react-router-dom";
import { getStorefrontUrl } from "@/lib/storefront";

export function LaunchChecklist({
  tenantSlug,
  productCount,
}: {
  tenantSlug: string;
  productCount: number;
}) {
  const storeUrl = getStorefrontUrl(tenantSlug);
  const hasProducts = productCount > 0;

  const steps = [
    {
      done: hasProducts,
      title: "Add your first product",
      desc: "Physical or digital — customers need something to buy.",
      href: "/products/new",
      cta: "Add product",
    },
    {
      done: hasProducts,
      title: "Preview your storefront",
      desc: "See how buyers will experience your brand.",
      href: storeUrl,
      cta: "Open store",
      external: true,
    },
    {
      done: hasProducts,
      title: "Share your store link",
      desc: "Post on social, bio, or email — start selling globally.",
      href: storeUrl,
      cta: "Get link",
      external: true,
    },
  ];

  const completed = steps.filter((s) => s.done).length;
  const progress = Math.round((completed / steps.length) * 100);

  return (
    <div className="admin-card overflow-hidden">
      <div className="border-b border-zinc-100 bg-gradient-to-r from-violet-600 to-indigo-600 px-6 py-5 text-white">
        <p className="text-sm font-medium text-violet-100">Launch your store</p>
        <h2 className="mt-1 text-lg font-bold">
          {hasProducts
            ? "Your store is ready for customers"
            : "3 steps to go live"}
        </h2>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/20">
          <div
            className="h-full rounded-full bg-white transition-all"
            style={{ width: `${hasProducts ? 100 : progress}%` }}
          />
        </div>
      </div>
      <ul className="divide-y divide-zinc-100">
        {steps.map((step, i) => (
          <li key={step.title} className="flex items-start gap-4 px-6 py-4">
            <span
              className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                step.done
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-zinc-100 text-zinc-500"
              }`}
            >
              {step.done ? "✓" : i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-zinc-900">{step.title}</p>
              <p className="mt-0.5 text-sm text-zinc-500">{step.desc}</p>
            </div>
            {step.external ? (
              <a
                href={step.href}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 text-sm font-semibold text-violet-600 hover:text-violet-700"
              >
                {step.cta} →
              </a>
            ) : (
              <Link
                to={step.href}
                className="shrink-0 text-sm font-semibold text-violet-600 hover:text-violet-700"
              >
                {step.cta} →
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}