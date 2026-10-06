import { useState } from "react";
import { Button, Input } from "@ugclab/ui";

type InviteKind = "staff" | "admin";

export function InviteUserDialog({
  kind,
  open,
  onClose,
  onSubmit,
}: {
  kind: InviteKind;
  open: boolean;
  onClose: () => void;
  onSubmit: (data: { email: string; name: string; role: string }) => Promise<string | null>;
}) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState(
    kind === "admin" ? "SUPER_ADMIN" : "PLATFORM_OPS"
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    setPending(true);
    try {
      const msg = await onSubmit({ email: email.trim(), name: name.trim(), role });
      setResult(msg);
      if (!msg?.includes("password")) {
        setEmail("");
        setName("");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invite failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="platform-card w-full max-w-md p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold text-slate-900">
          {kind === "admin" ? "Invite super admin" : "Invite platform staff"}
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          {kind === "admin"
            ? "Full platform access. Use sparingly."
            : "Scoped access based on role."}
        </p>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {error ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              {error}
            </p>
          ) : null}
          {result ? (
            <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
              {result}
            </p>
          ) : null}
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            label="Name (optional)"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          {kind === "staff" ? (
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-slate-700">Role</span>
              <select
                className="ugclab-select w-full"
                value={role}
                onChange={(e) => setRole(e.target.value)}
              >
                <option value="PLATFORM_OPS">Operations</option>
                <option value="PLATFORM_SUPPORT">Support</option>
                <option value="PLATFORM_FINANCE">Finance</option>
              </select>
            </label>
          ) : null}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="ugclab-btn border border-slate-200 bg-white" onClick={onClose}>
              Close
            </button>
            <Button type="submit" disabled={pending}>
              {pending ? "Sending…" : "Send invite"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
