import type {
  DatasetLocation,
  DatasetType,
  Region,
  Repository,
} from '../types/dataset';

/* ------------------------------------------------------------------ *
 * Mock catalogue modelled on real open-data repositories.
 *
 * Each entry is ONE deposited dataset, so counts are literal: a cluster
 * of 15 markers contains 15 datasets and opening it lists those 15.
 *
 * Accessions, URLs and sizes are derived from the repository so the
 * table below stays readable — see `toLocation`.
 * ------------------------------------------------------------------ */

export const REPOSITORIES: Repository[] = [
  'PANGAEA',
  'Dryad',
  'Zenodo',
  'figshare',
  'ENA',
  'GenBank',
  'NCBI',
  'OSF',
  'GitHub',
  'Harvard Dataverse',
];

export const REGIONS: Region[] = [
  'Africa',
  'Europe',
  'Asia',
  'North America',
  'South America',
  'Oceania',
  'Polar',
  'Global Ocean',
];

export const DATA_TYPES = [
  'Time series',
  'Occurrence records',
  'Genomic sequences',
  'Sediment core',
  'Remote sensing',
  'Model output',
  'Survey data',
  'Imagery',
  'Water chemistry',
  'Acoustic',
] as const;

export const LICENSES = [
  'CC BY 4.0',
  'CC0 1.0',
  'CC BY-NC 4.0',
  'ODbL 1.0',
  'MIT',
  'GPL-3.0',
  'Public Domain',
] as const;

type Raw = {
  id: string;
  title: string;
  lat: number;
  lon: number;
  repo: Repository;
  country: string;
  region: Region;
  dataType: string;
  formats: string[];
  license: string;
  start: string;
  end: string;
  published: string;
  keywords: string[];
  description: string;
  type?: DatasetType;
};

const raw: Raw[] = [
  /* ------------------------- PANGAEA -------------------------- */
  { id: 'pg-001', title: 'Hydrographic profiles from RV Sonne cruise SO268, Clarion-Clipperton Zone', lat: 11.8, lon: -117.0, repo: 'PANGAEA', country: 'International Waters', region: 'Global Ocean', dataType: 'Time series', formats: ['CSV', 'NetCDF'], license: 'CC BY 4.0', start: '2019-02-17', end: '2019-05-27', published: '2020-06-11', keywords: ['CTD', 'deep sea', 'nodules'], description: 'CTD casts, oxygen and turbidity profiles collected across polymetallic nodule fields during cruise SO268.' },
  { id: 'pg-002', title: 'Sediment core GeoB16224-1, Mauritanian continental slope', lat: 18.05, lon: -16.65, repo: 'PANGAEA', country: 'Mauritania', region: 'Africa', dataType: 'Sediment core', formats: ['CSV', 'XLSX'], license: 'CC BY 4.0', start: '2012-01-10', end: '2012-01-10', published: '2015-03-02', keywords: ['sediment', 'palaeoclimate', 'upwelling'], description: 'Grain size, TOC and stable isotope records from a gravity core recovered off Cap Blanc.' },
  { id: 'pg-003', title: 'Seawater carbonate chemistry, Great Barrier Reef flats', lat: -18.52, lon: 146.9, repo: 'PANGAEA', country: 'Australia', region: 'Oceania', dataType: 'Water chemistry', formats: ['CSV'], license: 'CC BY 4.0', start: '2016-11-01', end: '2018-04-30', published: '2019-01-22', keywords: ['ocean acidification', 'pH', 'alkalinity'], description: 'Continuous pH, total alkalinity and DIC measurements from three reef-flat stations.' },
  { id: 'pg-004', title: 'Mangrove sediment carbon stocks, Segara Anakan lagoon', lat: -7.7, lon: 108.85, repo: 'PANGAEA', country: 'Indonesia', region: 'Asia', dataType: 'Survey data', formats: ['CSV', 'XLSX'], license: 'CC BY 4.0', start: '2014-06-01', end: '2015-09-30', published: '2016-08-15', keywords: ['blue carbon', 'mangrove', 'sediment'], description: 'Bulk density and organic carbon content of mangrove sediments along a degradation gradient.' },
  { id: 'pg-005', title: 'Moored ADCP current records, Mozambique Channel', lat: -17.2, lon: 41.1, repo: 'PANGAEA', country: 'Mozambique', region: 'Africa', dataType: 'Time series', formats: ['NetCDF'], license: 'CC BY 4.0', start: '2010-11-01', end: '2013-03-31', published: '2014-05-06', keywords: ['currents', 'ADCP', 'mooring'], description: 'Two-year velocity time series from a deep mooring array in the Mozambique Channel.' },
  { id: 'pg-006', title: 'Sea-ice thickness from EM-Bird surveys, Fram Strait', lat: 79.0, lon: -3.0, repo: 'PANGAEA', country: 'Norway', region: 'Polar', dataType: 'Remote sensing', formats: ['CSV', 'NetCDF'], license: 'CC BY 4.0', start: '2017-08-10', end: '2017-09-02', published: '2018-02-19', keywords: ['sea ice', 'thickness', 'Arctic'], description: 'Helicopter-borne electromagnetic ice thickness transects flown from RV Polarstern.' },
  { id: 'pg-007', title: 'Coral skeletal Sr/Ca records, Gulf of Aqaba', lat: 29.5, lon: 34.92, repo: 'PANGAEA', country: 'Israel', region: 'Asia', dataType: 'Time series', formats: ['CSV'], license: 'CC BY 4.0', start: '1975-01-01', end: '2015-12-31', published: '2017-11-30', keywords: ['coral', 'palaeothermometry', 'Red Sea'], description: 'Monthly resolved Sr/Ca and δ18O from three Porites cores used to reconstruct SST.' },
  { id: 'pg-008', title: 'Nutrient and chlorophyll data, Benguela upwelling transect', lat: -23.0, lon: 13.2, repo: 'PANGAEA', country: 'Namibia', region: 'Africa', dataType: 'Water chemistry', formats: ['CSV'], license: 'CC BY 4.0', start: '2018-09-05', end: '2018-10-12', published: '2019-07-04', keywords: ['upwelling', 'nutrients', 'chlorophyll'], description: 'Nitrate, phosphate, silicate and chlorophyll-a from 42 stations across the shelf.' },
  { id: 'pg-009', title: 'Pore water geochemistry, Håkon Mosby mud volcano', lat: 72.0, lon: 14.72, repo: 'PANGAEA', country: 'Norway', region: 'Polar', dataType: 'Water chemistry', formats: ['CSV', 'XLSX'], license: 'CC BY 4.0', start: '2011-07-14', end: '2011-07-28', published: '2013-01-17', keywords: ['methane', 'cold seep', 'pore water'], description: 'Sulfate, methane and chloride profiles from push cores at an active mud volcano.' },
  { id: 'pg-010', title: 'Zooplankton biomass, Humboldt Current System', lat: -12.05, lon: -77.7, repo: 'PANGAEA', country: 'Peru', region: 'South America', dataType: 'Occurrence records', formats: ['CSV'], license: 'CC BY 4.0', start: '2008-01-01', end: '2019-12-31', published: '2021-04-08', keywords: ['zooplankton', 'biomass', 'upwelling'], description: 'Displacement volume and species composition from bongo net hauls on annual surveys.' },
  { id: 'pg-011', title: 'Tide gauge sea level records, Bay of Bengal', lat: 21.6, lon: 88.1, repo: 'PANGAEA', country: 'India', region: 'Asia', dataType: 'Time series', formats: ['CSV'], license: 'CC BY 4.0', start: '1990-01-01', end: '2022-12-31', published: '2023-03-14', keywords: ['sea level', 'tide gauge', 'delta'], description: 'Quality-controlled hourly sea level from six stations across the Sundarbans coast.' },
  { id: 'pg-012', title: 'Benthic foraminifera census counts, Arabian Sea OMZ', lat: 20.1, lon: 62.8, repo: 'PANGAEA', country: 'Oman', region: 'Asia', dataType: 'Occurrence records', formats: ['CSV', 'XLSX'], license: 'CC BY 4.0', start: '2007-10-01', end: '2007-11-15', published: '2010-02-03', keywords: ['foraminifera', 'oxygen minimum zone'], description: 'Species-level counts from multicorer samples spanning the oxygen minimum zone.' },
  { id: 'pg-013', title: 'Seagrass meadow extent and shoot density, Zanzibar', lat: -6.16, lon: 39.2, repo: 'PANGAEA', country: 'Tanzania', region: 'Africa', dataType: 'Survey data', formats: ['CSV', 'GeoJSON'], license: 'CC BY 4.0', start: '2019-02-01', end: '2021-11-30', published: '2022-05-19', keywords: ['seagrass', 'shoot density', 'blue carbon'], description: 'Quadrat surveys of shoot density and canopy height across intertidal seagrass beds.' },
  { id: 'pg-014', title: 'Atmospheric CO2 flask measurements, Cape Verde Observatory', lat: 16.86, lon: -24.87, repo: 'PANGAEA', country: 'Cabo Verde', region: 'Africa', dataType: 'Time series', formats: ['CSV', 'NetCDF'], license: 'CC BY 4.0', start: '2007-10-01', end: '2023-06-30', published: '2023-09-12', keywords: ['CO2', 'atmosphere', 'observatory'], description: 'Weekly flask samples analysed for CO2, CH4 and stable carbon isotopes.' },

  /* -------------------------- Dryad --------------------------- */
  { id: 'dr-001', title: 'Data from: Reef fish community structure across a fishing gradient in Kenya', lat: -4.05, lon: 39.72, repo: 'Dryad', country: 'Kenya', region: 'Africa', dataType: 'Occurrence records', formats: ['CSV'], license: 'CC0 1.0', start: '2016-01-15', end: '2019-08-20', published: '2020-01-29', keywords: ['reef fish', 'fisheries', 'biodiversity'], description: 'Underwater visual census of 128 reef fish species across protected and fished sites.' },
  { id: 'dr-002', title: 'Data from: Thermal tolerance of intertidal gastropods in Hong Kong', lat: 22.28, lon: 114.26, repo: 'Dryad', country: 'China', region: 'Asia', dataType: 'Survey data', formats: ['CSV', 'R'], license: 'CC0 1.0', start: '2018-05-01', end: '2019-09-30', published: '2020-11-05', keywords: ['thermal tolerance', 'intertidal', 'gastropods'], description: 'Critical thermal maxima measurements for 14 gastropod species with body temperature logs.' },
  { id: 'dr-003', title: 'Data from: Amazonian tree growth response to drought', lat: -3.1, lon: -60.02, repo: 'Dryad', country: 'Brazil', region: 'South America', dataType: 'Time series', formats: ['CSV'], license: 'CC0 1.0', start: '2005-01-01', end: '2020-12-31', published: '2021-07-16', keywords: ['dendrometer', 'drought', 'tropical forest'], description: 'Dendrometer band measurements for 640 trees across 12 permanent forest plots.' },
  { id: 'dr-004', title: 'Data from: Pollinator networks along an Alpine elevation gradient', lat: 46.5, lon: 11.35, repo: 'Dryad', country: 'Italy', region: 'Europe', dataType: 'Occurrence records', formats: ['CSV'], license: 'CC0 1.0', start: '2017-06-01', end: '2018-08-31', published: '2019-04-22', keywords: ['pollination', 'networks', 'alpine'], description: 'Plant-pollinator interaction matrices recorded at eight elevations from 600 to 2400 m.' },
  { id: 'dr-005', title: 'Data from: Seabird foraging tracks in the Benguela region', lat: -33.05, lon: 17.95, repo: 'Dryad', country: 'South Africa', region: 'Africa', dataType: 'Time series', formats: ['CSV', 'GeoJSON'], license: 'CC0 1.0', start: '2015-10-01', end: '2018-02-28', published: '2019-09-30', keywords: ['GPS tracking', 'seabirds', 'foraging'], description: 'GPS and dive-depth records from 96 Cape gannets breeding on Malgas Island.' },
  { id: 'dr-006', title: 'Data from: Soil microbial diversity across Patagonian steppe', lat: -45.9, lon: -71.3, repo: 'Dryad', country: 'Chile', region: 'South America', dataType: 'Survey data', formats: ['CSV', 'FASTA'], license: 'CC0 1.0', start: '2019-11-01', end: '2020-03-15', published: '2021-02-11', keywords: ['soil', 'microbial', 'steppe'], description: 'Soil chemistry and 16S amplicon summaries from 180 plots along a rainfall gradient.' },
  { id: 'dr-007', title: 'Data from: Coral bleaching severity in the Chagos Archipelago', lat: -6.3, lon: 71.9, repo: 'Dryad', country: 'British Indian Ocean Territory', region: 'Global Ocean', dataType: 'Survey data', formats: ['CSV'], license: 'CC0 1.0', start: '2015-04-01', end: '2017-06-30', published: '2018-05-14', keywords: ['bleaching', 'coral', 'thermal stress'], description: 'Colony-level bleaching scores for 21 genera before, during and after the 2016 event.', type: 'Event' },
  { id: 'dr-008', title: 'Data from: Migratory connectivity of shorebirds on the Yellow Sea', lat: 37.5, lon: 126.5, repo: 'Dryad', country: 'South Korea', region: 'Asia', dataType: 'Occurrence records', formats: ['CSV'], license: 'CC0 1.0', start: '2013-03-01', end: '2019-11-30', published: '2020-08-27', keywords: ['shorebirds', 'migration', 'tidal flats'], description: 'Resighting histories of colour-banded shorebirds at 22 staging sites.' },
  { id: 'dr-009', title: 'Data from: Kelp forest recovery after marine heatwave, Tasmania', lat: -43.1, lon: 147.9, repo: 'Dryad', country: 'Australia', region: 'Oceania', dataType: 'Survey data', formats: ['CSV'], license: 'CC0 1.0', start: '2016-01-01', end: '2021-12-31', published: '2022-06-08', keywords: ['kelp', 'heatwave', 'recovery'], description: 'Annual transect surveys of Ecklonia radiata cover at 30 reef sites.', type: 'Event' },
  { id: 'dr-010', title: 'Data from: Freshwater fish traits of the Congo Basin', lat: -1.6, lon: 18.4, repo: 'Dryad', country: 'DR Congo', region: 'Africa', dataType: 'Occurrence records', formats: ['CSV'], license: 'CC0 1.0', start: '2011-01-01', end: '2018-12-31', published: '2019-12-03', keywords: ['freshwater fish', 'traits', 'Congo'], description: 'Morphological and ecological trait matrix for 612 freshwater fish species.' },

  /* -------------------------- Zenodo -------------------------- */
  { id: 'ze-001', title: 'Global mangrove canopy height model derived from GEDI and Sentinel-2', lat: 0.5, lon: 100.4, repo: 'Zenodo', country: 'Indonesia', region: 'Asia', dataType: 'Remote sensing', formats: ['GeoTIFF'], license: 'CC BY 4.0', start: '2019-04-01', end: '2022-12-31', published: '2023-04-18', keywords: ['mangrove', 'canopy height', 'GEDI'], description: 'A 10 m canopy height product for global mangrove extent with per-pixel uncertainty.' },
  { id: 'ze-002', title: 'Marine heatwave detection toolbox output for the Mediterranean', lat: 40.0, lon: 5.0, repo: 'Zenodo', country: 'Spain', region: 'Europe', dataType: 'Model output', formats: ['NetCDF', 'CSV'], license: 'CC BY 4.0', start: '1982-01-01', end: '2023-12-31', published: '2024-02-06', keywords: ['marine heatwave', 'SST', 'Mediterranean'], description: 'Detected marine heatwave events with duration, intensity and cumulative intensity metrics.', type: 'Event' },
  { id: 'ze-003', title: 'Bathymetric survey of the Mariana back-arc spreading centre', lat: 17.0, lon: 144.7, repo: 'Zenodo', country: 'Guam', region: 'Global Ocean', dataType: 'Remote sensing', formats: ['GeoTIFF', 'NetCDF'], license: 'CC BY 4.0', start: '2016-11-28', end: '2016-12-20', published: '2018-03-09', keywords: ['bathymetry', 'multibeam', 'hydrothermal'], description: 'Gridded 50 m multibeam bathymetry and backscatter from an AUV and hull-mounted survey.' },
  { id: 'ze-004', title: 'Hydroacoustic fish biomass estimates, Lake Tanganyika', lat: -6.0, lon: 29.6, repo: 'Zenodo', country: 'Tanzania', region: 'Africa', dataType: 'Acoustic', formats: ['CSV', 'NetCDF'], license: 'CC BY 4.0', start: '2017-08-01', end: '2019-07-31', published: '2020-10-14', keywords: ['hydroacoustics', 'pelagic fish', 'lake'], description: 'Echosounder-derived biomass along repeated transects with calibration records.' },
  { id: 'ze-005', title: 'Urban heat island model output for 96 tropical cities', lat: 13.75, lon: 100.5, repo: 'Zenodo', country: 'Thailand', region: 'Asia', dataType: 'Model output', formats: ['NetCDF', 'GeoTIFF'], license: 'CC BY 4.0', start: '2003-01-01', end: '2022-12-31', published: '2023-08-30', keywords: ['urban heat', 'cities', 'model'], description: 'Hourly modelled canopy-layer air temperature for tropical urban agglomerations.' },
  { id: 'ze-006', title: 'Antarctic ice shelf basal melt rates from satellite altimetry', lat: -75.5, lon: -60.0, repo: 'Zenodo', country: 'Antarctica', region: 'Polar', dataType: 'Remote sensing', formats: ['NetCDF'], license: 'CC BY 4.0', start: '2010-01-01', end: '2021-12-31', published: '2022-11-25', keywords: ['ice shelf', 'basal melt', 'altimetry'], description: 'Gridded basal melt rate estimates with error fields for all major Antarctic ice shelves.' },
  { id: 'ze-007', title: 'Plastic debris counts on Mediterranean beaches', lat: 37.98, lon: 23.73, repo: 'Zenodo', country: 'Greece', region: 'Europe', dataType: 'Survey data', formats: ['CSV', 'XLSX'], license: 'CC BY 4.0', start: '2018-03-01', end: '2022-09-30', published: '2023-01-11', keywords: ['marine litter', 'plastic', 'beach survey'], description: 'Standardised litter counts by polymer category from 74 beach transects.' },
  { id: 'ze-008', title: 'Reanalysis-derived wind resource atlas for West Africa', lat: 9.05, lon: -1.2, repo: 'Zenodo', country: 'Ghana', region: 'Africa', dataType: 'Model output', formats: ['NetCDF'], license: 'CC BY 4.0', start: '1990-01-01', end: '2020-12-31', published: '2021-06-02', keywords: ['wind', 'renewables', 'atlas'], description: 'Hub-height wind speed statistics and capacity factors at 3 km resolution.' },
  { id: 'ze-009', title: 'Permafrost borehole temperature compilation, Siberia', lat: 67.5, lon: 133.4, repo: 'Zenodo', country: 'Russia', region: 'Asia', dataType: 'Time series', formats: ['CSV'], license: 'CC BY 4.0', start: '1998-01-01', end: '2021-12-31', published: '2022-04-21', keywords: ['permafrost', 'borehole', 'ground temperature'], description: 'Harmonised ground temperature records from 61 boreholes with metadata.' },
  { id: 'ze-010', title: 'Glacier front positions in southern Greenland from Sentinel-1', lat: 61.2, lon: -45.4, repo: 'Zenodo', country: 'Greenland', region: 'Polar', dataType: 'Remote sensing', formats: ['GeoJSON', 'Shapefile'], license: 'CC BY 4.0', start: '2015-01-01', end: '2023-09-30', published: '2023-12-04', keywords: ['glacier', 'calving front', 'SAR'], description: 'Manually digitised calving front positions for 42 marine-terminating glaciers.' },

  /* ------------------------- figshare ------------------------- */
  { id: 'fs-001', title: 'Seagrass and coral habitat maps for the Andaman coast', lat: 8.0, lon: 98.3, repo: 'figshare', country: 'Thailand', region: 'Asia', dataType: 'Imagery', formats: ['GeoTIFF', 'Shapefile'], license: 'CC BY 4.0', start: '2018-01-01', end: '2020-12-31', published: '2021-05-27', keywords: ['habitat map', 'coral', 'seagrass'], description: 'Object-based classification of shallow-water habitats from WorldView-3 imagery.' },
  { id: 'fs-002', title: 'High-resolution drone imagery of Antarctic penguin colonies', lat: -64.8, lon: -62.9, repo: 'figshare', country: 'Antarctica', region: 'Polar', dataType: 'Imagery', formats: ['GeoTIFF', 'JPEG'], license: 'CC BY 4.0', start: '2019-12-01', end: '2020-02-15', published: '2020-09-08', keywords: ['drone', 'penguins', 'colony'], description: 'Orthomosaics and nest-count annotations for 11 Pygoscelis colonies.' },
  { id: 'fs-003', title: 'Groundwater quality survey of the Indo-Gangetic aquifer', lat: 26.85, lon: 80.95, repo: 'figshare', country: 'India', region: 'Asia', dataType: 'Water chemistry', formats: ['CSV', 'XLSX'], license: 'CC BY 4.0', start: '2016-01-01', end: '2019-12-31', published: '2020-07-30', keywords: ['groundwater', 'arsenic', 'aquifer'], description: 'Major ion and trace element chemistry from 1,240 wells including arsenic and fluoride.' },
  { id: 'fs-004', title: 'Fire radiative power records for the Cerrado', lat: -15.8, lon: -47.9, repo: 'figshare', country: 'Brazil', region: 'South America', dataType: 'Remote sensing', formats: ['CSV', 'GeoTIFF'], license: 'CC BY 4.0', start: '2003-01-01', end: '2022-12-31', published: '2023-05-16', keywords: ['fire', 'FRP', 'savanna'], description: 'MODIS and VIIRS active fire detections aggregated to a 1 km monthly grid.', type: 'Event' },
  { id: 'fs-005', title: 'Sponge microbiome sampling metadata, Caribbean reefs', lat: 18.31, lon: -64.93, repo: 'figshare', country: 'British Virgin Islands', region: 'North America', dataType: 'Survey data', formats: ['CSV'], license: 'CC BY 4.0', start: '2017-05-01', end: '2018-06-30', published: '2019-03-19', keywords: ['sponge', 'microbiome', 'reef'], description: 'Collection metadata, host taxonomy and environmental context for 384 sponge samples.' },
  { id: 'fs-006', title: 'Air quality sensor network measurements, Nairobi', lat: -1.29, lon: 36.82, repo: 'figshare', country: 'Kenya', region: 'Africa', dataType: 'Time series', formats: ['CSV', 'Parquet'], license: 'CC BY 4.0', start: '2020-01-01', end: '2023-06-30', published: '2023-10-02', keywords: ['PM2.5', 'low-cost sensors', 'urban'], description: 'Minute-resolution PM2.5 and PM10 from 38 low-cost sensors with co-location calibration.' },
  { id: 'fs-007', title: 'Snow water equivalent observations, Southern Alps', lat: -43.5, lon: 170.5, repo: 'figshare', country: 'New Zealand', region: 'Oceania', dataType: 'Time series', formats: ['CSV'], license: 'CC BY 4.0', start: '2010-05-01', end: '2022-10-31', published: '2023-02-27', keywords: ['snow', 'SWE', 'alpine'], description: 'Automatic snow pillow and manual snow course records from 14 alpine catchments.' },
  { id: 'fs-008', title: 'Land cover change maps for the Mekong Delta', lat: 10.03, lon: 105.78, repo: 'figshare', country: 'Vietnam', region: 'Asia', dataType: 'Remote sensing', formats: ['GeoTIFF'], license: 'CC BY 4.0', start: '2000-01-01', end: '2020-12-31', published: '2021-11-12', keywords: ['land cover', 'delta', 'aquaculture'], description: 'Decadal land cover classifications tracking rice-to-aquaculture conversion.' },

  /* ---------------------------- ENA --------------------------- */
  { id: 'en-001', title: 'Metagenomic sequencing of Red Sea brine pool microbial communities', lat: 21.35, lon: 38.05, repo: 'ENA', country: 'Saudi Arabia', region: 'Asia', dataType: 'Genomic sequences', formats: ['FASTQ'], license: 'CC0 1.0', start: '2018-03-01', end: '2018-04-15', published: '2019-05-21', keywords: ['metagenome', 'brine pool', 'extremophile'], description: 'Illumina shotgun metagenomes from four deep-sea brine pools in the Red Sea rift.' },
  { id: 'en-002', title: 'Amplicon survey of North Sea phytoplankton communities', lat: 54.18, lon: 7.9, repo: 'ENA', country: 'Germany', region: 'Europe', dataType: 'Genomic sequences', formats: ['FASTQ'], license: 'CC0 1.0', start: '2019-02-01', end: '2021-12-31', published: '2022-06-15', keywords: ['18S', 'phytoplankton', 'time series'], description: 'Weekly 18S rRNA amplicon libraries from the Helgoland Roads long-term station.' },
  { id: 'en-003', title: 'Whole-genome sequencing of Atlantic cod populations', lat: 68.0, lon: 14.0, repo: 'ENA', country: 'Norway', region: 'Europe', dataType: 'Genomic sequences', formats: ['FASTQ', 'BAM'], license: 'CC0 1.0', start: '2017-01-01', end: '2019-06-30', published: '2020-03-25', keywords: ['cod', 'population genomics', 'WGS'], description: 'Resequencing of 312 individuals spanning coastal and offshore spawning grounds.' },
  { id: 'en-004', title: 'Coral symbiont transcriptomes under thermal stress', lat: -18.3, lon: 147.7, repo: 'ENA', country: 'Australia', region: 'Oceania', dataType: 'Genomic sequences', formats: ['FASTQ'], license: 'CC0 1.0', start: '2019-01-15', end: '2019-03-30', published: '2020-08-11', keywords: ['transcriptome', 'Symbiodinium', 'heat stress'], description: 'RNA-seq libraries from experimental heating of Acropora colonies and their symbionts.' },
  { id: 'en-005', title: 'Soil metagenomes from a Sahel restoration trial', lat: 14.5, lon: 2.1, repo: 'ENA', country: 'Niger', region: 'Africa', dataType: 'Genomic sequences', formats: ['FASTQ'], license: 'CC0 1.0', start: '2020-06-01', end: '2022-05-31', published: '2023-01-30', keywords: ['soil', 'metagenome', 'restoration'], description: 'Shotgun metagenomes tracking microbial succession under three restoration treatments.' },
  { id: 'en-006', title: 'eDNA metabarcoding of Amazonian floodplain lakes', lat: -3.3, lon: -60.6, repo: 'ENA', country: 'Brazil', region: 'South America', dataType: 'Genomic sequences', formats: ['FASTQ'], license: 'CC0 1.0', start: '2021-09-01', end: '2022-08-31', published: '2023-04-17', keywords: ['eDNA', 'metabarcoding', 'fish'], description: '12S and COI amplicon data from 96 floodplain lake water samples.' },

  /* -------------------------- GenBank ------------------------- */
  { id: 'gb-001', title: 'Mitochondrial genomes of Indo-Pacific reef fishes', lat: -8.4, lon: 115.2, repo: 'GenBank', country: 'Indonesia', region: 'Asia', dataType: 'Genomic sequences', formats: ['FASTA', 'GenBank'], license: 'Public Domain', start: '2015-01-01', end: '2018-12-31', published: '2019-06-04', keywords: ['mitogenome', 'reef fish', 'phylogeny'], description: 'Complete mitochondrial genome assemblies for 88 reef-associated fish species.' },
  { id: 'gb-002', title: 'Chloroplast sequences of Madagascan endemic orchids', lat: -18.9, lon: 47.52, repo: 'GenBank', country: 'Madagascar', region: 'Africa', dataType: 'Genomic sequences', formats: ['FASTA'], license: 'Public Domain', start: '2016-05-01', end: '2019-11-30', published: '2020-04-13', keywords: ['chloroplast', 'orchid', 'endemism'], description: 'Plastid barcode regions for 214 orchid accessions with voucher metadata.' },
  { id: 'gb-003', title: 'SARS-CoV-2 genomes from wastewater surveillance, Cape Town', lat: -33.92, lon: 18.42, repo: 'GenBank', country: 'South Africa', region: 'Africa', dataType: 'Genomic sequences', formats: ['FASTA'], license: 'Public Domain', start: '2021-01-01', end: '2022-12-31', published: '2023-02-20', keywords: ['wastewater', 'genomic surveillance'], description: 'Consensus genomes recovered from municipal wastewater catchments.' },
  { id: 'gb-004', title: 'Barcode sequences of Arctic benthic invertebrates', lat: 78.22, lon: 15.63, repo: 'GenBank', country: 'Svalbard', region: 'Polar', dataType: 'Genomic sequences', formats: ['FASTA'], license: 'Public Domain', start: '2014-07-01', end: '2017-09-30', published: '2018-10-08', keywords: ['DNA barcoding', 'benthos', 'Arctic'], description: 'COI barcodes for 1,032 benthic invertebrate specimens from Svalbard fjords.' },
  { id: 'gb-005', title: 'Ribosomal sequences of Andean páramo fungi', lat: 4.6, lon: -74.1, repo: 'GenBank', country: 'Colombia', region: 'South America', dataType: 'Genomic sequences', formats: ['FASTA'], license: 'Public Domain', start: '2018-02-01', end: '2020-10-31', published: '2021-09-01', keywords: ['fungi', 'ITS', 'paramo'], description: 'ITS and LSU sequences from cultured and environmental fungal isolates.' },

  /* --------------------------- NCBI --------------------------- */
  { id: 'nc-001', title: 'BioProject: Great Barrier Reef microbial observatory', lat: -23.44, lon: 151.91, repo: 'NCBI', country: 'Australia', region: 'Oceania', dataType: 'Genomic sequences', formats: ['FASTQ', 'BAM'], license: 'Public Domain', start: '2016-01-01', end: '2022-12-31', published: '2023-03-07', keywords: ['microbial observatory', 'reef', 'BioProject'], description: 'Umbrella project linking amplicon, metagenome and metatranscriptome submissions.' },
  { id: 'nc-002', title: 'BioProject: Mekong River fish population genomics', lat: 15.12, lon: 105.8, repo: 'NCBI', country: 'Laos', region: 'Asia', dataType: 'Genomic sequences', formats: ['FASTQ'], license: 'Public Domain', start: '2019-01-01', end: '2021-12-31', published: '2022-05-10', keywords: ['population genomics', 'migratory fish'], description: 'RAD-seq libraries for migratory species above and below mainstem dams.' },
  { id: 'nc-003', title: 'BioProject: East African Rift lake cichlid radiation', lat: -2.5, lon: 32.9, repo: 'NCBI', country: 'Tanzania', region: 'Africa', dataType: 'Genomic sequences', formats: ['FASTQ', 'BAM'], license: 'Public Domain', start: '2015-06-01', end: '2020-05-31', published: '2021-01-19', keywords: ['cichlid', 'adaptive radiation'], description: 'Whole-genome resequencing across 68 cichlid species from three rift lakes.' },
  { id: 'nc-004', title: 'BioProject: Boreal peatland methanogen communities', lat: 61.85, lon: 24.29, repo: 'NCBI', country: 'Finland', region: 'Europe', dataType: 'Genomic sequences', formats: ['FASTQ'], license: 'Public Domain', start: '2018-05-01', end: '2021-09-30', published: '2022-02-14', keywords: ['methanogens', 'peatland', 'metagenome'], description: 'Depth-resolved metagenomes paired with in situ methane flux measurements.' },
  { id: 'nc-005', title: 'BioProject: Antarctic dry valley soil communities', lat: -77.5, lon: 161.9, repo: 'NCBI', country: 'Antarctica', region: 'Polar', dataType: 'Genomic sequences', formats: ['FASTQ'], license: 'Public Domain', start: '2017-11-01', end: '2019-01-31', published: '2020-06-23', keywords: ['dry valleys', 'soil', 'extremophile'], description: 'Amplicon and shotgun sequencing along a moisture gradient in Taylor Valley.' },

  /* ---------------------------- OSF --------------------------- */
  { id: 'os-001', title: 'Coastal community perceptions of MPA governance, Philippines', lat: 9.8, lon: 118.7, repo: 'OSF', country: 'Philippines', region: 'Asia', dataType: 'Survey data', formats: ['CSV', 'PDF'], license: 'CC BY 4.0', start: '2019-01-01', end: '2020-02-29', published: '2020-10-06', keywords: ['MPA', 'governance', 'social survey'], description: 'Structured interviews with 612 households adjacent to marine protected areas.' },
  { id: 'os-002', title: 'Fisher logbook digitisation project, Gulf of Guinea', lat: 5.55, lon: -0.2, repo: 'OSF', country: 'Ghana', region: 'Africa', dataType: 'Survey data', formats: ['CSV', 'XLSX'], license: 'CC BY 4.0', start: '2015-01-01', end: '2021-12-31', published: '2022-08-19', keywords: ['fisheries', 'logbook', 'catch'], description: 'Digitised artisanal catch and effort records from 18 landing sites.' },
  { id: 'os-003', title: 'Replication materials: seagrass restoration meta-analysis', lat: 52.37, lon: 4.9, repo: 'OSF', country: 'Netherlands', region: 'Europe', dataType: 'Survey data', formats: ['CSV', 'R'], license: 'CC BY 4.0', start: '2000-01-01', end: '2021-12-31', published: '2022-11-30', keywords: ['restoration', 'meta-analysis', 'seagrass'], description: 'Extracted effect sizes and screening decisions for 214 restoration trials.' },
  { id: 'os-004', title: 'Citizen science water quality observations, Lake Victoria', lat: -0.35, lon: 33.2, repo: 'OSF', country: 'Uganda', region: 'Africa', dataType: 'Time series', formats: ['CSV'], license: 'CC BY 4.0', start: '2020-03-01', end: '2023-05-31', published: '2023-07-25', keywords: ['citizen science', 'water quality'], description: 'Secchi depth, temperature and turbidity submitted by trained community monitors.' },
  { id: 'os-005', title: 'Household energy use diaries, coastal Bangladesh', lat: 22.34, lon: 91.83, repo: 'OSF', country: 'Bangladesh', region: 'Asia', dataType: 'Survey data', formats: ['CSV'], license: 'CC BY-NC 4.0', start: '2021-06-01', end: '2022-05-31', published: '2023-01-09', keywords: ['energy', 'household', 'adaptation'], description: 'Twelve-month energy and cooking-fuel diaries from 340 coastal households.' },

  /* -------------------------- GitHub -------------------------- */
  { id: 'gh-001', title: 'coastal-flood-model: Sundarbans storm surge simulation code and forcing', lat: 21.95, lon: 89.18, repo: 'GitHub', country: 'Bangladesh', region: 'Asia', dataType: 'Model output', formats: ['NetCDF', 'Python'], license: 'MIT', start: '2007-01-01', end: '2023-12-31', published: '2024-01-15', keywords: ['storm surge', 'model', 'code'], description: 'Reproducible surge modelling pipeline with boundary forcing for historical cyclones.', type: 'Event' },
  { id: 'gh-002', title: 'reef-monitoring-toolkit: image annotation pipeline and training set', lat: -16.9, lon: 145.77, repo: 'GitHub', country: 'Australia', region: 'Oceania', dataType: 'Imagery', formats: ['Python', 'JPEG', 'CSV'], license: 'GPL-3.0', start: '2018-01-01', end: '2023-06-30', published: '2023-07-19', keywords: ['machine learning', 'benthic', 'annotation'], description: 'Annotated benthic imagery and a training pipeline for automated cover estimation.' },
  { id: 'gh-003', title: 'sealevel-tools: tide gauge harmonisation utilities and station registry', lat: 51.5, lon: -0.13, repo: 'GitHub', country: 'United Kingdom', region: 'Europe', dataType: 'Time series', formats: ['Python', 'CSV'], license: 'MIT', start: '1900-01-01', end: '2023-12-31', published: '2024-03-01', keywords: ['sea level', 'tide gauge', 'tooling'], description: 'Utilities for datum correction and gap filling plus a curated station registry.' },
  { id: 'gh-004', title: 'sahel-ndvi-pipeline: rangeland productivity processing chain', lat: 15.3, lon: -0.5, repo: 'GitHub', country: 'Mali', region: 'Africa', dataType: 'Remote sensing', formats: ['Python', 'GeoTIFF'], license: 'MIT', start: '2000-01-01', end: '2023-12-31', published: '2024-02-08', keywords: ['NDVI', 'rangeland', 'pipeline'], description: 'Open processing chain producing dekadal productivity anomalies for the Sahel.' },
  { id: 'gh-005', title: 'argo-qc: quality control routines for Argo float profiles', lat: -20.0, lon: -30.0, repo: 'GitHub', country: 'International Waters', region: 'Global Ocean', dataType: 'Time series', formats: ['Python', 'NetCDF'], license: 'GPL-3.0', start: '2005-01-01', end: '2023-12-31', published: '2023-11-22', keywords: ['Argo', 'quality control', 'profiles'], description: 'Reference implementation of delayed-mode QC tests with test fixtures.' },

  /* --------------------- Harvard Dataverse -------------------- */
  { id: 'hd-001', title: 'Replication data for: Coastal adaptation finance in small island states', lat: -18.14, lon: 178.44, repo: 'Harvard Dataverse', country: 'Fiji', region: 'Oceania', dataType: 'Survey data', formats: ['CSV', 'Stata'], license: 'CC0 1.0', start: '2014-01-01', end: '2021-12-31', published: '2022-09-14', keywords: ['adaptation finance', 'SIDS', 'policy'], description: 'Project-level adaptation finance flows with coding protocol and replication scripts.' },
  { id: 'hd-002', title: 'Replication data for: Fisheries subsidies and stock status', lat: 40.71, lon: -74.01, repo: 'Harvard Dataverse', country: 'United States', region: 'North America', dataType: 'Survey data', formats: ['CSV', 'R'], license: 'CC0 1.0', start: '1990-01-01', end: '2018-12-31', published: '2020-12-01', keywords: ['subsidies', 'fisheries', 'econometrics'], description: 'Country-year panel of subsidy categories matched to assessed stock status.' },
  { id: 'hd-003', title: 'Household vulnerability survey, Vietnamese Mekong Delta', lat: 9.6, lon: 105.97, repo: 'Harvard Dataverse', country: 'Vietnam', region: 'Asia', dataType: 'Survey data', formats: ['CSV', 'SPSS'], license: 'CC BY 4.0', start: '2017-05-01', end: '2018-04-30', published: '2019-08-05', keywords: ['vulnerability', 'salinity', 'livelihoods'], description: 'Two-wave panel of 1,100 households covering salinity intrusion impacts.' },
  { id: 'hd-004', title: 'Land tenure and mangrove loss in coastal Ecuador', lat: -0.95, lon: -80.72, repo: 'Harvard Dataverse', country: 'Ecuador', region: 'South America', dataType: 'Survey data', formats: ['CSV', 'Shapefile'], license: 'CC BY 4.0', start: '2000-01-01', end: '2019-12-31', published: '2021-03-23', keywords: ['land tenure', 'mangrove', 'aquaculture'], description: 'Parcel-level tenure records joined to mangrove change detection outputs.' },
  { id: 'hd-005', title: 'Replication data for: Marine spatial planning in the Baltic', lat: 58.4, lon: 19.8, repo: 'Harvard Dataverse', country: 'Sweden', region: 'Europe', dataType: 'Survey data', formats: ['CSV', 'Shapefile'], license: 'CC0 1.0', start: '2012-01-01', end: '2020-12-31', published: '2021-10-12', keywords: ['spatial planning', 'stakeholders', 'Baltic'], description: 'Stakeholder preference data and spatial conflict layers used in the analysis.' },
];

/* ------------------------ derivation ------------------------ */

function hash(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

/** Accession formats follow each repository's real convention. */
function accessionFor(entry: Raw): { accession: string; url: string } {
  const n = hash(entry.id);
  switch (entry.repo) {
    case 'PANGAEA': {
      const id = 900000 + (n % 99999);
      return {
        accession: `10.1594/PANGAEA.${id}`,
        url: `https://doi.pangaea.de/10.1594/PANGAEA.${id}`,
      };
    }
    case 'Dryad': {
      const id = (n % 9999999).toString(36).padStart(7, '0');
      return {
        accession: `10.5061/dryad.${id}`,
        url: `https://datadryad.org/stash/dataset/doi:10.5061/dryad.${id}`,
      };
    }
    case 'Zenodo': {
      const id = 7000000 + (n % 999999);
      return {
        accession: `10.5281/zenodo.${id}`,
        url: `https://zenodo.org/records/${id}`,
      };
    }
    case 'figshare': {
      const id = 12000000 + (n % 999999);
      return {
        accession: `10.6084/m9.figshare.${id}`,
        url: `https://figshare.com/articles/dataset/${id}`,
      };
    }
    case 'ENA': {
      const id = 40000 + (n % 59999);
      return {
        accession: `PRJEB${id}`,
        url: `https://www.ebi.ac.uk/ena/browser/view/PRJEB${id}`,
      };
    }
    case 'GenBank': {
      const id = 100000 + (n % 899999);
      return {
        accession: `OQ${id}`,
        url: `https://www.ncbi.nlm.nih.gov/nuccore/OQ${id}`,
      };
    }
    case 'NCBI': {
      const id = 700000 + (n % 299999);
      return {
        accession: `PRJNA${id}`,
        url: `https://www.ncbi.nlm.nih.gov/bioproject/PRJNA${id}`,
      };
    }
    case 'OSF': {
      const id = (n % 9999999).toString(36).padStart(5, '0').slice(0, 5);
      return {
        accession: `10.17605/OSF.IO/${id.toUpperCase()}`,
        url: `https://osf.io/${id}`,
      };
    }
    case 'GitHub': {
      const slug = entry.title.split(':')[0].trim();
      return {
        accession: `zmt-data/${slug}`,
        url: `https://github.com/zmt-data/${slug}`,
      };
    }
    case 'Harvard Dataverse': {
      const id = (n % 999999).toString(36).toUpperCase().padStart(6, '0');
      return {
        accession: `10.7910/DVN/${id}`,
        url: `https://dataverse.harvard.edu/dataset.xhtml?persistentId=doi:10.7910/DVN/${id}`,
      };
    }
  }
}

function sizeFor(entry: Raw, seed: number): string {
  const heavy =
    entry.dataType === 'Genomic sequences' ||
    entry.dataType === 'Imagery' ||
    entry.dataType === 'Remote sensing';
  if (heavy) {
    const gb = 1.2 + (seed % 480) / 10;
    return `${gb.toFixed(1)} GB`;
  }
  const mb = 3 + (seed % 900);
  return mb > 999 ? `${(mb / 1024).toFixed(1)} GB` : `${mb} MB`;
}

function toLocation(entry: Raw): DatasetLocation {
  const seed = hash(entry.id);
  const { accession, url } = accessionFor(entry);

  return {
    id: entry.id,
    title: entry.title,
    latitude: entry.lat,
    longitude: entry.lon,
    repository: entry.repo,
    accession,
    url,
    country: entry.country,
    region: entry.region,
    dataType: entry.dataType,
    format: entry.formats,
    license: entry.license,
    startDate: entry.start,
    endDate: entry.end,
    publishedDate: entry.published,
    description: entry.description,
    keywords: entry.keywords,
    size: sizeFor(entry, seed),
    files: 1 + (seed % 240),
    citations: seed % 90,
    type: entry.type ?? 'Dataset',
  };
}

/* Every entry below is one hand-written, distinct deposit — no synthetic
   "sibling" records. Earlier this catalogue inflated the 73 real entries
   up to 634 by cloning each one with a suffix like "— follow-up
   campaign" or "— inshore sites"; those clones shared the same title,
   description and repository and read as duplicated/fake data, which is
   exactly what they were. Do not reintroduce that expansion step. */
export const mockDatasets: DatasetLocation[] = raw.map(toLocation);

/** Total number of deposits in the catalogue. */
export const TOTAL_CATALOGUE_SIZE = mockDatasets.length;

export const YEAR_MIN = 1900;
export const YEAR_MAX = 2025;
