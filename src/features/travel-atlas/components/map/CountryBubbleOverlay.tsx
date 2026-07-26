import type { Map as MapLibreMap } from 'maplibre-gl';
import { useMemo } from 'react';

import type { CountrySummary } from '../../lib/stats';
import { summaryAnchor } from '../../lib/stats';
import { useProjectedNodes } from './useProjectedNodes';

interface CountryBubbleOverlayProps {
  map: MapLibreMap | null;
  isGlobe: boolean;
  summaries: CountrySummary[];
  onSelect: (summary: CountrySummary) => void;
}

const MIN_SIZE = 40;
const MAX_SIZE = 76;

/**
 * The world view's answer to "which countries is my atlas actually about".
 *
 * Bubble AREA — not diameter — is proportional to the number of saved places, so
 * a country with four times as many places looks four times as big rather than
 * sixteen. This is a quantitative encoding, which is the one case the design
 * system allows a size ramp.
 */
export default function CountryBubbleOverlay({
  map,
  isGlobe,
  summaries,
  onSelect,
}: CountryBubbleOverlayProps) {
  const items = useMemo(
    () =>
      summaries.map((summary) => ({ id: summary.country.id, coordinates: summaryAnchor(summary) })),
    [summaries],
  );
  const registerNode = useProjectedNodes(map, items, isGlobe);
  const maxTotal = useMemo(
    () => summaries.reduce((max, summary) => Math.max(max, summary.total), 1),
    [summaries],
  );

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {summaries.map((summary) => {
        const ratio = summary.total / maxTotal;
        const size = Math.round(MIN_SIZE + (MAX_SIZE - MIN_SIZE) * Math.sqrt(ratio));

        return (
          <div
            key={summary.country.id}
            ref={(node) => registerNode(summary.country.id, node)}
            className="travel-marker-anchor"
            style={{ visibility: 'hidden' }}
          >
            <div className="travel-marker">
              <button
                type="button"
                onClick={() => onSelect(summary)}
                className="travel-cluster animate-scale-in"
                style={{ width: size, height: size }}
                aria-label={`${summary.country.nameAr}: ${summary.total} مكانًا`}
              >
                <span className="travel-cluster__count">{summary.total}</span>
              </button>
              <span className="travel-marker__label" dir="rtl">
                {summary.country.nameAr}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
