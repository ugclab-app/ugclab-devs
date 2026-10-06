import type { PlatformPermission } from "@/lib/platform-permissions";

export type NavItem = {
  to: string;
  label: string;
  permission: PlatformPermission;
  group?: "overview" | "commerce" | "people" | "platform" | "trust";
};

export const NAV_ITEMS: NavItem[] = [
  { to: "/dashboard", label: "Overview", permission: "dashboard:read", group: "overview" },
  { to: "/inbox", label: "Inbox", permission: "inbox:read", group: "overview" },
  { to: "/search", label: "Search", permission: "search:read", group: "overview" },
  { to: "/revenue", label: "Revenue", permission: "revenue:read", group: "commerce" },
  { to: "/disputes", label: "Disputes", permission: "disputes:read", group: "commerce" },
  { to: "/tenants", label: "Stores", permission: "tenants:read", group: "commerce" },
  { to: "/orders", label: "Orders", permission: "orders:read", group: "commerce" },
  { to: "/payments-local", label: "GoPay / Finik", permission: "integrations:read", group: "commerce" },
  { to: "/payouts", label: "Payouts", permission: "payouts:read", group: "commerce" },
  { to: "/domains", label: "Domains", permission: "tenants:read", group: "commerce" },
  { to: "/affiliates", label: "Affiliates", permission: "tenants:read", group: "commerce" },
  { to: "/platform-partners", label: "Platform partners", permission: "tenants:read", group: "commerce" },
  { to: "/themes", label: "Themes", permission: "tenants:write", group: "commerce" },
  { to: "/blocks", label: "Blocks", permission: "tenants:write", group: "commerce" },
  { to: "/sections", label: "Sections", permission: "tenants:write", group: "commerce" },
  { to: "/users", label: "Users", permission: "users:read", group: "people" },
  { to: "/plans", label: "Plans", permission: "plans:write", group: "platform" },
  { to: "/activity", label: "Activity", permission: "audit:read", group: "platform" },
  { to: "/audit", label: "Audit", permission: "audit:read", group: "trust" },
  { to: "/announcements", label: "Announcements", permission: "announcements:write", group: "platform" },
  { to: "/merchant-messages", label: "Merchant messages", permission: "tenants:write", group: "platform" },
  { to: "/email-templates", label: "Email templates", permission: "settings:write", group: "platform" },
  { to: "/outreach", label: "Outreach", permission: "outreach:send", group: "platform" },
  { to: "/marketing", label: "Marketing", permission: "tenants:read", group: "platform" },
  { to: "/reports", label: "Reports", permission: "dashboard:read", group: "platform" },
  { to: "/moderation", label: "Moderation", permission: "moderation:write", group: "trust" },
  { to: "/integrations", label: "Integrations", permission: "integrations:read", group: "platform" },
  { to: "/compliance", label: "Compliance", permission: "blacklist:write", group: "trust" },
  { to: "/system", label: "System", permission: "dashboard:read", group: "platform" },
  { to: "/settings", label: "Settings", permission: "settings:write", group: "platform" },
];

export const NAV_GROUP_LABELS: Record<NonNullable<NavItem["group"]>, string> = {
  overview: "Overview",
  commerce: "Commerce",
  people: "People",
  platform: "Platform",
  trust: "Trust & safety",
};
