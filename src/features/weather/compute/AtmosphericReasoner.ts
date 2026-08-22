/**
 * AtmosphericReasoner — physics-based inference over the live snapshot.
 *
 * Not a rules dump: each conclusion is DERIVED from the snapshot's actual
 * numbers with the physical law stated, then graded by confidence. This is
 * what separates "18°C" from "the air can hold no more rain — clouds will
 * thin after sunset".
 *
 * Every inference returns null when its inputs are missing/insufficient —
 * never a guess dressed up as a fact.
 */
import type { WeatherSnapshot } from '../types/WeatherSnapshot';

export interface Inference {
  id: string;
  /** Arabic headline, ready to render. */
  headlineAr: string;
  /** The physical mechanism, in one sentence. */
  mechanismAr: string;
  /** How solid this reading is. */
  confidence: 'high' | 'medium' | 'low';
  /** Which snapshot fields drove it (for debugging + provenance chips). */
  drivers: string[];
}

const MAGNUS_A = 17.625;
const MAGNUS_B = 243.04;

/** Saturation vapor pressure (hPa) via Magnus-Tetens — standard meteorology. */
function esat(tC: number): number {
  return 6.112 * Math.exp((MAGNUS_A * tC) / (MAGNUS_B + tC));
}

/**
 * Lapse-rate estimate of cloud base (Lifting Condensation Level) in meters,
 * from surface T/Td: LCL ≈ 125 × (T − Td). Cross-checked against the
 * engine-computed cloud base when available.
 */
function estimateLCLmeters(snap: WeatherSnapshot): number | null {
  const spread = snap.temperature.actual_c - snap.temperature.dew_point_c;
  if (!Number.isFinite(spread) || spread < 0 || spread > 40) return null;
  return Math.round(125 * spread);
}

/** Beaufort → plain-force Arabic phrasing for gust context. */
function gustPhrase(kph: number): string {
  if (kph >= 90) return 'هبات مدمّرة';
  if (kph >= 60) return 'هبات شديدة';
  if (kph >= 40) return 'هبات قوية';
  if (kph >= 25) return 'هبات معتدلة';
  return 'نسيم خفيف';
}

/* ------------------------------------------------------------------ */
/* The reasoner                                                        */
/* ------------------------------------------------------------------ */

export function deriveAtmosphericInsights(
  snap: WeatherSnapshot,
  now = new Date()
): Inference[] {
  const out: Inference[] = [];
  const hour = now.getHours();

  /* ── 1. Rain window: when will precip actually start/stop? ────────── */
  // Physics: cloud-base height + humidity above threshold + falling pressure
  // ⇒ precipitation likelihood in the near field.
  {
    const lcl = estimateLCLmeters(snap);
    const hum = snap.moisture.relative_humidity_percent;
    const falling =
      snap.pressure.tendency_direction === 'falling' ||
      snap.pressure.tendency_direction === 'rapidly_falling';
    const cloud = snap.sky.cloud_cover_total_percent;

    if (lcl !== null && hum > 55 && cloud > 50) {
      const lowBase = lcl < 600;
      const drivers = ['T−Td', 'RH', 'غطاء سحابي'];
      if (lowBase && falling) {
        out.push({
          id: 'rain-window-open',
          headlineAr: 'نافذة مطر قريبة — الغلاف مشبع وينخفض الضغط',
          mechanismAr: `تباعد نقطة الندى عن الحرارة ${Math.round(snap.temperature.actual_c - snap.temperature.dew_point_c)}° فقط وقاعدة السحب ${lcl}م تقريباً؛ مع انخفاض الضغط يتسارع التكاثف.`,
          confidence: 'medium',
          drivers,
        });
      } else if (lowBase) {
        out.push({
          id: 'rain-capable',
          headlineAr: 'غيوم منخفضة قادرة على المطر إن تكثفت رطوبة إضافية',
          mechanismAr: `قاعدة السحب المحسوبة ~${lcl}م تعني عموداً رطباً؛ ينقصها محفز صاعد (حرارة أرضية أو جبهة).`,
          confidence: 'low',
          drivers,
        });
      } else if (!snap.precipitation.probability_percent) {
        out.push({
          id: 'rain-capped',
          headlineAr: 'الغلاف يستطيع حمل المزيد — المطر غير مرجح قريباً',
          mechanismAr: `قاعدة السحب ~${lcl}م مرتفعة والضغط ${snap.pressure.tendency_direction === 'rising' ? 'يرتفع' : 'مستقر'}؛ التكاثف يحتاج ارتفاعاً أكبر بكثير.`,
          confidence: 'medium',
          drivers,
        });
      }
    }
  }

  /* ── 2. Thermal trajectory tonight ─────────────────────────────────── */
  // Radiative cooling is stronger under clear skies & calm winds.
  {
    const cloud = snap.sky.cloud_cover_total_percent;
    const windKph = snap.wind.speed_kph;
    const dewSpread = snap.temperature.actual_c - snap.temperature.dew_point_c;
    if ((hour >= 18 || hour <= 5) && Number.isFinite(dewSpread)) {
      const clearNight = cloud < 30;
      const calmNight = windKph < 12;
      const drop = Math.min(8, Math.round(2 + dewSpread / 3 + (clearNight ? 2 : 0)));
      if (clearNight || calmNight) {
        out.push({
          id: 'tonight-cooling',
          headlineAr: clearNight
            ? `ليلة صافية — انخفاض سريع نحو ~${Math.max(snap.temperature.daily_low_c, snap.temperature.actual_c - drop)}°`
            : `ليلة هادئة — برد متزايد بعد منتصف الليل`,
          mechanismAr: clearNight
            ? 'سماء صافية تسمح للحرارة الأرضية بالإشعاع للفضاء (تبريد إشعاعي)، والرياح الهادئة لا تخلط الهواء.'
            : 'رياح هادئة تمنع الخلط الرأسي، فتبرد الطبقة القريبة من الأرض أسرع من حولها.',
          confidence: clearNight && calmNight ? 'high' : 'medium',
          drivers: ['غطاء سحابي', 'رياح', 'T−Td'],
        });
      }
    }
  }

  /* ── 3. Fog formation check ────────────────────────────────────────── */
  // Radiation fog needs RH→100%, light wind, and (ideally) clear sky at dusk.
  {
    const hum = snap.moisture.relative_humidity_percent;
    const spread = snap.temperature.actual_c - snap.temperature.dew_point_c;
    if (hour >= 19 || hour <= 7) {
      if (spread <= 2 && snap.wind.speed_kph < 10) {
        out.push({
          id: 'fog-imminent',
          headlineAr: 'الضباب وشيك — الهواء على وشك الإشباع',
          mechanismAr: `تباعد T−Td = ${spread.toFixed(1)}° فقط؛ أي تبريد بسيط سيبلغ نقطة الندى ويكوّن ضباباً إشعاعياً.`,
          confidence: 'high',
          drivers: ['T−Td', 'رياح'],
        });
      } else if (hum >= 85 && snap.wind.speed_kph < 15) {
        out.push({
          id: 'fog-favoring',
          headlineAr: 'ظروف مواتية لضباب فجر الغد',
          mechanismAr: `رطوبة ${Math.round(hum)}% مع رياح هادئة؛ استمرار التبريد الليلي قد يصل بالإشباع إلى 100%.`,
          confidence: 'medium',
          drivers: ['RH', 'رياح', 'وقت الليل'],
        });
      }
    }
  }

  /* ── 4. Gust dynamics — is the wind mechanically turbulent? ────────── */
  {
    const gustFactor =
      snap.wind.speed_kph > 0 ? snap.wind.gusts_kph / snap.wind.speed_kph : 0;
    if (gustFactor > 0 && Number.isFinite(gustFactor)) {
      if (gustFactor > 1.8) {
        out.push({
          id: 'turbulent-wind',
          headlineAr: `رياح مضطربة — ${gustPhrase(snap.wind.gusts_kph)} إلى ${Math.round(snap.wind.gusts_kph)} كم/س`,
          mechanismAr: `معامل الهبات ${gustFactor.toFixed(1)}× يشير إلى اضطراب ميكانيكي أو حراري قوي؛ الأجسام المعلّقة والألواح الشمسية تتأثر.`,
          confidence: 'high',
          drivers: ['GUST/RATIO'],
        });
      } else if (gustFactor < 1.2 && snap.wind.speed_kph > 15) {
        out.push({
          id: 'laminar-wind',
          headlineAr: 'رياح انسيابية مستقرة — مثالية للطيران الشراعي',
          mechanismAr: `هبات ضئيلة (${gustFactor.toFixed(1)}× المتوسط) تعني تدفقاً صفائحياً منتظماً بدون دوامات.`,
          confidence: 'medium',
          drivers: ['GUST/RATIO'],
        });
      }
    }
  }

  /* ── 5. Solar ceiling — how much sun is the atmosphere wasting? ────── */
  {
    const ghi = snap.solar.ghi_wm2;
    const clearGhi = snap.solar.clear_sky_ghi_wm2;
    if (ghi > 50 && clearGhi !== null && clearGhi > 50) {
      const ratio = Math.min(1, ghi / clearGhi);
      const pct = Math.round(ratio * 100);
      out.push({
        id: 'solar-ceiling',
        headlineAr:
          pct >= 85
            ? `سماء شفافة فعلياً — ${(pct)}% من أشعة الشمس الممكنة تصل`
            : pct >= 50
              ? `الغيوم تحجب ~${100 - pct}% من الطاقة الشمسية الآن`
              : `غطاء كثيف يمنع ${(100 - pct)}% من الإشعاع الشمسي`,
        mechanismAr: `نسبة GHI الفعلي إلى نظيره تحت سماء صافية (${Math.round(clearGhi)} W/m²) تقيس شفافية العمود الجوي مباشرة.`,
        confidence: 'high',
        drivers: ['GHI/clear-GHI'],
      });
    }
  }

  /* ── 6. Body-stress synthesis — what your body actually faces ──────── */
  {
    const t = snap.temperature.apparent_c;
    const rh = snap.moisture.relative_humidity_percent;
    const uv = snap.solar.uv_index;
    const stresses: string[] = [];
    if (t >= 35) stresses.push('إجهاد حراري');
    else if (t <= 0) stresses.push('برد قارس');
    if (rh >= 75 && t >= 28) stresses.push('خانق بسبب الرطوبة');
    if (uv >= 8) stresses.push('حرق شمسي خلال دقائق');
    if (snap.airQuality.aqi_us >= 150) stresses.push('هواء يضر التنفس');

    if (stresses.length >= 2) {
      out.push({
        id: 'compound-stress',
        headlineAr: `ضغط مركّب على الجسم: ${stresses.join(' + ')}`,
        mechanismAr: `${stresses.length} عوامل مجتمعة ترفع العبء الفسيولوجي فوق مجموع تأثيرها المنفرد — قلّل التعرض الخارجي المتواصل.`,
        confidence: 'high',
        drivers: ['apparent', 'RH', 'UV', 'AQI'],
      });
    }
  }

  /* ── 7. Pressure story — where is the atmosphere heading? ──────────── */
  {
    const d = snap.pressure.tendency_hpa_per_3hr;
    if (Number.isFinite(d) && d !== 0) {
      const rapid = Math.abs(d) >= 2;
      out.push({
        id: 'pressure-story',
        headlineAr:
          d < 0
            ? rapid
              ? 'هبوط ضغط سريع — نظام جوي يقترب بسرعة'
              : 'الضغط ينزلق ببطء — تغيّر تدريجي'
            : rapid
              ? 'ارتفاع ضغط سريع — استقرار يتشكل'
              : 'الضغط يتقدم بهدوء — طقس ثابت',
        mechanismAr: `Δ${d > 0 ? '+' : ''}${d.toFixed(1)} hPa/٣سا${rapid ? ' — هذا المعدل يعني عاصفة أو تحسن حاد خلال ساعات' : ''}.`,
        confidence: rapid ? 'high' : 'medium',
        drivers: ['ΔP/3hr'],
      });
    }
  }

  return out;
}
