/**
 * Apply Tescommerce branding to the demo store and register tescommerce.com.
 * Run: npm run db:tescommerce -w @ugclab/database
 */
import { PrismaClient } from "@prisma/client";
import {
  TESCOMMERCE_DOMAIN,
  TESCOMMERCE_SLUG,
  tescommerceSettings,
  tescommerceTheme,
} from "../prisma/tescommerce-data.js";

const prisma = new PrismaClient();

async function main() {
  let tenant = await prisma.tenant.findUnique({ where: { slug: "demo" } });
  if (!tenant) {
    tenant = await prisma.tenant.findUnique({ where: { slug: TESCOMMERCE_SLUG } });
  }
  if (!tenant) {
    console.error("No demo or tescommerce tenant found. Run npm run db:seed first.");
    process.exit(1);
  }

  const updated = await prisma.tenant.update({
    where: { id: tenant.id },
    data: {
      slug: TESCOMMERCE_SLUG,
      name: "Tescommerce",
    },
  });

  await prisma.storeSettings.upsert({
    where: { tenantId: updated.id },
    create: {
      tenantId: updated.id,
      ...tescommerceSettings,
      theme: tescommerceTheme,
      themeDraft: tescommerceTheme,
    },
    update: {
      ...tescommerceSettings,
      theme: tescommerceTheme,
      themeDraft: tescommerceTheme,
    },
  });

  await prisma.customDomain.upsert({
    where: { domain: TESCOMMERCE_DOMAIN },
    create: {
      tenantId: updated.id,
      domain: TESCOMMERCE_DOMAIN,
      verified: true,
      verificationToken: "dev-seed",
    },
    update: {
      tenantId: updated.id,
      verified: true,
    },
  });

  await prisma.customDomain.upsert({
    where: { domain: `www.${TESCOMMERCE_DOMAIN}` },
    create: {
      tenantId: updated.id,
      domain: `www.${TESCOMMERCE_DOMAIN}`,
      verified: true,
      verificationToken: "dev-seed",
    },
    update: {
      tenantId: updated.id,
      verified: true,
    },
  });

  console.log("Tescommerce store updated:");
  console.log(`  slug: ${TESCOMMERCE_SLUG}`);
  console.log(`  domains: ${TESCOMMERCE_DOMAIN}, www.${TESCOMMERCE_DOMAIN}`);
  console.log(`  storefront: http://localhost:3002?tenant=${TESCOMMERCE_SLUG}`);
  console.log(`  with hosts file: http://${TESCOMMERCE_DOMAIN}:3002`);
  console.log("  merchant login unchanged: demo@ugclab.store / demo1234");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
