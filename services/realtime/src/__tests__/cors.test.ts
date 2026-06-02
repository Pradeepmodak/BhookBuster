import express from "express";
import cors from "cors";
import request from "supertest";
import { afterEach, describe, expect, it } from "@jest/globals";
import { corsOptions, getAllowedOrigins } from "../config/cors.js";

describe("CORS configuration", () => {
  const originalCorsOrigin = process.env.CORS_ORIGIN;

  afterEach(() => {
    process.env.CORS_ORIGIN = originalCorsOrigin;
  });

  const buildApp = () => {
    const app = express();
    app.use(cors(corsOptions));
    app.get("/ping", (_req, res) => res.json({ ok: true }));
    return app;
  };

  it("allows configured origins", async () => {
    process.env.CORS_ORIGIN = "http://allowed.test,http://other.test";

    const res = await request(buildApp())
      .get("/ping")
      .set("Origin", "http://allowed.test")
      .expect(200);

    expect(res.headers["access-control-allow-origin"]).toBe("http://allowed.test");
    expect(getAllowedOrigins()).toEqual(["http://allowed.test", "http://other.test"]);
  });

  it("does not emit CORS headers for unconfigured origins", async () => {
    process.env.CORS_ORIGIN = "http://allowed.test";

    const res = await request(buildApp())
      .get("/ping")
      .set("Origin", "http://blocked.test")
      .expect(200);

    expect(res.headers["access-control-allow-origin"]).toBeUndefined();
  });
});
