"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "maplibre-gl/dist/maplibre-gl.css";
import type { UserMapLocation, SelectedCluster } from "@/features/users-map/types";
import type { ViewMode } from "@/features/users-map/UsersMapDashboard";
import { groupByLocation, CLUSTER_RADIUS_M, MAP_STYLES, type MapStyleKey } from "@/features/users-map/utils";
import UserMapClusterCard from "@/features/users-map/components/UserMapClusterCard";
import UserMapLegend from "@/features/users-map/components/UserMapLegend";
import UserMapStats from "@/features/users-map/components/UserMapStats";

function isValidCoord(lat: number, lng: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

function buildClusterGeoJson(
  groups: ReturnType<typeof groupByLocation>,
): GeoJSON.FeatureCollection<GeoJSON.Point> {
  return {
    type: "FeatureCollection",
    features: groups.map((g) => ({
      type: "Feature" as const,
      properties: {
        count: g.users.length,
        city: g.city ?? "",
        country: g.country ?? "",
        usersJson: JSON.stringify(g.users),
        latitude: g.latitude,
        longitude: g.longitude,
      },
      geometry: { type: "Point" as const, coordinates: [g.longitude, g.latitude] },
    })),
  };
}

interface UsersMapViewProps {
  users: UserMapLocation[];
  clusterThreshold: number;
  viewMode: ViewMode;
  mapStyle: MapStyleKey;
}

export default function UsersMapView({ users, clusterThreshold, viewMode, mapStyle }: UsersMapViewProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("maplibre-gl").Map | null>(null);
  const mapLoadedRef = useRef(false);
  const mapStyleRef = useRef(mapStyle);
  mapStyleRef.current = mapStyle;
  const [selectedCluster, setSelectedCluster] = useState<SelectedCluster | null>(null);

  const validUsers = useMemo(
    () => users.filter((u) => isValidCoord(u.latitude, u.longitude)),
    [users],
  );

  const allGroups = useMemo(
    () => groupByLocation(validUsers, CLUSTER_RADIUS_M),
    [validUsers],
  );

  const stats = useMemo(() => ({
    total: validUsers.length,
    countries: new Set(validUsers.map((u) => u.country).filter(Boolean)).size,
    cities: new Set(validUsers.map((u) => u.city).filter(Boolean)).size,
  }), [validUsers]);

  // Three GeoJSON sets: above threshold, below threshold (count > 1), singles (count === 1)
  const aboveGeoJson = useMemo(
    () => buildClusterGeoJson(allGroups.filter((g) => g.users.length >= clusterThreshold)),
    [allGroups, clusterThreshold],
  );
  const belowGeoJson = useMemo(
    () => buildClusterGeoJson(allGroups.filter((g) => g.users.length > 1 && g.users.length < clusterThreshold)),
    [allGroups, clusterThreshold],
  );
  const singleGeoJson = useMemo(
    () => buildClusterGeoJson(allGroups.filter((g) => g.users.length === 1)),
    [allGroups],
  );

  // Heatmap uses all raw user points
  const heatGeoJson = useMemo<GeoJSON.FeatureCollection<GeoJSON.Point>>(
    () => ({
      type: "FeatureCollection",
      features: validUsers.map((u) => ({
        type: "Feature" as const,
        properties: {},
        geometry: { type: "Point" as const, coordinates: [u.longitude, u.latitude] },
      })),
    }),
    [validUsers],
  );

  const aboveGeoJsonRef = useRef(aboveGeoJson);
  const belowGeoJsonRef = useRef(belowGeoJson);
  const singleGeoJsonRef = useRef(singleGeoJson);
  const heatGeoJsonRef = useRef(heatGeoJson);
  aboveGeoJsonRef.current = aboveGeoJson;
  belowGeoJsonRef.current = belowGeoJson;
  singleGeoJsonRef.current = singleGeoJson;
  heatGeoJsonRef.current = heatGeoJson;

  // Update sources when data changes
  useEffect(() => {
    if (!mapLoadedRef.current || !mapRef.current) return;
    const map = mapRef.current;
    (map.getSource("above-source") as import("maplibre-gl").GeoJSONSource | undefined)?.setData(aboveGeoJson);
    (map.getSource("below-source") as import("maplibre-gl").GeoJSONSource | undefined)?.setData(belowGeoJson);
    (map.getSource("single-source") as import("maplibre-gl").GeoJSONSource | undefined)?.setData(singleGeoJson);
    (map.getSource("users-heat-source") as import("maplibre-gl").GeoJSONSource | undefined)?.setData(heatGeoJson);
  }, [aboveGeoJson, belowGeoJson, singleGeoJson, heatGeoJson]);

  // Toggle layer visibility
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoadedRef.current) return;
    const setVis = (layers: string[], visible: boolean) => {
      const v = visible ? "visible" : "none";
      layers.forEach((l) => { if (map.getLayer(l)) map.setLayoutProperty(l, "visibility", v); });
    };
    setVis(["above-glow", "above-circle", "above-count"], viewMode.above);
    setVis(["below-glow", "below-circle", "below-count"], viewMode.below);
    setVis(["single-dot"], viewMode.below);
  }, [viewMode]);

  // Swap base tile source
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoadedRef.current) return;
    const style = MAP_STYLES[mapStyle];
    if (map.getLayer("base-layer")) map.removeLayer("base-layer");
    if (map.getSource("base-source")) map.removeSource("base-source");
    map.addSource("base-source", { type: "raster", tiles: style.tiles, tileSize: 256, attribution: style.attribution });
    map.addLayer({ id: "base-layer", type: "raster", source: "base-source" }, "users-heatmap-layer");
  }, [mapStyle]);

  const handleClose = useCallback(() => setSelectedCluster(null), []);

  const handleClusterClick = useCallback((e: { features?: { properties: Record<string, unknown> }[] }) => {
    const feature = e.features?.[0];
    if (!feature?.properties) return;
    const p = feature.properties;
    let parsedUsers: UserMapLocation[] = [];
    try { parsedUsers = JSON.parse(p.usersJson as string) as UserMapLocation[]; } catch { return; }
    setSelectedCluster({
      count: p.count as number,
      latitude: p.latitude as number,
      longitude: p.longitude as number,
      city: (p.city as string) || null,
      country: (p.country as string) || null,
      users: parsedUsers,
    });
  }, []);

  useEffect(() => {
    if (!mapContainerRef.current) return;
    let map: import("maplibre-gl").Map;

    const initMap = async () => {
      const maplibregl = (await import("maplibre-gl")).default;

      map = new maplibregl.Map({
        container: mapContainerRef.current!,
        style: {
          version: 8,
          glyphs: "https://fonts.openmaptiles.org/{fontstack}/{range}.pbf",
          sources: {
            "base-source": {
              type: "raster",
              tiles: MAP_STYLES[mapStyleRef.current].tiles,
              tileSize: 256,
              attribution: MAP_STYLES[mapStyleRef.current].attribution,
            },
          },
          layers: [{ id: "base-layer", type: "raster", source: "base-source" }],
        },
        center: [73.0479, 33.6844],
        zoom: 4.5,
        minZoom: 2,
        renderWorldCopies: false,
        attributionControl: false,
      });

      map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");
      mapRef.current = map;

      map.on("load", () => {
        mapLoadedRef.current = true;

        map.addSource("users-heat-source", { type: "geojson", data: heatGeoJsonRef.current });
        map.addSource("above-source", { type: "geojson", data: aboveGeoJsonRef.current });
        map.addSource("below-source", { type: "geojson", data: belowGeoJsonRef.current });
        map.addSource("single-source", { type: "geojson", data: singleGeoJsonRef.current });

        // Heatmap (raw points, low zoom only)
        map.addLayer({
          id: "users-heatmap-layer", type: "heatmap", source: "users-heat-source", maxzoom: 10,
          paint: {
            "heatmap-weight": 1,
            "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 0, 1, 6, 2.5, 10, 4],
            "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 0, 12, 4, 30, 8, 55, 12, 75],
            "heatmap-opacity": ["interpolate", ["linear"], ["zoom"], 3, 0.9, 8, 0.7, 10, 0],
            "heatmap-color": [
              "interpolate", ["linear"], ["heatmap-density"],
              0, "rgba(0,0,100,0)", 0.1, "rgba(29,53,131,0.4)", 0.25, "rgba(56,189,248,0.7)",
              0.45, "rgba(16,185,129,0.85)", 0.65, "rgba(250,204,21,0.92)",
              0.85, "rgba(249,115,22,1)", 1, "rgba(239,68,68,1)",
            ],
          },
        });

        // Layer order: single (bottom) → below → above (top)
        // Single-user dots — added first so they render below all clusters
        map.addLayer({ id: "single-dot", type: "circle", source: "single-source", paint: {
          "circle-color": "#64748b",
          "circle-radius": 5,
          "circle-stroke-color": "rgba(255,255,255,0.8)",
          "circle-stroke-width": 1.5,
        }});

        // Below-threshold clusters — amber (middle layer)
        map.addLayer({ id: "below-glow", type: "circle", source: "below-source",
          layout: { "circle-sort-key": ["get", "count"] },
          paint: {
            "circle-color": "rgba(180,83,9,0.1)",
            "circle-radius": ["interpolate", ["linear"], ["get", "count"], 1, 26, 10, 38, 50, 54],
            "circle-blur": 0.6,
          }});
        map.addLayer({ id: "below-circle", type: "circle", source: "below-source",
          layout: { "circle-sort-key": ["get", "count"] },
          paint: {
            "circle-color": ["step", ["get", "count"], "#b45309", 10, "#d97706", 50, "#f59e0b"],
            "circle-radius": ["interpolate", ["linear"], ["get", "count"], 1, 16, 10, 24, 50, 34],
            "circle-stroke-color": ["step", ["get", "count"], "rgba(217,119,6,0.7)", 10, "rgba(245,158,11,0.7)", 50, "rgba(252,211,77,0.7)"],
            "circle-stroke-width": 2.5,
          }});
        map.addLayer({ id: "below-count", type: "symbol", source: "below-source", layout: {
          "text-field": ["to-string", ["get", "count"]],
          "text-font": ["Open Sans Bold"],
          "text-size": ["step", ["get", "count"], 11, 10, 13, 50, 15],
          "symbol-sort-key": ["*", ["get", "count"], -1],
        }, paint: { "text-color": "#fff", "text-halo-color": "rgba(0,0,0,0.4)", "text-halo-width": 1 }});

        // Above-threshold clusters — violet (top layer, added last)
        map.addLayer({ id: "above-glow", type: "circle", source: "above-source",
          layout: { "circle-sort-key": ["get", "count"] },
          paint: {
            "circle-color": "rgba(109,40,217,0.12)",
            "circle-radius": ["interpolate", ["linear"], ["get", "count"], 1, 26, 10, 38, 50, 54],
            "circle-blur": 0.6,
          }});
        map.addLayer({ id: "above-circle", type: "circle", source: "above-source",
          layout: { "circle-sort-key": ["get", "count"] },
          paint: {
            "circle-color": ["step", ["get", "count"], "#6d28d9", 10, "#7c3aed", 50, "#8b5cf6"],
            "circle-radius": ["interpolate", ["linear"], ["get", "count"], 1, 16, 10, 24, 50, 34],
            "circle-stroke-color": ["step", ["get", "count"], "rgba(167,139,250,0.7)", 10, "rgba(196,181,253,0.7)", 50, "rgba(221,214,254,0.7)"],
            "circle-stroke-width": 2.5,
          }});
        map.addLayer({ id: "above-count", type: "symbol", source: "above-source", layout: {
          "text-field": ["to-string", ["get", "count"]],
          "text-font": ["Open Sans Bold"],
          "text-size": ["step", ["get", "count"], 11, 10, 13, 50, 15],
          "symbol-sort-key": ["*", ["get", "count"], -1],
        }, paint: { "text-color": "#fff", "text-halo-color": "rgba(0,0,0,0.4)", "text-halo-width": 1 }});

        // Click handlers
        map.on("click", "above-circle", handleClusterClick as Parameters<typeof map.on>[1]);
        map.on("click", "below-circle", handleClusterClick as Parameters<typeof map.on>[1]);
        map.on("click", "single-dot", handleClusterClick as Parameters<typeof map.on>[1]);

        for (const layer of ["above-circle", "below-circle", "single-dot"]) {
          map.on("mouseenter", layer, () => { map.getCanvas().style.cursor = "pointer"; });
          map.on("mouseleave", layer, () => { map.getCanvas().style.cursor = ""; });
        }

        // Apply initial viewMode visibility
        const initVis = (layers: string[], visible: boolean) => {
          const v = visible ? "visible" : "none";
          layers.forEach((l) => map.setLayoutProperty(l, "visibility", v));
        };
        initVis(["above-glow", "above-circle", "above-count"], viewMode.above);
        initVis(["below-glow", "below-circle", "below-count"], viewMode.below);
        initVis(["single-dot"], viewMode.below);

        if (validUsers.length > 0) {
          const bounds = new maplibregl.LngLatBounds();
          validUsers.forEach((u) => bounds.extend([u.longitude, u.latitude]));
          map.fitBounds(bounds, { padding: 80, maxZoom: 10, duration: 900 });
        }
      });
    };

    void initMap();
    return () => {
      mapLoadedRef.current = false;
      map?.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="users-map-container">
      <div ref={mapContainerRef} className="users-map-canvas" />

      <div className="users-map-overlay-tl">
        <UserMapStats total={stats.total} countries={stats.countries} cities={stats.cities} />
      </div>

      <div className="users-map-overlay-bl">
        <UserMapLegend />
      </div>

      {selectedCluster ? (
        <div className="users-map-overlay-br">
          <UserMapClusterCard cluster={selectedCluster} onClose={handleClose} />
        </div>
      ) : null}
    </div>
  );
}
