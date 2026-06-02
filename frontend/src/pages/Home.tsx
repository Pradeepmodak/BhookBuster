import { useSearchParams } from "react-router-dom";
import { useAppData } from "../context/AppContext";
import { useEffect, useMemo, useState } from "react";
import type { IRestaurant } from "../types";
import axios from "axios";
import { restaurantService } from "../config";
import RestaurantCard from "../components/RestaurantCard";
import DishSearchResultCard from "../components/DishSearchResultCard";
import { motion } from "framer-motion";
import { FiFilter, FiMapPin, FiSearch, FiStar, FiTrendingUp, FiZap } from "react-icons/fi";

type RestaurantWithDistance = IRestaurant & {
  distanceKm?: number;
};

const Home = () => {
  const { location, fetchLocation, loadingLocation, city } = useAppData();
  const [searchParams] = useSearchParams();
  const search = searchParams.get("search") || "";

  const [restaurants, setRestaurants] = useState<RestaurantWithDistance[]>([]);
  const [loading, setLoading] = useState(true);
  const [showOpenOnly, setShowOpenOnly] = useState(false);
  const [sortBy, setSortBy] = useState<"smart" | "distance" | "name">("smart");
  const [semanticResults, setSemanticResults] = useState<any[]>([]);
  const [forYou, setForYou] = useState<any[]>([]);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);

  const getDistanceKm = ({
    lat1,
    lon1,
    lat2,
    lon2,
  }: {
    lat1: number;
    lon1: number;
    lat2: number;
    lon2: number;
  }): number => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return +(R * c).toFixed(2);
  };

  const fetchRestaurants = async (signal?: AbortSignal) => {
    if (!location?.latitude || !location?.longitude) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      if (search.trim()) {
        const { data } = await axios.post(
          `${restaurantService}/api/search/semantic`,
          {
            query: search,
            latitude: location.latitude,
            longitude: location.longitude,
            radiusKm: 15,
          },
          {
            signal,
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );
        if (!signal?.aborted) {
          setSemanticResults(data.results ?? []);
          setRestaurants([]);
        }
      } else {
        if (!signal?.aborted) {
          setSemanticResults([]);
        }
        const { data } = await axios.get(`${restaurantService}/api/restaurant/all`, {
          signal,
          params: {
            latitude: location.latitude,
            longitude: location.longitude,
            search,
          },
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });
        if (!signal?.aborted) {
          setRestaurants(data.restaurants ?? []);
        }
      }
    } catch (error: any) {
      if (error?.name !== "CanceledError") {
        console.log(error);
      }
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  };

  const fetchRecommendations = async (signal?: AbortSignal) => {
    const token = localStorage.getItem("token");
    if (!token || !location?.latitude || !location?.longitude) return;

    try {
      setLoadingRecommendations(true);
      const { data } = await axios.get(`${restaurantService}/api/recommendations/home`, {
        signal,
        params: {
          latitude: location.latitude,
          longitude: location.longitude,
          radiusKm: 15,
        },
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!signal?.aborted) {
        setForYou(data.forYou ?? []);
      }
    } catch (error: any) {
      if (error?.name !== "CanceledError") {
        console.error("Failed to fetch recommendations:", error);
      }
    } finally {
      if (!signal?.aborted) {
        setLoadingRecommendations(false);
      }
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    fetchRestaurants(controller.signal);
    fetchRecommendations(controller.signal);
    
    return () => {
      controller.abort();
    };
  }, [location, search]);

  const visibleRestaurants = useMemo(() => {
    const base = showOpenOnly ? restaurants.filter((restaurant) => restaurant.isOpen) : restaurants;

    return [...base].sort((a, b) => {
      const distanceA = Number(a.distanceKm ?? 0);
      const distanceB = Number(b.distanceKm ?? 0);

      if (sortBy === "distance") {
        return distanceA - distanceB;
      }

      if (sortBy === "name") {
        return a.name.localeCompare(b.name);
      }

      if (a.isOpen !== b.isOpen) {
        return a.isOpen ? -1 : 1;
      }

      return distanceA - distanceB;
    });
  }, [restaurants, showOpenOnly, sortBy]);

  const insights = useMemo(() => {
    const listToUse = search.trim() ? semanticResults.map((r: any) => r.restaurant) : restaurants;
    
    const openCount = listToUse.filter((restaurant: any) => restaurant?.isOpen).length;
    const nearest = [...listToUse].filter((r: any) => r).sort(
      (a: any, b: any) => Number(a.distanceKm ?? 0) - Number(b.distanceKm ?? 0),
    )[0];

    return {
      openCount,
      nearestName: nearest?.name || "Discover nearby places",
      nearestDistance: nearest ? `${nearest.distanceKm} km` : "No results yet",
      restaurantCount: listToUse.length
    };
  }, [restaurants, semanticResults, search]);

  if (loadingLocation) {
    return (
      <div className="flex h-[60vh] items-center justify-center bg-[#0f0f0f]">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-[#facc15]" />
          <p className="text-gray-400">Getting your location...</p>
        </div>
      </div>
    );
  }

  if (!location) {
    return (
      <div className="flex h-[60vh] items-center justify-center bg-[#0f0f0f]">
        <div className="mx-auto max-w-md rounded-[28px] border border-white/10 bg-[#171717] p-6 text-center shadow-[0_20px_60px_rgba(0,0,0,0.25)]">
          <div className="mb-4">
            <svg className="mx-auto h-12 w-12 text-[#facc15]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h3 className="mb-2 text-lg font-medium text-white">Location Access Required</h3>
          <p className="mb-6 text-neutral-400">
            We need your location to show restaurants near you. Please allow location access to continue.
          </p>
          <button
            onClick={fetchLocation}
            className="w-full rounded-2xl bg-[#facc15] px-4 py-3 font-semibold text-[#0f0f0f] transition hover:brightness-110"
          >
            Allow Location Access
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center bg-[#0f0f0f]">
        <p className="text-gray-400">Finding restaurants near you...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 text-white">
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-[32px] border border-white/10 bg-[url('/premium-orbit.svg'),radial-gradient(circle_at_top_left,_rgba(250,204,21,0.18),_transparent_30%),linear-gradient(135deg,#171717,#101010)] bg-cover bg-center p-6 shadow-[0_22px_70px_rgba(0,0,0,0.35)]"
      >
        <div className="absolute -right-10 top-0 h-40 w-40 rounded-full bg-[#facc15]/10 blur-3xl" />
        <div className="relative grid gap-6 lg:grid-cols-[1.5fr_1fr]">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#facc15]/20 bg-[#facc15]/10 px-4 py-2 text-sm text-[#facc15]">
              <FiZap />
              Premium delivery discovery
            </div>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight md:text-5xl">
                Find the fastest, smartest food picks near you.
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-neutral-300 md:text-base">
                Explore verified restaurants, filter instantly, and move through your city like a premium delivery app.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 text-sm">
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <div className="text-neutral-400">Current area</div>
                <div className="mt-1 flex items-center gap-2 font-medium text-white">
                  <FiMapPin className="text-[#facc15]" />
                  <span>{location.formattedAddress || city}</span>
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <div className="text-neutral-400">Closest option</div>
                <div className="mt-1 font-medium">{insights.nearestName}</div>
                <div className="text-[#facc15]">{insights.nearestDistance}</div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
            {[
              { label: "Restaurants", value: insights.restaurantCount, icon: FiSearch },
              { label: "Open now", value: insights.openCount, icon: FiStar },
              { label: "Discovery score", value: `${Math.min(98, 72 + insights.openCount * 3)}%`, icon: FiTrendingUp },
            ].map((item) => (
              <div key={item.label} className="rounded-[24px] border border-white/10 bg-black/20 p-4">
                <item.icon className="text-xl text-[#facc15]" />
                <div className="mt-4 text-2xl font-semibold">{item.value}</div>
                <div className="text-sm text-neutral-400">{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      </motion.section>

      <section className="mt-6 grid gap-4 lg:grid-cols-[1fr_auto_auto]">
        <div className="flex items-center gap-3 rounded-[24px] border border-white/10 bg-[#171717] px-4 py-4">
          <FiFilter className="text-[#facc15]" />
          <span className="text-sm text-neutral-300">Tighten the list to what matters right now.</span>
        </div>
        <button
          onClick={() => setShowOpenOnly((value) => !value)}
          className={`rounded-[24px] border px-5 py-4 text-sm font-medium transition ${showOpenOnly ? "border-[#facc15] bg-[#facc15] text-[#0f0f0f]" : "border-white/10 bg-[#171717] text-white hover:border-[#facc15]/40"}`}
        >
          {showOpenOnly ? "Showing open only" : "Filter open now"}
        </button>
        <select
          value={sortBy}
          onChange={(event) => setSortBy(event.target.value as "smart" | "distance" | "name")}
          className="rounded-[24px] border border-white/10 bg-[#171717] px-5 py-4 text-sm text-white outline-none"
        >
          <option value="smart">Smart sort</option>
          <option value="distance">Nearest first</option>
          <option value="name">Name A-Z</option>
        </select>
      </section>

      {/* For You Personalized Recommendations */}
      {forYou.length > 0 && !search && (
        <section className="mb-10 mt-8">
          <div className="mb-5">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#facc15]/20 bg-[#facc15]/10 px-3 py-1 text-xs font-semibold text-[#facc15] uppercase tracking-wider mb-2">
              <FiStar />
              Personalized Picks
            </div>
            <h2 className="text-2xl font-bold text-white">AI Tailored Recommendations 'For You'</h2>
            <p className="text-sm text-neutral-400">Based on your past orders, clicks, and taste profile</p>
          </div>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {forYou.slice(0, 6).map((item) => {
              const [resLng, resLat] = item.restaurant.autoLocation?.coordinates || [0, 0];
              const distance = (resLng && resLat) ? getDistanceKm({
                lat1: location.latitude,
                lon1: location.longitude,
                lat2: resLat,
                lon2: resLng,
              }) : undefined;

              return (
                <DishSearchResultCard
                  key={item._id}
                  dish={item}
                  restaurant={{ ...item.restaurant, distanceKm: distance }}
                />
              );
            })}
          </div>
        </section>
      )}

      {search && (
        <div className="mb-6 mt-8">
          <h2 className="text-2xl font-semibold">AI Semantic Search Results</h2>
          <p className="mt-1 text-neutral-400">
            Found {semanticResults.reduce((acc, curr) => acc + (curr.dishes?.length || 0), 0)} semantic matches for "{search}"
          </p>
        </div>
      )}

      {search ? (
        semanticResults.length > 0 ? (
          <div className="space-y-8">
            {semanticResults.map((group) => (
              <div key={group.restaurant._id} className="space-y-4 rounded-[28px] border border-white/10 bg-[#161616] p-6">
                <div className="flex items-center justify-between border-b border-white/5 pb-3">
                  <div>
                    <h3 className="text-lg font-bold text-white">{group.restaurant.name}</h3>
                    <p className="text-xs text-neutral-400">{group.restaurant.autoLocation?.formattedAddress}</p>
                  </div>
                  <span className="text-xs font-semibold text-[#facc15]">{group.restaurant.distanceKm?.toFixed(1)} km away</span>
                </div>
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                  {group.dishes.map((dish: any) => (
                    <DishSearchResultCard
                      key={dish._id}
                      dish={dish}
                      restaurant={group.restaurant}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-[28px] border border-dashed border-white/10 bg-[#171717] px-6 py-14 text-center text-neutral-400">
            No semantic food matches found for "{search}"
          </div>
        )
      ) : (
        /* Normal Restaurants list */
        <>
          <div className="mb-6 mt-8">
            <h2 className="text-2xl font-semibold">Restaurants near you</h2>
            <p className="mt-1 text-neutral-400">{visibleRestaurants.length} curated results for your delivery zone</p>
          </div>

          {visibleRestaurants.length > 0 ? (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              {visibleRestaurants.map((res) => {
                const [resLng, resLat] = res.autoLocation.coordinates;

                const distance = getDistanceKm({
                  lat1: location.latitude,
                  lon1: location.longitude,
                  lat2: resLat,
                  lon2: resLng,
                });

                return (
                  <RestaurantCard
                    key={res._id}
                    id={res._id}
                    name={res.name}
                    image={res.image ?? ""}
                    distance={`${distance}`}
                    isOpen={res.isOpen}
                    description={res.description}
                    address={res.autoLocation?.formattedAddress}
                    isVerified={res.isVerified}
                  />
                );
              })}
            </div>
          ) : (
            <div className="rounded-[28px] border border-dashed border-white/10 bg-[#171717] px-6 py-14 text-center text-neutral-400">
              No restaurant found
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Home;

