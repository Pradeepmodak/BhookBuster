import express from "express";
import request from "supertest";
import jwt from "jsonwebtoken";
import cloudinary from "cloudinary";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import cloudinaryRoutes from "../routes/cloudinary.js";

jest.mock("cloudinary", () => ({
  __esModule: true,
  default: {
    v2: {
      uploader: {
        upload: jest.fn(),
      },
    },
  },
  v2: {
    uploader: {
      upload: jest.fn(),
    },
  },
}));

describe("POST /api/upload", () => {
  const jwtSecret = "test-secret";

  beforeEach(() => {
    process.env.JWT_SECRET_KEY = jwtSecret;
    jest.clearAllMocks();
    (cloudinary.v2.uploader.upload as jest.Mock).mockResolvedValue({
      secure_url: "https://cdn.test/image.jpg",
    });
  });

  const buildApp = () => {
    const app = express();
    app.use(express.json({ limit: "6mb" }));
    app.use("/api", cloudinaryRoutes);
    return app;
  };

  const token = jwt.sign({ user: { _id: "user-1", role: "seller" } }, jwtSecret);
  const image = `data:image/png;base64,${Buffer.from("image").toString("base64")}`;

  it("uploads authenticated image data under the size limit", async () => {
    const res = await request(buildApp())
      .post("/api/upload")
      .set("Authorization", `Bearer ${token}`)
      .send({ buffer: image })
      .expect(200);

    expect(res.body.url).toBe("https://cdn.test/image.jpg");
    expect(cloudinary.v2.uploader.upload).toHaveBeenCalledWith(image, {
      resource_type: "image",
    });
  });

  it("rejects unauthenticated uploads", async () => {
    await request(buildApp())
      .post("/api/upload")
      .send({ buffer: image })
      .expect(401);

    expect(cloudinary.v2.uploader.upload).not.toHaveBeenCalled();
  });

  it("rejects non-image data", async () => {
    await request(buildApp())
      .post("/api/upload")
      .set("Authorization", `Bearer ${token}`)
      .send({ buffer: "data:text/plain;base64,SGVsbG8=" })
      .expect(400);

    expect(cloudinary.v2.uploader.upload).not.toHaveBeenCalled();
  });

  it("rejects image data over the size limit", async () => {
    const oversizedImage = `data:image/png;base64,${Buffer.alloc(
      5 * 1024 * 1024 + 1
    ).toString("base64")}`;

    await request(buildApp())
      .post("/api/upload")
      .set("Authorization", `Bearer ${token}`)
      .send({ buffer: oversizedImage })
      .expect(413);

    expect(cloudinary.v2.uploader.upload).not.toHaveBeenCalled();
  });
});
