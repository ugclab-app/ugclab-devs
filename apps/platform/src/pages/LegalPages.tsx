import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { getMessages } from "@ugclab/i18n";
import { merchantAdminUrl } from "@/lib/urls";

const c = getMessages().common;

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-t border-zinc-100 pt-8 first:border-t-0 first:pt-0">
      <h2 className="text-base font-semibold tracking-tight text-zinc-900">{title}</h2>
      <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-zinc-600">{children}</div>
    </section>
  );
}

function LegalShell({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen mesh-hero">
      <header className="glass-nav sticky top-0 z-50">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-teal-600 to-emerald-600 text-sm font-bold text-white shadow-lg shadow-teal-500/30">
              T
            </span>
            <span className="text-lg font-bold tracking-tight text-zinc-900">{c.brand}</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link
              to="/privacy"
              className="hidden text-sm font-medium text-zinc-600 transition hover:text-violet-600 sm:inline"
            >
              Privacy
            </Link>
            <Link
              to="/terms"
              className="hidden text-sm font-medium text-zinc-600 transition hover:text-violet-600 sm:inline"
            >
              Terms
            </Link>
            <Link
              to="/"
              className="rounded-lg bg-zinc-900 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800"
            >
              Home
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-12 md:py-16">
        <p className="text-xs font-semibold uppercase tracking-wider text-violet-600">Legal</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-900 md:text-4xl">
          {title}
        </h1>
        <p className="mt-2 text-sm text-zinc-500">Last updated: {updated}</p>

        <article className="mt-8 rounded-2xl border border-zinc-200/80 bg-white/90 p-6 shadow-xl shadow-violet-500/5 backdrop-blur-sm md:p-10">
          <div className="space-y-8">{children}</div>
        </article>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
          <Link
            to="/"
            className="text-sm font-medium text-violet-600 transition hover:text-violet-700"
          >
            ← Back to home
          </Link>
          <a
            href={`${merchantAdminUrl}/login`}
            className="text-sm font-medium text-zinc-500 transition hover:text-zinc-800"
          >
            Merchant login
          </a>
        </div>
      </main>

      <footer className="border-t border-zinc-200/80 bg-white/70 py-10 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 md:flex-row">
          <p className="text-sm text-zinc-500">
            © {new Date().getFullYear()} {c.brand}. All rights reserved.
          </p>
          <div className="flex gap-6 text-sm text-zinc-500">
            <Link to="/privacy" className="transition hover:text-zinc-800">
              Privacy
            </Link>
            <Link to="/terms" className="transition hover:text-zinc-800">
              Terms
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

export function PrivacyPage() {
  return (
    <LegalShell title="Privacy Policy" updated="September 20, 2026">
      <p className="text-[15px] leading-relaxed text-zinc-600">
        This Privacy Policy explains how {c.brand} (“we”, “us”) collects, uses, and shares
        information when you visit our marketing site, create a merchant account, or use our
        ecommerce platform.
      </p>
      <Section title="Information we collect">
        <ul className="list-disc space-y-2.5 pl-5 marker:text-violet-400">
          <li>
            <strong className="font-semibold text-zinc-800">Account data</strong> — name, email,
            store name, and credentials you provide at signup.
          </li>
          <li>
            <strong className="font-semibold text-zinc-800">Store & order data</strong> — products,
            customers, and orders processed through your storefront (you are the merchant of record
            for your buyers unless otherwise stated).
          </li>
          <li>
            <strong className="font-semibold text-zinc-800">Payment data</strong> — payments are
            processed by Stripe and/or local providers (e.g. Finik, GoPay). We do not store full
            card numbers.
          </li>
          <li>
            <strong className="font-semibold text-zinc-800">Usage data</strong> — logs, device/browser
            info, and approximate location needed to operate and secure the service.
          </li>
        </ul>
      </Section>
      <Section title="How we use information">
        <p>
          We use information to provide the platform, process payments and payouts, send
          transactional emails, improve product quality, prevent fraud, and comply with law.
        </p>
      </Section>
      <Section title="Sharing">
        <p>
          We share data with subprocessors that help run the service (hosting, email, payments,
          analytics) under contractual safeguards. We may disclose information if required by law or
          to protect rights and safety.
        </p>
      </Section>
      <Section title="Your choices">
        <p>
          You can update account details in the merchant admin, request export or deletion of your
          account data by contacting support, and manage cookie/consent preferences where offered on
          storefronts.
        </p>
      </Section>
      <Section title="Contact">
        <p>
          For privacy requests, email{" "}
          <a
            className="font-semibold text-violet-600 underline decoration-violet-200 underline-offset-2 hover:text-violet-700"
            href="mailto:privacy@tescommerce.com"
          >
            privacy@tescommerce.com
          </a>
          .
        </p>
      </Section>
    </LegalShell>
  );
}

export function TermsPage() {
  return (
    <LegalShell title="Terms of Service" updated="September 20, 2026">
      <p className="text-[15px] leading-relaxed text-zinc-600">
        These Terms govern access to and use of the {c.brand} website and platform. By creating an
        account or using the service, you agree to these Terms.
      </p>
      <Section title="The service">
        <p>
          {c.brand} provides tools to create online stores, accept payments, and manage orders.
          Features, pricing, and plan limits may change; material changes will be communicated where
          practical.
        </p>
      </Section>
      <Section title="Your responsibilities">
        <ul className="list-disc space-y-2.5 pl-5 marker:text-violet-400">
          <li>Provide accurate account information and keep credentials secure.</li>
          <li>
            Comply with applicable laws, tax rules, and payment-provider requirements for goods you
            sell.
          </li>
          <li>Do not sell prohibited or infringing products, or misuse the platform.</li>
          <li>Publish your own store privacy/refund policies for buyers where required.</li>
        </ul>
      </Section>
      <Section title="Fees & payments">
        <p>
          Subscription and platform fees are billed as described on signup or in your plan. Payment
          processing fees may apply via Stripe or local providers. Unpaid invoices may result in
          suspension.
        </p>
      </Section>
      <Section title="Intellectual property">
        <p>
          We retain rights to the platform software and branding. You retain rights to your store
          content and product assets. You grant us a limited license to host and display that content
          to operate the service.
        </p>
      </Section>
      <Section title="Disclaimer & liability">
        <p>
          The service is provided “as is.” To the extent permitted by law, we disclaim warranties and
          limit liability for indirect or consequential damages arising from use of the platform.
        </p>
      </Section>
      <Section title="Termination">
        <p>
          You may close your account at any time. We may suspend or terminate access for breach of
          these Terms, unpaid fees, or legal risk.
        </p>
      </Section>
      <Section title="Contact">
        <p>
          Questions about these Terms:{" "}
          <a
            className="font-semibold text-violet-600 underline decoration-violet-200 underline-offset-2 hover:text-violet-700"
            href="mailto:legal@tescommerce.com"
          >
            legal@tescommerce.com
          </a>
          .
        </p>
      </Section>
    </LegalShell>
  );
}
