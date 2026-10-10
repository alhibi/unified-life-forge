import React from 'react';
import { Link } from 'react-router-dom';

import PageHeader from '@/components/PageHeader';
import SEO from '@/components/SEO';
import { AppCard, AppList, PageShell } from '@/components/ui/app-shell';
import { BookOpen, ChevronDown, Clock, Compass } from '@/lib/icons';

/**
 * /mihrab/prayer-guide — long-form, SEO-targeted educational guide
 * to Islamic prayer (Salah). Built to capture high-volume queries
 * like "prayer times", "islamic prayer times", "how are prayer
 * times calculated", and "how many times a day do Muslims pray".
 *
 * The page ships Article + FAQPage JSON-LD so rich results can surface
 * the FAQ.
 */

type Lang = 'ar';

interface FaqItem { q: string; a: string }

const FAQ: Record<Lang, FaqItem[]> = {
  ar: [
    {
      q: 'كم مرة يصلي المسلمون في اليوم؟',
      a: 'يصلي المسلمون خمس صلوات مفروضة كل يوم: الفجر، الظهر، العصر، المغرب والعشاء. وهي ركن من أركان الإسلام وتُؤدّى في أوقات محددة تتغير يوميًا تبعًا لحركة الشمس.',
    },
    {
      q: 'كيف تُحسب أوقات الصلاة؟',
      a: 'تُحسب أوقات الصلاة من الزاوية الفلكية للشمس في موقعك الجغرافي. تعتمد كل صلاة على حدث شمسي محدد: الفجر عند بداية الشفق الصادق، الظهر بعد زوال الشمس، العصر عند بلوغ ظل الشيء مثله (أو مثليه عند الحنفية)، المغرب عند غروب الشمس، والعشاء عند مغيب الشفق. يضيف كل حساب طريقة (مثل أم القرى أو رابطة العالم الإسلامي) تحدد زاوية الفجر والعشاء.',
    },
    {
      q: 'ما هي طرق حساب أوقات الصلاة؟',
      a: 'أشهر الطرق: أم القرى (مكة)، رابطة العالم الإسلامي، الجمعية الإسلامية لأمريكا الشمالية (ISNA)، الهيئة المصرية، جامعة العلوم الإسلامية بكراتشي، ووزارة الأوقاف الكويتية. تختلف كل طريقة في زاوية الفجر والعشاء، وفي خطوط العرض العالية تُستخدم قواعد مثل «منتصف الليل» أو «السُّبع» لتجنّب الأوقات غير الواقعية.',
    },
    {
      q: 'ما هي القبلة وكيف أحددها؟',
      a: 'القبلة هي اتجاه الكعبة المشرفة في مكة المكرمة، ويتوجه إليها المسلمون في الصلاة. يُحسب الاتجاه باستخدام إحداثيات موقعك وإحداثيات الكعبة عبر معادلة الدائرة العظمى، ويظهر عادةً كزاوية من الشمال الجغرافي.',
    },
    {
      q: 'ماذا أفعل عند خطوط العرض العالية حيث لا يغيب الشفق؟',
      a: 'في المناطق القريبة من القطبين قد لا يتحقق وقت الفجر أو العشاء فلكيًا في بعض فصول السنة. تعتمد التطبيقات قواعد متفق عليها مثل «منتصف الليل» (تقسيم الليل نصفين) أو «السُّبع» (تقسيمه إلى سبعة)، وهي القاعدة الافتراضية في كثير من الطرق الحديثة.',
    },
    {
      q: 'هل تختلف أوقات الصلاة من مدينة لأخرى؟',
      a: 'نعم. تختلف الأوقات حسب خط العرض والطول والارتفاع وفرق التوقيت المحلي. لذلك يستخدم تطبيق SmartHub موقعك الفعلي لحساب أوقات دقيقة لكل صلاة في مدينتك.',
    },
  ],
};

export default function PrayerGuide() {
  const lang: Lang = 'ar';

  const title = 'الدليل الشامل لأوقات الصلاة وطرق الحساب — SmartHub';
  const description = 'دليل شامل لأوقات الصلاة الخمس، طرق الحساب الفلكية (أم القرى، رابطة العالم الإسلامي، ISNA)، اتجاه القبلة، وأسئلة شائعة عن الصلاة في الإسلام.';

  const faq = FAQ[lang];

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'Article',
      '@id': 'https://amv.life/mihrab/prayer-guide',
      url: 'https://amv.life/mihrab/prayer-guide',
      headline: title,
      inLanguage: lang,
      author: { '@type': 'Organization', name: 'SmartHub' },
      publisher: { '@type': 'Organization', name: 'SmartHub' },
      description,
      about: ['Islamic prayer', 'Salah', 'Prayer times', 'Qibla', 'Adhan'],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faq.map((f) => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a },
      })),
    },
  ];

  const prayers = [
        { name: 'الفجر', desc: 'قبل شروق الشمس عند بداية الشفق الصادق.' },
        { name: 'الظهر', desc: 'بعد زوال الشمس عن كبد السماء.' },
        { name: 'العصر', desc: 'حين يصبح ظل الشيء مثله (أو مثليه عند الحنفية).' },
        { name: 'المغرب', desc: 'فور غروب الشمس.' },
        { name: 'العشاء', desc: 'عند مغيب الشفق الأحمر في الأفق.' },
      ];

  const methods = [
        { name: 'أم القرى (مكة)', desc: 'فجر 18.5°، عشاء بعد 90 دقيقة من المغرب (120 في رمضان).' },
        { name: 'رابطة العالم الإسلامي', desc: 'فجر 18°، عشاء 17°.' },
        { name: 'ISNA (أمريكا الشمالية)', desc: 'فجر 15°، عشاء 15°.' },
        { name: 'الهيئة المصرية', desc: 'فجر 19.5°، عشاء 17.5°.' },
        { name: 'كراتشي', desc: 'فجر 18°، عشاء 18°.' },
        { name: 'الكويت', desc: 'فجر 18°، عشاء 17.5°.' },
      ];

  return (
    <PageShell flush centered={false} className="px-4 pt-2">
      <SEO
        title={title}
        description={description}
        path="/mihrab/prayer-guide"
        type="article"
        jsonLd={jsonLd}
      />
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 pb-page">
        <PageHeader
          sticky
          title="دليل الصلاة وأوقاتها"
          icon={<BookOpen className="w-5 h-5 text-primary" aria-hidden />}
          backFallback="/mihrab"
        />

        <article className="pt-2 space-y-8 text-foreground/90 leading-relaxed text-meta">
          <section aria-labelledby="intro-h">
            <h2 id="intro-h" className="text-body font-bold mb-2 text-foreground">
              {'مقدمة'}
            </h2>
            <p>
              {'الصلاة ركن من أركان الإسلام وعبادة يومية تربط المسلم بربه خمس مرات في اليوم. تعتمد أوقاتها على حركة الشمس في موقعك الجغرافي، ولهذا تختلف الأوقات من مدينة إلى أخرى ومن يوم إلى آخر.'}
            </p>
          </section>

          <section aria-labelledby="five-h">
            <h2 id="five-h" className="text-body font-bold mb-3 text-foreground flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" aria-hidden />
              {'الصلوات الخمس'}
            </h2>
            <AppList role="list">
              {prayers.map((p) => (
                <div key={p.name} role="listitem" className="app-row flex-col items-start">
                  <p className="font-bold text-foreground">{p.name}</p>
                  <p className="text-mini text-muted-foreground mt-1">{p.desc}</p>
                </div>
              ))}
            </AppList>
          </section>

          <section aria-labelledby="calc-h">
            <h2 id="calc-h" className="text-body font-bold mb-2 text-foreground">
              {'كيف تُحسب أوقات الصلاة فلكيًا؟'}
            </h2>
            <p>
              {'تُحسب كل صلاة من زاوية الشمس بالنسبة للأفق في موقعك. الظهر يُحسب من وقت الزوال (انتقال الشمس عن خط الزوال)، والعصر من طول الظل، والمغرب من غروب القرص، أما الفجر والعشاء فيُحسبان من زوايا تحت الأفق (الشفق الفلكي) تختلف بحسب طريقة الحساب.'}
            </p>
          </section>

          <section aria-labelledby="methods-h">
            <h2 id="methods-h" className="text-body font-bold mb-3 text-foreground">
              {'طرق الحساب الشائعة'}
            </h2>
            <AppList role="list">
              {methods.map((m) => (
                <div key={m.name} role="listitem" className="app-row flex-col items-start">
                  <p className="font-bold text-foreground">{m.name}</p>
                  <p className="text-mini text-muted-foreground mt-1">{m.desc}</p>
                </div>
              ))}
            </AppList>
            <p className="mt-3 text-mini text-muted-foreground">
              {'يمكنك تغيير الطريقة من إعدادات الصلاة في SmartHub لمطابقة المسجد المحلي.'}
            </p>
          </section>

          <section aria-labelledby="qibla-h">
            <h2 id="qibla-h" className="text-body font-bold mb-2 text-foreground flex items-center gap-2">
              <Compass className="w-4 h-4 text-primary" aria-hidden />
              {'اتجاه القبلة'}
            </h2>
            <p>
              {'القبلة هي اتجاه الكعبة المشرفة بمكة. يُحسب الاتجاه عبر معادلة الدائرة العظمى من إحداثيات موقعك إلى إحداثيات الكعبة، ثم يُعرض كزاوية من الشمال الجغرافي.'}
            </p>
          </section>

          <section aria-labelledby="faq-h">
            <h2 id="faq-h" className="text-body font-bold mb-3 text-foreground">
              {'الأسئلة الشائعة'}
            </h2>
            <div className="space-y-3">
              {faq.map((f) => (
                <details key={f.q} className="app-card group">
                  <summary className="cursor-pointer font-bold text-foreground text-meta list-none flex items-center justify-between gap-2">
                    <span>{f.q}</span>
                    <ChevronDown className="w-4 h-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden />
                  </summary>
                  <p className="mt-2 text-mini text-muted-foreground leading-relaxed">{f.a}</p>
                </details>
              ))}
            </div>
          </section>

          <section aria-labelledby="cta-h">
            <AppCard>
              <h2 id="cta-h" className="text-meta font-bold text-foreground mb-1">
                {'جرّب أوقات الصلاة في مدينتك'}
              </h2>
              <p className="text-mini text-muted-foreground mb-3">
                {'يحسب SmartHub أوقاتك تلقائيًا من موقعك ويتيح لك اختيار طريقة الحساب التي تتبعها.'}
              </p>
              <Link
                to="/settings/prayer"
                className="inline-block text-mini font-bold text-primary hover:underline"
              >
                {'إعدادات الصلاة ←'}
              </Link>
            </AppCard>
          </section>
        </article>
      </div>
    </PageShell>
  );
}
