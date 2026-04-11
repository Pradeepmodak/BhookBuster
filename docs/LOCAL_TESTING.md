# Local Testing Guide

This guide is for running BhookBuster locally in a way that is useful for:
- development
- demo preparation
- interview verification
- basic smoke testing

## Current Status (April 11, 2026)

- Core builds passing for frontend, restaurant, admin, and rider
- Rider online/offline plus order accept flow stabilized
- Seller menu availability toggle fixed with cache invalidation
- Dashboard settlement metrics available in restaurant/admin analytics

## 1. What You Need

- Node.js 20+
- npm
- Docker Desktop
- MongoDB, Redis, and RabbitMQ

The easiest local setup is:
- run infrastructure with Docker
- run the frontend and backend services with `npm run dev`

## 2. Start Infrastructure Locally

Run MongoDB, Redis, and RabbitMQ in Docker:

```bash
docker run -d --name bhookbuster-mongo -p 27017:27017 mongo:7
docker run -d --name bhookbuster-redis -p 6379:6379 redis:7
docker run -d --name bhookbuster-rabbitmq -p 5672:5672 -p 15672:15672 rabbitmq:3-management
```

Useful local endpoints:
- MongoDB: `mongodb://localhost:27017`
- Redis: `redis://localhost:6379`
- RabbitMQ AMQP: `amqp://localhost:5672`
- RabbitMQ dashboard: `http://localhost:15672`

Default RabbitMQ dashboard credentials:
- username: `guest`
- password: `guest`

## 3. Install Dependencies

From the repo root:

```bash
cd frontend && npm install
cd ../services/auth && npm install
cd ../services/admin && npm install
cd ../services/restaurant && npm install
cd ../services/realtime && npm install
cd ../services/rider && npm install
cd ../services/utils && npm install
```

## 4. Configure Environment Variables

You need working `.env` files for backend services and the frontend.

Frontend should point to local services:

```env
VITE_AUTH_SERVICE_URL=http://localhost:5000
VITE_RESTAURANT_SERVICE_URL=http://localhost:3000
VITE_UTILS_SERVICE_URL=http://localhost:7000
VITE_REALTIME_SERVICE_URL=http://localhost:4000
VITE_RIDER_SERVICE_URL=http://localhost:5001
VITE_ADMIN_SERVICE_URL=http://localhost:2000
```

Backend services should point to local infra:

```env
MONGODB_URI=mongodb://localhost:27017/bhookbuster
REDIS_URL=redis://localhost:6379
RABBITMQ_URL=amqp://localhost:5672
JWT_SECRET_KEY=replace_this
```

Also add any required service-to-service URLs, payment keys, and internal service keys already expected by each service.

## 5. Run The App Locally

Open separate terminals and start:

```bash
cd frontend && npm run dev
```

```bash
cd services/auth && npm run dev
```

```bash
cd services/admin && npm run dev
```

```bash
cd services/restaurant && npm run dev
```

```bash
cd services/realtime && npm run dev
```

```bash
cd services/rider && npm run dev
```

```bash
cd services/utils && npm run dev
```

## 6. Fast Verification Checklist

### Build Verification

Run these before an interview/demo:

```bash
cd frontend && npx tsc -b
cd ../services/restaurant && npm run build
cd ../admin && npm run build
cd ../rider && npm run build
```

If you want the production frontend bundle:

```bash
cd frontend && npm run build
```

## 7. Local Smoke Tests

### Frontend

Open:
- `http://localhost:5173`

Check:
- homepage loads
- navbar renders
- restaurant cards load
- restaurant detail page loads
- seller dashboard loads
- admin dashboard loads
- rider dashboard loads
- seller can toggle menu item available/unavailable and see immediate status refresh
- restaurant sales tab shows customer delivery fee, rider payout, platform subsidy, net platform revenue
- admin overview shows net platform revenue, subsidy, and rider payout cards
- rider can go online without toggle freeze when geolocation fails and retry cleanly
- when restaurant marks order `ready_for_rider`, online verified rider receives `order:available` alert

### Backend Health Checks

Use browser or `curl` for routes that should respond in your current env.

Examples:

```bash
curl http://localhost:3000
curl http://localhost:2000
curl http://localhost:5001
```

If root routes are not defined, test known API routes instead.

### Cache Behavior

To validate Redis-backed flows:

1. hit a cached endpoint once
2. hit it again immediately
3. compare service logs or timing

Example candidate endpoints:
- admin stats
- restaurant analytics
- nearby restaurants
- rider current-order/profile reads

### Realtime Behavior

To test Socket.IO/realtime:

1. place or update an order in one role
2. watch restaurant/rider/customer screens for live status updates
3. verify there are no duplicate socket events
4. verify rider service env uses valid internal URLs (`RESTAURANT_SERVICE_URL` and `REALTIME_SERVICE_URL`, with legacy key fallback supported)

## 8. Interview-Friendly Local Demo Plan

If you only have a few minutes, demo this order:

1. homepage and restaurant discovery
2. restaurant detail page and menu
3. restaurant dashboard analytics
4. admin dashboard analytics and approval queues
5. explain Redis cache-aside and realtime flow

This gives the strongest technical story fastest.

## 9. Common Local Problems

### Vite build fails on Windows native dependency

If `npm run build` fails in the frontend with a native dependency or `EPERM` issue, rerun it outside restrictive sandboxing or from a normal terminal with proper permissions.

### Redis is down

Some read paths will still work more slowly because the upgraded services use graceful fallback.

### RabbitMQ is down

Async event-driven parts of the app may break or become incomplete.

### MongoDB is missing

Most business flows will fail because MongoDB is the source of truth.

## 10. Cleanup

To stop local infrastructure:

```bash
docker stop bhookbuster-mongo bhookbuster-redis bhookbuster-rabbitmq
```

To remove local infrastructure containers:

```bash
docker rm -f bhookbuster-mongo bhookbuster-redis bhookbuster-rabbitmq
```
