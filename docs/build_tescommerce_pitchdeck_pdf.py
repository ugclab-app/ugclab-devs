from reportlab.lib import colors
from reportlab.lib.pagesizes import landscape, A4
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader


OUTPUT_FILE = "docs/Tescommerce_Seed_Deck_v1.pdf"
LOGO_FILE = "docs/tescommerce-logo.png"

PAGE_W, PAGE_H = landscape(A4)
MARGIN_X = 22 * mm
MARGIN_Y = 16 * mm


def draw_header(c: canvas.Canvas, title: str, subtitle: str = "") -> None:
    c.setFillColor(colors.HexColor("#0B1020"))
    c.rect(0, PAGE_H - 22 * mm, PAGE_W, 22 * mm, stroke=0, fill=1)

    c.setFillColor(colors.white)
    c.setFont("Helvetica-Bold", 15)
    c.drawString(MARGIN_X, PAGE_H - 14 * mm, title)
    if subtitle:
        c.setFont("Helvetica", 10)
        c.setFillColor(colors.HexColor("#CBD5E1"))
        c.drawString(MARGIN_X, PAGE_H - 18.5 * mm, subtitle)


def draw_footer(c: canvas.Canvas, page_num: int) -> None:
    c.setFillColor(colors.HexColor("#64748B"))
    c.setFont("Helvetica", 9)
    c.drawRightString(PAGE_W - MARGIN_X, 8 * mm, f"Tescommerce · Confidential · Page {page_num}")


def draw_bullets(c: canvas.Canvas, items: list[str], start_y: float) -> None:
    y = start_y
    c.setFillColor(colors.HexColor("#0F172A"))
    c.setFont("Helvetica", 14)
    for line in items:
        c.drawString(MARGIN_X, y, f"- {line}")
        y -= 10 * mm


def new_slide(c: canvas.Canvas, title: str, subtitle: str, bullets: list[str], page_num: int) -> None:
    draw_header(c, title, subtitle)
    draw_bullets(c, bullets, PAGE_H - 40 * mm)
    draw_footer(c, page_num)
    c.showPage()


def build_deck() -> None:
    c = canvas.Canvas(OUTPUT_FILE, pagesize=landscape(A4))

    # Slide 1: Title
    draw_header(c, "Tescommerce", "Global-first commerce platform")
    logo = ImageReader(LOGO_FILE)
    c.drawImage(logo, MARGIN_X, PAGE_H - 83 * mm, width=18 * mm, height=18 * mm, mask="auto")
    c.setFillColor(colors.HexColor("#0F172A"))
    c.setFont("Helvetica-Bold", 33)
    c.drawString(MARGIN_X + 24 * mm, PAGE_H - 56 * mm, "Tescommerce")
    c.setFont("Helvetica", 17)
    c.setFillColor(colors.HexColor("#334155"))
    c.drawString(MARGIN_X + 24 * mm, PAGE_H - 68 * mm, "Sell globally from one store.")
    c.setFont("Helvetica", 12)
    c.setFillColor(colors.HexColor("#475569"))
    c.drawString(MARGIN_X, PAGE_H - 95 * mm, "Physical products, digital downloads, and global checkout for creators and brands.")
    c.drawString(MARGIN_X, PAGE_H - 106 * mm, "Website: https://tescommerce.com/")
    c.drawString(MARGIN_X, PAGE_H - 117 * mm, "Contact: TBD")
    draw_footer(c, 1)
    c.showPage()

    slides = [
        (
            "Problem",
            "Creators and small brands use fragmented tooling to sell globally.",
            [
                "Current setup often combines multiple tools for storefront, checkout, and digital delivery.",
                "Cross-border tax, payout, and compliance flows add high operational overhead.",
                "Time-to-launch is slow for non-technical teams, delaying first revenue.",
            ],
        ),
        (
            "Solution",
            "One platform for storefront, checkout, digital + physical commerce, and payout operations.",
            [
                "Drag-and-drop site builder with themes, sections, and live multi-device preview.",
                "Native support for digital files and physical products in one catalog.",
                "Stripe-powered checkout and platform-level global selling features.",
            ],
        ),
        (
            "Why Now",
            "Three shifts make this category timing attractive.",
            [
                "Creator economy and micro-brands continue to globalize beyond local marketplaces.",
                "Payment infrastructure is API-first, enabling lean teams to ship robust checkout quickly.",
                "Sellers now expect low-code tooling and shorter time-to-first-sale.",
            ],
        ),
        (
            "Market",
            "Large and expanding opportunity at the creator + SMB commerce intersection.",
            [
                "TAM: TBD (global SMB/creator commerce software spend).",
                "SAM: TBD (digital-first and mixed digital+physical merchants).",
                "SOM: TBD (12-36 month target segment and geography).",
            ],
        ),
        (
            "Business Model",
            "Subscription + platform fees with clear upgrade path.",
            [
                "Starter: Free, up to 50 products, 5% platform fee.",
                "Growth: $29/month, unlimited products, 0% platform fee.",
                "Pro: $79/month with staff accounts, API access, advanced analytics.",
            ],
        ),
        (
            "Traction",
            "Early indicators from live product and beta merchant usage.",
            [
                "Public site highlights: 50+ countries supported and <2 min average store setup.",
                "Public demo metrics snapshot shows active GMV signal (30d dashboard preview).",
                "Internal KPI details (MRR, growth, retention, logo customers): TBD.",
            ],
        ),
        (
            "Go-To-Market",
            "Target creators and small brands that need global commerce quickly.",
            [
                "Primary wedge: fast launch + unified digital and physical product operations.",
                "Conversion path: free Starter onboarding to paid Growth/Pro expansion.",
                "GTM metrics (CAC, funnel conversion, payback): TBD.",
            ],
        ),
        (
            "Competition",
            "Competes against fragmented stack and point solutions.",
            [
                "Alternative 1: Shopify + multiple add-ons for digital delivery and ops.",
                "Alternative 2: Sellfy/Gumroad with limits on full-store flexibility.",
                "Edge: faster setup, integrated workflows, and platform-level MoR capability messaging.",
            ],
        ),
        (
            "Team",
            "Execution team details to be finalized for investor version.",
            [
                "Founders and operator backgrounds: TBD.",
                "Relevant domain track record (commerce/payments/product): TBD.",
                "Hiring plan for 12 months: TBD.",
            ],
        ),
        (
            "Financial Plan (12-18 Months)",
            "Targets and operating assumptions for next stage growth.",
            [
                "Revenue trajectory and monthly burn plan: TBD.",
                "Milestones: product depth, paid merchant count, and retention benchmarks.",
                "Runway assumptions pre/post round: TBD.",
            ],
        ),
        (
            "Fundraise Ask",
            "Round details to be completed with internal targets.",
            [
                "Amount: TBD | Instrument: TBD | Runway: TBD.",
                "Use of funds: product/engineering, GTM, and operations.",
                "Milestone by end of runway: TBD.",
            ],
        ),
    ]

    page = 2
    for title, subtitle, bullets in slides:
        new_slide(c, title, subtitle, bullets, page)
        page += 1

    c.save()


if __name__ == "__main__":
    build_deck()
