/**
 * Optional Vercel Domains API — set VERCEL_TOKEN + VERCEL_STOREFRONT_PROJECT_ID.
 * Team projects also need VERCEL_TEAM_ID.
 */
function pairedHost(domain: string): string | null {
  const host = domain.toLowerCase();
  if (host.startsWith("www.")) return host.slice(4);
  return `www.${host}`;
}

async function addOneDomain(
  domain: string,
  token: string,
  projectId: string,
  teamId: string | undefined
): Promise<{ ok: boolean; error?: string }> {
  const qs = teamId ? `?teamId=${encodeURIComponent(teamId)}` : "";
  const res = await fetch(
    `https://api.vercel.com/v10/projects/${projectId}/domains${qs}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: domain }),
    }
  );

  if (res.ok || res.status === 409) return { ok: true };
  const text = await res.text();
  return { ok: false, error: text.slice(0, 200) };
}

export async function addDomainToVercelProject(domain: string): Promise<{
  ok: boolean;
  error?: string;
}> {
  const token = process.env.VERCEL_TOKEN?.trim();
  const projectId = process.env.VERCEL_STOREFRONT_PROJECT_ID?.trim();
  const teamId = process.env.VERCEL_TEAM_ID?.trim();

  if (!token || !projectId) {
    return { ok: false, error: "Vercel not configured" };
  }

  const primary = await addOneDomain(domain, token, projectId, teamId);
  const pair = pairedHost(domain);
  if (pair) {
    const extra = await addOneDomain(pair, token, projectId, teamId);
    if (!extra.ok) {
      console.error("[vercel] paired domain", pair, extra.error);
    }
  }
  return primary;
}

export async function getVercelDomainSslStatus(domain: string): Promise<
  "active" | "pending" | "error" | "unknown"
> {
  const token = process.env.VERCEL_TOKEN?.trim();
  const projectId = process.env.VERCEL_STOREFRONT_PROJECT_ID?.trim();
  const teamId = process.env.VERCEL_TEAM_ID?.trim();
  if (!token || !projectId) return "unknown";

  const qs = teamId ? `?teamId=${encodeURIComponent(teamId)}` : "";
  try {
    const res = await fetch(
      `https://api.vercel.com/v9/projects/${projectId}/domains/${encodeURIComponent(domain)}${qs}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!res.ok) return "unknown";
    const data = (await res.json()) as { verified?: boolean; verification?: { status?: string } };
    if (data.verified) return "active";
    return "pending";
  } catch {
    return "unknown";
  }
}
