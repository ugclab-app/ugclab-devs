import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, type UserDto } from "@/api/client";
import { useAuth } from "@/context/auth";
import { isPlatformStaff } from "@/lib/platform-permissions";
import { Button, Input } from "@ugclab/ui";

export default function LoginPage() {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [needs2fa, setNeeds2fa] = useState(false);
  const [email, setEmail] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const emailVal = String(fd.get("email") ?? "").trim();
    const passwordVal = String(fd.get("password") ?? "");
    const totpCode = String(fd.get("totpCode") ?? "").trim();
    setEmail(emailVal);
    setPending(true);
    try {
      const data = await api.login(emailVal, passwordVal, totpCode || undefined);
      if ("requires2fa" in data && data.requires2fa) {
        setNeeds2fa(true);
        return;
      }
      const user = (data as { user: UserDto }).user;
      if (!isPlatformStaff(user.role)) {
        await api.logout();
        setError("This account is not authorized for platform admin.");
        return;
      }
      setUser(user);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="platform-login-bg flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-600 text-lg font-bold text-white shadow-lg shadow-sky-500/30">
            T
          </span>
          <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-sky-600">
            Tescommerce Platform
          </p>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">Platform admin</h1>
          <p className="mt-2 text-sm text-slate-600">
            Stores, payouts, users, and platform settings.
          </p>
        </div>
        <div className="platform-card p-8 shadow-lg">
          <form onSubmit={onSubmit} className="space-y-4">
            {error ? (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                {error}
              </p>
            ) : null}
            {needs2fa ? (
              <p className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-900">
                Enter the 6-digit code from your authenticator app.
              </p>
            ) : null}
            <Input
              name="email"
              label="Email"
              type="email"
              defaultValue={email}
              required
              autoComplete="username"
            />
            <Input
              name="password"
              label="Password"
              type="password"
              required
              autoComplete={needs2fa ? "one-time-code" : "current-password"}
            />
            {needs2fa ? (
              <Input
                name="totpCode"
                label="2FA code"
                type="text"
                inputMode="numeric"
                maxLength={6}
                required
                autoFocus
              />
            ) : null}
            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? "Signing in…" : needs2fa ? "Verify & sign in" : "Sign in"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
