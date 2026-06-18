# BhookBuster — High-Level Design (HLD)

> **Version:** 2.0 &nbsp;|&nbsp; **Last Updated:** June 2026 &nbsp;|&nbsp; **Author:** Pradeep Modak

---

## 1. Problem Statement

Build a **food delivery platform** that allows customers to discover restaurants, search menus using natural language, place orders with real-time payment processing, and track deliveries via live GPS — all while supporting distinct workflows for restaurant owners, delivery riders, and platform administrators.

### Key Challenges
- Natural language food search (*"healthy vegan under 300 rupees"*)
- Real-time order tracking with live rider GPS
- Multi-role RBAC (customer, seller, rider, admin)
- Payment processing with automatic cleanup of abandoned orders
- Personalized recommendations that learn from user behavior
- System resilience — no single dependency failure should take down the app

---

## 2. System Architecture

### 2.1 High-Level Architecture Diagram

```mermaid
graph TB
    subgraph Client Layer
        WEB["🌐 React 19 + Vite SPA<br/>(16 Pages • TailwindCSS • Framer Motion)"]
    end

    subgraph API Gateway Layer
        AUTH["🔐 Auth Service<br/>:5000<br/>Google OAuth • JWT • RBAC"]
        REST["🍕 Restaurant Service<br/>:3000<br/>Catalog • Orders • Search • Cart"]
        RIDER["🚴 Rider Service<br/>:5001<br/>Dispatch • GPS • Earnings"]
        ADMIN["🛡️ Admin Service<br/>:6000<br/>Verification • Analytics"]
        UTILS["💰 Utils Service<br/>:7000<br/>Payments • Uploads"]
    end

    subgraph Intelligence Layer
        AI["🤖 AI Gateway<br/>:5010<br/>Gemini Embeddings • Groq NLP"]
    end

    subgraph Push Layer
        RT["📡 Realtime Service<br/>:4000<br/>Socket.IO Gateway"]
    end

    subgraph Message Broker
        MQ["🐰 RabbitMQ<br/>payment_event • order_ready_queue<br/>user_event_queue"]
    end

    subgraph Data Layer
        MONGO[("🍃 MongoDB Atlas<br/>+ Vector Search Indexes")]
        REDIS[("⚡ Redis<br/>Cache-Aside Pattern")]
    end

    subgraph External Services
        GOOGLE["Google OAuth 2.0"]
        RAZORPAY["Razorpay"]
        STRIPE["Stripe"]
        CLOUD["Cloudinary CDN"]
        GEMINI["Google Gemini API"]
        GROQ["Groq API"]
        LOCIQ["LocationIQ"]
    end

    WEB -->|HTTP REST| AUTH
    WEB -->|HTTP REST| REST
    WEB -->|HTTP REST| RIDER
    WEB -->|HTTP REST| ADMIN
    WEB -->|HTTP REST| UTILS
    WEB <-->|WebSocket| RT

    AUTH --> MONGO
    REST --> MONGO
    RIDER --> MONGO
    ADMIN --> MONGO

    REST <--> REDIS
    ADMIN <--> REDIS
    RIDER <--> REDIS

    UTILS -->|AMQP publish| MQ
    REST -->|AMQP publish| MQ
    MQ -->|AMQP consume| REST
    MQ -->|AMQP consume| RIDER

    REST -->|Internal HTTP + HMAC| AI
    REST -->|Internal HTTP + HMAC| RT
    RIDER -->|Internal HTTP + HMAC| RT

    AUTH --> GOOGLE
    UTILS --> RAZORPAY
    UTILS --> STRIPE
    UTILS --> CLOUD
    AI --> GEMINI
    AI --> GROQ
    WEB -->|Reverse Geocoding| LOCIQ
```

### 2.2 Service Boundary Table

| Service | Port | Responsibility | Owns Data? | Stateful? |
|:--------|:----:|:---------------|:----------:|:---------:|
| **auth** | 5000 | Google OAuth exchange, JWT issuance, RBAC | `users` collection | No |
| **restaurant** | 3000 | Menu catalog, cart, orders, search, recommendations | `restaurants`, `menuitems`, `orders`, `carts`, `addresses`, `userfoodevents`, `usertasteprofiles` | No |
| **rider** | 5001 | Rider profiles, availability, dispatch, delivery | `riders` | No |
| **admin** | 6000 | Verification queues, platform analytics, governance | None (reads across services) | No |
| **utils** | 7000 | Payment gateway orchestration, media uploads | None | No |
| **realtime** | 4000 | WebSocket event fanout (rooms, GPS streaming) | None | Yes (connections) |
| **ai-gateway** | 5010 | Embedding generation, NLP parsing, analytics insights | None | No |

---

## 3. Core User Flows

### 3.1 Order Lifecycle (End-to-End)

```mermaid
sequenceDiagram
    autonumber
    actor C as Customer
    participant FE as Frontend
    participant RS as Restaurant Svc
    participant US as Utils Svc
    participant MQ as RabbitMQ
    participant RD as Rider Svc
    participant RT as Realtime Svc

    C->>FE: Browse menu, add to cart
    FE->>RS: POST /api/order/new
    Note over RS: Creates order with TTL=15min<br/>Calculates Haversine distance<br/>Computes delivery fee
    RS-->>FE: orderId + totalAmount

    FE->>US: POST /api/payment/create
    US-->>FE: Razorpay order / Stripe session

    C->>US: Complete payment
    Note over US: Verify crypto signature
    US->>MQ: Publish PAYMENT_SUCCESS

    MQ->>RS: Consume payment event
    Note over RS: Unset TTL (prevent deletion)<br/>Clear customer cart<br/>Publish user event for ML
    RS->>RT: HTTP POST /internal/emit
    RT-->>FE: Socket "order:new" → restaurant room

    Note over RS: Seller marks: preparing → ready_for_rider
    RS->>MQ: Publish ORDER_READY_FOR_RIDER

    MQ->>RD: Consume dispatch event
    Note over RD: 2dsphere query: verified<br/>riders within 5km radius
    RD->>RT: HTTP POST /internal/emit
    RT-->>FE: Socket "order:available" → nearby riders

    RD->>RS: PUT /api/order/assign/rider
    RS->>RT: HTTP POST /internal/emit
    RT-->>FE: Socket "order:update" → customer

    Note over FE: Rider streams GPS via<br/>navigator.geolocation.watchPosition
    FE->>RT: Socket "rider:location"
    RT-->>FE: Broadcast to customer room

    RD->>RS: PUT /api/rider/order/update (delivered)
    RS->>RT: emit "order:update" → delivered
    Note over RS: Publish user_event for<br/>taste profile update
```

### 3.2 AI Semantic Search Flow

```mermaid
sequenceDiagram
    autonumber
    actor U as User
    participant FE as Frontend
    participant RS as Restaurant Svc
    participant AI as AI Gateway
    participant DB as MongoDB Atlas

    U->>FE: Type "spicy biryani under 400"
    FE->>RS: POST /api/search/semantic

    RS->>AI: POST /internal/nlp/parse
    Note over AI: Groq llama-3.3-70b<br/>(Gemini fallback)
    AI-->>RS: cleanQuery + filters<br/>{"maxPrice":400, "spiceLevel":"hot"}

    RS->>AI: POST /internal/embed
    Note over AI: Gemini gemini-embedding-2<br/>→ 1536-dim vector
    AI-->>RS: queryVector[1536]

    RS->>DB: $geoNear (nearby verified restaurants)
    DB-->>RS: restaurantIds + distances

    RS->>DB: $vectorSearch on menuitems
    Note over DB: menu_embedding_vector_index<br/>filter: isAvailable + restaurantId
    DB-->>RS: Ranked items with vectorScore

    Note over RS: Compute blended score:<br/>0.6×vector + 0.2×popularity + 0.2×distance
    RS-->>FE: Grouped results by restaurant

    alt AI Gateway or Vector Index Down
        Note over RS: Fallback to in-memory<br/>cosine similarity + text matching
        RS-->>FE: Results via JS fallback
    end
```

### 3.3 Personalized Recommendations Flow

```mermaid
sequenceDiagram
    autonumber
    actor U as User
    participant FE as Frontend
    participant RS as Restaurant Svc
    participant MQ as RabbitMQ
    participant DB as MongoDB Atlas

    U->>FE: Open Home Page
    FE->>RS: GET /api/recommendations/home

    RS->>DB: $geoNear (popular nearby restaurants)
    RS->>DB: Find UserTasteProfile by userId

    alt Profile exists with embeddingCentroid
        RS->>DB: $vectorSearch using embeddingCentroid
        Note over DB: 75% AI relevance<br/>+ 25% distance score
        DB-->>RS: Personalized "For You" items
    else No profile or empty centroid
        RS-->>FE: popularNearby only, forYou=[]
    end

    RS-->>FE: { popularNearby, forYou }

    Note over FE: Later: user places order
    RS->>MQ: Publish user_event (orderPaid)
    MQ->>RS: Consume event
    Note over RS: Blend embeddings:<br/>C_new = 0.8 × C_old + 0.2 × C_order<br/>Update cuisineWeights, priceBand
```

---

## 4. Communication Patterns

### 4.1 Synchronous (HTTP REST)

| From → To | Method | Purpose |
|:----------|:------:|:--------|
| Frontend → Any service | REST | All user-facing API calls |
| Restaurant → AI Gateway | POST | Embedding generation, NLP parsing |
| Restaurant → Realtime | POST | Internal event emission (HMAC-signed) |
| Rider → Restaurant | PUT | Assign rider to order |
| Rider → Realtime | POST | Internal event emission (HMAC-signed) |

### 4.2 Asynchronous (RabbitMQ AMQP)

```mermaid
graph LR
    subgraph Producers
        UTILS["Utils Service"]
        REST["Restaurant Service"]
    end

    subgraph Queues
        PQ["payment_event"]
        ORQ["order_ready_queue"]
        UEQ["user_event_queue"]
    end

    subgraph Consumers
        REST2["Restaurant Service"]
        RIDER["Rider Service"]
        RECS["Recommendations Consumer"]
    end

    UTILS -->|PAYMENT_SUCCESS| PQ
    PQ -->|consume| REST2
    REST -->|ORDER_READY_FOR_RIDER| ORQ
    ORQ -->|consume| RIDER
    REST -->|User behavioral events| UEQ
    UEQ -->|consume| RECS
```

| Queue | Producer | Consumer | Trigger |
|:------|:---------|:---------|:--------|
| `payment_event` | utils | restaurant | Payment verified via Razorpay/Stripe |
| `order_ready_queue` | restaurant | rider | Seller marks order as `ready_for_rider` |
| `user_event_queue` | restaurant | restaurant (recommendations) | Order paid, search, cart add, rating |

### 4.3 Real-Time (WebSocket / Socket.IO)

| Event | Direction | Room | Payload |
|:------|:----------|:-----|:--------|
| `order:new` | Server → Client | `restaurant:{id}` | New order notification |
| `order:update` | Server → Client | `user:{id}` | Status change (preparing, picked_up, etc.) |
| `order:available` | Server → Client | `user:{riderId}` | New dispatch request for nearby rider |
| `rider:location` | Client → Server → Client | `user:{customerId}` | Live GPS coordinates |

---

## 5. Technology Decisions

| Layer | Technology | Why |
|:------|:-----------|:----|
| **Frontend** | React 19, Vite, TailwindCSS v4 | Latest React with fast HMR, utility-first CSS |
| **Backend** | Node.js, Express, TypeScript | Consistent language across stack, strong typing |
| **Database** | MongoDB Atlas | Native vector search, 2dsphere indexes, TTL indexes, flexible schema |
| **Cache** | Redis | Sub-ms reads for dashboards and profiles |
| **Message Broker** | RabbitMQ | Reliable delivery, manual acknowledgment, dead-letter support |
| **Real-time** | Socket.IO (dedicated service) | Room-based event fanout, decoupled from REST lifecycle |
| **AI/ML** | Gemini `gemini-embedding-2`, Groq `llama-3.3-70b` | Production-grade embeddings + fast NLP inference |
| **Payments** | Razorpay + Stripe | Dual gateway for Indian + international markets |
| **Maps** | Leaflet, LocationIQ | Free OSM-based maps, reverse geocoding |
| **CDN** | Cloudinary | On-the-fly image transformations |
| **Auth** | Google OAuth 2.0 + JWT | Zero-password onboarding, stateless auth |

---

## 6. Data Flow Diagram (DFD Level 0)

```mermaid
graph TB
    subgraph External Entities
        CUST(("👤 Customer"))
        SELLER(("🍳 Seller"))
        RIDER_E(("🚴 Rider"))
        ADMIN_E(("🛡️ Admin"))
        PAY_GW(("💳 Payment<br/>Gateway"))
        GOOGLE_E(("🔑 Google<br/>OAuth"))
    end

    subgraph BhookBuster System
        AUTH_P["1.0<br/>Authentication"]
        CATALOG_P["2.0<br/>Catalog &<br/>Search"]
        ORDER_P["3.0<br/>Order<br/>Management"]
        PAY_P["4.0<br/>Payment<br/>Processing"]
        DISPATCH_P["5.0<br/>Rider<br/>Dispatch"]
        TRACK_P["6.0<br/>Real-time<br/>Tracking"]
        AI_P["7.0<br/>AI Engine"]
        ANALYTICS_P["8.0<br/>Analytics &<br/>Governance"]
    end

    subgraph Data Stores
        DS1[("D1: Users")]
        DS2[("D2: Restaurants")]
        DS3[("D3: Menu Items")]
        DS4[("D4: Orders")]
        DS5[("D5: Riders")]
        DS6[("D6: Taste Profiles")]
    end

    CUST --> AUTH_P
    GOOGLE_E <--> AUTH_P
    AUTH_P --> DS1

    CUST --> CATALOG_P
    CATALOG_P <--> DS2
    CATALOG_P <--> DS3
    CATALOG_P --> AI_P
    AI_P --> CATALOG_P

    CUST --> ORDER_P
    SELLER --> ORDER_P
    ORDER_P <--> DS4
    ORDER_P --> PAY_P
    PAY_P <--> PAY_GW

    ORDER_P --> DISPATCH_P
    DISPATCH_P <--> DS5
    RIDER_E <--> DISPATCH_P

    RIDER_E --> TRACK_P
    CUST --> TRACK_P

    ORDER_P --> DS6
    CATALOG_P <--> DS6

    ADMIN_E --> ANALYTICS_P
    SELLER --> ANALYTICS_P
    ANALYTICS_P --> DS4
    ANALYTICS_P --> DS2
```

---

## 7. Scalability Considerations

### 7.1 Current Optimizations

| Optimization | Implementation |
|:-------------|:---------------|
| **Read caching** | Redis cache-aside with TTLs (60s–5m) on all read-heavy routes |
| **Event-driven processing** | Payment → fulfillment → dispatch fully async via RabbitMQ |
| **Database cleanup** | MongoDB TTL index auto-deletes unpaid orders (no cron jobs) |
| **Search performance** | Atlas Vector Search pre-filtered by geospatial bounds |
| **Geospatial indexing** | 2dsphere on restaurants and riders for O(log n) proximity queries |
| **Connection isolation** | WebSocket gateway decoupled from REST services |

### 7.2 Future Scale Roadmap

```mermaid
graph LR
    subgraph Phase 1 - Current
        A["7 Microservices"]
        B["Single MongoDB Cluster"]
        C["Single Redis Instance"]
    end

    subgraph Phase 2 - Growth
        D["API Gateway + Rate Limiting"]
        E["MongoDB Sharding by Region"]
        F["Redis Cluster"]
        G["Dead Letter Queues"]
    end

    subgraph Phase 3 - Enterprise
        H["Kubernetes Orchestration"]
        I["Service Mesh (Istio)"]
        J["Distributed Tracing (Jaeger)"]
        K["Read Replicas + CQRS"]
    end

    A --> D
    B --> E
    C --> F
    D --> H
    E --> K
    F --> I
    G --> J
```

---

## 8. Deployment Architecture

```mermaid
graph TB
    subgraph Production
        subgraph Hosting
            VERCEL["Vercel<br/>Frontend SPA"]
            RENDER["Render.com<br/>7 API Services<br/>(render.yaml IaC)"]
        end

        subgraph Managed Services
            ATLAS["MongoDB Atlas<br/>M0+ Cluster<br/>Vector Search Enabled"]
            REDIS_C["Redis Cloud<br/>/ AWS ElastiCache"]
            CLOUDAMQP["CloudAMQP<br/>/ Amazon MQ"]
        end

        subgraph CDN & Media
            CLOUDINARY["Cloudinary<br/>Image CDN"]
        end
    end

    VERCEL -->|HTTPS| RENDER
    RENDER --> ATLAS
    RENDER --> REDIS_C
    RENDER --> CLOUDAMQP
    RENDER --> CLOUDINARY
```

| Component | Production | Local Development |
|:----------|:-----------|:------------------|
| Frontend | Vercel (auto-deploy from `main`) | `npm run dev` → localhost:5173 |
| API Services | Render Web Services × 7 | Individual `npm run dev` per service |
| MongoDB | Atlas M0+ (Vector Search) | Atlas (required for vector indexes) |
| Redis | Redis Cloud / ElastiCache | `redis://localhost:6379` |
| RabbitMQ | CloudAMQP / Amazon MQ | Docker: `docker compose up -d` |

---

## 9. Security Architecture

| Layer | Mechanism | Implementation |
|:------|:----------|:---------------|
| **User Auth** | Google OAuth 2.0 → JWT (15-day expiry) | `@react-oauth/google` + `jsonwebtoken` |
| **API Auth** | Bearer token in `Authorization` header | `isAuth` middleware on every protected route |
| **RBAC** | Role-based middleware chain | `isSeller`, `isAdmin` guard specific routes |
| **Service-to-Service** | HMAC-signed internal key | `x-internal-key` header validated at realtime gateway |
| **AI Gateway** | HMAC secret | `GATEWAY_HMAC_SECRET` shared between services |
| **Payments** | Cryptographic signature verification | `crypto.createHmac('sha256')` for Razorpay; session verification for Stripe |
| **Data** | MongoDB Atlas encryption at rest | TLS in transit, field-level encryption available |

---

## 10. Failure Modes & Resilience

| Failure | Impact | Mitigation |
|:--------|:-------|:-----------|
| AI Gateway down | No embeddings for search | JS cosine similarity fallback + text matching |
| Atlas Vector Search misconfigured | `$vectorSearch` returns 0 results | Automatic fallback to in-memory scoring |
| Redis unavailable | Cache misses | Cache-aside silently falls through to MongoDB |
| RabbitMQ connection lost | Events not processed | Automatic reconnection with backoff; manual ack prevents message loss |
| Payment timeout | Unpaid order lingers | MongoDB TTL auto-deletes after 15 minutes |
| Realtime service restart | WebSocket connections drop | Clients auto-reconnect; no REST impact |
| Rider geofence finds no riders | Order stuck at `ready_for_rider` | Periodic re-query; admin visibility in dashboard |
