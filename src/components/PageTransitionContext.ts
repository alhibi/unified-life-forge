import { createContext } from 'react';

import type { NavMode } from '@/lib/motion';

/** Context that delivers the current navigation mode to PageTransition */
export const NavModeContext = createContext<NavMode>('initial');
