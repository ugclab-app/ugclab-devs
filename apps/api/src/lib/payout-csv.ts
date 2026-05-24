import { prisma } from "@ugclab/database";

export async function payoutsToCsv(opts?: { tenantId?: string }) {
  const payouts = await prisma.merchantPayout.findMany({
    where: opts?.tenantId ? { tenantId: opts.tenantId } : {},
    orderBy: { createdAt: "desc" },
    include: {
      tenant: { select: { slug: true, name: true } },
    },
    take: 5000,
  });

  const header =
    "id,tenant_slug,tenant_name,amount_cents,currency,status,note,paid_at,created_at";
  const rows = payouts.map((p) =>
    [
      p.id,
      p.tenant.slug,
      csvEscape(p.tenant.name),
      p.amount,
      p.currency,
      p.status,
      csvEscape(p.note ?? ""),
      p.paidAt?.toISOString() ?? "",
      p.createdAt.toISOString(),
    ].join(",")
  );
  return [header, ...rows].join("\n");
}

function csvEscape(s: string) {
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}
