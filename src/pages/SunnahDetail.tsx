import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronRight, ChevronLeft, Heart, Moon, CloudSun, Sun, Cloud, Calendar } from 'lucide-react';

const sunnahData: Record<string, { label: string; icon: any; accent: string; items: string[] }> = {
  fajr: {
    label: 'سنن الفجر',
    icon: CloudSun,
    accent: '#D4A843',
    items: [
      'أذكار الصباح',
      'سُنَّة الفجر هي أول السُّنن الراتبة',
      'الأفضل أن تؤدَّى السُّنن الرواتب في البيت',
      'آكد السُّنن الرواتب سنة الفجر',
      'مشروعيتها في السَّفر والحضر',
      'ثوابها بأنها خير من الدنيا وما فيها',
      'يُسَنُّ تخفيفها',
      'يُسَنُّ أن يقرأ في سُنَّة الفجر بما يلي',
      'يُسَنُّ الاضطجاع على الشق الأيمن بعد سُنَّة الفجر',
      'الجلوس بعد الفجر في المصلى حتى تطلع الشمس',
    ],
  },
  'before-fajr': {
    label: 'سنن قبل الفجر',
    icon: Moon,
    accent: '#D4A843',
    items: [
      'قيام الليل',
      'الوتر',
      'صلاة التهجد',
      'الدعاء في الثلث الأخير من الليل',
      'السحور',
      'تأخير السحور',
      'الاستغفار بالأسحار',
      'قراءة القرآن',
      'السواك عند القيام من النوم',
      'الوضوء قبل النوم',
      'النوم على طهارة',
      'أذكار النوم',
      'النوم على الشق الأيمن',
      'قراءة آية الكرسي قبل النوم',
      'قراءة المعوذتين قبل النوم',
      'نفض الفراش قبل النوم',
      'الدعاء عند الاستيقاظ من النوم',
      'صلاة ركعتين خفيفتين عند القيام',
    ],
  },
  dhuhr: {
    label: 'سنن الظهر',
    icon: Sun,
    accent: '#4CAF50',
    items: [
      'أربع ركعات قبل الظهر',
      'ركعتان بعد الظهر',
      'صلاة أربع بعد الظهر',
    ],
  },
  duha: {
    label: 'سنن الضحى',
    icon: Sun,
    accent: '#D4A843',
    items: [
      'وقت صلاة الضحى',
      'فضل صلاة الضحى',
      'عدد ركعات صلاة الضحى',
      'صلاة الإشراق',
    ],
  },
  asr: {
    label: 'سنن العصر',
    icon: CloudSun,
    accent: '#4CAF50',
    items: [
      'أربع ركعات قبل العصر',
      'الدعاء بين الأذان والإقامة',
      'أذكار المساء بعد العصر',
    ],
  },
  maghrib: {
    label: 'سنن المغرب',
    icon: Cloud,
    accent: '#4CAF50',
    items: [
      'ركعتان بعد المغرب',
      'الصلاة بين الأذان والإقامة',
      'أذكار المساء',
      'الدعاء عند الإفطار',
    ],
  },
  isha: {
    label: 'سنن العشاء',
    icon: Moon,
    accent: '#D4A843',
    items: [
      'ركعتان بعد العشاء',
      'صلاة الوتر',
      'قراءة سورة الملك قبل النوم',
      'أذكار النوم',
      'النوم على وضوء',
      'الاضطجاع على الشق الأيمن',
    ],
  },
  friday: {
    label: 'سنن يوم الجمعة',
    icon: Calendar,
    accent: '#D4A843',
    items: [
      'قراءة سورة الكهف',
      'الإكثار من الصلاة على النبي ﷺ',
      'الاغتسال يوم الجمعة',
      'التبكير إلى صلاة الجمعة',
    ],
  },
};

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04 } },
};

const item = {
  hidden: { opacity: 0, x: 20 },
  show: { opacity: 1, x: 0, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] as const } },
};

export default function SunnahDetail() {
  const navigate = useNavigate();
  const { categoryId } = useParams<{ categoryId: string }>();
  const data = sunnahData[categoryId || ''];

  if (!data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">لم يتم العثور على البيانات</p>
      </div>
    );
  }

  const IconComponent = data.icon;

  return (
    <div className="min-h-screen bg-background pb-24" dir="rtl">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border/30">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full bg-card/80 border border-border/40 flex items-center justify-center"
          >
            <ChevronRight className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-lg font-bold text-foreground">{data.label}</h1>
          <div className="w-10" />
        </div>
      </div>

      {/* Summary */}
      <div className="flex items-center justify-end gap-3 px-6 py-5">
        <div className="text-right">
          <h2 className="text-base font-bold text-foreground">السنن</h2>
          <p className="text-sm text-muted-foreground">{data.items.length} سنة</p>
        </div>
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center"
          style={{ backgroundColor: `${data.accent}18` }}
        >
          <IconComponent className="w-6 h-6" style={{ color: data.accent }} />
        </div>
      </div>

      {/* Sunnah List */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="flex flex-col gap-2.5 px-4"
      >
        {data.items.map((sunnah, index) => (
          <motion.div
            key={index}
            variants={item}
            className="flex items-center gap-3 px-4 py-4 rounded-2xl bg-card/80 border border-border/40 backdrop-blur-sm"
          >
            {/* Left actions */}
            <div className="flex items-center gap-2 shrink-0">
              <ChevronLeft className="w-4 h-4 text-muted-foreground/40" />
              <Heart className="w-4 h-4 text-muted-foreground/40" />
            </div>

            {/* Text */}
            <p className="flex-1 text-sm font-medium text-foreground text-right leading-relaxed">
              {sunnah}
            </p>

            {/* Number */}
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
              style={{ backgroundColor: `${data.accent}20` }}
            >
              <span className="text-xs font-bold" style={{ color: data.accent }}>
                {index + 1}
              </span>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
