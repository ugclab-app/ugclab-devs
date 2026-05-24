const TABS = [
  { id: "general", label: "General" },
  { id: "billing", label: "Subscription" },
  { id: "payments", label: "Payments" },
  { id: "domain", label: "Domain & shipping" },
  { id: "team", label: "Team & security" },
  { id: "policies", label: "Policies & SEO" },
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
          {tab.label}
        </button>
      ))}
    </nav>
  );
}
