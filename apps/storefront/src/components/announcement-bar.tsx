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
  const color = barColor ?? primaryColor;

  if (messages.length === 1) {
    return (
      <div className="px-4 py-2 text-center text-sm font-medium text-white" style={{ backgroundColor: color }}>
        {messages[0]}
      </div>
    );
  }

  const loop = [...messages, ...messages];
  return (
    <div className="store-marquee text-sm font-medium text-white" style={{ backgroundColor: color }}>
      <div className="store-marquee-track">
        {loop.map((message, i) => (
          <span key={`${message}-${i}`} className="store-marquee-item">
            {message}
          </span>
        ))}
      </div>
    </div>
  );
}
