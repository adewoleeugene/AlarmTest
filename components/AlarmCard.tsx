import React from 'react';
import type { Alarm, Location } from '../types';
import { MapPinIcon } from './icons/MapPinIcon';
import { TrashIcon } from './icons/TrashIcon';

interface AlarmCardProps {
  alarm: Alarm;
  locations: Location[];
  onUpdateAlarm: (updatedAlarm: Alarm) => void;
  onDeleteAlarm: () => void;
  geoError: string | null;
  permissionGranted: boolean | null;
  onManageLocations: () => void;
}

const soundOptions: Alarm['sound'][] = ['Default', 'Chime', 'Radar', 'Custom'];

export const AlarmCard: React.FC<AlarmCardProps> = ({ alarm, locations, onUpdateAlarm, onDeleteAlarm, geoError, permissionGranted, onManageLocations }) => {
  const canActivate = !!alarm.locationId && locations.length > 0;

  const handleToggle = () => {
    if (!canActivate) return;
    onUpdateAlarm({ ...alarm, isActive: !alarm.isActive });
  };
  
  const selectedLocation = locations.find(l => l.id === alarm.locationId);

  return (
    <div className="w-full bg-slate-800/50 rounded-2xl p-6 border border-slate-700 backdrop-blur-sm shadow-lg">
      <div className="flex justify-between items-center mb-6">
        <input
            id={`time-${alarm.id}`}
            type="time"
            value={alarm.time}
            onChange={(e) => onUpdateAlarm({ ...alarm, time: e.target.value })}
            className="bg-transparent text-4xl font-bold focus:ring-0 focus:outline-none p-0 w-auto text-white"
          />
        <div className="flex items-center gap-2">
            <label htmlFor={`alarm-toggle-${alarm.id}`} className={`flex items-center ${canActivate ? 'cursor-pointer' : 'cursor-not-allowed'}`}>
            <div className="relative">
                <input
                id={`alarm-toggle-${alarm.id}`}
                type="checkbox"
                className="sr-only"
                checked={alarm.isActive}
                onChange={handleToggle}
                disabled={!canActivate}
                />
                <div className={`block w-14 h-8 rounded-full transition-colors ${alarm.isActive ? 'bg-cyan-600' : (canActivate ? 'bg-slate-600' : 'bg-slate-700')}`}></div>
                <div className={`dot absolute left-1 top-1 w-6 h-6 rounded-full transition-transform ${alarm.isActive ? 'transform translate-x-6 bg-cyan-400' : (canActivate ? 'bg-white' : 'bg-slate-400')}`}></div>
            </div>
            </label>
            <button onClick={onDeleteAlarm} className="p-2 text-slate-400 hover:text-red-500 transition-colors" aria-label="Delete alarm">
                <TrashIcon className="w-5 h-5" />
            </button>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label htmlFor={`location-${alarm.id}`} className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-1">
            <MapPinIcon className="w-4 h-4" />
            Deactivate at Location
          </label>
           {locations.length > 0 ? (
              <div className="flex items-center gap-2">
                <select
                  id={`location-${alarm.id}`}
                  value={alarm.locationId}
                  onChange={(e) => onUpdateAlarm({ ...alarm, locationId: e.target.value })}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                >
                  {alarm.locationId === '' && <option value="" disabled>Select a location</option>}
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>{loc.name}</option>
                  ))}
                </select>
                <button 
                  onClick={onManageLocations} 
                  className="flex-shrink-0 bg-slate-600 hover:bg-slate-500 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                >
                  Manage
                </button>
              </div>
            ) : (
                <div className="text-center border-2 border-dashed border-slate-600 p-4 rounded-lg">
                    <p className="text-slate-400 mb-3">Please add a location to activate the alarm.</p>
                    <button
                        onClick={onManageLocations}
                        className="bg-cyan-600 hover:bg-cyan-500 text-white font-semibold py-2 px-3 rounded-lg transition-colors text-sm"
                    >
                        Add Location
                    </button>
                </div>
            )}
        </div>
        
        {permissionGranted === false && alarm.locationId && (
            <p className="text-xs text-yellow-400">Please grant location permissions for location-based deactivation to work.</p>
        )}
        {geoError && <p className="text-xs text-red-400">{geoError}</p>}

        <div>
          <label htmlFor={`sound-${alarm.id}`} className="block text-sm font-medium text-slate-300 mb-1">Alarm Sound</label>
          <select
            id={`sound-${alarm.id}`}
            value={alarm.sound}
            onChange={(e) => onUpdateAlarm({ ...alarm, sound: e.target.value as Alarm['sound'] })}
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-cyan-500 focus:outline-none"
          >
            {soundOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        </div>
        {alarm.sound === 'Custom' && (
             <div className="mt-2">
                 <input
                     type="file"
                     accept="audio/*"
                     className="block w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-cyan-50 file:text-cyan-700 hover:file:bg-cyan-100"
                 />
             </div>
         )}
      </div>

      <div className="mt-6 text-center bg-slate-900/50 p-3 rounded-lg">
        <p className={`font-semibold ${canActivate || alarm.isActive ? 'text-cyan-300' : 'text-slate-500'}`}>
            {alarm.isActive ? `Alarm is ON` : 'Alarm is OFF'}
        </p>
        {alarm.isActive && selectedLocation && (
            <p className="text-sm text-slate-400">Will deactivate upon arrival at {selectedLocation.name}.</p>
        )}
         {!canActivate && !alarm.isActive && (
            <p className="text-sm text-slate-500">A location must be selected to activate.</p>
        )}
      </div>
    </div>
  );
};
