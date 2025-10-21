export interface Location {
  id: string;
  name: string;
  lat: number;
  lon: number;
}

export interface Alarm {
  id: string;
  time: string; // HH:mm format
  locationId: string;
  sound: 'Default' | 'Chime' | 'Radar' | 'Custom';
  isActive: boolean;
}