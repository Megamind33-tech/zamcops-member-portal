"use client";

import React, { useRef, useState, useEffect } from "react";
import { Play, Pause, Volume2, VolumeX, Music, Clock } from "lucide-react";

interface AudioPlayerProps {
  src: string;
  title: string;
  artist?: string;
}

export default function AudioPlayer({ src, title, artist }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    // Reset player on source change asynchronously
    const timer = setTimeout(() => {
      setIsPlaying(false);
      setCurrentTime(0);
      if (audioRef.current) {
        audioRef.current.load();
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [src]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch((e) => console.log("Playback failed:", e));
    }
    setIsPlaying(!isPlaying);
  };

  const onTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const onLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const onEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (audioRef.current) {
      const val = parseFloat(e.target.value);
      audioRef.current.currentTime = val;
      setCurrentTime(val);
    }
  };

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs)) return "0:00";
    const minutes = Math.floor(secs / 60);
    const seconds = Math.floor(secs % 60);
    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
  };

  return (
    <div id="zamcops-audio-player" className="bg-white border border-zinc-200 rounded-lg p-4 shadow-sm">
      <audio
        ref={audioRef}
        src={src}
        onTimeUpdate={onTimeUpdate}
        onLoadedMetadata={onLoadedMetadata}
        onEnded={onEnded}
      />
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Track details */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-50 text-[#F58220] rounded flex items-center justify-center border border-orange-100 shrink-0">
            <Music className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h4 className="font-sans font-medium text-zinc-900 text-sm truncate">{title}</h4>
            {artist && <p className="font-mono text-xs text-zinc-500 truncate">{artist}</p>}
          </div>
        </div>

        {/* Controls and duration progress */}
        <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-3">
          {/* Action trigger button */}
          <button
            onClick={togglePlay}
            className="flex items-center justify-center w-8 h-8 rounded-full bg-[#F58220] hover:bg-[#e0751b] text-white transition-colors shrink-0 outline-none"
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
          </button>

          {/* Progress Timeline slider */}
          <div className="flex-1 flex items-center gap-2">
            <span className="font-mono text-[10px] text-zinc-500 min-w-[32px] text-right">
              {formatTime(currentTime)}
            </span>
            <input
              type="range"
              min="0"
              max={duration || 100}
              value={currentTime}
              onChange={handleProgressChange}
              className="flex-1 accent-[#F58220] h-1 bg-zinc-100 rounded-lg appearance-none cursor-pointer"
            />
            <span className="font-mono text-[10px] text-zinc-500 min-w-[32px]">
              {formatTime(duration)}
            </span>
          </div>
        </div>

        {/* Volume controls */}
        <div className="flex items-center gap-2 border-l border-zinc-100 pl-4 shrink-0">
          <button
            onClick={toggleMute}
            className="text-zinc-500 hover:text-zinc-800 transition-colors"
            title={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <span className="flex items-center font-mono text-[10px] text-zinc-500 gap-1">
            <Clock className="w-3 h-3" />
            ZAMCOPS Audio Verifier
          </span>
        </div>
      </div>
    </div>
  );
}
