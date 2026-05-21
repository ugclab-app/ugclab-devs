import { Link } from "react-router-dom";
import { api } from "@/api/client";
import { useAuth } from "@/context/auth";

const platformUrl =
  import.meta.env.VITE_PLATFORM_URL ?? "http://localhost:3000";
const platformAdminUrl =
  import.meta.env.VITE_PLATFORM_ADMIN_URL ?? "http://localhost:3003";

export default function NoStorePage() {
  const { user, clear } = useAuth();
  const isFounder = user?.role === "SUPER_ADMIN";

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center text-center">
      <h1 className="text-2xl font-bold text-zinc-900">No store on this account</h1>
      <p className="mt-3 text-sm text-zinc-600">
        {isFounder ? (
          <>
            You are signed in as a <strong>platform admin</strong> (
            {user?.email}). Founder accounts manage tenants in Platform Admin,
            not the merchant dashboard.
          </>
        ) : (
          <>
            This login ({user?.email}) is not linked to a store yet. Create one
            on the platform or sign in with a merchant account.
          </>
        )}
      </p>

      <div className="mt-8 flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
        {isFounder ? (
          <a
            href={platformAdminUrl}
            className="ugclab-btn ugclab-btn-primary px-5 py-2.5 text-center"
          >
            Open Platform Admin
          </a>
        ) : (
          <a
            href={`${platformUrl}/signup`}
            className="ugclab-btn ugclab-btn-primary px-5 py-2.5 text-center"
          >
            Create a store
          </a>
        )}
        <Link
          to="/login"
          onClick={async () => {
            await api.logout();
            clear();
          }}
          className="ugclab-btn border border-zinc-200 bg-white px-5 py-2.5 text-center text-sm"
        >
          Sign out
        </Link>
      </div>

      {!isFounder ? (
        <p className="mt-8 rounded-lg border border-violet-200 bg-violet-50 px-4 py-3 text-left text-sm text-violet-900">
          <span className="font-semibold">Demo merchant:</span>
          <br />
          demo@ugclab.store / demo1234
          <br />
          <span className="text-violet-700">
            Run <code className="rounded bg-white/80 px-1">npm run db:seed</code>{" "}
            if the demo store is missing.
          </span>
        </p>
      ) : null}
    </div>
  );
}
