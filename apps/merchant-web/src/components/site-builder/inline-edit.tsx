import { useEffect, useRef } from "react";

export function InlineEdit({
  tag: Tag = "span",
  value,
  placeholder,
  className = "",
  onChange,
  multiline,
}: {
  tag?: "span" | "p" | "h1" | "h2" | "h3";
  value?: string;
  placeholder?: string;
  className?: string;
  onChange?: (value: string) => void;
  multiline?: boolean;
}) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    if (ref.current && ref.current.textContent !== (value ?? "")) {
      ref.current.textContent = value || "";
    }
  }, [value]);

  if (!onChange) {
    return (
      <Tag className={className}>
        {value || placeholder}
      </Tag>
    );
  }

  return (
    <Tag
      ref={ref as never}
      contentEditable
      suppressContentEditableWarning
      className={`${className} outline-none empty:before:text-zinc-400 empty:before:content-[attr(data-placeholder)] focus:ring-2 focus:ring-violet-300/80 focus:ring-offset-1 rounded-sm`}
      data-placeholder={placeholder}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        if (!multiline && e.key === "Enter") {
          e.preventDefault();
          (e.target as HTMLElement).blur();
        }
      }}
      onBlur={(e) => onChange(e.currentTarget.textContent?.trim() ?? "")}
      style={multiline ? { whiteSpace: "pre-wrap" } : undefined}
    />
  );
}
