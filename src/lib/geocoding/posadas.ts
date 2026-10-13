export const posadasSearchArea = {
  west: -56.02,
  south: -27.45,
  east: -55.84,
  north: -27.34,
  centerLatitude: -27.367,
  centerLongitude: -55.896,
} as const;

export function isInsidePosadas(latitude: number, longitude: number): boolean {
  return (
    longitude >= posadasSearchArea.west &&
    longitude <= posadasSearchArea.east &&
    latitude >= posadasSearchArea.south &&
    latitude <= posadasSearchArea.north
  );
}

export function nominatimViewbox(): string {
  const area = posadasSearchArea;
  return `${area.west},${area.north},${area.east},${area.south}`;
}

export function photonBbox(): string {
  const area = posadasSearchArea;
  return `${area.west},${area.south},${area.east},${area.north}`;
}

export function placeNameIncludes(value: string, expected: string): boolean {
  const left = normalizePlaceName(value);
  const right = normalizePlaceName(expected);
  return left === right || left.includes(right);
}

function normalizePlaceName(value: string): string {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();
}
