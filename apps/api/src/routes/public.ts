import { hash } from "bcryptjs";
import { Hono } from "hono";
import { z } from "zod";
import { prisma } from "@ugclab/database";
import { isSlugAvailable, slugifyStoreName } from "@ugclab/tenant";
import { MERCHANT_WEB_URL } from "../env.js";

const schema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email(),
  password: z.string().min(8).max(128),
  storeName: z.string().min(1).max(120),
  country: z.string().length(2).optional(),
});

export const publicRoutes = new Hono();

publicRoutes.post("/signup", async (c) => {
  try {
    const body = schema.parse(await c.req.json());
    const email = body.email.toLowerCase();

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return c.json({ error: "Email already registered" }, 400);
    }

    let slug = slugifyStoreName(body.storeName);
    if (!slug) slug = "store";
    let suffix = 0;
    while (!(await isSlugAvailable(slug))) {
      suffix += 1;
      slug = `${slugifyStoreName(body.storeName)}-${suffix}`;
    }

    const plan = await prisma.subscriptionPlan.findFirst({
      where: { slug: "starter" },
    });

    const passwordHash = await hash(body.password, 12);

    await prisma.user.create({
      data: {
        email,
        name: body.name,
        passwordHash,
        country: body.country?.toUpperCase() ?? "US",
        tenants: {
          create: {
            slug,
            name: body.storeName,
            subscriptionPlanId: plan?.id,
            settings: {
              create: {
                defaultLocale: "en",
                currency: "USD",
              },
            },
            shippingZones: {
              create: {
                name: "Rest of world",
                countries: ["US"],
                flatRateAmount: 0,
                currency: "USD",
              },
            },
          },
        },
      },
    });

    return c.json({
      redirect: `${MERCHANT_WEB_URL}/login?email=${encodeURIComponent(email)}`,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return c.json({ error: err.flatten() }, 400);
    }
    console.error("[public/signup]", err);
    return c.json({ error: "Server error" }, 500);
  }
});
