import axios from "axios";
import getBuffer from "../config/datauri.js";
import { AuthenticatedRequest } from "../middlewares/isAuth.js";
import TryCatch from "../middlewares/trycatch.js";
import { Rider } from "../models/Rider.js";
import { CACHE_TTL, deleteCache, getCache, setCache, withCache } from "../cache/redis.js";
import mongoose from "mongoose";
const requireServiceUrl = (url: string | undefined, name: string) => {
  if (!url) {
    throw new Error(`${name} is not configured`);
  }
  return url;
};

const getRestaurantServiceUrl = () =>
  requireServiceUrl(process.env.RESTAURANT_SERVICE_URL || process.env.RESTAURANT_SERVICE || "http://localhost:3000", "RESTAURANT service URL");

const getUtilsServiceUrl = () =>
  process.env.UTILS_SERVICE_URL || process.env.UTILS_SERVICE || "http://localhost:7000";

const normalizeUserId = (userId: unknown) => String(userId);

export const addRiderProfile = TryCatch (
  async (req: AuthenticatedRequest, res) => {
    const user = req.user;

    if (!user){
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    if (user.role !== "rider") {
      return res.status(403).json({
        message: "Forbidden - Only riders can add rider profile",
      });
    }
    const normalizedUserId = normalizeUserId(user._id);
    const file = req.file;
    let riderImage = user.image;

    if (file) {
      const fileBuffer = getBuffer(file);

      if (!fileBuffer?.content) {
        return res.status(500).json({
          message: "Failed to generate image buffer",
        });
      }

      const utilsServiceUrl = getUtilsServiceUrl();
      if (utilsServiceUrl) {
        const { data: uploadResult } = await axios.post(
          `${utilsServiceUrl}/api/upload`,
          {
            buffer: fileBuffer.content,

          }
        );
        riderImage = uploadResult.url;
      }
    }
    const {
      phoneNumber,
      aadharNumber,
      drivingLicenseNumber,
      latitude,
      longitude,
    } = req.body;

    if (
      !phoneNumber ||
      !aadharNumber ||
      !drivingLicenseNumber ||
      latitude === undefined ||
      longitude === undefined
    ) {
      return res.status(400).json({
        message: "All fields are required",
      });
    }

    const existingProfile = await Rider.findOne({
      userId: normalizedUserId,
    });

    if (existingProfile) {
      return res.status(400).json({
        message: "Rider profile already exists",
      });
    }
    const riderProfile = await Rider.create({
      userId: normalizedUserId,
      picture: riderImage,
      phoneNumber,
      aadharNumber,
      drivingLicenseNumber,
      location: {
        type: "Point",
        coordinates: [Number(longitude), Number(latitude)],
      },
      isAvailable: false,
      isVerified: false,
    });
    await deleteCache(`rider:profile:${normalizedUserId}`);
    await deleteCache("admin:verification:riders");
    await deleteCache("admin:stats");
    return res.status(201).json({
      message: "Rider profile created successfully",
      riderProfile
    })
  }
);

export const fetchMyProfile = TryCatch(
  async (req: AuthenticatedRequest, res) => {
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    const { data, cached } = await withCache({
      key: `rider:profile:${normalizeUserId(user._id)}`,
      ttl: CACHE_TTL.lists,
      fetcher: async () => Rider.findOne({ userId: normalizeUserId(user._id) }),
    });

    res.json({
      rider: data?.toJSON ? data.toJSON() : data ?? null,
      cached,
    });
  }
);
export const toggleRiderAvailability = TryCatch(
  async (req: AuthenticatedRequest, res) => {
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    if (user.role !== "rider") {
      return res.status(403).json({
        message: "Only riders can update rider profile",
      });
    }
    const { isAvailable, latitude, longitude } = req.body;

    if (typeof isAvailable !== "boolean") {
      return res.status(400).json({
        message: "isAvailable must be boolean",
      });
    }

    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({
        message: "location is required",
      });
    }

    const parsedLatitude = Number(latitude);
    const parsedLongitude = Number(longitude);

    if (Number.isNaN(parsedLatitude) || Number.isNaN(parsedLongitude)) {
      return res.status(400).json({
        message: "location must be valid coordinates",
      });
    }

    const normalizedUserId = normalizeUserId(user._id);
    const rider = await Rider.findOne({
      userId: normalizedUserId,
    });

    if (!rider) {
      return res.status(404).json({
        message: "Rider profile not found",
      });
    }

    if (isAvailable && !rider.isVerified) {
      return res.status(403).json({
        message: "Rider is not verified",
      });
    }
    rider.isAvailable = isAvailable;

    rider.location = {
      type: "Point",
      coordinates: [parsedLongitude, parsedLatitude],
    };
    rider.lastActiveAt = new Date();
    await rider.save();

    await deleteCache(`rider:profile:${normalizedUserId}`);
    await deleteCache(`rider:assigned-order:${rider._id}`);

    res.json({
      message: isAvailable
        ? "Rider is now online"
        : "Rider is now offline",
      rider
    });
  }
);

export const acceptOrder = TryCatch(async (req: AuthenticatedRequest, res) => {
  const riderUserId = req.user?._id;
  const { orderId } = req.params;

  if (!riderUserId) {
    return res.status(400).json({
      message: "Please Login",
    });
  }

  const normalizedRiderUserId = normalizeUserId(riderUserId);
  const rider = await Rider.findOne({ userId: normalizedRiderUserId, isVerified: true });
  const restaurantServiceUrl = getRestaurantServiceUrl();

  if (!rider) {
    return res.status(404).json({ message: "rider not found" });
  }
  try {
    const { data } = await axios.put(
      `${restaurantServiceUrl}/api/order/assign/rider`,
      {
        orderId,
        riderId: rider._id.toString(),
        riderUserId: rider.userId,
        riderName: req.user?.name || "Rider",
        riderPhone: rider.phoneNumber,
      },
      {
        headers: {
          "x-internal-key": process.env.INTERNAL_SERVICE_KEY,
          "x-rider-id": rider._id.toString(),
        },
      }
    );
    if (data.success) {
      await Rider.findOneAndUpdate(
        {
          userId: normalizedRiderUserId,
          isAvailable: true,
        },
        { isAvailable: false },
        { new: true }
      );
      await deleteCache(`rider:profile:${normalizedRiderUserId}`);
      await deleteCache(`rider:assigned-order:${rider._id}`);
      await setCache(`rider:queue:${normalizedRiderUserId}`, [], CACHE_TTL.lists);

      return res.json({ message: "Order accepted", order: data.order });
    }
  } catch (error) {
    return res.status(400).json({
      message: axios.isAxiosError(error)
        ? error.response?.data?.message || "Unable to accept order"
        : "Unable to accept order",
    });
  }
});

export const fetchMyCurrentOrder = TryCatch(async (req: AuthenticatedRequest, res) => {
  const riderUserId = req.user?._id;

  if (!riderUserId) {
    return res.status(400).json({
      message: "Please Login",
    });
  }

  const rider = await Rider.findOne({ userId: normalizeUserId(riderUserId) });
  const restaurantServiceUrl = getRestaurantServiceUrl();

  if (!rider || !rider._id) {
    // No rider profile yet — return null order instead of error
    return res.json({ order: null });
  }

  const cacheKey = `rider:assigned-order:${rider._id}`;
  const cachedOrder = await getCache(cacheKey);
  if (cachedOrder !== null) {
    return res.json({ order: cachedOrder, cached: true });
  }

  try {
    const response = await axios.get(
      `${restaurantServiceUrl}/api/order/current/rider?riderId=${rider._id}`,
      {
        headers: {
          "x-internal-key": process.env.INTERNAL_SERVICE_KEY,
        },
      }
    );
    await setCache(cacheKey, response.data, CACHE_TTL.lists);
    res.json({ order: response.data, cached: false });
  } catch (error) {
    console.error("Rider current order fetch failed:", error);
    // 404 means no active order — this is normal, not an error
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      await setCache(cacheKey, null, CACHE_TTL.lists);
      return res.json({ order: null, cached: false });
    }
    res.status(500).json({
      message: axios.isAxiosError(error)
        ? error.response?.data?.message || "Failed to fetch current order"
        : "Failed to fetch current order",
    });
  }
});

export const fetchDeliveryQueue = TryCatch(async (req: AuthenticatedRequest, res) => {
  const riderUserId = req.user?._id;

  if (!riderUserId) {
    return res.status(401).json({
      message: "Unauthorized",
    });
  }

  const normalizedRiderUserId = normalizeUserId(riderUserId);
  const queueKey = `rider:queue:${normalizedRiderUserId}`;
  const cachedQueue =
    (await getCache<Array<{ orderId: string; restaurantId: string }>>(queueKey)) || [];

  if (cachedQueue.length > 0) {
    return res.json({
      count: cachedQueue.length,
      queue: cachedQueue,
      cached: true,
    });
  }

  const rider = await Rider.findOne({ userId: normalizedRiderUserId });
  if (!rider?.location?.coordinates) {
    return res.json({
      count: 0,
      queue: [],
      cached: false,
    });
  }

  const restaurantServiceUrl = getRestaurantServiceUrl();
  const [longitude, latitude] = rider.location.coordinates;

  const { data } = await axios.get(`${restaurantServiceUrl}/api/order/available/rider`, {
    params: {
      latitude,
      longitude,
      maxDistance: 5000,
    },
    headers: {
      "x-internal-key": process.env.INTERNAL_SERVICE_KEY,
    },
  });

  const queue = (data?.orders || []).map((entry: { orderId: string; restaurantId: string }) => ({
    orderId: entry.orderId,
    restaurantId: entry.restaurantId,
  }));

  await setCache(queueKey, queue, CACHE_TTL.lists);

  res.json({
    count: queue.length,
    queue,
    cached: false,
  });
});


export const updateRiderProfile = TryCatch(async (req: AuthenticatedRequest, res) => {
  const user = req.user;
  if (!user || user.role !== "rider") {
    return res.status(403).json({ message: "Forbidden" });
  }
  const normalizedUserId = normalizeUserId(user._id);

  const { phoneNumber, aadharNumber, drivingLicenseNumber } = req.body;
  const file = req.file;

  const rider = await Rider.findOne({ userId: normalizedUserId });
  if (!rider) return res.status(404).json({ message: "Rider profile not found" });

  if (phoneNumber) {
    rider.phoneNumber = phoneNumber;
  }

  if (aadharNumber) {
    rider.aadharNumber = aadharNumber;
  }

  if (drivingLicenseNumber) {
    rider.drivingLicenseNumber = drivingLicenseNumber;
  }

  if (file) {
    const fileBuffer = getBuffer(file);
    if (!fileBuffer?.content) {
      return res.status(500).json({ message: "Failed to process image format" });
    }

    const utilsServiceUrl = getUtilsServiceUrl();
    if (utilsServiceUrl) {
      const { data: uploadResult } = await axios.post(
        `${utilsServiceUrl}/api/upload`,
        { buffer: fileBuffer.content }
      );
      rider.picture = uploadResult.url;
    }
  }

  await rider.save();
  await deleteCache(`rider:profile:${normalizedUserId}`);
  await deleteCache("admin:verification:riders");

  res.json({ message: "Profile updated successfully!" });
});

export const updateOrderStatus = TryCatch(
  async (req: AuthenticatedRequest, res) => {
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({
        message: "Please Login",
      });
    }

    const rider = await Rider.findOne({ userId: userId });
    const restaurantServiceUrl = getRestaurantServiceUrl();

    if (!rider || !rider._id) {
      return res.status(404).json({
        message: "Rider profile not found",
      })
    }

    const orderId = typeof req.params.orderId === "string" ? req.params.orderId : null;

    if (!orderId) {
      return res.status(400).json({
        message: "Order id is required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({
        message: "Invalid order id",
      });
    }

    try {
      const { data } = await axios.put(
        `${restaurantServiceUrl}/api/order/update/status/rider/${orderId}`,
        {},
        {
          headers: {
            "x-internal-key": process.env.INTERNAL_SERVICE_KEY,
            "x-rider-id": rider._id.toString(),
          },
        }
      );
      res.json({
        message: data.message,
      })
    } catch (error) {
      console.error("Rider order status update failed:", error);

      if (axios.isAxiosError(error)) {
        return res.status(error.response?.status || 500).json({
          message: error.response?.data?.message || "Failed to update order status",
        });
      }

      res.status(500).json({
        message: "Failed to update order status",
      })
    }
  }
);
