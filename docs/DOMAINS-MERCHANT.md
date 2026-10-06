# Domains for merchants

## UI (Settings → Domain)

Three tabs:

| Tab | RU | Behavior |
|-----|-----|----------|
| **Free address** | Бесплатный адрес | `slug.STORE_BASE_DOMAIN` — works immediately |
| **Buy a domain** | Купить домен | Search → buy at **Cloudflare** or **Namecheap** (recommended) → checklist → Connect tab |
| **Connect yours** | Подключить свой | Add domain → DNS TXT + CNAME → **Check DNS** → Vercel SSL |

### Recommended flow (variant 1 — current)

1. **Buy** — search `mybrand`, pick a name, open Cloudflare or Namecheap.
2. **After purchase** — follow the green checklist in the admin (add domain, DNS, verify).
3. **Connect** — `POST /merchant/domains`, set records, `Check DNS`.

For **.kg / .kz / .uz** — buy at a local registrar, then connect the same way (see hint in the Buy tab).

### Later (variant 2)

Entri in-app checkout — see `domain-shop.ts` (`Entri direct order = future`).

## API

- `GET /merchant/domains/config`
- `GET /merchant/domains/search?q=mybrand`
- `GET /merchant/domains/purchase-links?domain=mybrand.com`
- `POST /merchant/domains` — add custom domain
- `GET /merchant/domains/:id/dns` — DNS instructions
- `POST /merchant/domains/:id/check-dns` — TXT lookup + verify + Vercel
- `POST /merchant/domains/:id/verify` — same as check-dns

## Env

```env
STOREFRONT_CNAME_TARGET=cname.tescommerce.com
STORE_BASE_DOMAIN=ugclab.store
VERCEL_TOKEN=
VERCEL_STOREFRONT_PROJECT_ID=
ENTRI_APPLICATION_ID=   # optional — live availability
ENTRI_CLIENT_SECRET=
```

Without Entri, **Buy** still works via registrar deep links (Cloudflare & Namecheap listed first).

## i18n

Admin strings: `domainsPage.*` in `packages/i18n/src/admin/messages-en.ts` and `messages-ru.ts`.  
Switch admin language in the sidebar to see Russian copy.
