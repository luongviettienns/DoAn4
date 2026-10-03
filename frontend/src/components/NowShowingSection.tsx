import React, { useState } from 'react';
import { Ticket, Star, Clock, ChevronRight } from 'lucide-react';
import { FEATURED_MOVIES } from '../data/mockMovies';

export const NowShowingSection: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'now' | 'soon'>('now');

  return (
    <section id="movies" className="py-20 bg-[#0B0A0C] border-t border-[#151318]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header with Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 pb-10 border-b border-[#2A2631]">
          <div>
            <div className="text-xs font-bold tracking-widest uppercase text-[#FFB23E] mb-1">
              Khám phá điện ảnh
            </div>
            <h2 className="font-['Barlow_Condensed'] text-4xl sm:text-5xl font-extrabold text-[#F3EEE6] tracking-tight uppercase">
              DANH SÁCH PHIM TẠI RẠP
            </h2>
          </div>

          {/* Tab Switcher */}
          <div className="flex items-center p-1 bg-[#151318] border border-[#2A2631] rounded-xl">
            <button
              type="button"
              onClick={() => setActiveTab('now')}
              className={`px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all min-h-[44px] ${
                activeTab === 'now'
                  ? 'bg-[#FFB23E] text-[#0B0A0C] shadow-md shadow-[#FFB23E]/20'
                  : 'text-[#A39E96] hover:text-[#F3EEE6]'
              }`}
            >
              Đang Chiếu ({FEATURED_MOVIES.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('soon')}
              className={`px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all min-h-[44px] ${
                activeTab === 'soon'
                  ? 'bg-[#FFB23E] text-[#0B0A0C] shadow-md shadow-[#FFB23E]/20'
                  : 'text-[#A39E96] hover:text-[#F3EEE6]'
              }`}
            >
              Sắp Chiếu (4)
            </button>
          </div>
        </div>

        {/* Movies Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6 pt-10">
          {FEATURED_MOVIES.map((movie) => (
            <article
              key={movie.id}
              className="group relative flex flex-col bg-[#151318] rounded-xl overflow-hidden border border-[#2A2631] hover:border-[#FFB23E]/60 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-[#FFB23E]/10"
            >
              {/* Poster 2:3 container */}
              <div className="relative w-full overflow-hidden" style={{ aspectRatio: '2/3' }}>
                <img
                  src={movie.posterUrl}
                  alt={movie.title}
                  loading="lazy"
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />

                {/* Age Rating Badge */}
                <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded text-[11px] font-black bg-[#0B0A0C]/85 text-[#FFB23E] border border-[#FFB23E]/40 backdrop-blur-sm shadow-md">
                  {movie.ageRating}
                </div>

                {/* Format Badges */}
                <div className="absolute top-2.5 right-2.5 flex flex-col items-end gap-1">
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#0B0A0C]/85 text-[#F3EEE6] border border-[#2A2631] backdrop-blur-sm">
                    {movie.formats[0]}
                  </span>
                </div>

                {/* Quick Booking Overlay Button on Desktop Hover */}
                <div className="absolute inset-0 bg-[#0B0A0C]/75 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center p-4 gap-3">
                  <button
                    type="button"
                    className="w-full py-3 bg-[#FFB23E] hover:bg-[#FFA21A] text-[#0B0A0C] font-['Barlow_Condensed'] text-base font-extrabold tracking-wider uppercase rounded-lg shadow-xl flex items-center justify-center gap-2 transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300 min-h-[44px]"
                  >
                    <Ticket className="w-4 h-4 stroke-[2.5]" />
                    <span>ĐẶT VÉ NHANH</span>
                  </button>
                  <span className="text-[11px] text-[#A39E96] text-center line-clamp-2">
                    {movie.tagline}
                  </span>
                </div>
              </div>

              {/* Movie Info */}
              <div className="p-4 flex-1 flex flex-col justify-between space-y-2">
                <div>
                  <div className="flex items-center justify-between text-[11px] text-[#A39E96] mb-1">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-[#FFB23E]" />
                      {movie.durationMinutes}p
                    </span>
                    <span className="flex items-center gap-1 text-[#FFB23E] font-semibold">
                      <Star className="w-3 h-3 fill-current" />
                      9.4
                    </span>
                  </div>

                  <h3 className="font-['Barlow_Condensed'] text-xl font-bold text-[#F3EEE6] group-hover:text-[#FFB23E] transition-colors line-clamp-1 uppercase leading-tight">
                    {movie.title}
                  </h3>
                  <p className="text-[11px] text-[#A39E96] line-clamp-1">{movie.originalTitle}</p>
                </div>

                <div className="pt-2 border-t border-[#2A2631]/60 flex items-center justify-between text-[11px] text-[#A39E96]">
                  <span className="truncate max-w-[120px]">{movie.genres[0]}</span>
                  <ChevronRight className="w-3.5 h-3.5 text-[#FFB23E] group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};
