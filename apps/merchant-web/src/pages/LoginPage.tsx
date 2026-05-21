import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api, type TenantDto, type UserDto } from "@/api/client";
import { useAuth } from "@/context/auth";
import { Button, Input } from "@ugclab/ui";

const platformUrl =
  import.meta.env.VITE_PLATFORM_URL ?? "http://localhost:3000";

export default function LoginPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { setSession } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [needs2fa, setNeeds2fa] = useState(false);
  const [email, setEmail] = useState(params.get("email") ?? "");
  const [password, setPassword] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    const emailVal = String(form.get("email") ?? "").trim();
    const passwordVal = String(form.get("password") ?? "");
    const totpCode = String(form.get("totpCode") ?? "").trim();
    if (!emailVal || !passwordVal) {
      setError("Please enter email and password.");
      return;
    }
    setEmail(emailVal);
    setPassword(passwordVal);
    setLoading(true);
    try {
      const data = await api.login(emailVal, passwordVal, totpCode || undefined);
      if ("requires2fa" in data && data.requires2fa) {
        setNeeds2fa(true);
        setError(null);
        return;
      }
      const ok = data as { user: UserDto; tenant: TenantDto | null };
      setSession(ok.user, ok.tenant);
      const invite = params.get("invite");
      if (invite && ok.tenant) {
        try {
          await api.acceptInvite(invite);
        } catch {
          /* ignore invalid invite */
        }
      }
      if (!ok.tenant) {
        navigate("/no-store", { replace: true });
        return;
      }
      navigate(params.get("callbackUrl") ?? "/dashboard", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mesh-auth flex min-h-screen items-center justify-center p-6">
      <div className="auth-card w-full max-w-md">
        <h1 className="text-2xl font-bold text-zinc-900">Sign in</h1>
        <p className="mt-2 text-sm text-zinc-500">
          <a href={platformUrl} className="text-violet-600 hover:underline">
            UGCLab Store
          </a>{" "}
          merchant dashboard
        </p>
        <form onSubmit={onSubmit} className="mt-8 space-y-4" noValidate>
          {error ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              {error}
            </p>
          ) : null}
          {needs2fa ? (
            <p className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-sm text-violet-900">
              Enter the 6-digit code from your authenticator app.
            </p>
          ) : null}
          <Input
            name="email"
            label="Email"
            type="email"
            defaultValue={email}
            required
          />
          <Input name="password" label="Password" type="password" defaultValue={password} required />
          {needs2fa ? (
            <Input name="totpCode" label="2FA code" type="text" inputMode="numeric" maxLength={6} required autoFocus />
          ) : null}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Signing in…" : needs2fa ? "Verify & sign in" : "Sign in"}
          </Button>
        </form>
        <p className="mt-4 text-center text-xs text-zinc-500">
          Demo: demo@ugclab.store / demo1234
        </p>
      </div>
    </div>
  );
}
