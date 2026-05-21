import { useRef, useState } from "react";

export function FileDropzone({
  name,
  accept,
  hint,
  currentLabel,
  onFileSelect,
}: {
  name: string;
  accept?: string;
  hint?: string;
  currentLabel?: string | null;
  onFileSelect?: (file: File | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [label, setLabel] = useState<string | null>(currentLabel ?? null);

  function pick(file: File | null) {
    if (!file) return;
    setLabel(file.name);
    onFileSelect?.(file);
    if (inputRef.current) {
      const dt = new DataTransfer();
      dt.items.add(file);
      inputRef.current.files = dt.files;
    }
  }

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          const f = e.dataTransfer.files[0];
          if (f) pick(f);
        }}
        className={`cursor-pointer rounded-xl border-2 border-dashed px-4 py-8 text-center transition ${
          drag
            ? "border-violet-400 bg-violet-50"
            : "border-zinc-200 bg-zinc-50/50 hover:border-violet-300 hover:bg-violet-50/30"
        }`}
      >
        <p className="text-sm font-medium text-zinc-700">
          Drop file here or <span className="text-violet-600">browse</span>
        </p>
        {hint ? <p className="mt-1 text-xs text-zinc-500">{hint}</p> : null}
        {label ? (
          <p className="mt-2 text-xs font-medium text-emerald-700">{label}</p>
        ) : null}
      </div>
      <input
        ref={inputRef}
        type="file"
        name={name}
        accept={accept}
        className="sr-only"
        onChange={(e) => pick(e.target.files?.[0] ?? null)}
      />
    </div>
  );
}
