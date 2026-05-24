import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";
import { CopyStoreUrl } from "@/components/copy-store-url";
import {
  getStorefrontDisplayHost,
  getStorefrontUrl,
} from "@/lib/storefront";
import {
  isStoreUrlStepDone,
  markStoreUrlStepDone,
} from "@/lib/onboarding-store-url";

type Domain = { verified: boolean };

export function OnboardingWizard({
  tenantSlug,
  productCount,
}: {
  tenantSlug: string;
  productCount: number;
}) {
  const [storeDone, setStoreDone] = useState(() => isStoreUrlStepDone(tenantSlug));

  const { data: stripe } = useQuery({
    queryKey: ["stripe-status"],
    queryFn: () => api.stripeStatus(),
  });

  const { data: domainsData } = useQuery({
    queryKey: ["domains"],
    queryFn: () => api.domains(),
  });

  const hasVerifiedDomain = ((domainsData?.domains ?? []) as Domain[]).some(
    (d) => d.verified
  );
  const storeUrl = getStorefrontUrl(tenantSlug);
  const displayHost = getStorefrontDisplayHost(tenantSlug);

  function acknowledgeStore() {
    markStoreUrlStepDone(tenantSlug);
    setStoreDone(true);
  }

  const morPayments = stripe?.paymentModel === "mor";

  const steps = [
    {
      id: "stripe",
      done: stripe?.paymentsReady,
      title: morPayments ? "Payments enabled" : "Connect Stripe",
      href: "/payments",
      cta: "Payments",
    },
    {
      id: "product",
      done: productCount > 0,
      title: "Add a product",
      href: "/products/new",
      cta: "Add product",
    },
    {
      id: "storefront",
      done: productCount > 0,
      title: "Customize storefront",
      href: "/storefront",
      cta: "Storefront",
    },
    {
      id: "checkout",
      done: false,
      title: "Test checkout",
      href: storeUrl,
      cta: "Open store",
      external: true,
    },
    {
      id: "store-url",
      done: storeDone || hasVerifiedDomain,
      title: "Your store address",
      href: "/settings?tab=domain",
      cta: "Custom domain",
      isStoreUrl: true,
    },
  ];

  const done = steps.filter((s) => s.done).length;
  if (done >= steps.length) return null;

  return (
    <div className="admin-card mb-8 overflow-hidden border-violet-200">
      <div className="border-b border-violet-100 bg-violet-50 px-6 py-4">
        <h2 className="font-semibold text-violet-900">Getting started</h2>
        <p className="mt-1 text-sm text-violet-700">
          {done}/{steps.length} complete
        </p>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-violet-200">
          <div
            className="h-full rounded-full bg-violet-600 transition-all"
            style={{ width: `${(done / steps.length) * 100}%` }}
          />
        </div>
      </div>
      <ol className="divide-y divide-zinc-100">
        {steps.map((step, i) => (
          <li key={step.id} className="px-6 py-3">
            <div className="flex items-center gap-4">
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  step.done
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-zinc-100 text-zinc-500"
                }`}
              >
                {step.done ? "✓" : i + 1}
              </span>
              <span className="flex-1 text-sm font-medium text-zinc-800">
                {step.title}
              </span>
              {"isStoreUrl" in step && step.isStoreUrl ? (
                <Link
                  to={step.href}
                  className="shrink-0 text-sm font-semibold text-violet-600 hover:underline"
                >
                  {step.cta}
                </Link>
              ) : step.external ? (
                <a
                  href={step.href}
                  target="_blank"
                  rel="noreferrer"
                  className="shrink-0 text-sm font-semibold text-violet-600 hover:underline"
                >
                  {step.cta}
                </a>
              ) : (
                <Link
                  to={step.href}
                  className="shrink-0 text-sm font-semibold text-violet-600 hover:underline"
                >
                  {step.cta}
                </Link>
              )}
            </div>
            {"isStoreUrl" in step && step.isStoreUrl ? (
              <div className="mt-3 ml-11 space-y-2 rounded-lg border border-zinc-100 bg-zinc-50/80 px-4 py-3">
                <p className="font-mono text-sm font-semibold text-violet-700">
                  {displayHost}
                </p>
                <p className="break-all font-mono text-xs text-zinc-500">{storeUrl}</p>
                <div className="flex flex-wrap gap-2 pt-1">
                  <CopyStoreUrl url={storeUrl} onCopied={acknowledgeStore} />
                  <a
                    href={storeUrl}
                    target="_blank"
                    rel="noreferrer"
                    onClick={acknowledgeStore}
                    className="ugclab-btn border border-zinc-200 bg-white px-3 py-2 text-xs"
                  >
                    Open store
                  </a>
                </div>
                <p className="text-xs text-zinc-500">
                  Subdomain is free. Custom domain is optional.
                </p>
              </div>
            ) : null}
          </li>
        ))}
      </ol>
    </div>
  );
}
