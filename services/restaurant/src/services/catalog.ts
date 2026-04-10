import MenuItems from "../models/MenuItems.js";
import Restaurant from "../models/Restaurant.js";
import { getCache, setCache } from "../cache/redis.js";

const RESTAURANT_LIST_TTL = 120;
const MENU_LIST_TTL = 120;

interface NearbyRestaurantParams {
  latitude: number;
  longitude: number;
  radius?: number;
  search?: string;
}

const buildRestaurantCacheKey = ({
  latitude,
  longitude,
  radius,
  search,
}: NearbyRestaurantParams) =>
  `catalog:restaurants:${latitude.toFixed(3)}:${longitude.toFixed(3)}:${radius || 5000}:${(search || "").trim().toLowerCase()}`;

export const fetchNearbyRestaurants = async ({
  latitude,
  longitude,
  radius = 5000,
  search = "",
}: NearbyRestaurantParams) => {
  const cacheKey = buildRestaurantCacheKey({
    latitude,
    longitude,
    radius,
    search,
  });

  const cached = await getCache<unknown[]>(cacheKey);
  if (cached) {
    return cached;
  }

  const query: Record<string, unknown> = {
    isVerified: true,
  };

  if (search.trim()) {
    query.name = { $regex: search.trim(), $options: "i" };
  }

  const restaurants = await Restaurant.aggregate([
    {
      $geoNear: {
        near: {
          type: "Point",
          coordinates: [longitude, latitude],
        },
        distanceField: "distance",
        maxDistance: radius,
        spherical: true,
        query,
      },
    },
    {
      $sort: {
        isOpen: -1,
        distance: 1,
      },
    },
    {
      $addFields: {
        distanceKm: {
          $round: [{ $divide: ["$distance", 1000] }, 2],
        },
      },
    },
  ]);

  await setCache(cacheKey, restaurants, RESTAURANT_LIST_TTL);
  return restaurants;
};

export const fetchRestaurantMenuItems = async (restaurantId: string) => {
  const cacheKey = `catalog:menu:${restaurantId}`;
  const cached = await getCache<unknown[]>(cacheKey);

  if (cached) {
    return cached;
  }

  const items = await MenuItems.find({ restaurantId }).sort({ createdAt: -1 });
  await setCache(cacheKey, items, MENU_LIST_TTL);

  return items;
};
