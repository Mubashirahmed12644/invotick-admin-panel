import type { UserMapLocation } from "@/features/users-map/types";

export const CLUSTER_RADIUS_M = 10;

export type MapStyleKey = "satellite" | "voyager";

export const MAP_STYLES: Record<MapStyleKey, { label: string; tiles: string[]; attribution: string }> = {
  satellite: {
    label: "Satellite",
    tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"],
    attribution: 'Tiles &copy; <a href="https://www.esri.com/">Esri</a>',
  },
  voyager: {
    label: "Voyager",
    tiles: [
      "https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png",
      "https://b.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png",
      "https://c.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png",
    ],
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>',
  },
};

export type LocationGroup = {
  latitude: number;
  longitude: number;
  city: string | null;
  country: string | null;
  users: UserMapLocation[];
};

function metersDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dlat = (lat2 - lat1) * 111320;
  const dlng = (lng2 - lng1) * 111320 * Math.cos((lat1 * Math.PI) / 180);
  return Math.sqrt(dlat * dlat + dlng * dlng);
}

export function groupByLocation(
  users: UserMapLocation[],
  radiusMeters: number,
): LocationGroup[] {
  const assigned = new Set<string>();
  const groups: LocationGroup[] = [];

  for (const anchor of users) {
    if (assigned.has(anchor.id)) continue;

    const group: UserMapLocation[] = [];
    for (const u of users) {
      if (assigned.has(u.id)) continue;
      if (metersDistance(anchor.latitude, anchor.longitude, u.latitude, u.longitude) <= radiusMeters) {
        group.push(u);
      }
    }
    group.forEach((u) => assigned.add(u.id));

    const centerLat = group.reduce((s, u) => s + u.latitude, 0) / group.length;
    const centerLng = group.reduce((s, u) => s + u.longitude, 0) / group.length;

    groups.push({
      latitude: centerLat,
      longitude: centerLng,
      city: group.find((u) => u.city)?.city ?? null,
      country: group.find((u) => u.country)?.country ?? null,
      users: group,
    });
  }

  return groups;
}
