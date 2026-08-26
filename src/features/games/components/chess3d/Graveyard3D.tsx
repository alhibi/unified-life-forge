/**
 * Graveyard3D — رقدة غنائم الالتقاط على سكة الإطار المحيطة.
 * كل قطعة ترقد مصغّرة ومائلة عند جهة آسرها، بمواضع حتمية ثابتة.
 */

import { useMemo } from 'react';

import type { PieceEntity } from '@/features/games/lib/three/entities';
import type { GraveSpec } from '@/features/games/lib/three/graveyard';
import { GRAVE_SCALE, graveTransform } from '@/features/games/lib/three/graveyard';

import PieceMesh from './PieceMesh';

interface Graveyard3DProps {
  graves: (GraveSpec & { key: string; ent: PieceEntity })[];
  geoms: Map<string, import('three').BufferGeometry>;
  mats: { ivory: import('three').Material; obsidian: import('three').Material };
}

export default function Graveyard3D({ graves, geoms, mats }: Graveyard3DProps) {
  const transforms = useMemo(
    () => new Map(graves.map((g) => [g.key, graveTransform(g)])),
    [graves],
  );
  return (
    <group>
      {graves.map((g) => {
        const t = transforms.get(g.key)!;
        return (
          <group key={g.key} position={t.pos} rotation={[0, 0, t.rotZ]} scale={GRAVE_SCALE}>
            <PieceMesh
              ent={g.ent}
              geom={geoms.get(g.type)!}
              mat={g.pieceColor === 'w' ? mats.ivory : mats.obsidian}
              flight={null}
              exiting={false}
              spawnAt={null}
              selected={false}
              staticPose
            />
          </group>
        );
      })}
    </group>
  );
}
