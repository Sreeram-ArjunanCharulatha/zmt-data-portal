/**
 * Domain types.
 *
 * One `DatasetLocation` is exactly one deposited dataset in a public
 * repository — not an aggregate. That is deliberate: a cluster of 15
 * markers therefore holds 15 datasets, and opening it lists those 15.
 */

export type Repository =
  | 'PANGAEA'
  | 'Dryad'
  | 'Zenodo'
  | 'figshare'
  | 'ENA'
  | 'GenBank'
  | 'NCBI'
  | 'OSF'
  | 'GitHub'
  | 'Harvard Dataverse';

export type Region =
  | 'Africa'
  | 'Europe'
  | 'Asia'
  | 'North America'
  | 'South America'
  | 'Oceania'
  | 'Polar'
  | 'Global Ocean';

export type DatasetLocation = {
  id: string;
  title: string;
  latitude: number;
  longitude: number;
  /** Repository the dataset is deposited in. */
  repository: Repository;
  /** DOI or repository accession. */
  accession: string;
  /** Landing page in the source repository. */
  url: string;
  country: string;
  region: Region;
  /** Kind of measurement, e.g. "Time series", "Genomic". */
  dataType: string;
  format: string[];
  license: string;
  /** Temporal coverage of the observations. */
  startDate: string;
  endDate: string;
  /** When the deposit was published. */
  publishedDate: string;
  description: string;
  keywords: string[];
  /** Human-readable size, e.g. "2.4 GB". */
  size: string;
  files: number;
  citations: number;
  type: DatasetType;
};

export type DatasetType = 'Dataset' | 'Keyword' | 'Event';

export type SearchTab = 'all' | 'dataset' | 'keyword' | 'event';

export type ViewMode = 'globe' | 'list';

export type FilterKey =
  | 'repositories'
  | 'regions'
  | 'countries'
  | 'dataTypes'
  | 'formats'
  | 'licenses';

export type DatasetFilters = {
  query: string;
  tab: SearchTab;
  repositories: string[];
  regions: string[];
  countries: string[];
  dataTypes: string[];
  formats: string[];
  licenses: string[];
  yearFrom: number;
  yearTo: number;
};

export type FacetCount = {
  value: string;
  count: number;
};

/** A screen-independent point produced by the clustering pass. */
export type ClusterNode = {
  id: string;
  latitude: number;
  longitude: number;
  /** Datasets represented by this node — equals `members.length`. */
  datasetCount: number;
  members: DatasetLocation[];
  isCluster: boolean;
  /** Present only for single-dataset nodes. */
  location?: DatasetLocation;
};

export type ClusterTier = 'xs' | 'sm' | 'md' | 'lg';
