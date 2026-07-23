<p align="center">
  <img src="https://img.shields.io/badge/BhookBuster-PRIME-facc15?style=for-the-badge&labelColor=0f0f0f&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iI2ZhY2MxNSI+PHBhdGggZD0iTTEyIDJMMyA3djEwbDkgNSA5LTVWN2wtOS01eiIvPjwvc3ZnPg==" alt="BhookBuster" />
</p>

<h1 align="center">🍔 BhookBuster</h1>

<p align="center">
  <strong>AI-Powered Food Delivery Platform • Microservices Architecture • Real-Time Tracking</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/React_19-61DAFB?style=flat-square&logo=react&logoColor=black" />
  <img src="https://img.shields.io/badge/Node.js-339933?style=flat-square&logo=node.js&logoColor=white" />
  <img src="https://img.shields.io/badge/MongoDB_Atlas-47A248?style=flat-square&logo=mongodb&logoColor=white" />
  <img src="https://img.shields.io/badge/Redis-DC382D?style=flat-square&logo=redis&logoColor=white" />
  <img src="https://img.shields.io/badge/RabbitMQ-FF6600?style=flat-square&logo=rabbitmq&logoColor=white" />
  <img src="https://img.shields.io/badge/Socket.IO-010101?style=flat-square&logo=socket.io&logoColor=white" />
  <img src="https://img.shields.io/badge/Docker-2496ED?style=flat-square&logo=docker&logoColor=white" />
  <img src="https://img.shields.io/badge/Gemini_AI-8E75B2?style=flat-square&logo=google&logoColor=white" />
  <img src="https://img.shields.io/badge/Razorpay-0C2451?style=flat-square&logo=razorpay&logoColor=white" />
  <img src="https://img.shields.io/badge/Stripe-635BFF?style=flat-square&logo=stripe&logoColor=white" />
</p>

<p align="center">
  <em>An enterprise-grade, full-stack food delivery ecosystem built with 7 microservices, AI-driven semantic search, real-time GPS tracking, and hyper-personalized recommendations.</em>
</p>

---

## ⚡ Why BhookBuster?

BhookBuster isn't a CRUD app with a food theme — it's a **production-grade distributed system** that solves real problems at scale:

| Problem | BhookBuster's Solution |
|:---|:---|
| 🔍 Users type vague searches like *"something spicy under 300"* | **AI NLP Parser** extracts structured filters + **Vector Search** finds semantically matching dishes |
| 📡 Customers want to see their rider live | **WebSocket GPS pipeline** streams `watchPosition` coordinates through a dedicated realtime gateway |
| 💳 Unpaid orders clog the database | **MongoDB TTL indexes** auto-delete abandoned checkouts after 15 min — no cron jobs needed |
| 🚴 Finding the right rider is slow | **Geofenced dispatch** via `2dsphere` queries + RabbitMQ async matching within 5km radius |
| 🍽️ Generic recommendations bore users | **Rolling taste profile centroids** (80/20 exponential decay) adapt to every order and click |
| 🔌 Restarting APIs drops WebSocket users | **Decoupled realtime gateway** — REST services can restart without breaking live connections |

---

## 🏗️ Architecture Overview

```
                    ┌──────────────────────────────────────────────────────────┐
                    │              ⚛️  REACT 19 + VITE + TAILWIND              │
                    │      (SPA: 15 Pages • Framer Motion • Leaflet Maps)     │
                    └──────┬──────────────┬──────────────┬─────────────┬──────┘
                           │              │              │             │
                      HTTP │         HTTP │         HTTP │   WebSocket │
                           ▼              ▼              ▼             ▼
    ┌──────────────────────┴┐     ┌───────┴──────────────┐      ┌─────┴───────────────┐
    │   🔐 auth-service     │     │  🍕 restaurant-service│◄────►│  📡 realtime-service │
    │       [:5000]         │     │       [:3000]         │      │       [:4000]        │
    │  Google OAuth + JWT   │     │  Catalog • Orders     │      │  Socket.IO Gateway   │
    └──────────┬────────────┘     │  Search • Cart        │      └──────────▲───────────┘
               │                  └───────┬──────┬────────┘                 │
          REST │                     REST │      │ Vector Search    Internal Emit
               ▼                          ▼      ▼                  HTTP (HMAC)
    ┌──────────┴────────────┐     ┌───────┴──────┴────────┐                 │
    │   💰 utils-service    │◄───►│   🤖 ai-gateway       │─────────────────┘
    │       [:7000]         │     │       [:5010]          │
    │  Razorpay • Stripe    │     │  Gemini Embeddings     │
    │  Cloudinary Uploads   │     │  Groq NLP • Insights   │
    └──────────┬────────────┘     └────────────────────────┘
               │                          ▲
               │ AMQP                     │ AMQP (user events)
               ▼                          ▼
    ┌──────────────────────────────────────────────────────────────────────────┐
    │                          🐰 RABBITMQ BROKER                             │
    │   Queues: payment_event • order_ready_queue • user_event_queue          │
    └──────────────────────────────┬───────────────────────────────────────────┘
                                   │ AMQP (dispatch)
                                   ▼
                      ┌────────────────────────────┐
                      │   🚴 rider-service          │
                      │       [:5001]               │
                      │  Geofencing • Dispatch      │
                      │  GPS Tracking • Earnings    │
                      └────────────┬────────────────┘
                                   │
                      ┌────────────▼────────────────┐
                      │        🗄️ DATA LAYER         │
                      │   MongoDB Atlas (Vector)    │
                      │   Redis (Cache-Aside)       │
                      └─────────────────────────────┘

              ┌──────────────────────────────────────┐
              │  🛡️ admin-service [:6000]             │
              │  Verification • Revenue Analytics    │
              │  Platform Governance                 │
              └──────────────────────────────────────┘
```

---

## 🧠 AI Engine — The Intelligence Layer

BhookBuster's AI isn't a bolted-on chatbot. It's deeply woven into the search, recommendations, and analytics pipelines.

### 🔍 Semantic Search Pipeline

When a user types *"cheesy garlic bread under 200 rupees"*, here's what happens in < 500ms:

```
   User Query                  AI Gateway                    MongoDB Atlas
  ─────────────────────────────────────────────────────────────────────────
                                    
  "cheesy garlic       ──►  Groq llama-3.3-70b         ──►  $vectorSearch
   bread under 200"         NLP Parse                       menu_embedding_vector_index
                            ┌─────────────────┐             ┌──────────────────────┐
                            │ cleanQuery:      │             │ filter:              │
                            │  "cheesy garlic  │             │  isAvailable: true   │
                            │   bread"         │             │  restaurantId: $in   │
                            │ filters:         │             │   [nearby verified]  │
                            │  maxPrice: 200   │             │                      │
                            └────────┬────────┘             └──────────┬───────────┘
                                     │                                 │
                            Gemini embedding-2              $vectorSearch against
                            1536-dim vector                 pre-indexed embeddings
                                     │                                 │
                                     └─────────────┬───────────────────┘
                                                   ▼
                                         Blended Ranking Score
                                    ┌──────────────────────────────┐
                                    │  0.6 × vectorScore           │
                                    │  0.2 × popularityScore       │
                                    │  0.2 × distanceScore         │
                                    └──────────────────────────────┘
```

**Resilient Fallback:** If the AI Gateway or Atlas Vector Search is down, the system gracefully degrades to in-memory **cosine similarity** with **tokenized text matching** — search never breaks.

### 🎯 Hyper-Personalized "For You" Recommendations

Every user action trains their **taste profile centroid** — a rolling 1536-dimensional embedding vector:

| Event | Weight | Learning Rate (α) | How It Updates |
|:---|:---:|:---:|:---|
| 🛒 Order Paid | Highest | 0.20 | `C_new = 0.8 × C_old + 0.2 × C_order` |
| 🛍️ Add to Cart | 1.5× | 0.075 | Blends item embedding into centroid |
| ⭐ Rating Given | 2.0× | 0.10 | Amplifies preference signal |
| 🔍 Search Query | 0.2× | 0.01 | Light nudge toward searched cuisine |

The home page's "For You" section runs a `$vectorSearch` using this centroid against nearby menu items, producing a **75% AI relevance + 25% distance** composite score.

### 📊 AI-Powered Business Insights

Admin and seller dashboards feed financial metrics to the AI Gateway, which generates natural-language anomaly detection and growth recommendations via Groq/Gemini. All currency outputs are enforced in **₹ (INR)** formatting.

---

## 🔄 Event-Driven Order Lifecycle

The entire order flow is **fully asynchronous** — no service blocks another:

```
  ┌──────────┐    ┌──────────────┐    ┌────────────────────┐    ┌──────────────┐    ┌───────────────┐
  │ CUSTOMER │    │ UTILS SERVICE│    │ RESTAURANT SERVICE │    │ RIDER SERVICE│    │   REALTIME    │
  └────┬─────┘    └──────┬───────┘    └─────────┬──────────┘    └──────┬───────┘    └───────┬───────┘
       │                 │                      │                      │                    │
       │──Place Order───────────────────────────►                      │                    │
       │  (TTL: 15min)   │                      │                      │                    │
       │                 │                      │                      │                    │
       │──Pay (Razorpay/Stripe)─►               │                      │                    │
       │                 │──Verify Signature     │                      │                    │
       │                 │──RabbitMQ: ═══════════►                      │                    │
       │                 │  PAYMENT_SUCCESS      │──Unset TTL           │                    │
       │                 │                      │──Clear Cart           │                    │
       │                 │                      │──Socket.IO: ──────────────────────────────►│
       │                 │                      │  "order:new"          │                    │──► Restaurant
       │                 │                      │                      │                    │    Notified
       │                 │                      │◄─Seller: preparing    │                    │
       │                 │                      │◄─Seller: ready ───────►                    │
       │                 │                      │  RabbitMQ: ═══════════►──5km Geofence      │
       │                 │                      │  ORDER_READY          │──Query Riders      │
       │                 │                      │                      │──Socket.IO: ───────►│──► Rider
       │                 │                      │                      │                    │    Notified
       │                 │                      │                      │◄─Accept             │
       │                 │                      │                      │                    │
       │◄──Live GPS Stream (watchPosition)──────────────────────────────────────────────────│
       │   via Socket.IO rooms                  │                      │                    │
       │                 │                      │                      │                    │
       │◄──Status: delivered────────────────────────────────────────────                    │
  ┌────▼─────┐                                                                              
  │  ⭐ Rate  │──► RabbitMQ: user_event_queue ──► Update Taste Profile Centroid             
  └──────────┘                                                                              
```

### Key Design Decisions

| Decision | Rationale |
|:---|:---|
| **MongoDB TTL for unpaid orders** | Automatically garbage-collects abandoned checkouts — zero cron jobs, zero manual cleanup |
| **RabbitMQ between payment → fulfillment** | Payment verification doesn't block order processing. Services are independently deployable |
| **Dedicated realtime gateway** | REST services can restart without dropping live WebSocket connections |
| **HMAC-signed internal HTTP** | Service-to-service communication is authenticated without exposing APIs publicly |

---

## 🗄️ Data Architecture

### MongoDB Collections

| Collection | Owner Service | Key Indexes | Purpose |
|:---|:---|:---|:---|
| `users` | auth | `email` (unique) | Google OAuth profiles, RBAC roles |
| `restaurants` | restaurant | `autoLocation` (2dsphere), `isVerified` | Geo-indexed catalog with AI embeddings |
| `menuitems` | restaurant | `restaurantId`, `dietaryFlags`, `isAvailable`, `embedding` (vector) | Searchable menu with 1536-dim vectors |
| `orders` | restaurant | `userId`, `restaurantId`, `riderId`, `expiresAt` (TTL) | Full order lifecycle with auto-cleanup |
| `carts` | restaurant | Compound unique `{userId, restaurantId, itemId}` | Prevents duplicate entries |
| `addresses` | restaurant | `userId` | Verified delivery locations |
| `riders` | rider | `location` (2dsphere), `isAvailable` | Geofenced rider dispatch pool |
| `usertasteprofiles` | restaurant | `userId` (unique) | AI taste centroid + cuisine weights |
| `userfoodevents` | restaurant | `userId`, `eventType` | Behavioral event stream for ML pipeline |

### Redis Cache Strategy (Cache-Aside Pattern)

```typescript
// Every cached route follows this exact pattern — fail-safe to DB on Redis outage
const { data, cached } = await withCache({
  key: `restaurant:dashboard:${restaurantId}`,
  ttl: 300, // 5 minutes
  fetcher: () => aggregateDashboardData(restaurantId),
});
```

| Key Pattern | TTL | Invalidation Trigger |
|:---|:---:|:---|
| `admin:stats` | 60s | Restaurant/rider verification |
| `admin:top-items` | 5m | Time-based expiry |
| `rider:profile:${userId}` | 5m | Profile update, availability toggle |
| `rider:assigned-order:${riderId}` | 5m | Accept order, status change |
| `rider:queue:${userId}` | 5m | Reset on order acceptance |
| `restaurant:dashboard:${id}` | 5m | Order creation, status change |

---

## 📡 Real-Time System (Socket.IO)

### Authentication
```typescript
// JWT verification on every WebSocket handshake
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error("Unauthorized"));
  const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY!);
  socket.data.user = decoded.user;
  next();
});
```

### Room Architecture

| Room Pattern | Who Joins | Events Received |
|:---|:---|:---|
| `user:${userId}` | Every authenticated user | Order status updates, rider GPS |
| `restaurant:${restaurantId}` | Restaurant owners | New order notifications |
| `order:${orderId}` | Tracking customers | Status changes, delivery updates |
| `admin` | Platform admins | System-wide notifications |

### Live GPS Tracking Pipeline

```
   Rider's Phone                    Realtime Service                Customer's Map
  ──────────────                   ─────────────────               ────────────────
  navigator.geolocation     ──►    socket.on("rider:location")    
  .watchPosition()                 socket.to(room).emit()     ──►  Leaflet marker
  { enableHighAccuracy: true }                                     updates in real-time
```

---

## 🔐 Authentication & Authorization

```
  Browser              Auth Service           Google OAuth           Any API Service
  ───────              ────────────           ────────────           ───────────────
     │                      │                      │                       │
     │── Google Login ─────►│──── Exchange Code ───►│                       │
     │                      │◄─── Profile Data ────│                       │
     │                      │                                              │
     │◄── JWT (15-day) ────│                                              │
     │    { user, role }    │                                              │
     │                                                                     │
     │── Authorization: Bearer <token> ────────────────────────────────────►│
     │                                                                     │── Verify JWT
     │                                                                     │── Check RBAC
     │                                                                     │   (isAuth / isSeller / isAdmin)
```

### RBAC Middleware Stack

| Middleware | Access Level | Description |
|:---|:---|:---|
| `isAuth` | All authenticated users | Decodes JWT, attaches `req.user` |
| `isSeller` | Restaurant owners only | Verifies `role === "seller"` |
| `isAdmin` | Platform admins only | Verifies `role === "admin"` |

---

## 💳 Payment Processing

BhookBuster supports **dual payment gateways** with automatic verification:

| Feature | Razorpay | Stripe |
|:---|:---|:---|
| **Flow** | Create Order → Pay → Verify Signature | Create Checkout Session → Redirect → Webhook |
| **Verification** | `crypto.createHmac('sha256')` signature match | Session ID + status verification |
| **Post-Payment** | Publishes `PAYMENT_SUCCESS` to RabbitMQ | Same RabbitMQ event |
| **Currency** | INR (₹) | INR (₹) |

---

## 🖥️ Frontend — 15 Production Pages

Built with **React 19 + Vite + TailwindCSS v4 + Framer Motion** — dark-themed, premium UI:

| Page | Role | Key Features |
|:---|:---|:---|
| `Home` | Customer | AI "For You" feed, nearby restaurants, geolocation, **unified search bar** with integrated Dishes/Restaurants toggle, textarea input, and AI confidence scores |
| `RestaurantPage` | Customer | Full menu with categories, dietary flags, add-to-cart |
| `Cart` | Customer | Quantity controls, price calculations, restaurant-grouped items |
| `Checkout` | Customer | Address selection, delivery fee calc, Razorpay/Stripe integration |
| `OrderPage` | Customer | **Live Leaflet map** with real-time rider GPS, status timeline |
| `Orders` | Customer | Complete order history with status badges |
| `Account` | Customer | Profile editing, avatar, order metrics |
| `Address` | Customer | Saved delivery addresses CRUD |
| `Restaurant` | Seller | Restaurant onboarding, menu management, analytics dashboard |
| `RiderDashboard` | Rider | Availability toggle, dispatch queue, **live delivery map**, earnings |
| `Admin` | Admin | Platform KPIs, **Recharts analytics**, pending verifications |
| `Login` | Public | Google OAuth integration |
| `SelectRole` | New User | Onboarding role selection (customer/seller/rider) |
| `OrderSuccess` | Customer | Post-checkout confirmation |
| `PaymentSuccess` | Customer | Payment verification screen |

### State Management

| Context | Manages | Key Operations |
|:---|:---|:---|
| `AppContext` | `user`, `cart`, `location`, `city`, `isAuth` | `fetchUser()`, `fetchCart()`, `fetchLocation()` (LocationIQ reverse geocoding) |
| `SocketContext` | Socket.IO client instance | Auto-connect on auth, cleanup on logout |

---

## 🚀 Getting Started

### Prerequisites

| Tool | Version | Purpose |
|:---|:---|:---|
| Node.js | ≥ 20.x | Runtime for all services |
| MongoDB Atlas | — | Database with **Atlas Vector Search** enabled |
| Redis | ≥ 7.x | Caching layer |
| RabbitMQ | ≥ 3.x | Message broker (or use Docker) |
| Google Cloud Console | — | OAuth 2.0 credentials |

### 1. Clone & Install

```bash
git clone https://github.com/Pradeepmodak/BhookBuster.git
cd BhookBuster

# Install dependencies for all services
cd frontend && npm install && cd ..
cd services/auth && npm install && cd ../..
cd services/restaurant && npm install && cd ../..
cd services/rider && npm install && cd ../..
cd services/admin && npm install && cd ../..
cd services/utils && npm install && cd ../..
cd services/realtime && npm install && cd ../..
cd services/ai-gateway && npm install && cd ../..
```

### 2. Configure Environment

```bash
# Copy the template and fill in your secrets
cp .env.example .env
```

**Required secrets:**

| Variable | Where to Get It |
|:---|:---|
| `MONGODB_URI` | [MongoDB Atlas](https://cloud.mongodb.com) — create a cluster with Atlas Vector Search |
| `REDIS_URL` | Local Redis or [Redis Cloud](https://redis.com/cloud/) |
| `RABBITMQ_URL` | Local via Docker (see below) or [CloudAMQP](https://www.cloudamqp.com/) |
| `GOOGLE_AI_API_KEY` | [Google AI Studio](https://aistudio.google.com) — for Gemini embeddings |
| `RAZORPAY_KEY_ID` / `SECRET` | [Razorpay Dashboard](https://dashboard.razorpay.com) |
| `STRIPE_SECRET_KEY` | [Stripe Dashboard](https://dashboard.stripe.com) |
| `JWT_SECRET_KEY` | `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |

### 3. Start RabbitMQ (Docker)

```bash
docker compose up -d
# Management UI available at http://localhost:15672 (bhookbuster/strongpassword123)
```

### 4. Create Vector Search Indexes

```bash
npm run create:vector-indexes
```

> This creates the `menu_embedding_vector_index` and `restaurant_embedding_vector_index` on MongoDB Atlas.

### 5. Start All Services

Open **7 terminal windows** (or use a process manager):

```bash
# Terminal 1: Frontend
cd frontend && npm run dev          # → http://localhost:5173

# Terminal 2: Auth Service
cd services/auth && npm run dev     # → :5000

# Terminal 3: Restaurant Service
cd services/restaurant && npm run dev  # → :3000

# Terminal 4: Rider Service
cd services/rider && npm run dev    # → :5001

# Terminal 5: Admin Service
cd services/admin && npm run dev    # → :6000

# Terminal 6: Utils Service
cd services/utils && npm run dev    # → :7000

# Terminal 7: Realtime Service
cd services/realtime && npm run dev # → :4000

# Terminal 8: AI Gateway
cd services/ai-gateway && npm run dev  # → :5010
```

---

## 🐳 Docker Deployment

### Local Development (RabbitMQ only)
```bash
docker compose up -d
```

### Full Stack (AWS)
```bash
docker compose -f docker-compose.aws.yml up -d
```

### Production Deployment Map

| Component | Platform | Configuration |
|:---|:---|:---|
| Frontend | Vercel / AWS S3 + CloudFront | Auto-deploy from `main` branch |
| 7 API Services | Render (via `render.yaml`) / AWS ECS | Each service is independently deployable |
| MongoDB | MongoDB Atlas | M0+ cluster with Atlas Vector Search |
| Redis | AWS ElastiCache / Redis Cloud | Failover to direct DB queries |
| RabbitMQ | Amazon MQ / CloudAMQP | Durable queues with acknowledgment |

---

## 📁 Project Structure

```
BhookBuster/
├── frontend/                      # React 19 + Vite SPA
│   ├── src/
│   │   ├── pages/                 # 15 route-level page components
│   │   ├── components/            # 25+ reusable UI components
│   │   │   ├── ui/                # Design system primitives (Button, Card, Input)
│   │   │   ├── RiderOrderMap.tsx   # Live GPS tracking with Leaflet
│   │   │   ├── UserOrderMap.tsx    # Customer-side delivery map
│   │   │   ├── PlatformInsights.tsx # AI-generated admin analytics
│   │   │   └── RestaurantInsights.tsx # Seller dashboard with Recharts
│   │   ├── context/               # AppContext + SocketContext
│   │   └── config.ts              # Service URL configuration
│   └── package.json
│
├── services/
│   ├── auth/                      # 🔐 Google OAuth + JWT + RBAC
│   ├── restaurant/                # 🍕 Catalog, Orders, Search, Recommendations
│   │   ├── controllers/
│   │   │   ├── search.ts          # Semantic + Restaurant vector search
│   │   │   ├── recommendations.ts # "For You" AI pipeline
│   │   │   ├── menuitem.ts        # Menu CRUD + embedding generation
│   │   │   └── order.ts           # Full order lifecycle
│   │   ├── consumers/             # RabbitMQ event processors
│   │   ├── models/                # Mongoose schemas (9 collections)
│   │   └── lib/embeddings.ts      # AI Gateway client
│   ├── rider/                     # 🚴 Dispatch, GPS, Earnings
│   ├── admin/                     # 🛡️ Governance, Verification, Analytics
│   ├── utils/                     # 💰 Payments (Razorpay/Stripe) + Uploads
│   ├── realtime/                  # 📡 Socket.IO Gateway (HMAC-secured)
│   └── ai-gateway/                # 🤖 Gemini Embeddings + Groq NLP + Insights
│
├── docs/                          # Design & Documentation
│   ├── HLD.md                     # 🏗️ High-Level Design (Mermaid diagrams)
│   ├── LLD.md                     # 🔧 Low-Level Design (Schemas, APIs, Algorithms)
│   ├── SYSTEM_DESIGN.md           # System design interview walkthrough
│   ├── CODE_FLOW.md               # Code-level flow documentation
│   ├── AWS_DEPLOYMENT.md          # AWS deployment guide
│   └── LOCAL_TESTING.md           # Local development setup
│
├── docker-compose.yml             # Local RabbitMQ
├── docker-compose.aws.yml         # Full-stack containers
├── render.yaml                    # Render.com IaC (all 7 services)
├── .env.example                   # Complete environment template
└── package.json                   # Root scripts (vector index creation)
```

---

## 🛡️ Resilience & Error Handling

BhookBuster is designed to **never fully break** — every critical path has a fallback:

| Failure Scenario | System Response |
|:---|:---|
| **AI Gateway down** | Search falls back to tokenized text matching with keyword scoring |
| **Atlas Vector Search misconfigured** | In-memory cosine similarity over fetched documents |
| **Redis unavailable** | Cache-aside pattern silently skips cache, queries DB directly |
| **RabbitMQ connection lost** | Automatic reconnection with exponential backoff |
| **Payment provider error** | MongoDB TTL auto-cleans the unpaid order after 15 minutes |
| **Geolocation denied** | Prompts user with a clear UI to enable location access |

---

## 🧪 Technical Highlights for Engineers

### MongoDB Aggregation Mastery
- **Haversine distance** calculated entirely within MongoDB aggregation pipelines (`$degreesToRadians`, `$acos`, `$sin`, `$cos`)
- **$vectorSearch** with pre-filtered geospatial boundaries for sub-50ms semantic queries
- **TTL indexes** for self-cleaning order collections
- **2dsphere indexes** on restaurants and riders for geofenced dispatch

### Distributed Systems Patterns
- **Event-driven architecture** — payment ↔ fulfillment ↔ dispatch are fully decoupled via RabbitMQ
- **CQRS-lite** — write-heavy operations (orders, events) are separated from read-heavy cached queries
- **Cache-aside** with graceful degradation — no Redis dependency for correctness
- **HMAC-authenticated internal HTTP** — service mesh without a full API gateway

### AI/ML Pipeline
- **Embedding-based search** using Gemini's `gemini-embedding-2` (1536 dimensions)
- **Dual-model NLP** — Groq `llama-3.3-70b` primary, Gemini fallback for query parsing
- **Rolling centroid updates** with configurable decay rates per event type
- **Blended ranking** combining vector similarity, popularity, and distance scores

---

## 🐛 Known Bugs Fixed & Lessons Learned

| Bug | Root Cause | Fix |
|:---|:---|:---|
| **Hanging requests in cart decrement** | Missing `return` after sending response when `qty === 1` → double response attempt | Added explicit `return` statement |
| **Any client could update order status** | No identity verification on status update endpoints | Added `x-rider-id` header validation against `order.riderId` |
| **Cart adding wrong items** | `addToCart(itemId, restaurantId)` — arguments were swapped | Corrected argument order + added self-healing orphan cleanup |

---

## 📄 Design Documents & Documentation

| Document | Description |
|:---|:---|
| [`docs/HLD.md`](docs/HLD.md) | 🏗️ **High-Level Design** — Architecture diagrams, service boundaries, data flows, deployment strategy |
| [`docs/LLD.md`](docs/LLD.md) | 🔧 **Low-Level Design** — ER diagrams, all API endpoints, state machines, algorithms, fee calculations |
| [`docs/SYSTEM_DESIGN.md`](docs/SYSTEM_DESIGN.md) | System design interview walkthrough with Mermaid diagrams |
| [`docs/CODE_FLOW.md`](docs/CODE_FLOW.md) | Code-level flow documentation for major paths |
| [`docs/LOCAL_TESTING.md`](docs/LOCAL_TESTING.md) | Step-by-step local development setup guide |
| [`docs/AWS_DEPLOYMENT.md`](docs/AWS_DEPLOYMENT.md) | AWS production deployment walkthrough |

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

---

## 📝 License

This project is for educational and portfolio purposes. Built by [Pradeep Modak](https://github.com/Pradeepmodak).

---

<p align="center">
  <strong>Built with 🔥 by Pradeep Modak</strong><br/>
  <em>7 Microservices • 15 Pages • 3 RabbitMQ Queues • 1536-dim AI Vectors • Real-time GPS • Dual Payment Gateways</em>
</p>

<!-- hello 1 2 3 4 5 6-->