import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { Alarm, Location } from './types';
import { useGeolocation, haversineDistance } from './hooks/useGeolocation';
import { AlarmCard } from './components/AlarmCard';
import { LocationManager } from './components/LocationManager';
import { FocusModeOverlay } from './components/FocusModeOverlay';
import { BellIcon } from './components/icons/BellIcon';
import { PlusIcon } from './components/icons/PlusIcon';

const DEACTIVATION_RADIUS_METERS = 100;

const getInitialLocations = (): Location[] => {
    try {
        const saved = localStorage.getItem('geo-alarm-locations');
        return saved ? JSON.parse(saved) : [];
    } catch (error) {
        console.error("Failed to parse locations from localStorage", error);
        return [];
    }
};

const getInitialAlarms = (): Alarm[] => {
    try {
        const saved = localStorage.getItem('geo-alarm-alarms');
        if (saved) {
            return JSON.parse(saved);
        }
    } catch (error) {
        console.error("Failed to parse alarms from localStorage", error);
    }
    const initialLocations = getInitialLocations();
    return [{
        id: new Date().toISOString(),
        time: '07:30',
        locationId: initialLocations.length > 0 ? initialLocations[0].id : '',
        sound: 'Default',
        isActive: false,
    }];
};

const usePrevious = <T,>(value: T): T | undefined => {
  const ref = useRef<T>();
  useEffect(() => {
    ref.current = value;
  });
  return ref.current;
};


const App: React.FC = () => {
    const [locations, setLocations] = useState<Location[]>(getInitialLocations);
    const [alarms, setAlarms] = useState<Alarm[]>(getInitialAlarms);

    const [ringingAlarmId, setRingingAlarmId] = useState<string | null>(null);
    const [isLocationManagerOpen, setIsLocationManagerOpen] = useState(false);
    const [editingAlarmId, setEditingAlarmId] = useState<string | null>(null);

    const isAnyAlarmActive = alarms.some(a => a.isActive);
    const { currentPosition, error: geoError, permissionGranted } = useGeolocation(isAnyAlarmActive);
    
    const [nearnessMap, setNearnessMap] = useState<Record<string, boolean>>({});
    const prevNearnessMap = usePrevious(nearnessMap);
    const ringingAlarm = alarms.find(a => a.id === ringingAlarmId);

    useEffect(() => {
        localStorage.setItem('geo-alarm-locations', JSON.stringify(locations));
    }, [locations]);

    useEffect(() => {
        localStorage.setItem('geo-alarm-alarms', JSON.stringify(alarms));
    }, [alarms]);
    
    // Effect to calculate which alarms are near their target
    useEffect(() => {
        if (!currentPosition) return;

        const newNearnessMap: Record<string, boolean> = {};
        alarms.forEach(alarm => {
            if (alarm.locationId) {
                const targetLocation = locations.find(loc => loc.id === alarm.locationId);
                if (targetLocation) {
                    const distance = haversineDistance(
                        currentPosition.lat,
                        currentPosition.lon,
                        targetLocation.lat,
                        targetLocation.lon
                    );
                    newNearnessMap[alarm.id] = distance < DEACTIVATION_RADIUS_METERS;
                }
            }
        });
        setNearnessMap(newNearnessMap);
    }, [currentPosition, alarms, locations]);

    // Effect for deactivating alarm upon arrival
    useEffect(() => {
        const alarmsToDeactivate: string[] = [];
        alarms.forEach(alarm => {
            const isNear = nearnessMap[alarm.id] ?? false;
            const wasNear = prevNearnessMap?.[alarm.id] ?? false;

            if (alarm.isActive && ringingAlarmId !== alarm.id && isNear && !wasNear) {
                alarmsToDeactivate.push(alarm.id);
            }
        });
        
        if (alarmsToDeactivate.length > 0) {
            setAlarms(currentAlarms =>
                currentAlarms.map(a =>
                    alarmsToDeactivate.includes(a.id) ? { ...a, isActive: false } : a
                )
            );
        }
    }, [alarms, nearnessMap, prevNearnessMap, ringingAlarmId]);


    // Effect for ringing alarm at the set time
    useEffect(() => {
        if (ringingAlarmId) return; // An alarm is already ringing

        const checkTime = () => {
            const now = new Date();
            // Check every 30 seconds to be less resource intensive
            if (now.getSeconds() !== 0 && now.getSeconds() !== 30) return;

            const alarmToRing = alarms.find(alarm => {
                if (!alarm.isActive) return false;
                const [alarmHour, alarmMinute] = alarm.time.split(':').map(Number);
                return now.getHours() === alarmHour && now.getMinutes() === alarmMinute;
            });

            if (alarmToRing) {
                const isNear = nearnessMap[alarmToRing.id] ?? false;
                if (isNear) {
                     setAlarms(als => als.map(a => a.id === alarmToRing.id ? {...a, isActive: false} : a));
                } else {
                    setRingingAlarmId(alarmToRing.id);
                }
            }
        };

        const interval = setInterval(checkTime, 1000);
        return () => clearInterval(interval);
    }, [alarms, nearnessMap, ringingAlarmId]);

    const handleUpdateAlarm = useCallback((updatedAlarm: Alarm) => {
        setAlarms(currentAlarms =>
            currentAlarms.map(a => a.id === updatedAlarm.id ? updatedAlarm : a)
        );
    }, []);

    const handleAddAlarm = useCallback(() => {
        const newAlarm: Alarm = {
            id: new Date().toISOString(),
            time: '08:00',
            locationId: locations.length > 0 ? locations[0].id : '',
            sound: 'Default',
            isActive: false,
        };
        setAlarms(prev => [...prev, newAlarm]);
    }, [locations]);

    const handleDeleteAlarm = useCallback((id: string) => {
        setAlarms(prev => prev.filter(a => a.id !== id));
    }, []);

    const handleAddLocation = useCallback((locationData: Omit<Location, 'id'>) => {
        const newLocation: Location = {
            ...locationData,
            id: new Date().toISOString(),
        };
        setLocations(prev => {
            const newLocations = [...prev, newLocation];
            if (editingAlarmId) {
                setAlarms(prevAlarms => prevAlarms.map(a => a.id === editingAlarmId ? { ...a, locationId: newLocation.id } : a));
            }
            return newLocations;
        });
    }, [editingAlarmId]);

    const handleDeleteLocation = useCallback((id: string) => {
        setLocations(prevLocations => {
            const newLocations = prevLocations.filter(loc => loc.id !== id);

            setAlarms(prevAlarms =>
                prevAlarms.map(alarm => {
                    if (alarm.locationId === id) {
                        return {
                            ...alarm,
                            locationId: newLocations.length > 0 ? newLocations[0].id : '',
                            isActive: false, 
                        };
                    }
                    return alarm;
                })
            );
            return newLocations;
        });
    }, []);
    
    const handleSelectLocation = useCallback((id: string) => {
        if (editingAlarmId) {
            setAlarms(prev => prev.map(a => a.id === editingAlarmId ? {...a, locationId: id} : a));
        }
        setIsLocationManagerOpen(false);
        setEditingAlarmId(null);
    }, [editingAlarmId]);

    const handleUseCurrentLocation = useCallback((coords: { lat: number; lon: number }) => {
        const newLocationId = new Date().toISOString();
        const newLocation: Location = {
            id: newLocationId,
            name: `Current Location ${new Date().toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
            })}`,
            ...coords,
        };
        
        setLocations(prev => [...prev, newLocation]);
        handleSelectLocation(newLocationId);
    }, [handleSelectLocation]);

    const handleDismissFocusMode = () => {
        if (ringingAlarmId) {
            setAlarms(a => a.map(alarm => alarm.id === ringingAlarmId ? { ...alarm, isActive: false } : alarm));
        }
        setRingingAlarmId(null);
    };
    
    const handleManageLocations = useCallback((alarmId: string) => {
        setEditingAlarmId(alarmId);
        setIsLocationManagerOpen(true);
    }, []);
    
    const editingAlarm = alarms.find(a => a.id === editingAlarmId);

    return (
        <>
            {ringingAlarm && <FocusModeOverlay alarm={ringingAlarm} onDismiss={handleDismissFocusMode} />}
            <LocationManager
                isOpen={isLocationManagerOpen}
                onClose={() => { setIsLocationManagerOpen(false); setEditingAlarmId(null); }}
                locations={locations}
                selectedLocationId={editingAlarm?.locationId || ''}
                onAddLocation={handleAddLocation}
                onDeleteLocation={handleDeleteLocation}
                onSelectLocation={handleSelectLocation}
                onUseCurrentLocation={handleUseCurrentLocation}
            />
            <main className="min-h-screen w-full bg-gradient-to-br from-slate-900 to-black p-4 sm:p-8 flex flex-col items-center">
                <div className="w-full max-w-md space-y-6 flex flex-col items-center">
                     <h1 className="text-4xl font-bold text-white flex items-center gap-3 self-start">
                        <BellIcon className="w-8 h-8 text-cyan-400" />
                        Geo-Aware Alarms
                    </h1>
                    <div className="w-full space-y-4">
                    {alarms.map(alarm => (
                        <AlarmCard
                            key={alarm.id}
                            alarm={alarm}
                            locations={locations}
                            onUpdateAlarm={handleUpdateAlarm}
                            onDeleteAlarm={() => handleDeleteAlarm(alarm.id)}
                            geoError={geoError}
                            permissionGranted={permissionGranted}
                            onManageLocations={() => handleManageLocations(alarm.id)}
                        />
                    ))}
                    </div>
                     <button
                        onClick={handleAddAlarm}
                        className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-cyan-400 font-semibold py-3 px-4 rounded-lg transition-colors text-md border border-slate-700"
                    >
                        <PlusIcon className="w-5 h-5" /> Add New Alarm
                    </button>
                </div>
                <footer className="text-center mt-8 text-slate-500 text-sm">
                    <p>Geo-Aware Focus Alarm</p>
                </footer>
            </main>
        </>
    );
};

export default App;
