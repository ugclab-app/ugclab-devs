import { Link } from "react-router-dom";
import { localizedPath, useLanding } from "@/landing/locale";

export function NotFoundPage() {
  const { locale, content } = useLanding();
  return (
    <section className="py-32 text-center">
      <p className="text-6xl font-extrabold text-brand-600">404</p>
      <Link to={localizedPath(locale, "/")} className="mt-6 inline-block font-medium text-brand-700 hover:underline">
        {content.backHome}
      </Link>
    </section>
  );
}
