import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { Button, Input } from "@ugclab/ui";
import { storeApi } from "@/api/client";
import { useStoreParams } from "@/hooks/use-store-params";

export function AccountLookupForm({ initialEmail }: { initialEmail?: string }) {
  const { tenant, locale } = useStoreParams();
  const navigate = useNavigate();
  const [pending, setPending] = useState(false);

  return (
    <form
      className="rounded-xl border border-violet-100 bg-violet-50/30 p-5 space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        setPending(true);
        const email = new FormData(e.currentTarget).get("email");
        const q = new URLSearchParams({ tenant, locale, email: String(email) });
        navigate(`/account?${q.toString()}`);
        setPending(false);
      }}
    >
      <div>
        <p className="text-sm font-semibold text-zinc-900">Guest order lookup</p>
        <p className="mt-1 text-xs text-zinc-500">
          Enter the email you used at checkout. We&apos;ll show paid orders linked to that address.
        </p>
      </div>
      <Input name="email" type="email" label="Email" required defaultValue={initialEmail} />
      <Button type="submit" variant="secondary" className="w-full" disabled={pending}>
        {pending ? "Searching…" : "Find my orders"}
      </Button>
    </form>
  );
}

export function CustomerLoginForm() {
  const { tenant, locale } = useStoreParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  const login = useMutation({
    mutationFn: (fd: FormData) =>
      storeApi.accountLogin(
        tenant,
        String(fd.get("email")),
        String(fd.get("password"))
      ),
    onSuccess: () => {
      const q = new URLSearchParams({ tenant, locale });
      navigate(`/account?${q.toString()}`);
    },
    onError: (e) => setError(e instanceof Error ? e.message : "Login failed"),
  });

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        login.mutate(new FormData(e.currentTarget));
      }}
    >
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      <Input name="email" type="email" label="Email" required />
      <Input name="password" type="password" label="Password" required />
      <Button type="submit" className="w-full" disabled={login.isPending}>
        {login.isPending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
