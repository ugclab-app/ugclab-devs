import { useState } from "react";
import { Link } from "react-router-dom";
import { Button, Input } from "@ugclab/ui";
import { getMessages } from "@ugclab/i18n";
import { merchantAdminUrl } from "@/lib/urls";

const c = getMessages().common;

export function SignupPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/public/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        email: form.get("email"),
        password: form.get("password"),
        storeName: form.get("storeName"),
        country: form.get("country") || "US",
      }),
    });

    const data = (await res.json()) as { error?: string | { formErrors?: string[] }; redirect?: string };
    setLoading(false);

    if (!res.ok) {
      const msg =
        typeof data.error === "string"
          ? data.error
          : "Signup failed";
      setError(msg);
      return;
    }

    window.location.href = data.redirect ?? `${merchantAdminUrl}/login`;
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
            <Input name="email" type="email" label="Email" required />
            <Input name="password" type="password" label="Password" required minLength={8} />
            <Input name="storeName" label="Store name" required />
            <Input
              name="country"
              label="Country code"
              maxLength={2}
              defaultValue="US"
              placeholder="US"
            />
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
            <a href={`${merchantAdminUrl}/login`} className="font-medium text-violet-600 hover:underline">
              Sign in
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
