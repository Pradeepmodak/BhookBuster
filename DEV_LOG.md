# DEV LOG

## Final Production Readiness Pass

### Verification

- Re-ran TypeScript builds for:
  - `frontend`
  - `services/auth`
  - `services/restaurant`
  - `services/rider`
  - `services/admin`
  - `services/realtime`
  - `services/utils`
- Re-ran frontend `eslint`
- Re-ran frontend production build after route-level lazy loading

### Bugs Fixed

- Added payment method validation during order creation so invalid provider values fail fast
- Restricted seller order-list access to the owning restaurant instead of trusting the route param alone
- Hardened rider assignment flow to:
  - reject missing orders cleanly
  - reject already-taken orders cleanly
  - emit the updated order payload instead of stale pre-update state
- Restricted rider delivery status updates to the rider actually assigned to the order
- Added rider current-order cache lookup before cross-service fetches
- Fixed frontend socket provider state handling to avoid unsafe ref-based render access
- Fixed rider map hook ordering issue that could break React rules of hooks on missing delivery coordinates
- Removed a large set of frontend `any`/unused-variable lint failures

### Performance Improvements

- Added route-level lazy loading for page components in the frontend router
- Reduced the primary client entry chunk from roughly `1.68 MB` to roughly `481 kB`
- Preserved cache-aside Redis behavior for admin, restaurant, and rider reads
- Kept Redis fallback behavior intact so services continue to function if cache is unavailable

### Documentation Improvements

- Rewrote `README.md` for production/demo readiness
- Added root-level `SYSTEM_DESIGN.md`
- Added root-level `INTERVIEW_GUIDE.md`
- Documented service boundaries, env vars, caching, RabbitMQ flows, realtime behavior, and deployment posture

### Architectural Notes

- Kept fixes incremental to avoid destabilizing the existing codebase
- Preferred ownership and validation fixes at service boundaries rather than broad rewrites
- Kept cache invalidation minimal and TTL-driven where deeper refactors were not justified in the final pass
- Accepted remaining frontend hook-dependency warnings as low-risk follow-up work because current behavior is stable and the larger correctness issues were already addressed

### Known Remaining Trade-Offs

- There are still `react-hooks/exhaustive-deps` warnings in a handful of frontend pages/components
- `leaflet-routing-machine` remains a large lazy-loaded frontend chunk
- No automated API test suite exists yet, so end-to-end confidence still depends on manual/system verification
