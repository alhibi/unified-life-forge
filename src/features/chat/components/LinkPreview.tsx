import DOMPurify from 'dompurify';
import { AnimatePresence, motion } from 'framer-motion';
import React, { useEffect, useState } from 'react';

import { BookOpen, ExternalLink, Github, Globe, Loader2, Video } from '@/lib/icons';

interface LinkPreviewProps {
  url: string;
}

interface LinkMeta {
  title: string;
  description?: string;
  image?: string;
  logo?: string;
  publisher?: string;
}

export const LinkPreview: React.FC<LinkPreviewProps> = ({ url, }) => {
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState<LinkMeta | null>(null);

  // Normalize URL for lookup
  const cleanUrl = url.startsWith('http') ? url : `https://${url}`;

  // Domain-specific static fallbacks for instant offline/CORS rendering
  const getDomainFallback = (host: string): LinkMeta | null => {
    const domain = host.toLowerCase();
    if (domain.includes('youtube.com') || domain.includes('youtu.be')) {
      return {
        title: 'فيديو يوتيوب',
        description: 'شاهد هذا الفيديو مباشرة على يوتيوب.',
        publisher: 'YouTube',
      };
    }
    if (domain.includes('github.com')) {
      return {
        title: 'مستودع جيت هاب',
        description: 'استكشف الكود والمشاريع البرمجية المفتوحة المصدر.',
        publisher: 'GitHub',
      };
    }
    if (domain.includes('wikipedia.org')) {
      return {
        title: 'ويكيبيديا، الموسوعة الحرة',
        description: 'اقرأ المقال الكامل وابحث في المعرفة الحرة.',
        publisher: 'Wikipedia',
      };
    }
    if (domain.includes('twitter.com') || domain.includes('x.com')) {
      return {
        title: 'منصة إكس',
        description: 'تابع آخر التغريدات والمستجدات والأفكار.',
        publisher: 'X',
      };
    }
    return null;
  };

  useEffect(() => {
    let active = true;
    setLoading(true);

    let host = '';
    try {
      host = new URL(cleanUrl).hostname;
    } catch {
      setLoading(false);
      return;
    }

    const fallback = getDomainFallback(host);

    // Fetch from Microlink API - extremely reliable, completely free, public JSON endpoint for metadata
    const fetchMeta = async () => {
      try {
        const res = await fetch(`https://api.microlink.io?url=${encodeURIComponent(cleanUrl)}`);
        if (!res.ok) throw new Error('Failed to fetch link preview');
        const json = await res.json();
        if (!active) return;

        if (json.status === 'success' && json.data) {
          const d = json.data;
          setMeta({
            title: DOMPurify.sanitize(d.title || fallback?.title || host, { ALLOWED_TAGS: [] }),
            description: d.description ? DOMPurify.sanitize(d.description, { ALLOWED_TAGS: [] }) : fallback?.description,
            image: d.image?.url,
            logo: d.logo?.url,
            publisher: d.publisher ? DOMPurify.sanitize(d.publisher, { ALLOWED_TAGS: [] }) : fallback?.publisher,
          });
        } else {
          throw new Error('Invalid status');
        }
      } catch {
        if (!active) return;
        // Fallback gracefully to domain metadata if Microlink fails (CORS, offline, rate limit)
        setMeta(
          fallback || {
            title: host,
            description: 'انقر لفتح هذا الرابط الخارجي بأمان.',
          },
        );
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchMeta();

    return () => {
      active = false;
    };
  }, [cleanUrl]);

  const IconComponent = () => {
    const h = cleanUrl.includes('//') ? cleanUrl.split('/')[2].toLowerCase() : '';
    if (h.includes('youtube') || h.includes('youtu.be'))
      return <Video className="w-4 h-4 text-red-500" />;
    if (h.includes('github')) return <Github className="w-4 h-4 text-foreground" />;
    if (h.includes('wikipedia')) return <BookOpen className="w-4 h-4 text-blue-400" />;
    return <Globe className="w-4 h-4 text-[#C9A84C]" />;
  };

  return (
    <div
      className="mt-2 text-start select-none no-context-menu"
      onClick={(e) => e.stopPropagation()}
    >
      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div
            key="skeleton"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col gap-2 p-2.5 rounded-xl bg-black/40 border border-[#C9A84C]/20 w-full min-w-[240px] max-w-[340px]"
          >
            <div className="flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 text-[#C9A84C] animate-spin" />
              <div className="h-3 w-2/3 bg-muted/40 rounded animate-pulse" />
            </div>
            <div className="h-2 w-full bg-muted/20 rounded animate-pulse" />
            <div className="h-2 w-4/5 bg-muted/20 rounded animate-pulse" />
          </motion.div>
        ) : (
          meta && (
            <motion.a
              key="preview-card"
              href={cleanUrl}
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ type: 'spring', damping: 20 }}
              className="flex flex-col rounded-xl bg-black/50 hover:bg-black/70 active:scale-[0.98] transition-all border border-[#C9A84C]/20 overflow-hidden w-full min-w-[240px] max-w-[340px] group shadow-lg"
            >
              {meta.image && (
                <div className="relative aspect-[1.91/1] w-full overflow-hidden bg-muted/10 border-b border-[#C9A84C]/10">
                  <img
                    src={meta.image}
                    alt=""
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute top-2 end-2 w-7 h-7 rounded-full bg-black/70 flex items-center justify-center border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ExternalLink className="w-3.5 h-3.5 text-white/80" />
                  </div>
                </div>
              )}

              <div className="p-3 space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <div className="w-5 h-5 rounded-md bg-white/5 flex items-center justify-center shrink-0">
                    {meta.logo ? (
                      <img src={meta.logo} alt="" className="w-3.5 h-3.5 object-contain" />
                    ) : (
                      <IconComponent />
                    )}
                  </div>
                  {meta.publisher && (
                    <span className="text-micro uppercase tracking-wider text-[#C9A84C] font-bold font-mono">
                      {meta.publisher}
                    </span>
                  )}
                </div>

                <h4 className="text-mini font-bold text-foreground leading-snug line-clamp-1 group-hover:text-[#C9A84C] transition-colors">
                  {meta.title}
                </h4>

                {meta.description && (
                  <p
                    className="text-micro text-muted-foreground/80 leading-relaxed line-clamp-2"
                    dir="auto"
                  >
                    {meta.description}
                  </p>
                )}
              </div>
            </motion.a>
          )
        )}
      </AnimatePresence>
    </div>
  );
};
