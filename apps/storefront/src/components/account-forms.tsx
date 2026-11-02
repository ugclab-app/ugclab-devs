import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { Button, Input } from "@ugclab/ui";
import { storeApi } from "@/api/client";
import { useStore } from "@/context/store";
import { useStoreParams } from "@/hooks/use-store-params";
import { storeHref } from "@/lib/store-href";
import { readLocalWishlist, writeLocalWishlist } from "@/components/wishlist-button";
import { TurnstileWidget, type TurnstileWidgetHandle } from "@/components/turnstile-widget";

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
  const { checkoutExtras } = useStore();
  const turnstileSiteKey = checkoutExtras.turnstileSiteKey ?? null;
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileWidgetHandle>(null);

  const login = useMutation({
    mutationFn: (fd: FormData) =>
      storeApi.accountLogin(
        tenant,
        String(fd.get("email")),
        String(fd.get("password")),
        turnstileSiteKey ? turnstileToken : undefined
      ),
    onSuccess: async () => {
      const ids = readLocalWishlist();
      if (ids.length) {
        try {
          await storeApi.wishlistAdd(tenant, ids);
          writeLocalWishlist([]);
        } catch {
          /* keep the local list if sync fails */
        }
      }
      const q = new URLSearchParams({ tenant, locale });
      navigate(`/account?${q.toString()}`);
    },
    onError: (e) => {
      setError(e instanceof Error ? e.message : "Login failed");
      // Tokens are single-use; request a fresh challenge after any failed attempt.
      if (turnstileSiteKey) {
        turnstileRef.current?.reset();
        setTurnstileToken(null);
      }
    },
  });

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        if (turnstileSiteKey && !turnstileToken) {
          setError("Please complete the security check");
          return;
        }
        login.mutate(new FormData(e.currentTarget));
      }}
    >
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      <Input name="email" type="email" label="Email" required />
      <Input name="password" type="password" label="Password" required />
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
        className="w-full"
        disabled={login.isPending || (!!turnstileSiteKey && !turnstileToken)}
      >
        {login.isPending ? "Signing in…" : "Sign in"}
      </Button>
      <p className="flex justify-between text-sm">
        <Link to={storeHref("/account/forgot", { locale, tenant })} className="text-[var(--store-primary)]">
          Forgot password
        </Link>
        <Link to={storeHref("/account/register", { locale, tenant })} className="text-[var(--store-primary)]">
          Create account
        </Link>
      </p>
    </form>
  );
}
