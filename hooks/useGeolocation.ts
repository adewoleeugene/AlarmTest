
import { useState, useEffect } from 'react';

interface GeolocationState {
  currentPosition: { lat: number; lon: number } | null;
  error: string | null;
  permissionGranted: boolean | null;
}

export const haversineDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371e3; // metres
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

export const useGeolocation = (
  isEnabled: boolean
): GeolocationState => {
  const [currentPosition, setCurrentPosition] = useState<{
    lat: number;
    lon: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);

  useEffect(() => {
    if (!isEnabled) {
      setCurrentPosition(null);
      return;
    }
    
    let watchId: number;

    navigator.permissions.query({ name: 'geolocation' }).then((permissionStatus) => {
        setPermissionGranted(permissionStatus.state === 'granted');
        if (permissionStatus.state === 'denied') {
            setError("Geolocation permission denied. Please enable it in your browser settings.");
            return;
        }

        watchId = navigator.geolocation.watchPosition(
          (position) => {
            setError(null);
            setPermissionGranted(true);
            const { latitude, longitude } = position.coords;
            setCurrentPosition({ lat: latitude, lon: longitude });
          },
          (err) => {
            setError(`Geolocation error: ${err.message}`);
            if(err.code === 1) setPermissionGranted(false);
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0,
          }
        );
    });


    return () => {
      if (watchId) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [isEnabled]);

  return { currentPosition, error, permissionGranted };
};
