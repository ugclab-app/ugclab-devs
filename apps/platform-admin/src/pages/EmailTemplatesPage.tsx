import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";
import { QueryState } from "@/components/query-state";

type Template = {
  key: string;
  label: string;
  subject: string;
  html: string;
  text: string | null;
};

export default function EmailTemplatesPage() {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["email-templates"],
    queryFn: () => api.emailTemplates(),
  });
  const [edit, setEdit] = useState<Template | null>(null);
  const [testTo, setTestTo] = useState("");
  const [preview, setPreview] = useState<{ subject: string; html: string } | null>(null);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Email templates</h1>
      <p className="text-sm text-slate-500">
        Platform transactional emails. Use {"{{var}}"} placeholders in subject and body.
      </p>

      <QueryState query={query}>
        {(data) => (
          <ul className="space-y-3">
            {(data.templates as Template[]).map((t) => (
              <li key={t.key} className="platform-card flex items-center justify-between gap-4 p-4">
                <div>
                  <p className="font-semibold">{t.label}</p>
                  <p className="font-mono text-xs text-slate-500">{t.key}</p>
                  <p className="mt-1 text-sm text-slate-600">{t.subject}</p>
                </div>
                <button
                  type="button"
                  className="text-sm text-sky-600"
                  onClick={() => {
                  setPreview(null);
                  setEdit({ ...t });
                }}
                >
                  Edit
                </button>
              </li>
            ))}
          </ul>
        )}
      </QueryState>

      {edit ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="platform-card max-h-[90vh] w-full max-w-2xl overflow-y-auto p-6">
            <h2 className="font-semibold">{edit.label}</h2>
            <div className="mt-4 space-y-3 text-sm">
              <label className="block">
                Subject
                <input
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                  value={edit.subject}
                  onChange={(e) => setEdit({ ...edit, subject: e.target.value })}
                />
              </label>
              <label className="block">
                HTML
                <textarea
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-xs"
                  rows={8}
                  value={edit.html}
                  onChange={(e) => setEdit({ ...edit, html: e.target.value })}
                />
              </label>
              <label className="block">
                Plain text
                <textarea
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-xs"
                  rows={3}
                  value={edit.text ?? ""}
                  onChange={(e) => setEdit({ ...edit, text: e.target.value })}
                />
              </label>
              <div className="flex gap-2 items-end">
                <label className="flex-1 block">
                  Test send to
                  <input
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                    value={testTo}
                    onChange={(e) => setTestTo(e.target.value)}
                    placeholder="you@example.com"
                  />
                </label>
                <button
                  type="button"
                  className="ugclab-btn border border-slate-200"
                  onClick={() =>
                    api
                      .previewEmailTemplate({
                        subject: edit.subject,
                        html: edit.html,
                        vars: {
                          domain: "example.com",
                          txtValue: "ugclab-verify-demo",
                          amount: "$50.00",
                          orderNumber: "1001",
                        },
                      })
                      .then((r) => setPreview(r))
                      .catch((e) => alert(String(e)))
                  }
                >
                  Preview
                </button>
                <button
                  type="button"
                  className="ugclab-btn border border-slate-200"
                  onClick={() =>
                    api
                      .testEmailTemplate(edit.key, testTo, {
                        domain: "example.com",
                        txtValue: "ugclab-verify-demo",
                        amount: "$50.00",
                        orderNumber: "1001",
                      })
                      .then(() => alert("Sent"))
                      .catch((e) => alert(String(e)))
                  }
                >
                  Test send
                </button>
              </div>
              {preview ? (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs font-semibold uppercase text-slate-500">Preview subject</p>
                  <p className="mt-1 font-medium">{preview.subject}</p>
                  <p className="mt-3 text-xs font-semibold uppercase text-slate-500">HTML</p>
                  <iframe
                    title="Email preview"
                    className="mt-2 h-64 w-full rounded border border-slate-200 bg-white"
                    srcDoc={preview.html}
                  />
                </div>
              ) : null}
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" className="ugclab-btn border border-slate-200" onClick={() => setEdit(null)}>
                Cancel
              </button>
              <button
                type="button"
                className="ugclab-btn ugclab-btn-primary"
                onClick={() =>
                  api
                    .updateEmailTemplate(edit.key, {
                      subject: edit.subject,
                      html: edit.html,
                      text: edit.text,
                    })
                    .then(() => {
                      setEdit(null);
                      qc.invalidateQueries({ queryKey: ["email-templates"] });
                    })
                }
              >
                Save
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
