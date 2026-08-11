/* ------------------------------------------------------------------ *
 * Place labels drawn on the globe as the user zooms in.
 *
 * `tier` controls when a label appears: lower tiers show first, so the
 * globe fills in gradually instead of dumping every name at once.
 *   tier 0 — largest countries / world cities
 *   tier 1 — major countries / major cities
 *   tier 2 — the rest
 *
 * Coordinates are label anchors (roughly the country's visual centre, or
 * the city proper), not centroids of the official boundary.
 * ------------------------------------------------------------------ */

export type Place = {
  name: string;
  latitude: number;
  longitude: number;
  tier: 0 | 1 | 2;
};

export const COUNTRIES: Place[] = [
  /* --- tier 0: continent-scale --- */
  { name: 'Russia', latitude: 61, longitude: 90, tier: 0 },
  { name: 'Canada', latitude: 58, longitude: -104, tier: 0 },
  { name: 'United States', latitude: 39, longitude: -98, tier: 0 },
  { name: 'China', latitude: 35, longitude: 104, tier: 0 },
  { name: 'Brazil', latitude: -10, longitude: -52, tier: 0 },
  { name: 'Australia', latitude: -25, longitude: 134, tier: 0 },
  { name: 'India', latitude: 22, longitude: 79, tier: 0 },
  { name: 'Argentina', latitude: -35, longitude: -65, tier: 0 },
  { name: 'Kazakhstan', latitude: 48, longitude: 67, tier: 0 },
  { name: 'Algeria', latitude: 28, longitude: 3, tier: 0 },
  { name: 'D.R. Congo', latitude: -3, longitude: 23, tier: 0 },
  { name: 'Greenland', latitude: 72, longitude: -42, tier: 0 },
  { name: 'Saudi Arabia', latitude: 24, longitude: 45, tier: 0 },
  { name: 'Mexico', latitude: 23, longitude: -102, tier: 0 },
  { name: 'Indonesia', latitude: -2, longitude: 118, tier: 0 },
  { name: 'Libya', latitude: 27, longitude: 17, tier: 0 },
  { name: 'Sudan', latitude: 15, longitude: 30, tier: 0 },
  { name: 'Iran', latitude: 32, longitude: 53, tier: 0 },
  { name: 'Mongolia', latitude: 46, longitude: 104, tier: 0 },
  { name: 'South Africa', latitude: -29, longitude: 24, tier: 0 },

  /* --- tier 1: major --- */
  { name: 'Egypt', latitude: 26, longitude: 30, tier: 1 },
  { name: 'Nigeria', latitude: 9, longitude: 8, tier: 1 },
  { name: 'Ethiopia', latitude: 9, longitude: 40, tier: 1 },
  { name: 'Chad', latitude: 15, longitude: 19, tier: 1 },
  { name: 'Niger', latitude: 17, longitude: 9, tier: 1 },
  { name: 'Mali', latitude: 18, longitude: -3, tier: 1 },
  { name: 'Angola', latitude: -12, longitude: 18, tier: 1 },
  { name: 'Tanzania', latitude: -6, longitude: 35, tier: 1 },
  { name: 'Kenya', latitude: 1, longitude: 38, tier: 1 },
  { name: 'Namibia', latitude: -22, longitude: 17, tier: 1 },
  { name: 'Mozambique', latitude: -18, longitude: 35, tier: 1 },
  { name: 'Madagascar', latitude: -19, longitude: 47, tier: 1 },
  { name: 'Morocco', latitude: 32, longitude: -6, tier: 1 },
  { name: 'Spain', latitude: 40, longitude: -4, tier: 1 },
  { name: 'France', latitude: 47, longitude: 2, tier: 1 },
  { name: 'Germany', latitude: 51, longitude: 10, tier: 1 },
  { name: 'Poland', latitude: 52, longitude: 19, tier: 1 },
  { name: 'Ukraine', latitude: 49, longitude: 32, tier: 1 },
  { name: 'Turkey', latitude: 39, longitude: 35, tier: 1 },
  { name: 'United Kingdom', latitude: 54, longitude: -2, tier: 1 },
  { name: 'Norway', latitude: 62, longitude: 10, tier: 1 },
  { name: 'Sweden', latitude: 63, longitude: 16, tier: 1 },
  { name: 'Finland', latitude: 64, longitude: 26, tier: 1 },
  { name: 'Italy', latitude: 43, longitude: 12, tier: 1 },
  { name: 'Pakistan', latitude: 30, longitude: 70, tier: 1 },
  { name: 'Afghanistan', latitude: 33, longitude: 66, tier: 1 },
  { name: 'Iraq', latitude: 33, longitude: 44, tier: 1 },
  { name: 'Myanmar', latitude: 21, longitude: 96, tier: 1 },
  { name: 'Thailand', latitude: 15, longitude: 101, tier: 1 },
  { name: 'Vietnam', latitude: 16, longitude: 107, tier: 1 },
  { name: 'Japan', latitude: 36, longitude: 138, tier: 1 },
  { name: 'Philippines', latitude: 12, longitude: 122, tier: 1 },
  { name: 'Papua New Guinea', latitude: -6, longitude: 144, tier: 1 },
  { name: 'New Zealand', latitude: -42, longitude: 172, tier: 1 },
  { name: 'Chile', latitude: -33, longitude: -71, tier: 1 },
  { name: 'Peru', latitude: -10, longitude: -75, tier: 1 },
  { name: 'Bolivia', latitude: -17, longitude: -64, tier: 1 },
  { name: 'Colombia', latitude: 4, longitude: -73, tier: 1 },
  { name: 'Venezuela', latitude: 7, longitude: -66, tier: 1 },
  { name: 'Paraguay', latitude: -23, longitude: -58, tier: 1 },
  { name: 'Uruguay', latitude: -33, longitude: -56, tier: 1 },
  { name: 'Antarctica', latitude: -82, longitude: 20, tier: 1 },

  /* --- tier 2: fill-in --- */
  { name: 'Portugal', latitude: 39.5, longitude: -8, tier: 2 },
  { name: 'Ireland', latitude: 53, longitude: -8, tier: 2 },
  { name: 'Iceland', latitude: 65, longitude: -18, tier: 2 },
  { name: 'Netherlands', latitude: 52.2, longitude: 5.5, tier: 2 },
  { name: 'Belgium', latitude: 50.6, longitude: 4.5, tier: 2 },
  { name: 'Switzerland', latitude: 46.8, longitude: 8.2, tier: 2 },
  { name: 'Austria', latitude: 47.6, longitude: 14.2, tier: 2 },
  { name: 'Czechia', latitude: 49.8, longitude: 15.4, tier: 2 },
  { name: 'Romania', latitude: 45.9, longitude: 25, tier: 2 },
  { name: 'Greece', latitude: 39, longitude: 22, tier: 2 },
  { name: 'Denmark', latitude: 56, longitude: 9.5, tier: 2 },
  { name: 'Belarus', latitude: 53.7, longitude: 28, tier: 2 },
  { name: 'Syria', latitude: 35, longitude: 38, tier: 2 },
  { name: 'Oman', latitude: 21, longitude: 57, tier: 2 },
  { name: 'Yemen', latitude: 15.5, longitude: 47.5, tier: 2 },
  { name: 'Uzbekistan', latitude: 41.5, longitude: 64, tier: 2 },
  { name: 'Nepal', latitude: 28.3, longitude: 84, tier: 2 },
  { name: 'Bangladesh', latitude: 24, longitude: 90, tier: 2 },
  { name: 'Sri Lanka', latitude: 7.5, longitude: 80.8, tier: 2 },
  { name: 'Malaysia', latitude: 4, longitude: 102, tier: 2 },
  { name: 'South Korea', latitude: 36.5, longitude: 127.8, tier: 2 },
  { name: 'Cambodia', latitude: 12.5, longitude: 105, tier: 2 },
  { name: 'Laos', latitude: 19, longitude: 103, tier: 2 },
  { name: 'Ghana', latitude: 8, longitude: -1.5, tier: 2 },
  { name: 'Senegal', latitude: 14.5, longitude: -14.5, tier: 2 },
  { name: 'Somalia', latitude: 6, longitude: 46, tier: 2 },
  { name: 'Zambia', latitude: -13.5, longitude: 27.8, tier: 2 },
  { name: 'Zimbabwe', latitude: -19, longitude: 29.8, tier: 2 },
  { name: 'Botswana', latitude: -22, longitude: 24, tier: 2 },
  { name: 'Cameroon', latitude: 5.7, longitude: 12.5, tier: 2 },
  { name: 'Ecuador', latitude: -1.5, longitude: -78.5, tier: 2 },
  { name: 'Guyana', latitude: 5, longitude: -58.9, tier: 2 },
  { name: 'Cuba', latitude: 21.6, longitude: -79, tier: 2 },
  { name: 'Guatemala', latitude: 15.5, longitude: -90.3, tier: 2 },
  { name: 'Panama', latitude: 8.6, longitude: -80.2, tier: 2 },
];

export const CITIES: Place[] = [
  /* --- tier 0: world cities --- */
  { name: 'London', latitude: 51.5, longitude: -0.13, tier: 0 },
  { name: 'New York', latitude: 40.71, longitude: -74.01, tier: 0 },
  { name: 'Tokyo', latitude: 35.68, longitude: 139.69, tier: 0 },
  { name: 'Paris', latitude: 48.86, longitude: 2.35, tier: 0 },
  { name: 'Beijing', latitude: 39.9, longitude: 116.41, tier: 0 },
  { name: 'Delhi', latitude: 28.61, longitude: 77.21, tier: 0 },
  { name: 'Moscow', latitude: 55.76, longitude: 37.62, tier: 0 },
  { name: 'Cairo', latitude: 30.04, longitude: 31.24, tier: 0 },
  { name: 'São Paulo', latitude: -23.55, longitude: -46.63, tier: 0 },
  { name: 'Lagos', latitude: 6.52, longitude: 3.38, tier: 0 },
  { name: 'Sydney', latitude: -33.87, longitude: 151.21, tier: 0 },
  { name: 'Los Angeles', latitude: 34.05, longitude: -118.24, tier: 0 },

  /* --- tier 1: major --- */
  { name: 'Berlin', latitude: 52.52, longitude: 13.41, tier: 1 },
  { name: 'Madrid', latitude: 40.42, longitude: -3.7, tier: 1 },
  { name: 'Rome', latitude: 41.9, longitude: 12.5, tier: 1 },
  { name: 'Istanbul', latitude: 41.01, longitude: 28.98, tier: 1 },
  { name: 'Amsterdam', latitude: 52.37, longitude: 4.9, tier: 1 },
  { name: 'Stockholm', latitude: 59.33, longitude: 18.07, tier: 1 },
  { name: 'Oslo', latitude: 59.91, longitude: 10.75, tier: 1 },
  { name: 'Warsaw', latitude: 52.23, longitude: 21.01, tier: 1 },
  { name: 'Kyiv', latitude: 50.45, longitude: 30.52, tier: 1 },
  { name: 'Dubai', latitude: 25.2, longitude: 55.27, tier: 1 },
  { name: 'Riyadh', latitude: 24.71, longitude: 46.68, tier: 1 },
  { name: 'Tehran', latitude: 35.69, longitude: 51.39, tier: 1 },
  { name: 'Karachi', latitude: 24.86, longitude: 67.0, tier: 1 },
  { name: 'Mumbai', latitude: 19.08, longitude: 72.88, tier: 1 },
  { name: 'Dhaka', latitude: 23.81, longitude: 90.41, tier: 1 },
  { name: 'Bangkok', latitude: 13.76, longitude: 100.5, tier: 1 },
  { name: 'Singapore', latitude: 1.35, longitude: 103.82, tier: 1 },
  { name: 'Jakarta', latitude: -6.21, longitude: 106.85, tier: 1 },
  { name: 'Manila', latitude: 14.6, longitude: 120.98, tier: 1 },
  { name: 'Shanghai', latitude: 31.23, longitude: 121.47, tier: 1 },
  { name: 'Hong Kong', latitude: 22.32, longitude: 114.17, tier: 1 },
  { name: 'Seoul', latitude: 37.57, longitude: 126.98, tier: 1 },
  { name: 'Nairobi', latitude: -1.29, longitude: 36.82, tier: 1 },
  { name: 'Addis Ababa', latitude: 9.03, longitude: 38.74, tier: 1 },
  { name: 'Johannesburg', latitude: -26.2, longitude: 28.05, tier: 1 },
  { name: 'Cape Town', latitude: -33.92, longitude: 18.42, tier: 1 },
  { name: 'Buenos Aires', latitude: -34.6, longitude: -58.38, tier: 1 },
  { name: 'Lima', latitude: -12.05, longitude: -77.04, tier: 1 },
  { name: 'Bogotá', latitude: 4.71, longitude: -74.07, tier: 1 },
  { name: 'Mexico City', latitude: 19.43, longitude: -99.13, tier: 1 },
  { name: 'Chicago', latitude: 41.88, longitude: -87.63, tier: 1 },
  { name: 'Toronto', latitude: 43.65, longitude: -79.38, tier: 1 },
  { name: 'Vancouver', latitude: 49.28, longitude: -123.12, tier: 1 },
  { name: 'Melbourne', latitude: -37.81, longitude: 144.96, tier: 1 },
  { name: 'Auckland', latitude: -36.85, longitude: 174.76, tier: 1 },

  /* --- tier 2: fill-in --- */
  { name: 'Lisbon', latitude: 38.72, longitude: -9.14, tier: 2 },
  { name: 'Dublin', latitude: 53.35, longitude: -6.26, tier: 2 },
  { name: 'Copenhagen', latitude: 55.68, longitude: 12.57, tier: 2 },
  { name: 'Helsinki', latitude: 60.17, longitude: 24.94, tier: 2 },
  { name: 'Vienna', latitude: 48.21, longitude: 16.37, tier: 2 },
  { name: 'Prague', latitude: 50.08, longitude: 14.44, tier: 2 },
  { name: 'Athens', latitude: 37.98, longitude: 23.73, tier: 2 },
  { name: 'Zurich', latitude: 47.38, longitude: 8.54, tier: 2 },
  { name: 'Reykjavík', latitude: 64.15, longitude: -21.94, tier: 2 },
  { name: 'Casablanca', latitude: 33.57, longitude: -7.59, tier: 2 },
  { name: 'Accra', latitude: 5.6, longitude: -0.19, tier: 2 },
  { name: 'Dakar', latitude: 14.72, longitude: -17.47, tier: 2 },
  { name: 'Kinshasa', latitude: -4.44, longitude: 15.27, tier: 2 },
  { name: 'Dar es Salaam', latitude: -6.79, longitude: 39.21, tier: 2 },
  { name: 'Khartoum', latitude: 15.5, longitude: 32.56, tier: 2 },
  { name: 'Perth', latitude: -31.95, longitude: 115.86, tier: 2 },
  { name: 'Brisbane', latitude: -27.47, longitude: 153.03, tier: 2 },
  { name: 'Santiago', latitude: -33.45, longitude: -70.67, tier: 2 },
  { name: 'Rio de Janeiro', latitude: -22.91, longitude: -43.17, tier: 2 },
  { name: 'Manaus', latitude: -3.12, longitude: -60.02, tier: 2 },
  { name: 'Caracas', latitude: 10.48, longitude: -66.9, tier: 2 },
  { name: 'Havana', latitude: 23.11, longitude: -82.37, tier: 2 },
  { name: 'Anchorage', latitude: 61.22, longitude: -149.9, tier: 2 },
  { name: 'Reykjanes', latitude: 63.85, longitude: -22.5, tier: 2 },
  { name: 'Novosibirsk', latitude: 55.03, longitude: 82.92, tier: 2 },
  { name: 'Vladivostok', latitude: 43.12, longitude: 131.89, tier: 2 },
  { name: 'Ulaanbaatar', latitude: 47.89, longitude: 106.91, tier: 2 },
  { name: 'Kathmandu', latitude: 27.72, longitude: 85.32, tier: 2 },
  { name: 'Colombo', latitude: 6.93, longitude: 79.86, tier: 2 },
  { name: 'Hanoi', latitude: 21.03, longitude: 105.85, tier: 2 },
];

/**
 * Zoom levels (0 = whole globe, 6 = closest) at which each label class
 * starts to appear.
 */
/*
 * The whole-globe default framing sits at level 3, so labelling starts
 * one step in from there: an unzoomed globe stays clean, and names build
 * up as the user pushes closer.
 */
export const COUNTRY_TIER_ZOOM: Record<Place['tier'], number> = {
  0: 4,
  1: 5,
  2: 6,
};

export const CITY_TIER_ZOOM: Record<Place['tier'], number> = {
  0: 5,
  1: 6,
  2: 6,
};
