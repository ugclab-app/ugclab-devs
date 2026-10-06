import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";
import { QueryState } from "@/components/query-state";

export default function MerchantMessagesPage() {
  const query = useQuery({
    queryKey: ["platform-messages-all"],
    queryFn: () => api.platformMessages(),
  });
  const repliesQ = useQuery({
    queryKey: ["platform-messages-replies"],
    queryFn: () => api.platformMessages(new URLSearchParams({ hasReply: "1" })),
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Merchant messages</h1>
        <p className="mt-1 text-sm text-slate-500">
          Direct messages to stores. Compose from a store page. Replies appear below.
        </p>
      </div>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Merchant replies</h2>
        <QueryState query={repliesQ}>
          {(data) => (
            <ul className="platform-card divide-y text-sm">
              {((data.messages ?? []) as {
                id: string;
                tenantId: string;
                tenantName: string;
                tenantSlug: string;
                subject: string;
                merchantReply: string | null;
                merchantRepliedAt: string | null;
              }[])
                .filter((m) => m.merchantReply)
                .map((m) => (
                  <li key={m.id} className="px-4 py-3">
                    <Link
                      to={`/tenants/${m.tenantId}`}
                      className="font-medium text-sky-600 hover:underline"
                    >
                      {m.tenantName}
                    </Link>
                    <span className="text-slate-500"> · {m.subject}</span>
                    <p className="mt-1 whitespace-pre-wrap text-slate-800">
                      {m.merchantReply}
                    </p>
                    {m.merchantRepliedAt ? (
                      <p className="mt-1 text-xs text-slate-400">
                        {new Date(m.merchantRepliedAt).toLocaleString()}
                      </p>
                    ) : null}
                  </li>
                ))}
              {(data.messages as unknown[])?.length === 0 ? (
                <li className="px-4 py-8 text-center text-slate-500">No replies yet</li>
              ) : null}
            </ul>
          )}
        </QueryState>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">All outbound</h2>
        <QueryState query={query}>
          {(data) => (
            <div className="platform-card overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-slate-50 text-left text-xs uppercase text-slate-500">
                    <th className="px-4 py-2">Date</th>
                    <th className="px-4 py-2">Store</th>
                    <th className="px-4 py-2">Subject</th>
                    <th className="px-4 py-2">From</th>
                    <th className="px-4 py-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {((data.messages ?? []) as {
                    id: string;
                    createdAt: string;
                    tenantId: string;
                    tenantName: string;
                    subject: string;
                    actorEmail: string;
                    readAt: string | null;
                    merchantReply: string | null;
                  }[]).map((m) => (
                    <tr key={m.id}>
                      <td className="px-4 py-2 whitespace-nowrap text-slate-600">
                        {new Date(m.createdAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-2">
                        <Link to={`/tenants/${m.tenantId}`} className="text-sky-600">
                          {m.tenantName}
                        </Link>
                      </td>
                      <td className="px-4 py-2">{m.subject}</td>
                      <td className="px-4 py-2 text-xs text-slate-500">{m.actorEmail}</td>
                      <td className="px-4 py-2 text-xs">
                        {m.merchantReply
                          ? "Replied"
                          : m.readAt
                            ? "Read"
                            : "Unread"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </QueryState>
      </section>
    </div>
  );
}
