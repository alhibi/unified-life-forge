import { motion } from 'framer-motion';

/**
 * Skeleton placeholders for the reading list. We render 6 fake article
 * rows with a subtle staggered shimmer so loading feels deliberate
 * rather than empty. The shimmer uses a CSS gradient on transform: x
 * (no JS reflows), so it's cheap on low-end devices.
 */
export function ArticleListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="divide-y divide-border/20">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="p-4 flex gap-3.5">
          <div className="flex-1 min-w-0 space-y-2">
            <ShimmerBar widthClass="w-full" heightClass="h-3.5" delay={i * 80} />
            <ShimmerBar widthClass="w-4/5" heightClass="h-3.5" delay={i * 80 + 40} />
            <ShimmerBar widthClass="w-3/5" heightClass="h-3" delay={i * 80 + 80} />
            <div className="flex gap-2 pt-1">
              <ShimmerBar widthClass="w-16" heightClass="h-2.5" delay={i * 80 + 120} />
              <ShimmerBar widthClass="w-10" heightClass="h-2.5" delay={i * 80 + 140} />
            </div>
          </div>
          <ShimmerBar widthClass="w-16 shrink-0" heightClass="h-16" rounded="rounded-xl" delay={i * 80 + 160} />
        </div>
      ))}
    </div>
  );
}

export function ArticleDetailSkeleton() {
  return (
    <div className="flex flex-col">
      <ShimmerBar widthClass="w-full" heightClass="h-52" rounded="rounded-none" />
      <div className="px-5 pt-4 pb-8 space-y-3">
        <ShimmerBar widthClass="w-full" heightClass="h-6" />
        <ShimmerBar widthClass="w-5/6" heightClass="h-6" />
        <ShimmerBar widthClass="w-32" heightClass="h-3" delay={100} />
        <div className="h-px bg-border/40 my-4" />
        <ShimmerBar widthClass="w-full" heightClass="h-3" delay={120} />
        <ShimmerBar widthClass="w-full" heightClass="h-3" delay={160} />
        <ShimmerBar widthClass="w-11/12" heightClass="h-3" delay={200} />
        <ShimmerBar widthClass="w-full" heightClass="h-3" delay={240} />
        <ShimmerBar widthClass="w-3/4" heightClass="h-3" delay={280} />
      </div>
    </div>
  );
}

export function ShimmerBar({
  widthClass,
  heightClass,
  rounded = 'rounded-md',
  delay = 0,
}: {
  widthClass: string;
  heightClass: string;
  rounded?: string;
  delay?: number;
}) {
  return (
    <motion.div
      className={`${widthClass} ${heightClass} ${rounded} relative overflow-hidden bg-muted/40`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: delay / 1000 }}
    >
      <motion.div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(90deg, transparent, hsl(var(--foreground) / 0.06), transparent)',
        }}
        animate={{ x: ['-100%', '100%'] }}
        transition={{
          duration: 1.4,
          repeat: Infinity,
          ease: 'linear',
          delay: delay / 1000,
        }}
      />
    </motion.div>
  );
}
