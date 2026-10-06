import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api } from "@/api/client";
import { Button, Input } from "@ugclab/ui";
import { useAdminT } from "@/hooks/use-admin-t";

export default function ResetPasswordPage() {
  const { ta } = useAdminT();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const [error, setError] = useState<string | null>(
    token ? null : "Invalid or expired reset link"
  );
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    const password = String(form.get("password") ?? "");
    const confirm = String(form.get("confirm") ?? "");
    if (password.length < 8) {
      setError(ta("auth.passwordTooShort"));
      return;
    }
    if (password !== confirm) {
      setError(ta("auth.passwordsDoNotMatch"));
      return;
    }
    if (!token) {
      setError("Invalid or expired reset link");
      return;
    }
    setLoading(true);
    try {
      await api.resetPassword(token, password);
      setDone(true);
      window.setTimeout(() => navigate("/login", { replace: true }), 1500);
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
          {ta("auth.resetPasswordTitle")}
        </h1>
        <p className="mt-2 text-sm text-zinc-500">{ta("auth.resetPasswordDesc")}</p>

        {done ? (
          <div className="mt-8 space-y-4">
            <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
              {ta("auth.resetPasswordSuccess")}
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
              name="password"
              label={ta("auth.newPassword")}
              type="password"
              required
              autoFocus
              minLength={8}
            />
            <Input
              name="confirm"
              label={ta("auth.confirmPassword")}
              type="password"
              required
              minLength={8}
            />
            <Button type="submit" className="w-full" disabled={loading || !token}>
              {loading ? ta("auth.resettingPassword") : ta("auth.resetPassword")}
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
