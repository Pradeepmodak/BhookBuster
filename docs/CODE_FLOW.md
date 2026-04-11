# BhookBuster Code Flow Guide

This document explains the practical code-level flow for major BhookBuster paths.
Use it for onboarding, debugging, and interview walkthroughs.

## 1. Restaurant Menu Read Flow

```mermaid
flowchart TD
    A["Frontend seller/customer requests menu"] --> B["GET /api/item/all/:id"]
    B --> C["controllers/menuitem.getAllItems"]
    C --> D["services/catalog.fetchRestaurantMenuItems"]
    D --> E{"Redis key catalog:menu:{restaurantId} exists?"}
    E -- Yes --> F["Return cached menu list"]
    E -- No --> G["Query MongoDB MenuItems collection"]
    G --> H["Set cache with TTL"]
    H --> I["Return menu response"]
```

Key files:
- `services/restaurant/src/routes/menuitem.ts`
- `services/restaurant/src/controllers/menuitem.ts`
- `services/restaurant/src/services/catalog.ts`
- `services/restaurant/src/cache/redis.ts`

## 2. Menu Availability Toggle Flow (Fixed)

```mermaid
flowchart TD
    A["Seller clicks Set Available / Set Unavailable"] --> B["PUT /api/item/status/:itemId"]
    B --> C["controllers/menuitem.toggleMenuItemAvailability"]
    C --> D["Validate seller owns restaurant item"]
    D --> E["Flip item.isAvailable and save in MongoDB"]
    E --> F["Delete cache key catalog:menu:{restaurantId}"]
    F --> G["Delete cache key restaurant:dashboard:{restaurantId}"]
    G --> H["Return updated item + success message"]
    H --> I["Frontend refetches menu and reflects latest status"]
```

Why this fix was required:
- The menu endpoint was cached, but toggle/delete/create mutations were not invalidating cache.
- Result: UI looked stale for up to TTL duration even when DB had changed.

## 3. Restaurant Analytics Flow

```mermaid
flowchart TD
    A["Seller opens Sales tab"] --> B["GET /api/restaurant/analytics/:restaurantId"]
    B --> C["services/analytics.getRestaurantDashboardAnalytics"]
    C --> D{"Redis key restaurant:dashboard:{restaurantId} exists?"}
    D -- Yes --> E["Return cached analytics payload"]
    D -- No --> F["Load paid orders + menu items"]
    F --> G["Compute BI metrics and insight strings"]
    G --> H["Compute settlement metrics"]
    H --> I["Set analytics cache with TTL"]
    I --> J["Return dashboard payload"]
```

Settlement metrics now included:
- `customerDeliveryFees`
- `riderPayout`
- `platformSubsidy`
- `netPlatformRevenue`

## 4. Admin Stats Flow

```mermaid
flowchart TD
    A["Admin opens overview"] --> B["GET /v1/api/admin/stats"]
    B --> C["services/admin.fetchAdminStats"]
    C --> D{"Redis key admin:stats exists?"}
    D -- Yes --> E["Return cached admin stats"]
    D -- No --> F["Load paid orders + counts from MongoDB"]
    F --> G["Compute growth, peak hour, queue counts"]
    G --> H["Compute net platform and subsidy totals"]
    H --> I["Set cache and return response"]
```

## 5. Rider Availability + Accept Flow (Stabilized)

```mermaid
flowchart TD
    A["Rider toggles online"] --> B["PUT rider availability endpoint"]
    B --> C["Update rider isAvailable in DB"]
    C --> D["Delete rider profile/order cache keys"]
    D --> E["Frontend updates local profile from API response"]
    E --> F["Rider receives order request"]
    F --> G["Rider clicks Accept"]
    G --> H["Backend validates and assigns order"]
    H --> I["Invalidate assigned-order/profile caches"]
    I --> J["Return assigned order state"]
```

Reliability details:
- Rider service now resolves internal URLs with fallback (`*_SERVICE_URL` then `*_SERVICE`).
- Consumer-side failures now acknowledge queue messages to avoid stuck unacked deliveries.
- Restaurant service now asserts `ORDER_READY_QUEUE` before publishing ready-for-rider events.

## 6. Frontend Component Flow (Restaurant Seller)

```mermaid
flowchart TD
    A["Restaurant page loads"] --> B["fetchMyRestaurant"]
    B --> C["fetchMenuItems"]
    B --> D["fetchAnalytics"]
    C --> E["Render MenuGrid"]
    D --> F["Render sales charts and stat cards"]
    E --> G["Seller toggles menu availability"]
    G --> H["MenuGrid calls toggle endpoint and refetches"]
```

Key files:
- `frontend/src/pages/Restaurant.tsx`
- `frontend/src/components/MenuGrid.tsx`

## 7. Debug Checklist For Stale UI

1. Confirm mutation endpoint returns success and updated entity.
2. Confirm related cache keys are deleted on mutation.
3. Confirm frontend refetch runs after mutation.
4. Confirm response is not served from stale client state only.
5. Confirm TTL values match expected freshness.
