import { prisma } from "@ugclab/database";

export type EmailDomainState = {
  domain: string;
  resendId?: string;
  status?: string;
  fromAddress?: string;
  records?: Array<{ record?: string; name?: string; type?: string; value?: string; status?: string }>;
};

function resendKey() {
  return process.env.RESEND_API_KEY?.trim() || "";
}

export async function getEmailDomain(tenantId: string): Promise<EmailDomainState | null> {
  const settings = await prisma.storeSettings.findUnique({
    where: { tenantId },
    select: { emailDomain: true },
  });
  const raw = settings?.emailDomain;
  if (!raw || typeof raw !== "object") return null;
  return raw as EmailDomainState;
}

async function saveEmailDomain(tenantId: string, state: EmailDomainState) {
  await prisma.storeSettings.update({
    where: { tenantId },
    data: { emailDomain: state },
  });
  return state;
}

export async function registerEmailDomain(tenantId: string, rawDomain: string) {
  const domain = rawDomain.trim().toLowerCase().replace(/^https?:\/\//, "").split("/")[0] ?? "";
  if (!domain.includes(".") || domain.includes(" ")) {
    throw new Error("Enter a domain like mail.yourstore.com");
  }
  const key = resendKey();
  if (!key) throw new Error("RESEND_API_KEY is not configured");

  const res = await fetch("https://api.resend.com/domains", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name: domain }),
  });
  const data = (await res.json()) as {
    id?: string;
    name?: string;
    status?: string;
    records?: EmailDomainState["records"];
    message?: string;
  };
  if (!res.ok) throw new Error(data.message || "Could not add domain");

  return saveEmailDomain(tenantId, {
    domain: data.name || domain,
    resendId: data.id,
    status: data.status || "pending",
    fromAddress: `orders@${data.name || domain}`,
    records: data.records ?? [],
  });
}

export async function refreshEmailDomain(tenantId: string) {
  const current = await getEmailDomain(tenantId);
  if (!current?.resendId) throw new Error("Add a sending domain first");
  const key = resendKey();
  if (!key) throw new Error("RESEND_API_KEY is not configured");

  await fetch(`https://api.resend.com/domains/${current.resendId}/verify`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}` },
  }).catch(() => {});

  const res = await fetch(`https://api.resend.com/domains/${current.resendId}`, {
    headers: { Authorization: `Bearer ${key}` },
  });
  const data = (await res.json()) as {
    name?: string;
    status?: string;
    records?: EmailDomainState["records"];
    message?: string;
  };
  if (!res.ok) throw new Error(data.message || "Could not check domain");

  const status = (data.status || current.status || "pending").toLowerCase();
  return saveEmailDomain(tenantId, {
    ...current,
    domain: data.name || current.domain,
    status,
    fromAddress: `orders@${data.name || current.domain}`,
    records: data.records ?? current.records,
  });
}
