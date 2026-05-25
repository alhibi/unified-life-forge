import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Compass, Home } from "lucide-react";
import BackButton from "@/components/BackButton";
import SEO from "@/components/SEO";
import { useApp } from "@/contexts/AppContext";

/**
 * 404 — keeps users inside the SPA.
 *
 * Previously this rendered a plain HTML page with `<a href="/">`,
 * which forced a full reload and looked nothing like the rest of the
 * app. Now it shares the standard top-level shell:
 *   • A `BackButton` (with a `/` fallback so deep-linked 404s still
 *     have a safe escape hatch).
 *   • A localized message and a `<Link>` (no full reload) back home.
 *   • The same `pt-14 px-5` chrome used by other deep pages, so the
 *     transition into and out of NotFound matches the rest of the
 *     navigation feel.
 */
const NotFound = () => {
  const location = useLocation();
  const { language } = useApp();
  const isAr = language === 'ar';

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-background pb-24 pt-6 px-5">
      <SEO
        title={isAr ? 'الصفحة غير موجودة — SmartHub' : 'Page not found — SmartHub'}
        description={isAr ? 'لم نعثر على هذه الصفحة' : 'We could not find that page'}
        path={location.pathname}
      />

      <div className="max-w-lg mx-auto">
        <div className="mb-6">
          <BackButton fallback="/" />
        </div>

        <div className="flex flex-col items-center justify-center text-center py-10">
          <div className="w-16 h-16 rounded-2xl bg-foreground/[0.04] flex items-center justify-center mb-5">
            <Compass className="w-7 h-7 text-muted-foreground" strokeWidth={1.6} />
          </div>

          <h1 className="text-[28px] font-black tracking-tight text-foreground mb-2">
            404
          </h1>
          <p className="text-[15px] text-muted-foreground mb-1.5 max-w-sm">
            {isAr ? 'تعذّر إيجاد هذه الصفحة.' : 'We could not find that page.'}
          </p>
          <code className="text-[11px] text-muted-foreground/70 font-mono mb-6 break-all px-2">
            {location.pathname}
          </code>

          <Link
            to="/"
            replace
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 active:scale-[0.98] transition-all"
          >
            <Home className="w-4 h-4" />
            {isAr ? 'العودة إلى الرئيسية' : 'Return home'}
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
