/**
 * Zones the listener can focus on. Each is one latitude/longitude box cut out of the map.
 * Ids and boxes must match pipeline/zones.py, which computes the data of every zone.
 */
export interface Zone {
  id: string;
  label: string;
  lat: [min: number, max: number];
  lon: [min: number, max: number];
}

export const ZONES: Zone[] = [
  { id: "north-america", label: "North America", lat: [24, 72], lon: [-168, -52] },
  { id: "central-america", label: "Mexico, Central America & Caribbean", lat: [7, 32], lon: [-118, -59] },
  { id: "south-america", label: "South America", lat: [-56, 13], lon: [-82, -34] },
  { id: "europe", label: "Europe", lat: [36, 71], lon: [-11, 40] },
  { id: "africa", label: "Africa", lat: [-35, 37], lon: [-18, 52] },
  { id: "middle-east", label: "Middle East", lat: [12, 42], lon: [34, 63] },
  { id: "south-asia", label: "South Asia", lat: [5, 37], lon: [60, 92] },
  { id: "east-asia", label: "East Asia", lat: [20, 54], lon: [92, 146] },
  { id: "southeast-asia", label: "Southeast Asia", lat: [-11, 20], lon: [92, 141] },
  { id: "oceania", label: "Australia & Pacific", lat: [-48, -10], lon: [110, 180] },
  { id: "arctic", label: "Arctic", lat: [60, 90], lon: [-180, 180] },
];

export const zoneById = (id: string | null) => ZONES.find((z) => z.id === id) ?? null;

/** Smallest zone that contains this point, so Mexico wins over North America where they overlap. */
export function zoneAt(lat: number, lon: number): Zone | null {
  const area = (z: Zone) => (z.lat[1] - z.lat[0]) * (z.lon[1] - z.lon[0]);
  return ZONES.filter((z) => lat >= z.lat[0] && lat <= z.lat[1] && lon >= z.lon[0] && lon <= z.lon[1]).sort((a, b) => area(a) - area(b))[0] ?? null;
}

/** CSS that shows only the zone of an equirectangular image as the background of a box. */
export function zoneBackground(src: string, z: Zone): React.CSSProperties {
  const w = (z.lon[1] - z.lon[0]) / 360;
  const h = (z.lat[1] - z.lat[0]) / 180;
  const x = w < 1 ? (z.lon[0] + 180) / 360 / (1 - w) : 0;
  const y = h < 1 ? (90 - z.lat[1]) / 180 / (1 - h) : 0;
  return {
    backgroundImage: `url("${src}")`,
    backgroundSize: `${100 / w}% ${100 / h}%`,
    backgroundPosition: `${x * 100}% ${y * 100}%`,
    aspectRatio: String(Math.min(2.6, Math.max(1, (z.lon[1] - z.lon[0]) / (z.lat[1] - z.lat[0])))),
  };
}
