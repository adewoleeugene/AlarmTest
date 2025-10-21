import React, { useEffect, useRef } from 'react';
import type { Location } from '../types';

// Since we are using a CDN, we declare L to be available globally
declare const L: any;

interface MapProps {
  locations: Location[];
  onMapClick: (coords: { lat: number; lng: number }) => void;
  center: [number, number];
  zoom: number;
  addingLocationCoords: { lat: number, lon: number } | null;
  panTo: { lat: number, lon: number } | null;
  isOpen: boolean;
}

const redIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});


export const Map: React.FC<MapProps> = ({ locations, onMapClick, center, zoom, addingLocationCoords, panTo, isOpen }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  useEffect(() => {
    if (mapContainerRef.current && !mapRef.current) {
      mapRef.current = L.map(mapContainerRef.current, { zoomControl: false }).setView(center, zoom);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(mapRef.current);

      mapRef.current.on('click', (e: any) => {
        onMapClick(e.latlng);
      });
      L.control.zoom({ position: 'bottomright' }).addTo(mapRef.current);
    }
  }, [center, zoom, onMapClick]);
  
  useEffect(() => {
    if (mapRef.current && isOpen) {
      // When the modal opens, the map container might not have its final size right away.
      // A small timeout ensures the CSS has been applied and we get the correct size.
      const timer = setTimeout(() => {
        mapRef.current?.invalidateSize();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Pan map to coords
  useEffect(() => {
    if (mapRef.current && panTo) {
      mapRef.current.flyTo([panTo.lat, panTo.lon], 15);
    }
  }, [panTo]);
  
  // Update markers
  useEffect(() => {
    if (!mapRef.current) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // Add permanent markers
    locations.forEach(loc => {
      const marker = L.marker([loc.lat, loc.lon]).addTo(mapRef.current)
        .bindPopup(`<b>${loc.name}</b>`);
      markersRef.current.push(marker);
    });

    // Add temporary marker for new location
    if (addingLocationCoords) {
      const tempMarker = L.marker([addingLocationCoords.lat, addingLocationCoords.lon], { icon: redIcon })
        .addTo(mapRef.current)
        .bindPopup('New Location')
        .openPopup();
      markersRef.current.push(tempMarker);
    }
  }, [locations, addingLocationCoords]);

  return <div ref={mapContainerRef} className="h-full w-full rounded-lg z-0" />;
};