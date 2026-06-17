# BhookBuster: Production-Ready Microservices Architecture & AI Engine

BhookBuster is an enterprise-grade, full-stack food delivery platform engineered using a highly decoupled microservices architecture. Designed for performance, reliability, and scale, the system incorporates an AI Gateway for semantic food catalog searches, dynamic user taste profile generation, Redis cache-aside reads, RabbitMQ asynchronous queueing, and WebSocket-driven realtime synchronization.

---

## 1. Project Overview & Role-Based Workflows

BhookBuster coordinates transactions, logistics, and intelligence across four primary roles: **Customers**, **Riders**, **Restaurant Owners (Sellers)**, and **Admins**.

### End-to-End User Flow
```
[Customer]             [Utils Service]         [Restaurant Service]       [Rider Service]        [Realtime Service]
    │                         │                         │                         │                      │
    ├─► Place Order ──────────┼────────────────────────►│                         │                      │
    │   (Status: placed)      │                         │                         │                      │
    ├─► Initiate Payment ────►│                         │                         │                      │
    │                         ├─► Verify Payment        │                         │                      │
    │                         │   & Publish Msg ───────►│ (paymentStatus: paid)   │                      │
    │                         │   (RabbitMQ)            ├─► Emit "order:new" ────┼─────────────────────►│
    │                         │                         │   (Internal HTTP Gateway)                      │ (Socket.io Emit)
    │                         │                         │                                                ├─► Notify Restaurant
    │                         │                         ├─► Prepare Order ────────┼─────────────────────►│
    │                         │                         │   (Status: preparing)                          │
    │                         │                         ├─► Status: ready_for_rider                      │
    │                         │                         │   & Publish Dispatch ──►│ (Rider Geofencing)   │
    │                         │                         │   (RabbitMQ)            ├─► Match nearby       │
    │                         │                         │                         │   Riders & Emit      │
    │                         │                         │                         │   "order:available" ─┼──► Notify Rider
    │                         │                         │                         │                      │
    │   Accept Dispatch ◄─────┼─────────────────────────┼─────────────────────────┼──────────────────────┤
    │                         │                         │                         │                      │
    │   Stream GPS Lat/Lng ◄──┼─────────────────────────┼─────────────────────────┼──────────────────────┤ (WebSockets)
    │                         │                         │                         │                      │
    │   Deliver Order ◄───────┼─────────────────────────┼─────────────────────────┼──────────────────────┤
    │   (Status: delivered)   │                         │                         │                      │
```

1. **Browsing & Ordering:** A Customer uses geolocation and AI-driven semantic search (e.g., *"high-protein keto salad under ₹300"*) to discover menu items, adds items to their cart, selects a verified delivery address, and creates a pending order.
2. **Checkout & Payment Verification:** The order is initialized with a MongoDB Time-To-Live (TTL) index of 15 minutes. The Customer pays using Razorpay or Stripe. Upon successful provider webhook verification, the `utils` service publishes a `PAYMENT_SUCCESS` event to RabbitMQ.
3. **Fulfillment & Dispatch:** The `restaurant` service consumes the payment event, updates the order status to `placed` (unsetting the MongoDB TTL index to prevent order expiration), deletes the customer's cart, and triggers a Socket.IO notification to the restaurant. The restaurant owner marks the order as `preparing`, then `ready_for_rider`.
4. **Decoupled Rider Dispatch:** Setting the status to `ready_for_rider` publishes an `ORDER_READY_FOR_RIDER` message to RabbitMQ. The `rider` service consumes this, queries nearby online, verified riders (using a 2dsphere geofencing query with a 5km radius), and notifies them via WebSockets.
5. **Realtime Delivery & Tracking:** A rider accepts the order, marking the status as `rider_assigned`. While moving, the rider's frontend streams high-accuracy GPS coordinates via native `navigator.geolocation.watchPosition` to a Socket.IO room. The customer tracks the rider live on a Leaflet map. Finally, the rider delivers the order, triggering settlement calculations and updating platform dashboards in realtime.

---

## 2. Complete Architecture Diagram

The system decouples core domains into 7 distinct services. Internal services communicate via direct HTTP REST, RabbitMQ asynchronous message queues, or local memory-efficient APIs. Socket.IO acts as the public push gateway.

```
                  ┌────────────────────────────────────────────────────────┐
                  │                 REACT + VITE FRONTEND                  │
                  └──────┬──────────────┬──────────────┬─────────────┬─────┘
                         │              │              │             │
                    HTTP │         HTTP │         HTTP │   Websocket │
                         ▼              ▼              ▼             ▼
  ┌──────────────────────┴┐     ┌───────┴──────────────┐      ┌──────┴──────────────┐
  │     auth-service      │     │  restaurant-service  │◄────►│  realtime-service   │
  │        [5000]         │     │        [3000]        │      │       [4000]        │
  └──────────┬────────────┘     └───────┬──────┬───────┘      └──────────▲──────────┘
             │                          │      │                         │
        REST │                     REST │      │ Vector Search           │ Internal Emit
             ▼                          ▼      ▼                         │ HTTP (HMAC)
  ┌──────────┴────────────┐     ┌───────┴──────┴───────┐                 │
  │     utils-service     │◄───►│      ai-gateway      │─────────────────┘
  │        [7000]         │     │        [5010]        │
  └──────────┬────────────┘     └──────────────────────┘
             │                          ▲
             │ AMQP (payment_success)   │ AMQP (user_event_queue)
             ▼                          ▼
  ┌─────────────────────────────────────────────────────────────────────────┐
  │                             RABBITMQ BROKER                             │
  └──────────────────────────────────┬──────────────────────────────────────┘
                                     │
                                     │ AMQP (order_ready_queue)
                                     ▼
                        ┌────────────────────────────┐
                        │       rider-service        │
                        │           [5001]           │
                        └────────────┬───────────────┘
                                     │
                        ┌────────────▼───────────────┐
                        │         DATABASES          │
                        │  MongoDB Atlas | Redis     │
                        └────────────────────────────┘
```

---

## 3. All 7 Microservices Deep Dive

### 1. `services/auth` (User Authentication & RBAC)
*   **Responsibility:** Handles Google OAuth, JWT authentication, user onboarding, role assignments, and profile operations.
*   **Endpoints:**
    *   `POST /api/auth/login` (Exchanges authorization code for a JWT; rate-limited).
    *   `PUT /api/auth/add/role` (Saves onboarding role: `customer`, `rider`, or `seller`).
    *   `GET /api/auth/me` (Retrieves authenticated profile).
*   **Database Collections Owned:** `users` (MongoDB).
*   **RabbitMQ Connections:** None.
*   **Redis Keys:** None.

### 2. `services/restaurant` (Core Catalog & Order Lifecycle)
*   **Responsibility:** Owns restaurant configurations, menu catalog vectors, order workflows, and seller statistics.
*   **Endpoints:**
    *   `POST /api/restaurant/new` (Registers restaurant, generates geometric locations).
    *   `POST /api/menuitem/new` (Adds menu items and triggers vector embedding generation).
    *   `POST /api/order/new` (Creates a pending order, computes Haversine distances).
    *   `GET /api/order/payment/:id` (Internal checkout helper).
    *   `PUT /api/order/:orderId` (Status updating by sellers: `accepted`, `preparing`, `ready_for_rider`).
    *   `PUT /api/order/assign/rider` (Internal assignment endpoint).
*   **Database Collections Owned:** `restaurants`, `menuitems`, `orders`, `carts`, `addresses`, `userfoodevents`, `usertasteprofiles`.
*   **RabbitMQ Connections:**
    *   Consumes: `payment_event` queue.
    *   Publishes: `order_ready_queue` and `user_event_queue` exchanges.
*   **Redis Keys:** `restaurant:dashboard:${restaurantId}` (TTL: 5m).

### 3. `services/rider` (Logistics, Availability & Dispatch)
*   **Responsibility:** Rider profiles, live availability toggles, nearby dispatch match loops, and delivery coordination.
*   **Endpoints:**
    *   `POST /api/rider/new` (Creates rider profile with driving license/Aadhar data).
    *   `PATCH /api/rider/toggle` (Toggles rider's online state and updates GPS coordinates).
    *   `GET /api/rider/order/queue` (Fetches dispatch requests matching rider's radius).
    *   `POST /api/rider/accept/:orderId` (Accepts dispatch, locks order).
    *   `PUT /api/rider/order/update/:orderId` (Updates state: `picked_up` -> `delivered`).
*   **Database Collections Owned:** `riders`, `users` (Read-only mirror).
*   **RabbitMQ Connections:**
    *   Consumes: `order_ready_queue` (triggers nearby geofenced notifications).
*   **Redis Keys:** `rider:profile:${userId}` (TTL: 5m), `rider:assigned-order:${riderId}` (TTL: 5m), `rider:queue:${userId}` (TTL: 5m).

### 4. `services/admin` (Governance & Platforms Monitoring)
*   **Responsibility:** Governance dashboard, participant verification queues, and financial metrics aggregations.
*   **Endpoints:**
    *   `GET /api/admin/restaurant/pending` (Gets unverified restaurants).
    *   `PATCH /api/verify/restaurant/:id` (Approves restaurant, invalidates catalogs).
    *   `GET /api/admin/stats` (Computes gross platform revenue, subsidies, payouts, growth percentage).
    *   `GET /api/admin/orders-trend` (Timezone-aware order aggregations).
*   **Database Collections Owned:** None (Aggregates across `orders`, `users`, `restaurants`, `riders`).
*   **RabbitMQ Connections:** None.
*   **Redis Keys:** `admin:stats` (TTL: 1m), `admin:top-items` (TTL: 5m), `admin:orders-trend` (TTL: 5m).

### 5. `services/realtime` (WebSocket Gateway)
*   **Responsibility:** Decoupled Socket.io gateway mapping internal HTTP requests to public websocket rooms.
*   **Endpoints:**
    *   `POST /api/v1/internal/emit` (Authenticated via HMAC internal key, emits messages to specified rooms).
*   **Database Connections:** None.
*   **RabbitMQ Connections:** None.
*   **Redis Keys:** None.

### 6. `services/utils` (Payment Gateways & Media Uploads)
*   **Responsibility:** Razorpay/Stripe checkout orchestration, signature verifications, and Cloudinary media uploads.
*   **Endpoints:**
    *   `POST /api/payment/create` (Creates Razorpay order receipt).
    *   `POST /api/payment/verify` (Verifies signature and publishes payment success).
    *   `POST /api/payment/stripe/create` (Initializes Stripe Checkout Session).
    *   `POST /api/upload` (Secured Cloudinary image uploads).
*   **Database Connections:** None.
*   **RabbitMQ Connections:**
    *   Publishes: `payment_event` queue.
*   **Redis Keys:** None.

### 7. `services/ai-gateway` (LLM & Embeddings Router)
*   **Responsibility:** High-speed tokenization, embeddings generation, queries parsing, and business analytical insights.
*   **Endpoints:**
    *   `POST /internal/embed` (Generates text embeddings via Gemini API).
    *   `POST /internal/nlp/parse` (Parses search queries into filters via Groq/Gemini).
    *   `POST /internal/insights` (Generates analytical summaries).
*   **Database Connections:** None.
*   **RabbitMQ Connections:** None.
*   **Redis Keys:** None.

---

## 4. RabbitMQ Event Workflows

BhookBuster utilizes RabbitMQ to decouple transactional API execution paths from background processing.

```
   [Utils Service] ───────────────► (payment_event) ──────────────► [Restaurant Service]
                                                                        │
                                                                        ├─► Clear Cart
                                                                        ├─► Generate UserFoodEvent
                                                                        └─► Publish User Event
                                                                                │
   [Rider Service] ◄────────────── (order_ready_queue) ◄────────────────────────┴─► Update Taste Profile
```

### 1. `payment_event` Queue
*   **Trigger:** Triggered when the payment provider verifies the customer's transaction.
*   **Producer:** `services/utils` (payment service).
*   **Consumer:** `services/restaurant` (restaurant service).
*   **Payload Schema:**
```json
{
  "type": "PAYMENT_SUCCESS",
  "data": {
    "orderId": "65cb783f0cfc4b7890a2a1a2",
    "paymentId": "pay_O1a2b3c4d5e6f7",
    "provider": "razorpay"
  }
}
```

### 2. `order_ready_queue` Queue
*   **Trigger:** Triggered when a restaurant marks an order status as `ready_for_rider`.
*   **Producer:** `services/restaurant` (restaurant service).
*   **Consumer:** `services/rider` (rider service).
*   **Payload Schema:**
```json
{
  "type": "ORDER_READY_FOR_RIDER",
  "data": {
    "orderId": "65cb783f0cfc4b7890a2a1a2",
    "restaurantId": "65cb781a0cfc4b7890a2a101",
    "location": {
      "type": "Point",
      "coordinates": [77.5946, 12.9716]
    }
  }
}
```

### 3. `user_event_queue` Queue
*   **Trigger:** Triggered when a customer makes an order, clicks/likes an item, searches, or leaves ratings.
*   **Producer:** `services/restaurant` (restaurant service).
*   **Consumer:** `services/restaurant` (recommendations consumer).
*   **Payload Schema:**
```json
{
  "userId": "65cb77df0cfc4b7890a2a001",
  "eventType": "orderPaid",
  "restaurantId": "65cb781a0cfc4b7890a2a101",
  "metadata": {
    "orderId": "65cb783f0cfc4b7890a2a1a2"
  }
}
```

---

## 5. Redis Caching Strategy

The cache-aside pattern is implemented to accelerate read-heavy routes. Services fail gracefully to direct database queries if Redis becomes unavailable.

```ts
// Example Cache-Aside implementation
export const withCache = async <T>({ key, ttl, fetcher }: CacheOptions<T>) => {
  const cached = await getCache<T>(key);
  if (cached) {
    return { data: cached, cached: true };
  }
  const fresh = await fetcher();
  await setCache(key, fresh, ttl);
  return { data: fresh, cached: false };
};
```

| Key Pattern | TTL | Cached Data Description | Invalidation Event & Mechanism |
| :--- | :--- | :--- | :--- |
| `admin:stats` | 60s | Computed platform analytics KPIs | Invalidated on `markRestaurantVerified` or `markRiderVerified`. |
| `admin:top-items` | 300s | Aggregate best-selling menu items | Time-based TTL expiration. |
| `rider:profile:${userId}` | 300s | Rider details, verification status | Invalidated on `addRiderProfile`, `toggleRiderAvailability`, or `updateRiderProfile`. |
| `rider:assigned-order:${riderId}`| 300s | Current active order details | Deleted on `acceptOrder`, `toggleRiderAvailability`, or status changes. |
| `rider:queue:${userId}` | 300s | Nearby dispatch list | Reset to `[]` when the rider accepts an order. |
| `restaurant:dashboard:${id}` | 300s | Sales summaries, active order queue | Invalidated on order creation, status changes, or assignment. |

---

## 6. Socket.IO & Real-Time Logistics

Live updates are routed through a dedicated `realtime` service. Decoupling WebSockets ensures REST scaling does not drop persistent user connections.

### Handshake Authentication
When initializing the connection, the client sends the authorization header. The Socket.IO server interceptor validates this token:
```ts
io.use((socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("Unauthorized"));
    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY!) as any;
    socket.data.user = decoded.user;
    next();
  } catch (err) {
    next(new Error("Unauthorized"));
  }
});
```

### Room Architecture & Socket Events
1.  **Room Assignment on Connection:**
    *   Every user joins `user:${userId}`.
    *   Restaurant owners join `restaurant:${restaurantId}`.
    *   Admins join `admin`.
2.  **Order Tracking Namespace:**
    *   Clients join `order:${orderId}` to track active delivery status changes.
3.  **GPS Rider Tracking Pipeline:**
    *   Rider's mobile device triggers GPS tracking inside RiderOrderMap.tsx:
    ```ts
    navigator.geolocation.watchPosition((pos) => {
      socket.emit("rider:location", {
        room: `user:${order.userId}`,
        payload: { latitude: pos.coords.latitude, longitude: pos.coords.longitude },
      });
    }, err => {}, { enableHighAccuracy: true, maximumAge: 0 });
    ```
    *   The `realtime` gateway catches this event and broadcasts it:
    ```ts
    socket.on("rider:location", (data) => {
      socket.to(data.room).emit("rider:location", data.payload);
    });
    ```
4.  **Decoupled Realtime Emitter (Internal HTTP Gateway):**
    Internal services send a signed HTTP POST request to `/api/v1/internal/emit` to push order status updates to clients:
    ```ts
    // In restaurant/rider service:
    await axios.post(`${process.env.REALTIME_SERVICE}/api/v1/internal/emit`, {
      event: "order:update",
      room: `user:${order.userId}`,
      payload: { orderId: order._id, status: "picked_up" }
    }, { headers: { "x-internal-key": process.env.INTERNAL_SERVICE_KEY } });
    ```

---

## 7. Database Schemas

### 1. `users` (Auth Service)
*   `name`: `String` (Required)
*   `email`: `String` (Required, Unique Index)
*   `image`: `String` (Required)
*   `role`: `String` (`customer` | `seller` | `rider` | `null`, default: `null`)
*   `timestamps`: `true`

### 2. `restaurants` (Restaurant Service)
*   `name`: `String` (Required, Trimmed)
*   `description`: `String`
*   `image`: `String` (Required)
*   `ownerId`: `String` (Required)
*   `phone`: `Number` (Required)
*   `isVerified`: `Boolean` (Required, Index)
*   `cuisineTypes`: `[String]` (Default: `[]`)
*   `tags`: `[String]` (Default: `[]`)
*   `embedding`: `[Number]` (Default: `[]`, index size: 1536)
*   `autoLocation`:
    *   `type`: `String` (Enum: `["Point"]`, Required)
    *   `coordinates`: `[Number]` (Required, `[longitude, latitude]`)
    *   `formattedAddress`: `String`
*   `isOpen`: `Boolean` (Default: `false`)
*   `timestamps`: `true`
*   *Indexes:* `autoLocation: "2dsphere"` (for geo spatial calculations).

### 3. `menuitems` (Restaurant Service)
*   `restaurantId`: `ObjectId` (Ref: `Restaurant`, Required, Index)
*   `name`: `String` (Required)
*   `description`: `String`
*   `price`: `Number` (Required)
*   `cuisine`: `String`
*   `tags`: `[String]`
*   `dietaryFlags`: `[String]` (Index)
*   `spiceLevel`: `String` (Enum: `["mild", "medium", "hot", "extra-hot"]`)
*   `embedding`: `[Number]` (Default: `[]`)
*   `isAvailable`: `Boolean` (Default: `true`, Index)
*   `timestamps`: `true`

### 4. `carts` (Restaurant Service)
*   `userId`: `ObjectId` (Ref: `User`, Required, Index)
*   `restaurantId`: `ObjectId` (Ref: `Restaurant`, Required, Index)
*   `itemId`: `ObjectId` (Ref: `MenuItem`, Required, Index)
*   `quantity`: `Number` (Default: `1`, Min: `1`)
*   *Indexes:* Compound Unique Index: `{ userId: 1, restaurantId: 1, itemId: 1 }` (prevents duplicate cart entries).

### 5. `orders` (Restaurant Service)
*   `userId`: `String` (Required, Index)
*   `restaurantId`: `String` (Required, Index)
*   `restaurantName`: `String` (Required)
*   `riderId`: `String` (Default: `null`, Index)
*   `riderName`: `String` (Default: `null`)
*   `riderPhone`: `String` (Default: `null`)
*   `riderAmount`: `Number` (Required)
*   `distance`: `Number` (Required)
*   `items`: Array of: `{ itemId: String, name: String, price: Number, quantity: Number }`
*   `subtotal`: `Number`, `deliveryFee`: `Number`, `platformFee`: `Number`, `totalAmount`: `Number`
*   `addressId`: `String` (Required)
*   `deliveryAddress`: `{ formattedAddress: String, mobile: Number, latitude: Number, longitude: Number }`
*   `status`: `String` (Enum: `["placed", "accepted", "preparing", "ready_for_rider", "rider_assigned", "picked_up", "delivered", "cancelled"]`)
*   `paymentMethod`: `String` (Enum: `["razorpay", "stripe"]`)
*   `paymentStatus`: `String` (Enum: `["pending", "paid", "failed"]`, default: `pending`)
*   `expiresAt`: `Date` (Index: `{ expireAfterSeconds: 0 }` — Auto-cleans unpaid orders).

### 6. `usertasteprofiles` (Restaurant Service)
*   `userId`: `ObjectId` (Ref: `User`, Required, Unique Index)
*   `cuisineWeights`: `Map` (Key: `String`, Value: `Number`)
*   `priceBand`: `{ min: Number, max: Number }`
*   `dietaryFlags`: `[String]`
*   `embeddingCentroid`: `[Number]` (User interest vector)
*   `timestamps`: `true`

---

## 8. Authentication & Authorization

BhookBuster implements stateless authorization using JWTs verified locally by each service.

```
   [Frontend]               [Auth Service]           [Google OAuth]            [Domain Service]
       │                           │                        │                         │
       ├─► Click Google Login ─────┼───────────────────────►│                         │
       │                           │                        │                         │
       ◄─► Returns auth code ◄─────┼────────────────────────┤                         │
       │                           │                        │                         │
       ├─► Send auth code ────────►│                        │                         │
       │                           ├─► Exchange code ──────►│                         │
       │                           │   for profile info     │                         │
       │                           ◄── Returns profile ◄────┤                         │
       │                           │                                                  │
       │                           ├─► Sign & Return JWT                              │
       ◄── Save token in storage ◄─┤                                                  │
       │                                                                              │
       ├─► Request with JWT Header ──────────────────────────────────────────────────►│
       │                                                                              ├─► Decrypt JWT &
       │                                                                              │   Verify RBAC
```

1.  **Google OAuth Verification Flow:**
    *   The client triggers Google OAuth via `@react-oauth/google` and receives an authorization code.
    *   The client calls `POST /api/auth/login` sending the `code`.
    *   The `auth` service uses a configured Google API client client-side to exchange this code for an access token, calls `https://www.googleapis.com/oauth2/v2/userinfo` to fetch profile details (name, email, avatar), and upserts the user in MongoDB.
2.  **JWT Signing & Issuance:**
    *   The `auth` service signs a JWT containing the user profile object using `process.env.JWT_SECRET_KEY` with an expiration of 15 days.
    *   To prevent service-specific database queries, services can enrich this token. For example, when a user accesses menu settings, the restaurant service validates ownership, updates the context user object to include their `restaurantId`, and references it in later calls.
3.  **Role-Based Access Control (RBAC) Middlewares:**
    *   `isAuth`: Extracts the Bearer token from the `Authorization` header, decodes it locally using the shared secret, and assigns it to `req.user`.
    *   `isSeller`: Restricts path execution to users having `role === "seller"`.
    *   `isAdmin`: Restricts path execution to users having `role === "admin"`.

---

## 9. AI Features & Hyper-Personalization

BhookBuster incorporates Gemini and Groq engines to power semantic searches and dynamically update taste profiles.

### 1. Semantic Search Flow (Atlas Vector Search & JS Cosine Similarity)
*   **Query Processing:** A user searches for *"spicy food under 300 rupees"*. The `restaurant` service calls AI Gateway's `/internal/nlp/parse`, which prompts a Groq `llama-3.3-70b-versatile` engine (with Gemini fallback) to return structured filters:
```json
{
  "cleanQuery": "spicy food",
  "filters": {
    "maxPrice": 300,
    "isVeg": false,
    "spiceLevel": "hot"
  }
}
```
*   **Embedding Generation:** The clean query is sent to AI Gateway's `/internal/embed` route, producing a 1536-dimensional embedding vector via Gemini's `gemini-embedding-2` model.
*   **Database Search:** The system executes a MongoDB `$vectorSearch` query against the pre-indexed `embedding` field of `menuitems`. It applies geometric boundaries to target only verified, open restaurants near the user:
```ts
{
  $vectorSearch: {
    index: "menu_embedding_vector_index",
    path: "embedding",
    queryVector: queryVector,
    numCandidates: 100,
    limit: 20,
    filter: { isAvailable: true, restaurantId: { $in: nearbyRestaurantIds } }
  }
}
```
*   **Blended Search Score:** Items are ranked using a combination of semantic relevance, popularity (order volume), and proximity:
    $$\text{blendedScore} = 0.6 \times \text{vectorScore} + 0.2 \times \text{popularityScore} + 0.2 \times \text{distanceScore}$$
*   **Resilient Fallback:** If MongoDB's vector search index is unavailable, the service queries candidate documents manually. It calculates cosine similarities inside the service container using the dot product formula divided by the magnitude of the vectors:
    $$\text{Cosine Similarity} = \frac{\mathbf{A} \cdot \mathbf{B}}{\|\mathbf{A}\| \|\mathbf{B}\|}$$

### 2. Rolling User Taste Profile Centroids
When users interact with the app, events are published to RabbitMQ. The consumers process these events to recalculate taste profiles:

*   **Order-Based Blending (80/20 Rule):**
    When a customer pays for an order, the system aggregates the embeddings of the ordered dishes and calculates a centroid. It blends this new vector into the user's existing taste profile using a $0.8$ decay factor to prioritize historical preferences while gradually adapting to new tastes:
    $$\mathbf{C}_{\text{new}} = 0.8 \times \mathbf{C}_{\text{old}} + 0.2 \times \mathbf{C}_{\text{order}}$$
*   **Interaction-Based Blending (Learning Rates):**
    For lightweight actions (e.g., searches, cart additions, ratings), the system adjusts the learning rate ($\alpha$) dynamically based on event weight. For example, a search has a low weight ($0.2$), while adding to cart has a higher weight ($1.5$):
    $$\alpha = \min(0.05 \times \text{weight}, 0.5)$$
    $$\mathbf{C}_{\text{new}} = (1 - \alpha) \times \mathbf{C}_{\text{old}} + \alpha \times \mathbf{C}_{\text{item}}$$
*   **Recommendation Queries:**
    When a customer opens the home screen, the backend executes a `$vectorSearch` using the user's taste profile `embeddingCentroid` to fetch personalized recommendations for the "For You" section.

### 3. Business Analytics Insights
The admin and seller dashboards request summaries from the `/internal/insights` endpoint. The AI Gateway processes financial metrics (subtotal, subsidies, payouts) and prompts Groq/Gemini to extract anomalies and recommendations. The system enforces Indian Rupee formatting, requiring the use of `₹` or `Rs.` for all currency outputs.

---

## 10. Frontend Architecture

The frontend is built with React + Vite, TailwindCSS for styling, and Framer Motion for animations.

### 16 Major Pages
1.  `Home.tsx`: Dashboard displaying personalized "For You" selections, categorized list items, search entries, and geolocation prompts.
2.  `RestaurantPage.tsx`: Detailed restaurant menus, categories, and item cards.
3.  `Search.tsx`: Natural language search input displaying search results grouped by restaurant with matching confidence scores.
4.  `Cart.tsx`: Shopping cart list showing item counts, price calculations, and subtotal changes.
5.  `Checkout.tsx`: Checkout checkout screen containing addresses selection, delivery fees, and Razorpay/Stripe checkout triggers.
6.  `OrderPage.tsx`: Live order status updates tracker displaying a Leaflet interactive map with real-time GPS locations.
7.  `Orders.tsx`: Customer order history list.
8.  `Account.tsx`: User profile editing, avatar updates, and history metrics.
9.  `Address.tsx`: Saved delivery addresses manager.
10. `Login.tsx`: Secured authentication page with Google Login triggers.
11. `SelectRole.tsx`: User onboarding screen selection (`customer`, `rider`, `seller`) right after first-time Google sign-in.
12. `Restaurant.tsx`: Onboarding and management dashboard for sellers.
13. `RiderDashboard.tsx`: Availability controls, order dispatch lists, active delivery managers, and earnings logs for riders.
14. `Admin.tsx`: Platform statistics, charts, and pending rider/restaurant verification lists.
15. `OrderSuccess.tsx` & `PaymentsSuccess.tsx`: Post-checkout payment confirmation screens.

### Global State Management (React Context)
Rather than introducing Redux boilerplate, BhookBuster leverages React Context for global state management:

*   `AppContext.tsx` (`AppProvider`):
    *   Tracks: `user`, `isAuth`, `cart`, `subtotal`, `quantity`, `location` (latitude, longitude, formatted address), and `city`.
    *   Operations: `fetchUser()`, `fetchCart()`, `fetchLocation()` (via LocationIQ reverse geocoding API).
*   `SocketContext.tsx` (`SocketProvider`):
    *   Tracks the Socket.IO client instance.
    *   Connects automatically when `isAuth` resolves to `true` and handles cleanup when logging out.

---

## 11. CI/CD & Deployment

### GitHub Actions Pipeline (`.github/workflows/deploy.yml`)
The workflow automates testing and deployment on push to the `main` branch:
1.  **Code Check:** Installs dependencies and runs ESLint across directories.
2.  **Container Building:** Builds Docker images for the microservices (`restaurant`, `rider`, `admin`, `auth`, `realtime`, `utils`, `ai-gateway`).
3.  **Registry Push:** Signs in to AWS ECR or DockerHub and pushes the built container images.
4.  **Continuous Deployment:** Hits Render webhook endpoints or updates ECS service tasks to pull the fresh container images.

### Docker Configuration
*   **Dockerfile structure (applied across services):**
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "run", "start"]
```
*   **Docker Compose Configuration:**
    *   `docker-compose.yml`: Launches RabbitMQ locally with management plugins for development.
    *   `docker-compose.aws.yml`: Orchestrates container configurations (frontend, restaurant, admin, rider) and assigns ports for localized testing.

### Service Deployment Mapping
*   **Frontend:** AWS S3 + CloudFront or Vercel.
*   **APIs / WebSocket Server:** AWS ECS/Fargate or Render (Web Services).
*   **MongoDB:** MongoDB Atlas (Required for Atlas Vector Search indices).
*   **Caching & Broker:** AWS ElastiCache (Redis) & Amazon MQ (RabbitMQ).

---

## 12. Interesting Technical Decisions & Debugging Log

### Architectural Justifications
*   **Decoupled WebSockets (Realtime Gateway):**
    Isolating Socket.IO in a separate service prevents REST API updates or server restarts from dropping active WebSocket connections.
*   **Hybrid Vector Search Fallback:**
    If the AI Gateway is down or Atlas Vector Search is misconfigured, the restaurant service falls back to local cosine similarity calculation or tokenized text matching. This ensures the search engine remains functional even when AI dependencies are offline.
*   **Database-Backed Order Cleanup:**
    Unpaid orders use a native MongoDB TTL index on the `expiresAt` field. Once an order is paid, the system unsets this field. This keeps the database clean of abandoned checkouts without needing cron jobs.

### Critical Debugging Log
*   **Double Response Bug (Hanging Requests):**
    In `decrementCartItem`, a response was sent when the quantity hit 1, but the function lacked a return statement. The function would continue execution and attempt to send a second response, causing the request to hang or throw header errors.
    *   *Fix:* Added an explicit return statement when quantity equals 1.
*   **Rider updates restriction:**
    Previously, order statuses could be modified by any client. The system was hardened by verifying the caller's identity at service boundaries. Status updates are now restricted by matching the `x-rider-id` header against the order's assigned `riderId`.
*   **Cart parameter mismatch:**
    The `addToCart` handler received arguments in the wrong order: `(itemId, restaurantId)` instead of `(restaurantId, itemId)`. This caused database errors during cart updates.
    *   *Fix:* Corrected the argument order in the click handler and implemented a self-healing read database query. If a cart contains a menu item that has been deleted, the system automatically purges the orphaned cart document on read.
