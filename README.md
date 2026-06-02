# BhookBuster

BhookBuster is a cutting-edge, full-stack food delivery platform built on a scalable microservices architecture. It provides distinct, optimized experiences for customers, restaurant operators, riders, and admins. Beyond standard transactional ordering, payment orchestration, and real-time delivery tracking, BhookBuster leverages **AI-driven semantic search**, **taste profiling**, and **vector embeddings** to deliver a hyper-personalized food discovery experience.

## Production Readiness Snapshot

- **AI Integration:** Google Gemini (1.5 Pro & text-embedding-004) powers natural language semantic search and personalized restaurant/dish recommendations.
- **Verified Microservices:** `auth`, `restaurant`, `rider`, `admin`, `realtime`, `utils`, `ai-gateway`.
- **Performance & Analytics:** Redis cache-aside caching accelerates the `admin`, `restaurant`, and `rider` services. Timezone-aware date bucketing ensures 100% accurate daily metric trends.
- **Event-Driven Workflows:** RabbitMQ manages asynchronous payment verifications and complex rider-dispatch algorithms.
- **True Realtime Sync:** Authenticated Socket.IO namespaces orchestrate live order updates, admin analytics refreshes, and native GPS `watchPosition` rider tracking.
- **Payments:** Seamless checkout orchestration with Razorpay and Stripe.

## Architecture

### Microservices

- `services/ai-gateway`: Centralized AI routing hub handling semantic search query parsing, embedding generation, and taste profile analysis via Gemini.
- `services/auth`: Google OAuth login, JWT issuance, role selection, and user profile management.
- `services/restaurant`: Restaurant onboarding, menu management, vector-embedded search catalog, AI recommendations, checkout, and seller analytics.
- `services/rider`: Rider profile, availability toggling, RabbitMQ queue polling, and delivery progression tracking.
- `services/admin`: Verification queues, automated cache-invalidation hooks, and real-time platform analytics (revenue, order volume, subsidies).
- `services/realtime`: Secure Socket.IO gateway routing internal HTTP events to external websocket rooms.
- `services/utils`: Payment provider integrations (Razorpay, Stripe), payment event publishing, and Cloudinary file uploads.
- `frontend`: React + Vite web client tailored with role-based routing and lazy loading.

### Core Infrastructure

- **MongoDB (Atlas Vector Search):** Primary persistence and high-dimensional vector storage for menu items.
- **Redis:** Cache-aside reads on hot analytics and rider/catalog endpoints with intelligent TTL invalidation.
- **RabbitMQ:** Asynchronous service decoupling and retry logic.
- **Socket.IO:** Realtime room-based event fan-out for customers, sellers, and admins.

## Key AI Features

### Semantic Food Search
Users can search using unstructured natural language (e.g., *"spicy chicken but healthy"*, *"sweet desserts for two"*). The AI Gateway converts these queries into embeddings and performs an `$aggregator` vector search against the pre-embedded menu catalog, matching users with conceptually relevant dishes rather than relying on exact keyword matches.

### Taste Profiling & Recommendations
Every order a user makes is logged as a food event. The AI Gateway periodically analyzes these events to build and refine a personal **User Taste Profile** (e.g., "Prefers high-protein, moderately spicy Asian cuisine"). When users open the app, they receive uniquely tailored restaurant and dish recommendations based on their evolving profile.

## Key Platform Features

### Customer
- **Discover:** Geo-aware lookups combined with AI semantic matching.
- **Checkout:** Manage carts, save addresses, and securely checkout.
- **Track:** Watch the rider's progress on a live interactive map powered by Leaflet and native GPS streaming.

### Restaurant
- **Manage:** Create profiles, add/remove menu items, and automatically sync embeddings.
- **Fulfill:** Accept and progress orders through various fulfillment states.
- **Analyze:** View deep dashboard analytics regarding revenue, order patterns, and item performance.

### Rider
- **Dispatch:** Receive dispatch-ready jobs through queue polling and instant websocket notifications.
- **Deliver:** Update delivery states and accurately broadcast location using native mobile GPS `watchPosition` logic.

### Admin
- **Govern:** Verify pending restaurants and riders to maintain platform integrity.
- **Monitor:** Inspect platform revenue, order volume, and top-selling items on a dashboard that auto-refreshes in real-time via websockets.

## Redis Strategy

BhookBuster uses cache-aside caching on read-heavy endpoints.

- `admin`: Platform stats, trend series, top items, and verification queues.
- `restaurant`: Nearby restaurant discovery, menu listing, and seller analytics.
- `rider`: Profile data, active orders, and delivery queues.

**Trade-offs:** Cache-aside keeps the codebase fault-tolerant, allowing services to fall back gracefully to direct DB queries if Redis goes offline.

## Setup

### Prerequisites

- Node.js 20+
- MongoDB
- Redis
- RabbitMQ

### Install

```bash
cd frontend && npm install
cd ../services/ai-gateway && npm install
cd ../services/auth && npm install
cd ../services/restaurant && npm install
cd ../services/rider && npm install
cd ../services/admin && npm install
cd ../services/realtime && npm install
cd ../services/utils && npm install
```

### Run Services

```bash
cd services/ai-gateway && npm run dev
cd services/auth && npm run dev
cd services/restaurant && npm run dev
cd services/rider && npm run dev
cd services/admin && npm run dev
cd services/realtime && npm run dev
cd services/utils && npm run dev
cd frontend && npm run dev
```

## Environment Variables

Use local `.env` files per service. The platform expects the following core keys:

### Frontend
```env
VITE_AUTH_SERVICE_URL=http://localhost:5000
VITE_RESTAURANT_SERVICE_URL=http://localhost:3000
VITE_RIDER_SERVICE_URL=http://localhost:5001
VITE_ADMIN_SERVICE_URL=http://localhost:2000
VITE_REALTIME_SERVICE_URL=http://localhost:4000
VITE_UTILS_SERVICE_URL=http://localhost:7000
VITE_GOOGLE_CLIENT_ID=your_google_client_id
VITE_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
VITE_INTERNAL_SERVICE_KEY=internal_service_key
```

### AI Gateway Service
```env
PORT=8000
GEMINI_API_KEY=your_google_gemini_key
INTERNAL_SERVICE_KEY=replace_me
```

*(See individual service directories for their specific `.env.example` configurations like MongoDB URI, RabbitMQ URL, Redis URL, JWT Secrets, etc.)*

## Deployment Notes

- Frontend assets and Nginx configurations are prepared in `frontend/`.
- Dockerfiles exist for key services.
- `docker-compose.aws.yml` and docs under `docs/` provide deployment guidance.

Recommended production mapping:
- **Frontend:** AWS S3 + CloudFront / Vercel
- **APIs:** AWS ECS/Fargate or Kubernetes
- **Database:** MongoDB Atlas (with Vector Search enabled)
- **Cache & Queues:** AWS ElastiCache (Redis) & Amazon MQ (RabbitMQ)

---

*This project showcases multi-role product design, async service coordination, LLM-powered semantic search, complex map-based routing, cache design with failure fallbacks, and real-time user experiences.*
