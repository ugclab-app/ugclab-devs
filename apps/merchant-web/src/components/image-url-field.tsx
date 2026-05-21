import { useState } from "react";
import { MediaPicker } from "@/components/media-picker";

export function ImageUrlField({
  name,
  label,
  defaultValue = "",
  placeholder,
}: {
  name: string;
  label: string;
  defaultValue?: string;
  placeholder?: string;
}) {
  const [url, setUrl] = useState(defaultValue);

  return (
    <label className="block text-sm">
      <span className="font-medium text-zinc-700">{label}</span>
      <div className="mt-1.5 flex flex-wrap gap-2">
        <input
          name={name}
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder={placeholder ?? "https://…"}
          className="ugclab-input min-w-0 flex-1 font-mono text-xs"
        />
        <MediaPicker
          onUploaded={(uploaded) => {
            setUrl(uploaded);
          }}
        />
      </div>
      {url ? (
        <img src={url} alt="" className="mt-2 h-16 w-auto rounded border border-zinc-100 object-contain" />
      ) : null}
    </label>
  );
}
