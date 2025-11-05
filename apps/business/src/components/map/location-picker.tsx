"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";

// Dynamically import MapContainer to avoid SSR issues
const MapContainer = dynamic(
  () => import("react-leaflet").then((mod) => mod.MapContainer),
  { ssr: false }
);

const TileLayer = dynamic(
  () => import("react-leaflet").then((mod) => mod.TileLayer),
  { ssr: false }
);

const Marker = dynamic(
  () => import("react-leaflet").then((mod) => mod.Marker),
  { ssr: false }
);

const MapUpdaterComponent = dynamic(
  () => import("./map-updater").then((mod) => mod.MapUpdater),
  { ssr: false }
);

interface LocationPickerProps {
  latitude: number;
  longitude: number;
  onLocationChange: (latitude: number, longitude: number) => void;
  className?: string;
}

// Draggable marker component
function DraggableMarker({
  position,
  onDragEnd,
}: {
  position: [number, number];
  onDragEnd: (lat: number, lng: number) => void;
}) {
  const markerRef = useRef<any>(null);
  const [customIcon, setCustomIcon] = useState<any>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      import("leaflet").then((L) => {
        const icon = L.default.icon({
          iconUrl: "/marker.svg",
          iconSize: [32, 32],
          iconAnchor: [16, 32], // Point of the icon which will correspond to marker's location
          popupAnchor: [0, -32], // Point from which the popup should open relative to the iconAnchor
        });
        setCustomIcon(icon);
      });
    }
  }, []);

  const eventHandlers = {
    dragend() {
      const marker = markerRef.current;
      if (marker != null) {
        const { lat, lng } = marker.getLatLng();
        onDragEnd(lat, lng);
      }
    },
  };

  // Don't render marker until icon is loaded
  if (!customIcon) {
    return null;
  }

  return (
    <Marker
      draggable
      eventHandlers={eventHandlers}
      position={position}
      ref={markerRef}
      icon={customIcon}
    />
  );
}

export function LocationPicker({
  latitude,
  longitude,
  onLocationChange,
  className = "",
}: LocationPickerProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [isLeafletReady, setIsLeafletReady] = useState(false);
  
  useEffect(() => {
    setIsMounted(true);
    // Load CSS and ensure Leaflet is ready
    if (typeof window !== "undefined") {
      import("leaflet/dist/leaflet.css").then(() => {
        // Small delay to ensure Leaflet is fully initialized
        setTimeout(() => {
          setIsLeafletReady(true);
        }, 100);
      });
    }
  }, []);

  const center: [number, number] = [latitude, longitude];
  const zoom = 18;

  const handleDragEnd = (lat: number, lng: number) => {
    onLocationChange(lat, lng);
  };

  if (!isMounted || !isLeafletReady) {
    return (
      <div className={`w-full ${className}`}>
        <div className="h-[400px] w-full rounded-md bg-muted animate-pulse" />
      </div>
    );
  }

  return (
    <div className={`w-full ${className}`}>
      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom={true}
        className="h-[400px] w-full rounded-md z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        <MapUpdaterComponent center={center} zoom={zoom} />
        <DraggableMarker position={center} onDragEnd={handleDragEnd} />
      </MapContainer>
      <p className="text-xs text-muted-foreground mt-2">
        Drag the pin to update your business location
      </p>
    </div>
  );
}
