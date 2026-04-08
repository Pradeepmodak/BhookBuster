# BhookBuster — Interview Preparation & Features Log

This document tracks all features, architectural fixes, and complex debugging performed on the BhookBuster food delivery application. Use this to rapidly review technical decisions and speak confidently in interviews.

---

## 1. Stateless JWT Authorization Synchronization (Auth + Frontend Context)
**Feature Overview:**
Solved a critical discrepancy where manual MongoDB role changes (e.g. `customer` → `admin`) weren't recognized by other microservices.

**Technical Implementation:**
- Refactored the `myProfile` endpoint to dynamically generate a fresh JWT upon each profile fetch.
- Updated `AppContext.tsx` to capture and overwrite stale `localStorage` tokens with the fresh one.

**💡 Interview Talking Point:**
Explain the difference between *Database Truth* vs *Stateless JWT Truth*. Microservices decrypt JWTs locally to avoid database bottlenecks, but the JWT payload must be intentionally refreshed when core identity data changes.

---

## 2. Microservice Gateway Path Correction (Fullstack Integration)
**Feature Overview:**
Diagnosed persistent 404 errors between React frontend and Express Admin microservice.

**Technical Implementation:**
- Frontend Axios fired to `/api/v1/verify/...` while Express routed through `/v1/api/verify/...`.
- Re-aligned all target endpoints to match backend routing precisely.

**💡 Interview Talking Point:**
Walk the interviewer through using Network Inspector to isolate 404s, then checking that frontend URL strings and express `app.use()` prefixes cleanly mirror each other.

---

## 3. Add To Cart — Swapped Parameter Fix + Self-Healing Database
**Feature Overview:**
The `addToCart` function received parameters in reversed order, corrupting cart documents.

**Technical Implementation:**
- **Root cause:** `onClick={() => addToCart(item._id, item.restaurantId)}` — passed `itemId` as `restaurantId`.
- **Fix:** Corrected to `addToCart(item.restaurantId, item._id)`.
- **Defense-in-depth:** Added a self-healing loop in `fetchMyCart` — if any populated `itemId` resolves to `null`, the cart entry is auto-purged from MongoDB and filtered from the API response.

**💡 Interview Talking Point:**
When discussing *Defensive Programming*, describe the self-healing pattern: rather than crashing on orphaned references (e.g., deleted menu items still in carts), the system auto-cleans stale data on read and returns only valid entries.

---

## 4. Double Response Prevention — Missing Return Statement
**Feature Overview:**
`decrementCartItem` sent a response when quantity hit 1, but didn't `return` — execution continued and tried to send a second response.

**Technical Implementation:**
- Added `return` before `res.json()` in the `quantity === 1` branch.
- Without this fix: `Error: Cannot set headers after they are sent to the client`.

**💡 Interview Talking Point:**
When asked about *common Express.js mistakes*, this is a classic: forgetting to `return` after sending a response inside a conditional branch. Express doesn't automatically stop function execution after `res.json()`.

---

## 5. Cart Cleanup — deleteOne vs deleteMany
**Feature Overview:**
After order creation, only ONE cart item was deleted instead of ALL.

**Technical Implementation:**
- `Cart.deleteOne({userId})` → `Cart.deleteMany({userId})`.
- Without this fix, multi-item orders would leave ghost cart entries.

**💡 Interview Talking Point:**
When discussing *MongoDB operations*, explain the distinction between `deleteOne` (deletes first match) and `deleteMany` (deletes all matches). In a cart system where each item is a separate document, `deleteMany` is required.

---

## 6. Socket.IO Memory Leak — Event Name Mismatch
**Feature Overview:**
Rider dashboard registered a socket listener on `order:available` but cleaned up on `order_available` (wrong name).

**Technical Implementation:**
- Fixed: `socket.off('order:available', onOrderAvailable)`.
- Without this: listeners accumulated on every React re-render, causing exponential duplicate notifications.

**💡 Interview Talking Point:**
When discussing *WebSocket best practices* or *React cleanup patterns*, explain how `useEffect` return functions must use the EXACT same event name and callback reference for proper cleanup. Mismatches cause memory leaks.

---

## 7. Rider Order Status — Hanging Request Fix
**Feature Overview:**
`updateOrderStatusRider` had no fallback response for unexpected status values.

**Technical Implementation:**
- Added `return res.status(400).json({ message: "Cannot update order with current status" })` at the end.
- Without this fix, unexpected statuses caused the HTTP request to hang until client timeout.

**💡 Interview Talking Point:**
When discussing *API robustness*, always ensure every code path in a controller returns a response. Use an explicit `else`/fallback to handle unexpected inputs rather than silently hanging.

---

## 8. Verification Badge System (React Component Architecture)
**Feature Overview:**
Designed a reusable "Verified" badge using `react-icons/md` (`MdVerified` / `MdInfoOutline`). The badge conditionally renders for sellers and admins but is hidden from customers (since all listed restaurants are pre-verified).

**Technical Implementation:**
- Created `VerificationBadge.tsx` — accepts `isVerified`, `size`, `showUnverified` props.
- Integrated into `RestaurantProfile.tsx`, `AdminRestaurantCard.tsx`, `AdminRiderCard.tsx`, `RiderDashboard.tsx`.
- Customer-facing views conditionally hide the badge entirely via `{isSeller && <VerificationBadge />}`.

**💡 Interview Talking Point:**
When discussing *DRY principle* and *Component Reusability*, explain how extracting inline badge markup into a standalone component allows single-point aesthetic changes and conditional rendering via props.
