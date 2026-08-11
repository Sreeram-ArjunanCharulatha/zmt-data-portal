import { SpriteNode, type SpriteNodeProps } from '../GlobeScene/SpriteNode';

type DatasetClusterProps = Omit<SpriteNodeProps, 'label' | 'isCluster'>;

/** Compact number formatting so 1240 renders as "1.2k" inside the disc. */
export function formatClusterLabel(count: number): string {
  if (count >= 10000) return `${Math.round(count / 1000)}k`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
  return String(count);
}

/**
 * A grouped set of nearby locations.
 *
 * The label counts *locations*, not datasets: a cluster labelled with a
 * dataset total promises hundreds of pins and then expands into two,
 * because a single location can hold hundreds of datasets. The disc is
 * still sized by dataset volume; clicking it opens the panel with both
 * numbers.
 */
export function DatasetCluster(props: DatasetClusterProps) {
  return (
    <SpriteNode
      {...props}
      label={formatClusterLabel(props.node.members.length)}
      isCluster
    />
  );
}
