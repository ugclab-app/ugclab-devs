import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";
import { FormAlert } from "@/components/form-alert";
import { SettingsPanelShell } from "@/components/settings-section";

export function StaffPanel() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["staff"],
    queryFn: () => api.staff(),
  });
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("STAFF");
  const [alert, setAlert] = useState<{ ok?: boolean; message?: string }>({});
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (isLoading || !data) return <p className="text-sm text-zinc-500">Loading team…</p>;

  const owner = data.owner as { email: string; name: string | null };
  const members = data.members as {
    id: string;
    email: string;
    role: string;
    permissions: string[];
    acceptedAt: string | null;
    user?: { name: string | null } | null;
  }[];
  const isOwner = (data as { isOwner?: boolean }).isOwner ?? false;

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    try {
      const res = await api.inviteStaff(email, role);
      setInviteLink(res.inviteLink);
      setEmail("");
      setAlert({ ok: true, message: "Invitation created" });
      await queryClient.invalidateQueries({ queryKey: ["staff"] });
    } catch (err) {
      setAlert({
        ok: false,
        message: err instanceof Error ? err.message : "Invite failed",
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <SettingsPanelShell
      title="Team"
      description="Invite colleagues and control which sections staff can access."
    >
      <FormAlert ok={alert.ok} message={alert.message} />
      <ul className="divide-y divide-zinc-100 text-sm">
        <li className="flex justify-between py-3">
          <span>
            {owner.name ?? owner.email} <span className="text-zinc-400">(owner)</span>
          </span>
          <span className="text-zinc-500">{owner.email}</span>
        </li>
        {members.map((m) => (
          <li key={m.id} className="space-y-2 py-3">
            <div className="flex items-center justify-between">
              <span>
                {m.user?.name ?? m.email}{" "}
                <span className="rounded bg-zinc-100 px-2 py-0.5 text-xs">{m.role}</span>
                {!m.acceptedAt ? (
                  <span className="ml-2 text-xs text-amber-600">pending</span>
                ) : null}
              </span>
              {isOwner ? (
                <button
                  type="button"
                  onClick={async () => {
                    if (!confirm(`Remove ${m.email}?`)) return;
                    await api.removeStaff(m.id);
                    await queryClient.invalidateQueries({ queryKey: ["staff"] });
                  }}
                  className="text-red-600 text-xs font-medium"
                >
                  Remove
                </button>
              ) : null}
            </div>
            {isOwner && m.role === "STAFF" ? (
              <StaffPermissionsEditor memberId={m.id} initial={m.permissions ?? []} />
            ) : null}
          </li>
        ))}
      </ul>
      {isOwner ? (
        <form onSubmit={invite} className="flex flex-wrap gap-2 border-t pt-4">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="colleague@email.com"
            required
            className="ugclab-input min-w-[200px] flex-1"
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="ugclab-select w-28"
          >
            <option value="STAFF">Staff</option>
            <option value="ADMIN">Admin</option>
          </select>
          <button
            type="submit"
            disabled={pending}
            className="ugclab-btn ugclab-btn-primary"
          >
            Invite
          </button>
        </form>
      ) : null}
      {inviteLink ? (
        <p className="break-all text-xs text-zinc-600">
          Invite link: <a href={inviteLink} className="text-violet-600">{inviteLink}</a>
        </p>
      ) : null}
    </SettingsPanelShell>
  );
}

const PERM_OPTIONS = [
  "dashboard",
  "products",
  "orders",
  "customers",
  "marketing",
  "collections",
  "pages",
  "reports",
  "storefront",
];

function StaffPermissionsEditor({
  memberId,
  initial,
}: {
  memberId: string;
  initial: string[];
}) {
  const qc = useQueryClient();
  const [perms, setPerms] = useState(initial);
  const [saved, setSaved] = useState(false);

  return (
    <div className="rounded-lg border border-zinc-100 bg-zinc-50 p-3 text-xs">
      <p className="font-medium text-zinc-600">Access sections</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {PERM_OPTIONS.map((p) => (
          <label key={p} className="flex items-center gap-1">
            <input
              type="checkbox"
              checked={perms.includes(p)}
              onChange={(e) => {
                setPerms((prev) =>
                  e.target.checked ? [...prev, p] : prev.filter((x) => x !== p)
                );
                setSaved(false);
              }}
            />
            {p}
          </label>
        ))}
      </div>
      <button
        type="button"
        className="mt-2 text-violet-600 font-medium"
        onClick={async () => {
          await api.updateStaffPermissions(memberId, perms);
          setSaved(true);
          await qc.invalidateQueries({ queryKey: ["staff"] });
        }}
      >
        {saved ? "Saved" : "Save permissions"}
      </button>
    </div>
  );
}
