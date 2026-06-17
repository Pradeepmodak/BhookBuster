// Mongoose models for querying the MongoDB database
import MenuItems from "../models/MenuItems.js";
import Restaurant from "../models/Restaurant.js";
import UserTasteProfile from "../models/UserTasteProfile.js";

// Custom type for Express requests that have successfully passed the authentication middleware
import { AuthenticatedRequest } from "../middlewares/isAuth.js";

// Utility wrapper to automatically catch asynchronous errors and prevent the server from crashing
import TryCatch from "../middlewares/trycatch.js";

/**
 * Utility to safely parse and clamp the "limit" pagination parameter.
 * Ensures the limit is a positive number and caps it at 40 to prevent 
 * users from overwhelming the database by requesting thousands of items at once.
 */
const clampLimit = (value: unknown) => {
  const parsed = Number(value || 12);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 12;
  }

  return Math.min(parsed, 40);
};

/**
 * Safely extracts and validates geolocation coordinates from the HTTP request query.
 * Fails gracefully by returning null if the coordinates are missing or invalid.
 */
const parseLocation = (req: AuthenticatedRequest) => {
  const latitude = Number(req.query.latitude);
  const longitude = Number(req.query.longitude);
  const radiusKm = Number(req.query.radiusKm || 10);

  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    !Number.isFinite(radiusKm) ||
    radiusKm <= 0
  ) {
    return null;
  }

  return {
    latitude,
    longitude,
    radiusKm,
  };
};

/**
 * Uses MongoDB Geospatial Queries ($geoNear) to find verified restaurants near the user's location.
 * INTERVIEW NOTE: MongoDB's $geoNear is highly optimized for 2D sphere calculations.
 * It automatically calculates the physical distance in meters and sorts the closest restaurants first.
 */
const getPopularNearbyRestaurants = async (
  latitude: number,
  longitude: number,
  radiusKm: number,
  limit: number
) =>
  Restaurant.aggregate([
    {
      $geoNear: {
        near: {
          type: "Point",
          coordinates: [longitude, latitude],
        },
        distanceField: "distance",
        maxDistance: radiusKm * 1000,
        spherical: true,
        query: {
          isVerified: true,
        },
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
    { $limit: limit },
  ]);

/**
 * Constructs the complex MongoDB aggregation pipeline for the "For You" personalized feed.
 * INTERVIEW NOTE (Hybrid Search Architecture): This is an advanced AI search pipeline that combines:
 * 1. Semantic Search ($vectorSearch): Finds food mathematically similar to the user's AI taste profile.
 * 2. Hard Filters: Only includes food from nearby, open restaurants ($match).
 * 3. Geospatial Math (Haversine formula): Manually calculates distance using raw math (acos/sin/cos).
 * 4. Composite Scoring: Blends the AI vector score (75% weight) and physical distance score (25% weight)
 *    into a single `recommendationScore` to rank the final feed.
 */
const buildForYouPipeline = ({
  embeddingCentroid,
  restaurantIds,
  latitude,
  longitude,
  radiusKm,
  limit,
}: {
  embeddingCentroid: number[];
  restaurantIds: unknown[];
  latitude: number;
  longitude: number;
  radiusKm: number;
  limit: number;
}) => {
  const queryLatRad = (latitude * Math.PI) / 180;
  const queryLngRad = (longitude * Math.PI) / 180;

  return [
    {
      $vectorSearch: {
        index: "menu_embedding_vector_index",
        path: "embedding",
        queryVector: embeddingCentroid,
        numCandidates: Math.max(limit * 20, 100),
        limit: Math.max(limit * 4, 24),
        filter: {
          isAvailable: true,
          restaurantId: {
            $in: restaurantIds,
          },
        },
      },
    },
    {
      $addFields: {
        vectorScore: { $meta: "vectorSearchScore" },
      },
    },
    {
      $lookup: {
        from: "restaurants",
        localField: "restaurantId",
        foreignField: "_id",
        as: "restaurant",
      },
    },
    { $unwind: "$restaurant" },
    {
      $match: {
        "restaurant.isVerified": true,
        "restaurant.isOpen": true,
      },
    },
    {
      $addFields: {
        restaurantLatRad: {
          $degreesToRadians: {
            $arrayElemAt: ["$restaurant.autoLocation.coordinates", 1],
          },
        },
        restaurantLngRad: {
          $degreesToRadians: {
            $arrayElemAt: ["$restaurant.autoLocation.coordinates", 0],
          },
        },
      },
    },
    {
      $addFields: {
        distanceKm: {
          $multiply: [
            6371,
            {
              $acos: {
                $min: [
                  1,
                  {
                    $max: [
                      -1,
                      {
                        $add: [
                          {
                            $multiply: [
                              { $sin: queryLatRad },
                              { $sin: "$restaurantLatRad" },
                            ],
                          },
                          {
                            $multiply: [
                              { $cos: queryLatRad },
                              { $cos: "$restaurantLatRad" },
                              {
                                $cos: {
                                  $subtract: ["$restaurantLngRad", queryLngRad],
                                },
                              },
                            ],
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
            },
          ],
        },
      },
    },
    {
      $match: {
        distanceKm: { $lte: radiusKm },
      },
    },
    {
      $addFields: {
        distanceScore: {
          $max: [0, { $subtract: [1, { $divide: ["$distanceKm", radiusKm] }] }],
        },
      },
    },
    {
      $addFields: {
        recommendationScore: {
          $add: [
            { $multiply: ["$vectorScore", 0.75] },
            { $multiply: ["$distanceScore", 0.25] },
          ],
        },
      },
    },
    { $sort: { recommendationScore: -1 } },
    { $limit: limit },
    {
      $project: {
        embedding: 0,
        restaurantLatRad: 0,
        restaurantLngRad: 0,
      },
    },
  ];
};

/**
 * Mathematical fallback function to calculate how similar two vectors are.
 * INTERVIEW NOTE: If MongoDB Vector Search fails, we fetch the data into memory 
 * and manually calculate the Cosine Similarity between the user's taste profile 
 * and the menu items. A score of 1 means identical, 0 means completely unrelated.
 */
const cosineSimilarity = (a: number[], b: number[]): number => {
  if (!a || !b || a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += (a[i] ?? 0) * (b[i] ?? 0);
    normA += (a[i] ?? 0) * (a[i] ?? 0);
    normB += (b[i] ?? 0) * (b[i] ?? 0);
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
};

/**
 * Main controller for the app's Homepage. It serves two customized feeds:
 * 1. "Popular Nearby": A geospatial list of nearby open restaurants.
 * 2. "For You": A highly personalized feed of specific dishes tailored to the user's AI taste profile.
 */
export const homeRecommendations = TryCatch(
  async (req: AuthenticatedRequest, res) => {
    if (!req.user) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    const location = parseLocation(req);
    if (!location) {
      return res.status(400).json({
        message: "latitude, longitude and radiusKm are required",
      });
    }

    const limit = clampLimit(req.query.limit);
    let popularNearby = await getPopularNearbyRestaurants(
      location.latitude,
      location.longitude,
      location.radiusKm,
      limit
    );

    const profile = await UserTasteProfile.findOne({ userId: req.user._id });
    
    // Personalize popularNearby restaurants if profile exists
    if (profile && popularNearby.length > 0) {
      popularNearby = popularNearby.map((restaurant: any) => {
        let recScore = 0;
        
        // 1. Similarity based on embeddings
        if (restaurant.embedding && restaurant.embedding.length > 0 && profile.embeddingCentroid?.length > 0) {
          recScore += cosineSimilarity(restaurant.embedding, profile.embeddingCentroid) * 0.5;
        }
        
        // 2. Similarity based on preferred cuisines
        if (profile.cuisineWeights && restaurant.cuisineTypes?.length > 0) {
          let matches = 0;
          const weights = profile.cuisineWeights as any;
          restaurant.cuisineTypes.forEach((cuisine: string) => {
            if (weights instanceof Map) {
              matches += weights.get(cuisine) || 0;
            } else if (typeof weights === "object") {
              matches += Number(weights[cuisine]) || 0;
            }
          });
          recScore += Math.min(matches / 10, 1) * 0.5;
        }

        return {
          ...restaurant,
          recommendationScore: recScore,
        };
      });

      // Sort by isOpen (open first) and then recommendationScore descending
      popularNearby.sort((a: any, b: any) => {
        if (a.isOpen !== b.isOpen) {
          return a.isOpen ? -1 : 1;
        }
        return (b.recommendationScore || 0) - (a.recommendationScore || 0);
      });
    }

    if (!profile || !profile.embeddingCentroid?.length || popularNearby.length === 0) {
      return res.json({
        forYou: [],
        popularNearby,
      });
    }

    const restaurantIds = popularNearby.map((restaurant) => restaurant._id);
    let forYou: any[] = [];
    try {
      forYou = await MenuItems.aggregate(
        buildForYouPipeline({
          embeddingCentroid: profile.embeddingCentroid,
          restaurantIds,
          latitude: location.latitude,
          longitude: location.longitude,
          radiusKm: location.radiusKm,
          limit,
        }) as any[]
      );
    } catch (error) {
      console.warn("MongoDB $vectorSearch failed in homeRecommendations, using JS similarity fallback:", error);
      
      const candidateItems = await MenuItems.find({
        isAvailable: true,
        restaurantId: { $in: restaurantIds },
      }).lean();

      const scoredItems = candidateItems.map((item: any) => {
        const restaurant = popularNearby.find((r: any) => r._id.toString() === item.restaurantId.toString());
        const vectorScore = cosineSimilarity(item.embedding || [], profile.embeddingCentroid);
        const distanceKm = restaurant ? restaurant.distanceKm : 0;
        const distanceScore = Math.max(0, 1 - distanceKm / location.radiusKm);
        const recScore = vectorScore * 0.75 + distanceScore * 0.25;

        return {
          _id: item._id.toString(),
          restaurantId: item.restaurantId.toString(),
          name: item.name,
          description: item.description,
          image: item.image,
          price: item.price,
          cuisine: item.cuisine,
          tags: item.tags,
          dietaryFlags: item.dietaryFlags,
          spiceLevel: item.spiceLevel,
          vectorScore,
          distanceScore,
          recommendationScore: recScore,
          restaurant: restaurant ? {
            _id: restaurant._id,
            name: restaurant.name,
            image: restaurant.image,
            isOpen: restaurant.isOpen,
            isVerified: restaurant.isVerified,
            autoLocation: restaurant.autoLocation,
          } : null,
          distanceKm,
        };
      }).filter(item => item.restaurant !== null);

      scoredItems.sort((a, b) => b.recommendationScore - a.recommendationScore);
      forYou = scoredItems.slice(0, limit);
    }

    return res.json({
      forYou,
      popularNearby,
    });
  }
);

