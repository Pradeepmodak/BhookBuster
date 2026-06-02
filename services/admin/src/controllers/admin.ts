import { ObjectId } from "mongodb";
import TryCatch from "../middlewares/trycatch.js";
import {
  getRestaurantCollection,
  getRiderCollection,
} from "../utils/collection.js";
import {
  fetchAdminStats,
  fetchOrdersTrend,
  fetchTopItems,
} from "../services/admin.js";

export const getPendingRestaurant = TryCatch(async (req, res) => {
  const collection = await getRestaurantCollection();
  const query = {
    $or: [
      { isVerified: false },
      { isVerified: { $exists: false } },
      { isVerified: null }
    ]
  };
  
  console.log(`[Admin Service Log] Fetching pending restaurants... Collection: ${collection.collectionName}`);
  console.log(`[Admin Service Log] Query Details: ${JSON.stringify(query)}`);

  const restaurants = await collection.find(query).toArray();
  
  console.log(`[Admin Service Log] Database Query Complete. Retrieved ${restaurants.length} pending restaurant(s).`);

  res.json({
    count: restaurants.length,
    restaurants,
  });
});

export const getPendingRiders = TryCatch(async (req, res) => {
  const collection = await getRiderCollection();
  const query = {
    $or: [
      { isVerified: false },
      { isVerified: { $exists: false } },
      { isVerified: null }
    ]
  };

  console.log(`[Admin Service Log] Fetching pending riders... Collection: ${collection.collectionName}`);
  console.log(`[Admin Service Log] Query Details: ${JSON.stringify(query)}`);

  const riders = await collection.find(query).toArray();
  
  console.log(`[Admin Service Log] Database Query Complete. Retrieved ${riders.length} pending rider(s).`);

  res.json({
    count: riders.length,
    riders,
  });
});

export const verifyRestaurant = TryCatch(async (req, res) => {
  const { id } = req.params;

  if (typeof id !== "string") {
    return res.status(400).json({
      message: "invalid restaurant id",
    });
  }

  if (!ObjectId.isValid(id)) {
    return res.status(400).json({
      message: "Invalid object id",
    });
  }
  const result = await (
  await getRestaurantCollection()
).updateOne(
  { _id: new ObjectId(id) },
  {
    $set: {
      isVerified: true,
      updatedAt: new Date(),
    },
  },
);
if(result.matchedCount==0){
    return res.status(404).json({
        message:"Restaurant not found",
    })
}
res.json({
    message:"Restaurant verified successfully",
})
});

export const verifyRider = TryCatch(async (req, res) => {
  const { id } = req.params;

  if (typeof id !== "string") {
    return res.status(400).json({
      message: "invalid rider id",
    });
  }

  if (!ObjectId.isValid(id)) {
    return res.status(400).json({
      message: "Invalid object id",
    });
  }
  const result = await (
  await getRiderCollection()
).updateOne(
  { _id: new ObjectId(id) },
  {
    $set: {
      isVerified: true,
      updatedAt: new Date(),
    },
  },
);
if(result.matchedCount==0){
    return res.status(404).json({
        message:"Rider not found",
    })
}
res.json({
    message:"Rider verified successfully",
})
});

export const getAdminStats = TryCatch(async (req, res) => {
  const stats = await fetchAdminStats();
  res.status(200).json(stats);
});

export const getOrdersTrend = TryCatch(async (req, res) => {
  const days = req.query.days ? parseInt(req.query.days as string, 10) : 7;
  const trend = await fetchOrdersTrend(days);
  res.status(200).json(trend);
});

export const getTopItems = TryCatch(async (req, res) => {
  const items = await fetchTopItems();
  res.status(200).json(items);
});