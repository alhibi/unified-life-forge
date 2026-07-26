import { AppCard } from '@/components/ui/app-shell';
import { Layers } from '@/lib/icons';
import type { ResolvedInterfaceGeometry } from '@/lib/interfaceScale';

interface InterfacePreviewProps {
  geometry: ResolvedInterfaceGeometry;
  materialLabel?: string;
  interactionLabel?: string;
  accessibilityCount: number;
}

/**
 * A live miniature that consumes the SAME root tokens as the full product.
 *
 * Nothing here is drawn from props except the labels: the card padding, the
 * radius ladder, the divider volume, the border thickness, the control height,
 * the tap floor and the row-icon size are all read from the compiled CSS
 * variables. That is deliberate — a preview built from its own numbers can
 * drift from the app, and then it is worse than no preview at all.
 *
 * The four radius chips are the one place the whole ladder is visible at once,
 * which is what makes the radius-profile choice legible: `uniform` collapses
 * them to one shape, `expressive` fans them out.
 */
export default function InterfacePreview({
  geometry,
  materialLabel,
  interactionLabel,
  accessibilityCount,
}: InterfacePreviewProps) {
  return (
    <AppCard flat className="space-y-3 bg-background" aria-label="معاينة حية للواجهة">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-start">
          <div className="text-body font-semibold text-foreground">مساحة العمل</div>
          <div className="text-mini text-muted-foreground">معاينة مباشرة لكل تغيير</div>
        </div>
        <span className="rounded-sm bg-primary px-2.5 py-1 text-mini font-medium text-primary-foreground tabular-nums">
          {Math.round(geometry.uiScale * 100)}٪
        </span>
      </div>

      {/* The radius ladder, drawn at its real values. */}
      <div className="flex items-end gap-2" aria-label="سلّم الأنصاف">
        {(['sm', 'md', 'lg', 'xl'] as const).map((step) => (
          <div key={step} className="flex-1 text-center">
            <div
              className="h-10 w-full border bg-secondary"
              style={{ borderRadius: `var(--r-${step})` }}
              aria-hidden
            />
            <div className="mt-1 font-mono text-micro tabular-nums text-muted-foreground">
              {geometry.radius[step]}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="app-card app-card-compact">
          <div className="text-micro text-muted-foreground">التخطيط</div>
          <div className="mt-1 text-mini font-semibold text-foreground">
            {geometry.adaptiveLayout ? 'تكيفي' : 'ثابت'}
          </div>
        </div>
        <div className="app-card app-card-compact">
          <div className="text-micro text-muted-foreground">الخامة</div>
          <div className="mt-1 text-mini font-semibold text-foreground">{materialLabel}</div>
        </div>
        <div className="app-card app-card-compact">
          <div className="text-micro text-muted-foreground">التفاعل</div>
          <div className="mt-1 text-mini font-semibold text-foreground">{interactionLabel}</div>
        </div>
      </div>

      {/* A list with real dividers, so the divider setting is visible. */}
      <div className="app-card app-card-compact divide-y p-0">
        {['بطاقة نموذجية', 'صفّ ثانٍ', 'صفّ ثالث'].map((title, index) => (
          <div
            key={title}
            className="flex items-center gap-3 px-3"
            style={{ minHeight: 'var(--ui-touch-min)' }}
          >
            <span className="row-icon">
              <Layers className="h-4 w-4" aria-hidden />
            </span>
            <div className="min-w-0 flex-1 text-start">
              <div className="truncate text-body font-medium text-foreground">{title}</div>
              {index === 0 ? (
                <div className="truncate text-mini text-muted-foreground">
                  الحواف والكثافة والحدود والخامة
                </div>
              ) : null}
            </div>
            {index === 0 ? (
              <span className="shrink-0 text-mini tabular-nums text-muted-foreground">
                {accessibilityCount} تحسينات
              </span>
            ) : null}
          </div>
        ))}
      </div>

      <input
        className="app-control"
        placeholder="حقل إدخال"
        aria-label="حقل إدخال للمعاينة"
        readOnly
      />

      <div className="flex gap-2">
        <button
          type="button"
          className="flex flex-1 items-center justify-center rounded-md bg-primary px-3 text-meta font-semibold text-primary-foreground"
          style={{ minHeight: 'var(--ui-control-h)' }}
        >
          إجراء أساسي
        </button>
        <button
          type="button"
          className="flex flex-1 items-center justify-center rounded-md bg-secondary px-3 text-meta font-semibold text-secondary-foreground"
          style={{ minHeight: 'var(--ui-control-h)' }}
        >
          ثانوي
        </button>
      </div>
      <p className="text-micro text-muted-foreground">
        اضغط أيّ زرّ أعلاه لتشعر بعمق الضغط ومدّة استجابته
      </p>
    </AppCard>
  );
}
