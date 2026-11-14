"use client";

import React, { useRef, useState, useEffect } from "react";
import { X, Play, Pause, Volume2, VolumeX, Maximize2, Sparkles, Orbit, Film } from "lucide-react";

interface NasaVideoCinemaModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NasaVideoCinemaModal({ isOpen, onClose }: NasaVideoCinemaModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(30);

  useEffect(() => {
    if (isOpen && videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {
        setIsPlaying(false);
      });
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === " ") {
        e.preventDefault();
        togglePlay();
      }
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen, isPlaying]);

  if (!isOpen) return null;

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !videoRef.current.muted;
    setIsMuted(videoRef.current.muted);
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const curr = videoRef.current.currentTime;
    const dur = videoRef.current.duration || 30;
    setCurrentTime(curr);
    setDuration(dur);
    setProgress((curr / dur) * 100);
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!videoRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const pct = clickX / rect.width;
    videoRef.current.currentTime = pct * (videoRef.current.duration || 30);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="nasa-video-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-10 bg-black/85 backdrop-blur-xl animate-in fade-in duration-300"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-5xl rounded-2xl overflow-hidden bg-slate-950/90 border border-cyan-500/30 shadow-[0_0_80px_rgba(6,182,212,0.25)] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center">
              <Film className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 id="nasa-video-modal-title" className="text-sm font-bold text-white tracking-wide">
                  NASA Planetary Cinematic Footage
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono-telemetry bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  ULTRA-HD REEL
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono-telemetry">
                Low Earth Orbit · Sun-synchronous Multi-spectral Atmospheric Pass
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close NASA Video Player"
            className="p-2 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Video Player Display */}
        <div className="relative aspect-video w-full bg-black flex items-center justify-center overflow-hidden group">
          <video
            ref={videoRef}
            src="/api/video"
            autoPlay
            loop
            muted={isMuted}
            playsInline
            onTimeUpdate={handleTimeUpdate}
            onClick={togglePlay}
            className="w-full h-full object-contain cursor-pointer"
          />

          {/* Center Play/Pause Overlay indicator when paused */}
          {!isPlaying && (
            <button
              onClick={togglePlay}
              className="absolute inset-0 flex items-center justify-center bg-black/40 cursor-pointer"
            >
              <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-white shadow-2xl hover:scale-105 transition-transform">
                <Play className="w-7 h-7 fill-white translate-x-0.5" />
              </div>
            </button>
          )}

          {/* Video Controls Bar */}
          <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-black/90 via-black/40 to-transparent flex flex-col gap-2">
            {/* Scrubber Bar */}
            <div
              onClick={handleSeek}
              className="relative w-full h-1.5 rounded-full bg-white/20 hover:h-2 transition-all cursor-pointer overflow-hidden"
            >
              <div
                className="h-full bg-gradient-to-r from-cyan-400 to-sky-400 rounded-full"
                style={{ width: `${progress}%` }}
              />
            </div>

            {/* Bottom Controls Row */}
            <div className="flex items-center justify-between text-xs font-mono-telemetry text-slate-300 pt-1">
              <div className="flex items-center gap-3">
                <button
                  onClick={togglePlay}
                  className="p-1 hover:text-white transition-colors cursor-pointer"
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
                </button>

                <button
                  onClick={toggleMute}
                  className="p-1 hover:text-white transition-colors cursor-pointer"
                >
                  {isMuted ? <VolumeX className="w-4 h-4 text-slate-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
                </button>

                <span className="text-[11px] text-slate-400">
                  {currentTime.toFixed(1)}s / {duration.toFixed(1)}s
                </span>
              </div>

              <div className="flex items-center gap-2 text-[11px] text-slate-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>30 FPS Master Stream · 1280×720 Progressive</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Metadata & Scientific Insights */}
        <div className="px-6 py-4 bg-white/[0.02] border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="text-slate-300 font-light leading-relaxed">
            <strong className="text-white font-medium">Orbital Insight:</strong> Direct visual verification of Earth atmospheric scattering, cloud thermodynamics, and ocean surface reflectance corresponding to NASA Blue Marble & Suomi-NPP sensor passes.
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs transition-colors cursor-pointer"
            >
              Return to 3D Globe
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

