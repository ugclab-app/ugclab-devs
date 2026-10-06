import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "@/api/client";
import { Button, Input } from "@ugclab/ui";
import { useAdminT } from "@/hooks/use-admin-t";

const platformUrl =
  import.meta.env.VITE_PLATFORM_URL ?? "http://localhost:3000";

export default function ForgotPasswordPage() {
  const { ta } = useAdminT();
  const [params] = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    const emailVal = String(form.get("email") ?? "").trim();
    if (!emailVal) {
      setError(ta("auth.enterEmail"));
      return;
    }
    setLoading(true);
    try {
      await api.forgotPassword(emailVal);
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : ta("auth.loginFailed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mesh-auth flex min-h-screen items-center justify-center p-6">
      <div className="auth-card w-full max-w-md">
        <h1 className="text-2xl font-bold text-zinc-900">
          {ta("auth.forgotPasswordTitle")}
        </h1>
        <p className="mt-2 text-sm text-zinc-500">
          <a href={platformUrl} className="text-violet-600 hover:underline">
            Tescommerce
          </a>{" "}
          · {ta("auth.forgotPasswordDesc")}
        </p>

        {sent ? (
          <div className="mt-8 space-y-4">
            <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
              {ta("auth.forgotPasswordSent")}
            </p>
            <Link
              to="/login"
              className="inline-block text-sm font-medium text-violet-600 hover:underline"
            >
              {ta("auth.backToSignIn")}
            </Link>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="mt-8 space-y-4" noValidate>
            {error ? (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                {error}
              </p>
            ) : null}
            <Input
              name="email"
              label={ta("auth.email")}
              type="email"
              defaultValue={params.get("email") ?? ""}
              required
              autoFocus
            />
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? ta("auth.sendingResetLink") : ta("auth.sendResetLink")}
            </Button>
            <p className="text-center text-sm">
              <Link to="/login" className="font-medium text-violet-600 hover:underline">
                {ta("auth.backToSignIn")}
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
