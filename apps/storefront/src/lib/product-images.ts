export function productImageUrl(storageKey: string) {
  return `/api/files/${storageKey.split("/").map(encodeURIComponent).join("/")}`;
}
