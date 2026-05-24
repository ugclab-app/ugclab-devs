import { UserAccountStatus, prisma } from "@ugclab/database";
import type { SessionPayload } from "./auth-token.js";
import { signSession, verifySession } from "./auth-token.js";

export async function signSessionForUser(
  user: {
    id: string;
    email: string;
    name: string | null;
    role: string;
    sessionVersion: number;
  },
  impersonator?: { id: string; email: string }
) {
  return signSession({
    sub: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    sv: user.sessionVersion,
    impBy: impersonator?.id,
    impEmail: impersonator?.email,
  });
}

export async function resolveSession(
  token: string
): Promise<SessionPayload | null> {
  const payload = await verifySession(token);
  if (!payload) return null;

  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: {
      accountStatus: true,
      sessionVersion: true,
      email: true,
      name: true,
      role: true,
    },
  });
  if (!user || user.accountStatus === UserAccountStatus.BANNED) return null;
  if (payload.sv !== user.sessionVersion) return null;

  return {
    ...payload,
    email: user.email,
    name: user.name,
    role: user.role,
  };
}
