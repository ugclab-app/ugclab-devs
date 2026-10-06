import { WishlistClient } from "@/components/wishlist-page-client";
import { useStorefrontMessages } from "@/hooks/use-storefront-messages";

export function WishlistPage() {
  const sf = useStorefrontMessages();
  return (
    <>
      <h1 className="text-3xl font-bold">{sf.wishlist.title}</h1>
      <WishlistClient />
    </>
  );
}
