"use client";

import React from "react";
import { ChevronLeft, ChevronRight, Compass } from "lucide-react";

interface SpatialStorytellingTourProps {
  currentChapter: number;
  onSelectChapter: (chapter: number) => void;
}

export default function SpatialStorytellingTour({
  currentChapter,
  onSelectChapter,
}: SpatialStorytellingTourProps) {
  const chapters = [
    {
      num: 1,
      title: "01 // Global Earth",
      short: "Orbit",
      desc: "Orbital perspective over the Indian subcontinent",
    },
    {
      num: 2,
      title: "02 // Uttarakhand Basin",
      short: "Uttarakhand",
      desc: "53,418 km² Western Himalayan study sector",
    },
    {
      num: 3,
      title: "03 // Garhwal 3D Relief",
      short: "Himalayan 3D",
      desc: "3D Copernicus DEM topography & active thermal fronts",
    },
    {
      num: 4,
      title: "04 // Scientific Telemetry",
      short: "Telemetry",
      desc: "Pre-monsoon dynamics & cross-sensor findings",
    },
  ];

  const handlePrev = () => {
    if (currentChapter > 1) {
      onSelectChapter(currentChapter - 1);
    }
  };

  const handleNext = () => {
    if (currentChapter < chapters.length) {
      onSelectChapter(currentChapter + 1);
    }
  };

  return (
    <div className="absolute top-20 left-8 z-20 flex items-center gap-2 glass-pill rounded-full p-1 text-xs shadow-2xl">
      <div className="flex items-center gap-1.5 px-3 py-1 text-slate-400 font-medium">
        <Compass className="w-3.5 h-3.5 text-amber-400" />
        <span className="hidden sm:inline">Spatial Tour</span>
      </div>

      <div className="w-[1px] h-4 bg-white/10" />

      {/* Chapter Pills */}
      <div className="flex items-center gap-1">
        {chapters.map((ch) => (
          <button
            key={ch.num}
            onClick={() => onSelectChapter(ch.num)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-all cursor-pointer ${
              currentChapter === ch.num
                ? "bg-white text-slate-950 font-semibold shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.05]"
            }`}
            title={ch.desc}
          >
            <span>{ch.short}</span>
          </button>
        ))}
      </div>

      <div className="w-[1px] h-4 bg-white/10" />

      {/* Prev / Next Arrows */}
      <div className="flex items-center gap-0.5 pr-1">
        <button
          onClick={handlePrev}
          disabled={currentChapter === 1}
          className={`p-1 rounded-full transition-colors ${
            currentChapter === 1
              ? "text-slate-600 cursor-not-allowed"
              : "text-slate-300 hover:text-white hover:bg-white/10 cursor-pointer"
          }`}
          title="Previous Chapter"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={handleNext}
          disabled={currentChapter === chapters.length}
          className={`p-1 rounded-full transition-colors ${
            currentChapter === chapters.length
              ? "text-slate-600 cursor-not-allowed"
              : "text-slate-300 hover:text-white hover:bg-white/10 cursor-pointer"
          }`}
          title="Next Chapter"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

