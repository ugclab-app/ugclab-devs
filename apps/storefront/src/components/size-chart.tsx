export function SizeChart({ text }: { text: string }) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !/^\|?[\s:-]+\|?$/.test(line.replace(/\|/g, "")));
  const rows = lines
    .map((line) =>
      line
        .replace(/^\|/, "")
        .replace(/\|$/, "")
        .split(/\s*\|\s*|,\s*/)
        .map((cell) => cell.trim())
        .filter((cell) => cell.length > 0)
    )
    .filter((row) => row.length > 1);
  const width = rows[0]?.length ?? 0;
  const table = rows.length > 1 && rows.every((row) => row.length === width);

  if (!table) {
    return (
      <section className="mt-8">
        <h2 className="text-lg font-semibold">Size chart</h2>
        <pre className="mt-3 whitespace-pre-wrap rounded-xl border border-zinc-200 bg-white p-4 text-sm text-zinc-700">
          {text}
        </pre>
      </section>
    );
  }

  const [head, ...body] = rows;
  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold">Size chart</h2>
      <div className="mt-3 overflow-x-auto rounded-xl border border-zinc-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-zinc-50 text-zinc-600">
            <tr>
              {head!.map((cell) => (
                <th key={cell} className="px-4 py-2 font-medium">
                  {cell}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {body.map((row, i) => (
              <tr key={i} className="border-t border-zinc-100">
                {row.map((cell, j) => (
                  <td key={j} className="px-4 py-2 text-zinc-800">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
