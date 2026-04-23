import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Share2, Heart, MapPin, Bed, Bath, Maximize, Calendar } from "lucide-react";
import { useState } from "react";
import { apiRequest } from "../lib/queryClient";
import { APIProvider, Map, AdvancedMarker } from "@vis.gl/react-google-maps";

const MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY || "";

export default function PropertyDetailPage() {
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState("description");
  const [activeImage, setActiveImage] = useState(0);

  const { data: property, isLoading } = useQuery({
    queryKey: ["property", id],
    queryFn: async () => {
      const res = await fetch(`/api/properties/${id}`, { credentials: "include" });
      if (!res.ok) throw new Error("Not found");
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-dark" />
      </div>
    );
  }

  if (!property) {
    return (
      <div className="p-8 text-center">
        <p className="text-brand-warm">Property not found</p>
      </div>
    );
  }

  const images = property.images || [];
  const tabs = ["Description", "Features", "Location"];

  return (
    <div className="p-8 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <Link
          to="/explore"
          className="flex items-center gap-2 text-sm text-brand-dark hover:underline"
        >
          <ArrowLeft size={16} /> Back to all
        </Link>
        <div className="flex gap-3">
          <button className="text-brand-warm hover:text-brand-dark">
            <Share2 size={20} />
          </button>
          <button
            onClick={() => apiRequest(`/api/properties/${id}/favorite`, { method: "POST" })}
            className="text-brand-warm hover:text-brand-dark"
          >
            <Heart
              size={20}
              className={property.isFavorited ? "fill-brand-dark text-brand-dark" : ""}
            />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8">
        {/* Left: Gallery + Content */}
        <div>
          {/* Main image */}
          <div className="aspect-[16/10] rounded-xl overflow-hidden bg-brand-input mb-3">
            {images[activeImage] ? (
              <img
                src={images[activeImage]}
                alt={property.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-brand-warm">
                No images
              </div>
            )}
          </div>

          {/* Thumbnails */}
          {images.length > 1 && (
            <div className="flex gap-2 mb-6 overflow-x-auto">
              {images.map((img: string, i: number) => (
                <button
                  key={i}
                  onClick={() => setActiveImage(i)}
                  className={`w-20 h-16 rounded-lg overflow-hidden shrink-0 border-2 ${
                    i === activeImage
                      ? "border-brand-dark"
                      : "border-transparent"
                  }`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-6 border-b border-brand-border mb-6">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab.toLowerCase())}
                className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.toLowerCase()
                    ? "border-brand-dark text-brand-dark"
                    : "border-transparent text-brand-warm hover:text-brand-dark"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Tab content */}
          {activeTab === "description" && (
            <div className="prose prose-sm max-w-none text-brand-dark/80">
              <p className="whitespace-pre-wrap">{property.description || "No description available."}</p>
            </div>
          )}
          {activeTab === "features" && (
            <div className="grid grid-cols-2 gap-3">
              {(property.features || []).map((f: string, i: number) => (
                <div
                  key={i}
                  className="flex items-center gap-2 text-sm text-brand-dark/80"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-brand-dark" />
                  {f}
                </div>
              ))}
            </div>
          )}
          {activeTab === "location" && (
            <div>
              <p className="text-sm text-brand-dark/80 flex items-center gap-2 mb-4">
                <MapPin size={16} />
                {property.address || `${property.city}, ${property.country}`}
              </p>
              {property.latitude && property.longitude ? (
                <div className="h-80 rounded-xl overflow-hidden">
                  <APIProvider apiKey={MAPS_API_KEY}>
                    <Map
                      defaultCenter={{
                        lat: parseFloat(property.latitude),
                        lng: parseFloat(property.longitude),
                      }}
                      defaultZoom={14}
                      gestureHandling="greedy"
                      mapId="miremont-detail"
                      style={{ width: "100%", height: "100%" }}
                    >
                      <AdvancedMarker
                        position={{
                          lat: parseFloat(property.latitude),
                          lng: parseFloat(property.longitude),
                        }}
                      >
                        <div className="bg-brand-dark text-brand-offwhite text-xs font-bold px-2 py-1 rounded-md shadow-lg">
                          {property.currency === "GBP" ? "\u00A3" : "$"}{" "}
                          {Number(property.price).toLocaleString()}
                        </div>
                      </AdvancedMarker>
                    </Map>
                  </APIProvider>
                </div>
              ) : (
                <div className="h-64 bg-brand-input rounded-xl flex items-center justify-center text-brand-warm">
                  No location data
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Details Card */}
        <div className="space-y-4">
          <div className="border border-brand-border rounded-xl p-6 bg-white">
            <h1 className="font-serif text-2xl font-bold text-brand-dark mb-1">
              {property.title}
            </h1>
            <p className="text-sm text-brand-warm flex items-center gap-1 mb-4">
              <MapPin size={14} />
              {property.city}, {property.country}
            </p>

            <p className="font-serif text-3xl font-bold text-brand-dark mb-2">
              {property.currency === "GBP" ? "\u00A3" : "$"}{" "}
              {Number(property.price).toLocaleString()}
            </p>

            {/* Property specs */}
            <div className="grid grid-cols-2 gap-3 mt-4">
              {property.bedrooms && (
                <div className="border border-brand-border rounded-lg p-3">
                  <p className="text-[10px] uppercase text-brand-warm font-semibold">
                    Bedrooms
                  </p>
                  <p className="text-lg font-bold">{property.bedrooms}</p>
                </div>
              )}
              {property.bathrooms && (
                <div className="border border-brand-border rounded-lg p-3">
                  <p className="text-[10px] uppercase text-brand-warm font-semibold">
                    Bathrooms
                  </p>
                  <p className="text-lg font-bold">{property.bathrooms}</p>
                </div>
              )}
              {property.size && (
                <div className="border border-brand-border rounded-lg p-3">
                  <p className="text-[10px] uppercase text-brand-warm font-semibold">
                    Size
                  </p>
                  <p className="text-lg font-bold">
                    {property.size} {property.sizeUnit === "sqm" ? "m\u00B2" : "ft\u00B2"}
                  </p>
                </div>
              )}
              {property.yearBuilt && (
                <div className="border border-brand-border rounded-lg p-3">
                  <p className="text-[10px] uppercase text-brand-warm font-semibold">
                    Year Built
                  </p>
                  <p className="text-lg font-bold">{property.yearBuilt}</p>
                </div>
              )}
            </div>

            <Link
              to={`/chat?property=${property.id}`}
              className="block w-full mt-4 h-12 bg-brand-dark text-brand-offwhite text-sm font-semibold rounded-lg flex items-center justify-center hover:bg-brand-dark/90 transition-colors"
            >
              Contact agent
            </Link>

            <button className="w-full mt-2 h-12 bg-white border border-brand-border text-sm font-medium rounded-lg flex items-center justify-center gap-2 hover:bg-brand-input transition-colors">
              <Heart size={16} />
              Save to Activity
            </button>

            {/* Agent info */}
            {property.agent && (
              <div className="mt-4 pt-4 border-t border-brand-border">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-brand-input" />
                  <div>
                    <p className="text-sm font-medium">
                      Listed by: {property.agent.agencyName || property.agent.name}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
