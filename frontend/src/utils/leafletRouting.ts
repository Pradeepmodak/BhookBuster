import type * as Leaflet from "leaflet";

export interface RoutingController {
  addTo(map: Leaflet.Map): Leaflet.Control;
}

export interface RoutingApi {
  control(options: Record<string, unknown>): RoutingController;
  osrmv1(options?: Record<string, unknown>): unknown;
}

export type LeafletWithRouting = typeof Leaflet & {
  Routing: RoutingApi;
};
