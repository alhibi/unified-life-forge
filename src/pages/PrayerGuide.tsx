import React from 'react';
import SEO from '@/components/SEO';
import BackButton from '@/components/BackButton';
import { useApp } from '@/contexts/AppContext';
import { Link } from 'react-router-dom';
import { BookOpen, Clock, Compass, ChevronLeft } from '@/lib/icons';

/**
 * /mihrab/prayer-guide — long-form, SEO-targeted educational guide
 * to Islamic prayer (Salah). Built to capture high-volume queries
 * like "prayer times", "islamic prayer times", "how are prayer
 * times calculated", and "how many times a day do Muslims pray".
 *
 * The page is bilingual (Arabic / German) via AppContext and ships
 * Article + FAQPage JSON-LD so rich results can surface the FAQ.
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
  const { } = useApp();
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
    <div dir={'rtl'} className="min-h-screen bg-background pb-page px-5 pt-14">
      <SEO
        title={title}
        description={description}
        path="/mihrab/prayer-guide"
        type="article"
        jsonLd={jsonLd}
      />
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <BackButton fallback="/mihrab" />
          <h1 className="text-[20px] font-bold tracking-tight text-foreground flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary shrink-0" />
            {'دليل الصلاة وأوقاتها'}
          </h1>
        </div>

        <article className="space-y-8 text-foreground/90 leading-relaxed text-[15px]">
          <section aria-labelledby="intro-h">
            <h2 id="intro-h" className="text-[17px] font-bold mb-2 text-foreground">
              {'مقدمة'}
            </h2>
            <p>
              {'الصلاة ركن من أركان الإسلام وعبادة يومية تربط المسلم بربه خمس مرات في اليوم. تعتمد أوقاتها على حركة الشمس في موقعك الجغرافي، ولهذا تختلف الأوقات من مدينة إلى أخرى ومن يوم إلى آخر.'}
            </p>
          </section>

          <section aria-labelledby="five-h">
            <h2 id="five-h" className="text-[17px] font-bold mb-3 text-foreground flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              {'الصلوات الخمس'}
            </h2>
            <ul className="space-y-2">
              {prayers.map((p) => (
                <li key={p.name} className="rounded-xl bg-card/60 border border-border/40 p-3">
                  <p className="font-bold text-foreground">{p.name}</p>
                  <p className="text-[13px] text-muted-foreground mt-1">{p.desc}</p>
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="calc-h">
            <h2 id="calc-h" className="text-[17px] font-bold mb-2 text-foreground">
              {'كيف تُحسب أوقات الصلاة فلكيًا؟'}
            </h2>
            <p>
              {'تُحسب كل صلاة من زاوية الشمس بالنسبة للأفق في موقعك. الظهر يُحسب من وقت الزوال (انتقال الشمس عن خط الزوال)، والعصر من طول الظل، والمغرب من غروب القرص، أما الفجر والعشاء فيُحسبان من زوايا تحت الأفق (الشفق الفلكي) تختلف بحسب طريقة الحساب.'}
            </p>
          </section>

          <section aria-labelledby="methods-h">
            <h2 id="methods-h" className="text-[17px] font-bold mb-3 text-foreground">
              {'طرق الحساب الشائعة'}
            </h2>
            <ul className="space-y-2">
              {methods.map((m) => (
                <li key={m.name} className="rounded-xl bg-card/60 border border-border/40 p-3">
                  <p className="font-bold text-foreground">{m.name}</p>
                  <p className="text-[13px] text-muted-foreground mt-1">{m.desc}</p>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[13px] text-muted-foreground">
              {'يمكنك تغيير الطريقة من إعدادات الصلاة في SmartHub لمطابقة المسجد المحلي.'}
            </p>
          </section>

          <section aria-labelledby="qibla-h">
            <h2 id="qibla-h" className="text-[17px] font-bold mb-2 text-foreground flex items-center gap-2">
              <Compass className="w-4 h-4 text-primary" />
              {'اتجاه القبلة'}
            </h2>
            <p>
              {'القبلة هي اتجاه الكعبة المشرفة بمكة. يُحسب الاتجاه عبر معادلة الدائرة العظمى من إحداثيات موقعك إلى إحداثيات الكعبة، ثم يُعرض كزاوية من الشمال الجغرافي.'}
            </p>
          </section>

          <section aria-labelledby="faq-h">
            <h2 id="faq-h" className="text-[17px] font-bold mb-3 text-foreground">
              {'الأسئلة الشائعة'}
            </h2>
            <div className="space-y-3">
              {faq.map((f) => (
                <details key={f.q} className="rounded-xl bg-card/60 border border-border/40 p-3 group">
                  <summary className="cursor-pointer font-bold text-foreground text-[14px] list-none flex items-center justify-between gap-2">
                    <span>{f.q}</span>
                    <ChevronLeft className="w-4 h-4 text-muted-foreground transition-transform group-open:-rotate-90 rtl:group-open:rotate-90" />
                  </summary>
                  <p className="mt-2 text-[13px] text-muted-foreground leading-relaxed">{f.a}</p>
                </details>
              ))}
            </div>
          </section>

          <section aria-labelledby="cta-h" className="rounded-2xl bg-primary/10 border border-primary/20 p-4">
            <h2 id="cta-h" className="text-[15px] font-bold text-foreground mb-1">
              {'جرّب أوقات الصلاة في مدينتك'}
            </h2>
            <p className="text-[13px] text-muted-foreground mb-3">
              {'يحسب SmartHub أوقاتك تلقائيًا من موقعك ويتيح لك اختيار طريقة الحساب التي تتبعها.'}
            </p>
            <Link
              to="/settings/prayer"
              className="inline-block text-[13px] font-bold text-primary hover:underline"
            >
              {'إعدادات الصلاة ←'}
            </Link>
          </section>
        </article>
      </div>
    </div>
  );
}