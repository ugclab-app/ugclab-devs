import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { storeApi } from "@/api/client";
import { useStoreParams } from "@/hooks/use-store-params";

export function PolicyPage() {
  const { kind } = useParams<{ kind: string }>();
  const { tenant } = useStoreParams();

  const { data, isError } = useQuery({
    queryKey: ["policy", tenant, kind],
    queryFn: () => storeApi.policy(tenant, kind!),
    enabled: !!kind,
  });

  useEffect(() => {
    if (data?.externalUrl) window.location.href = data.externalUrl;
  }, [data?.externalUrl]);

  if (isError) return <p className="text-zinc-500">Policy not found.</p>;
  if (!data) return <p className="text-zinc-500">Loading…</p>;
  if (data.externalUrl) return <p className="text-zinc-500">Redirecting…</p>;

  const title = kind === "privacy" ? "Privacy policy" : "Refund policy";

  return (
    <article className="prose prose-zinc max-w-3xl">
      <h1 className="text-3xl font-bold">{title}</h1>
      <div className="mt-8 whitespace-pre-wrap text-zinc-700">{data.body}</div>
    </article>
  );
}
