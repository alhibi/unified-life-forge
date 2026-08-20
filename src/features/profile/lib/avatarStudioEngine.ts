/**
 * Modern Identity Studio Engine (استوديو الهوية العصري)
 * High-fidelity, offline vector SVG avatar generation engine.
 * Generates crisp, modern, scalable SVG Data URIs with custom palettes,
 * archetypes, abstract meshes, calligraphic monogram seals, frames & textures.
 */

export type AvatarCategory = 'archetype' | 'abstract' | 'monogram' | 'pattern';

export interface GradientOption {
  id: string;
  labelAr: string;
  colors: [string, string, ...string[]];
  type: 'linear' | 'radial' | 'conic';
  angle?: number;
}

export interface FrameOption {
  id: string;
  labelAr: string;
  strokeColor?: string;
  strokeWidth?: number;
  dashArray?: string;
}

export interface TextureOption {
  id: string;
  labelAr: string;
  opacity: number;
}

export interface ArchetypeOption {
  id: string;
  labelAr: string;
  titleAr: string;
  descriptionAr: string;
  category: 'scholar' | 'technologist' | 'creator' | 'leader';
}

export interface AbstractOption {
  id: string;
  labelAr: string;
  style: 'mesh' | 'fluid' | 'geometric' | 'bauhaus';
}

export interface MonogramSealOption {
  id: string;
  labelAr: string;
  shape: 'squircle' | 'hexagon' | 'octagon' | 'circle' | 'shield';
}

export interface PatternOption {
  id: string;
  labelAr: string;
}

export interface AvatarStudioParams {
  category: AvatarCategory;
  presetId: string;
  gradientId: string;
  frameId: string;
  textureId: string;
  monogramChar?: string;
  primaryColor?: string;
  secondaryColor?: string;
  accentGlow?: boolean;
}

// 1. Luxury Background Palettes (16 Gradients)
export const STUDIO_GRADIENTS: GradientOption[] = [
  { id: 'midnight-oled', labelAr: 'أوليد داهام', colors: ['#0A0A0C', '#1A1A24', '#0F0F17'], type: 'radial' },
  { id: 'champagne-gold', labelAr: 'ذهب شامباني', colors: ['#2A241A', '#524328', '#A88D56'], type: 'linear', angle: 135 },
  { id: 'cyberpunk-violet', labelAr: 'سليكون بنفسجي', colors: ['#120B29', '#2E1065', '#7C3AED'], type: 'linear', angle: 135 },
  { id: 'emerald-deep', labelAr: 'زمرد فاخر', colors: ['#042F2E', '#065F46', '#10B981'], type: 'linear', angle: 145 },
  { id: 'crimson-ember', labelAr: 'ياقوت متوهج', colors: ['#450A0A', '#881337', '#E11D48'], type: 'linear', angle: 120 },
  { id: 'titanium-slate', labelAr: 'تيتانيوم صلب', colors: ['#0F172A', '#334155', '#64748B'], type: 'linear', angle: 135 },
  { id: 'royal-velvet', labelAr: 'مخمل ملكي', colors: ['#1E1B4B', '#312E81', '#4C1D95'], type: 'radial' },
  { id: 'deep-ocean', labelAr: 'محيط عميق', colors: ['#030712', '#0C4A6E', '#0284C7'], type: 'linear', angle: 150 },
  { id: 'terracotta-earth', labelAr: 'طين الصحراء', colors: ['#2A1810', '#7C2D12', '#EA580C'], type: 'linear', angle: 135 },
  { id: 'solar-flare', labelAr: 'وهج شمسي', colors: ['#3A1500', '#9A3412', '#F97316'], type: 'radial' },
  { id: 'cobalt-steel', labelAr: 'فولاذ كوبالت', colors: ['#172554', '#1E40AF', '#3B82F6'], type: 'linear', angle: 135 },
  { id: 'velvet-rose', labelAr: 'ورد مخملي', colors: ['#3B0764', '#701A75', '#DB2777'], type: 'linear', angle: 135 },
  { id: 'royal-jade', labelAr: 'يشم أميري', colors: ['#022C22', '#064E3B', '#059669'], type: 'linear', angle: 120 },
  { id: 'nordic-frost', labelAr: 'جليد شمالي', colors: ['#082F49', '#164E63', '#06B6D4'], type: 'radial' },
  { id: 'monochrome-dark', labelAr: 'أحادية سوداء', colors: ['#18181B', '#27272A', '#3F3F46'], type: 'linear', angle: 135 },
  { id: 'prism-aura', labelAr: 'طيّف المنسج', colors: ['#1E1035', '#3B0764', '#1D4ED8'], type: 'linear', angle: 160 },
];

// 2. Outer Luxury Frames (8 Border Styles)
export const STUDIO_FRAMES: FrameOption[] = [
  { id: 'glass-ring', labelAr: 'حلقة بلورية', strokeColor: 'rgba(255,255,255,0.25)', strokeWidth: 2.5 },
  { id: 'gold-hex', labelAr: 'إطار ذهبي سداسي', strokeColor: '#D4AF37', strokeWidth: 3 },
  { id: 'octagonal-halo', labelAr: 'هالة ثمانية', strokeColor: 'rgba(228,91,96,0.8)', strokeWidth: 2.5 },
  { id: 'dual-orbit', labelAr: 'مدار مزدوج', strokeColor: 'rgba(255,255,255,0.4)', strokeWidth: 1.5, dashArray: '6,4' },
  { id: 'neon-cyber', labelAr: 'إطار سيبراني', strokeColor: '#38BDF8', strokeWidth: 3 },
  { id: 'kinetic-ring', labelAr: 'حلقة حركية', strokeColor: '#A855F7', strokeWidth: 2, dashArray: '12,6,3,6' },
  { id: 'stamp-scallop', labelAr: 'ختم طوابع', strokeColor: '#F59E0B', strokeWidth: 2 },
  { id: 'minimal-flush', labelAr: 'بدون إطار (صافي)', strokeColor: 'transparent', strokeWidth: 0 },
];

// 3. Texture & Lighting Overlays (5 Options)
export const STUDIO_TEXTURES: TextureOption[] = [
  { id: 'svg-noise', labelAr: 'ملمس ناعم (Noise)', opacity: 0.15 },
  { id: 'radial-spotlight', labelAr: 'إضاءة بؤرية', opacity: 0.35 },
  { id: 'mesh-glow', labelAr: 'توهج متدرج', opacity: 0.25 },
  { id: 'holographic-prism', labelAr: 'منشور هولوجرافي', opacity: 0.2 },
  { id: 'clean-none', labelAr: 'بدون مؤثرات', opacity: 0 },
];

// 4. Modern Archetype Characters (16 Vector Archetypes)
export const STUDIO_ARCHETYPES: ArchetypeOption[] = [
  { id: 'arch-scholar', labelAr: 'المفكر العلمي', titleAr: 'باحث الفكر', descriptionAr: 'شخصية قيادية متزنة تهتم بالبحث والمعرفة العميقة', category: 'scholar' },
  { id: 'arch-nomad', labelAr: 'الرحالة الرقمي', titleAr: 'مستكشف الآفاق', descriptionAr: 'شخصية مرنة تعشق السفر والحلول التقنية المبتكرة', category: 'technologist' },
  { id: 'arch-alchemist', labelAr: 'الخيميائي الرقمي', titleAr: 'صانع الأفكار', descriptionAr: 'ابتكار الحلول المعقدة وتحويل البيانات إلى معرفة', category: 'creator' },
  { id: 'arch-architect', labelAr: 'مهندس النظم', titleAr: 'معماري الرؤية', descriptionAr: 'بناء الأنظمة القوية والتخطيط طويل المدى', category: 'technologist' },
  { id: 'arch-sovereign', labelAr: 'السيادي الملكي', titleAr: 'حارس القيمة', descriptionAr: 'أصالة وحضور رصين بلمسة فخامة Quiet Luxury', category: 'leader' },
  { id: 'arch-philosopher', labelAr: 'فيزيائي الفلسفة', titleAr: 'تأمل المبادئ', descriptionAr: 'عمق الرؤية والتفكير المستمر في النظم والأفكار', category: 'scholar' },
  { id: 'arch-pioneer', labelAr: 'رواد المستقبل', titleAr: 'رائد الابتكار', descriptionAr: 'سباق في استكشاف التقنيات والمفاهيم الحديثة', category: 'creator' },
  { id: 'arch-sentinel', labelAr: 'الحارس الحصين', titleAr: 'حامي البيانات', descriptionAr: 'الأمان، الخصوصية والموثوقية العالية', category: 'leader' },
  { id: 'arch-artisan', labelAr: 'المصمم الفنان', titleAr: 'مهندس الجمال', descriptionAr: 'الدقة المتناهية والتناغم البصري الهندسي', category: 'creator' },
  { id: 'arch-astral', labelAr: 'المستكشف الفلكي', titleAr: 'ملاح النجوم', descriptionAr: 'شغف بالكون والعلوم الدقيقة والرياضيات', category: 'scholar' },
  { id: 'arch-quantum', labelAr: 'المهندس الكمومي', titleAr: 'مُعالج الخوارزميات', descriptionAr: 'تفكير متقدم في الذكاء الاصطناعي والمستقبل', category: 'technologist' },
  { id: 'arch-zenith', labelAr: 'القمة الحكيمة', titleAr: 'قائد التوازنات', descriptionAr: 'هدوء وثبات واستراتيجية عالية', category: 'leader' },
  { id: 'arch-eclipse', labelAr: 'الاستراتيجي الليلي', titleAr: 'مخطط الظلال', descriptionAr: 'تركيز فائق وهدوء يعمل بعيداً عن الضوضاء', category: 'leader' },
  { id: 'arch-prism', labelAr: 'محلل الأطياف', titleAr: 'صانع التعددية', descriptionAr: 'رؤية متعددة الأبعاد وفهم عميق للسياقات', category: 'creator' },
  { id: 'arch-catalyst', labelAr: 'المُحفّز التفاعلي', titleAr: 'محرك التغيير', descriptionAr: 'طاقة إيجابية ودافع قوي للإنجاز والتقدم', category: 'technologist' },
  { id: 'arch-horizon', labelAr: 'رائد الأفق', titleAr: 'مبحر الغد', descriptionAr: 'رؤية بصرية واضحة ومستقبلية', category: 'scholar' },
];

// 5. Abstract & Mesh Flow Options (12 Options)
export const STUDIO_ABSTRACTS: AbstractOption[] = [
  { id: 'abs-mesh-3d', labelAr: 'شبكة أبعاد ثلاثية', style: 'mesh' },
  { id: 'abs-fluid-gold', labelAr: 'تدفق ذهبي سيّال', style: 'fluid' },
  { id: 'abs-bauhaus-grid', labelAr: 'شبكة باوهاوس العصرية', style: 'bauhaus' },
  { id: 'abs-zen-rings', labelAr: 'دوائر الزين المتداخلة', style: 'geometric' },
  { id: 'abs-orbital-core', labelAr: 'نواة مدارية ذات أبعاد', style: 'geometric' },
  { id: 'abs-topography', labelAr: 'خريطة طبوغرافية سيبرانية', style: 'fluid' },
  { id: 'abs-quantum-wave', labelAr: 'موجات كمومية متقاطعة', style: 'mesh' },
  { id: 'abs-prism-shards', labelAr: 'شظايا المنشور الضوئي', style: 'bauhaus' },
  { id: 'abs-sacred-geo', labelAr: 'هندسة فركتالية ناعمة', style: 'geometric' },
  { id: 'abs-liquid-slate', labelAr: 'سائل تيتانيوم مصقول', style: 'fluid' },
  { id: 'abs-matrix-lattice', labelAr: 'نسيج بلوري متشابك', style: 'mesh' },
  { id: 'abs-nebula-vortex', labelAr: 'دوامة سديمية عميقة', style: 'fluid' },
];

// 6. Monogram Seals Options (8 Geometries)
export const STUDIO_SEALS: MonogramSealOption[] = [
  { id: 'seal-squircle-gold', labelAr: 'ختم مربع منحني (Squircle)', shape: 'squircle' },
  { id: 'seal-hexagon-royal', labelAr: 'ختم ملكي سداسي (Hexagon)', shape: 'hexagon' },
  { id: 'seal-octagon-cyber', labelAr: 'ختم ثماني الأضلاع (Octagon)', shape: 'octagon' },
  { id: 'seal-circle-zen', labelAr: 'ختم دائر دقيق (Circle)', shape: 'circle' },
  { id: 'seal-shield-hero', labelAr: 'ختم الدرع السيادي (Shield)', shape: 'shield' },
  { id: 'seal-double-ring', labelAr: 'ختم الحلقة المزدوجة', shape: 'circle' },
  { id: 'seal-scallop-ticket', labelAr: 'ختم التذكرة العتيقة', shape: 'squircle' },
  { id: 'seal-minimal-square', labelAr: 'ختم الهندسة الخالصة', shape: 'squircle' },
];

// Default studio parameter builder
export const DEFAULT_STUDIO_PARAMS: AvatarStudioParams = {
  category: 'archetype',
  presetId: 'arch-scholar',
  gradientId: 'midnight-oled',
  frameId: 'glass-ring',
  textureId: 'svg-noise',
  monogramChar: 'م',
  primaryColor: '#E45B60',
  secondaryColor: '#38BDF8',
  accentGlow: true,
};

// Helper: Get background gradient defs
function buildGradientDefs(gradientId: string, primaryOverride?: string, secondaryOverride?: string) {
  const g = STUDIO_GRADIENTS.find((opt) => opt.id === gradientId) || STUDIO_GRADIENTS[0];
  const c1 = primaryOverride || g.colors[0];
  const c2 = g.colors[1] || '#1E1B4B';
  const c3 = secondaryOverride || g.colors[2] || g.colors[1] || '#7C3AED';

  if (g.type === 'radial') {
    return `
      <radialGradient id="bgG" cx="50%" cy="40%" r="65%">
        <stop offset="0%" stop-color="${c3}" />
        <stop offset="50%" stop-color="${c2}" />
        <stop offset="100%" stop-color="${c1}" />
      </radialGradient>
    `;
  }

  const angle = g.angle || 135;
  const rad = (angle * Math.PI) / 180;
  const x1 = Math.round(50 - Math.cos(rad) * 50);
  const y1 = Math.round(50 - Math.sin(rad) * 50);
  const x2 = Math.round(50 + Math.cos(rad) * 50);
  const y2 = Math.round(50 + Math.sin(rad) * 50);

  return `
    <linearGradient id="bgG" x1="${x1}%" y1="${y1}%" x2="${x2}%" y2="${y2}%">
      <stop offset="0%" stop-color="${c1}" />
      <stop offset="50%" stop-color="${c2}" />
      <stop offset="100%" stop-color="${c3}" />
    </linearGradient>
  `;
}

// Helper: Build SVG noise filter & glows
function buildFilterDefs() {
  return `
    <filter id="noiseFilter" x="0%" y="0%" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" stitchTiles="stitch" result="noise" />
      <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.12 0" />
      <feBlend mode="overlay" in="SourceGraphic" in2="noise" />
    </filter>
    <filter id="glowEffect" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="6" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
    <linearGradient id="goldMetallic" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFE259" />
      <stop offset="100%" stop-color="#FFA751" />
    </linearGradient>
    <linearGradient id="cyberCyan" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#38BDF8" />
      <stop offset="100%" stop-color="#818CF8" />
    </linearGradient>
    <linearGradient id="crimsonGlow" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#E45B60" />
      <stop offset="100%" stop-color="#991B1B" />
    </linearGradient>
  `;
}

// Helper: Vector Archetypes SVG Paths
function renderArchetypeVector(presetId: string, primary: string, secondary: string) {
  switch (presetId) {
    case 'arch-scholar':
      return `
        <circle cx="128" cy="112" r="42" fill="url(#cyberCyan)" opacity="0.15" />
        <path d="M96 172 C96 138, 160 138, 160 172 C160 186, 96 186, 96 172 Z" fill="${primary}" opacity="0.85" />
        <circle cx="128" cy="108" r="28" fill="#F8FAFC" opacity="0.95" />
        <circle cx="116" cy="106" r="9" fill="none" stroke="${primary}" stroke-width="2.5" />
        <circle cx="140" cy="106" r="9" fill="none" stroke="${primary}" stroke-width="2.5" />
        <line x1="125" y1="106" x2="131" y2="106" stroke="${primary}" stroke-width="2" />
        <path d="M92 108 A 38 38 0 0 1 164 108" fill="none" stroke="url(#goldMetallic)" stroke-width="2" stroke-dasharray="4,4" />
        <circle cx="128" cy="62" r="4" fill="${secondary}" />
      `;

    case 'arch-nomad':
      return `
        <path d="M88 180 C88 142, 168 142, 168 180" fill="url(#cyberCyan)" opacity="0.2" />
        <circle cx="128" cy="110" r="30" fill="#1E293B" stroke="${secondary}" stroke-width="2" />
        <path d="M100 106 Q128 98 156 106 L152 116 Q128 110 104 116 Z" fill="${primary}" filter="url(#glowEffect)" />
        <line x1="100" y1="106" x2="86" y2="114" stroke="${secondary}" stroke-width="2" />
        <line x1="156" y1="106" x2="170" y2="114" stroke="${secondary}" stroke-width="2" />
        <circle cx="86" cy="114" r="3.5" fill="${secondary}" />
        <circle cx="170" cy="114" r="3.5" fill="${secondary}" />
      `;

    case 'arch-alchemist':
      return `
        <polygon points="128,52 168,122 88,122" fill="none" stroke="url(#goldMetallic)" stroke-width="2" />
        <polygon points="128,158 168,88 88,88" fill="none" stroke="${secondary}" stroke-width="1.5" opacity="0.6" />
        <circle cx="128" cy="105" r="18" fill="${primary}" opacity="0.85" filter="url(#glowEffect)" />
        <circle cx="128" cy="105" r="8" fill="#FFFFFF" />
        <circle cx="100" cy="72" r="3" fill="#FFE259" />
        <circle cx="156" cy="72" r="3" fill="#FFE259" />
        <path d="M104 162 Q128 174 152 162" fill="none" stroke="${primary}" stroke-width="2" stroke-linecap="round" />
      `;

    case 'arch-sovereign':
      return `
        <path d="M96 176 C96 136, 160 136, 160 176" fill="url(#goldMetallic)" opacity="0.25" />
        <circle cx="128" cy="112" r="28" fill="#0F172A" stroke="url(#goldMetallic)" stroke-width="2" />
        <path d="M106 88 L114 98 L128 84 L142 98 L150 88 L148 104 L108 104 Z" fill="url(#goldMetallic)" />
        <circle cx="128" cy="80" r="3" fill="#E45B60" />
        <circle cx="106" cy="84" r="2" fill="#38BDF8" />
        <circle cx="150" cy="84" r="2" fill="#38BDF8" />
      `;

    case 'arch-architect':
      return `
        <g transform="translate(128, 108)">
          <polygon points="0,-32 28,-16 0,0 -28,-16" fill="${secondary}" opacity="0.9" />
          <polygon points="-28,-16 0,0 0,32 -28,16" fill="${primary}" opacity="0.8" />
          <polygon points="0,0 28,-16 28,16 0,32" fill="url(#goldMetallic)" opacity="0.95" />
        </g>
        <path d="M84 170 L172 170" stroke="${secondary}" stroke-width="3" stroke-linecap="round" />
        <path d="M98 180 L158 180" stroke="${primary}" stroke-width="2" stroke-linecap="round" />
      `;

    case 'arch-sentinel':
      return `
        <path d="M128 60 L168 80 V120 C168 152 128 172 128 172 C128 172 88 152 88 120 V80 Z"
              fill="none" stroke="${primary}" stroke-width="3" filter="url(#glowEffect)" />
        <path d="M102 96 L154 96 L144 118 L112 118 Z" fill="url(#cyberCyan)" />
        <circle cx="128" cy="107" r="4" fill="#FFFFFF" />
      `;

    case 'arch-astral':
      return `
        <circle cx="128" cy="108" r="42" fill="none" stroke="url(#cyberCyan)" stroke-width="1.5" stroke-dasharray="8,4" />
        <ellipse cx="128" cy="108" rx="54" ry="18" fill="none" stroke="${primary}" stroke-width="2" transform="rotate(-25, 128, 108)" />
        <circle cx="128" cy="108" r="16" fill="${secondary}" filter="url(#glowEffect)" />
        <circle cx="82" cy="92" r="4" fill="#FFE259" />
        <circle cx="174" cy="124" r="5" fill="${primary}" />
      `;

    default:
      return `
        <circle cx="128" cy="108" r="32" fill="#0F172A" stroke="${primary}" stroke-width="2.5" />
        <path d="M92 176 Q128 140 164 176" fill="none" stroke="${secondary}" stroke-width="3" stroke-linecap="round" />
        <polygon points="128,94 138,108 128,122 118,108" fill="${primary}" filter="url(#glowEffect)" />
        <circle cx="128" cy="108" r="3" fill="#FFFFFF" />
        <line x1="128" y1="64" x2="128" y2="72" stroke="url(#goldMetallic)" stroke-width="2.5" stroke-linecap="round" />
        <line x1="96" y1="76" x2="102" y2="82" stroke="url(#goldMetallic)" stroke-width="2" stroke-linecap="round" />
        <line x1="160" y1="76" x2="154" y2="82" stroke="url(#goldMetallic)" stroke-width="2" stroke-linecap="round" />
      `;
  }
}

// Helper: Abstract Geometry Vector SVG
function renderAbstractVector(presetId: string, primary: string, secondary: string) {
  switch (presetId) {
    case 'abs-mesh-3d':
      return `
        <g stroke="${primary}" stroke-width="1.5" fill="none" opacity="0.85">
          <path d="M64,64 Q128,20 192,64 T128,192 Z" />
          <path d="M64,192 Q128,236 192,192 T128,64 Z" stroke="${secondary}" />
          <circle cx="128" cy="128" r="36" fill="url(#cyberCyan)" opacity="0.3" filter="url(#glowEffect)" />
          <circle cx="128" cy="128" r="12" fill="${primary}" />
        </g>
      `;

    case 'abs-fluid-gold':
      return `
        <path d="M60 100 C80 40, 180 50, 196 110 C212 170, 120 210, 70 170 C20 130, 40 160, 60 100 Z"
              fill="url(#goldMetallic)" opacity="0.85" filter="url(#glowEffect)" />
        <path d="M90 120 C105 80, 160 90, 170 125 C180 160, 130 180, 95 155 Z"
              fill="${primary}" opacity="0.6" />
      `;

    case 'abs-bauhaus-grid':
      return `
        <rect x="64" y="64" width="60" height="60" rx="8" fill="${primary}" opacity="0.9" />
        <circle cx="160" cy="94" r="30" fill="url(#goldMetallic)" />
        <polygon points="64,192 124,136 124,192" fill="${secondary}" />
        <rect x="136" y="136" width="56" height="56" rx="28" fill="none" stroke="#FFFFFF" stroke-width="3" />
      `;

    case 'abs-zen-rings':
      return `
        <circle cx="128" cy="128" r="70" fill="none" stroke="${primary}" stroke-width="2" opacity="0.4" />
        <circle cx="128" cy="128" r="52" fill="none" stroke="url(#goldMetallic)" stroke-width="2.5" />
        <circle cx="128" cy="128" r="34" fill="none" stroke="${secondary}" stroke-width="3" />
        <circle cx="128" cy="128" r="16" fill="${primary}" filter="url(#glowEffect)" />
      `;

    default:
      return `
        <path d="M40 90 Q80 130 128 90 T216 90" fill="none" stroke="${primary}" stroke-width="2.5" />
        <path d="M40 120 Q80 160 128 120 T216 120" fill="none" stroke="${secondary}" stroke-width="2" />
        <path d="M40 150 Q80 190 128 150 T216 150" fill="none" stroke="url(#goldMetallic)" stroke-width="2.5" />
        <circle cx="128" cy="120" r="18" fill="${primary}" filter="url(#glowEffect)" opacity="0.8" />
      `;
  }
}

// Helper: Monogram Seal Vector SVG Generator
function renderMonogramSealVector(
  char: string,
  sealStyle: string,
  primary: string,
  secondary: string
) {
  const safeChar = (char && char.trim()) ? char.trim().charAt(0) : 'م';

  let shapePath = '';
  if (sealStyle.includes('hexagon')) {
    shapePath = '<polygon points="128,40 200,80 200,176 128,216 56,176 56,80" fill="none" stroke="url(#goldMetallic)" stroke-width="3" />';
  } else if (sealStyle.includes('octagon')) {
    shapePath = '<polygon points="88,44 168,44 212,88 212,168 168,212 88,212 44,168 44,88" fill="none" stroke="${secondary}" stroke-width="3" />';
  } else if (sealStyle.includes('shield')) {
    shapePath = '<path d="M128 44 L196 68 V136 C196 178 128 212 128 212 C128 212 60 178 60 136 V68 Z" fill="none" stroke="${primary}" stroke-width="3" />';
  } else {
    shapePath = `
      <rect x="52" y="52" width="152" height="152" rx="44" fill="rgba(255,255,255,0.05)" stroke="url(#goldMetallic)" stroke-width="2.5" />
      <rect x="62" y="62" width="132" height="132" rx="36" fill="none" stroke="${primary}" stroke-width="1.5" stroke-dasharray="6,4" />
    `;
  }

  return `
    ${shapePath}
    <text x="128" y="144"
          font-family="'Inter', 'IBM Plex Sans Arabic', system-ui, -apple-system, sans-serif"
          font-size="68"
          font-weight="900"
          fill="url(#goldMetallic)"
          text-anchor="middle"
          dominant-baseline="central"
          filter="url(#glowEffect)">
      ${safeChar}
    </text>
    <circle cx="128" cy="62" r="3" fill="${secondary}" />
    <circle cx="128" cy="194" r="3" fill="${secondary}" />
  `;
}

// Helper: Vector Pattern SVG
function renderPatternVector(primary: string, secondary: string) {
  return `
    <g opacity="0.65">
      <path d="M40 40 L216 216 M216 40 L40 216" stroke="${primary}" stroke-width="2" />
      <circle cx="128" cy="128" r="60" fill="none" stroke="${secondary}" stroke-width="2" />
      <rect x="88" y="88" width="80" height="80" fill="none" stroke="url(#goldMetallic)" stroke-width="2" transform="rotate(45, 128, 128)" />
      <circle cx="128" cy="128" r="14" fill="${primary}" filter="url(#glowEffect)" />
    </g>
  `;
}

// Helper: Outer Frame Border SVG
function renderFrameBorder(frameId: string, primaryColor: string) {
  const f = STUDIO_FRAMES.find((opt) => opt.id === frameId) || STUDIO_FRAMES[0];
  if (f.strokeWidth === 0) return '';

  const stroke = f.strokeColor || primaryColor;
  const strokeW = f.strokeWidth || 2;
  const dash = f.dashArray ? `stroke-dasharray="${f.dashArray}"` : '';

  if (frameId.includes('hex')) {
    return `<polygon points="128,8 238,72 238,184 128,248 18,184 18,72" fill="none" stroke="${stroke}" stroke-width="${strokeW}" ${dash} />`;
  }

  if (frameId.includes('octagonal')) {
    return `<polygon points="80,10 176,10 246,80 246,176 176,246 80,246 10,176 10,80" fill="none" stroke="${stroke}" stroke-width="${strokeW}" ${dash} />`;
  }

  if (frameId.includes('stamp')) {
    return `
      <rect x="12" y="12" width="232" height="232" rx="20" fill="none" stroke="${stroke}" stroke-width="${strokeW}" />
      <circle cx="128" cy="12" r="8" fill="#0A0A0C" />
      <circle cx="128" cy="244" r="8" fill="#0A0A0C" />
      <circle cx="12" cy="128" r="8" fill="#0A0A0C" />
      <circle cx="244" cy="128" r="8" fill="#0A0A0C" />
    `;
  }

  return `<circle cx="128" cy="128" r="120" fill="none" stroke="${stroke}" stroke-width="${strokeW}" ${dash} />`;
}

/**
 * Generates full SVG Markup string based on AvatarStudioParams
 */
export function generateAvatarSvg(params: Partial<AvatarStudioParams> = {}): string {
  const merged: AvatarStudioParams = { ...DEFAULT_STUDIO_PARAMS, ...params };
  const primary = merged.primaryColor || '#E45B60';
  const secondary = merged.secondaryColor || '#38BDF8';

  const gradientDefs = buildGradientDefs(merged.gradientId, primary, secondary);
  const filterDefs = buildFilterDefs();

  let bodyContent = '';
  if (merged.category === 'archetype') {
    bodyContent = renderArchetypeVector(merged.presetId, primary, secondary);
  } else if (merged.category === 'abstract') {
    bodyContent = renderAbstractVector(merged.presetId, primary, secondary);
  } else if (merged.category === 'monogram') {
    bodyContent = renderMonogramSealVector(
      merged.monogramChar || 'م',
      merged.presetId || 'seal-squircle-gold',
      primary,
      secondary
    );
  } else {
    bodyContent = renderPatternVector(primary, secondary);
  }

  const frameContent = renderFrameBorder(merged.frameId, primary);

  const isNoise = merged.textureId === 'svg-noise';
  const noiseOverlay = isNoise
    ? `<rect width="256" height="256" fill="#000000" opacity="0.08" filter="url(#noiseFilter)" />`
    : '';

  const jsonMeta = encodeURIComponent(JSON.stringify(merged));

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256" data-studio-params="${jsonMeta}">
  <defs>
    ${gradientDefs}
    ${filterDefs}
  </defs>
  <rect width="256" height="256" fill="url(#bgG)" />
  ${noiseOverlay}
  <g id="avatarContent">
    ${bodyContent}
  </g>
  <g id="avatarFrame">
    ${frameContent}
  </g>
</svg>`.trim();
}

/**
 * Encodes SVG string into crisp, ready-to-use Data URI
 */
export function generateAvatarDataUri(params: Partial<AvatarStudioParams> = {}): string {
  const svgMarkup = generateAvatarSvg(params);
  const cleanedSvg = svgMarkup.replace(/\s+/g, ' ');
  return `data:image/svg+xml;utf8,${encodeURIComponent(cleanedSvg)}`;
}

/**
 * Parses studio params back from Data URI if present
 */
export function decodeAvatarDataUri(dataUri: string): AvatarStudioParams | null {
  if (!dataUri || !dataUri.startsWith('data:image/svg+xml')) return null;

  try {
    const decoded = decodeURIComponent(dataUri.replace('data:image/svg+xml;utf8,', ''));
    const match = decoded.match(/data-studio-params="([^"]+)"/);
    if (match && match[1]) {
      const parsed = JSON.parse(decodeURIComponent(match[1]));
      return { ...DEFAULT_STUDIO_PARAMS, ...parsed };
    }
  } catch {
    /* ignore parse errors */
  }
  return null;
}

/**
 * Type Guard checking if avatar URL is a Studio SVG Data URI
 */
export function isStudioAvatarUri(url?: string | null): boolean {
  if (!url) return false;
  return url.startsWith('data:image/svg+xml');
}
