# BhookBuster

Production-style multi-role food delivery platform with microservices, realtime updates, async event flows, payment integration, Redis caching, and a premium UI system.

## Why This Project Stands Out

- Multi-role product surface: customer, seller, rider, admin
- Distributed architecture: dedicated services for auth, restaurant/orders, rider, admin, realtime, and utilities
- Event-driven operations using RabbitMQ for inter-service communication
- Redis-based caching for high-read analytics and catalog endpoints
- Realtime user experience powered by Socket.IO
- Interview-grade admin analytics dashboards and operational workflows

## Tech Stack

- Frontend: React 19, TypeScript, Vite, TailwindCSS, Framer Motion, Recharts
- Backend: Node.js, Express, TypeScript
- Database: MongoDB
- Cache: Redis
- Messaging: RabbitMQ
- Realtime: Socket.IO
- Payments: Razorpay and Stripe

## Architecture Snapshot

Services:

- `frontend` (web app UI)
- `services/auth` (Google OAuth, JWT, role bootstrap)
- `services/restaurant` (catalog, cart, checkout, order lifecycle)
- `services/rider` (rider profile, assignment, delivery status)
- `services/admin` (verification and business analytics)
- `services/realtime` (socket rooms + internal event bridge)
- `services/utils` (media upload, payment orchestration + verification)

Design references:

- Full system design and flow graphs: [docs/SYSTEM_DESIGN.md](docs/SYSTEM_DESIGN.md)
- Day-wise engineering log: [DEV_LOG.md](DEV_LOG.md)

## Core Features

- Google login + JWT-based session flow
- Geolocation-aware restaurant discovery
- Cart + checkout with Razorpay and Stripe
- Realtime order updates to user/restaurant/rider
- Rider assignment and delivery progression
- Admin analytics:
  - revenue
  - order trend
  - top-selling items
  - verification queues

## Caching Strategy

Redis is optional but recommended for performance.

Cached endpoints:

- admin stats
- admin top items
- admin order trends
- nearby restaurant catalog
- menu items listing

Graceful degradation:

- if Redis is unavailable, APIs continue using DB reads

## API Highlights (Admin)

- `GET /v1/api/admin/stats`
- `GET /v1/api/admin/top-items`
- `GET /v1/api/admin/orders-trend?days=7`
- `GET /v1/api/admin/restaurant/pending`
- `GET /v1/api/admin/rider/pending`
- `PATCH /v1/api/verify/restaurant/:id`
- `PATCH /v1/api/verify/rider/:id`

## Local Setup

Prerequisites:

- Node.js 20+
- MongoDB
- Redis
- RabbitMQ

Install dependencies:

```bash
cd frontend && npm install
cd ../services/auth && npm install
cd ../admin && npm install
cd ../restaurant && npm install
cd ../realtime && npm install
cd ../rider && npm install
cd ../utils && npm install
```

## Environment Variables

### Frontend (`frontend/.env`)

```env
VITE_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
VITE_INTERNAL_SERVICE_KEY=your_internal_service_key
```

### Auth (`services/auth/.env`)

```env
PORT=5000
MONGODB_URI=your_mongodb_connection
JWT_SECRET_KEY=your_jwt_secret
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

### Admin (`services/admin/.env`)

```env
PORT=2000
MONGODB_URI=your_mongodb_connection
DB_NAME=your_database_name
JWT_SECRET_KEY=your_jwt_secret
REDIS_URL=redis://127.0.0.1:6379
```

### Restaurant (`services/restaurant/.env`)

```env
PORT=3000
MONGODB_URI=your_mongodb_connection
JWT_SECRET_KEY=your_jwt_secret
REDIS_URL=redis://127.0.0.1:6379
RABBITMQ_URL=amqp://localhost
PAYMENT_QUEUE=payment.success
RIDER_QUEUE=rider.queue
ORDER_READY_QUEUE=order.ready
UTILS_SERVICE=http://localhost:7000
REALTIME_SERVICE=http://localhost:4000
INTERNAL_SERVICE_KEY=your_internal_service_key
```

### Realtime (`services/realtime/.env`)

```env
PORT=4000
JWT_SECRET_KEY=your_jwt_secret
INTERNAL_SERVICE_KEY=your_internal_service_key
```

### Rider (`services/rider/.env`)

```env
PORT=5001
MONGODB_URI=your_mongodb_connection
JWT_SECRET_KEY=your_jwt_secret
RABBITMQ_URL=amqp://localhost
ORDER_READY_QUEUE=order.ready
RIDER_QUEUE=rider.queue
RESTAURANT_SERVICE=http://localhost:3000
REALTIME_SERVICE=http://localhost:4000
UTILS_SERVICE_URL=http://localhost:7000
INTERNAL_SERVICE_KEY=your_internal_service_key
```

### Utils (`services/utils/.env`)

```env
PORT=7000
RABBITMQ_URL=amqp://localhost
PAYMENT_QUEUE=payment.success
RESTAURANT_SERVICE=http://localhost:3000
INTERNAL_SERVICE_KEY=your_internal_service_key
FRONTEND_URL=http://localhost:5173

CLOUD_NAME=your_cloudinary_cloud_name
CLOUD_API_KEY=your_cloudinary_api_key
CLOUD_API_SECRET=your_cloudinary_api_secret

RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
STRIPE_SECRET_KEY=your_stripe_secret_key
```

## Run Commands

Start each in separate terminals:

```bash
cd frontend && npm run dev
cd services/auth && npm run dev
cd services/admin && npm run dev
cd services/restaurant && npm run dev
cd services/realtime && npm run dev
cd services/rider && npm run dev
cd services/utils && npm run dev
```

Access app:

- frontend: `http://localhost:5173`

## Verified Build Status

All major services compile successfully:

- `frontend`
- `services/auth`
- `services/admin`
- `services/restaurant`
- `services/realtime`
- `services/rider`
- `services/utils`

## Interview Talking Points

- Why split into service boundaries and where coupling still exists
- How RabbitMQ events reduce synchronous dependency risk
- Cache strategy, TTL selection, and fallback behavior
- Payment trust boundaries and internal service key usage
- Realtime room model (`user:*`, `restaurant:*`) and consistency model
- Potential next scale steps:
  - API gateway
  - circuit breakers + retries
  - observability stack (metrics, tracing, SLOs)
  - idempotency keys for payment/event processing
