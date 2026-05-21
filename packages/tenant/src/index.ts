import { prisma } from "@ugclab/database";

export type ResolvedTenant = {
  id: string;
  slug: string;
  name: string;
  status: string;
};

export type ResolveTenantOptions = {
  host: string;
  baseDomain?: string;
  /** Local dev: ?tenant=demo */
  queryTenant?: string | null;
};

/**
 * Resolves tenant from subdomain ({slug}.ugclab.store) or custom domain.
 * Local dev: use ?tenant=slug on storefront.
 */
export async function resolveTenantFromHost(
  options: ResolveTenantOptions
): Promise<ResolvedTenant | null> {
  const { host, baseDomain, queryTenant } = options;
  const hostWithoutPort = host.split(":")[0] ?? host;

  if (queryTenant) {
    return findBySlug(queryTenant);
  }

  const base = baseDomain?.split(":")[0];

  if (base && hostWithoutPort.endsWith(`.${base}`) && hostWithoutPort !== base) {
    const slug = hostWithoutPort.replace(`.${base}`, "");
    if (slug && !slug.includes(".")) {
      return findBySlug(slug);
    }
  }

  const custom = await prisma.customDomain.findFirst({
    where: { domain: hostWithoutPort, verified: true },
    include: { tenant: true },
  });

  if (custom?.tenant.status === "ACTIVE") {
    return {
      id: custom.tenant.id,
      slug: custom.tenant.slug,
      name: custom.tenant.name,
      status: custom.tenant.status,
    };
  }

  return null;
}

async function findBySlug(slug: string): Promise<ResolvedTenant | null> {
  const tenant = await prisma.tenant.findUnique({
    where: { slug: slug.toLowerCase() },
  });

  if (!tenant || tenant.status !== "ACTIVE") {
    return null;
  }

  return {
    id: tenant.id,
    slug: tenant.slug,
    name: tenant.name,
    status: tenant.status,
  };
}

export function slugifyStoreName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

export {
  parseStoreTheme,
  storeThemeCssVars,
  storeButtonClass,
  DEFAULT_STORE_THEME,
  type StoreTheme,
  type HomeSection,
  type ButtonStyle,
} from "./store-theme.js";

export async function isSlugAvailable(slug: string): Promise<boolean> {
  const existing = await prisma.tenant.findUnique({
    where: { slug },
  });
  return !existing;
}
