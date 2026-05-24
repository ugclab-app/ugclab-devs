import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";

export default function CreateTenantPage() {
  const navigate = useNavigate();
  const { data: plansData } = useQuery({ queryKey: ["plans"], queryFn: () => api.plans() });
  const plans = (plansData?.plans ?? []) as { id: string; name: string }[];
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    try {
      const res = (await api.createTenant({
        storeName: fd.get("storeName"),
        slug: fd.get("slug"),
        ownerEmail: fd.get("ownerEmail"),
        ownerName: fd.get("ownerName"),
        planId: fd.get("planId") || undefined,
        password: fd.get("password") || undefined,
      })) as { tenant: { id: string } };
      const tenant = res.tenant;
      navigate(`/tenants/${tenant.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <Link to="/tenants" className="text-sm text-slate-500 hover:text-sky-600">
        ← Stores
      </Link>
      <h1 className="text-2xl font-bold">Create store</h1>
      <form onSubmit={onSubmit} className="platform-card space-y-4 p-6">
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <label className="block text-sm">
          Store name
          <input name="storeName" required className="ugclab-input mt-1 w-full" />
        </label>
        <label className="block text-sm">
          Slug
          <input name="slug" required className="ugclab-input mt-1 w-full font-mono" />
        </label>
        <label className="block text-sm">
          Owner email
          <input name="ownerEmail" type="email" required className="ugclab-input mt-1 w-full" />
        </label>
        <label className="block text-sm">
          Owner name
          <input name="ownerName" className="ugclab-input mt-1 w-full" />
        </label>
        <label className="block text-sm">
          Initial password (new users only)
          <input name="password" type="text" className="ugclab-input mt-1 w-full" />
        </label>
        <label className="block text-sm">
          Plan
          <select name="planId" className="ugclab-select mt-1 w-full">
            <option value="">Default</option>
            {plans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          disabled={loading}
          className="ugclab-btn ugclab-btn-primary w-full"
        >
          {loading ? "Creating…" : "Create store"}
        </button>
      </form>
    </div>
  );
}
