import { useMemo } from 'react';
import type {
  DatasetFilters,
  DatasetLocation,
  FacetCount,
  SearchTab,
} from '../types/dataset';

/* ------------------------------------------------------------------ *
 * Pure client-side filtering + faceting.
 *
 * Facet counts are computed with every *other* filter applied but the
 * facet's own selection ignored, which is the behaviour users expect
 * from a faceted search: ticking one repository does not zero out the
 * remaining repositories.
 * ------------------------------------------------------------------ */

export type Facets = {
  repositories: FacetCount[];
  regions: FacetCount[];
  countries: FacetCount[];
  dataTypes: FacetCount[];
  formats: FacetCount[];
  licenses: FacetCount[];
};

type PredicateKey =
  | 'query'
  | 'tab'
  | 'repositories'
  | 'regions'
  | 'countries'
  | 'dataTypes'
  | 'formats'
  | 'licenses'
  | 'years';

const yearOf = (iso: string) => Number.parseInt(iso.slice(0, 4), 10);

function matchesQuery(d: DatasetLocation, query: string): boolean {
  if (!query.trim()) return true;
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  const haystack = [
    d.title,
    d.description,
    d.repository,
    d.accession,
    d.country,
    d.region,
    d.dataType,
    d.type,
    ...d.keywords,
    ...d.format,
  ]
    .join(' ')
    .toLowerCase();
  return terms.every((term) => haystack.includes(term));
}

function passes(
  d: DatasetLocation,
  filters: DatasetFilters,
  skip: PredicateKey | null,
): boolean {
  if (skip !== 'query' && !matchesQuery(d, filters.query)) return false;

  if (skip !== 'tab' && filters.tab !== 'all') {
    if (d.type.toLowerCase() !== filters.tab) return false;
  }

  if (
    skip !== 'repositories' &&
    filters.repositories.length > 0 &&
    !filters.repositories.includes(d.repository)
  ) {
    return false;
  }

  if (
    skip !== 'regions' &&
    filters.regions.length > 0 &&
    !filters.regions.includes(d.region)
  ) {
    return false;
  }

  if (
    skip !== 'countries' &&
    filters.countries.length > 0 &&
    !filters.countries.includes(d.country)
  ) {
    return false;
  }

  if (
    skip !== 'dataTypes' &&
    filters.dataTypes.length > 0 &&
    !filters.dataTypes.includes(d.dataType)
  ) {
    return false;
  }

  if (
    skip !== 'formats' &&
    filters.formats.length > 0 &&
    !d.format.some((f) => filters.formats.includes(f))
  ) {
    return false;
  }

  if (
    skip !== 'licenses' &&
    filters.licenses.length > 0 &&
    !filters.licenses.includes(d.license)
  ) {
    return false;
  }

  if (skip !== 'years') {
    /* Keep anything whose temporal coverage overlaps the range. */
    const start = yearOf(d.startDate);
    const end = yearOf(d.endDate);
    if (end < filters.yearFrom || start > filters.yearTo) return false;
  }

  return true;
}

/** Counts are dataset counts — one record is one dataset. */
function countBy(
  datasets: DatasetLocation[],
  pick: (d: DatasetLocation) => string[],
): FacetCount[] {
  const counts = new Map<string, number>();
  datasets.forEach((d) => {
    pick(d).forEach((value) => {
      counts.set(value, (counts.get(value) ?? 0) + 1);
    });
  });
  return [...counts.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));
}

export function useDatasetFilters(
  datasets: DatasetLocation[],
  filters: DatasetFilters,
) {
  return useMemo(() => {
    const results = datasets.filter((d) => passes(d, filters, null));

    const facets: Facets = {
      repositories: countBy(
        datasets.filter((d) => passes(d, filters, 'repositories')),
        (d) => [d.repository],
      ),
      regions: countBy(
        datasets.filter((d) => passes(d, filters, 'regions')),
        (d) => [d.region],
      ),
      countries: countBy(
        datasets.filter((d) => passes(d, filters, 'countries')),
        (d) => [d.country],
      ),
      dataTypes: countBy(
        datasets.filter((d) => passes(d, filters, 'dataTypes')),
        (d) => [d.dataType],
      ),
      formats: countBy(
        datasets.filter((d) => passes(d, filters, 'formats')),
        (d) => d.format,
      ),
      licenses: countBy(
        datasets.filter((d) => passes(d, filters, 'licenses')),
        (d) => [d.license],
      ),
    };

    const withoutTab = datasets.filter((d) => passes(d, filters, 'tab'));
    const tabCounts: Record<SearchTab, number> = {
      all: withoutTab.length,
      dataset: withoutTab.filter((d) => d.type === 'Dataset').length,
      keyword: withoutTab.filter((d) => d.type === 'Keyword').length,
      event: withoutTab.filter((d) => d.type === 'Event').length,
    };

    return {
      results,
      facets,
      datasetTotal: results.length,
      tabCounts,
      locationTotal: results.length,
    };
  }, [datasets, filters]);
}

export const EMPTY_FILTERS = (yearFrom: number, yearTo: number): DatasetFilters => ({
  query: '',
  tab: 'all',
  repositories: [],
  regions: [],
  countries: [],
  dataTypes: [],
  formats: [],
  licenses: [],
  yearFrom,
  yearTo,
});

export function countActiveFilters(
  filters: DatasetFilters,
  yearFrom: number,
  yearTo: number,
): number {
  return (
    filters.repositories.length +
    filters.regions.length +
    filters.countries.length +
    filters.dataTypes.length +
    filters.formats.length +
    filters.licenses.length +
    (filters.yearFrom !== yearFrom || filters.yearTo !== yearTo ? 1 : 0)
  );
}
