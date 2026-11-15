/** Maps the point of the globe facing the viewer to a news region. Ids match pipeline/fetch_news.py. */
const BOXES: [id: string, latMin: number, latMax: number, lonMin: number, lonMax: number][] = [
  ["polar", 66, 90, -180, 180],
  ["polar", -90, -60, -180, 180],
  ["polar", 59, 84, -74, -11], // Greenland
  ["central-america", 7, 32, -118, -59],
  ["north-america", 24, 72, -168, -52],
  ["south-america", -56, 13, -82, -34],
  ["europe", 36, 71, -11, 40],
  ["middle-east", 12, 42, 34, 63],
  ["africa", -35, 37, -18, 52],
  ["south-asia", 5, 37, 60, 92],
  ["southeast-asia", -11, 20, 92, 141],
  ["east-asia", 20, 54, 92, 146],
  ["oceania", -48, -10, 110, 180],
];

/** Returns a region id, or null over open ocean / unmapped land (the app then shows global news). */
export function regionAt(lat: number, lon: number): string | null {
  for (const [id, a, b, c, d] of BOXES) if (lat >= a && lat <= b && lon >= c && lon <= d) return id;
  return null;
}
