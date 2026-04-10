# BhookBuster System Design

This document is optimized for interview walkthroughs. It explains service boundaries, request flow, async events, and runtime behavior.

## 1) High-Level Architecture

```mermaid
flowchart LR
  U["User (Web / Mobile Browser)"] --> FE["Frontend (React + Vite)"]
  FE --> AUTH["Auth Service :5000"]
  FE --> REST["Restaurant Service :3000"]
  FE --> RIDER["Rider Service :5001"]
  FE --> ADMIN["Admin Service :2000"]
  FE --> UTIL["Utils Service :7000"]
  FE <--> RT["Realtime Service :4000 (Socket.IO)"]

  AUTH --> MDB[("MongoDB")]
  REST --> MDB
  RIDER --> MDB
  ADMIN --> MDB

  ADMIN <--> REDIS[("Redis Cache")]
  REST <--> REDIS

  REST <--> MQ[("RabbitMQ")]
  RIDER <--> MQ
  UTIL <--> MQ

  UTIL --> PAY["Razorpay / Stripe"]
```

## 2) Auth + Role Bootstrap Flow

```mermaid
sequenceDiagram
  participant User
  participant FE as Frontend
  participant Auth as Auth Service
  participant G as Google OAuth
  participant DB as MongoDB

  User->>FE: Click "Continue with Google"
  FE->>G: OAuth authorization code flow
  G-->>FE: auth code
  FE->>Auth: POST /api/auth/login (code)
  Auth->>G: Exchange code for token + profile
  Auth->>DB: Upsert user
  Auth-->>FE: JWT + user payload
  FE->>Auth: GET /api/auth/me (token verify)
  Auth-->>FE: user + role
```

## 3) Order Lifecycle + Async Events

```mermaid
sequenceDiagram
  participant C as Customer
  participant FE as Frontend
  participant RS as Restaurant Service
  participant US as Utils Service
  participant MQ as RabbitMQ
  participant RDS as Rider Service
  participant RTS as Realtime Service

  C->>FE: Checkout (Razorpay/Stripe)
  FE->>RS: POST /api/order/new
  RS-->>FE: orderId + amount
  FE->>US: Create payment session/order
  US-->>FE: payment metadata (session/order)
  C->>US: Complete payment
  US->>MQ: publish PAYMENT_SUCCESS(orderId)
  RS->>MQ: consume PAYMENT_SUCCESS, mark paid
  RS->>RTS: emit order:update to user room

  RS->>MQ: publish ORDER_READY_FOR_RIDER
  RDS->>MQ: consume ORDER_READY_FOR_RIDER
  RDS->>RS: assign rider (internal key)
  RS->>RTS: emit order:rider_assigned (user + restaurant rooms)
```

## 4) Admin Analytics Flow

```mermaid
flowchart LR
  FE["Admin UI"] --> A["Admin Service /admin/*"]
  A --> C{"Redis cache hit?"}
  C -->|Yes| FE
  C -->|No| DB[("MongoDB Aggregations")]
  DB --> A
  A --> REDIS[("Redis set EX TTL")]
  A --> FE
```

## 5) Realtime Delivery Flow

```mermaid
flowchart TD
  RS["Restaurant Service"] --> RTS["Realtime Internal /emit"]
  RTS --> U1["Room: user:{userId}"]
  RTS --> U2["Room: restaurant:{restaurantId}"]

  R["Rider App"] --> RTS
  RTS --> U1
```

## 6) Service Responsibilities

- Auth service: OAuth token exchange, JWT issuance, profile/role verification.
- Restaurant service: catalog, cart, order creation, order status, rider-assignment integration.
- Rider service: rider profile, availability, accepting orders, delivery status transition.
- Admin service: pending approvals + analytics APIs + cache-backed insights.
- Utils service: cloud upload, payment providers, payment verification events.
- Realtime service: room-based socket event fan-out.

## 7) Data and Consistency Notes

- Primary persistence: MongoDB collections per domain.
- Event consistency: payment and rider flows are eventually consistent via RabbitMQ.
- Cache consistency: TTL-based, with DB fallback when cache miss or Redis unavailable.
- Security boundary: internal service calls validated with `x-internal-key`.

## 8) Scale and Reliability Improvements (Roadmap)

1. Add API gateway + service discovery.
2. Add retries, dead-letter queues, and idempotency keys for payment/event consumers.
3. Add observability: metrics, tracing, centralized logs, and alerting.
4. Introduce read models for analytics-heavy APIs.
5. Add contract tests between services for safer evolution.
