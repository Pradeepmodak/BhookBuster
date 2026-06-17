/**
 * SUMMARY FOR INTERVIEW:
 * ----------------------
 * This component represents the Rider-facing map interface.
 * It is responsible for:
 * 1. Geolocation Tracking: Watches the rider's live coordinates continuously using the browser's Geolocation API.
 * 2. Real-time Broadcasting: Sends the rider's live coordinates to the customer via Socket.io.
 * 3. Navigation Visualization: Displays the map, places markers for both the rider and destination, and draws the street route overlay connecting them.
 */

import type { IOrder } from "../types";
import { useState, useEffect } from "react";
// React-Leaflet wrappers to integrate Leaflet maps in a React lifecycle
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import * as L from "leaflet"; // Core Leaflet map library
import "leaflet/dist/leaflet.css";
import "leaflet-routing-machine"; // Leaflet plugin to calculate and draw routes between two points
import axios from "axios";
import { realtimeService } from "../config";
import type { LeafletWithRouting } from "../utils/leafletRouting";
import { useSocket } from "../context/SocketContext";

// Cast Leaflet to support Routing plugins types safely in TypeScript
const routedLeaflet = L as LeafletWithRouting;

// Custom yellow circular marker with CSS styling representing the Rider
const riderIcon = new L.DivIcon({
  html: `<div style="background: #facc15; color: #000; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; border: 3px solid #fff; box-shadow: 0 4px 10px rgba(0,0,0,0.3); font-size: 16px;">R</div>`,
  iconSize: [32, 32],
  className: "",
});

// Custom green circular marker with CSS styling representing the Delivery Location
const deliveryIcon = new L.DivIcon({
  html: `<div style="background: #22c55e; color: #fff; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; border: 3px solid #fff; box-shadow: 0 4px 10px rgba(0,0,0,0.3); font-size: 16px;">H</div>`,
  iconSize: [32, 32],
  className: "",
});

interface Props {
  order: IOrder;
}

/**
 * FUNCTION EXPLANATION FOR INTERVIEW:
 * -----------------------------------
 * The `Routing` sub-component sits inside `<MapContainer>` and connects to Leaflet's map lifecycle.
 * It calls the OSRM (Open Source Routing Machine) API to fetch actual street paths between two waypoints,
 * draws a red navigation line, and handles cleanup to prevent memory leaks during updates.
 */
const Routing = ({
  from,
  to,
}: {
  from: [number, number];
  to: [number, number];
}) => {
  const map = useMap(); // Access Leaflet's map context instance

  useEffect(() => {
    // Instantiate the routing control with two waypoints (Rider and Customer)
    const control = routedLeaflet.Routing.control({
      waypoints: [L.latLng(from[0], from[1]), L.latLng(to[0], to[1])],
      lineOptions: {
        styles: [{ color: "#E23744", weight: 5 }], // Red-accented navigation line
      },
      addWaypoints: false,      // Prevent users from dragging or adding extra stops
      draggableWaypoints: false,
      show: false,              // Hide the text-based turn-by-turn directions panel
      createMarker: () => null, // Don't let Routing Machine create auto-markers (we draw our own riderIcon/deliveryIcon)
      router: routedLeaflet.Routing.osrmv1({
        serviceUrl: "https://router.project-osrm.org/route/v1", // Open Source Routing Machine public API
      }),
    }).addTo(map);

    // INTERVIEW TALKING POINT: Cleanup. Always remove map layers and controls when components unmount
    // or when the coordinates change, avoiding memory leaks and multiple route overlays.
    return () => {
      map.removeControl(control);
    };
  }, [from, to, map]);

  return null; // This component doesn't render DOM elements; it interacts directly with the Leaflet map API
};

/**
 * FUNCTION EXPLANATION FOR INTERVIEW:
 * -----------------------------------
 * The `RiderOrderMap` component is the main page component.
 * It manages the rider's location state, hooks up a continuous geolocation watcher on mount,
 * pushes the coordinates to the websocket server, and wraps the OpenStreetMap/Leaflet UI.
 */
const RiderOrderMap = ({ order }: Props) => {
  const { socket } = useSocket(); // Obtain the unified client socket instance from context
  const [riderLocation, setRiderLocation] = useState<[number, number] | null>(null);

  // Validate that the delivery destination coordinates exist
  const hasDeliveryLocation =
    order.deliveryAddress.latitude != null &&
    order.deliveryAddress.longitude != null;
  const deliveryLocation: [number, number] = hasDeliveryLocation
    ? [order.deliveryAddress.latitude, order.deliveryAddress.longitude]
    : [0, 0];

  // INTERVIEW TALKING POINT: Geolocation Watcher & WebSocket Broadcast
  // We use `navigator.geolocation.watchPosition` instead of `getCurrentPosition` because we need 
  // continuous location updates as the rider moves.
  useEffect(() => {
    if (!hasDeliveryLocation) {
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const latitude = pos.coords.latitude;
        const longitude = pos.coords.longitude;

        // 1. Update rider's local UI state
        setRiderLocation([latitude, longitude]);

        // 2. Broadcast coordinates to WebSockets.
        // We emit to the custom room `user:${order.userId}` (the customer's private room).
        // This targets the specific customer tracking their order, avoiding global broadcasts.
        if (socket) {
          socket.emit("rider:location", {
            room: `user:${order.userId}`,
            payload: { latitude, longitude },
          });
        }
      },
      (err) => console.log("Location Error: ", err),
      {
        enableHighAccuracy: true, // Request GPS-level precision over cellular/Wi-Fi positioning
        maximumAge: 0,            // Force fetch fresh location coordinates instead of cached ones
      }
    );

    // INTERVIEW TALKING POINT: Cleanup watcher. Clearing the watch position on component unmount
    // ensures the rider's phone battery isn't drained when they leave the tracking page.
    return () => navigator.geolocation.clearWatch(watchId);
  }, [hasDeliveryLocation, order.userId, socket]);

  if (!hasDeliveryLocation || !riderLocation) return null;

  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-[0_4px_20px_-4px_rgba(0,0,0,0.1)] border border-gray-100 p-2">
      <MapContainer
        center={riderLocation} // Automatically centers map viewport on rider's current position
        zoom={14}              // Balanced zoom level for city/street view
        className="h-[350px] w-full rounded-xl"
      > 
        {/* OpenStreetMap standard map tiles */}
        <TileLayer
          attribution="&copy; OpenStreetMap"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Marker for Rider's live position */}
        <Marker position={riderLocation} icon={riderIcon}>
          <Popup>You (Rider)</Popup>
        </Marker>

        {/* Marker for Customer's delivery location */}
        <Marker position={deliveryLocation} icon={deliveryIcon}>
          <Popup>Delivery Location</Popup>
        </Marker>

        {/* Draws the red route overlay dynamically between rider and customer */}
        <Routing from={riderLocation} to={deliveryLocation} />
      </MapContainer>
    </div>
  );
};

export default RiderOrderMap;

