import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { storeApi, type CustomerAddress } from "@/api/client";

const emptyAddress = {
  label: "",
  name: "",
  phone: "",
  address1: "",
  address2: "",
  city: "",
  postal: "",
  country: "US",
  isDefault: true,
};

export function AccountProfile({
  tenant,
  name,
  email,
}: {
  tenant: string;
  name: string | null;
  email: string;
}) {
  const qc = useQueryClient();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState(emptyAddress);

  const { data } = useQuery({
    queryKey: ["account-addresses", tenant],
    queryFn: () => storeApi.addresses(tenant),
  });
  const addresses = data?.addresses ?? [];

  const profile = useMutation({
    mutationFn: (body: { name?: string; currentPassword?: string; newPassword?: string }) =>
      storeApi.updateProfile(tenant, body),
    onSuccess: () => {
      setMessage("Profile saved");
      setError(null);
      qc.invalidateQueries({ queryKey: ["account-session", tenant] });
    },
    onError: (e) => setError(e instanceof Error ? e.message : "Could not save"),
  });

  const create = useMutation({
    mutationFn: () => storeApi.createAddress(tenant, draft),
    onSuccess: () => {
      setDraft(emptyAddress);
      qc.invalidateQueries({ queryKey: ["account-addresses", tenant] });
    },
    onError: (e) => setError(e instanceof Error ? e.message : "Could not save address"),
  });

  const remove = useMutation({
    mutationFn: (id: string) => storeApi.deleteAddress(tenant, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["account-addresses", tenant] }),
  });

  return (
    <div className="mt-10 space-y-8">
      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Profile</h2>
        <p className="mt-1 text-sm text-zinc-500">{email}</p>
        {message ? <p className="mt-3 text-sm text-emerald-700">{message}</p> : null}
        {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
        <form
          className="mt-4 grid gap-3 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            profile.mutate({
              name: String(fd.get("name") ?? ""),
              currentPassword: String(fd.get("currentPassword") ?? "") || undefined,
              newPassword: String(fd.get("newPassword") ?? "") || undefined,
            });
          }}
        >
          <label className="text-sm sm:col-span-2">
            <span className="mb-1 block text-zinc-600">Name</span>
            <input
              name="name"
              defaultValue={name ?? ""}
              className="w-full rounded-lg border border-zinc-200 px-3 py-2"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-zinc-600">Current password</span>
            <input
              name="currentPassword"
              type="password"
              autoComplete="current-password"
              className="w-full rounded-lg border border-zinc-200 px-3 py-2"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-zinc-600">New password</span>
            <input
              name="newPassword"
              type="password"
              autoComplete="new-password"
              className="w-full rounded-lg border border-zinc-200 px-3 py-2"
            />
          </label>
          <div className="sm:col-span-2">
            <button type="submit" className="store-btn-primary text-sm" disabled={profile.isPending}>
              Save profile
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Saved addresses</h2>
        {addresses.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-500">No saved addresses yet.</p>
        ) : (
          <ul className="mt-4 divide-y rounded-xl border border-zinc-100">
            {addresses.map((a: CustomerAddress) => (
              <li key={a.id} className="flex items-start justify-between gap-3 px-4 py-3 text-sm">
                <div>
                  <p className="font-medium">
                    {a.label || a.name}
                    {a.isDefault ? (
                      <span className="ml-2 text-xs font-normal text-violet-700">Default</span>
                    ) : null}
                  </p>
                  <p className="text-zinc-600">
                    {[a.address1, a.address2, a.city, a.postal, a.country].filter(Boolean).join(", ")}
                  </p>
                </div>
                <button
                  type="button"
                  className="text-zinc-500 hover:text-red-700"
                  onClick={() => remove.mutate(a.id)}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
        <form
          className="mt-4 grid gap-3 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            create.mutate();
          }}
        >
          <input
            placeholder="Label (Home)"
            value={draft.label}
            onChange={(e) => setDraft({ ...draft, label: e.target.value })}
            className="rounded-lg border border-zinc-200 px-3 py-2 text-sm"
          />
          <input
            required
            placeholder="Full name"
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            className="rounded-lg border border-zinc-200 px-3 py-2 text-sm"
          />
          <input
            required
            placeholder="Address"
            value={draft.address1}
            onChange={(e) => setDraft({ ...draft, address1: e.target.value })}
            className="rounded-lg border border-zinc-200 px-3 py-2 text-sm sm:col-span-2"
          />
          <input
            placeholder="Apartment, suite"
            value={draft.address2}
            onChange={(e) => setDraft({ ...draft, address2: e.target.value })}
            className="rounded-lg border border-zinc-200 px-3 py-2 text-sm sm:col-span-2"
          />
          <input
            required
            placeholder="City"
            value={draft.city}
            onChange={(e) => setDraft({ ...draft, city: e.target.value })}
            className="rounded-lg border border-zinc-200 px-3 py-2 text-sm"
          />
          <input
            placeholder="Postal code"
            value={draft.postal}
            onChange={(e) => setDraft({ ...draft, postal: e.target.value })}
            className="rounded-lg border border-zinc-200 px-3 py-2 text-sm"
          />
          <input
            required
            maxLength={2}
            placeholder="Country (US)"
            value={draft.country}
            onChange={(e) => setDraft({ ...draft, country: e.target.value.toUpperCase() })}
            className="rounded-lg border border-zinc-200 px-3 py-2 text-sm"
          />
          <label className="flex items-center gap-2 text-sm text-zinc-700">
            <input
              type="checkbox"
              checked={draft.isDefault}
              onChange={(e) => setDraft({ ...draft, isDefault: e.target.checked })}
            />
            Default address
          </label>
          <div className="sm:col-span-2">
            <button type="submit" className="store-btn-secondary text-sm" disabled={create.isPending}>
              Add address
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
