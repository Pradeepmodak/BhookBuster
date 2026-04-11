# BhookBuster

BhookBuster is a full-stack food delivery platform built as a microservices-based system with distinct flows for customers, restaurant operators, riders, and admins. It combines transactional ordering, payment orchestration, realtime delivery updates, cache-backed analytics, and event-driven rider dispatch in one interview-ready codebase.

## Production Readiness Snapshot

- Verified backend builds: `auth`, `restaurant`, `rider`, `admin`, `realtime`, `utils`
- Verified frontend: `eslint` passes with warnings only, production build passes
- Redis cache-aside is active in `admin`, `restaurant`, and `rider` services with graceful fallback
- RabbitMQ is used for payment success and rider-dispatch events
- Socket.IO is used for customer, restaurant, and rider realtime updates
- Payment paths support both Razorpay and Stripe
- Final readiness fixes included auth/ownership hardening, rider assignment safety, socket correctness fixes, and route-level frontend splitting

## Architecture

### Services

- `services/auth`: Google OAuth login, JWT issuance, role selection, `/me` profile lookup
- `services/restaurant`: restaurant onboarding, menu, cart, address book, checkout, orders, seller analytics
- `services/rider`: rider profile, availability, queue polling, current order, delivery progression
- `services/admin`: verification queues and platform analytics
- `services/realtime`: authenticated Socket.IO gateway and internal event emitter
- `services/utils`: payment provider integrations, payment event publishing, file upload support
- `frontend`: React + Vite web client for all product roles

### Core Infrastructure

- MongoDB for primary persistence
- Redis for cache-aside reads on hot analytics and rider/catalog endpoints
- RabbitMQ for asynchronous service coordination
- Socket.IO for realtime room-based event fan-out

## Key Features

### Customer

- Discover nearby restaurants using geo-aware lookup
- Browse menus, manage cart, save addresses, and checkout
- Pay with Razorpay or Stripe
- Track order lifecycle and rider assignment in realtime

### Restaurant

- Create and manage restaurant profile
- Add, remove, and toggle menu item availability
- Accept and progress orders through fulfillment states
- View dashboard analytics for revenue, order patterns, delivery economics, and item performance

### Rider

- Create and edit rider profile
- Toggle online/offline availability with location updates
- Receive dispatch-ready jobs through queue polling and realtime notifications
- Update delivery state from assigned to picked up to delivered
- View earnings analytics

### Admin

- Verify pending restaurants and riders
- Inspect platform revenue, order volume, rider payout, subsidy, and top-selling items
- Use Redis-backed analytics endpoints for lower repeated-read cost

## Redis Strategy

BhookBuster uses cache-aside caching on the most read-heavy endpoints instead of trying to cache every domain object.

- `admin`: stats, trend series, top items, verification queues
- `restaurant`: nearby restaurant discovery, menu listing, seller analytics
- `rider`: profile, active order, delivery queue

TTL policy:

- `stats`: 60 seconds
- `lists`: 5 minutes
- `trends`: 5 minutes

Trade-offs:

- Cache-aside keeps the code simple and failure-tolerant because MongoDB remains the source of truth.
- TTL invalidation is cheaper than wiring mutation hooks everywhere, but it allows brief windows of stale data.
- Services fall back to direct DB or service reads when Redis is unavailable, preserving availability over peak efficiency.

## Event-Driven Design

RabbitMQ is used where eventual consistency is acceptable and synchronous coupling would make the system brittle.

- `PAYMENT_SUCCESS`
  The utils service publishes payment success after provider verification.
  The restaurant service consumes the event, marks the order paid, clears the cart, and emits realtime order notifications.

- `ORDER_READY_FOR_RIDER`
  The restaurant service publishes when a seller moves an order into pickup-ready state.
  The rider service consumes the event, finds nearby verified riders, updates rider queue cache, and emits rider availability notifications.

## Realtime System

Socket.IO clients authenticate using the same JWT used by the REST APIs.

- every user joins `user:{userId}`
- sellers additionally join `restaurant:{restaurantId}`
- internal services emit via `POST /api/v1/internal/emit` on the realtime service

Events currently include:

- `order:new`
- `order:update`
- `order:rider_assigned`
- `order:available`
- `rider:location`

## Setup

### Prerequisites

- Node.js 20+
- MongoDB
- Redis
- RabbitMQ

### Install

```bash
cd frontend && npm install
cd ../services/auth && npm install
cd ../services/restaurant && npm install
cd ../services/rider && npm install
cd ../services/admin && npm install
cd ../services/realtime && npm install
cd ../services/utils && npm install
```

### Run Services

```bash
cd services/auth && npm run dev
cd services/restaurant && npm run dev
cd services/rider && npm run dev
cd services/admin && npm run dev
cd services/realtime && npm run dev
cd services/utils && npm run dev
cd frontend && npm run dev
```

## Environment Variables

Use local `.env` files per service. Do not commit production credentials. The application expects the following keys.

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

### Auth Service

```env
PORT=5000
JWT_SECRET_KEY=replace_me
MONGODB_URI=mongodb_connection_string
GOOGLE_CLIENT_ID=replace_me
GOOGLE_CLIENT_SECRET=replace_me
```

### Restaurant Service

```env
PORT=3000
JWT_SECRET_KEY=replace_me
MONGODB_URI=mongodb_connection_string
UTILS_SERVICE=http://localhost:7000
REALTIME_SERVICE=http://localhost:4000
INTERNAL_SERVICE_KEY=replace_me
RABBITMQ_URL=amqp://user:password@localhost:5672
PAYMENT_QUEUE=payment_event
RIDER_QUEUE=rider_queue
ORDER_READY_QUEUE=order_ready_queue
REDIS_URL=redis://127.0.0.1:6379
```

### Rider Service

```env
PORT=5001
JWT_SECRET_KEY=replace_me
MONGODB_URI=mongodb_connection_string
UTILS_SERVICE_URL=http://localhost:7000
RESTAURANT_SERVICE=http://localhost:3000
REALTIME_SERVICE=http://localhost:4000
INTERNAL_SERVICE_KEY=replace_me
RABBITMQ_URL=amqp://user:password@localhost:5672
RIDER_QUEUE=rider_queue
ORDER_READY_QUEUE=order_ready_queue
REDIS_URL=redis://127.0.0.1:6379
```

### Admin Service

```env
PORT=2000
JWT_SECRET_KEY=replace_me
MONGODB_URI=mongodb_connection_string
DB_NAME=BhookBuster
REDIS_URL=redis://127.0.0.1:6379
```

### Realtime Service

```env
PORT=4000
JWT_SECRET_KEY=replace_me
INTERNAL_SERVICE_KEY=replace_me
```

### Utils Service

```env
PORT=7000
INTERNAL_SERVICE_KEY=replace_me
RABBITMQ_URL=amqp://user:password@localhost:5672
PAYMENT_QUEUE=payment_event
RESTAURANT_SERVICE=http://localhost:3000
FRONTEND_URL=http://localhost:5173
CLOUD_NAME=replace_me
CLOUD_API_KEY=replace_me
CLOUD_API_SECRET=replace_me
CLOUDINARY_URL=replace_me
RAZORPAY_KEY_ID=replace_me
RAZORPAY_KEY_SECRET=replace_me
STRIPE_SECRET_KEY=replace_me
STRIPE_KEY_ID=replace_me
```

## Validation Performed

### Completed

- backend TypeScript builds passed for all six services
- frontend `eslint` passed with warnings only
- frontend production build passed
- order/rider security fixes were added for owner-scoped seller reads and rider-scoped delivery updates
- rider current-order caching was enabled before cross-service fetches
- route-level lazy loading reduced the largest main client chunk from about `1.68 MB` to about `481 kB`

### Still Worth Doing

- add automated API/integration tests for auth, checkout, order lifecycle, and rider dispatch
- add dead-letter queues and retry policy around RabbitMQ consumers
- add mutation-driven cache invalidation for more analytics and list endpoints
- reduce map/routing bundle weight further; `leaflet-routing-machine` is still the heaviest lazy-loaded chunk

## Deployment Notes

- Frontend assets and Nginx config are present in `frontend/`
- Dockerfiles exist for key services
- `docker-compose.aws.yml` and docs under `docs/` provide deployment guidance

Recommended production mapping:

- frontend: S3 + CloudFront, Amplify, or ECS
- APIs: ECS/Fargate or Kubernetes
- MongoDB: Atlas
- Redis: ElastiCache
- RabbitMQ: Amazon MQ
- secrets: AWS Secrets Manager or Parameter Store

## Interview Positioning

This project demonstrates more than CRUD:

- multi-role product design
- async service coordination
- cache design and failure fallback
- realtime user experience
- operational analytics
- production-oriented deployment and documentation

For the deeper walkthrough, see [SYSTEM_DESIGN.md](D:\BhookBuster - Copy\SYSTEM_DESIGN.md) and [INTERVIEW_GUIDE.md](D:\BhookBuster - Copy\INTERVIEW_GUIDE.md).
