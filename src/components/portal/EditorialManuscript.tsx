import { motion } from 'framer-motion';

interface Verse {
  text: string;
  author: string;
}

const VERSES_BY_TIME: Record<'morning' | 'afternoon' | 'evening' | 'night', Verse> = {
  morning: {
    text: "أَعَزُّ مَكَانٍ فِي الدُّنَى سَرْجُ سَابِحٍ ... وَخَيْرُ جَلِيسٍ فِي الزَّمَانِ كِتَابُ",
    author: "أبو الطيب المتنبي"
  },
  afternoon: {
    text: "الْجِدُّ يُقَرِّبُ كُلَّ أَمْرٍ شَاسِعٍ ... وَالْجِدُّ يَفْتَحُ كُلَّ بَابٍ مُغْلَقِ",
    author: "الإمام الشافعي"
  },
  evening: {
    text: "عَلَى قَدْرِ أَهْلِ الْعَزْمِ تَأْتِي الْعَزَائِمُ ... وَتَأْتِي عَلَى قَدْرِ الْكِرَامِ الْمَكَارِمُ",
    author: "أبو الطيب المتنبي"
  },
  night: {
    text: "إِذَا سَجَا اللَّيْلُ وَاسْتَعْرَتْ كَوَاكِبُهُ ... فَابْسُطْ يَدَيْكَ إِلَى الرَّحْمَنِ تَبْتَهِلُ",
    author: "أدب عام"
  }
};

function getTimeOfDay(date: Date): 'morning' | 'afternoon' | 'evening' | 'night' {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 15) return 'afternoon';
  if (hour >= 15 && hour < 19) return 'evening';
  return 'night';
}

function greetingFor(date: Date): string {
  const hour = date.getHours();
  if (hour < 5) return 'ليلة مباركة';
  if (hour < 12) return 'صباح الخير';
  if (hour < 15) return 'نهارك سعيد';
  if (hour < 19) return 'مساء الخير';
  return 'طاب مساؤك';
}

interface EditorialManuscriptProps {
  username: string | null;
}

/**
 * EditorialManuscript — A luxurious Manuscript (مخطوطة) card layout
 * featuring complex Arabic typographic margins, ornamental crop-marks,
 * watermark seals, and an interactive brand seal 'ع'.
 */
export default function EditorialManuscript({ username }: EditorialManuscriptProps) {
  const timeOfDay = getTimeOfDay(new Date());
  const verse = VERSES_BY_TIME[timeOfDay];

  return (
    <div className="relative overflow-hidden rounded-xl border border-amber-900/20 bg-[#16130F] text-[#F2E9D8] p-6 md:p-8 transition-colors duration-normal shadow-2xl">
      {/* Structural Crease Page Fold Visual */}
      <div className="absolute top-0 bottom-0 left-[50%] -translate-x-1/2 w-px border-s border-dashed border-[#7E7259]/15 pointer-events-none" />

      {/* Manuscript Corner Crop-marks & Framing */}
      <span className="absolute top-2 start-2 w-3 h-3 border-t border-s border-[#7E7259]/30" />
      <span className="absolute top-2 end-2 w-3 h-3 border-t border-e border-[#7E7259]/30" />
      <span className="absolute bottom-2 start-2 w-3 h-3 border-b border-s border-[#7E7259]/30" />
      <span className="absolute bottom-2 end-2 w-3 h-3 border-b border-e border-[#7E7259]/30" />

      {/* Elegant Golden Foil Accent Indicator */}
      <div className="absolute top-0 start-0 h-1 w-28 bg-gradient-to-r from-[#B8492E] to-amber-600" />

      {/* Greeting and interactive brand wax seal */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative z-10">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-[#B8492E] animate-pulse" />
            <p className="text-micro font-bold tracking-[0.14em] uppercase text-[#B8492E] font-tajawal">
              بوابة الأدب والسكينة والأصل
            </p>
          </div>

          <div className="flex items-baseline gap-2.5">
            <h2 className="text-display font-bold font-amiri leading-tight text-[#F2E9D8]">
              {greetingFor(new Date())}
            </h2>
            {username && (
              <span className="text-title font-medium text-[#B8AA8E] font-amiri">
                ، {username}
              </span>
            )}
          </div>
        </div>

        {/* Dynamic Spinning brand seal "ع" */}
        <motion.div
          whileHover={{ rotate: 15, scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="relative h-14 w-14 shrink-0 flex items-center justify-center rounded-full border border-[#7E7259]/50 bg-[#1E1912] text-[#B8492E] shadow-[inset_0_0_12px_rgba(184,73,46,0.15)] cursor-pointer"
        >
          {/* Circular watermark path */}
          <svg className="absolute inset-0 h-full w-full opacity-20 rotate-slow" viewBox="0 0 100 100">
            <path id="circlePath" d="M 50, 50 m -37, 0 a 37,37 0 1,1 74,0 a 37,37 0 1,1 -74,0" fill="transparent" />
            <text className="fill-[#F2E9D8] text-mini tracking-[1px] font-tajawal">
              <textPath href="#circlePath">السكينة والعمل • AMV.LIFE • </textPath>
            </text>
          </svg>
          <span className="font-amiri text-2xl font-bold translate-y-[-1px]">ع</span>
        </motion.div>
      </div>

      {/* Centered Literary Verse within Manuscript Frame */}
      <div className="mt-6 border-t border-[#7E7259]/20 pt-5 relative z-10">
        <div className="relative py-2">
          <span className="absolute -top-3 start-1 select-none font-amiri text-[2.5rem] leading-none text-[#B8492E]/20">
            «
          </span>
          <p className="font-amiri text-[1.25rem] font-medium leading-[2.1] text-[#F2E9D8] ps-6 pe-6 text-center select-all">
            {(() => {
              const parts = verse.text.split("...");
              if (parts.length === 2) {
                return (
                  <span className="flex flex-col md:flex-row items-center justify-center gap-2 md:gap-4 md:flex-wrap">
                    <span>{parts[0]}</span>
                    <span className="text-[#B8492E] text-meta select-none">◆</span>
                    <span>{parts[1]}</span>
                  </span>
                );
              }
              return verse.text;
            })()}
          </p>
          <span className="absolute -bottom-3 end-1 select-none font-amiri text-[2.5rem] leading-none text-[#B8492E]/20">
            »
          </span>
        </div>

        <div className="mt-4 flex justify-end">
          <span className="rounded-full bg-[#1E1912] px-3 py-1 text-micro font-medium text-[#B8AA8E] border border-[#7E7259]/30">
            {verse.author}
          </span>
        </div>
      </div>
    </div>
  );
}
