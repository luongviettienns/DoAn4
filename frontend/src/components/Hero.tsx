import React, { useState, useEffect, useRef } from 'react';
import { Play, Ticket, ChevronRight, Pause, Calendar, Clock, Film, MapPin, Sparkles } from 'lucide-react';
import { FEATURED_MOVIES, type MovieSlide } from '../data/mockMovies';

const SLIDE_DURATION_MS = 7000;

export const Hero: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(Date.now());

  const currentMovie: MovieSlide = FEATURED_MOVIES[currentIndex];

  // Auto-slide ticker with progress line
  useEffect(() => {
    if (!isPlaying) return;

    startTimeRef.current = Date.now();
    setProgress(0);

    const interval = window.setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const pct = Math.min((elapsed / SLIDE_DURATION_MS) * 100, 100);
      setProgress(pct);

      if (elapsed >= SLIDE_DURATION_MS) {
        setCurrentIndex((prev) => (prev + 1) % FEATURED_MOVIES.length);
        startTimeRef.current = Date.now();
        setProgress(0);
      }
    }, 50);

    timerRef.current = interval;
    return () => clearInterval(interval);
  }, [currentIndex, isPlaying]);

  const handleSelectMovie = (index: number) => {
    setCurrentIndex(index);
    setProgress(0);
    startTimeRef.current = Date.now();
  };

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  return (
    <section
      className="relative w-full min-h-[100svh] flex flex-col justify-between overflow-hidden bg-[#0B0A0C]"
      aria-label="Phim nổi bật đang chiếu rạp"
      aria-roledescription="carousel"
    >
      {/* 1. Backdrop Layer (Full-bleed Still + Vignette + Film Grain) */}
      <div className="absolute inset-0 z-0">
        {FEATURED_MOVIES.map((movie, idx) => (
          <div
            key={movie.id}
            className={`absolute inset-0 transition-opacity duration-1000 ease-out ${
              idx === currentIndex ? 'opacity-100 scale-100' : 'opacity-0 scale-105 pointer-events-none'
            }`}
            style={{ transitionProperty: 'opacity, transform' }}
          >
            <img
              src={movie.backdropUrl}
              alt={movie.title}
              fetchPriority={idx === 0 ? 'high' : 'low'}
              className="w-full h-full object-cover object-center filter brightness-[0.68] contrast-[1.08]"
            />
          </div>
        ))}

        {/* Cinematic Vignette Scrim */}
        <div className="absolute inset-0 cinema-vignette z-10 pointer-events-none" />
        
        {/* Subtle Film Grain Texture */}
        <div className="absolute inset-0 film-grain z-10 pointer-events-none opacity-40" />

        {/* Ambient Movie Light Glow from bottom */}
        <div
          className="absolute -bottom-24 left-1/4 w-1/2 h-96 rounded-full blur-[140px] opacity-25 pointer-events-none transition-colors duration-1000"
          style={{ backgroundColor: currentMovie.tintColor }}
        />
      </div>

      {/* Invisible live region for screen readers */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        Đang hiển thị phim: {currentMovie.title} ({currentMovie.originalTitle}), độ tuổi {currentMovie.ageRating}, thời lượng {currentMovie.durationMinutes} phút.
      </div>

      {/* 2. Main Hero Stage Content */}
      <div className="relative z-20 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-32 pb-16 flex-1 flex flex-col justify-end">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-end">
          
          {/* Cột chữ hẹp (Left Column - 7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            {/* Meta row không dùng pill: T16 · 166 phút · Thể loại */}
            <div className="flex items-center flex-wrap gap-2 text-xs sm:text-sm font-medium text-[#A39E96]">
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold tracking-wider bg-[#FFB23E]/15 text-[#FFB23E] border border-[#FFB23E]/30">
                {currentMovie.ageRating}
              </span>
              <span>·</span>
              <span>{currentMovie.durationMinutes} phút</span>
              <span>·</span>
              <span className="text-[#F3EEE6]">{currentMovie.genres.join(' / ')}</span>
              <span>·</span>
              <span className="text-[#FFB23E] font-semibold">{currentMovie.formats[0]}</span>
            </div>

            {/* Tên phim chữ lớn in hoa */}
            <h1 className="font-['Barlow_Condensed'] text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black text-[#F3EEE6] tracking-tight uppercase leading-[0.92] drop-shadow-md">
              {currentMovie.title}
            </h1>

            {/* Tên gốc tiếng Anh */}
            <p className="text-sm font-semibold tracking-wider text-[#A39E96] uppercase">
              {currentMovie.originalTitle} — Đạo diễn: {currentMovie.director}
            </p>

            {/* Một câu mô tả duy nhất */}
            <p className="text-sm sm:text-base text-[#F3EEE6]/90 line-clamp-2 max-w-xl font-normal leading-relaxed pt-1">
              {currentMovie.description}
            </p>

            {/* Cụm Action: Nút tem vé + Nút Trailer */}
            <div className="pt-3 flex items-center flex-wrap gap-4">
              {/* Nút tem vé răng cưa có hiệu ứng glow hổ phách */}
              <a
                href="#booking"
                className="group relative inline-flex items-center gap-3 px-6 py-3.5 bg-[#FFB23E] hover:bg-[#FFA21A] text-[#0B0A0C] font-['Barlow_Condensed'] text-lg font-bold tracking-wider uppercase transition-all duration-300 shadow-xl shadow-[#FFB23E]/25 hover:shadow-[#FFB23E]/40 hover:-translate-y-0.5 active:translate-y-0 min-h-[48px] rounded-sm"
              >
                <Ticket className="w-5 h-5 text-[#0B0A0C] group-hover:rotate-12 transition-transform duration-300" />
                <span>ĐẶT VÉ NGAY</span>
                <ChevronRight className="w-4 h-4 text-[#0B0A0C] group-hover:translate-x-1 transition-transform" />
              </a>

              {/* Nút xem trailer phụ */}
              <button
                type="button"
                className="inline-flex items-center gap-2.5 px-5 py-3.5 rounded-sm bg-[#151318]/70 hover:bg-[#221F28] text-[#F3EEE6] border border-[#2A2631] text-xs font-semibold tracking-wide uppercase transition-all duration-300 hover:border-[#FFB23E]/50 min-h-[48px]"
              >
                <div className="w-6 h-6 rounded-full bg-[#FFB23E]/20 flex items-center justify-center text-[#FFB23E]">
                  <Play className="w-3 h-3 fill-current ml-0.5" />
                </div>
                <span>Xem Trailer</span>
              </button>

              {/* Nút Pause/Play tiến trình slide */}
              <button
                type="button"
                onClick={togglePlayPause}
                className="p-2.5 rounded-full text-[#A39E96] hover:text-[#F3EEE6] hover:bg-[#151318] border border-transparent hover:border-[#2A2631] transition-all min-w-[44px] min-h-[44px] flex items-center justify-center"
                aria-label={isPlaying ? 'Tạm dừng chuyển slide tự động' : 'Tiếp tục tự động chuyển slide'}
                title={isPlaying ? 'Tạm dừng' : 'Tiếp tục'}
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
              </button>
            </div>
          </div>

          {/* Poster Rail bên phải (Right Column - 5 cols) */}
          <div className="lg:col-span-5 flex flex-col items-end">
            <div className="w-full flex items-center justify-between pb-2 text-xs text-[#A39E96]">
              <span className="font-semibold tracking-wider uppercase flex items-center gap-1.5 text-[#F3EEE6]">
                <Sparkles className="w-3.5 h-3.5 text-[#FFB23E]" />
                Phim tâm điểm
              </span>
              <span className="font-mono text-[11px] text-[#A39E96]">
                0{currentIndex + 1} / 0{FEATURED_MOVIES.length}
              </span>
            </div>

            {/* Thanh danh sách poster trượt ngang */}
            <div className="w-full grid grid-cols-5 gap-2.5 sm:gap-3">
              {FEATURED_MOVIES.map((movie, idx) => {
                const isActive = idx === currentIndex;
                return (
                  <button
                    key={movie.id}
                    type="button"
                    onClick={() => handleSelectMovie(idx)}
                    className={`relative rounded-md overflow-hidden transition-all duration-300 group focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FFB23E] ${
                      isActive
                        ? 'ring-2 ring-[#FFB23E] scale-105 shadow-xl shadow-[#FFB23E]/20'
                        : 'opacity-55 hover:opacity-90 hover:scale-100'
                    }`}
                    style={{ aspectRatio: '2/3' }}
                    aria-label={`Chọn phim ${movie.title}`}
                  >
                    <img
                      src={movie.posterUrl}
                      alt={movie.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />

                    {/* Lớp phủ tối */}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0B0A0C]/90 via-transparent to-transparent" />

                    {/* Progress Bar khi phim đang Active */}
                    {isActive && (
                      <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#151318]">
                        <div
                          className="h-full bg-[#FFB23E] transition-all duration-75 ease-linear"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    )}

                    {/* Nhãn tuổi nhỏ ở góc */}
                    <span className="absolute top-1 left-1 px-1 py-0.2 bg-[#0B0A0C]/80 text-[#FFB23E] text-[9px] font-bold rounded">
                      {movie.ageRating}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Booking Dock: Thanh đặt vé nhanh đồng bộ slide */}
      <div id="booking" className="relative z-30 w-full bg-[#151318]/95 backdrop-blur-lg border-t border-[#2A2631] py-4 shadow-2xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              alert(`Chuyển đến chọn suất chiếu cho phim: ${currentMovie.title}`);
            }}
            className="grid grid-cols-2 md:grid-cols-5 gap-3 items-center"
          >
            {/* 1. Chọn Rạp */}
            <div className="flex flex-col">
              <label htmlFor="cinema-select" className="text-[10px] font-bold tracking-wider uppercase text-[#A39E96] mb-1 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-[#FFB23E]" />
                1. Chọn Rạp
              </label>
              <select
                id="cinema-select"
                defaultValue="cinex-cau-giay"
                className="w-full bg-[#0B0A0C] border border-[#2A2631] text-[#F3EEE6] text-xs font-medium rounded-lg px-3 py-2.5 focus:border-[#FFB23E] focus:outline-none min-h-[44px]"
              >
                <option value="cinex-cau-giay">CineX Cầu Giấy (Hà Nội)</option>
                <option value="cinex-ba-trieu">CineX Bà Triệu (Hà Nội)</option>
                <option value="cinex-landmark">CineX Landmark 81 (TP.HCM)</option>
                <option value="cinex-dong-khoi">CineX Đồng Khởi (TP.HCM)</option>
              </select>
            </div>

            {/* 2. Chọn Phim (Tự động đồng bộ với slide) */}
            <div className="flex flex-col">
              <label htmlFor="movie-select" className="text-[10px] font-bold tracking-wider uppercase text-[#A39E96] mb-1 flex items-center gap-1">
                <Film className="w-3 h-3 text-[#FFB23E]" />
                2. Chọn Phim
              </label>
              <select
                id="movie-select"
                value={currentMovie.id}
                onChange={(e) => {
                  const targetIndex = FEATURED_MOVIES.findIndex((m) => m.id === e.target.value);
                  if (targetIndex !== -1) handleSelectMovie(targetIndex);
                }}
                className="w-full bg-[#0B0A0C] border border-[#2A2631] text-[#F3EEE6] text-xs font-semibold rounded-lg px-3 py-2.5 focus:border-[#FFB23E] focus:outline-none min-h-[44px]"
              >
                {FEATURED_MOVIES.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.title}
                  </option>
                ))}
              </select>
            </div>

            {/* 3. Chọn Ngày */}
            <div className="flex flex-col">
              <label htmlFor="date-select" className="text-[10px] font-bold tracking-wider uppercase text-[#A39E96] mb-1 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-[#FFB23E]" />
                3. Chọn Ngày
              </label>
              <select
                id="date-select"
                defaultValue="today"
                className="w-full bg-[#0B0A0C] border border-[#2A2631] text-[#F3EEE6] text-xs font-medium rounded-lg px-3 py-2.5 focus:border-[#FFB23E] focus:outline-none min-h-[44px]"
              >
                <option value="today">Hôm nay (03/10)</option>
                <option value="tomorrow">Ngày mai (04/10)</option>
                <option value="day-after">Chủ nhật (05/10)</option>
              </select>
            </div>

            {/* 4. Chọn Suất */}
            <div className="flex flex-col">
              <label htmlFor="showtime-select" className="text-[10px] font-bold tracking-wider uppercase text-[#A39E96] mb-1 flex items-center gap-1">
                <Clock className="w-3 h-3 text-[#FFB23E]" />
                4. Chọn Suất
              </label>
              <select
                id="showtime-select"
                defaultValue="1930"
                className="w-full bg-[#0B0A0C] border border-[#2A2631] text-[#F3EEE6] text-xs font-medium rounded-lg px-3 py-2.5 focus:border-[#FFB23E] focus:outline-none min-h-[44px]"
              >
                <option value="1730">17:30 (2D Phụ đề)</option>
                <option value="1930">19:30 (IMAX 2D - Còn ghế)</option>
                <option value="2045">20:45 (2D Lồng tiếng)</option>
                <option value="2215">22:15 (2D Phụ đề)</option>
              </select>
            </div>

            {/* 5. Nút MUA VÉ */}
            <div className="col-span-2 md:col-span-1 flex flex-col justify-end">
              <button
                type="submit"
                className="w-full h-[44px] bg-[#FFB23E] hover:bg-[#FFA21A] text-[#0B0A0C] font-['Barlow_Condensed'] text-base font-extrabold tracking-wider uppercase rounded-lg shadow-lg shadow-[#FFB23E]/20 transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2"
              >
                <Ticket className="w-4 h-4 stroke-[2.5]" />
                <span>MUA VÉ NGAY</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
};
