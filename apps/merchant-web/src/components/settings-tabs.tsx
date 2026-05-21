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
}: {
  active: SettingsTabId;
  onChange: (id: SettingsTabId) => void;
}) {
  return (
    <nav className="settings-tabs" aria-label="Settings sections">
      {TABS.map((tab) => (
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
