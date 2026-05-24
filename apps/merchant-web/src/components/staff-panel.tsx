import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";
import { FormAlert } from "@/components/form-alert";
import { SettingsPanelShell } from "@/components/settings-section";
import { MediaPicker } from "@/components/media-picker";

type StaffMember = {
  id: string;
  userId?: string | null;
  email: string;
  role: string;
  permissions: string[];
  acceptedAt: string | null;
  inviteExpiresAt: string | null;
  inviteExpired: boolean;
  pending: boolean;
  user: {
    name: string | null;
    avatarUrl: string | null;
  } | null;
};

function MemberAvatar({
  name,
  email,
  avatarUrl,
}: {
  name: string | null;
  email: string;
  avatarUrl: string | null;
}) {
  const label = (name ?? email).trim();
  const initials = label
    .split(/[@\s]/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? "")
    .join("");
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt=""
        className="h-9 w-9 rounded-full object-cover border border-zinc-200"
      />
    );
  }
  return (
    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-100 text-xs font-semibold text-violet-800">
      {initials || "?"}
    </span>
  );
}

export function StaffPanel() {
  const queryClient = useQueryClient();
  const { data: access } = useQuery({
    queryKey: ["access"],
    queryFn: () => api.access(),
  });
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["staff"],
    queryFn: () => api.staff(),
    retry: 1,
  });
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("STAFF");
  const [preset, setPreset] = useState("");
  const [staffPerms, setStaffPerms] = useState<string[]>([]);
  const [alert, setAlert] = useState<{ ok?: boolean; message?: string }>({});
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [transferEmail, setTransferEmail] = useState("");
  const [pending, setPending] = useState(false);

  const assignable = access?.assignable ?? [];
  const labels = (access?.labels ?? {}) as Record<string, string>;
  const presets = (access?.presets ?? {}) as Record<
    string,
    { label: string; permissions: string[] }
  >;

  if (isLoading) return <p className="text-sm text-zinc-500">Loading team…</p>;

  if (isError || !data) {
    return (
      <SettingsPanelShell title="Team" description="Invite colleagues and control access.">
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <p className="font-medium">Could not load team</p>
          <p className="mt-1 text-red-700">
            {error instanceof Error
              ? error.message
              : "Server error — run database migrations (see terminal)."}
          </p>
          <button
            type="button"
            className="mt-3 text-sm font-semibold text-violet-700 underline"
            onClick={() => void refetch()}
          >
            Retry
          </button>
        </div>
      </SettingsPanelShell>
    );
  }

  const owner = data.owner as {
    email: string;
    name: string | null;
    avatarUrl?: string | null;
  };
  const members = data.members as StaffMember[];
  const isOwner = (data as { isOwner?: boolean }).isOwner ?? false;

  function applyPreset(id: string) {
    setPreset(id);
    const p = presets[id];
    if (p) setStaffPerms([...p.permissions]);
  }

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    try {
      const res = await api.inviteStaff(
        email,
        role,
        role === "STAFF" ? staffPerms : undefined
      );
      setInviteLink(res.inviteLink);
      setEmail("");
      setAlert({
        ok: true,
        message: res.emailSent
          ? "Invitation emailed"
          : "Invitation created (copy link — email not configured)",
      });
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
      <div className="mb-4 rounded-lg border border-zinc-200 bg-zinc-50/80 px-4 py-3 text-sm text-zinc-600">
        <p>
          <strong className="text-zinc-800">Admin</strong> — full store access except
          payments, payouts, domain, and subscription (owner only).
        </p>
        <p className="mt-1">
          <strong className="text-zinc-800">Staff</strong> — only the sections you enable
          below. Orders require 2FA for everyone.
        </p>
      </div>

      <FormAlert ok={alert.ok} message={alert.message} />

      <ul className="divide-y divide-zinc-100 text-sm">
        <li className="flex items-center gap-3 py-3">
          <MemberAvatar
            name={owner.name}
            email={owner.email}
            avatarUrl={owner.avatarUrl ?? null}
          />
          <div className="min-w-0 flex-1">
            <p className="font-medium">
              {owner.name ?? owner.email}{" "}
              <span className="text-zinc-400">(owner)</span>
            </p>
            <p className="text-zinc-500">{owner.email}</p>
          </div>
        </li>
        {members.map((m) => (
          <li key={m.id} className="space-y-2 py-3">
            <div className="flex items-start gap-3">
              <MemberAvatar
                name={m.user?.name ?? null}
                email={m.email}
                avatarUrl={m.user?.avatarUrl ?? null}
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span>
                    {m.user?.name ?? m.email}{" "}
                    <span className="rounded bg-zinc-100 px-2 py-0.5 text-xs">
                      {m.role}
                    </span>
                    {m.pending ? (
                      <span className="ml-2 text-xs text-amber-600">
                        {m.inviteExpired ? "expired" : "pending"}
                      </span>
                    ) : null}
                  </span>
                  {isOwner ? (
                    <div className="flex gap-2 text-xs">
                      {m.pending && !m.inviteExpired ? (
                        <button
                          type="button"
                          className="text-violet-600 font-medium"
                          onClick={async () => {
                            const res = await api.resendStaffInvite(m.id);
                            setInviteLink(res.inviteLink);
                            setAlert({
                              ok: true,
                              message: res.emailSent
                                ? "Invite resent by email"
                                : "New invite link created",
                            });
                            await queryClient.invalidateQueries({
                              queryKey: ["staff"],
                            });
                          }}
                        >
                          Resend
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className="text-red-600 font-medium"
                        onClick={async () => {
                          const label = m.pending ? "Revoke invite for" : "Remove";
                          if (!confirm(`${label} ${m.email}?`)) return;
                          await api.removeStaff(m.id);
                          await queryClient.invalidateQueries({ queryKey: ["staff"] });
                        }}
                      >
                        {m.pending ? "Revoke" : "Remove"}
                      </button>
                    </div>
                  ) : null}
                </div>
                <p className="text-xs text-zinc-500">{m.email}</p>
                {m.inviteExpiresAt && m.pending ? (
                  <p className="text-xs text-zinc-400">
                    Expires {new Date(m.inviteExpiresAt).toLocaleString()}
                  </p>
                ) : null}
              </div>
            </div>
            {isOwner && m.role === "STAFF" && m.acceptedAt ? (
              <StaffPermissionsEditor
                memberId={m.id}
                initial={m.permissions ?? []}
                assignable={assignable}
                labels={labels}
                presets={presets}
              />
            ) : null}
          </li>
        ))}
      </ul>

      {isOwner ? (
        <>
          <form onSubmit={invite} className="space-y-3 border-t pt-4">
            <div className="flex flex-wrap gap-2">
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
                onChange={(e) => {
                  setRole(e.target.value);
                  if (e.target.value === "ADMIN") setStaffPerms([]);
                }}
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
            </div>
            {role === "STAFF" ? (
              <div className="rounded-lg border border-zinc-100 bg-zinc-50 p-3 text-xs">
                <p className="font-medium text-zinc-600">Role presets</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {Object.entries(presets).map(([id, p]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => applyPreset(id)}
                      className={`rounded-full px-3 py-1 ${
                        preset === id
                          ? "bg-violet-600 text-white"
                          : "bg-white border border-zinc-200 text-zinc-700"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
                <p className="mt-3 font-medium text-zinc-600">Access sections</p>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {assignable.map((p) => (
                    <label key={p} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={staffPerms.includes(p)}
                        onChange={(e) => {
                          setStaffPerms((prev) =>
                            e.target.checked
                              ? [...prev, p]
                              : prev.filter((x) => x !== p)
                          );
                        }}
                      />
                      {labels[p] ?? p}
                    </label>
                  ))}
                </div>
              </div>
            ) : null}
          </form>
          {inviteLink ? (
            <p className="break-all text-xs text-zinc-600">
              Invite link:{" "}
              <a href={inviteLink} className="text-violet-600">
                {inviteLink}
              </a>
            </p>
          ) : null}

          <form
            className="mt-6 space-y-2 border-t border-amber-100 pt-4"
            onSubmit={async (e) => {
              e.preventDefault();
              if (
                !confirm(
                  `Transfer store ownership to ${transferEmail}? You will become Admin.`
                )
              ) {
                return;
              }
              try {
                await api.transferOwnership(transferEmail);
                setAlert({ ok: true, message: "Ownership transferred. Refreshing…" });
                window.location.reload();
              } catch (err) {
                setAlert({
                  ok: false,
                  message: err instanceof Error ? err.message : "Transfer failed",
                });
              }
            }}
          >
            <p className="text-sm font-medium text-zinc-800">Transfer ownership</p>
            <p className="text-xs text-zinc-500">
              New owner must already be an active team member (accepted invite).
            </p>
            <div className="flex flex-wrap gap-2">
              <input
                type="email"
                value={transferEmail}
                onChange={(e) => setTransferEmail(e.target.value)}
                placeholder="new-owner@email.com"
                className="ugclab-input min-w-[200px] flex-1"
              />
              <button
                type="submit"
                className="ugclab-btn border border-amber-300 bg-amber-50 text-amber-900"
              >
                Transfer
              </button>
            </div>
          </form>
        </>
      ) : null}
    </SettingsPanelShell>
  );
}

function StaffPermissionsEditor({
  memberId,
  initial,
  assignable,
  labels,
  presets,
}: {
  memberId: string;
  initial: string[];
  assignable: string[];
  labels: Record<string, string>;
  presets: Record<string, { label: string; permissions: string[] }>;
}) {
  const qc = useQueryClient();
  const [perms, setPerms] = useState(initial);
  const [saved, setSaved] = useState(false);

  return (
    <div className="rounded-lg border border-zinc-100 bg-zinc-50 p-3 text-xs">
      <div className="flex flex-wrap gap-2">
        {Object.entries(presets).map(([id, p]) => (
          <button
            key={id}
            type="button"
            className="rounded-full border border-zinc-200 bg-white px-2 py-0.5 text-zinc-700 hover:border-violet-300"
            onClick={() => setPerms([...p.permissions])}
          >
            {p.label}
          </button>
        ))}
      </div>
      <p className="mt-2 font-medium text-zinc-600">Access sections</p>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        {assignable.map((p) => (
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
            {labels[p] ?? p}
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

export function ProfileAvatarPanel() {
  const qc = useQueryClient();
  const { data: access } = useQuery({
    queryKey: ["access"],
    queryFn: () => api.access(),
  });
  const { data: staffData } = useQuery({
    queryKey: ["staff"],
    queryFn: () => api.staff(),
  });
  const [name, setName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [alert, setAlert] = useState<{ ok?: boolean; message?: string }>({});

  useEffect(() => {
    if (!staffData) return;
    const uid = (staffData as { currentUserId: string }).currentUserId;
    const owner = staffData.owner as {
      id?: string;
      name: string | null;
      avatarUrl?: string | null;
    };
    if (owner?.id === uid) {
      setName(owner.name ?? "");
      setAvatarUrl(owner.avatarUrl ?? "");
      return;
    }
    const members = staffData.members as StaffMember[];
    const me = members.find((m) => m.userId === uid);
    if (me) {
      setName(me.user?.name ?? "");
      setAvatarUrl(me.user?.avatarUrl ?? "");
    }
  }, [staffData]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api.updateProfile({ name, avatarUrl });
      setAlert({ ok: true, message: "Profile updated" });
      await qc.invalidateQueries({ queryKey: ["staff"] });
      await qc.invalidateQueries({ queryKey: ["access"] });
    } catch (err) {
      setAlert({
        ok: false,
        message: err instanceof Error ? err.message : "Save failed",
      });
    }
  }

  return (
    <SettingsPanelShell
      title="Your profile"
      description="Name and avatar appear in the team list and activity log."
    >
      <FormAlert ok={alert.ok} message={alert.message} />
      <form onSubmit={save} className="space-y-3">
        <label className="block text-sm">
          Display name
          <input
            className="ugclab-input mt-1 w-full"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
          />
        </label>
        <div>
          <span className="text-sm font-medium text-zinc-700">Avatar URL</span>
          <input
            className="ugclab-input mt-1 w-full font-mono text-xs"
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
            placeholder="https://…"
          />
          <div className="mt-2">
            <MediaPicker onUploaded={(url) => setAvatarUrl(url)} />
          </div>
        </div>
        {access?.totpEnabled === false ? (
          <p className="text-xs text-amber-700">
            Enable 2FA below to access orders and payouts.
          </p>
        ) : null}
        <button type="submit" className="ugclab-btn ugclab-btn-primary">
          Save profile
        </button>
      </form>
    </SettingsPanelShell>
  );
}
