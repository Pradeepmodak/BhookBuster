import MenuItems from "../models/MenuItems.js";
import Restaurant from "../models/Restaurant.js";
import UserTasteProfile from "../models/UserTasteProfile.js";
import { AuthenticatedRequest } from "../middlewares/isAuth.js";
import TryCatch from "../middlewares/trycatch.js";

const clampLimit = (value: unknown) => {
  const parsed = Number(value || 12);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 12;
  }

  return Math.min(parsed, 40);
};

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

