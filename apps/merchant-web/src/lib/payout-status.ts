export function payoutStatusLabel(status: string): string {
  switch (status) {
    case "PENDING":
      return "Requested";
    case "PROCESSING":
      return "In processing";
    case "PAID":
      return "Paid";
    case "FAILED":
      return "Failed";
    default:
      return status;
  }
}

export function payoutStatusClass(status: string): string {
  if (status === "PAID") return "text-emerald-700";
  if (status === "PROCESSING") return "text-sky-700";
  if (status === "FAILED") return "text-red-700";
  return "text-amber-700";
}
