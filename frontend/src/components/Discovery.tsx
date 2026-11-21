import { type PointerEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Compass,
  Film,
  MapPin,
  Pause,
  Play,
  RefreshCw,
  Search,
  Sparkles,
  Ticket,
  Video,
} from 'lucide-react';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { api, type ApiCinema, type ApiMovie, type ApiShowtime } from '../services/api';
import { parseTrailerUrl } from '../utils/trailer';
import TrailerModal from './TrailerModal';

const PAGE_SIZE = 10;
const focus = 'focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#E11D48]';
const vietnamTime = new Intl.DateTimeFormat('vi-VN', {
  timeZone: 'Asia/Ho_Chi_Minh',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

function vietnamDays() {
  // Vietnam is UTC+7 throughout the year; use UTC arithmetic to avoid the device's calendar.
  const local = new Date(Date.now() + 7 * 60 * 60 * 1000);
  const start = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate());
  return Array.from({ length: 7 }, (_, index) =>
    new Date(start + index * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
  );
}

function message(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function ageRatingBadgeClass(rating: string): string {
  switch (rating) {
    case 'T18':
      return 'bg-rose-600/25 text-rose-200 border-rose-500/40';
    case 'T16':
      return 'bg-amber-500/20 text-amber-200 border-amber-500/40';
    case 'T13':
      return 'bg-sky-500/20 text-sky-200 border-sky-500/40';
    case 'K':
      return 'bg-purple-500/20 text-purple-200 border-purple-500/40';
    default:
      return 'bg-emerald-500/20 text-emerald-200 border-emerald-500/40';
  }
}

export function Discovery({
  onSelectShowtime,
}: {
  onSelectShowtime: (showtimeId: string) => void;
}) {
  const prefersReducedMotion = useReducedMotion();

  const [status, setStatus] = useState('NOW_SHOWING');
  const [searchText, setSearchText] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [movies, setMovies] = useState<ApiMovie[]>([]);
  const [total, setTotal] = useState(0);
  const [moviesLoading, setMoviesLoading] = useState(true);
  const [moviesError, setMoviesError] = useState('');
  const [moviesRetry, setMoviesRetry] = useState(0);
  const [selectedMovie, setSelectedMovie] = useState<ApiMovie | null>(null);
  const [cinemas, setCinemas] = useState<ApiCinema[]>([]);
  const [cinemasLoading, setCinemasLoading] = useState(true);
  const [cinemasError, setCinemasError] = useState('');
  const [cinemasRetry, setCinemasRetry] = useState(0);
  const [cinemaId, setCinemaId] = useState('');
  const [days] = useState(vietnamDays);
  const [date, setDate] = useState(days[0]);
  const [showtimes, setShowtimes] = useState<ApiShowtime[]>([]);
  const [showtimesLoading, setShowtimesLoading] = useState(false);
  const [showtimesError, setShowtimesError] = useState('');
  const [showtimesRetry, setShowtimesRetry] = useState(0);

  // Hero Spotlight Carousel & Trailer Modal state
  const [spotlightIndex, setSpotlightIndex] = useState(0);
  const [isCarouselPaused, setIsCarouselPaused] = useState(false);
  const [isHeroHovered, setIsHeroHovered] = useState(false);
  const [isHeroFocused, setIsHeroFocused] = useState(false);
  const [trailerMovie, setTrailerMovie] = useState<ApiMovie | null>(null);
  const [brokenPosters, setBrokenPosters] = useState<Record<string, boolean>>({});
  const heroTiltRef = useRef<HTMLDivElement | null>(null);

  const markPosterBroken = useCallback((movieId: string) => {
    setBrokenPosters((prev) => (prev[movieId] ? prev : { ...prev, [movieId]: true }));
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    let current = true;
    api
      .getMovies(status, { search, page, limit: PAGE_SIZE, signal: controller.signal })
      .then((result) => {
        if (current) {
          setMovies(result.data);
          setTotal(result.total);
          setSpotlightIndex(0);
        }
      })
      .catch((error: unknown) => {
        if (current) setMoviesError(message(error, 'Không thể tải danh sách phim'));
      })
      .finally(() => {
        if (current) setMoviesLoading(false);
      });
    return () => {
      current = false;
      controller.abort();
    };
  }, [status, search, page, moviesRetry]);

  useEffect(() => {
    const controller = new AbortController();
    let current = true;
    api
      .getCinemas(undefined, controller.signal)
      .then((result) => {
        if (current) setCinemas(result);
      })
      .catch((error: unknown) => {
        if (current) setCinemasError(message(error, 'Không thể tải danh sách rạp'));
      })
      .finally(() => {
        if (current) setCinemasLoading(false);
      });
    return () => {
      current = false;
      controller.abort();
    };
  }, [cinemasRetry]);

  useEffect(() => {
    if (!selectedMovie || selectedMovie.status !== 'NOW_SHOWING' || !cinemaId) return;
    const controller = new AbortController();
    let current = true;
    api
      .getShowtimes({ movieId: selectedMovie.id, cinemaId, date }, controller.signal)
      .then((result) => {
        if (current) {
          setShowtimes(
            result.filter(
              (item) =>
                item.movieId === selectedMovie.id &&
                item.cinemaId === cinemaId &&
                item.status === 'OPEN',
            ),
          );
        }
      })
      .catch((error: unknown) => {
        if (current) setShowtimesError(message(error, 'Không thể tải lịch chiếu'));
      })
      .finally(() => {
        if (current) setShowtimesLoading(false);
      });
    return () => {
      current = false;
      controller.abort();
    };
  }, [selectedMovie, cinemaId, date, showtimesRetry]);

  // Auto-advance spotlight carousel when allowed by accessibility & motion rules
  useEffect(() => {
    if (
      prefersReducedMotion ||
      isCarouselPaused ||
      isHeroHovered ||
      isHeroFocused ||
      Boolean(trailerMovie) ||
      Boolean(selectedMovie) ||
      movies.length <= 1
    ) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setSpotlightIndex((prev) => (prev + 1) % movies.length);
    }, 7000);

    return () => window.clearInterval(timer);
  }, [
    prefersReducedMotion,
    isCarouselPaused,
    isHeroHovered,
    isHeroFocused,
    trailerMovie,
    selectedMovie,
    movies.length,
  ]);

  function clearSchedule() {
    setShowtimes([]);
    setShowtimesError('');
    setShowtimesLoading(false);
  }

  function chooseMovie(movie: ApiMovie) {
    setSelectedMovie(movie);
    setCinemaId('');
    setDate(days[0]);
    clearSchedule();
  }

  function clearSelection() {
    setSelectedMovie(null);
    setCinemaId('');
    setDate(days[0]);
    clearSchedule();
  }

  function beginCatalogueLoad() {
    setMoviesLoading(true);
    setMoviesError('');
    setMovies([]);
    clearSelection();
  }

  function beginScheduleLoad() {
    setShowtimes([]);
    setShowtimesError('');
    setShowtimesLoading(true);
  }

  const featured = selectedMovie || movies[spotlightIndex] || movies[0];
  const featuredTrailer = useMemo(
    () => parseTrailerUrl(featured?.trailerUrl),
    [featured?.trailerUrl],
  );
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const selectedCinema = cinemas.find((cinema) => cinema.id === cinemaId);

  const handleHeroPosterPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (prefersReducedMotion || !heroTiltRef.current) return;
    const rect = heroTiltRef.current.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    heroTiltRef.current.style.transform = `perspective(900px) rotateX(${(-y * 7).toFixed(2)}deg) rotateY(${(x * 9).toFixed(2)}deg)`;
  };

  const handleHeroPosterPointerLeave = () => {
    if (!heroTiltRef.current) return;
    heroTiltRef.current.style.transform = 'perspective(900px) rotateX(0deg) rotateY(0deg)';
  };

  const handleCardSpotlightMove = (event: PointerEvent<HTMLElement>) => {
    if (prefersReducedMotion) return;
    const rect = event.currentTarget.getBoundingClientRect();
    event.currentTarget.style.setProperty('--spot-x', `${Math.round(event.clientX - rect.left)}px`);
    event.currentTarget.style.setProperty('--spot-y', `${Math.round(event.clientY - rect.top)}px`);
  };

  return (
    <section aria-label="Khám phá phim" className="bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]">
      {/* SCENE 1: SIGNATURE PREMIERE HERO STAGE */}
      <section
        id="hero-spotlight"
        aria-roledescription="carousel"
        aria-label="Phim tiêu điểm tại CineX"
        onMouseEnter={() => setIsHeroHovered(true)}
        onMouseLeave={() => setIsHeroHovered(false)}
        onFocusCapture={() => setIsHeroFocused(true)}
        onBlurCapture={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
            setIsHeroFocused(false);
          }
        }}
        className="projector-stage relative overflow-hidden min-h-[540px] pt-28 pb-14 sm:pt-36 sm:pb-20 border-b border-white/10"
      >
        <div className="projector-beam absolute inset-0 z-0" aria-hidden="true" />

        {(featured?.bannerUrl || (featured?.posterUrl && !brokenPosters[featured.id])) && (
          <img
            src={featured.bannerUrl || featured.posterUrl}
            alt=""
            aria-hidden="true"
            fetchPriority="high"
            className="absolute inset-0 w-full h-full object-cover opacity-25 scale-105 blur-[1px] pointer-events-none select-none"
          />
        )}
        <div className="absolute inset-0 cinema-vignette pointer-events-none" aria-hidden="true" />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col lg:flex-row lg:items-end justify-between gap-10">
          <div className="max-w-2xl flex-1 pt-6 space-y-5">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--color-accent-cta)] text-white text-xs font-bold uppercase tracking-wider shadow-sm shadow-rose-600/30">
                <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
                Một buổi chiếu dành cho bạn
              </span>
              {featured && (
                <>
                  <span
                    className={`border px-2.5 py-1 rounded-full text-xs font-extrabold tabular-nums ${ageRatingBadgeClass(
                      featured.ageRating,
                    )}`}
                  >
                    {featured.ageRating}
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/10 text-xs font-semibold text-zinc-100 tabular-nums">
                    <Clock size={14} aria-hidden="true" className="text-amber-400" />
                    {featured.durationMin} phút
                  </span>
                </>
              )}
            </div>

            <h1 className="vn-display-safe font-extrabold text-4xl sm:text-6xl lg:text-7xl uppercase tracking-wide text-white">
              {featured?.title || 'Hẹn gặp bạn tại CineX'}
            </h1>

            {featured ? (
              <>
                {featured.genres && featured.genres.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-200">
                    {featured.genres.map((genre) => (
                      <span
                        key={genre.id}
                        className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 font-medium"
                      >
                        {genre.name}
                      </span>
                    ))}
                  </div>
                )}

                <p className="max-w-xl text-sm sm:text-base leading-relaxed text-[var(--color-text-secondary)] line-clamp-3">
                  {featured.description}
                </p>

                <div className="flex flex-wrap items-center gap-3.5 pt-2">
                  <a
                    href="#booking-dock"
                    onClick={() => chooseMovie(featured)}
                    className={`ticket-notch-btn inline-flex items-center gap-2.5 px-7 py-3.5 bg-[var(--color-accent-cta)] hover:bg-[var(--color-accent-cta-hover)] text-white font-bold text-sm min-h-[48px] transition-colors shadow-lg shadow-rose-600/25 ${focus}`}
                  >
                    <Ticket size={18} aria-hidden="true" />
                    {featured.status === 'NOW_SHOWING'
                      ? 'Chọn rạp và suất chiếu'
                      : 'Xem phim sắp chiếu'}
                  </a>

                  {featuredTrailer && (
                    <button
                      type="button"
                      onClick={() => setTrailerMovie(featured)}
                      aria-label={`Xem trailer phim ${featured.title}`}
                      className={`inline-flex items-center gap-2 px-5 py-3.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white font-semibold text-sm min-h-[48px] transition-colors cursor-pointer ${focus}`}
                    >
                      <Play size={16} className="fill-current text-amber-400" aria-hidden="true" />
                      <span>Xem Trailer</span>
                    </button>
                  )}
                </div>

                {/* WAI-ARIA Spotlight Carousel Controls when multiple movies exist */}
                {movies.length > 1 && (
                  <div
                    role="group"
                    aria-label="Điều khiển chuyển phim tiêu điểm"
                    className="flex flex-wrap items-center gap-2.5 pt-4 border-t border-white/10"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        clearSelection();
                        setSpotlightIndex((prev) => (prev - 1 + movies.length) % movies.length);
                      }}
                      aria-label="Phim tiêu điểm trước"
                      className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-zinc-900/80 text-zinc-200 hover:border-white/30 hover:text-white transition-colors cursor-pointer ${focus}`}
                    >
                      <ChevronLeft className="w-4 h-4" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        clearSelection();
                        setSpotlightIndex((prev) => (prev + 1) % movies.length);
                      }}
                      aria-label="Phim tiêu điểm tiếp theo"
                      className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-zinc-900/80 text-zinc-200 hover:border-white/30 hover:text-white transition-colors cursor-pointer ${focus}`}
                    >
                      <ChevronRight className="w-4 h-4" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsCarouselPaused((prev) => !prev)}
                      aria-pressed={isCarouselPaused}
                      aria-label={
                        isCarouselPaused ? 'Tiếp tục tự chuyển phim' : 'Tạm dừng tự chuyển phim'
                      }
                      className={`inline-flex h-9 items-center gap-1.5 px-3 rounded-lg border border-white/10 bg-zinc-900/80 text-xs font-semibold text-zinc-300 hover:border-white/30 hover:text-white transition-colors cursor-pointer ${focus}`}
                    >
                      {isCarouselPaused ? (
                        <>
                          <Play className="w-3.5 h-3.5 text-amber-400" aria-hidden="true" />
                          <span>Tiếp tục</span>
                        </>
                      ) : (
                        <>
                          <Pause className="w-3.5 h-3.5 text-zinc-400" aria-hidden="true" />
                          <span>Tạm dừng</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </>
            ) : (
              <p className="mt-4 text-[var(--color-text-secondary)] text-base max-w-xl">
                Khám phá lịch chiếu theo giờ Việt Nam, chọn vị trí ghế yêu thích với cơ chế giữ chỗ
                thời gian thực 10 phút và nhận vé QR tức thì.
              </p>
            )}
          </div>

          {featured?.posterUrl && !brokenPosters[featured.id] && (
            <div
              ref={heroTiltRef}
              onPointerMove={handleHeroPosterPointerMove}
              onPointerLeave={handleHeroPosterPointerLeave}
              style={{ transition: 'transform 220ms cubic-bezier(0.22, 1, 0.36, 1)' }}
              className="hidden md:block shrink-0"
            >
              <img
                src={featured.posterUrl}
                alt={`Poster tiêu điểm phim ${featured.title}`}
                onError={() => markPosterBroken(featured.id)}
                className="w-52 lg:w-64 rounded-2xl border border-white/15 shadow-2xl aspect-[2/3] object-cover"
              />
            </div>
          )}
        </div>
      </section>

      {/* SCENE 2: MOVIE CATALOGUE & TICKET-STUB BOOKING DOCK */}
      <section
        id="movies"
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 scroll-mt-24"
        aria-labelledby="movie-heading"
      >
        <div className="flex flex-wrap items-end justify-between gap-6 mb-8">
          <div>
            <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-[var(--color-accent-cta)] mb-1.5">
              <Compass className="w-3.5 h-3.5" aria-hidden="true" />
              Danh Mục Phim &amp; Đặt Vé Trực Tuyến
            </span>
            <h2
              id="movie-heading"
              className="vn-display-safe text-4xl sm:text-5xl font-extrabold uppercase text-white"
            >
              Phim tại CineX
            </h2>
          </div>

          <div
            className="flex gap-1 bg-[var(--color-bg-secondary)] p-1 border border-white/10 rounded-xl"
            aria-label="Trạng thái phim"
          >
            {[
              ['NOW_SHOWING', 'Đang chiếu'],
              ['COMING_SOON', 'Sắp chiếu'],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                aria-pressed={status === value}
                onClick={() => {
                  if (status !== value) {
                    setStatus(value);
                    setPage(1);
                    beginCatalogueLoad();
                  }
                }}
                className={`px-5 py-2.5 rounded-lg text-sm font-bold min-h-[44px] transition-colors cursor-pointer ${focus} ${
                  status === value
                    ? 'bg-[var(--color-accent-cta)] text-white shadow-sm'
                    : 'text-[var(--color-text-secondary)] hover:text-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Search Bar */}
        <form
          role="search"
          onSubmit={(event) => {
            event.preventDefault();
            setSearch(searchText.trim());
            setPage(1);
            setMoviesRetry((value) => value + 1);
            beginCatalogueLoad();
          }}
          className="flex flex-col sm:flex-row gap-3 mb-8"
        >
          <label className="flex items-center gap-3 border border-white/12 bg-[var(--color-bg-secondary)] rounded-xl px-4 flex-1 focus-within:border-[var(--color-accent-cta)]">
            <Search className="text-[var(--color-text-muted)] shrink-0" size={19} aria-hidden="true" />
            <span className="sr-only">Tên phim</span>
            <input
              id="discovery-search"
              type="search"
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              placeholder="Tìm phim bạn muốn xem..."
              className="bg-transparent py-3 w-full text-sm text-white placeholder:text-[var(--color-text-muted)] outline-none min-h-[44px]"
            />
          </label>
          <button
            type="submit"
            className={`px-6 py-3 bg-zinc-900 hover:bg-zinc-800 border border-white/12 rounded-xl text-sm font-bold text-white transition-colors cursor-pointer min-h-[44px] ${focus}`}
          >
            Tìm phim
          </button>
        </form>

        {/* Catalogue States */}
        {moviesLoading && (
          <p role="status" className="py-10 text-[var(--color-text-secondary)]">
            Đang tải danh sách phim…
          </p>
        )}

        {moviesError && (
          <div
            role="alert"
            className="py-6 px-6 rounded-2xl border border-rose-500/30 bg-rose-950/30 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
            <p className="font-semibold">{moviesError}</p>
            <button
              type="button"
              onClick={() => {
                setMoviesRetry((value) => value + 1);
                beginCatalogueLoad();
              }}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold cursor-pointer self-start ${focus}`}
            >
              <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
              Thử tải lại danh sách phim
            </button>
          </div>
        )}

        {!moviesLoading && !moviesError && movies.length === 0 && (
          <p className="py-10 text-[var(--color-text-secondary)]">Không tìm thấy phim phù hợp.</p>
        )}

        {/* Movie Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-6">
          {movies.map((movie) => {
            const isSelected = selectedMovie?.id === movie.id;
            const hasValidPoster = Boolean(movie.posterUrl && !brokenPosters[movie.id]);
            const trailer = parseTrailerUrl(movie.trailerUrl);

            return (
              <div
                key={movie.id}
                onPointerMove={handleCardSpotlightMove}
                className={`card-spotlight rounded-2xl overflow-hidden border transition-all flex flex-col justify-between bg-[var(--color-bg-secondary)] ${
                  isSelected
                    ? 'border-[var(--color-accent-cta)] ring-2 ring-[var(--color-accent-cta)]/35 shadow-xl shadow-rose-950/30'
                    : 'border-white/10 hover:border-white/25'
                }`}
              >
                <button
                  type="button"
                  aria-label={`Chọn phim ${movie.title}`}
                  aria-pressed={isSelected}
                  onClick={() => chooseMovie(movie)}
                  className={`group text-left w-full flex-1 flex flex-col cursor-pointer ${focus}`}
                >
                  <div className="relative aspect-[2/3] w-full bg-zinc-900 overflow-hidden">
                    {hasValidPoster ? (
                      <img
                        src={movie.posterUrl}
                        alt={`Poster phim ${movie.title}`}
                        loading="lazy"
                        onError={() => markPosterBroken(movie.id)}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col justify-between p-4 bg-gradient-to-br from-zinc-900 via-zinc-950 to-rose-950/40">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-muted)]">
                          CineX Archive
                        </span>
                        <Film aria-hidden="true" className="w-10 h-10 text-[var(--color-accent-cta)]" />
                        <span className="text-xs text-[var(--color-text-secondary)] tabular-nums">
                          {movie.durationMin} phút
                        </span>
                      </div>
                    )}

                    <span
                      className={`absolute top-3 left-3 text-xs font-extrabold border rounded-md px-2 py-0.5 tabular-nums backdrop-blur-sm ${ageRatingBadgeClass(
                        movie.ageRating,
                      )}`}
                    >
                      {movie.ageRating}
                    </span>

                    {isSelected && (
                      <span className="absolute top-3 right-3 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[var(--color-accent-cta)] text-white text-[10px] font-bold shadow">
                        <CheckCircle2 className="w-3 h-3" aria-hidden="true" />
                        Đang chọn
                      </span>
                    )}
                  </div>

                  <div className="p-3.5 sm:p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <p className="text-xs text-[var(--color-text-secondary)] mb-1.5 tabular-nums">
                        {movie.durationMin} phút
                      </p>
                      <h3 className="vn-display-safe text-xl sm:text-2xl font-bold leading-snug text-white group-hover:text-amber-300 transition-colors">
                        {movie.title}
                      </h3>
                      <p className="text-xs text-[var(--color-text-muted)] mt-1.5 line-clamp-1">
                        {movie.genres.map((genre) => genre.name).join(', ') || movie.originalTitle}
                      </p>
                    </div>

                    <span className="block text-xs sm:text-sm font-bold text-amber-300 mt-4">
                      {movie.status === 'NOW_SHOWING' ? 'Xem lịch chiếu →' : 'Thông tin phim →'}
                    </span>
                  </div>
                </button>

                {trailer && (
                  <div className="px-3.5 py-2 border-t border-white/10 bg-zinc-950/60 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setTrailerMovie(movie)}
                      aria-label={`Mở trailer ${movie.title}`}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-300 hover:text-amber-300 transition-colors cursor-pointer py-0.5"
                    >
                      <Video className="w-3.5 h-3.5 text-[var(--color-accent-cta)]" aria-hidden="true" />
                      <span>Trailer</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Pagination */}
        {!moviesLoading && !moviesError && total > PAGE_SIZE && (
          <nav
            aria-label="Phân trang phim"
            className="flex items-center justify-center gap-5 mt-8 text-sm tabular-nums"
          >
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => {
                setPage((value) => value - 1);
                beginCatalogueLoad();
              }}
              className={`border border-white/15 bg-[var(--color-bg-secondary)] rounded-xl px-4 py-2.5 font-semibold disabled:opacity-40 cursor-pointer min-h-[44px] ${focus}`}
            >
              Trang trước
            </button>
            <span>
              Trang {page} / {pageCount}
            </span>
            <button
              type="button"
              disabled={page >= pageCount}
              onClick={() => {
                setPage((value) => value + 1);
                beginCatalogueLoad();
              }}
              className={`border border-white/15 bg-[var(--color-bg-secondary)] rounded-xl px-4 py-2.5 font-semibold disabled:opacity-40 cursor-pointer min-h-[44px] ${focus}`}
            >
              Trang sau
            </button>
          </nav>
        )}

        {/* BOOKING DOCK (#booking-dock) */}
        <div id="booking-dock" className="scroll-mt-24">
          {selectedMovie ? (
            <section
              aria-labelledby="schedule-heading"
              className="mt-12 rounded-3xl border border-white/15 bg-[var(--color-bg-secondary)] p-6 sm:p-8 shadow-2xl"
            >
              <div className="ticket-perforation pb-5 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-bold uppercase tracking-widest text-amber-400 block mb-1">
                    Quầy Đặt Vé Trực Tuyến • Giữ Ghế 10 Phút
                  </span>
                  <h2
                    id="schedule-heading"
                    className="vn-display-safe text-3xl sm:text-4xl font-extrabold text-white"
                  >
                    Lịch chiếu: {selectedMovie.title}
                  </h2>
                </div>
                <span className="px-3 py-1.5 rounded-xl bg-zinc-950 border border-white/10 text-xs font-semibold text-[var(--color-text-secondary)] tabular-nums self-start">
                  {selectedMovie.ageRating} • {selectedMovie.durationMin} phút
                </span>
              </div>

              {selectedMovie.status !== 'NOW_SHOWING' ? (
                <p className="mt-4 text-[var(--color-text-secondary)]">
                  Phim sắp chiếu. Lịch chiếu sẽ được cập nhật khi rạp mở bán.
                </p>
              ) : (
                <>
                  <div className="mt-4 max-w-lg">
                    <label
                      htmlFor="discovery-cinema"
                      className="flex gap-2 items-center text-sm font-bold text-white mb-2"
                    >
                      <MapPin size={17} aria-hidden="true" className="text-[var(--color-accent-cta)]" />
                      Rạp chiếu
                    </label>
                    <select
                      id="discovery-cinema"
                      value={cinemaId}
                      disabled={cinemasLoading || !!cinemasError}
                      onChange={(event) => {
                        const nextCinema = event.target.value;
                        if (cinemaId === nextCinema) return;
                        setCinemaId(nextCinema);
                        if (nextCinema) beginScheduleLoad();
                        else clearSchedule();
                      }}
                      className={`w-full bg-zinc-950 border border-white/15 rounded-xl px-4 py-3 text-sm font-semibold text-white disabled:opacity-50 min-h-[44px] ${focus}`}
                    >
                      <option value="">Chọn rạp chiếu</option>
                      {cinemas.map((cinema) => (
                        <option key={cinema.id} value={cinema.id}>
                          {cinema.name} — {cinema.city}
                        </option>
                      ))}
                    </select>
                    {cinemasLoading && (
                      <p role="status" className="mt-2 text-sm text-[var(--color-text-secondary)]">
                        Đang tải danh sách rạp…
                      </p>
                    )}
                    {cinemasError && (
                      <div role="alert" className="mt-3 text-sm">
                        <p>{cinemasError}</p>
                        <button
                          type="button"
                          onClick={() => {
                            setCinemasRetry((value) => value + 1);
                            setCinemasLoading(true);
                            setCinemasError('');
                          }}
                          className={`mt-2 text-amber-300 underline py-2 ${focus}`}
                        >
                          Thử tải lại danh sách rạp
                        </button>
                      </div>
                    )}
                    {!cinemasLoading && !cinemasError && cinemas.length === 0 && (
                      <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
                        Chưa có rạp đang mở bán.
                      </p>
                    )}
                    {selectedCinema && (
                      <p className="text-xs text-[var(--color-text-secondary)] mt-2">
                        {selectedCinema.address}
                      </p>
                    )}
                  </div>

                  {/* 7-Day Vietnam Calendar Selector */}
                  <div
                    role="group"
                    aria-label="Ngày chiếu"
                    className="flex flex-wrap gap-2.5 mt-6 tabular-nums"
                  >
                    {days.map((day, index) => (
                      <button
                        type="button"
                        key={day}
                        aria-pressed={date === day}
                        onClick={() => {
                          if (date === day) return;
                          setDate(day);
                          if (cinemaId) beginScheduleLoad();
                          else clearSchedule();
                        }}
                        className={`min-w-[88px] px-3.5 py-3 border rounded-xl text-sm transition-colors cursor-pointer ${focus} ${
                          date === day
                            ? 'border-[var(--color-accent-cta)] text-white bg-[var(--color-accent-cta)] font-bold shadow-md shadow-rose-600/20'
                            : 'border-white/10 bg-zinc-950/80 text-[var(--color-text-secondary)] hover:text-white hover:border-white/25'
                        }`}
                      >
                        <span className="block text-xs mb-1">
                          {index === 0
                            ? 'Hôm nay'
                            : new Intl.DateTimeFormat('vi-VN', {
                                weekday: 'short',
                                timeZone: 'UTC',
                              }).format(new Date(`${day}T00:00:00Z`))}
                        </span>
                        <span className="font-semibold">
                          {day.slice(8, 10)}/{day.slice(5, 7)}
                        </span>
                      </button>
                    ))}
                  </div>

                  {/* Showtimes Ticket-Stub Region */}
                  <section
                    aria-label="Suất chiếu"
                    aria-busy={showtimesLoading}
                    className="mt-6 min-h-24"
                  >
                    {!cinemaId && (
                      <p className="text-[var(--color-text-secondary)]">
                        Chọn rạp để xem suất chiếu.
                      </p>
                    )}
                    {cinemaId && showtimesLoading && (
                      <p role="status" className="text-[var(--color-text-secondary)]">
                        Đang tải suất chiếu…
                      </p>
                    )}
                    {cinemaId && showtimesError && (
                      <div role="alert" className="rounded-xl border border-rose-500/30 bg-rose-950/30 p-4">
                        <p>{showtimesError}</p>
                        <button
                          type="button"
                          onClick={() => {
                            setShowtimesRetry((value) => value + 1);
                            beginScheduleLoad();
                          }}
                          className={`mt-2 py-2 text-amber-300 underline ${focus}`}
                        >
                          Thử tải lại lịch chiếu
                        </button>
                      </div>
                    )}
                    {cinemaId && !showtimesLoading && !showtimesError && showtimes.length === 0 && (
                      <p className="text-[var(--color-text-secondary)]">
                        Không có suất chiếu trong ngày này. Hãy chọn ngày hoặc rạp khác.
                      </p>
                    )}
                    <div className="flex flex-wrap gap-3.5">
                      {showtimes.map((item) => (
                        <button
                          type="button"
                          key={item.id}
                          onClick={() => onSelectShowtime(item.id)}
                          className={`ticket-stub group px-5 py-3.5 text-left border border-white/15 bg-zinc-950 hover:border-[var(--color-accent-cta)] transition-all cursor-pointer tabular-nums ${focus}`}
                        >
                          <span className="block text-xl font-extrabold text-white group-hover:text-amber-300">
                            {vietnamTime.format(new Date(item.startTime))}
                          </span>
                          <span className="block mt-1 text-xs font-semibold text-zinc-200">
                            {item.format} · {item.roomName}
                          </span>
                          <span className="block mt-1 text-xs text-[var(--color-text-muted)]">
                            {item.language}
                          </span>
                        </button>
                      ))}
                    </div>
                  </section>

                  <p className="text-xs text-[var(--color-text-muted)] flex items-center gap-2 mt-5">
                    <CalendarDays size={14} aria-hidden="true" />
                    Lịch chiếu và giờ hiển thị theo giờ Việt Nam (Asia/Ho_Chi_Minh).
                  </p>
                </>
              )}
            </section>
          ) : (
            !moviesLoading &&
            !moviesError &&
            movies.length > 0 && (
              <div className="mt-10 rounded-2xl border border-dashed border-white/15 bg-[var(--color-bg-secondary)]/70 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Ticket className="w-5 h-5 text-[var(--color-accent-cta)] shrink-0" aria-hidden="true" />
                  <p className="text-sm text-[var(--color-text-secondary)]">
                    Nhấp vào một bộ phim bất kỳ ở trên để mở quầy chọn rạp, ngày chiếu và giữ ghế
                    trực tuyến.
                  </p>
                </div>
                {featured && (
                  <button
                    type="button"
                    onClick={() => chooseMovie(featured)}
                    className={`px-4 py-2.5 rounded-xl bg-[var(--color-accent-cta)] hover:bg-[var(--color-accent-cta-hover)] text-xs font-bold text-white cursor-pointer shrink-0 ${focus}`}
                  >
                    Mở lịch chiếu {featured.title}
                  </button>
                )}
              </div>
            )
          )}
        </div>
      </section>

      {/* Trailer Facade Modal */}
      <TrailerModal
        movie={trailerMovie}
        onClose={() => setTrailerMovie(null)}
        onSelectForBooking={(movie) => chooseMovie(movie)}
      />
    </section>
  );
}

export default Discovery;
