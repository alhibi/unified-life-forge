import React, { Suspense } from 'react';
import { FitnessErrorBoundary } from './ui/components/FitnessErrorBoundary';
import { FitnessDashboardSkeleton } from './ui/components/FitnessDashboardSkeleton';
import { FitnessDashboardPage } from './ui/pages/FitnessDashboardPage';
export function FitnessFeature() {
  return (
    <FitnessErrorBoundary>
      <Suspense fallback={<FitnessDashboardSkeleton />}>
        <FitnessDashboardPage />
      </Suspense>
    </FitnessErrorBoundary>
  );
}
export { useFitnessEngine } from './model/useFitnessEngine';
