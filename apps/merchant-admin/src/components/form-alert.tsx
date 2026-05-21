export function FormAlert({
  ok,
  message,
}: {
  ok?: boolean;
  message?: string;
}) {
  if (!message) return null;
  return (
    <div
      className={`rounded-lg border px-4 py-3 text-sm ${
        ok
          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
          : "border-red-200 bg-red-50 text-red-800"
      }`}
      role="alert"
    >
      {message}
    </div>
  );
}
