import { useCallback, useEffect, useRef } from "react";

function exec(cmd: string, value?: string) {
  document.execCommand(cmd, false, value);
}

/** Lightweight rich text for block body (stores safe-ish HTML in `body`). */
export function RichTextEdit({
  value,
  onChange,
  placeholder,
}: {
  value?: string;
  onChange: (html: string) => void;
  placeholder?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const lastValue = useRef(value ?? "");

  const sync = useCallback(() => {
    if (!ref.current) return;
    const html = ref.current.innerHTML.trim();
    lastValue.current = html;
    onChange(html);
  }, [onChange]);

  useEffect(() => {
    const next = value ?? "";
    if (next === lastValue.current || !ref.current) return;
    ref.current.innerHTML = next;
    lastValue.current = next;
  }, [value]);

  return (
    <div className="rich-text-edit">
      <div className="rich-text-edit-toolbar" role="toolbar" aria-label="Formatting">
        <button type="button" title="Bold" onMouseDown={(e) => e.preventDefault()} onClick={() => { exec("bold"); sync(); }}>
          <strong>B</strong>
        </button>
        <button type="button" title="Italic" onMouseDown={(e) => e.preventDefault()} onClick={() => { exec("italic"); sync(); }}>
          <em>I</em>
        </button>
        <button
          type="button"
          title="Bullet list"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            exec("insertUnorderedList");
            sync();
          }}
        >
          • List
        </button>
        <button
          type="button"
          title="Link"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            const url = window.prompt("Link URL (https://…)", "https://");
            if (url) exec("createLink", url);
            sync();
          }}
        >
          Link
        </button>
      </div>
      <div
        ref={ref}
        className="rich-text-edit-area ugclab-input text-sm"
        contentEditable
        suppressContentEditableWarning
        data-placeholder={placeholder}
        onBlur={sync}
        onInput={sync}
      />
    </div>
  );
}

export function RichTextBody({ html }: { html?: string }) {
  if (!html?.trim()) return null;
  return (
    <div
      className="rich-text-body prose prose-sm max-w-none text-inherit [&_a]:text-violet-600 [&_a]:underline"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
