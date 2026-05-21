"use client";

import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";
import Link from "next/link";
import { Button, Input } from "@ugclab/ui";

const platformUrl =
  process.env.NEXT_PUBLIC_PLATFORM_URL ?? "http://localhost:3000";

function LoginForm() {
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const emailDefault = params.get("email") ?? "";

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");

    if (!email || !password) {
      setError("Please enter your email and password.");
      return;
    }

    setLoading(true);

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (res?.error || !res?.ok) {
      setError(
        res?.error === "Configuration"
          ? "AUTH_SECRET missing — restart: npm run dev (see apps/merchant-admin/.env.local)"
          : "Invalid email or password"
      );
      return;
    }

    window.location.href = params.get("callbackUrl") ?? "/dashboard";
  }

  return (
    <div className="mesh-auth flex min-h-screen">
      <div className="relative hidden w-[45%] flex-col justify-between overflow-hidden bg-gradient-to-br from-violet-600 via-indigo-600 to-violet-800 p-12 text-white lg:flex">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute -left-20 -top-20 h-72 w-72 rounded-full bg-white/20 blur-3xl" />
          <div className="absolute -bottom-32 -right-20 h-96 w-96 rounded-full bg-indigo-300/30 blur-3xl" />
        </div>

        <Link
          href={platformUrl}
          className="relative z-10 flex items-center gap-2.5"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 text-sm font-bold backdrop-blur">
            U
          </span>
          <span className="text-lg font-bold">UGCLab Store</span>
        </Link>

        <div className="relative z-10">
          <p className="text-sm font-medium uppercase tracking-wider text-violet-200">
            Merchant dashboard
          </p>
          <h2 className="mt-4 text-4xl font-bold leading-tight">
            Manage your store
            <br />
            from one place.
          </h2>
          <ul className="mt-8 space-y-4 text-sm text-violet-100">
            {[
              "Track orders and revenue in real time",
              "Sell physical & digital products globally",
              "Customize your storefront in minutes",
            ].map((item) => (
              <li key={item} className="flex items-center gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/20 text-xs">
                  ✓
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative z-10 text-sm text-violet-200">
          © {new Date().getFullYear()} UGCLab Store
        </p>
      </div>

      <div className="flex flex-1 flex-col">
        <div className="flex items-center justify-between p-6 lg:justify-end">
          <Link
            href={platformUrl}
            className="flex items-center gap-2 lg:hidden"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 text-sm font-bold text-white">
              U
            </span>
            <span className="font-bold text-zinc-900">UGCLab Store</span>
          </Link>
          <Link
            href={`${platformUrl}/signup`}
            className="text-sm font-medium text-violet-600 hover:text-violet-700"
          >
            Create store →
          </Link>
        </div>

        <div className="flex flex-1 items-center justify-center px-6 pb-12">
          <div className="auth-card w-full max-w-md">
            <div className="mb-8">
              <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
                Welcome back
              </h1>
              <p className="mt-2 text-sm text-zinc-600">
                Sign in to your merchant account to manage products and orders.
              </p>
            </div>

            <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
              <Input
                name="email"
                type="email"
                label="Email"
                placeholder="you@example.com"
                defaultValue={emailDefault}
                required
                autoComplete="email"
              />
              <div>
                <Input
                  name="password"
                  type="password"
                  label="Password"
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                />
                <p className="mt-2 text-right">
                  <a
                    href="#"
                    className="text-xs font-medium text-violet-600 hover:underline"
                    onClick={(e) => e.preventDefault()}
                  >
                    Forgot password?
                  </a>
                </p>
              </div>

              {error ? (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              ) : null}

              <Button
                type="submit"
                disabled={loading}
                className="ugclab-btn-block"
              >
                {loading ? "Signing in…" : "Sign in"}
              </Button>
            </form>

            <p className="mt-8 text-center text-sm text-zinc-500">
              Don&apos;t have a store?{" "}
              <Link
                href={`${platformUrl}/signup`}
                className="font-semibold text-violet-600 hover:underline"
              >
                Get started free
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="mesh-auth flex min-h-screen items-center justify-center">
          <p className="text-sm text-zinc-500">Loading…</p>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
