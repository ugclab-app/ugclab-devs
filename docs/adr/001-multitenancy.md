# ADR 001: Shared database multitenancy

## Status

Accepted

## Context

UGCLab Store is a global multi-merchant SaaS. We need tenant isolation without operational overhead of per-tenant databases.

## Decision

Use **one PostgreSQL database** with `tenant_id` on every merchant-scoped table. Resolve tenant from:

1. `?tenant=slug` (local development)
2. Subdomain `{slug}.STOREFRONT_BASE_DOMAIN`
3. Verified custom domain mapping

## Consequences

- All queries in storefront/admin must filter by `tenant_id`
- Prisma repositories and middleware enforce scope
- Super-admin uses separate code paths without tenant filter
- Future: Redis cache for host → tenant mapping
