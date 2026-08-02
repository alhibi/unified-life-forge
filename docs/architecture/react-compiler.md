# React Compiler Evaluation

## Status (August 2026)
React Compiler (React Forget) reached stable 1.0 in October 2025. It automates compilation-level memoization of component subtrees and hooks (replacing manual `useMemo` and `useCallback` optimization).

---

## Evaluation & Decision

For amv.life, we have evaluated the React Compiler and consciously decided to **defer/postpone** its runtime activation in the production branch.

### Core Reasons for Postponement:
1. **Multi-Platform Targeting (Capacitor WKWebView):**
   - Our support floor is Safari 16.4+ (required for Capacitor iOS/WKWebView).
   - Automated memoization introduces runtime constructs that need careful memory and CPU profiling on older iOS/Android webviews. Manual memoization remains 100% stable and fully predictable on these platforms.
2. **Explicit Performance Control (Core Web Vitals):**
   - Our strict Interaction to Next Paint (INP) target is **INP ≤ 200ms**.
   - With manual memoization in place (such as in `VirtualMessageList` and heavy weather charts), our INP remains extremely low.
   - Deferring automated compilation ensures we have exact, granular visibility into rendering bottlenecks without magic compiler-level changes interfering.
3. **Transition Safe-guards:**
   - React 19.x is newly integrated in this PR. Activating both React 19 and the React Compiler simultaneously increases the surface area of potential regressions during e2e testing.

---

## Recommendation for Future Phases
We recommend evaluating React Compiler on a separate staging branch once React 19 has been running in production for at least 30 days. We should benchmark exact INP metrics using Lighthouse CI on the Slow 4G profile before committing to a permanent activation.
