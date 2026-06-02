import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
// react wrapper over leaflet maps 
import * as L from "leaflet"; // core map library
import "leaflet/dist/leaflet.css";
import "leaflet-routing-machine"; // draws routes between points
import { useEffect } from "react";
import type { LeafletWithRouting } from "../utils/leafletRouting";

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

interface props {
  riderLocation: [number, number];
  deliveryLocation: [number, number];
}

const UserOrderMap = ({
  riderLocation,
  deliveryLocation
}: props) => {
  return   <div className="rounded-xl bg-white shadow-sm p-3">
      <MapContainer
        center={riderLocation} // map centered towards riders loc
        zoom={14}  // medium zoom ,city level view
        className="h-87.5 w-full rounded-lg"
      > 
      {/* map ka background */}
        <TileLayer
          attribution="&copy; OpenStreetMap"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={riderLocation} icon={riderIcon}>
          <Popup>Rider</Popup>
        </Marker>
       <Marker position={deliveryLocation} icon={deliveryIcon}>
          <Popup>Delivery Location</Popup>
        </Marker>
        <Routing from={riderLocation} to={deliveryLocation}></Routing>
      </MapContainer>
    </div>
};

export default UserOrderMap;
