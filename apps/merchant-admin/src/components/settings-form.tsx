"use client";

import { useActionState, useState } from "react";
import {
  updateStoreSettings,
  type SettingsActionState,
} from "@/app/actions/settings";
import { CopyStoreUrl } from "@/components/copy-store-url";
import { FormAlert } from "@/components/form-alert";
import { CURRENCIES, LOCALES, TIMEZONES } from "@/lib/constants";

type SettingsData = {
  name: string;
  slug: string;
  currency: string;
  defaultLocale: string;
  timezone: string;
  primaryColor: string;
  logoUrl: string;
  privacyUrl: string;
  refundUrl: string;
};

export function SettingsForm({
  storeUrl,
  initial,
}: {
  storeUrl: string;
  initial: SettingsData;
}) {
  const [state, action, pending] = useActionState<
    SettingsActionState,
    FormData
  >(updateStoreSettings, { ok: false });
  const [slug, setSlug] = useState(initial.slug);
  const [primaryColor, setPrimaryColor] = useState(initial.primaryColor);
  const slugChanged = slug !== initial.slug;

  return (
    <form action={action} className="mx-auto max-w-3xl space-y-6">
      <FormAlert ok={state.ok} message={state.message} />

      <section className="admin-card overflow-hidden">
        <div className="border-b border-zinc-100 bg-gradient-to-r from-violet-50 to-indigo-50 px-6 py-5">
          <h2 className="font-semibold text-zinc-900">Your storefront</h2>
          <p className="mt-1 text-sm text-zinc-600">
            Share this link anywhere — social, bio, email, ads.
          </p>
        </div>
        <div className="space-y-4 px-6 py-5">
          <p className="break-all font-mono text-sm text-violet-700">{storeUrl}</p>
          <div className="flex flex-wrap gap-2">
            <CopyStoreUrl url={storeUrl} />
            <a
              href={storeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="ugclab-btn ugclab-btn-primary px-4 py-2.5"
            >
              Open storefront
            </a>
          </div>
        </div>
      </section>

      <section className="admin-card p-6">
        <h2 className="text-lg font-semibold text-zinc-900">Store identity</h2>
        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <Field label="Store name" className="sm:col-span-2">
            <input
              name="name"
              defaultValue={initial.name}
              required
              className="ugclab-input"
            />
          </Field>
          <Field label="Store slug" hint="Used in your store URL">
            <input
              name="slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              required
              className="ugclab-input font-mono text-sm"
            />
          </Field>
          <Field label="Logo URL" hint="Optional header image">
            <input
              name="logoUrl"
              type="url"
              defaultValue={initial.logoUrl}
              placeholder="https://..."
              className="ugclab-input"
            />
          </Field>
          {slugChanged ? (
            <div className="sm:col-span-2 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <p className="font-medium">Changing slug breaks old links</p>
              <p className="mt-1 text-amber-800">
                URLs with <code className="rounded bg-amber-100 px-1">{initial.slug}</code> will stop working.
              </p>
              <label className="mt-3 flex cursor-pointer items-center gap-2">
                <input type="checkbox" name="slugConfirm" className="rounded" />
                I understand — update my store slug
              </label>
            </div>
          ) : null}
        </div>
      </section>

      <section className="admin-card p-6">
        <h2 className="text-lg font-semibold text-zinc-900">Regional</h2>
        <div className="mt-6 grid gap-5 sm:grid-cols-3">
          <Field label="Currency">
            <select
              name="currency"
              defaultValue={initial.currency}
              className="ugclab-select"
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Locale">
            <select
              name="defaultLocale"
              defaultValue={initial.defaultLocale}
              className="ugclab-select"
            >
              {LOCALES.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Timezone">
            <select
              name="timezone"
              defaultValue={initial.timezone}
              className="ugclab-select"
            >
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </section>

      <section className="admin-card p-6">
        <h2 className="text-lg font-semibold text-zinc-900">Branding</h2>
        <div className="mt-6 flex flex-wrap items-center gap-4">
          <input
            type="color"
            value={primaryColor}
            onChange={(e) => setPrimaryColor(e.target.value)}
            className="h-11 w-14 cursor-pointer rounded-lg border border-zinc-200"
            aria-label="Pick color"
          />
          <input
            name="primaryColor"
            value={primaryColor}
            onChange={(e) => setPrimaryColor(e.target.value)}
            className="ugclab-input w-36 font-mono text-sm"
          />
          <div
            className="h-11 flex-1 min-w-[100px] rounded-xl border border-zinc-200"
            style={{ backgroundColor: primaryColor }}
          />
        </div>
      </section>

      <section className="admin-card p-6">
        <h2 className="text-lg font-semibold text-zinc-900">Legal links</h2>
        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <Field label="Privacy policy URL">
            <input
              name="privacyUrl"
              type="url"
              defaultValue={initial.privacyUrl}
              className="ugclab-input"
              placeholder="https://..."
            />
          </Field>
          <Field label="Refund policy URL">
            <input
              name="refundUrl"
              type="url"
              defaultValue={initial.refundUrl}
              className="ugclab-input"
              placeholder="https://..."
            />
          </Field>
        </div>
      </section>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={pending}
          className="ugclab-btn ugclab-btn-primary px-8 py-3 disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save settings"}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  hint,
  className,
  children,
}: {
  label: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-zinc-700">{label}</label>
      {hint ? <p className="mt-0.5 text-xs text-zinc-500">{hint}</p> : null}
      <div className="mt-1.5">{children}</div>
    </div>
  );
}
