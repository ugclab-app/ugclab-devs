import { hash } from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@ugclab/database";
import { isSlugAvailable, slugifyStoreName } from "@ugclab/tenant";

const schema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email(),
  password: z.string().min(8).max(128),
  storeName: z.string().min(1).max(120),
  country: z.string().length(2).optional(),
});

export async function POST(request: Request) {
  try {
    const body = schema.parse(await request.json());
    const email = body.email.toLowerCase();

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 400 }
      );
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

    const adminUrl =
      process.env.MERCHANT_ADMIN_URL ?? "http://localhost:3001";

    return NextResponse.json({
      redirect: `${adminUrl}/login?email=${encodeURIComponent(email)}`,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.flatten() }, { status: 400 });
    }
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
