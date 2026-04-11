import MenuItems from "../models/MenuItems.js";
import Restaurant from "../models/Restaurant.js";
import { CACHE_TTL, withCache } from "../cache/redis.js";

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

  const { data } = await withCache({
    key: cacheKey,
    ttl: CACHE_TTL.lists,
    fetcher: async () => {
      const query: Record<string, unknown> = {
        isVerified: true,
      };

      if (search.trim()) {
        query.name = { $regex: search.trim(), $options: "i" };
      }

      return Restaurant.aggregate([
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
    },
  });

  return data;
};

export const fetchRestaurantMenuItems = async (restaurantId: string) => {
  const cacheKey = `catalog:menu:${restaurantId}`;
  const { data } = await withCache({
    key: cacheKey,
    ttl: CACHE_TTL.lists,
    fetcher: async () => MenuItems.find({ restaurantId }).sort({ createdAt: -1 }),
  });

  return data;
};
