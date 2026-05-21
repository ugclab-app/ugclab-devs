export function StorePreview() {
  return (
    <div className="relative mx-auto mt-16 max-w-4xl px-4">
      <div className="absolute -inset-4 rounded-3xl bg-gradient-to-r from-violet-500/20 to-indigo-500/20 blur-2xl" />
      <div className="relative overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-2xl shadow-violet-500/10">
        <div className="flex items-center gap-2 border-b border-zinc-100 bg-zinc-50/80 px-4 py-3">
          <span className="h-3 w-3 rounded-full bg-red-400" />
          <span className="h-3 w-3 rounded-full bg-amber-400" />
          <span className="h-3 w-3 rounded-full bg-emerald-400" />
          <span className="ml-4 flex-1 rounded-md bg-white px-3 py-1 text-xs text-zinc-400">
            demo.ugclab.store
          </span>
        </div>
        <div className="grid gap-0 md:grid-cols-5">
          <aside className="hidden border-r border-zinc-100 bg-zinc-50/50 p-4 md:col-span-1 md:block">
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Admin
            </p>
            <ul className="mt-4 space-y-2 text-sm text-zinc-600">
              {["Dashboard", "Products", "Orders"].map((item, i) => (
                <li
                  key={item}
                  className={`rounded-lg px-2 py-1.5 ${i === 1 ? "bg-violet-100 font-medium text-violet-700" : ""}`}
                >
                  {item}
                </li>
              ))}
            </ul>
          </aside>
          <div className="p-6 md:col-span-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-500">Revenue (30d)</p>
                <p className="text-2xl font-bold text-zinc-900">$12,480</p>
              </div>
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">
                +24% ↑
              </span>
            </div>
            <div className="mt-6 grid grid-cols-3 gap-3">
              {[
                { name: "Preset Pack", price: "$29", type: "Digital" },
                { name: "Creator Tee", price: "$35", type: "Physical" },
                { name: "Course Bundle", price: "$99", type: "Digital" },
              ].map((p) => (
                <div
                  key={p.name}
                  className="rounded-xl border border-zinc-100 bg-gradient-to-b from-zinc-50 to-white p-3"
                >
                  <div className="mb-2 h-16 rounded-lg bg-gradient-to-br from-violet-100 to-indigo-100" />
                  <p className="text-xs font-semibold text-zinc-800">{p.name}</p>
                  <p className="text-xs text-zinc-500">
                    {p.price} · {p.type}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
