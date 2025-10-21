
import React, { useEffect, useRef, useState } from 'react';
import type { Alarm } from '../types';

interface FocusModeOverlayProps {
  alarm: Alarm;
  onDismiss: () => void;
}

const playAlarmSound = (sound: Alarm['sound']) => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.5, audioContext.currentTime + 0.01);

    let frequency = 440; // A4
    if(sound === 'Chime') frequency = 880;
    if(sound === 'Radar') frequency = 660;

    oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
    oscillator.type = 'sine';
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 1);

    gainNode.gain.exponentialRampToValueAtTime(0.00001, audioContext.currentTime + 1);
};


export const FocusModeOverlay: React.FC<FocusModeOverlayProps> = ({ alarm, onDismiss }) => {
    const intervalRef = useRef<number | null>(null);
    const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString());

    useEffect(() => {
        playAlarmSound(alarm.sound);
        intervalRef.current = window.setInterval(() => {
            playAlarmSound(alarm.sound);
        }, 2000);
        
        const timeInterval = window.setInterval(() => {
            setCurrentTime(new Date().toLocaleTimeString());
        }, 1000)

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
            clearInterval(timeInterval);
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [alarm.sound]);

    return (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-lg flex items-center justify-center z-50 animate-fade-in">
            <div className="text-center p-8 rounded-2xl bg-slate-800 shadow-2xl shadow-cyan-500/10 border border-slate-700">
                <h1 className="text-6xl font-bold text-cyan-400 mb-2">Focus Time!</h1>
                <p className="text-9xl font-mono font-bold tracking-tighter text-white mb-6">
                    {currentTime}
                </p>
                <p className="text-slate-400 text-lg mb-8">Your alarm has triggered. Time to get things done.</p>
                <button
                    onClick={onDismiss}
                    className="bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold py-3 px-8 rounded-full text-xl transition-transform transform hover:scale-105"
                >
                    Dismiss Alarm
                </button>
            </div>
        </div>
    );
};
