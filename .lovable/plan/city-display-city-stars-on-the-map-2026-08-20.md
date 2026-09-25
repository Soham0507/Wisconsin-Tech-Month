# City display + city stars on the map

Two fixes, both rooted in how city values are stored.

## What's happening now

The submit form's autocomplete saves cities with a state suffix (`"Green Bay, WI"`). Two consequences:

1. Event cards, the event page, admin lists and popovers print `"Green Bay, WI"` instead of `"Green Bay"`.
2. The map matches cities against a lookup keyed by bare names (`"Green Bay"`), so `"Green Bay, WI"` matches nothing and the event never lights up a hub — the map looks empty even when events exist.

## Fix 1 — Display city only

Add a `displayCity()` helper that strips a trailing `, XX` state code (and trims). Use it everywhere a city is rendered:

- Event cards (calendar, home, week pages, related events)
- Event detail page (location line and "More from {city}")
- Map popover event rows
- Admin queue / admin dashboard city labels

Stored data stays untouched — the suffix is still saved and still used for search/filtering, so nothing breaks. Out-of-state cities keep their state code (`"Chicago, IL"`) since the state is meaningful there; only Wisconsin cities render bare.

## Fix 2 — Region matching ignores the state suffix

Normalize the city before the hub lookup, so `"Green Bay, WI"` resolves to the Fox Valley hub the same way `"Green Bay"` does. This alone makes existing events appear on the map.

## Fix 3 — Unknown cities get their own smaller light

Cities that aren't tied to one of the eight hubs currently vanish from the map. Instead they render as their own star:

- Add a coordinate table for Wisconsin cities (latitude/longitude), projected into the map's 500x600 viewBox with the same transform used for the state outline, so each city lands in its true geographic spot.
- These render as smaller, dimmer teal stars than hub stars, with a smaller uppercase label, and are excluded from the hub-to-hub constellation lines.
- Clicking or hovering one opens the same popover, listing that city's events and a "View all {city} events" link.
- Cities with no coordinates (out-of-state, `Virtual`, `Statewide`, `Midwest-wide`) stay off the map — the calendar still lists them.

## Technical notes

- `src/lib/wtm-data.ts`: add `displayCity()`, `normalizeCityKey()`, a `WI_CITY_COORDS` lon/lat table, and a `projectToMap()` helper matching the existing outline projection (uniform scale, 30px padding). `resolveRegionId()` uses the normalized key; `buildMapData()` returns an extra `cityNodes` bucket for unmatched-but-locatable cities.
- `src/components/wtm/StarMap.tsx`: accept `cityNodes`, render a `CityStar` variant (r 3.5–5, ~0.7 opacity, 8px label), and extend the popover to handle a city node as well as a region.
- Callers passing map data (`src/routes/index.tsx`, `src/routes/map.tsx`) forward the new bucket.
- Display-only changes in `EventCard.tsx`, `event.$id.tsx`, `admin.queue.tsx`, `admin.index.tsx`.
