const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const buildForYouPipeline = ({
  embeddingCentroid,
  restaurantIds,
  latitude,
  longitude,
  radiusKm,
  limit,
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

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const User = require('./dist/models/User.js').default;
  const UserTasteProfile = require('./dist/models/UserTasteProfile.js').default;
  const MenuItems = require('./dist/models/MenuItems.js').default;
  const Restaurant = require('./dist/models/Restaurant.js').default;
  
  const user = await User.findOne({ email: 'pradeepmodakofficial@gmail.com' });
  const profile = await UserTasteProfile.findOne({ userId: user._id });
  
  const latitude = 22.7766;
  const longitude = 86.1436;
  const radiusKm = 15;
  const limit = 10;
  
  const popularNearby = await Restaurant.aggregate([
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
    { $sort: { isOpen: -1, distance: 1 } },
    { $addFields: { distanceKm: { $round: [{ $divide: ["$distance", 1000] }, 2] } } },
    { $limit: limit },
  ]);
  
  const restaurantIds = popularNearby.map(r => r._id);
  
  const pipeline = buildForYouPipeline({
      embeddingCentroid: profile.embeddingCentroid,
      restaurantIds,
      latitude,
      longitude,
      radiusKm,
      limit,
  });
  
  console.log('Running Pipeline...');
  try {
    const results = await MenuItems.aggregate(pipeline);
    console.log('Pipeline Results count:', results.length);
  } catch(e) {
    console.log('Error!', e.message);
  }

  process.exit(0);
}).catch(console.error);
