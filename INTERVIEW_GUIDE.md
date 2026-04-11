# BhookBuster Interview Guide

## Explain The Project In 2 Minutes

BhookBuster is a microservices-based food delivery system with customer, restaurant, rider, and admin workflows. Customers can discover nearby restaurants, place orders, pay with Razorpay or Stripe, and track delivery in realtime. Restaurants manage menus and fulfillment, riders receive dispatch-ready jobs and update delivery state, and admins verify participants while monitoring marketplace analytics. The interesting engineering part is the combination of MongoDB for core state, Redis for cache-aside optimization, RabbitMQ for async coordination, and Socket.IO for realtime updates.

## Explain The System Design

The frontend talks directly to domain-specific services. Auth handles login and JWTs. Restaurant owns the transactional order lifecycle. Utils integrates with payment providers and publishes payment success events. Rider consumes dispatch events and manages rider-side delivery state. Admin serves approval queues and analytics with Redis-backed caching. Realtime is a separate Socket.IO service that internal services use for room-based event fan-out. MongoDB is the source of truth, Redis accelerates repeated reads, and RabbitMQ decouples payment confirmation and rider assignment.

## Why Microservices?

I chose microservices because the system has clearly different domains with different runtime needs. Payments, realtime sockets, analytics, and rider dispatch have different scaling and failure characteristics than basic auth or CRUD. Splitting them made the architecture easier to reason about, and it let me model eventual consistency explicitly instead of hiding everything inside one large service.

## Why Redis?

Redis is used for read-heavy endpoints where repeated database or aggregation work would be wasteful. Examples include admin analytics, nearby restaurant discovery, seller analytics, rider profile reads, rider queue reads, and rider current-order lookups. I used a cache-aside pattern so MongoDB stays the source of truth and the system still works if Redis is unavailable.

## Why RabbitMQ?

RabbitMQ lets the system handle workflows that are asynchronous by nature. Payment verification should not tightly couple provider callbacks to order state mutation, and rider dispatch should not block seller-facing order updates. By publishing events like `PAYMENT_SUCCESS` and `ORDER_READY_FOR_RIDER`, services can process those workflows independently and more reliably.

## How Does Caching Work?

Caching is cache-aside. The service checks Redis first. If there is a hit, it returns cached data. On a miss, it computes or fetches the data from MongoDB or another service, returns it, and stores it in Redis with a TTL. The TTLs are short enough to keep data reasonably fresh and long enough to reduce repeated expensive reads.

## How Do You Handle Failures?

If Redis is down, the services fall back to direct reads and continue serving traffic with higher latency. If RabbitMQ is delayed or unavailable, payment confirmation and rider assignment can lag, but the rest of the APIs still work. If the realtime service is unavailable, the platform still functions over REST, but users lose live updates. I also added stricter ownership checks in order flows so a bad request or a malicious client cannot update another actor’s order.

## How Will You Scale This System?

I would scale the stateless HTTP services horizontally first. Then I’d add a shared Socket.IO adapter for multi-instance realtime. On the data side, I’d move analytics toward read models or scheduled aggregations, add dead-letter queues and retries for RabbitMQ consumers, and continue pushing large frontend libraries behind route-level splits. For observability, I’d add tracing, queue depth monitoring, p95 latency metrics, and structured logs.

## What Performance Improvements Did You Make?

- Added and extended Redis cache-aside for admin, restaurant, and rider hot paths
- Added rider current-order caching to avoid repeated cross-service calls
- Reduced the main frontend bundle significantly with route-level lazy loading
- Kept graceful cache fallback so performance improvements do not reduce availability

## What Bugs Did You Fix In The Final Pass?

- validated payment method input during order creation
- restricted seller order reads to the owning restaurant
- restricted rider delivery updates to the assigned rider
- hardened rider assignment against missing/stale order state
- fixed frontend socket/provider correctness issues
- removed a large set of TypeScript and lint quality issues

## Strong Closing Answer

> The project is valuable because it shows product breadth and systems thinking at the same time. It is not just a food ordering UI. It has multi-role workflows, async event handling, realtime updates, caching trade-offs, payment orchestration, and operational analytics. In the final production-readiness pass, I focused on correctness at service boundaries, performance on repeated reads, and documentation that explains the architecture clearly enough for interviews and demos.
