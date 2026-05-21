import { Link } from "react-router-dom";
import { useStore } from "@/context/store";
import { storeHref } from "@/lib/store-href";
import { CustomerLoginForm } from "@/components/account-forms";

export function AccountLoginPage() {
  const ctx = useStore();
  const nav = { locale: ctx.locale, tenant: ctx.tenant.slug };

  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-3xl font-bold">Sign in</h1>
      <p className="mt-2 text-sm text-zinc-500">
        <Link to={storeHref("/account", nav)} className="text-[var(--store-primary)]">
          ← Back to account
        </Link>
      </p>
      <div className="mt-8 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <CustomerLoginForm />
      </div>
    </div>
  );
}
