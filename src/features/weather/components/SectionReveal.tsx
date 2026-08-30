// ============================================================================
// SectionReveal — wraps a section so its children fade-in cascade when the
// user scrolls them into view. Uses IntersectionObserver under the hood
// with a generous rootMargin so the reveal starts before the section is
// fully on-screen.
//
// WHY CUSTOM
//   framer-motion has `whileInView` but it's a thin wrapper around the same
//   IntersectionObserver. Our version exposes a few small touches that
//   matter for the weather page:
//     • staggerChildren tunable per section
//     • delayChildren offset so the cascade starts a beat AFTER the parent
//       enters, not at the exact same instant
//     • "once: true" so the reveal doesn't replay when the user scrolls
//       back up and down
//     • prefers-reduced-motion support — fires immediately, no cascade
// ============================================================================

import { motion, useReducedMotion } from 'framer-motion';
import { type ReactNode } from 'react';

import { cascadeChild, cascadeParent } from '../lib/weather-motion';

interface SectionRevealProps {
  children: ReactNode;
  /** className on the wrapping <section>. */
  className?: string;
  /** Override stagger (seconds between children). Default 0.06. */
  stagger?: number;
  /** Override initial delay (seconds before first child). Default 0.05. */
  initialDelay?: number;
  /** Tells the IntersectionObserver how early to trigger. Default "0px 0px -10% 0px". */
  margin?: string;
  /** Render as <article> instead of <section>. */
  as?: 'section' | 'article' | 'div';
}

export function SectionReveal({
  children,
  className,
  stagger = 0.06,
  initialDelay = 0.05,
  margin = '0px 0px -10% 0px',
  as = 'section',
}: SectionRevealProps) {
  const reduced = useReducedMotion();
  const variants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: stagger,
        delayChildren: initialDelay,
      },
    },
  };

  const Component = as === 'article' ? motion.article : as === 'div' ? motion.div : motion.section;

  if (reduced) {
    // Skip the cascade — render the children directly so the user sees them
    // without any animation. Reduces motion = "respect the user".
    const Plain = as === 'article' ? 'article' : as === 'div' ? 'div' : 'section';
    return <Plain className={className}>{children}</Plain>;
  }

  return (
    <Component
      className={className}
      variants={variants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin }}
    >
      {Array.isArray(children) ? (
        children.map((child, i) => (
          <motion.div key={i} variants={cascadeChild}>
            {child}
          </motion.div>
        ))
      ) : (
        <motion.div variants={cascadeChild}>{children}</motion.div>
      )}
    </Component>
  );
}