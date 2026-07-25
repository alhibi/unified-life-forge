import { Loader2, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate,useSearchParams } from "react-router-dom";

import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

type AuthorizationDetails = {
  client?: { name?: string; client_uri?: string; logo_uri?: string };
  redirect_uri?: string;
  scope?: string;
  redirect_url?: string;
  redirect_to?: string;
};

// Beta `auth.oauth` namespace on @supabase/supabase-js — typed locally so we
// don't depend on `any` casts scattered through the component.
type OAuthApi = {
  getAuthorizationDetails: (id: string) => Promise<{ data: AuthorizationDetails | null; error: { message: string } | null }>;
  approveAuthorization: (id: string) => Promise<{ data: AuthorizationDetails | null; error: { message: string } | null }>;
  denyAuthorization: (id: string) => Promise<{ data: AuthorizationDetails | null; error: { message: string } | null }>;
};
const oauth = (supabase.auth as unknown as { oauth: OAuthApi }).oauth;

export default function OAuthConsent() {
  const [params] = useSearchParams();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const authorizationId = params.get("authorization_id") ?? "";
  const [details, setDetails] = useState<AuthorizationDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!authorizationId) {
      setError("طلب مصادقة غير صالح");
      return;
    }
    if (!user) {
      const next = window.location.pathname + window.location.search;
      navigate(`/auth?next=${encodeURIComponent(next)}`, { replace: true });
      return;
    }
    let alive = true;
    (async () => {
      const { data, error } = await oauth.getAuthorizationDetails(authorizationId);
      if (!alive) return;
      if (error) { setError(error.message); return; }
      const immediate = data?.redirect_url ?? data?.redirect_to;
      if (immediate && !data?.client) { window.location.href = immediate; return; }
      setDetails(data);
    })();
    return () => { alive = false; };
  }, [authorizationId, user, loading, navigate]);

  async function decide(approve: boolean) {
    setBusy(true);
    setError(null);
    const { data, error } = approve
      ? await oauth.approveAuthorization(authorizationId)
      : await oauth.denyAuthorization(authorizationId);
    if (error) { setBusy(false); setError(error.message); return; }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) { setBusy(false); setError("لم يُرجع خادم المصادقة رابط توجيه."); return; }
    window.location.href = target;
  }

  return (
    <main className="min-h-screen bg-background flex items-center justify-center px-5 py-14">
      <div className="premium-card-elevated p-6 max-w-md w-full space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-primary stroke-[1.8]" />
          </div>
          <h1 className="text-[22px] font-bold tracking-tight text-foreground">
            {"منح الوصول"}
          </h1>
        </div>

        {loading || (!details && !error) ? (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
            {"جارٍ التحميل…"}
          </div>
        ) : error ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-[13px] text-destructive">
            {error}
          </div>
        ) : details ? (
          <>
            <p className="text-[14px] leading-relaxed text-foreground/90">
              {<>سيتمكّن <b>{details.client?.name ?? ("التطبيق")}</b> من استخدام أدوات SmartHub نيابةً عنك أثناء تسجيل دخولك.</>}
            </p>
            {details.scope && (
              <div className="rounded-xl bg-muted/40 p-3 text-[12px] text-muted-foreground font-mono break-all">
                {details.scope}
              </div>
            )}
            <p className="text-[12px] text-muted-foreground">
              {"لا يتجاوز هذا صلاحيات حسابك أو سياسات الحماية الخلفية."}
            </p>
            <div className="flex gap-3 pt-1">
              <button
                disabled={busy}
                onClick={() => decide(true)}
                className="flex-1 h-11 rounded-2xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50"
              >
                {"موافقة"}
              </button>
              <button
                disabled={busy}
                onClick={() => decide(false)}
                className="flex-1 h-11 rounded-2xl border border-border text-sm font-medium disabled:opacity-50"
              >
                {"رفض"}
              </button>
            </div>
          </>
        ) : null}
      </div>
    </main>
  );
}