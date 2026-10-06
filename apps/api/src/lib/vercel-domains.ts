/**
 * Optional Vercel Domains API — set VERCEL_TOKEN + VERCEL_STOREFRONT_PROJECT_ID.
 */
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
