# Claude Task: Add Beautiful Users Map Page to Existing Admin Panel

## Goal

Create a new admin panel page that shows app users on a beautiful interactive map using their latest latitude and longitude from the backend API.

---

## API Details

### Endpoint

```http
GET /v1/webpanel/getUsersForMap
```

### Expected Response

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "username": "john",
      "email": "john@example.com",
      "latitude": 31.5497,
      "longitude": 74.3436,
      "country": "Pakistan",
      "city": "Lahore"
    }
  ]
}
```

---

## Requirements

### 1. Create a New Admin Panel Page

Add a new page/screen in the existing admin panel for the users map.

Suggested route name:

```text
/users-map
```

or use the existing admin panel route convention if different.

The page title should be:

```text
Users Map
```

---

## 2. Use MapLibre GL JS

Do not use Google Maps.

Use:

```bash
npm install maplibre-gl
```

Also import the MapLibre CSS where required:

```ts
import "maplibre-gl/dist/maplibre-gl.css";
```

---

## 3. Map Style

Use a dark premium map style with OpenStreetMap/CARTO dark tiles.

Suggested raster tile source:

```text
https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png
https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png
https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png
```

Attribution:

```html
&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>
```

The page should look beautiful and admin-dashboard quality, not like a plain default map.

---

## 4. Data Model

Create or use an equivalent TypeScript type:

```ts
export type UserMapLocation = {
  id: string;
  username: string;
  email: string;
  latitude: number;
  longitude: number;
  country?: string | null;
  city?: string | null;
};
```

API response type:

```ts
export type GetUsersForMapResponse = {
  success: boolean;
  data: UserMapLocation[];
};
```

---

## 5. API Integration

Use the existing admin panel API client pattern.

Call:

```http
GET /v1/webpanel/getUsersForMap
```

Handle:

- loading state
- error state
- empty state
- success state

Validate coordinates before rendering:

```ts
Number.isFinite(latitude)
Number.isFinite(longitude)
latitude >= -90 && latitude <= 90
longitude >= -180 && longitude <= 180
```

Ignore invalid coordinates.

---

## 6. Map Layers

The map should include three visual layers.

### A. Heatmap Layer

Show user density using a heatmap layer.

Layer id:

```text
users-heatmap-layer
```

Source id:

```text
users-source
```

Use GeoJSON features:

```ts
{
  type: "Feature",
  properties: {
    id: user.id,
    username: user.username,
    email: user.email,
    city: user.city,
    country: user.country,
    weight: 1
  },
  geometry: {
    type: "Point",
    coordinates: [user.longitude, user.latitude]
  }
}
```

Suggested heatmap paint:

```ts
paint: {
  "heatmap-weight": [
    "interpolate",
    ["linear"],
    ["get", "weight"],
    0,
    0,
    1,
    1
  ],
  "heatmap-intensity": [
    "interpolate",
    ["linear"],
    ["zoom"],
    0,
    0.8,
    5,
    1.8,
    10,
    3.5
  ],
  "heatmap-radius": [
    "interpolate",
    ["linear"],
    ["zoom"],
    0,
    10,
    4,
    24,
    8,
    46,
    12,
    68
  ],
  "heatmap-opacity": [
    "interpolate",
    ["linear"],
    ["zoom"],
    3,
    0.9,
    10,
    0.75,
    14,
    0.2
  ],
  "heatmap-color": [
    "interpolate",
    ["linear"],
    ["heatmap-density"],
    0,
    "rgba(88, 28, 135, 0)",
    0.12,
    "rgba(59, 130, 246, 0.35)",
    0.28,
    "rgba(6, 182, 212, 0.6)",
    0.45,
    "rgba(34, 197, 94, 0.75)",
    0.62,
    "rgba(250, 204, 21, 0.85)",
    0.8,
    "rgba(249, 115, 22, 0.95)",
    1,
    "rgba(239, 68, 68, 1)"
  ]
}
```

### B. Glow Layer

Show a soft glow around user points when zoomed in.

Layer id:

```text
user-glow-layer
```

Suggested paint:

```ts
paint: {
  "circle-radius": [
    "interpolate",
    ["linear"],
    ["zoom"],
    8,
    8,
    12,
    16,
    16,
    28
  ],
  "circle-color": "rgba(59, 130, 246, 0.35)",
  "circle-blur": 0.9,
  "circle-opacity": [
    "interpolate",
    ["linear"],
    ["zoom"],
    8,
    0.15,
    12,
    0.45,
    16,
    0.7
  ]
}
```

### C. User Point Layer

Show individual user dots on higher zoom.

Layer id:

```text
user-point-layer
```

Suggested paint:

```ts
paint: {
  "circle-radius": [
    "interpolate",
    ["linear"],
    ["zoom"],
    9,
    3,
    13,
    5,
    16,
    7
  ],
  "circle-color": "#38bdf8",
  "circle-stroke-color": "#ffffff",
  "circle-stroke-width": 1.5,
  "circle-opacity": [
    "interpolate",
    ["linear"],
    ["zoom"],
    9,
    0.45,
    13,
    0.9
  ]
}
```

---

## 7. User Interaction

When the admin clicks a user dot:

Show a side card, popup, drawer, or tooltip with:

- Username
- Email
- City
- Country
- Latitude
- Longitude

Do not expose internal map feature ids in the UI.

The clickable layer should be:

```text
user-point-layer
```

Add pointer cursor on hover.

---

## 8. Premium UI Requirements

The page should include:

### Header Card

Show:

- title: `Live User Map`
- total valid user locations
- short description: `Heatmap density based on latest user coordinates`

### Legend Card

Show activity levels:

- Low Activity
- Medium
- High

Use colored glowing dots:
- blue for low
- yellow for medium
- red for high

### Map Container

Use:

- full available page height
- rounded corners if consistent with admin panel
- dark background fallback
- subtle overlay/vignette for premium look
- responsive layout

Example visual treatment:

```ts
className="relative h-[calc(100vh-120px)] w-full overflow-hidden rounded-2xl bg-slate-950"
```

Adjust height/classes according to existing project styling.

---

## 9. Recommended Component Structure

Use the existing project structure. If no strict pattern exists, create something like:

```text
src/
  app/
    users-map/
      page.tsx
  components/
    users-map/
      BeautifulUsersMap.tsx
      UserMapInfoCard.tsx
      UserMapLegend.tsx
  services/
    users-map.service.ts
  types/
    users-map.types.ts
```

If the project already has a feature-based structure, follow that instead.

---

## 10. Implementation Notes

### Important

MapLibre must run only on the client side.

If using Next.js App Router, the map component must start with:

```ts
"use client";
```

Avoid server-side access to:

```ts
window
document
maplibregl
```

Initialize the map inside `useEffect`.

Destroy the map on unmount:

```ts
return () => {
  map.remove();
};
```

---

## 11. GeoJSON Creation

Convert valid API users into GeoJSON:

```ts
const geoJson: GeoJSON.FeatureCollection<GeoJSON.Point> = {
  type: "FeatureCollection",
  features: validUsers.map((user) => ({
    type: "Feature",
    properties: {
      id: user.id,
      username: user.username,
      email: user.email,
      city: user.city ?? "",
      country: user.country ?? "",
      weight: 1
    },
    geometry: {
      type: "Point",
      coordinates: [user.longitude, user.latitude]
    }
  }))
};
```

---

## 12. Fit Map to User Locations

After data is loaded, if there are valid users, fit the map bounds to all valid locations.

Example logic:

```ts
const bounds = new maplibregl.LngLatBounds();

validUsers.forEach((user) => {
  bounds.extend([user.longitude, user.latitude]);
});

map.fitBounds(bounds, {
  padding: 80,
  maxZoom: 10,
  duration: 900
});
```

If no users exist, use a default center:

```ts
center: [73.0479, 33.6844]
zoom: 4.5
```

---

## 13. Loading State

While fetching data, show a beautiful loading overlay/card:

```text
Loading user map...
```

Do not render an ugly blank page.

---

## 14. Error State

If the API fails, show a clean admin-panel error card:

```text
Unable to load user map.
Please try again.
```

Add a retry button if the existing design system supports it.

---

## 15. Empty State

If the API succeeds but no valid coordinates exist, show:

```text
No user locations available.
```

Still render the map with the default center if appropriate.

---

## 16. Acceptance Criteria

The task is complete when:

- A new admin panel page exists for the users map.
- The page calls `GET /v1/webpanel/getUsersForMap`.
- Valid user coordinates are rendered on a MapLibre map.
- A heatmap layer shows density.
- Individual user dots appear on higher zoom.
- Clicking a user dot shows user details.
- Invalid coordinates are ignored safely.
- Loading, error, and empty states are handled.
- The UI looks polished, dark, modern, and premium.
- The implementation follows existing project architecture and styling conventions.
- No Google Maps API key, Google Cloud project, or billing setup is required.

---

## 17. Do Not Do

Do not use Google Maps.

Do not add Google Maps API key configuration.

Do not add billing-related setup.

Do not show raw JSON response directly on the page.

Do not render invalid latitude/longitude values.

Do not break existing admin panel routing/layout/sidebar.

Do not rewrite unrelated admin panel code.

---

## 18. Final Expected Result

Admin can open the new users map page and see a beautiful dark interactive map with glowing heatmap density. As the admin zooms in, individual user dots appear. Clicking a dot shows the selected user's username, email, city, country, latitude, and longitude.
