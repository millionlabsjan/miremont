export type FilterOption = { id: string; label: string };
export type FilterGroup = {
  id: string;
  title: string;
  options: readonly FilterOption[];
};

export const ADVANCED_GROUPS = [
  {
    id: "location",
    title: "Location",
    options: [
      { id: "walk_beach", label: "Walking distance to beach" },
      { id: "walk_center", label: "Walking distance to town/city center" },
      { id: "frontline_beach_golf", label: "Frontline beach / golf" },
      { id: "close_golf", label: "Close to golf courses" },
      { id: "close_schools", label: "Close to international schools" },
      { id: "close_marina", label: "Close to marina" },
      { id: "close_airport", label: "Close to airport" },
    ],
  },
  {
    id: "security",
    title: "Security + Privacy",
    options: [
      { id: "gated", label: "Gated community" },
      { id: "security_24h", label: "24h security" },
      { id: "alarm", label: "Alarm system" },
      { id: "private_secluded", label: "Private / secluded" },
      { id: "private_driveway", label: "Private driveway" },
    ],
  },
  {
    id: "views",
    title: "Views + Orientation",
    options: [
      { id: "sea_panoramic", label: "Panoramic sea views" },
      { id: "sea_frontline", label: "Frontline sea views" },
      { id: "view_golf", label: "Golf views" },
      { id: "view_mountain", label: "Mountain views" },
      { id: "view_unobstructed", label: "Unobstructed views" },
      { id: "all_day_sun", label: "All-day sun" },
      { id: "bright_interiors", label: "Bright interiors" },
      { id: "facing_south", label: "South-facing" },
      { id: "facing_west", label: "West-facing" },
      { id: "facing_east", label: "East-facing" },
      { id: "facing_north", label: "North-facing" },
    ],
  },
  {
    id: "outdoor",
    title: "Outdoor Living",
    options: [
      { id: "terrace_large", label: "Large terrace" },
      { id: "terrace_rooftop", label: "Rooftop terrace" },
      { id: "garden_private", label: "Private garden" },
      { id: "pool_infinity", label: "Infinity / heated pool" },
      { id: "outdoor_kitchen", label: "Outdoor kitchen / dining" },
      { id: "jacuzzi", label: "Jacuzzi / chill-out area" },
      { id: "beach_access", label: "Direct beach access" },
    ],
  },
  {
    id: "style",
    title: "Property Style + Layout",
    options: [
      { id: "brand_new", label: "Brand new / off-plan" },
      { id: "renovated", label: "Recently renovated" },
      { id: "modern", label: "Modern / contemporary" },
      { id: "luxury_finishes", label: "Luxury finishes" },
      { id: "furnished", label: "Furnished / turnkey" },
      { id: "open_plan", label: "Open-plan layout" },
      { id: "indoor_outdoor", label: "Indoor-outdoor flow" },
      { id: "guest_apartment", label: "Guest apartment" },
    ],
  },
  {
    id: "wellness",
    title: "Wellness + Lifestyle",
    options: [
      { id: "home_gym", label: "Home gym" },
      { id: "spa_sauna", label: "Spa / sauna / hammam" },
      { id: "indoor_pool", label: "Indoor pool" },
      { id: "wellness_property", label: "Wellness-style property" },
      { id: "tennis_padel", label: "Tennis / padel courts" },
    ],
  },
  {
    id: "entertainment",
    title: "Entertainment + Family",
    options: [
      { id: "entertaining_areas", label: "Large entertaining areas" },
      { id: "cinema_room", label: "Cinema room" },
      { id: "games_room", label: "Games room" },
      { id: "wine_cellar", label: "Wine cellar / bar" },
      { id: "guest_house", label: "Guest house" },
    ],
  },
  {
    id: "practical",
    title: "Practical + Services",
    options: [
      { id: "garage", label: "Private garage / parking" },
      { id: "ev_charging", label: "EV charging" },
      { id: "storage", label: "Storage / basement" },
      { id: "elevator", label: "Elevator / lift" },
      { id: "step_free", label: "Step-free access" },
      { id: "concierge", label: "Concierge / reception" },
      { id: "property_management", label: "Property management" },
      { id: "pet_friendly", label: "Pet-friendly" },
    ],
  },
] as const satisfies readonly FilterGroup[];

const FEATURE_TO_GROUP: Record<string, string> = (() => {
  const map: Record<string, string> = {};
  for (const group of ADVANCED_GROUPS) {
    for (const opt of group.options) map[opt.id] = group.id;
  }
  return map;
})();

export const FEATURE_LABELS: Record<string, string> = (() => {
  const map: Record<string, string> = {};
  for (const group of ADVANCED_GROUPS) {
    for (const opt of group.options) map[opt.id] = opt.label;
  }
  return map;
})();

export function getFeatureLabel(id: string): string {
  return FEATURE_LABELS[id] ?? id;
}

export const ALL_FEATURE_IDS: readonly string[] = Object.keys(FEATURE_TO_GROUP);

export function isValidFeatureId(id: string): boolean {
  return id in FEATURE_TO_GROUP;
}

export function groupFeaturesByCategory(
  featureIds: readonly string[]
): Map<string, string[]> {
  const grouped = new Map<string, string[]>();
  for (const id of featureIds) {
    const groupId = FEATURE_TO_GROUP[id];
    if (!groupId) continue;
    const existing = grouped.get(groupId);
    if (existing) existing.push(id);
    else grouped.set(groupId, [id]);
  }
  return grouped;
}
