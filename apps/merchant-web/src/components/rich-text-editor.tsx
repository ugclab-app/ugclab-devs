import { useEffect, useRef, useState } from "react";
import { api } from "@/api/client";

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
  const [sourceMode, setSourceMode] = useState(false);
  const [sourceHtml, setSourceHtml] = useState(defaultValue);
  const [uploading, setUploading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  function syncFromVisual() {
    if (ref.current && hiddenRef.current) {
      const html = ref.current.innerHTML;
      hiddenRef.current.value = html;
      setSourceHtml(html);
    }
  }

  function syncFromSource(html: string) {
    setSourceHtml(html);
    if (hiddenRef.current) hiddenRef.current.value = html;
    if (ref.current) ref.current.innerHTML = html;
  }

  useEffect(() => {
    syncFromVisual();
  }, []);

  useEffect(() => {
    if (!expanded) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setExpanded(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [expanded]);

  function exec(cmd: string, value?: string) {
    document.execCommand(cmd, false, value);
    ref.current?.focus();
    syncFromVisual();
  }

  async function insertImageFromFile(file: File) {
    setUploading(true);
    try {
      const r = await api.uploadMedia(file);
      const url = (r.media as { url: string }).url;
      exec(
        "insertHTML",
        `<img src="${url}" alt="" style="max-width:100%;height:auto;border-radius:8px" />`
      );
    } finally {
      setUploading(false);
    }
  }

  const minH = expanded ? undefined : `${Math.max(rows, 4) * 1.5}rem`;
  const editorMinClass = expanded ? "min-h-0 flex-1" : "";

  const toolbar = (
    <div className="flex flex-wrap gap-0.5 border-b border-zinc-100 bg-zinc-50/80 px-2 py-1.5 shrink-0">
      {!sourceMode ? (
        <>
          <ToolbarBtn title="Bold" onClick={() => exec("bold")}>
            <strong>B</strong>
          </ToolbarBtn>
          <ToolbarBtn title="Italic" onClick={() => exec("italic")}>
            <em>I</em>
          </ToolbarBtn>
          <ToolbarBtn title="Heading 2" onClick={() => exec("formatBlock", "h2")}>
            H2
          </ToolbarBtn>
          <ToolbarBtn title="Heading 3" onClick={() => exec("formatBlock", "h3")}>
            H3
          </ToolbarBtn>
          <ToolbarBtn title="Quote" onClick={() => exec("formatBlock", "blockquote")}>
            “
          </ToolbarBtn>
          <ToolbarBtn title="List" onClick={() => exec("insertUnorderedList")}>
            • List
          </ToolbarBtn>
          <ToolbarBtn title="Divider" onClick={() => exec("insertHorizontalRule")}>
            —
          </ToolbarBtn>
          <ToolbarBtn
            title="Link"
            onClick={() => {
              const url = window.prompt("Link URL");
              if (url) exec("createLink", url);
            }}
          >
            Link
          </ToolbarBtn>
          <ToolbarBtn
            title="Image URL"
            onClick={() => {
              const url = window.prompt("Image URL");
              if (url) {
                exec(
                  "insertHTML",
                  `<img src="${url}" alt="" style="max-width:100%;height:auto" />`
                );
              }
            }}
          >
            Img
          </ToolbarBtn>
          <label className="rounded px-2 py-1 text-xs text-zinc-600 hover:bg-white cursor-pointer">
            {uploading ? "…" : "Upload"}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={uploading}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void insertImageFromFile(f);
                e.target.value = "";
              }}
            />
          </label>
          <ToolbarBtn
            title="Video embed"
            onClick={() => {
              const url = window.prompt("YouTube or video URL");
              if (url) {
                exec(
                  "insertHTML",
                  `<p><a href="${url}" target="_blank" rel="noopener">${url}</a></p>`
                );
              }
            }}
          >
            Video
          </ToolbarBtn>
        </>
      ) : null}
      <ToolbarBtn
        title={sourceMode ? "Visual editor" : "HTML source"}
        onClick={() => {
          if (sourceMode) {
            syncFromSource(sourceHtml);
            setSourceMode(false);
          } else {
            syncFromVisual();
            setSourceMode(true);
          }
        }}
      >
        {sourceMode ? "Visual" : "HTML"}
      </ToolbarBtn>
      <div className="ml-auto flex gap-0.5">
        <ToolbarBtn
          title={expanded ? "Exit fullscreen (Esc)" : "Fullscreen editor"}
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? "✕ Exit" : "⛶ Expand"}
        </ToolbarBtn>
      </div>
    </div>
  );

  const editorArea = sourceMode ? (
    <textarea
      className={`w-full flex-1 resize-none px-4 py-3 font-mono text-sm text-zinc-800 outline-none ${editorMinClass}`}
      style={minH ? { minHeight: minH } : undefined}
      value={sourceHtml}
      onChange={(e) => syncFromSource(e.target.value)}
      placeholder={placeholder}
    />
  ) : (
    <div
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      style={minH ? { minHeight: minH } : undefined}
      className={`px-4 py-3 text-sm text-zinc-800 outline-none overflow-y-auto prose prose-sm max-w-none [&_ul]:list-disc [&_ul]:pl-5 [&_h2]:text-xl [&_h2]:font-bold [&_h3]:text-lg [&_h3]:font-semibold [&_blockquote]:border-l-4 [&_blockquote]:border-zinc-300 [&_blockquote]:pl-4 [&_blockquote]:italic ${editorMinClass}`}
      data-placeholder={placeholder}
      dangerouslySetInnerHTML={{ __html: defaultValue }}
      onInput={syncFromVisual}
    />
  );

  const panel = (
    <div
      className={
        expanded
          ? "fixed inset-0 z-[250] flex min-h-0 flex-col bg-zinc-100 shadow-2xl"
          : "rounded-lg border border-zinc-200 bg-white overflow-hidden focus-within:ring-2 focus-within:ring-violet-500/30"
      }
    >
      {expanded ? (
        <div className="flex shrink-0 items-center justify-between border-b border-zinc-200 bg-violet-600 px-4 py-2.5 text-white">
          <span className="text-sm font-medium">Content editor</span>
          <button
            type="button"
            onClick={() => setExpanded(false)}
            className="rounded-lg bg-white/15 px-3 py-1 text-sm hover:bg-white/25"
          >
            Done (Esc)
          </button>
        </div>
      ) : null}
      {toolbar}
      <div
        className={
          expanded ? "flex min-h-0 flex-1 flex-col overflow-hidden" : undefined
        }
      >
        {editorArea}
      </div>
      <input ref={hiddenRef} type="hidden" name={name} defaultValue={defaultValue} readOnly />
      <style>{`
        [contenteditable][data-placeholder]:empty:before {
          content: attr(data-placeholder);
          color: #a1a1aa;
        }
      `}</style>
    </div>
  );

  return panel;
}

function ToolbarBtn({
  children,
  title,
  onClick,
}: {
  children: React.ReactNode;
  title: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded px-2 py-1 text-xs text-zinc-600 hover:bg-white"
      title={title}
    >
      {children}
    </button>
  );
}
