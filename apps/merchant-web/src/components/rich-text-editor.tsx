import { useEffect, useRef } from "react";

export function RichTextEditor({
  name,
  defaultValue = "",
  placeholder,
  rows = 6,
}: {
  name: string;
  defaultValue?: string;
  placeholder?: string;
  rows?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const hiddenRef = useRef<HTMLInputElement>(null);

  function sync() {
    if (ref.current && hiddenRef.current) {
      hiddenRef.current.value = ref.current.innerHTML;
    }
  }

  useEffect(() => {
    sync();
  }, []);

  function exec(cmd: string, value?: string) {
    document.execCommand(cmd, false, value);
    ref.current?.focus();
    sync();
  }

  return (
    <div className="rounded-lg border border-zinc-200 bg-white overflow-hidden focus-within:ring-2 focus-within:ring-violet-500/30">
      <div className="flex flex-wrap gap-0.5 border-b border-zinc-100 bg-zinc-50/80 px-2 py-1.5">
        <button
          type="button"
          onClick={() => exec("bold")}
          className="rounded px-2 py-1 text-xs font-bold text-zinc-600 hover:bg-white"
          title="Bold"
        >
          B
        </button>
        <button
          type="button"
          onClick={() => exec("italic")}
          className="rounded px-2 py-1 text-xs italic text-zinc-600 hover:bg-white"
          title="Italic"
        >
          I
        </button>
        <button
          type="button"
          onClick={() => exec("insertUnorderedList")}
          className="rounded px-2 py-1 text-xs text-zinc-600 hover:bg-white"
          title="List"
        >
          • List
        </button>
        <button
          type="button"
          onClick={() => {
            const url = window.prompt("Link URL");
            if (url) exec("createLink", url);
          }}
          className="rounded px-2 py-1 text-xs text-zinc-600 hover:bg-white"
          title="Link"
        >
          Link
        </button>
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        style={{ minHeight: `${Math.max(rows, 4) * 1.5}rem` }}
        className="px-3 py-2.5 text-sm text-zinc-800 outline-none prose prose-sm max-w-none [&_ul]:list-disc [&_ul]:pl-5"
        data-placeholder={placeholder}
        dangerouslySetInnerHTML={{ __html: defaultValue }}
        onInput={sync}
      />
      <input ref={hiddenRef} type="hidden" name={name} defaultValue={defaultValue} readOnly />
      <style>{`
        [contenteditable][data-placeholder]:empty:before {
          content: attr(data-placeholder);
          color: #a1a1aa;
        }
      `}</style>
    </div>
  );
}
