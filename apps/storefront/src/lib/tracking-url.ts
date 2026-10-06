/** Public tracking link for a carrier number. Falls back to 17track. */
export function trackingUrl(trackingNumber: string): string {
  const raw = trackingNumber.trim();
  const compact = raw.replace(/\s+/g, "");
  if (/^1Z/i.test(compact)) {
    return `https://www.ups.com/track?tracknum=${encodeURIComponent(compact)}`;
  }
  if (/^\d{12}$/.test(compact) || /^\d{15}$/.test(compact) || /^\d{20}$/.test(compact)) {
    return `https://www.fedex.com/fedextrack/?trknbr=${encodeURIComponent(compact)}`;
  }
  if (/^\d{20,22}$/.test(compact) || /^(94|93|92|91)\d{18,20}$/.test(compact)) {
    return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${encodeURIComponent(compact)}`;
  }
  if (/^\d{10}$/.test(compact) || /^[A-Z]{2}\d{9}[A-Z]{2}$/i.test(compact)) {
    return `https://www.dhl.com/global-en/home/tracking.html?tracking-id=${encodeURIComponent(compact)}`;
  }
  return `https://www.17track.net/en/track?nums=${encodeURIComponent(raw)}`;
}
