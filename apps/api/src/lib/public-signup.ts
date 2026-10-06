import { hash } from "bcryptjs";
import { prisma } from "@ugclab/database";
import { isSlugAvailable, slugifyStoreName } from "@ugclab/tenant";
import { assertDatabaseReady, databaseTimeoutMessage } from "./db-ready.js";
import { MERCHANT_WEB_URL } from "../env.js";
import { attributePlatformPartner } from "./platform-partner.js";

export type SignupInput = {
  name: string;
  email: string;
  password: string;
  storeName: string;
  country: string;
  ref?: string | null;
};

async function ensureStarterPlanId(): Promise<string | undefined> {
  const plan = await prisma.subscriptionPlan.upsert({
    where: { slug: "starter" },
    update: {},
    create: {
      slug: "starter",
      name: "Starter",
      priceMonthly: 0,
      currency: "USD",
      productLimit: 50,
      platformFeeBps: 500,
      trialDays: 14,
    },
    select: { id: true },
  });
  return plan.id;
}

async function allocateSlug(storeName: string): Promise<string> {
  const baseSlug = slugifyStoreName(storeName) || "store";
  let slug = baseSlug;
  let suffix = 0;
  while (!(await isSlugAvailable(slug))) {
    suffix += 1;
    slug = `${baseSlug}-${suffix}`;
    if (suffix > 50) {
      throw new Error("SLUG_EXHAUSTED");
    }
  }
  return slug;
}

export async function registerMerchantStore(body: SignupInput) {
  await assertDatabaseReady();

  const email = body.email.toLowerCase();

  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });
  if (existing) {
    return { ok: false as const, status: 400, error: "Email already registered" };
  }

  const slug = await allocateSlug(body.storeName);
  const planId = await ensureStarterPlanId();
  const passwordHash = await hash(body.password, 8);
  const country = body.country.toUpperCase();

  let userId = "";
  let tenantId = "";
  await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email,
        name: body.name,
        passwordHash,
        country,
      },
    });
    userId = user.id;

    const tenant = await tx.tenant.create({
      data: {
        slug,
        name: body.storeName,
        ownerId: user.id,
        subscriptionPlanId: planId,
        settings: {
          create: {
            defaultLocale: country === "KG" || country === "KZ" || country === "UZ" ? "ru" : "en",
            currency:
              country === "KG" ? "KGS" : country === "KZ" ? "KZT" : country === "UZ" ? "UZS" : "USD",
            enabledLocales:
              country === "KG"
                ? ["ru", "ky", "en"]
                : country === "KZ"
                  ? ["ru", "kk", "en"]
                  : country === "UZ"
                    ? ["uz", "ru", "en"]
                    : ["en"],
            timezone:
              country === "KG"
                ? "Asia/Bishkek"
                : country === "KZ"
                  ? "Asia/Almaty"
                  : country === "UZ"
                    ? "Asia/Tashkent"
                    : "UTC",
          },
        },
        shippingZones: {
          create: {
            name: "Rest of world",
            countries: [country],
            flatRateAmount: 0,
            currency: country === "KG" ? "KGS" : country === "KZ" ? "KZT" : "USD",
          },
        },
      },
    });
    tenantId = tenant.id;
  });

  if (body.ref) {
    await attributePlatformPartner({
      tenantId,
      ownerEmail: email,
      ownerId: userId,
      refCode: body.ref,
    }).catch((err) => console.error("[platform-partner] attribute", err));
  }

  return {
    ok: true as const,
    redirect: `${MERCHANT_WEB_URL}/login?email=${encodeURIComponent(email)}&welcome=1`,
  };
}

/** Create another store for an existing logged-in merchant (owner). */
export async function createStoreForOwner(opts: {
  userId: string;
  storeName: string;
  country?: string;
  ref?: string | null;
}) {
  await assertDatabaseReady();
  const storeName = opts.storeName.trim();
  if (!storeName) {
    return { ok: false as const, status: 400, error: "Store name required" };
  }

  const user = await prisma.user.findUnique({
    where: { id: opts.userId },
    select: { id: true, country: true, email: true },
  });
  if (!user) {
    return { ok: false as const, status: 404, error: "User not found" };
  }

  const ownedCount = await prisma.tenant.count({ where: { ownerId: user.id } });
  if (ownedCount >= 20) {
    return { ok: false as const, status: 400, error: "Store limit reached (20)" };
  }
  if (ownedCount >= 1) {
    const extra = await prisma.tenantAddon.findFirst({
      where: {
        kind: "APP",
        itemId: "second-store",
        status: "active",
        tenant: { ownerId: user.id },
      },
      select: { id: true },
    });
    const cap = extra ? 2 : 1;
    if (ownedCount >= cap) {
      return {
        ok: false as const,
        status: 402,
        error: "Buy Second store in Apps & themes to open another store.",
      };
    }
  }

  const country = (opts.country || user.country || "US").toUpperCase();
  const slug = await allocateSlug(storeName);
  const planId = await ensureStarterPlanId();

  const tenant = await prisma.tenant.create({
    data: {
      slug,
      name: storeName,
      ownerId: user.id,
      subscriptionPlanId: planId,
      settings: {
        create: {
          defaultLocale:
            country === "KG" || country === "KZ" || country === "UZ" ? "ru" : "en",
          currency:
            country === "KG"
              ? "KGS"
              : country === "KZ"
                ? "KZT"
                : country === "UZ"
                  ? "UZS"
                  : "USD",
          enabledLocales:
            country === "KG"
              ? ["ru", "ky", "en"]
              : country === "KZ"
                ? ["ru", "kk", "en"]
                : country === "UZ"
                  ? ["uz", "ru", "en"]
                  : ["en"],
          timezone:
            country === "KG"
              ? "Asia/Bishkek"
              : country === "KZ"
                ? "Asia/Almaty"
                : country === "UZ"
                  ? "Asia/Tashkent"
                  : "UTC",
        },
      },
      shippingZones: {
        create: {
          name: "Rest of world",
          countries: [country],
          flatRateAmount: 0,
          currency:
            country === "KG" ? "KGS" : country === "KZ" ? "KZT" : "USD",
        },
      },
    },
    select: { id: true, name: true, slug: true },
  });

  if (opts.ref) {
    await attributePlatformPartner({
      tenantId: tenant.id,
      ownerEmail: user.email,
      ownerId: user.id,
      refCode: opts.ref,
    }).catch((err) => console.error("[platform-partner] attribute", err));
  }

  return { ok: true as const, tenant };
}

export function signupErrorMessage(err: unknown): { status: number; error: string } {
  if (err instanceof Error) {
    if (err.message === "DATABASE_TIMEOUT") {
      return { status: 503, error: databaseTimeoutMessage() };
    }
    if (err.message === "SLUG_EXHAUSTED") {
      return { status: 500, error: "Could not allocate store address — try a different store name" };
    }
  }
  console.error("[public/signup]", err);
  return {
    status: 500,
    error:
      "Server error during signup. Check API logs and DATABASE_URL. If email exists, try signing in.",
  };
}
