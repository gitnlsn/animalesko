"use client";

import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import { useEffect } from "react";

import "leaflet/dist/leaflet.css";
import "~/styles/leaflet.css";

import { SPECIES_EMOJI } from "../lib/display.ts";

import type { AlertDTO } from "@animalesko/api";

/**
 * Leaflet ships its marker icons as bundler-relative image URLs, which resolve
 * to 404s under any modern bundler. A `divIcon` sidesteps the whole problem and
 * gets us the prototype's species emoji pin at the same time.
 */
function pinFor(alert: AlertDTO) {
  return L.divIcon({
    className: "animalesko-pin",
    html: `<span role="img" aria-label="${alert.name}">${SPECIES_EMOJI[alert.species]}</span>`,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -36],
  });
}

/**
 * Recentres when the caller's location resolves.
 *
 * `MapContainer`'s `center` is read once at mount, so changing the prop after
 * geolocation returns does nothing — this is the documented way to move it.
 */
function Recenter({ center }: { center: [number, number] }) {
  const map = useMap();
  const [latitude, longitude] = center;

  useEffect(() => {
    map.setView([latitude, longitude]);
  }, [map, latitude, longitude]);

  return null;
}

interface AlertMapProps {
  alerts: AlertDTO[];
  center: [number, number];
  onSelect: (alert: AlertDTO) => void;
}

export function AlertMap({ alerts, center, onSelect }: AlertMapProps) {
  return (
    <MapContainer center={center} zoom={13} scrollWheelZoom className="size-full">
      <Recenter center={center} />
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {alerts.map((alert) => (
        <Marker
          key={alert.id}
          position={[alert.lastSeenLat, alert.lastSeenLng]}
          icon={pinFor(alert)}
        >
          <Popup>
            <div className="min-w-44 p-2">
              <p className="font-semibold">{alert.name}</p>
              <p className="text-xs text-muted-foreground">{alert.lastSeenAddress}</p>
              {/* The one control in the popup, and it opens a sheet that has to
                  render before anything moves — so without a pressed state the
                  tap reads as having missed the (small) link entirely. */}
              <button
                type="button"
                className="-mx-1 mt-2 rounded px-1 py-1 text-xs font-medium text-primary underline press-feedback active:bg-primary/10 active:text-primary-dark"
                onClick={() => onSelect(alert)}
              >
                Ver detalhes
              </button>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
