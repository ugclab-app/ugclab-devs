/** Lightweight health check — no Prisma / full app import */
export default function handler() {
  return Response.json({ ok: true, service: "tescommerce-api" });
}

export const config = {
  runtime: "edge",
};
