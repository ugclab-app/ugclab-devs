"use client";

export function StoreQrCode({ url }: { url: string }) {
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=10&data=${encodeURIComponent(url)}`;

  return (
    <div className="flex flex-col items-center gap-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={qrSrc}
        alt="Store QR code"
        width={200}
        height={200}
        className="rounded-xl border border-zinc-200 bg-white p-2 shadow-sm"
      />
      <p className="max-w-[220px] text-center text-xs text-zinc-500">
        Scan to open your storefront — great for packaging and events.
      </p>
    </div>
  );
}
