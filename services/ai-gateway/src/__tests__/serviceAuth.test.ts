import crypto from "crypto";
import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it } from "@jest/globals";
import {
  RawBodyRequest,
  serviceAuth,
} from "../middleware/serviceAuth.js";

const sign = (body: string, secret: string) =>
  crypto.createHmac("sha256", secret).update(body).digest("hex");

const buildApp = () => {
  const app = express();
  app.use(
    express.json({
      verify: (req: RawBodyRequest, _res, buffer) => {
        req.rawBody = Buffer.from(buffer);
      },
    })
  );
  app.use(serviceAuth);
  app.post("/internal/test", (_req, res) => res.json({ ok: true }));
  return app;
};

describe("serviceAuth", () => {
  beforeEach(() => {
    process.env.GATEWAY_HMAC_SECRET = "test-secret";
  });

  it("accepts a valid HMAC-SHA256 signature over the raw body", async () => {
    const rawBody = JSON.stringify({ value: "signed" });

    const res = await request(buildApp())
      .post("/internal/test")
      .set("Content-Type", "application/json")
      .set("X-Service-Signature", sign(rawBody, "test-secret"))
      .send(rawBody)
      .expect(200);

    expect(res.body).toEqual({ ok: true });
  });

  it("rejects requests without a signature", async () => {
    await request(buildApp())
      .post("/internal/test")
      .send({ value: "unsigned" })
      .expect(401);
  });

  it("rejects requests with an invalid signature", async () => {
    await request(buildApp())
      .post("/internal/test")
      .set("X-Service-Signature", sign("different-body", "test-secret"))
      .send({ value: "tampered" })
      .expect(401);
  });
});

