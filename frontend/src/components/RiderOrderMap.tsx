import type { IOrder } from "../types";
import { useState, useEffect } from "react";
// react wrapper over leaflet maps
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import * as L from "leaflet"; // core map library
import "leaflet/dist/leaflet.css";
import "leaflet-routing-machine"; // draws routes between points
import axios from "axios";
import { realtimeService } from "../config";
import type { LeafletWithRouting } from "../utils/leafletRouting";
import { useSocket } from "../context/SocketContext";

const routedLeaflet = L as LeafletWithRouting;

const riderIcon = new L.DivIcon({
  html: `<div style="background: #facc15; color: #000; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; border: 3px solid #fff; box-shadow: 0 4px 10px rgba(0,0,0,0.3); font-size: 16px;">R</div>`,
  iconSize: [32, 32],
  className: "",
});
const deliveryIcon = new L.DivIcon({
  html: `<div style="background: #22c55e; color: #fff; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; border: 3px solid #fff; box-shadow: 0 4px 10px rgba(0,0,0,0.3); font-size: 16px;">H</div>`,
  iconSize: [32, 32],
  className: "",
});

interface Props {
  order: IOrder;
}

const Routing = ({
  from,
  to,
}: {
  from: [number, number];
  to: [number, number];
}) => {
  const map = useMap(); // access to leaflet map instance

  // run when from and to changes
  useEffect(() => {
    const control = routedLeaflet.Routing.control({
      waypoints: [L.latLng(from[0], from[1]), L.latLng(to[0], to[1])],
      lineOptions: {
        styles: [{ color: "#E23744", weight: 5 }],
      },
      addWaypoints: false,
      draggableWaypoints: false,
      show: false,
      createMarker: () => null,
      router: routedLeaflet.Routing.osrmv1({
        serviceUrl: "https://router.project-osrm.org/route/v1",
      }),
    }).addTo(map);

    return () => {
      map.removeControl(control);
    };
  }, [from, to, map]);

  return null;
};

const RiderOrderMap = ({ order }: Props) => {
  const { socket } = useSocket();
  const [riderLocation, setRiderLocation] = useState<[number, number] | null>(
    null,
  );
  const hasDeliveryLocation =
    order.deliveryAddress.latitude != null &&
    order.deliveryAddress.longitude != null;
  const deliveryLocation: [number, number] = hasDeliveryLocation
    ? [order.deliveryAddress.latitude, order.deliveryAddress.longitude]
    : [0, 0];

  useEffect(() => {
    if (!hasDeliveryLocation) {
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const latitude = pos.coords.latitude;
        const longitude = pos.coords.longitude;
        setRiderLocation([latitude, longitude]);
        if (socket) {
          socket.emit("rider:location", {
            room: `user:${order.userId}`,
            payload: { latitude, longitude },
          });
        }
      },
      (err) => console.log("Location Error: ", err),
      {
        enableHighAccuracy: true,
        maximumAge: 0,
      }
    );

    return () => navigator.geolocation.clearWatch(watchId);
}, [hasDeliveryLocation, order.userId, socket]);

if (!hasDeliveryLocation || !riderLocation) return null;
  return (
  <div className="overflow-hidden rounded-2xl bg-white shadow-[0_4px_20px_-4px_rgba(0,0,0,0.1)] border border-gray-100 p-2">
    <MapContainer
      center={riderLocation} // map centered towards riders loc
      zoom={14}  // medium zoom ,city level view
      className="h-[350px] w-full rounded-xl"
    > 
    {/* map ka background */}
      <TileLayer
        attribution="&copy; OpenStreetMap"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker position={riderLocation} icon={riderIcon}>
        <Popup>You (Rider)</Popup>
      </Marker>
     <Marker position={deliveryLocation} icon={deliveryIcon}>
        <Popup>Delivery Location</Popup>
      </Marker>
      <Routing from={riderLocation} to={deliveryLocation}></Routing>
    </MapContainer>
  </div>
);
};

export default RiderOrderMap;

