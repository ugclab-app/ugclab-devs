import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Button, Input } from "@ugclab/ui";
import { getMessages } from "@ugclab/i18n";
import { publicCaptchaUrl, publicSignupUrl } from "@/lib/api-public";
import { currentPartnerRef } from "@/lib/partner-ref";
import { merchantAdminUrl } from "@/lib/urls";
import { TurnstileWidget, type TurnstileWidgetHandle } from "@/components/turnstile-widget";

const COUNTRY_CODES = [
  "US",
  "KG",
  "KZ",
  "RU",
  "GB",
  "DE",
  "FR",
  "CA",
  "AU",
  "AE",
  "TR",
  "IN",
] as const;

type SignupLocale = "en" | "ru" | "tr";

function homePath(locale: SignupLocale) {
  return locale === "en" ? "/" : `/${locale}`;
}

export function SignupPage({ locale = "en" }: { locale?: SignupLocale }) {
  const messages = getMessages(locale);
  const c = messages.common;
  const s = messages.signup;
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [slowHint, setSlowHint] = useState(false);
  const [turnstileSiteKey, setTurnstileSiteKey] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileWidgetHandle>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(publicCaptchaUrl())
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { turnstileSiteKey?: string | null } | null) => {
        if (!cancelled) setTurnstileSiteKey(data?.turnstileSiteKey ?? null);
      })
      .catch(() => {
        if (!cancelled) setTurnstileSiteKey(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function resetTurnstile() {
    if (!turnstileSiteKey) return;
    turnstileRef.current?.reset();
    setTurnstileToken(null);
  }

  function parseSignupError(data: unknown, status: number): string {
    if (status === 504 || status === 502) return s.errorTimeout;
    if (!data || typeof data !== "object") return s.errorFailed;
    const err = (data as { error?: unknown }).error;
    if (typeof err === "string") return err;
    if (err && typeof err === "object" && "formErrors" in err) {
      const fe = (err as { formErrors?: string[] }).formErrors;
      if (fe?.[0]) return fe[0];
    }
    return s.errorFailed;
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (turnstileSiteKey && !turnstileToken) {
      setError("Please complete the security check");
      return;
    }
    setLoading(true);
    setSlowHint(false);

    const form = new FormData(e.currentTarget);
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 55_000);
    const slowTimer = window.setTimeout(() => setSlowHint(true), 8_000);

    try {
      const res = await fetch(publicSignupUrl(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          name: form.get("name"),
          email: form.get("email"),
          password: form.get("password"),
          storeName: form.get("storeName"),
          country: form.get("country") || "US",
          ref: currentPartnerRef(),
          ...(turnstileSiteKey && turnstileToken ? { turnstileToken } : {}),
        }),
      });

      let data: { error?: unknown; redirect?: string; captcha?: boolean } = {};
      try {
        data = (await res.json()) as typeof data;
      } catch {
        data = {};
      }

      if (!res.ok) {
        setError(parseSignupError(data, res.status));
        // Tokens are single-use: ask for a fresh challenge after any failed attempt.
        resetTurnstile();
        return;
      }

      window.location.href =
        typeof data.redirect === "string"
          ? data.redirect
          : `${merchantAdminUrl}/login`;
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        setError(s.errorAbort);
      } else {
        setError(s.errorNetwork);
      }
      resetTurnstile();
    } finally {
      window.clearTimeout(timeout);
      window.clearTimeout(slowTimer);
      setSlowHint(false);
      setLoading(false);
    }
  }

  const defaultCountry = locale === "tr" ? "TR" : locale === "ru" ? "RU" : "US";

  return (
    <div className="mesh-hero flex min-h-screen">
      <div className="hidden flex-1 flex-col justify-between p-12 lg:flex">
        <Link to={homePath(locale)} className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-teal-600 to-emerald-600 text-sm font-bold text-white">
            T
          </span>
          <span className="text-lg font-bold">{c.brand}</span>
        </Link>
        <div>
          <h2 className="text-3xl font-bold leading-tight text-zinc-900">
            {s.headline}
            <br />
            <span className="text-gradient">{s.headlineAccent}</span>
          </h2>
          <p className="mt-4 max-w-md text-zinc-600">{s.sidebar}</p>
        </div>
        <p className="text-sm text-zinc-500">© {c.brand}</p>
      </div>

      <div className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-md rounded-2xl border border-zinc-200/80 bg-white p-8 shadow-xl shadow-brand-500/10">
          <h1 className="text-2xl font-bold text-zinc-900">{s.title}</h1>
          <p className="mt-2 text-sm text-zinc-600">{s.subtitle}</p>

          <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-4">
            <Input name="name" label={s.name} required />
            <Input
              name="email"
              type="email"
              label={s.email}
              required
              autoComplete="email"
              defaultValue={new URLSearchParams(window.location.search).get("email") ?? undefined}
            />
            <Input
              name="password"
              type="password"
              label={s.password}
              required
              minLength={8}
              autoComplete="new-password"
            />
            <Input name="storeName" label={s.storeName} required />
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-zinc-700">{s.country}</span>
              <select
                name="country"
                defaultValue={defaultCountry}
                className="ugclab-select w-full"
                required
              >
                {COUNTRY_CODES.map((code) => (
                  <option key={code} value={code}>
                    {s.countries[code as keyof typeof s.countries]} ({code})
                  </option>
                ))}
              </select>
            </label>
            {slowHint && loading ? (
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">{s.slowHint}</p>
            ) : null}
            {error ? (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
            ) : null}
            {turnstileSiteKey ? (
              <TurnstileWidget
                ref={turnstileRef}
                siteKey={turnstileSiteKey}
                onToken={setTurnstileToken}
                className="flex justify-center"
              />
            ) : null}
            <Button
              type="submit"
              disabled={loading || (!!turnstileSiteKey && !turnstileToken)}
              className="w-full py-3 shadow-lg shadow-brand-500/25"
            >
              {loading ? s.submitting : s.submit}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-zinc-500">
            {s.haveAccount}{" "}
            <a
              href={`${merchantAdminUrl}/login`}
              className="font-medium text-brand-600 hover:underline"
            >
              {s.signIn}
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
