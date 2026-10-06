import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api, type TenantDto, type UserDto } from "@/api/client";
import { useAuth } from "@/context/auth";
import { Button, Input } from "@ugclab/ui";
import { useAdminT } from "@/hooks/use-admin-t";

const platformUrl =
  import.meta.env.VITE_PLATFORM_URL ?? "http://localhost:3000";
const API = (import.meta.env.VITE_API_URL ?? "/api").replace(/\/$/, "");
const supportEmail =
  import.meta.env.VITE_SUPPORT_EMAIL ?? "info@tescommerce.com";

export default function LoginPage() {
  const { ta } = useAdminT();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { setSession } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [magicLoading, setMagicLoading] = useState(false);
  const [slowHint, setSlowHint] = useState(false);
  const [needs2fa, setNeeds2fa] = useState(false);
  const [email, setEmail] = useState(params.get("email") ?? "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [googleEnabled, setGoogleEnabled] = useState(false);
  const [magicToken, setMagicToken] = useState<string | null>(null);

  useEffect(() => {
    api
      .oauthProviders()
      .then((r) => setGoogleEnabled(r.google === true))
      .catch(() => setGoogleEnabled(false));
  }, []);

  useEffect(() => {
    const oauthErr = params.get("oauth_error");
    if (oauthErr) setError(oauthErr);
  }, [params]);

  useEffect(() => {
    const token = params.get("impersonate");
    if (!token) return;
    setLoading(true);
    api
      .impersonate(token)
      .then((data) => {
        setSession(data.user, data.tenant);
        if (!data.tenant) {
          navigate("/no-store", { replace: true });
          return;
        }
        const next = params.get("next");
        const safeNext =
          next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
        navigate(safeNext, { replace: true });
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : ta("auth.impersonationFailed"));
      })
      .finally(() => setLoading(false));
  }, [params, navigate, setSession, ta]);

  useEffect(() => {
    const oauth = params.get("oauth");
    if (!oauth) return;
    setLoading(true);
    api
      .completeOauth(oauth)
      .then((data) => {
        setSession(data.user, data.tenant);
        if (!data.tenant) {
          navigate("/no-store", { replace: true });
          return;
        }
        navigate("/dashboard", { replace: true });
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : ta("auth.loginFailed"));
      })
      .finally(() => setLoading(false));
  }, [params, navigate, setSession, ta]);

  useEffect(() => {
    const magic = params.get("magic");
    if (!magic) return;
    setMagicToken(magic);
    setLoading(true);
    setError(null);
    api
      .completeMagicLink(magic, undefined, rememberMe)
      .then((data) => {
        if ("requires2fa" in data && data.requires2fa) {
          setNeeds2fa(true);
          setEmail(data.email);
          setInfo(ta("auth.twoFaHint"));
          return;
        }
        const ok = data as { user: UserDto; tenant: TenantDto | null };
        setSession(ok.user, ok.tenant);
        if (!ok.tenant) {
          navigate("/no-store", { replace: true });
          return;
        }
        navigate("/dashboard", { replace: true });
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : ta("auth.loginFailed"));
        setMagicToken(null);
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on magic token
  }, [params]);

  async function finishLogin(data: { user: UserDto; tenant: TenantDto | null }) {
    setSession(data.user, data.tenant);
    const invite = params.get("invite");
    if (invite && data.tenant) {
      try {
        await api.acceptInvite(invite);
      } catch {
        /* ignore */
      }
    }
    if (!data.tenant) {
      navigate("/no-store", { replace: true });
      return;
    }
    navigate(params.get("callbackUrl") ?? "/dashboard", { replace: true });
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    const form = new FormData(e.currentTarget);
    const emailVal = String(form.get("email") ?? "").trim();
    const passwordVal = String(form.get("password") ?? "");
    const totpCode = String(form.get("totpCode") ?? "").trim();

    if (magicToken && needs2fa) {
      if (!totpCode) {
        setError(ta("auth.twoFaHint"));
        return;
      }
      setLoading(true);
      try {
        const data = await api.completeMagicLink(magicToken, totpCode, rememberMe);
        if ("requires2fa" in data && data.requires2fa) {
          setNeeds2fa(true);
          return;
        }
        await finishLogin(data as { user: UserDto; tenant: TenantDto | null });
      } catch (err) {
        setError(err instanceof Error ? err.message : ta("auth.loginFailed"));
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!emailVal || !passwordVal) {
      setError(ta("auth.enterEmailPassword"));
      return;
    }
    setEmail(emailVal);
    setPassword(passwordVal);
    setLoading(true);
    setSlowHint(false);
    const slowTimer = window.setTimeout(() => setSlowHint(true), 8_000);
    try {
      const data = await api.login(
        emailVal,
        passwordVal,
        totpCode || undefined,
        rememberMe
      );
      if ("requires2fa" in data && data.requires2fa) {
        setNeeds2fa(true);
        setError(null);
        return;
      }
      await finishLogin(data as { user: UserDto; tenant: TenantDto | null });
    } catch (err) {
      setError(err instanceof Error ? err.message : ta("auth.loginFailed"));
    } finally {
      window.clearTimeout(slowTimer);
      setSlowHint(false);
      setLoading(false);
    }
  }

  async function onMagicLink() {
    setError(null);
    setInfo(null);
    const emailVal = email.trim();
    if (!emailVal) {
      setError(ta("auth.magicLinkNeedEmail"));
      return;
    }
    setMagicLoading(true);
    try {
      await api.requestMagicLink(emailVal);
      setInfo(ta("auth.magicLinkSent"));
    } catch (err) {
      setError(err instanceof Error ? err.message : ta("auth.loginFailed"));
    } finally {
      setMagicLoading(false);
    }
  }

  return (
    <div className="mesh-auth flex min-h-screen items-center justify-center p-6">
      <div className="auth-card w-full max-w-md">
        <h1 className="text-2xl font-bold text-zinc-900">{ta("auth.signIn")}</h1>
        <p className="mt-2 text-sm text-zinc-500">
          <a href={platformUrl} className="text-violet-600 hover:underline">
            Tescommerce
          </a>{" "}
          {ta("auth.merchantDashboard")}
        </p>

        <div className={`${googleEnabled ? "mt-6" : "mt-8"} space-y-3`}>
          {googleEnabled ? (
            <a
              href={`${API}/auth/google`}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden>
                <path
                  fill="#EA4335"
                  d="M12 10.2v3.6h5.1c-.2 1.2-1.5 3.6-5.1 3.6-3.1 0-5.6-2.5-5.6-5.6S8.9 6.2 12 6.2c1.8 0 3 .7 3.7 1.4l2.5-2.4C16.7 3.7 14.6 2.8 12 2.8 6.9 2.8 2.8 6.9 2.8 12S6.9 21.2 12 21.2c5.2 0 8.6-3.6 8.6-8.7 0-.6-.1-1-.1-1.5H12z"
                />
              </svg>
              Continue with Google
            </a>
          ) : null}
          <button
            type="button"
            onClick={() => void onMagicLink()}
            disabled={magicLoading || loading}
            className="flex w-full items-center justify-center rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-800 hover:bg-zinc-50 disabled:opacity-50"
          >
            {magicLoading ? ta("auth.magicLinkSending") : ta("auth.magicLink")}
          </button>
        </div>
        <p className="mt-4 text-center text-xs text-zinc-400">
          {ta("auth.orContinueWith")}
        </p>

        <form onSubmit={onSubmit} className="mt-4 space-y-4" noValidate>
          {slowHint && loading ? (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              Still signing in… First request after idle can take up to a minute.
            </p>
          ) : null}
          {info ? (
            <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
              {info}
            </p>
          ) : null}
          {error ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              {error}
            </p>
          ) : null}
          {needs2fa ? (
            <p className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-sm text-violet-900">
              {ta("auth.twoFaHint")}
            </p>
          ) : null}
          <Input
            name="email"
            label={ta("auth.email")}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required={!magicToken}
            autoComplete="email"
          />
          {!magicToken || !needs2fa ? (
            <div className="relative">
              <Input
                name="password"
                label={ta("auth.password")}
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required={!magicToken}
                autoComplete="current-password"
                className="pr-11"
              />
              <button
                type="button"
                className="absolute bottom-2.5 right-2.5 rounded-md p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={
                  showPassword ? ta("auth.hidePassword") : ta("auth.showPassword")
                }
              >
                {showPassword ? (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          ) : null}
          <div className="-mt-2 flex items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-sm text-zinc-600">
              <input
                type="checkbox"
                className="rounded border-zinc-300 text-violet-600 focus:ring-violet-500"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              {ta("auth.rememberMe")}
            </label>
            <Link
              to={
                email.trim()
                  ? `/forgot-password?email=${encodeURIComponent(email.trim())}`
                  : "/forgot-password"
              }
              className="text-sm font-medium text-violet-600 hover:underline"
            >
              {ta("auth.forgotPassword")}
            </Link>
          </div>
          {needs2fa ? (
            <Input
              name="totpCode"
              label={ta("auth.twoFaCode")}
              type="text"
              inputMode="numeric"
              maxLength={6}
              required
              autoFocus
            />
          ) : null}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading
              ? ta("auth.signingIn")
              : needs2fa
                ? ta("auth.verifySignIn")
                : ta("auth.signIn")}
          </Button>
        </form>

        <div className="mt-6 space-y-2 text-center text-sm">
          <a
            href={`${platformUrl}/signup`}
            className="block font-medium text-violet-600 hover:underline"
          >
            {ta("auth.createAccount")}
          </a>
          <a
            href={`mailto:${supportEmail}`}
            className="block text-zinc-500 hover:text-zinc-700 hover:underline"
          >
            {ta("auth.helpSupport")}
          </a>
        </div>
      </div>
    </div>
  );
}
