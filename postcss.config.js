import autoprefixer from 'autoprefixer';
import tailwindcss from 'tailwindcss';

/**
 * Keep Tailwind's static rem type utilities on the independent text scale.
 * Geometry is deliberately untouched: only font-size declarations are
 * rewritten, after Tailwind expands utilities and before prefixes are added.
 */
const scaleRemTypography = {
  postcssPlugin: 'scale-rem-typography',
  Declaration(declaration) {
    if (declaration.prop !== 'font-size') return;
    if (!/^\d*\.?\d+rem$/.test(declaration.value)) return;
    declaration.value = `calc(${declaration.value} * var(--type-base-scale, 1))`;
  },
};

export default {
  plugins: [tailwindcss(), scaleRemTypography, autoprefixer()],
};
