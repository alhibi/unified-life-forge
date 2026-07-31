/**
 * The shape every generated registry conforms to.
 *
 * Kept in its own module so the four generated files can import a type without
 * importing each other, and so `icons.tsx` can talk about "a registry" without
 * knowing which library produced it.
 */

import type { ComponentType, SVGProps } from 'react';

import type { IconName } from './names';

/**
 * The intersection of what the four libraries accept.
 *
 * Phosphor takes `weight`; lucide and hugeicons take `strokeWidth`; tabler takes
 * `stroke`. Rather than model that as a union — which would force every call site
 * to know which library is active — a registry component accepts all of them and
 * `icons.tsx` supplies only the ones the active library understands.
 */
export type IconLibraryProps = Omit<SVGProps<SVGSVGElement>, 'stroke' | 'strokeWidth'> & {
  size?: number | string;
  weight?: 'thin' | 'light' | 'regular' | 'bold' | 'fill' | 'duotone';
  // `SVGProps` types both of these as `string`, because that is what the DOM
  // attribute is. Tabler and lucide take them as React props and accept numbers,
  // so the SVG versions are omitted above rather than intersected — an
  // intersection would collapse to `string` and reject `stroke={1.25}`.
  strokeWidth?: number | string;
  stroke?: number | string;
};

export type IconLibraryComponent = ComponentType<IconLibraryProps>;

/**
 * Partial because a library may genuinely lack a glyph. `icons.tsx` falls back to
 * the default set for those, and the generator prints which ones so the gap is a
 * known number rather than an invisible substitution.
 */
export type IconRegistry = Partial<Record<IconName, IconLibraryComponent>>;
