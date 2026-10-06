import { Link } from "react-router-dom";
import { useAdminT } from "@/hooks/use-admin-t";
import { usePermissions } from "@/hooks/use-permissions";

export function TwoFaRequiredBanner({ area }: { area: "orders" | "payouts" }) {
  const { ta } = useAdminT();
  const { needs2faForOrders, needs2faForPayouts, totpEnabled } = usePermissions();
  const needed = area === "orders" ? needs2faForOrders : needs2faForPayouts;
  if (!needed || totpEnabled) return null;

  return (
    <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      {area === "orders" ? ta("twoFa.ordersBanner") : ta("twoFa.payoutsBanner")}{" "}
      <Link to="/settings?tab=team" className="font-semibold text-violet-700 underline">
        {ta("twoFa.setupLink")}
      </Link>
    </div>
  );
}
