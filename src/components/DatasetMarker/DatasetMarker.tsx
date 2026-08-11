import { SpriteNode, type SpriteNodeProps } from '../GlobeScene/SpriteNode';

type DatasetMarkerProps = Omit<SpriteNodeProps, 'label' | 'isCluster'>;

/**
 * A single dataset location: glowing blue dot with a bright core, no
 * baked label (the title appears in the details card on click).
 */
export function DatasetMarker(props: DatasetMarkerProps) {
  return <SpriteNode {...props} label="" isCluster={false} />;
}
