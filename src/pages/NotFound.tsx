import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import SEO from '@/components/SEO';
import { PageShell } from '@/components/ui/app-shell';
import { StateView } from '@/components/ui/state-view';

/**
 * 404 — keeps users inside the SPA.
 *
 * The screen used a hand-built frame (its own `pt-6 px-5` root, an inline
 * back button, and a bespoke error block) while every empty/search/error
 * state in the product already speaks through <StateView>. It now uses the
 * same page shell and the same state surface as the rest of the app, so a
 * dead link reads as part of the product rather than a separate page.
 */
const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error('404 Error: User attempted to access non-existent route:', location.pathname);
  }, [location.pathname]);

  return (
    <PageShell>
      {/* Every route needs one h1. The visual title lives in StateView (h3),
          so the page announces its own heading for assistive tech and for the
          app-shell contract, without duplicating the visible composition. */}
      <h1 className="sr-only">الصفحة غير موجودة</h1>
      <SEO
        title={'الصفحة غير موجودة — SmartHub'}
        description={'لم نعثر على هذه الصفحة'}
        path={location.pathname}
      />

      <StateView
        bare
        kind="error"
        className="min-h-[calc(100dvh-7rem)]"
        title="الصفحة غير موجودة"
        body="لم نعثر على هذا الرابط داخل التطبيق. قد يكون قديماً أو مكتوباً بشكل غير صحيح."
        action={{ label: 'العودة إلى الرئيسية', onClick: () => navigate('/', { replace: true }) }}
        secondary={<code className="break-all">{location.pathname}</code>}
      />
    </PageShell>
  );
};

export default NotFound;
