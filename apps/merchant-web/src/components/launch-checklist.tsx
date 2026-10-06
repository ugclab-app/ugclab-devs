import { Link } from "react-router-dom";
import { getStorefrontUrl } from "@/lib/storefront";
import { useAdminT } from "@/hooks/use-admin-t";

export function LaunchChecklist({
  tenantSlug,
  productCount,
}: {
  tenantSlug: string;
  productCount: number;
}) {
  const { ta, t } = useAdminT();
  const storeUrl = getStorefrontUrl(tenantSlug);
  const hasProducts = productCount > 0;

  const steps = [
    {
      done: hasProducts,
      title: ta("launch.product"),
      desc: ta("launch.productDesc"),
      href: "/products/new",
      cta: ta("productsPage.addProduct"),
    },
    {
      done: hasProducts,
      title: ta("launch.storefront"),
      desc: ta("launch.storefrontDesc"),
      href: "/storefront",
      cta: t.nav.storefront,
    },
    {
      done: hasProducts,
      title: ta("launch.domain"),
      desc: ta("launch.domainDesc"),
      href: "/settings?tab=domain",
      cta: ta("onboarding.customDomain"),
    },
  ];

  const completed = steps.filter((s) => s.done).length;
  const progress = Math.round((completed / steps.length) * 100);

  return (
    <div className="admin-card overflow-hidden">
      <div className="border-b border-zinc-100 bg-gradient-to-r from-violet-600 to-indigo-600 px-6 py-5 text-white">
        <p className="text-sm font-medium text-violet-100">{ta("launch.title")}</p>
        <h2 className="mt-1 text-lg font-bold">
          {hasProducts ? ta("storeLive") : ta("launch.payments")}
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
            <Link
              to={step.href}
              className="shrink-0 text-sm font-semibold text-violet-600 hover:text-violet-700"
            >
              {step.cta} →
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
