import axios from "axios";
import getBuffer from "../config/datauri.js";
import { AuthenticatedRequest } from "../middlewares/isAuth.js";
import TryCatch from "../middlewares/trycatch.js";
import { Rider } from "../models/Rider.js";

export const addRiderProfile = TryCatch(
  async (req: AuthenticatedRequest, res) => {
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    if (user.role !== "rider"){
        return res.status(403).json({
            message:"Forbidden - Only riders can add rider profile",
        });
    }
const file = req.file;

if (!file) {
  return res.status(400).json({
    message: "Rider Image is required",
  });
}

const fileBuffer = getBuffer(file);

if (!fileBuffer?.content) {
  return res.status(500).json({
    message: "Failed to generate image buffer",
  });
}

const { data: uploadResult } = await axios.post(
  `${process.env.UTILS_SERVICE}/api/upload`,
  {
    buffer:fileBuffer.content,

  }
);
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
  userId: user._id,
});

if (existingProfile) {
  return res.status(400).json({
    message: "Rider profile already exists",
  });
}
const riderProfile = await Rider.create({
  userId: user._id,
  picture: uploadResult.url,
  phoneNumber,
  aadharNumber,
  drivingLicenseNumber,
  location: {
    type: "Point",
    coordinates: [longitude, latitude],
  },
  isAvailable: false,
  isVerified: false,
});
return res.status(201).json({
    message:"Rider profile created successfully",
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

    const account = await Rider.findOne({ userId: user._id });

    res.json(account);
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

const rider = await Rider.findOne({
  userId: user._id,
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
  coordinates: [longitude, latitude],
};
await rider.save();

res.json({
  message: isAvailable
    ? "Rider is now online"
    : "Rider is now offline",
    rider
});
  }
);

