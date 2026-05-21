export function AnnouncementBar({
  messages,
  primaryColor,
  barColor,
}: {
  messages: string[];
  primaryColor: string;
  barColor?: string;
}) {
  if (messages.length === 0) return null;
  const text = messages.join(" · ");

  return (
    <div
      className="px-4 py-2 text-center text-sm font-medium text-white"
      style={{ backgroundColor: barColor ?? primaryColor }}
    >
      {text}
    </div>
  );
}
