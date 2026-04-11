import type { IOrder } from "../types";
import { useState, useEffect } from "react";
// react wrapper over leaflet maps
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import * as L from "leaflet"; // core map library
import "leaflet/dist/leaflet.css";
import "leaflet-routing-machine"; // draws routes between points
import axios from "axios";
import { realtimeService } from "../main";
import type { LeafletWithRouting } from "../utils/leafletRouting";

const routedLeaflet = L as LeafletWithRouting;

const riderIcon = new L.DivIcon({
  html: "🛵💨",
  iconSize: [30, 30],
  className: "",
});
const deliveryIcon = new L.DivIcon({
  html: "🏠",
  iconSize: [30, 30],
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

    const fetchLocation = () => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const latitude = pos.coords.latitude;
          const longitude = pos.coords.longitude;
          setRiderLocation([latitude, longitude]);
          axios.post(
            `${realtimeService}/api/v1/internal/emit`,
            {
              event: "rider:location",
              room: `user:${order.userId}`,
              payload: { latitude, longitude },
            },
            {
              headers: {
                "x-internal-key": import.meta.env.VITE_INTERNAL_SERVICE_KEY,
              },
            },
          );
        },
        (err) => console.log("Location Error: ", err),
        {
          enableHighAccuracy: true, // gps precision
          maximumAge: 5000,        // cache time
          timeout: 10000,         // timeout
        },
      );
    };
    fetchLocation();
const interval = setInterval(fetchLocation, 10000);

return () => clearInterval(interval);
}, [hasDeliveryLocation, order.userId]);

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
