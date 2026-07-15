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

type Lang = 'ar' | 'de';

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
  de: [
    {
      q: 'Wie oft beten Muslime am Tag?',
      a: 'Muslime verrichten fünf Pflichtgebete pro Tag: Fadschr, Dhuhr, Asr, Maghrib und Ischa. Sie sind eine der fünf Säulen des Islam und werden zu festen, täglich wechselnden Zeiten gebetet.',
    },
    {
      q: 'Wie werden Gebetszeiten berechnet?',
      a: 'Gebetszeiten ergeben sich aus dem astronomischen Sonnenstand am eigenen Standort. Jedes Gebet ist an ein Sonnenereignis gekoppelt: Fadschr bei astronomischer Morgendämmerung, Dhuhr nach Sonnenhöchststand, Asr wenn der Schatten gleich der Objekthöhe ist, Maghrib bei Sonnenuntergang und Ischa bei Ende der Abenddämmerung. Jede Berechnungsmethode legt eigene Winkel für Fadschr und Ischa fest.',
    },
    {
      q: 'Welche Berechnungsmethoden gibt es?',
      a: 'Verbreitete Methoden sind Umm al-Qura (Mekka), Muslim World League, ISNA (Nordamerika), Egyptian General Authority, Karachi und Kuwait. Sie unterscheiden sich in den Dämmerungswinkeln. In hohen Breiten greifen Sonderregeln wie „Mitte der Nacht" oder „Siebtel der Nacht".',
    },
    {
      q: 'Was ist die Qibla und wie finde ich sie?',
      a: 'Die Qibla ist die Gebetsrichtung zur Kaaba in Mekka. Sie wird über die Großkreisformel aus den Koordinaten deines Standorts und der Kaaba berechnet und meist als Winkel zum geografischen Norden angegeben.',
    },
    {
      q: 'Was passiert in hohen Breitengraden?',
      a: 'In polnahen Regionen tritt in manchen Jahreszeiten keine echte astronomische Dämmerung ein. Apps nutzen dann etablierte Konventionen wie „Mitte der Nacht" oder „Siebtel der Nacht", um Fadschr und Ischa fair zu schätzen.',
    },
    {
      q: 'Unterscheiden sich Gebetszeiten von Stadt zu Stadt?',
      a: 'Ja. Breitengrad, Längengrad, Höhe und Zeitzone verändern alle Gebetszeiten. SmartHub nutzt deinen tatsächlichen Standort, um die Zeiten präzise für deine Stadt zu berechnen.',
    },
  ],
};

export default function PrayerGuide() {
  const { language } = useApp();
  const lang: Lang = language === 'ar' ? 'ar' : 'de';
  const isAr = lang === 'ar';

  const title = isAr
    ? 'الدليل الشامل لأوقات الصلاة وطرق الحساب — SmartHub'
    : 'Leitfaden zu islamischen Gebetszeiten — SmartHub';
  const description = isAr
    ? 'دليل شامل لأوقات الصلاة الخمس، طرق الحساب الفلكية (أم القرى، رابطة العالم الإسلامي، ISNA)، اتجاه القبلة، وأسئلة شائعة عن الصلاة في الإسلام.'
    : 'Umfassender Leitfaden zu den fünf islamischen Gebetszeiten, astronomischen Berechnungsmethoden (Umm al-Qura, MWL, ISNA), Qibla-Richtung und häufigen Fragen.';

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

  const prayers = isAr
    ? [
        { name: 'الفجر', desc: 'قبل شروق الشمس عند بداية الشفق الصادق.' },
        { name: 'الظهر', desc: 'بعد زوال الشمس عن كبد السماء.' },
        { name: 'العصر', desc: 'حين يصبح ظل الشيء مثله (أو مثليه عند الحنفية).' },
        { name: 'المغرب', desc: 'فور غروب الشمس.' },
        { name: 'العشاء', desc: 'عند مغيب الشفق الأحمر في الأفق.' },
      ]
    : [
        { name: 'Fadschr', desc: 'Vor Sonnenaufgang, mit Beginn der echten Morgendämmerung.' },
        { name: 'Dhuhr', desc: 'Direkt nach dem Sonnenhöchststand.' },
        { name: 'Asr', desc: 'Wenn der Schatten eines Objekts seiner Länge entspricht.' },
        { name: 'Maghrib', desc: 'Unmittelbar nach Sonnenuntergang.' },
        { name: 'Ischa', desc: 'Wenn die rote Abenddämmerung verschwindet.' },
      ];

  const methods = isAr
    ? [
        { name: 'أم القرى (مكة)', desc: 'فجر 18.5°، عشاء بعد 90 دقيقة من المغرب (120 في رمضان).' },
        { name: 'رابطة العالم الإسلامي', desc: 'فجر 18°، عشاء 17°.' },
        { name: 'ISNA (أمريكا الشمالية)', desc: 'فجر 15°، عشاء 15°.' },
        { name: 'الهيئة المصرية', desc: 'فجر 19.5°، عشاء 17.5°.' },
        { name: 'كراتشي', desc: 'فجر 18°، عشاء 18°.' },
        { name: 'الكويت', desc: 'فجر 18°، عشاء 17.5°.' },
      ]
    : [
        { name: 'Umm al-Qura (Mekka)', desc: 'Fadschr 18,5°, Ischa 90 Min. nach Maghrib (120 im Ramadan).' },
        { name: 'Muslim World League', desc: 'Fadschr 18°, Ischa 17°.' },
        { name: 'ISNA (Nordamerika)', desc: 'Fadschr 15°, Ischa 15°.' },
        { name: 'Egyptian General Authority', desc: 'Fadschr 19,5°, Ischa 17,5°.' },
        { name: 'Karachi', desc: 'Fadschr 18°, Ischa 18°.' },
        { name: 'Kuwait', desc: 'Fadschr 18°, Ischa 17,5°.' },
      ];

  return (
    <div dir={isAr ? 'rtl' : 'ltr'} className="min-h-screen bg-background pb-28 px-5 pt-14">
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
            {isAr ? 'دليل الصلاة وأوقاتها' : 'Leitfaden zu Gebetszeiten'}
          </h1>
        </div>

        <article className="space-y-8 text-foreground/90 leading-relaxed text-[15px]">
          <section aria-labelledby="intro-h">
            <h2 id="intro-h" className="text-[17px] font-bold mb-2 text-foreground">
              {isAr ? 'مقدمة' : 'Einleitung'}
            </h2>
            <p>
              {isAr
                ? 'الصلاة ركن من أركان الإسلام وعبادة يومية تربط المسلم بربه خمس مرات في اليوم. تعتمد أوقاتها على حركة الشمس في موقعك الجغرافي، ولهذا تختلف الأوقات من مدينة إلى أخرى ومن يوم إلى آخر.'
                : 'Das Gebet (Salah) ist eine der fünf Säulen des Islam — fünf tägliche Begegnungen, die an feste, durch den Sonnenstand definierte Zeiten gebunden sind. Deshalb ändern sich die Zeiten täglich und unterscheiden sich von Stadt zu Stadt.'}
            </p>
          </section>

          <section aria-labelledby="five-h">
            <h2 id="five-h" className="text-[17px] font-bold mb-3 text-foreground flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              {isAr ? 'الصلوات الخمس' : 'Die fünf Gebete'}
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
              {isAr ? 'كيف تُحسب أوقات الصلاة فلكيًا؟' : 'Wie werden Gebetszeiten berechnet?'}
            </h2>
            <p>
              {isAr
                ? 'تُحسب كل صلاة من زاوية الشمس بالنسبة للأفق في موقعك. الظهر يُحسب من وقت الزوال (انتقال الشمس عن خط الزوال)، والعصر من طول الظل، والمغرب من غروب القرص، أما الفجر والعشاء فيُحسبان من زوايا تحت الأفق (الشفق الفلكي) تختلف بحسب طريقة الحساب.'
                : 'Jede Gebetszeit folgt einem Sonnenereignis: Dhuhr nach dem Höchststand, Asr nach Schattenlänge, Maghrib bei Sonnenuntergang. Fadschr und Ischa hängen vom Dämmerungswinkel der Sonne unter dem Horizont ab — und der Winkel unterscheidet sich je nach Methode.'}
            </p>
          </section>

          <section aria-labelledby="methods-h">
            <h2 id="methods-h" className="text-[17px] font-bold mb-3 text-foreground">
              {isAr ? 'طرق الحساب الشائعة' : 'Gängige Berechnungsmethoden'}
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
              {isAr
                ? 'يمكنك تغيير الطريقة من إعدادات الصلاة في SmartHub لمطابقة المسجد المحلي.'
                : 'In den Gebets-Einstellungen von SmartHub kannst du die Methode an deine lokale Moschee anpassen.'}
            </p>
          </section>

          <section aria-labelledby="qibla-h">
            <h2 id="qibla-h" className="text-[17px] font-bold mb-2 text-foreground flex items-center gap-2">
              <Compass className="w-4 h-4 text-primary" />
              {isAr ? 'اتجاه القبلة' : 'Qibla-Richtung'}
            </h2>
            <p>
              {isAr
                ? 'القبلة هي اتجاه الكعبة المشرفة بمكة. يُحسب الاتجاه عبر معادلة الدائرة العظمى من إحداثيات موقعك إلى إحداثيات الكعبة، ثم يُعرض كزاوية من الشمال الجغرافي.'
                : 'Die Qibla zeigt zur Kaaba in Mekka. Sie wird über die Großkreisformel aus deinen Koordinaten und denen der Kaaba berechnet und als Winkel zum geografischen Norden angezeigt.'}
            </p>
          </section>

          <section aria-labelledby="faq-h">
            <h2 id="faq-h" className="text-[17px] font-bold mb-3 text-foreground">
              {isAr ? 'الأسئلة الشائعة' : 'Häufige Fragen'}
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
              {isAr ? 'جرّب أوقات الصلاة في مدينتك' : 'Gebetszeiten für deine Stadt'}
            </h2>
            <p className="text-[13px] text-muted-foreground mb-3">
              {isAr
                ? 'يحسب SmartHub أوقاتك تلقائيًا من موقعك ويتيح لك اختيار طريقة الحساب التي تتبعها.'
                : 'SmartHub berechnet deine Zeiten automatisch aus deinem Standort und lässt dich die Methode wählen.'}
            </p>
            <Link
              to="/settings/prayer"
              className="inline-block text-[13px] font-bold text-primary hover:underline"
            >
              {isAr ? 'إعدادات الصلاة ←' : 'Gebets-Einstellungen →'}
            </Link>
          </section>
        </article>
      </div>
    </div>
  );
}