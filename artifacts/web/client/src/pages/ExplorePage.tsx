import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Heart, ChevronRight, Bed, Bath, Maximize, SlidersHorizontal } from "lucide-react";
import { Link } from "react-router-dom";
import { apiRequest } from "../lib/queryClient";
import { APIProvider, Map, AdvancedMarker, InfoWindow } from "@vis.gl/react-google-maps";
import { useAuth } from "../hooks/useAuth";
import { useRates } from "../hooks/useRates";
import { useFilters } from "../hooks/useFilters";
import { formatPrice, formatPriceCompact } from "../lib/formatPrice";
import { filtersToParams, hasActiveFilters, type FilterState } from "@workspace/filters";
import StandardFilters from "../components/filters/StandardFilters";
import AdvancedFiltersDialog from "../components/filters/AdvancedFiltersDialog";
import SavedSearchesMenu from "../components/filters/SavedSearchesMenu";

const MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY || "";

interface Property {
  id: string;
  title: string;
  address: string;
  city: string;
  country: string;
  price: string;
  currency: string;
  bedrooms: number;
  bathrooms: string;
  size: string;
  sizeUnit: string;
  images: string[];
  categories: string[];
  agentName: string;
  isFavorited: boolean;
  latitude: string;
  longitude: string;
  lastUpdated: string;
}

function PropertyCard({
  property,
  onFavorite,
}: {
  property: Property;
  onFavorite: (id: string) => void;
}) {
  const staleDate = new Date();
  staleDate.setDate(staleDate.getDate() - 30);
  const isStale = new Date(property.lastUpdated) < staleDate;

  return (
    <div className="border border-brand-border rounded-xl p-4 bg-white hover:shadow-md transition-shadow">
      <div className="flex gap-4">
        {/* Thumbnail */}
        <div className="w-[120px] h-[90px] rounded-lg bg-brand-input overflow-hidden shrink-0 relative">
          {property.images?.[0] ? (
            <img
              src={property.images[0]}
              alt={property.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-brand-warm text-xs">
              No image
            </div>
          )}
          {property.categories?.[0] && (
            <span className="absolute bottom-2 left-2 bg-brand-dark text-brand-offwhite text-[10px] font-semibold px-2 py-0.5 rounded uppercase">
              {property.categories[0]}
            </span>
          )}
        </div>

        {/* Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-semibold text-sm text-brand-dark truncate">
                {property.title}
              </h3>
              <p className="text-xs text-brand-warm mt-0.5">
                {property.city}, {property.country}
              </p>
            </div>
            <button
              onClick={(e) => {
                e.preventDefault();
                onFavorite(property.id);
              }}
              className="shrink-0"
            >
              <Heart
                size={18}
                className={
                  property.isFavorited
                    ? "fill-brand-dark text-brand-dark"
                    : "text-brand-warm"
                }
              />
            </button>
          </div>

          <div className="flex items-center gap-3 mt-2 text-xs text-brand-warm">
            {property.bedrooms && (
              <span className="flex items-center gap-1">
                <Bed size={12} /> {property.bedrooms}
              </span>
            )}
            {property.bathrooms && (
              <span className="flex items-center gap-1">
                <Bath size={12} /> {property.bathrooms}
              </span>
            )}
            {property.size && (
              <span className="flex items-center gap-1">
                <Maximize size={12} /> {property.size}
                {property.sizeUnit === "sqm" ? "m\u00B2" : "ft\u00B2"}
              </span>
            )}
          </div>

          <p className="text-xs text-brand-warm mt-1">
            Listed by: {property.agentName}
          </p>

          <div className="flex items-center justify-between mt-2">
            <p className="font-serif text-lg font-bold text-brand-dark">
              {formatPrice(property.price, property.currency, userCurrency, rates)}
            </p>
          </div>
        </div>
      </div>

      {isStale && (
        <div className="mt-3 bg-amber-50 border border-amber-200 text-amber-700 text-xs px-3 py-2 rounded-lg">
          This listing hasn&apos;t been updated in over 30 days
        </div>
      )}

      <Link
        to={`/properties/${property.id}`}
        className="mt-2 text-xs font-medium text-brand-dark flex items-center gap-1"
      >
        View property <ChevronRight size={12} />
      </Link>
    </div>
  );
}

export default function ExplorePage() {
  const { user } = useAuth();
  const rates = useRates();
  const userCurrency = user?.preferredCurrency;
  const { filters, setFilters, replaceFilters, resetFilters } = useFilters();
  const [selectedPin, setSelectedPin] = useState<Property | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const queryString = useMemo(() => {
    const params = filtersToParams(filters);
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined) sp.set(k, v);
    }
    return sp.toString();
  }, [filters]);

  const { data, isLoading } = useQuery({
    queryKey: ["properties", queryString],
    queryFn: async () => {
      const res = await fetch(`/api/properties?${queryString}`, {
        credentials: "include",
      });
      return res.json();
    },
  });

  const handleFavorite = async (id: string) => {
    await apiRequest(`/api/properties/${id}/favorite`, { method: "POST" });
  };

  const handleLoadSavedSearch = (next: FilterState) => {
    replaceFilters(next);
  };

  const advancedCount = filters.features.length;

  return (
    <div className="flex h-screen">
      {/* Left: Property List */}
      <div className="w-[540px] border-r border-brand-border flex flex-col bg-brand-offwhite shrink-0">
        <div className="p-6 pb-0">
          <h1 className="font-serif text-3xl font-bold text-brand-dark mb-4">
            Explore
          </h1>
          <div className="relative mb-3">
            <Search
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-warm"
            />
            <input
              type="text"
              value={filters.q}
              onChange={(e) => setFilters({ q: e.target.value, page: 1 })}
              placeholder="Search by location, type..."
              className="w-full h-11 pl-11 pr-4 bg-white border border-brand-border rounded-lg text-sm placeholder:text-brand-warm focus:outline-none focus:ring-2 focus:ring-brand-dark/20"
            />
          </div>
          <div className="mb-3">
            <StandardFilters filters={filters} setFilters={setFilters} />
          </div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <p className="text-sm text-brand-warm">
                {data?.total || 0} properties found
              </p>
              {hasActiveFilters(filters) && (
                <button
                  onClick={resetFilters}
                  className="text-xs text-brand-dark underline hover:no-underline"
                >
                  Reset all
                </button>
              )}
            </div>
            <div className="flex items-center gap-3">
              <SavedSearchesMenu filters={filters} onLoad={handleLoadSavedSearch} />
              <button
                onClick={() => setAdvancedOpen(true)}
                className="flex items-center gap-1 text-brand-warm hover:text-brand-dark text-xs"
              >
                <SlidersHorizontal size={18} />
                {advancedCount > 0 && (
                  <span className="bg-brand-dark text-brand-offwhite text-[10px] font-bold px-1.5 h-4 min-w-[16px] rounded-full inline-flex items-center justify-center">
                    {advancedCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Property list */}
        <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-3">
          {isLoading ? (
            <div className="text-center py-8 text-brand-warm">Loading...</div>
          ) : data?.properties?.length === 0 ? (
            <div className="text-center py-8 text-brand-warm">
              No properties found
            </div>
          ) : (
            data?.properties?.map((prop: Property) => (
              <PropertyCard
                key={prop.id}
                property={prop}
                onFavorite={handleFavorite}
              />
            ))
          )}
        </div>
      </div>

      {/* Right: Map */}
      <div className="flex-1 relative">
        <APIProvider apiKey={MAPS_API_KEY}>
          <Map
            defaultCenter={{ lat: 43, lng: 2 }}
            defaultZoom={4}
            gestureHandling="greedy"
            disableDefaultUI={false}
            mapId="miremont-explore"
            style={{ width: "100%", height: "100%" }}
          >
            {data?.properties?.map((prop: Property) => {
              if (!prop.latitude || !prop.longitude) return null;
              const lat = parseFloat(prop.latitude);
              const lng = parseFloat(prop.longitude);
              if (isNaN(lat) || isNaN(lng)) return null;

              const priceLabel = formatPriceCompact(prop.price, prop.currency, userCurrency, rates);

              return (
                <AdvancedMarker
                  key={prop.id}
                  position={{ lat, lng }}
                  onClick={() => setSelectedPin(prop)}
                >
                  <div className="bg-brand-dark text-brand-offwhite text-xs font-bold px-2 py-1 rounded-md shadow-lg whitespace-nowrap cursor-pointer hover:bg-brand-dark/80">
                    {priceLabel}
                  </div>
                </AdvancedMarker>
              );
            })}

            {selectedPin && selectedPin.latitude && selectedPin.longitude && (
              <InfoWindow
                position={{
                  lat: parseFloat(selectedPin.latitude),
                  lng: parseFloat(selectedPin.longitude),
                }}
                onCloseClick={() => setSelectedPin(null)}
              >
                <div className="max-w-[220px]">
                  {selectedPin.images?.[0] && (
                    <img
                      src={selectedPin.images[0]}
                      alt={selectedPin.title}
                      className="w-full h-24 object-cover rounded mb-2"
                    />
                  )}
                  <p className="font-semibold text-sm">{selectedPin.title}</p>
                  <p className="text-xs text-gray-500">
                    {selectedPin.city}, {selectedPin.country}
                  </p>
                  <p className="font-bold text-sm mt-1">
                    {formatPrice(selectedPin.price, selectedPin.currency, userCurrency, rates)}
                  </p>
                  <Link
                    to={`/properties/${selectedPin.id}`}
                    className="text-xs text-blue-600 hover:underline mt-1 block"
                  >
                    View details &rarr;
                  </Link>
                </div>
              </InfoWindow>
            )}
          </Map>
        </APIProvider>
      </div>

      <AdvancedFiltersDialog
        open={advancedOpen}
        onClose={() => setAdvancedOpen(false)}
        filters={filters}
        setFilters={setFilters}
      />
    </div>
  );
}
