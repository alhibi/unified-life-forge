import { motion } from 'framer-motion';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { AppCard } from '@/components/ui/app-shell';
import ResponsiveDrawer from '@/components/ui/ResponsiveDrawer';
import { useAuth } from '@/hooks/useAuth';
import { isSupabaseConfigured } from '@/integrations/supabase/client';
import { Download, Loader2, Trash } from '@/lib/icons';
import { pageItem as item } from '@/lib/motion';

import { buildAccountExport, deleteOwnAccount } from '../api';
import { downloadJson, exportFilename } from '../lib/downloadJson';

interface Props {
  appName: string;
  appVersion: string;
}

/**
 * "Account and privacy" group for the settings page: export everything, or
 * erase the account.
 *
 * Both actions require a signed-in user and a configured backend. In
 * local-only mode there is no server-side record to export or erase, so the
 * section is not rendered at all rather than shown in a state that cannot
 * work.
 *
 * Deletion is gated behind typing the username. A destructive, irreversible
 * action reached in two taps from a settings list is too easy to trigger by
 * accident, and a confirm button alone does not establish intent.
 */
export default function AccountPrivacySection({ appName, appVersion }: Props) {
  const { user, username } = useAuth();
  const navigate = useNavigate();

  const [exporting, setExporting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  if (!user || !isSupabaseConfigured) return null;

  const handleExport = async () => {
    setExporting(true);
    const toastId = toast.loading('جارٍ تجهيز نسخة من بياناتك…');
    try {
      const result = await buildAccountExport({
        userId: user.id,
        username,
        email: user.email ?? null,
        createdAt: user.created_at ?? null,
        appName,
        appVersion,
      });
      downloadJson(exportFilename(username), result.export);

      const kb = Math.max(1, Math.round(result.byteSize / 1024));
      const skipped = result.export.skipped.length;
      toast.success(`تم تنزيل ${result.rowCount} سجلاً (${kb} ك.ب)`, {
        id: toastId,
        description: skipped
          ? `تعذّر قراءة ${skipped} جدولاً — التفاصيل مدرجة في الملف تحت "skipped".`
          : undefined,
      });
    } catch (err) {
      toast.error('تعذّر تجهيز النسخة', {
        id: toastId,
        description: (err as Error).message,
      });
    } finally {
      setExporting(false);
    }
  };

  const closeDeleteDialog = (open: boolean) => {
    if (deleting) return; // don't let a tap outside abandon an in-flight delete
    setDeleteOpen(open);
    if (!open) setConfirmText('');
  };

  const handleDelete = async () => {
    setDeleting(true);
    const result = await deleteOwnAccount();
    if (!result.ok) {
      setDeleting(false);
      toast.error('تعذّر حذف الحساب', { description: result.error });
      return;
    }
    // The auth row is gone, so the current JWT no longer resolves to a user.
    // signOut() clears the local session and drafts; navigating home avoids
    // leaving a dead authenticated screen on screen.
    setDeleteOpen(false);
    toast.success('تم حذف حسابك وكل بياناته');
    navigate('/', { replace: true });
  };

  const canDelete = confirmText.trim() === (username ?? '').trim() && !!username;

  return (
    <>
      <motion.div variants={item} className="space-y-1">
        <p className="text-micro font-semibold text-muted-foreground/70 uppercase tracking-wider px-1 mb-2">
          الحساب والخصوصية
        </p>
        <AppCard className="p-0 overflow-hidden divide-y divide-border/30">
          <button
            onClick={handleExport}
            disabled={exporting}
            aria-busy={exporting}
            className="flex items-center justify-between w-full px-4 py-3.5 active:bg-muted/30 transition-colors disabled:opacity-60"
          >
            <div className="flex items-center gap-3">
              {exporting ? (
                <Loader2 className="w-[18px] h-[18px] text-primary animate-spin" />
              ) : (
                <Download className="w-[18px] h-[18px] text-primary stroke-[1.8]" />
              )}
              <span className="text-meta font-medium text-foreground">تصدير بياناتي</span>
            </div>
            <span className="text-mini text-muted-foreground">ملف JSON</span>
          </button>

          <button
            onClick={() => setDeleteOpen(true)}
            className="flex items-center justify-between w-full px-4 py-3.5 active:bg-muted/30 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Trash className="w-[18px] h-[18px] text-destructive stroke-[1.8]" />
              <span className="text-meta font-medium text-destructive">حذف الحساب</span>
            </div>
            <span className="text-mini text-muted-foreground">نهائي</span>
          </button>
        </AppCard>
        <p className="text-micro text-muted-foreground/60 px-1 pt-1.5 leading-relaxed">
          التصدير يشمل ملفك الشخصي، مذكراتك، ملاحظاتك، سجلات العافية، القراءة
          والبودكاست، مع التفضيلات المحفوظة على هذا الجهاز.
        </p>
      </motion.div>

      <ResponsiveDrawer
        open={deleteOpen}
        onOpenChange={closeDeleteDialog}
        title="حذف الحساب نهائيًا"
        description="سيُحذف ملفك الشخصي، مذكراتك، ملاحظاتك، أرشيفك، سجلات العافية، محادثاتك وملفاتك المرفوعة. لا يمكن التراجع عن هذا الإجراء ولا استعادة البيانات لاحقًا."
      >
        <div className="space-y-4 pt-1">
          <div className="rounded-xl bg-destructive/10 px-3.5 py-3">
            <p className="text-mini text-foreground/80 leading-relaxed">
              ننصحك بتصدير بياناتك قبل الحذف. المحادثات الثنائية تُحذف كاملةً
              للطرفين، أما المجموعات فتبقى قائمة لبقية أعضائها.
            </p>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="delete-account-confirm"
              className="block text-mini font-medium text-foreground"
            >
              اكتب اسم المستخدم <span className="font-bold">{username}</span> للتأكيد
            </label>
            <input
              id="delete-account-confirm"
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              dir="ltr"
              disabled={deleting}
              // 16px minimum prevents the iOS focus zoom (CONTRIBUTING §3).
              className="w-full rounded-xl bg-secondary px-3.5 py-2.5 text-body text-foreground outline-none ring-1 ring-border/40 focus:ring-2 focus:ring-destructive/50 disabled:opacity-60"
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => closeDeleteDialog(false)}
              disabled={deleting}
              className="flex-1 py-2.5 rounded-xl bg-secondary text-secondary-foreground text-meta font-medium active:scale-[0.98] transition-transform disabled:opacity-60"
            >
              إلغاء
            </button>
            <button
              onClick={handleDelete}
              disabled={!canDelete || deleting}
              aria-busy={deleting}
              className="flex-1 py-2.5 rounded-xl bg-destructive text-destructive-foreground text-meta font-medium active:scale-[0.98] transition-transform disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {deleting && <Loader2 className="w-4 h-4 animate-spin" />}
              {deleting ? 'جارٍ الحذف…' : 'حذف نهائي'}
            </button>
          </div>
        </div>
      </ResponsiveDrawer>
    </>
  );
}
