import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { BiSearch, BiMap, BiTime, BiRestaurant } from "react-icons/bi";
import { MdVerified, MdStar } from "react-icons/md";
import { TbLeaf } from "react-icons/tb";
import axios from "axios";
import { restaurantService } from "../config";
import toast from "react-hot-toast";

type SemanticMenuResult = {
  _id: string;
  name: string;
  description?: string;
  image?: string;
  price: number;
  cuisine?: string;
  tags?: string[];
  dietaryFlags?: string[];
  spiceLevel?: string;
  vectorScore: number;
  popularityScore: number;
  distanceScore: number;
  blendedScore: number;
};

type GroupedResult = {
  restaurant: {
    _id: string;
    name: string;
    image?: string;
    isOpen: boolean;
    isVerified: boolean;
    distanceKm: number;
    autoLocation?: {
      formattedAddress?: string;
    };
  };
  dishes: SemanticMenuResult[];
};

type RestaurantResult = {
  _id: string;
  name: string;
  image?: string;
  isOpen: boolean;
  isVerified: boolean;
  distanceKm: number;
  autoLocation?: {
    formattedAddress?: string;
  };
  vectorScore: number;
  distanceScore: number;
  blendedScore: number;
  cuisineTypes?: string[];
};

export default function Search() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GroupedResult[]>([]);
  const [restaurantResults, setRestaurantResults] = useState<RestaurantResult[]>([]);
  const [searchType, setSearchType] = useState<"dishes" | "restaurants">("dishes");
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.error("Error getting location:", error);
          toast.error("Please enable location services for better search results.");
        }
      );
    }
  }, []);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;

    // Use default coordinates (Ranchi, where restaurants are located) if location is not available
    const lat = location?.lat || 23.3767;
    const lng = location?.lng || 85.3441;

    setLoading(true);
    setResults([]);
    setRestaurantResults([]);
    try {
      const endpoint = searchType === "dishes" 
        ? `${restaurantService}/api/search/semantic` 
        : `${restaurantService}/api/search/restaurants`;

      const { data } = await axios.post(
        endpoint,
        {
          query,
          latitude: lat,
          longitude: lng,
          radiusKm: 50000, // Cover everything for demo purposes
          limit: 30,
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      if (data.success) {
        if (searchType === "dishes") {
          setResults(data.results);
        } else {
          setRestaurantResults(data.results);
        }
      }
    } catch (error: any) {
      console.error(error);
      toast.error(error.response?.data?.message || "Search failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-gray-100 pt-24 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-10">
        
        {/* Header & Search Bar */}
        <div className="text-center space-y-6">
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-[#facc15] to-[#f0c040]">
            What are you craving?
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Our AI understands exactly what you want. Search for "cheesy pizza under 500" or "spicy chicken near me".
          </p>
          
          <form onSubmit={handleSearch} className="max-w-3xl mx-auto relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <BiSearch className="h-6 w-6 text-gray-400 group-focus-within:text-[#facc15] transition-colors" />
            </div>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="E.g. healthy vegan breakfast..."
              className="block w-full pl-12 pr-32 py-5 border border-[#333] rounded-2xl leading-5 bg-[#1a1a1a]/80 backdrop-blur-xl text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#facc15]/50 focus:border-[#facc15] transition-all duration-300 text-lg shadow-xl"
            />
            <button
              type="submit"
              disabled={loading}
              className="absolute inset-y-2 right-2 bg-gradient-to-r from-[#facc15] to-[#d4a017] hover:from-[#f0c040] hover:to-[#facc15] text-black font-semibold px-6 rounded-xl transition-all shadow-lg hover:shadow-[#facc15]/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-black border-t-transparent" />
              ) : (
                "Search"
              )}
            </button>
          </form>

          {/* Toggle Switch */}
          <div className="flex justify-center mt-6">
            <div className="bg-[#1a1a1a] p-1 rounded-full border border-[#333] inline-flex shadow-inner">
              <button
                type="button"
                onClick={() => setSearchType("dishes")}
                className={`px-6 py-2.5 rounded-full font-bold transition-all duration-300 text-sm ${
                  searchType === "dishes" 
                    ? "bg-[#facc15] text-black shadow-lg scale-105" 
                    : "text-gray-400 hover:text-white"
                }`}
              >
                Find Dishes
              </button>
              <button
                type="button"
                onClick={() => setSearchType("restaurants")}
                className={`px-6 py-2.5 rounded-full font-bold transition-all duration-300 text-sm ${
                  searchType === "restaurants" 
                    ? "bg-[#facc15] text-black shadow-lg scale-105" 
                    : "text-gray-400 hover:text-white"
                }`}
              >
                Find Restaurants
              </button>
            </div>
          </div>
        </div>

        {/* Search Results */}
        {searchType === "dishes" && results.length > 0 && (
          <div className="space-y-12">
            {results.map((group, idx) => (
              <div key={idx} className="bg-[#141414] rounded-3xl overflow-hidden border border-[#222] shadow-2xl transition-transform hover:-translate-y-1 duration-300">
                
                {/* Restaurant Header */}
                <div className="p-6 sm:p-8 bg-gradient-to-r from-[#1a1a1a] to-[#141414] border-b border-[#222] flex flex-col sm:flex-row gap-6 items-start sm:items-center justify-between">
                  <div className="flex items-center gap-5">
                    {group.restaurant.image ? (
                      <img src={group.restaurant.image} alt={group.restaurant.name} className="w-20 h-20 rounded-2xl object-cover shadow-lg border border-[#333]" />
                    ) : (
                      <div className="w-20 h-20 rounded-2xl bg-[#222] flex items-center justify-center border border-[#333]">
                        <BiRestaurant className="w-8 h-8 text-gray-500" />
                      </div>
                    )}
                    <div>
                      <Link to={`/restaurant/${group.restaurant._id}`} className="text-2xl font-bold text-white hover:text-[#facc15] transition-colors flex items-center gap-2">
                        {group.restaurant.name}
                        {group.restaurant.isVerified && <MdVerified className="text-blue-400 w-5 h-5" />}
                      </Link>
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-400">
                        <span className="flex items-center gap-1">
                          <BiMap className="w-4 h-4 text-[#facc15]" />
                          {group.restaurant.distanceKm.toFixed(1)} km away
                        </span>
                        <span className="flex items-center gap-1">
                          <BiTime className="w-4 h-4 text-[#facc15]" />
                          {group.restaurant.isOpen ? (
                            <span className="text-green-400">Open Now</span>
                          ) : (
                            <span className="text-red-400">Closed</span>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <Link 
                    to={`/restaurant/${group.restaurant._id}`}
                    className="px-6 py-2.5 bg-[#222] hover:bg-[#333] text-gray-200 rounded-xl transition-colors font-medium border border-[#333] shrink-0"
                  >
                    View Menu
                  </Link>
                </div>

                {/* Dishes Grid */}
                <div className="p-6 sm:p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {group.dishes.map((dish, dishIdx) => (
                    <div key={dishIdx} className="bg-[#1a1a1a] rounded-2xl p-5 border border-[#2a2a2a] hover:border-[#facc15]/50 transition-all duration-300 group flex flex-col justify-between">
                      
                      <div className="flex justify-between items-start gap-4 mb-4">
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#222] border border-[#333] text-xs font-medium text-gray-300">
                              <MdStar className="text-[#facc15] w-3.5 h-3.5" />
                              {(dish.blendedScore * 100).toFixed(0)}% Match
                            </span>
                            {dish.dietaryFlags?.includes("veg") && (
                              <TbLeaf className="text-green-400 w-5 h-5" />
                            )}
                          </div>
                          <h3 className="font-bold text-gray-100 text-lg group-hover:text-[#facc15] transition-colors line-clamp-1">{dish.name}</h3>
                          <p className="text-sm text-gray-400 mt-1 line-clamp-2 min-h-[40px]">{dish.description}</p>
                        </div>
                        {dish.image && (
                          <img src={dish.image} alt={dish.name} className="w-24 h-24 rounded-xl object-cover shrink-0 border border-[#333]" />
                        )}
                      </div>

                      <div className="mt-4 pt-4 border-t border-[#2a2a2a] flex items-center justify-between">
                        <span className="text-xl font-bold text-white">₹{dish.price}</span>
                        <div className="flex flex-wrap gap-1">
                          {dish.tags?.slice(0,2).map((tag, i) => (
                            <span key={i} className="px-2 py-1 text-[10px] uppercase font-semibold tracking-wider bg-[#333] text-gray-300 rounded">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>

                    </div>
                  ))}
                </div>

              </div>
            ))}
          </div>
        )}

        {/* Restaurant Results */}
        {searchType === "restaurants" && restaurantResults.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {restaurantResults.map((restaurant, idx) => (
              <Link key={idx} to={`/restaurant/${restaurant._id}`} className="bg-[#141414] rounded-3xl p-6 border border-[#222] shadow-2xl transition-transform hover:-translate-y-1 hover:border-[#facc15]/50 duration-300 block group">
                <div className="flex items-start gap-4">
                  {restaurant.image ? (
                    <img src={restaurant.image} alt={restaurant.name} className="w-24 h-24 rounded-2xl object-cover shadow-lg border border-[#333]" />
                  ) : (
                    <div className="w-24 h-24 rounded-2xl bg-[#222] flex items-center justify-center border border-[#333]">
                      <BiRestaurant className="w-10 h-10 text-gray-500" />
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#222] border border-[#333] text-xs font-medium text-gray-300">
                        <MdStar className="text-[#facc15] w-3.5 h-3.5" />
                        {(restaurant.blendedScore * 100).toFixed(0)}% Match
                      </span>
                      {restaurant.isVerified && <MdVerified className="text-blue-400 w-5 h-5" />}
                    </div>
                    <h3 className="text-xl font-bold text-white mt-2 mb-1 group-hover:text-[#facc15] transition-colors">{restaurant.name}</h3>
                    <div className="text-sm text-gray-400 space-y-1">
                      <div className="flex items-center gap-1">
                        <BiMap className="w-4 h-4 text-[#facc15]" />
                        {restaurant.distanceKm.toFixed(1)} km away
                      </div>
                      <div className="flex items-center gap-1">
                        <BiTime className="w-4 h-4 text-[#facc15]" />
                        {restaurant.isOpen ? (
                          <span className="text-green-400">Open Now</span>
                        ) : (
                          <span className="text-red-400">Closed</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && query && (
          (searchType === "dishes" && results.length === 0) || 
          (searchType === "restaurants" && restaurantResults.length === 0)
        ) && (
          <div className="text-center py-20 bg-[#141414] rounded-3xl border border-[#222]">
            <BiSearch className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">No exact matches found</h3>
            <p className="text-gray-400">Try adjusting your search terms or exploring different cuisines.</p>
          </div>
        )}

      </div>
    </div>
  );
}
