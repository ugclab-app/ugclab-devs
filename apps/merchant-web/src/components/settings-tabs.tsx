import { useAdminT } from "@/hooks/use-admin-t";

const TABS = [
  { id: "general", labelKey: "settingsPage.tabs.general" },
  { id: "markets", labelKey: "settingsPage.tabs.markets" },
  { id: "tax", labelKey: "settingsPage.tabs.tax" },
  { id: "billing", labelKey: "settingsPage.tabs.billing" },
  { id: "payments", labelKey: "settingsPage.tabs.payments" },
  { id: "domain", labelKey: "settingsPage.tabs.domain" },
  { id: "team", labelKey: "settingsPage.tabs.team" },
  { id: "policies", labelKey: "settingsPage.tabs.policies" },
] as const;

export type SettingsTabId = (typeof TABS)[number]["id"];

export function SettingsTabs({
  active,
  onChange,
  visibleIds,
}: {
  active: SettingsTabId;
  onChange: (id: SettingsTabId) => void;
  /** When set, only these tab ids are shown (e.g. non-owner admin). */
  visibleIds?: SettingsTabId[];
}) {
  const { ta } = useAdminT();
  const tabs = visibleIds
    ? TABS.filter((t) => visibleIds.includes(t.id))
    : TABS;
  return (
    <nav className="settings-tabs" aria-label="Settings sections">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={`settings-tab ${active === tab.id ? "settings-tab-active" : ""}`}
          aria-current={active === tab.id ? "page" : undefined}
        >
          {ta(tab.labelKey)}
        </button>
      ))}
    </nav>
  );
}
