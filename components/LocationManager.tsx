import React, { useState, useEffect, useRef } from 'react';
import type { Location } from '../types';
import { MapPinIcon } from './icons/MapPinIcon';
import { TrashIcon } from './icons/TrashIcon';
import { XIcon } from './icons/XIcon';
import { Map } from './Map';
import { CrosshairIcon } from './icons/CrosshairIcon';
import { MyLocationIcon } from './icons/MyLocationIcon';
import { SearchIcon } from './icons/SearchIcon';


interface LocationManagerProps {
  isOpen: boolean;
  locations: Location[];
  selectedLocationId: string;
  onAddLocation: (location: Omit<Location, 'id'>) => void;
  onDeleteLocation: (id: string) => void;
  onSelectLocation: (id: string) => void;
  onUseCurrentLocation: (coords: { lat: number; lon: number; }) => void;
  onClose: () => void;
}

export const LocationManager: React.FC<LocationManagerProps> = ({ isOpen, locations, selectedLocationId, onAddLocation, onDeleteLocation, onSelectLocation, onUseCurrentLocation, onClose }) => {
  const [newName, setNewName] = useState('');
  const [newCoords, setNewCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [panToCoords, setPanToCoords] = useState<{ lat: number; lon: number } | null>(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const mapClickUpdate = useRef(false);

  useEffect(() => {
    if (mapClickUpdate.current) {
      mapClickUpdate.current = false;
      return;
    }

    if (searchQuery.trim().length < 3) {
      setSearchResults([]);
      return;
    }

    const handler = setTimeout(async () => {
      setIsSearching(true);
      try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`);
        const data = await response.json();
        setSearchResults(data);
      } catch (error) {
        console.error("Failed to fetch search results:", error);
      } finally {
        setIsSearching(false);
      }
    }, 500); // 500ms debounce

    return () => {
      clearTimeout(handler);
    };
  }, [searchQuery]);


  const handleMapClick = async (coords: { lat: number; lng: number }) => {
    const { lat, lng } = coords;
    setNewCoords({ lat, lon: lng });
    setSearchResults([]); // Clear previous results

    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
      const data = await response.json();
      
      if (data && data.display_name) {
        mapClickUpdate.current = true;
        setSearchQuery(data.display_name);
        const name = data.display_name.split(',')[0].substring(0, 30);
        setNewName(name);
      } else {
        mapClickUpdate.current = true;
        setSearchQuery(`Lat: ${lat.toFixed(4)}, Lon: ${lng.toFixed(4)}`);
        setNewName('');
      }
    } catch (error) {
      console.error("Failed to perform reverse geocoding:", error);
      mapClickUpdate.current = true;
      setSearchQuery(`Lat: ${lat.toFixed(4)}, Lon: ${lng.toFixed(4)}`);
      setNewName('');
    }
  };
  
  const handleGoToMyLocationOnMap = () => {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                setPanToCoords({ lat: latitude, lon: longitude });
                // Also set the pin
                handleMapClick({ lat: latitude, lng: longitude });
            },
            (error) => {
                console.error("Error getting current location:", error);
                alert("Could not get your current location. Please ensure you have granted permission and try again.");
            }
        );
    } else {
        alert("Geolocation is not supported by this browser.");
    }
  };

  const handleUseCurrentLocationClick = () => {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                onUseCurrentLocation({ lat: latitude, lon: longitude });
            },
            (error) => {
                console.error("Error getting current location:", error);
                alert("Could not get your current location. Please ensure you have granted permission and try again.");
            },
            { enableHighAccuracy: true }
        );
    } else {
        alert("Geolocation is not supported by this browser.");
    }
  };

  const handleSave = () => {
    if (newName.trim() && newCoords) {
      onAddLocation({ name: newName, ...newCoords });
      resetAddMode();
    }
  };
  
  const resetAddMode = () => {
    setNewName('');
    setNewCoords(null);
    setSearchQuery('');
    setSearchResults([]);
  };
  
  const handleClose = () => {
    resetAddMode();
    onClose();
  }

  const handleSelectSearchResult = (result: any) => {
    const coords = { lat: parseFloat(result.lat), lon: parseFloat(result.lon) };
    setNewCoords(coords);
    setPanToCoords(coords);
    
    const name = result.display_name.split(',')[0].substring(0, 30);
    setNewName(name);
    
    setSearchQuery(result.display_name);
    setSearchResults([]);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-lg flex items-center justify-center z-40 animate-fade-in p-4">
      <div className="bg-slate-800 w-full max-w-4xl h-[90vh] max-h-[800px] rounded-2xl shadow-2xl shadow-cyan-500/10 border border-slate-700 flex flex-col p-6 overflow-y-auto">
        <div className="flex justify-between items-center mb-4 flex-shrink-0">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <MapPinIcon className="w-6 h-6 text-cyan-400" />
            Manage Locations
          </h2>
          <button onClick={handleClose} className="p-2 text-slate-400 hover:text-white transition-colors">
            <XIcon className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-shrink-0 bg-slate-700 p-4 rounded-lg space-y-3 border border-slate-600">
            <h3 className="font-semibold text-lg text-cyan-400">Add New Location</h3>
            <div className="relative">
                <div className="relative">
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search for an address..."
                    className="w-full bg-slate-600 border border-slate-500 rounded-lg pl-10 pr-3 py-2 focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                />
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                </div>
                {(isSearching || searchResults.length > 0) && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-slate-600 border border-slate-500 rounded-lg z-20 max-h-48 overflow-y-auto">
                    {isSearching && <div className="p-3 text-slate-400">Searching...</div>}
                    {!isSearching && searchResults.map((result) => (
                    <div
                        key={result.place_id}
                        onClick={() => handleSelectSearchResult(result)}
                        className="p-3 hover:bg-slate-500 cursor-pointer border-b border-slate-500 last:border-b-0"
                    >
                        <p className="font-semibold text-sm">{result.display_name}</p>
                    </div>
                    ))}
                </div>
                )}
            </div>
            <p className="text-sm text-center text-slate-400">- or click map to place pin -</p>
        </div>

        {/* Map */}
        <div className="w-full h-96 bg-slate-700 rounded-lg overflow-hidden border border-slate-600 relative my-4">
           <Map 
              locations={locations}
              onMapClick={handleMapClick}
              center={[34.0522, -118.2437]} // Default to LA
              zoom={10}
              addingLocationCoords={newCoords}
              panTo={panToCoords}
              isOpen={isOpen}
          />
          <button 
              onClick={handleGoToMyLocationOnMap}
              className="absolute top-3 right-3 bg-slate-800/70 hover:bg-slate-700/90 text-white p-2 rounded-full shadow-lg transition-colors z-[1000]"
              aria-label="Go to my location on map"
              title="Go to my location on map"
          >
              <CrosshairIcon className="w-6 h-6" />
          </button>
        </div>
      
        {/* Controls */}
        <div className="w-full flex flex-col gap-4">
              {newCoords && (
                  <div className="bg-slate-700 p-4 rounded-lg space-y-3 border border-slate-600">
                      <input
                          type="text"
                          value={newName}
                          onChange={(e) => setNewName(e.target.value)}
                          placeholder="Confirm Location Name"
                          className="w-full bg-slate-600 border border-slate-500 rounded-lg px-3 py-2 focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                      />
                      <div className="flex gap-2">
                          <button onClick={handleSave} disabled={!newName.trim() || !newCoords} className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-500 disabled:cursor-not-allowed text-white font-semibold py-2 px-4 rounded-lg transition-colors">Save</button>
                          <button onClick={resetAddMode} className="w-full bg-slate-600 hover:bg-slate-500 text-white font-semibold py-2 px-4 rounded-lg transition-colors">Cancel</button>
                      </div>
                  </div>
              )}

              <button
                onClick={handleUseCurrentLocationClick}
                className="w-full flex items-center justify-center gap-2 bg-slate-600 hover:bg-slate-500 text-white font-semibold py-3 px-4 rounded-lg transition-colors text-md"
              >
                <MyLocationIcon className="w-5 h-5" /> Use Current Location
              </button>

              <div className="bg-slate-900/50 rounded-lg p-4">
              <h3 className="font-semibold text-lg mb-2">Saved Locations</h3>
              <div className="space-y-2">
                  {locations.length === 0 && <p className="text-slate-400 text-center py-4">No locations saved.</p>}
                  {locations.map((loc) => (
                  <div key={loc.id} className="flex items-center justify-between bg-slate-700 p-3 rounded-lg">
                      <div>
                      <p className="font-semibold">{loc.name}</p>
                      <p className="text-sm text-slate-400">
                          Lat: {loc.lat.toFixed(4)}, Lon: {loc.lon.toFixed(4)}
                      </p>
                      </div>
                      <div className="flex items-center gap-1">
                      <button
                          onClick={() => onSelectLocation(loc.id)}
                          disabled={loc.id === selectedLocationId}
                          className="bg-cyan-700 hover:bg-cyan-600 disabled:bg-slate-600 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-semibold py-1 px-3 rounded-md transition-colors text-sm"
                      >
                          {loc.id === selectedLocationId ? 'Selected' : 'Select'}
                      </button>
                      <button onClick={() => onDeleteLocation(loc.id)} className="p-2 text-slate-400 hover:text-red-500 transition-colors">
                          <TrashIcon className="w-5 h-5" />
                      </button>
                      </div>
                  </div>
                  ))}
              </div>
              </div>
        </div>

      </div>
    </div>
  );
};