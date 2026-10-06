import { useState } from "react";
import { Link } from "react-router-dom";
import { Button, Input } from "@ugclab/ui";
import { getMessages } from "@ugclab/i18n";
import { publicSignupUrl } from "@/lib/api-public";
import { merchantAdminUrl } from "@/lib/urls";

const c = getMessages().common;

const COUNTRIES = [
  { code: "US", label: "United States" },
  { code: "KG", label: "Kyrgyzstan" },
  { code: "KZ", label: "Kazakhstan" },
  { code: "RU", label: "Russia" },
  { code: "GB", label: "United Kingdom" },
  { code: "DE", label: "Germany" },
  { code: "FR", label: "France" },
  { code: "CA", label: "Canada" },
  { code: "AU", label: "Australia" },
  { code: "AE", label: "UAE" },
  { code: "TR", label: "Turkey" },
  { code: "IN", label: "India" },
] as const;

function parseSignupError(data: unknown, status: number): string {
  if (status === 504 || status === 502) {
    return "Server timed out. Try again in a minute or contact support.";
  }
  if (!data || typeof data !== "object") return "Signup failed";
  const err = (data as { error?: unknown }).error;
  if (typeof err === "string") return err;
  if (err && typeof err === "object" && "formErrors" in err) {
    const fe = (err as { formErrors?: string[] }).formErrors;
    if (fe?.[0]) return fe[0];
  }
  return "Signup failed";
}

export function SignupPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [slowHint, setSlowHint] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
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
          ref: new URLSearchParams(window.location.search).get("ref") || undefined,
        }),
      });

      let data: { error?: unknown; redirect?: string } = {};
      try {
        data = (await res.json()) as typeof data;
      } catch {
        data = {};
      }

      if (!res.ok) {
        setError(parseSignupError(data, res.status));
        return;
      }

      window.location.href =
        typeof data.redirect === "string"
          ? data.redirect
          : `${merchantAdminUrl}/login`;
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        setError("Request timed out. The server may be starting up — try again.");
      } else {
        setError("Network error. Check your connection and try again.");
      }
    } finally {
      window.clearTimeout(timeout);
      window.clearTimeout(slowTimer);
      setSlowHint(false);
      setLoading(false);
    }
  }

  return (
    <div className="mesh-hero flex min-h-screen">
      <div className="hidden flex-1 flex-col justify-between p-12 lg:flex">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-teal-600 to-emerald-600 text-sm font-bold text-white">
            T
          </span>
          <span className="text-lg font-bold">{c.brand}</span>
        </Link>
        <div>
          <h2 className="text-3xl font-bold leading-tight text-zinc-900">
            Your global store
            <br />
            <span className="text-gradient">starts here.</span>
          </h2>
          <p className="mt-4 max-w-md text-zinc-600">
            Join thousands of creators selling digital products and merch worldwide.
          </p>
        </div>
        <p className="text-sm text-zinc-500">© {c.brand}</p>
      </div>

      <div className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-md rounded-2xl border border-zinc-200/80 bg-white p-8 shadow-xl shadow-violet-500/10">
          <h1 className="text-2xl font-bold text-zinc-900">Create your store</h1>
          <p className="mt-2 text-sm text-zinc-600">Free to start. No credit card required.</p>

          <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-4">
            <Input name="name" label="Your name" required />
            <Input name="email" type="email" label="Email" required autoComplete="email" />
            <Input
              name="password"
              type="password"
              label="Password"
              required
              minLength={8}
              autoComplete="new-password"
            />
            <Input name="storeName" label="Store name" required />
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-zinc-700">Country</span>
              <select
                name="country"
                defaultValue="US"
                className="ugclab-select w-full"
                required
              >
                {COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.label} ({c.code})
                  </option>
                ))}
              </select>
            </label>
            {slowHint && loading ? (
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
                Still working… First request can take up to a minute if the server was idle.
              </p>
            ) : null}
            {error ? (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
            ) : null}
            <Button
              type="submit"
              disabled={loading}
              className="w-full py-3 shadow-lg shadow-violet-500/25"
            >
              {loading ? "Creating…" : "Create store"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-zinc-500">
            Already have an account?{" "}
            <a
              href={`${merchantAdminUrl}/login`}
              className="font-medium text-violet-600 hover:underline"
            >
              Sign in
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
