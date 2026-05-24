import { hash } from "bcryptjs";
import {
  DiscountType,
  PrismaClient,
  ProductStatus,
  ProductType,
  UserRole,
} from "@prisma/client";
import {
  TESCOMMERCE_DOMAIN,
  TESCOMMERCE_SLUG,
  tescommerceSettings,
  tescommerceTheme,
} from "./tescommerce-data.js";

const prisma = new PrismaClient();

async function main() {
  const plan = await prisma.subscriptionPlan.upsert({
    where: { slug: "starter" },
    update: { platformFeeBps: 500, trialDays: 14 },
    create: {
      slug: "starter",
      name: "Starter",
      priceMonthly: 0,
      currency: "USD",
      productLimit: 50,
      platformFeeBps: 500,
      trialDays: 14,
    },
  });

  await prisma.subscriptionPlan.upsert({
    where: { slug: "pro" },
    update: {
      priceMonthly: 2900,
      trialDays: 14,
      stripePriceId: process.env.STRIPE_PRICE_PRO ?? null,
    },
    create: {
      slug: "pro",
      name: "Pro",
      priceMonthly: 2900,
      currency: "USD",
      productLimit: 500,
      platformFeeBps: 300,
      trialDays: 14,
      stripePriceId: process.env.STRIPE_PRICE_PRO ?? null,
    },
  });

  const passwordHash = await hash("demo1234", 12);
  const founderHash = await hash("founder1234", 12);

  await prisma.user.upsert({
    where: { email: "founder@ugclab.store" },
    update: { passwordHash: founderHash, role: UserRole.SUPER_ADMIN, name: "Platform Founder" },
    create: {
      email: "founder@ugclab.store",
      name: "Platform Founder",
      passwordHash: founderHash,
      role: UserRole.SUPER_ADMIN,
    },
  });

  const user = await prisma.user.upsert({
    where: { email: "demo@ugclab.store" },
    update: { passwordHash, name: "Demo Merchant" },
    create: {
      email: "demo@ugclab.store",
      name: "Demo Merchant",
      passwordHash,
      country: "US",
      timezone: "America/New_York",
    },
  });

  const tenant = await prisma.tenant.upsert({
    where: { slug: TESCOMMERCE_SLUG },
    update: {
      status: "ACTIVE",
      ownerId: user.id,
      name: "Tescommerce",
      settings: {
        upsert: {
          create: {
            ...tescommerceSettings,
            theme: tescommerceTheme,
            themeDraft: tescommerceTheme,
          },
          update: {
            ...tescommerceSettings,
            theme: tescommerceTheme,
            themeDraft: tescommerceTheme,
          },
        },
      },
    },
    create: {
      slug: TESCOMMERCE_SLUG,
      name: "Tescommerce",
      ownerId: user.id,
      subscriptionPlanId: plan.id,
      settings: {
        create: {
          ...tescommerceSettings,
          theme: tescommerceTheme,
          themeDraft: tescommerceTheme,
        },
      },
      shippingZones: {
        create: [
          {
            name: "North America",
            countries: ["US", "CA"],
            flatRateAmount: 500,
            currency: "USD",
          },
          {
            name: "Europe",
            countries: ["GB", "DE", "FR", "NL", "ES", "IT", "PL"],
            flatRateAmount: 800,
            currency: "USD",
          },
        ],
      },
    },
  });

  await prisma.customDomain.upsert({
    where: { domain: TESCOMMERCE_DOMAIN },
    update: { tenantId: tenant.id, verified: true },
    create: {
      tenantId: tenant.id,
      domain: TESCOMMERCE_DOMAIN,
      verified: true,
      verificationToken: "seed",
    },
  });

  await prisma.customDomain.upsert({
    where: { domain: `www.${TESCOMMERCE_DOMAIN}` },
    update: { tenantId: tenant.id, verified: true },
    create: {
      tenantId: tenant.id,
      domain: `www.${TESCOMMERCE_DOMAIN}`,
      verified: true,
      verificationToken: "seed",
    },
  });

  await prisma.collection.upsert({
    where: { tenantId_slug: { tenantId: tenant.id, slug: "digital" } },
    update: {},
    create: {
      tenantId: tenant.id,
      title: "Digital downloads",
      slug: "digital",
    },
  });

  await prisma.product.upsert({
    where: { tenantId_slug: { tenantId: tenant.id, slug: "preset-pack" } },
    update: {
      translations: {
        de: {
          title: "Lightroom Preset Paket",
          description: "50 professionelle Presets für Creator weltweit.",
        },
      },
    },
    create: {
      tenantId: tenant.id,
      type: ProductType.DIGITAL,
      status: ProductStatus.ACTIVE,
      title: "Creator Essentials Kit",
      slug: "preset-pack",
      description: "Digital bundle for content creators — presets, templates, and guides.",
      translations: {
        de: {
          title: "Lightroom Preset Paket",
          description: "50 professionelle Presets für Creator weltweit.",
        },
      },
      priceAmount: 2900,
      currency: "USD",
      digitalAsset: {
        create: {
          tenantId: tenant.id,
          storageKey: "demo/preset-pack.zip",
          fileName: "preset-pack.zip",
          mimeType: "application/zip",
          sizeBytes: 1024 * 1024 * 12,
          downloadLimit: 5,
        },
      },
    },
  });

  await prisma.product.upsert({
    where: { tenantId_slug: { tenantId: tenant.id, slug: "merch-tee" } },
    update: {},
    create: {
      tenantId: tenant.id,
      type: ProductType.PHYSICAL,
      status: ProductStatus.ACTIVE,
      title: "Tescommerce Classic Tee",
      slug: "merch-tee",
      description: "Premium cotton tee — ships worldwide from Tescommerce.",
      priceAmount: 3500,
      currency: "USD",
      inventory: 100,
    },
  });

  const customer = await prisma.customer.upsert({
    where: {
      tenantId_email: { tenantId: tenant.id, email: "alex.buyer@example.com" },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      email: "alex.buyer@example.com",
      name: "Alex Buyer",
      country: "US",
    },
  });

  const preset = await prisma.product.findUnique({
    where: { tenantId_slug: { tenantId: tenant.id, slug: "preset-pack" } },
  });

  if (preset) {
    await prisma.order.upsert({
      where: { tenantId_orderNumber: { tenantId: tenant.id, orderNumber: "1001" } },
      update: {},
      create: {
        tenantId: tenant.id,
        customerId: customer.id,
        orderNumber: "1001",
        status: "PAID",
        currency: "USD",
        subtotalAmount: 2900,
        shippingAmount: 0,
        taxAmount: 0,
        totalAmount: 2900,
        items: {
          create: {
            tenantId: tenant.id,
            productId: preset.id,
            title: preset.title,
            quantity: 1,
            unitAmount: 2900,
            totalAmount: 2900,
          },
        },
      },
    });

    await prisma.order.upsert({
      where: { tenantId_orderNumber: { tenantId: tenant.id, orderNumber: "1002" } },
      update: {},
      create: {
        tenantId: tenant.id,
        customerId: customer.id,
        orderNumber: "1002",
        status: "PENDING",
        currency: "USD",
        subtotalAmount: 3500,
        shippingAmount: 500,
        taxAmount: 0,
        totalAmount: 4000,
        shippingCountry: "US",
        items: {
          create: {
            tenantId: tenant.id,
            title: "UGC Creator Tee",
            quantity: 1,
            unitAmount: 3500,
            totalAmount: 3500,
          },
        },
      },
    });
  }

  await prisma.discountCode.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: "WELCOME10" } },
    update: {},
    create: {
      tenantId: tenant.id,
      code: "WELCOME10",
      type: DiscountType.PERCENT,
      value: 10,
      active: true,
    },
  });

  console.log("Seed complete:");
  console.log("  Platform admin: founder@ugclab.store / founder1234  → http://localhost:3003");
  console.log("  Discount code: WELCOME10 (10% off)");
  console.log("  Merchant: demo@ugclab.store / demo1234");
  console.log(`  Store slug: ${TESCOMMERCE_SLUG}`);
  console.log(`  Domain: ${TESCOMMERCE_DOMAIN} (verified in seed)`);
  console.log(`  Storefront: http://localhost:3002?tenant=${TESCOMMERCE_SLUG}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
