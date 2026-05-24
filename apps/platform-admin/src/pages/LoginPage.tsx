import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/api/client";
import { useAuth } from "@/context/auth";
import { Button, Input } from "@ugclab/ui";

export default function LoginPage() {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const fd = new FormData(e.currentTarget);
    try {
      const data = await api.login(
        String(fd.get("email")),
        String(fd.get("password"))
      );
      if (data.user.role !== "SUPER_ADMIN") {
        await api.logout();
        setError("This account is not a platform administrator.");
        return;
      }
      setUser(data.user);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 p-6">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-8 text-slate-100 shadow-xl">
        <p className="text-xs font-semibold uppercase tracking-wider text-sky-400">
          Tescommerce Platform
        </p>
        <h1 className="mt-2 text-2xl font-bold">Founder admin</h1>
        <p className="mt-2 text-sm text-slate-400">
          Manage all stores, plans, and platform metrics.
        </p>
        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          {error ? (
            <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {error}
            </p>
          ) : null}
          <Input name="email" label="Email" type="email" required />
          <Input name="password" label="Password" type="password" required />
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Signing in…" : "Sign in"}
          </Button>
        </form>
        <p className="mt-6 text-center text-xs text-slate-500">
          Demo: founder@ugclab.store / founder1234
        </p>
      </div>
    </div>
  );
}
