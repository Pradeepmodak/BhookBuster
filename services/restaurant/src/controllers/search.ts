import mongoose from "mongoose";
import MenuItems from "../models/MenuItems.js";
import Restaurant from "../models/Restaurant.js";
import Order from "../models/Order.js";
import { AuthenticatedRequest } from "../middlewares/isAuth.js";
import TryCatch from "../middlewares/trycatch.js";
import { requestEmbedding, toStringArray, requestNlpParse } from "../lib/embeddings.js";

/**
 * Filters that can be optionally applied to semantic search queries.
 */
type SemanticSearchFilters = {
  maxPrice?: number;
  minPrice?: number;
  dietaryFlags?: string[];
  isVeg?: boolean;
  cuisine?: string;
  spiceLevel?: string;
};

/**
 * Expected schema for the request body of semantic search endpoints.
 */
type SemanticSearchBody = {
  query?: string;
  latitude?: number;
  longitude?: number;
  radiusKm?: number;
  limit?: number;
  filters?: SemanticSearchFilters;
};

/**
 * Interface representing the detailed structure of a search result item,
 * combining MongoDB menu data, computed scores, and joined restaurant information.
 */
type SemanticMenuResult = {
  _id: string;
  restaurantId: string;
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
  restaurant: {
    _id: string;
    name: string;
    image?: string;
    isOpen: boolean;
    isVerified: boolean;
    autoLocation: {
      coordinates: [number, number];
      formattedAddress?: string;
    };
  };
  distanceKm: number;
};

/**
 * Validates and limits the results count requested by the client.
 * Restricts limit between 1 and 50 items (default: 20).
 * 
 * @param {unknown} limit - The requested limit value.
 * @returns {number} The clamped limit.
 */
const clampLimit = (limit: unknown) => {
  const parsed = Number(limit || 20);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 20;
  }

  return Math.min(parsed, 50);
};

/**
 * Computes the cosine similarity between two numerical vectors of identical length.
 * Cosine similarity evaluates direction alignment, outputting a value between -1 and 1.
 * 
 * @param {number[]} a - First vector array.
 * @param {number[]} b - Second vector array.
 * @returns {number} Cosine similarity score, or 0 on error/zero-length.
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
 * Constructs a MongoDB query object based on the supplied filters to narrow
 * down $vectorSearch candidates.
 * 
 * @param {SemanticSearchFilters} [filters] - The filters payload.
 * @returns {Record<string, any>} Mongoose query filter object.
 */
const buildVectorFilter = (filters?: SemanticSearchFilters) => {
  const vectorFilter: Record<string, any> = {
    isAvailable: true,
  };

  const priceQuery: Record<string, number> = {};

  if (filters?.maxPrice != null) {
    priceQuery.$lte = Number(filters.maxPrice);
  }

  if (filters?.minPrice != null) {
    priceQuery.$gte = Number(filters.minPrice);
  }

  if (Object.keys(priceQuery).length > 0) {
    vectorFilter.price = priceQuery;
  }

  const dietaryFlags = toStringArray(filters?.dietaryFlags);
  if (filters?.isVeg) {
    dietaryFlags.push("veg");
  }

  const uniqueDietaryFlags = [...new Set(dietaryFlags)];
  if (uniqueDietaryFlags.length > 0) {
    vectorFilter.dietaryFlags = { $in: uniqueDietaryFlags };
  }

  if (filters?.cuisine) {
    const cuisineLower = filters.cuisine.toLowerCase();
    const cuisineTitle = filters.cuisine.charAt(0).toUpperCase() + filters.cuisine.slice(1).toLowerCase();
    vectorFilter.cuisine = { $in: [cuisineLower, cuisineTitle, filters.cuisine] };
  }

  if (filters?.spiceLevel) {
    vectorFilter.spiceLevel = filters.spiceLevel;
  }

  return vectorFilter;
};

/**
 * Groups raw list of matching dishes under their respective parent restaurants
 * to improve frontend display format.
 * 
 * @param {SemanticMenuResult[]} items - List of scored menu items.
 * @returns {Array<{ restaurant: any, dishes: any[] }>} Grouped restaurant search results.
 */
const groupByRestaurant = (items: SemanticMenuResult[]) => {
  const groups = new Map<string, {
    restaurant: SemanticMenuResult["restaurant"] & { distanceKm: number };
    dishes: Array<Omit<SemanticMenuResult, "restaurant">>;
  }>();

  for (const item of items) {
    const restaurantId = item.restaurant._id.toString();
    if (!groups.has(restaurantId)) {
      groups.set(restaurantId, {
        restaurant: {
          ...item.restaurant,
          distanceKm: item.distanceKm,
        },
        dishes: [],
      });
    }

    const { restaurant, ...dish } = item;
    groups.get(restaurantId)?.dishes.push(dish);
  }

  return [...groups.values()];
};

/**
 * Performs a localized vector search for menu items matching a search query.
 * Blends AI vector similarity with dish popularity (orders volume) and proximity.
 * If AI services or MongoDB vector aggregation fail, automatically falls back to manual JS text matching.
 * 
 * Flow:
 * 1. Validate query, lat/lng coordinates and radius parameters.
 * 2. Parse raw query using NLP to extract structured metadata/filters (e.g. "vegan pizza" -> cleanQuery="pizza", filters.isVeg=true).
 * 3. Generate embeddings from the cleaned query via the AI Gateway.
 * 4. Perform a geoNear aggregation on Restaurant collection to discover verified, open restaurants within the specified radius.
 * 5. Attempt MongoDB Atlas $vectorSearch on MenuItems using the query vector.
 *    - Looks up restaurant details and calculates final spherical distance.
 *    - Performs a sub-pipeline lookup on Orders to calculate historical order quantity for popularity scoring.
 *    - Computes blended score: 60% Vector similarity + 20% Distance score + 20% Popularity score.
 * 6. Fallback (Catch block): Manually filters candidates in JS, generates text match scores using keyword occurrence, computes distance & popularity scores, and sorts items.
 * 7. Groups dishes by restaurant and returns JSON response.
 * 
 * @route POST /api/search/semantic
 * @param {AuthenticatedRequest} req - Express request object containing the query, latitude, longitude, and optional filters.
 * @param {Response} res - Express response object.
 */
export const semanticSearch = TryCatch(async (req: AuthenticatedRequest, res) => {
  const { query, latitude, longitude, radiusKm, limit, filters } =
    req.body as SemanticSearchBody;

  // 1. Core validations
  if (
    !query ||
    typeof query !== "string" ||
    typeof latitude !== "number" ||
    typeof longitude !== "number"
  ) {
    return res.status(400).json({
      message: "query, latitude and longitude are required",
    });
  }

  const searchRadiusKm = Number(radiusKm || 5);
  if (!Number.isFinite(searchRadiusKm) || searchRadiusKm <= 0) {
    return res.status(400).json({
      message: "radiusKm must be greater than 0",
    });
  }

  const resultLimit = clampLimit(limit);

  // 2. Extract semantic filters from query using NLP parsing
  let parsedCleanQuery = query;
  let parsedFilters: SemanticSearchFilters = {};
  try {
    const nlpRes = await requestNlpParse(query);
    parsedCleanQuery = nlpRes.cleanQuery || query;
    parsedFilters = nlpRes.filters || {};
  } catch (error) {
    console.error("NLP query parsing failed, using raw query:", error);
  }

  const mergedFilters = {
    ...parsedFilters,
    ...filters,
  };

  // 3. Generate vector embedding for the query string
  let queryVector: number[] = [];
  let isAiGatewayDown = false;
  try {
    queryVector = await requestEmbedding(parsedCleanQuery, "RETRIEVAL_QUERY");
  } catch (error: any) {
    console.warn("⚠️ AI Gateway embedding generation failed for search query:", error.message);
    isAiGatewayDown = true;
  }
  const queryLatRad = (latitude * Math.PI) / 180;
  const queryLngRad = (longitude * Math.PI) / 180;


  // 4. Fetch nearby restaurants with their full details and distance
  const nearbyRestaurants = await Restaurant.aggregate<any>([
    {
      $geoNear: {
        near: {
          type: "Point",
          coordinates: [longitude, latitude],
        },
        distanceField: "distance",
        maxDistance: searchRadiusKm * 1000,
        spherical: true,
        query: {
          isVerified: true,
          isOpen: true,
        },
      },
    },
  ]);
  console.log("Found nearby restaurants:", nearbyRestaurants.length, nearbyRestaurants.map(r => r.name));

  const restaurantMap = new Map<string, any>();
  nearbyRestaurants.forEach((res) => {
    restaurantMap.set(res._id.toString(), {
      _id: res._id.toString(),
      name: res.name,
      image: res.image,
      isOpen: res.isOpen,
      isVerified: res.isVerified,
      autoLocation: res.autoLocation,
      distanceKm: res.distance / 1000,
    });
  });

  const nearbyRestaurantIds = [...restaurantMap.keys()].map(id =>
    mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : id
  );

  // If no restaurants are in range, return empty result list early
  if (nearbyRestaurantIds.length === 0) {
    return res.json({
      success: true,
      count: 0,
      results: [],
      debug_nearby: nearbyRestaurants.length,
      debug_radius: searchRadiusKm,
    });
  }

  const vectorFilter = {
    ...buildVectorFilter(mergedFilters),
    restaurantId: {
      $in: nearbyRestaurantIds,
    },
  };

  // 5. Build and execute MongoDB Atlas Vector Search aggregation pipeline
  const pipeline: any[] = [
    {
      $vectorSearch: {
        index: "menu_embedding_vector_index",
        path: "embedding",
        queryVector,
        numCandidates: Math.max(resultLimit * 20, 100),
        limit: Math.max(resultLimit * 5, 25),
        filter: vectorFilter,
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
    // Calculate precise spherical distance dynamically using the Haversine formula
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
    // Filter results strictly within user's target radius
    {
      $match: {
        distanceKm: { $lte: searchRadiusKm },
      },
    },
    // Look up historical paid order quantities to calculate popularity
    {
      $lookup: {
        from: "orders",
        let: {
          itemId: { $toString: "$_id" },
        },
        pipeline: [
          {
            $match: {
              paymentStatus: "paid",
              $expr: {
                $in: ["$$itemId", "$items.itemId"],
              },
            },
          },
          { $unwind: "$items" },
          {
            $match: {
              $expr: {
                $eq: ["$items.itemId", "$$itemId"],
              },
            },
          },
          {
            $group: {
              _id: null,
              quantity: { $sum: "$items.quantity" },
            },
          },
        ],
        as: "popularity",
      },
    },
    // Map individual component scores (popularity and distance)
    {
      $addFields: {
        popularityScore: {
          $min: [
            1,
            {
              $divide: [
                { $ifNull: [{ $first: "$popularity.quantity" }, 0] },
                100,
              ],
            },
          ],
        },
        distanceScore: {
          $max: [
            0,
            { $subtract: [1, { $divide: ["$distanceKm", searchRadiusKm] }] },
          ],
        },
      },
    },
    // Blend final scores together
    {
      $addFields: {
        blendedScore: {
          $add: [
            { $multiply: ["$vectorScore", 0.6] },
            { $multiply: ["$popularityScore", 0.2] },
            { $multiply: ["$distanceScore", 0.2] },
          ],
        },
      },
    },
    { $sort: { blendedScore: -1 } },
    { $limit: resultLimit },
    {
      $project: {
        restaurantLatRad: 0,
        restaurantLngRad: 0,
        embedding: 0,
        popularity: 0,
      },
    },
  ];

  let items: SemanticMenuResult[];
  try {
    if (isAiGatewayDown) {
      throw new Error("AI Gateway is down/offline. Skipping MongoDB vector aggregation and falling back to text-based matching.");
    }
    items = await MenuItems.aggregate<SemanticMenuResult>(pipeline);

    if (items.length === 0) {
      throw new Error("MongoDB $vectorSearch returned 0 results. Index might be misconfigured. Falling back to JS matching.");
    }
  } catch (error: any) {
    console.warn("MongoDB $vectorSearch failed or AI Gateway was offline. Falling back to JS matching:", error.message || error);

    // 6. JS Fallback Scorer: Manual validation/match algorithm
    const jsFilter: Record<string, any> = {
      isAvailable: true,
      restaurantId: { $in: nearbyRestaurantIds },
    };

    const priceQuery: Record<string, number> = {};
    if (mergedFilters?.maxPrice != null) {
      priceQuery.$lte = Number(mergedFilters.maxPrice);
    }
    if (mergedFilters?.minPrice != null) {
      priceQuery.$gte = Number(mergedFilters.minPrice);
    }
    if (Object.keys(priceQuery).length > 0) {
      jsFilter.price = priceQuery;
    }

    const dietaryFlags = toStringArray(mergedFilters?.dietaryFlags);
    if (mergedFilters?.isVeg) {
      dietaryFlags.push("veg");
    }
    const uniqueDietaryFlags = [...new Set(dietaryFlags)];
    if (uniqueDietaryFlags.length > 0) {
      jsFilter.dietaryFlags = { $in: uniqueDietaryFlags };
    }

    if (mergedFilters?.cuisine) {
      jsFilter.cuisine = { $regex: new RegExp(`^${mergedFilters.cuisine}$`, "i") };
    }

    if (mergedFilters?.spiceLevel) {
      jsFilter.spiceLevel = mergedFilters.spiceLevel;
    }

    console.log("nearbyRestaurantIds = ", nearbyRestaurantIds);
    console.log("jsFilter = ", JSON.stringify(jsFilter, null, 2));
    const candidateItems = await MenuItems.find(jsFilter).lean();
    console.log("JS Fallback: candidateItems count =", candidateItems.length);

    if (candidateItems.length === 0) {
      items = [];
    } else {
      const candidateItemIds = candidateItems.map((i) => i._id.toString());
      
      // Calculate order quantities for candidates
      const orderCounts = await Order.aggregate([
        {
          $match: {
            paymentStatus: "paid",
            "items.itemId": { $in: candidateItemIds },
          },
        },
        { $unwind: "$items" },
        {
          $match: {
            "items.itemId": { $in: candidateItemIds },
          },
        },
        {
          $group: {
            _id: "$items.itemId",
            quantity: { $sum: "$items.quantity" },
          },
        },
      ]);

      const popularityMap = new Map<string, number>();
      orderCounts.forEach((oc) => popularityMap.set(oc._id.toString(), oc.quantity));

      // Calculate matching scores manually
      const scoredItems = candidateItems.map((item: any) => {
        const restaurant = restaurantMap.get(item.restaurantId.toString());

        let textMatchScore = 0;
        if (isAiGatewayDown && query) {
          const queryWords = query.toLowerCase().split(/\s+/).filter(Boolean);
          const nameLower = (item.name || "").toLowerCase();
          const descLower = (item.description || "").toLowerCase();
          const tagsLower = (item.tags || []).map((t: string) => t.toLowerCase());
          const cuisineLower = (item.cuisine || "").toLowerCase();

          let matches = 0;
          queryWords.forEach(word => {
            if (nameLower.includes(word)) matches += 2.0;
            else if (descLower.includes(word)) matches += 1.0;
            else if (cuisineLower.includes(word)) matches += 1.5;
            else if (tagsLower.some((t: string) => t.includes(word))) matches += 1.2;
          });
          textMatchScore = queryWords.length > 0 ? Math.min(1.0, matches / (queryWords.length * 2.0)) : 0;
        }

        const vectorScore = !isAiGatewayDown && queryVector.length > 0
          ? cosineSimilarity(item.embedding || [], queryVector)
          : textMatchScore;

        const distanceKm = restaurant ? restaurant.distanceKm : 0;
        const distanceScore = Math.max(
          0,
          1 - distanceKm / searchRadiusKm
        );
        const quantity = popularityMap.get(item._id.toString()) || 0;
        const popularityScore = Math.min(1, quantity / 100);
        const blendedScore = vectorScore * 0.6 + popularityScore * 0.2 + distanceScore * 0.2;

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
          popularityScore,
          distanceScore,
          blendedScore,
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

      console.log("JS Fallback: scoredItems count after filter =", scoredItems.length);

      scoredItems.sort((a, b) => b.blendedScore - a.blendedScore);
      items = scoredItems.slice(0, resultLimit) as any[];
      console.log("JS Fallback: final items count =", items.length);
    }
  }

  console.log("Returning items:", items?.length);

  // 7. Group items by restaurant and return response
  return res.json({
    success: true,
    count: items.length,
    results: groupByRestaurant(items),
    debug: {
      isAiGatewayDown,
      itemsCount: items.length,
      fallbackDetails: (global as any).debugFallback || "NOT_SET"
    }
  });
});

/**
 * Semantic search specifically for discovering restaurants based on a vibe or concept.
 * E.g., "A romantic Italian place open late"
 * 
 * Flow:
 * 1. Validates body parameters.
 * 2. Optionally parses search text using NLP.
 * 3. Generates embedding vector for the query text.
 * 4. Identifies geographically nearby verified, open restaurants.
 * 5. Queries MongoDB Atlas $vectorSearch on Restaurant collection using restaurant_embedding_vector_index.
 * 6. Blends vector similarity score (70%) with geo-distance score (30%).
 * 7. In case of failure or downtime, falls back to JS manual keyword and geospatial matching.
 * 
 * @route POST /api/search/restaurant/semantic
 * @param {AuthenticatedRequest} req - Express request object containing the query, latitude, longitude, and optional search limit.
 * @param {Response} res - Express response object.
 */
export const restaurantSemanticSearch = TryCatch(async (req: AuthenticatedRequest, res) => {
  const { query, latitude, longitude, radiusKm, limit } = req.body as SemanticSearchBody;

  // 1. Validation
  if (
    !query ||
    typeof query !== "string" ||
    typeof latitude !== "number" ||
    typeof longitude !== "number"
  ) {
    return res.status(400).json({
      message: "query, latitude and longitude are required",
    });
  }

  const searchRadiusKm = Number(radiusKm || 10); // Default radius is 10km for restaurant discovery
  const resultLimit = clampLimit(limit);

  // 2. Parse query clean text via NLP
  let parsedCleanQuery = query;
  try {
    const nlpRes = await requestNlpParse(query);
    parsedCleanQuery = nlpRes.cleanQuery || query;
  } catch (error) {
    console.error("NLP query parsing failed in restaurant search:", error);
  }

  // 3. Generate embeddings
  let queryVector: number[] = [];
  let isAiGatewayDown = false;
  try {
    queryVector = await requestEmbedding(parsedCleanQuery, "RETRIEVAL_QUERY");
  } catch (error: any) {
    console.warn("⚠️ AI Gateway embedding generation failed for restaurant search:", error.message);
    isAiGatewayDown = true;
  }

  // 4. Perform geospatial check for verified & open restaurants
  const nearbyRestaurants = await Restaurant.aggregate<any>([
    {
      $geoNear: {
        near: {
          type: "Point",
          coordinates: [longitude, latitude],
        },
        distanceField: "distance",
        maxDistance: searchRadiusKm * 1000,
        spherical: true,
        query: {
          isVerified: true,
          isOpen: true,
        },
      },
    },
  ]);

  if (nearbyRestaurants.length === 0) {
    return res.json({
      success: true,
      count: 0,
      results: [],
    });
  }

  const nearbyRestaurantIds = nearbyRestaurants.map(r =>
    mongoose.Types.ObjectId.isValid(r._id) ? new mongoose.Types.ObjectId(r._id) : r._id
  );

  const restaurantDistanceMap = new Map<string, number>();
  nearbyRestaurants.forEach((res) => {
    restaurantDistanceMap.set(res._id.toString(), res.distance / 1000);
  });

  // 5. Atlas Vector Search on restaurants
  const pipeline: any[] = [
    {
      $vectorSearch: {
        index: "restaurant_embedding_vector_index",
        path: "embedding",
        queryVector,
        numCandidates: Math.max(resultLimit * 20, 100),
        limit: Math.max(resultLimit * 5, 25),
        filter: {
          _id: { $in: nearbyRestaurantIds },
        },
      },
    },
    {
      $addFields: {
        vectorScore: { $meta: "vectorSearchScore" },
      },
    },
    { $limit: resultLimit },
    {
      $project: {
        embedding: 0,
        embeddingHash: 0,
      },
    },
  ];

  let items: any[] = [];
  try {
    if (isAiGatewayDown) {
      throw new Error("AI Gateway is down. Falling back to JS text match.");
    }
    items = await Restaurant.aggregate(pipeline);

    if (items.length === 0) {
      throw new Error("MongoDB $vectorSearch returned 0 results. Index might be missing. Proceeding to JS Fallback.");
    }

    // Blend vector similarity score and distance score
    items = items.map(item => {
      const distanceKm = restaurantDistanceMap.get(item._id.toString()) || 0;
      const distanceScore = Math.max(0, 1 - distanceKm / searchRadiusKm);
      const blendedScore = item.vectorScore * 0.7 + distanceScore * 0.3;
      return {
        ...item,
        distanceKm,
        distanceScore,
        blendedScore
      };
    });
    items.sort((a, b) => b.blendedScore - a.blendedScore);

  } catch (error: any) {
    console.warn("Fallback to JS text matching for Restaurant Search:", error.message);

    const queryWords = query.toLowerCase().split(/\s+/).filter(Boolean);

    // 6. JS keyword text match scoring fallback
    const candidateItems = nearbyRestaurants.map(item => {
      let textMatchScore = 0;
      const nameLower = (item.name || "").toLowerCase();
      const descLower = (item.description || "").toLowerCase();
      const tagsLower = (item.tags || []).map((t: string) => t.toLowerCase());
      const cuisineLower = (item.cuisineTypes || []).map((t: string) => t.toLowerCase());

      let matches = 0;
      queryWords.forEach(word => {
        if (nameLower.includes(word)) matches += 2.0;
        else if (descLower.includes(word)) matches += 1.0;
        else if (cuisineLower.some((c: string) => c.includes(word))) matches += 1.5;
        else if (tagsLower.some((t: string) => t.includes(word))) matches += 1.2;
      });
      textMatchScore = queryWords.length > 0 ? Math.min(1.0, matches / (queryWords.length * 2.0)) : 0;

      const distanceKm = restaurantDistanceMap.get(item._id.toString()) || 0;
      const distanceScore = Math.max(0, 1 - distanceKm / searchRadiusKm);
      const blendedScore = textMatchScore * 0.7 + distanceScore * 0.3;

      return {
        ...item,
        vectorScore: textMatchScore,
        distanceKm,
        distanceScore,
        blendedScore,
        embedding: undefined,
        embeddingHash: undefined
      };
    });

    candidateItems.sort((a, b) => b.blendedScore - a.blendedScore);
    items = candidateItems.slice(0, resultLimit);
  }

  return res.json({
    success: true,
    count: items.length,
    results: items,
    debug: {
      isAiGatewayDown
    }
  });
});

