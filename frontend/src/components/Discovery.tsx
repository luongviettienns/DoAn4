import { useEffect, useState } from 'react';
import { CalendarDays, Clock, Film, MapPin, Search, Ticket } from 'lucide-react';
import { api, type ApiCinema, type ApiMovie, type ApiShowtime } from '../services/api';

const PAGE_SIZE = 10;
const focus = 'focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#FFB23E]';
const vietnamTime = new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });

function vietnamDays() {
  // Vietnam is UTC+7 throughout the year; use UTC arithmetic to avoid the device's calendar.
  const local = new Date(Date.now() + 7 * 60 * 60 * 1000);
  const start = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate());
  return Array.from({ length: 7 }, (_, index) => new Date(start + index * 24 * 60 * 60 * 1000).toISOString().slice(0, 10));
}

function message(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function Discovery({ onSelectShowtime }: { onSelectShowtime: (showtimeId: string) => void }) {
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

  useEffect(() => {
    const controller = new AbortController();
    let current = true;
    api.getMovies(status, { search, page, limit: PAGE_SIZE, signal: controller.signal })
      .then((result) => {
        if (current) { setMovies(result.data); setTotal(result.total); }
      })
      .catch((error: unknown) => { if (current) setMoviesError(message(error, 'Không thể tải danh sách phim')); })
      .finally(() => { if (current) setMoviesLoading(false); });
    return () => { current = false; controller.abort(); };
  }, [status, search, page, moviesRetry]);

  useEffect(() => {
    const controller = new AbortController();
    let current = true;
    api.getCinemas(undefined, controller.signal)
      .then((result) => { if (current) setCinemas(result); })
      .catch((error: unknown) => { if (current) setCinemasError(message(error, 'Không thể tải danh sách rạp')); })
      .finally(() => { if (current) setCinemasLoading(false); });
    return () => { current = false; controller.abort(); };
  }, [cinemasRetry]);

  useEffect(() => {
    if (!selectedMovie || selectedMovie.status !== 'NOW_SHOWING' || !cinemaId) return;
    const controller = new AbortController();
    let current = true;
    api.getShowtimes({ movieId: selectedMovie.id, cinemaId, date }, controller.signal)
      .then((result) => {
        if (current) setShowtimes(result.filter((item) => item.movieId === selectedMovie.id && item.cinemaId === cinemaId && item.status === 'OPEN'));
      })
      .catch((error: unknown) => { if (current) setShowtimesError(message(error, 'Không thể tải lịch chiếu')); })
      .finally(() => { if (current) setShowtimesLoading(false); });
    return () => { current = false; controller.abort(); };
  }, [selectedMovie, cinemaId, date, showtimesRetry]);

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

  const featured = selectedMovie || movies[0];
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const selectedCinema = cinemas.find((cinema) => cinema.id === cinemaId);

  return <section aria-label="Khám phá phim" className="bg-[#0B0A0C] text-[#F3EEE6]">
    <section className="relative overflow-hidden min-h-[520px] pt-28 pb-12 sm:pt-36 sm:pb-20 border-b border-[#2A2631]">
      {featured?.bannerUrl && <img src={featured.bannerUrl} alt="" className="absolute inset-0 w-full h-full object-cover opacity-45" fetchPriority="high" />}
      <div className="absolute inset-0 cinema-vignette pointer-events-none" />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-end gap-8">
        <div className="max-w-2xl flex-1 pt-10">
          <p className="text-[#FFB23E] font-semibold mb-4">Một buổi chiếu dành cho bạn</p>
          <h1 className="font-['Barlow_Condensed'] text-5xl sm:text-7xl font-extrabold leading-[0.95] uppercase tracking-tight">
            {featured?.title || 'Hẹn gặp bạn tại CineX'}
          </h1>
          {featured && <>
            <div className="flex flex-wrap items-center gap-4 text-sm text-[#F3EEE6] mt-5">
              <span className="border border-[#FFB23E]/60 text-[#FFB23E] px-2 py-1 rounded">{featured.ageRating}</span>
              <span className="inline-flex items-center gap-1.5"><Clock size={16} aria-hidden="true" />{featured.durationMin} phút</span>
              {featured.genres.length > 0 && <span>{featured.genres.map((genre) => genre.name).join(', ')}</span>}
            </div>
            <p className="mt-4 max-w-xl text-sm sm:text-base leading-relaxed text-[#F3EEE6]/85 line-clamp-3">{featured.description}</p>
            <a href="#movies" onClick={() => chooseMovie(featured)} className={`ticket-notch-btn inline-flex items-center gap-2 mt-7 px-7 py-3.5 bg-[#FFB23E] text-[#0B0A0C] font-bold min-h-[48px] ${focus}`}>
              <Ticket size={20} aria-hidden="true" />{featured.status === 'NOW_SHOWING' ? 'Chọn rạp và suất chiếu' : 'Xem phim sắp chiếu'}
            </a>
          </>}
          {!featured && <p className="mt-5 text-[#A39E96]">Khám phá phim và chọn lịch chiếu phù hợp với bạn.</p>}
        </div>
        {featured?.posterUrl && <img src={featured.posterUrl} alt="" className="hidden md:block w-48 lg:w-56 rounded-lg border border-[#F3EEE6]/15 shadow-2xl aspect-[2/3] object-cover" />}
      </div>
    </section>

    <section id="movies" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 scroll-mt-24" aria-labelledby="movie-heading">
      <div className="flex flex-wrap items-end justify-between gap-6 mb-8">
        <h2 id="movie-heading" className="font-['Barlow_Condensed'] text-4xl sm:text-5xl font-bold uppercase">Phim tại CineX</h2>
        <div className="flex gap-1 bg-[#151318] p-1 border border-[#2A2631] rounded-lg" aria-label="Trạng thái phim">
          {[['NOW_SHOWING', 'Đang chiếu'], ['COMING_SOON', 'Sắp chiếu']].map(([value, label]) => <button key={value} type="button" aria-pressed={status === value}
            onClick={() => { if (status !== value) { setStatus(value); setPage(1); beginCatalogueLoad(); } }}
            className={`px-5 py-3 rounded-md text-sm font-semibold min-h-[44px] ${focus} ${status === value ? 'bg-[#FFB23E] text-[#0B0A0C]' : 'text-[#A39E96] hover:text-[#F3EEE6]'}`}>{label}</button>)}
        </div>
      </div>
      <form role="search" onSubmit={(event) => { event.preventDefault(); setSearch(searchText.trim()); setPage(1); setMoviesRetry((value) => value + 1); beginCatalogueLoad(); }} className="flex flex-col sm:flex-row gap-3 mb-8">
        <label className="flex items-center gap-3 border border-[#2A2631] bg-[#151318] rounded-lg px-4 flex-1 focus-within:border-[#FFB23E]">
          <Search className="text-[#A39E96] shrink-0" size={19} aria-hidden="true" />
          <span className="sr-only">Tên phim</span>
          <input id="discovery-search" type="search" value={searchText} onChange={(event) => setSearchText(event.target.value)} placeholder="Tìm phim bạn muốn xem" className="bg-transparent py-3 w-full text-sm outline-none" />
        </label>
        <button type="submit" className={`px-6 py-3 border border-[#2A2631] rounded-lg text-sm font-semibold hover:border-[#FFB23E] ${focus}`}>Tìm phim</button>
      </form>
      {moviesLoading && <p role="status" className="py-10 text-[#A39E96]">Đang tải danh sách phim…</p>}
      {moviesError && <div role="alert" className="py-8 text-[#F3EEE6]">
        <p>{moviesError}</p><button type="button" onClick={() => { setMoviesRetry((value) => value + 1); beginCatalogueLoad(); }} className={`text-[#FFB23E] underline mt-3 py-2 ${focus}`}>Thử tải lại danh sách phim</button>
      </div>}
      {!moviesLoading && !moviesError && movies.length === 0 && <p className="py-10 text-[#A39E96]">Không tìm thấy phim phù hợp.</p>}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-6">
        {movies.map((movie) => <button type="button" key={movie.id} aria-label={`Chọn phim ${movie.title}`} aria-pressed={selectedMovie?.id === movie.id} onClick={() => chooseMovie(movie)}
          className={`group text-left border rounded-lg overflow-hidden bg-[#151318] ${focus} ${selectedMovie?.id === movie.id ? 'border-[#FFB23E]' : 'border-[#2A2631] hover:border-[#FFB23E]/70'}`}>
          <div className="relative aspect-[2/3] bg-[#221F28]">
            {movie.posterUrl ? <img src={movie.posterUrl} alt="" loading="lazy" className="w-full h-full object-cover" /> : <Film aria-hidden="true" className="w-12 h-12 text-[#6B665F] absolute inset-0 m-auto" />}
            <span className="absolute top-3 left-3 text-xs font-bold text-[#FFB23E] bg-[#0B0A0C]/90 border border-[#FFB23E]/40 rounded px-2 py-1">{movie.ageRating}</span>
          </div>
          <div className="p-3 sm:p-4">
            <p className="text-xs text-[#A39E96] mb-2">{movie.durationMin} phút</p>
            <h3 className="font-['Barlow_Condensed'] text-xl sm:text-2xl font-bold leading-tight group-hover:text-[#FFB23E]">{movie.title}</h3>
            <p className="text-xs text-[#A39E96] mt-2 line-clamp-1">{movie.genres.map((genre) => genre.name).join(', ') || movie.originalTitle}</p>
            <span className="block text-sm font-semibold text-[#FFB23E] mt-4">{movie.status === 'NOW_SHOWING' ? 'Xem lịch chiếu' : 'Thông tin phim'}</span>
          </div>
        </button>)}
      </div>
      {!moviesLoading && !moviesError && total > PAGE_SIZE && <nav aria-label="Phân trang phim" className="flex items-center justify-center gap-5 mt-8 text-sm">
        <button type="button" disabled={page <= 1} onClick={() => { setPage((value) => value - 1); beginCatalogueLoad(); }} className={`border border-[#2A2631] rounded px-4 py-3 disabled:opacity-40 ${focus}`}>Trang trước</button>
        <span>Trang {page} / {pageCount}</span>
        <button type="button" disabled={page >= pageCount} onClick={() => { setPage((value) => value + 1); beginCatalogueLoad(); }} className={`border border-[#2A2631] rounded px-4 py-3 disabled:opacity-40 ${focus}`}>Trang sau</button>
      </nav>}

      {selectedMovie && <section aria-labelledby="schedule-heading" className="mt-10 border-t border-[#2A2631] pt-8">
        <h2 id="schedule-heading" className="font-['Barlow_Condensed'] text-3xl sm:text-4xl font-bold">Lịch chiếu: {selectedMovie.title}</h2>
        {selectedMovie.status !== 'NOW_SHOWING' ? <p className="mt-4 text-[#A39E96]">Phim sắp chiếu. Lịch chiếu sẽ được cập nhật khi rạp mở bán.</p> : <>
          <div className="mt-6 max-w-lg">
            <label htmlFor="discovery-cinema" className="flex gap-2 items-center text-sm font-semibold mb-2"><MapPin size={17} aria-hidden="true" />Rạp chiếu</label>
            <select id="discovery-cinema" value={cinemaId} disabled={cinemasLoading || !!cinemasError} onChange={(event) => {
              const nextCinema = event.target.value;
              if (cinemaId === nextCinema) return;
              setCinemaId(nextCinema);
              if (nextCinema) beginScheduleLoad(); else clearSchedule();
            }}
              className={`w-full bg-[#151318] border border-[#2A2631] rounded-lg px-4 py-3 text-sm disabled:opacity-50 ${focus}`}>
              <option value="">Chọn rạp chiếu</option>
              {cinemas.map((cinema) => <option key={cinema.id} value={cinema.id}>{cinema.name} — {cinema.city}</option>)}
            </select>
            {cinemasLoading && <p role="status" className="mt-2 text-sm text-[#A39E96]">Đang tải danh sách rạp…</p>}
            {cinemasError && <div role="alert" className="mt-3 text-sm"><p>{cinemasError}</p><button type="button" onClick={() => { setCinemasRetry((value) => value + 1); setCinemasLoading(true); setCinemasError(''); }} className={`mt-2 text-[#FFB23E] underline py-2 ${focus}`}>Thử tải lại danh sách rạp</button></div>}
            {!cinemasLoading && !cinemasError && cinemas.length === 0 && <p className="mt-2 text-sm text-[#A39E96]">Chưa có rạp đang mở bán.</p>}
            {selectedCinema && <p className="text-xs text-[#A39E96] mt-2">{selectedCinema.address}</p>}
          </div>
          <div role="group" aria-label="Ngày chiếu" className="flex flex-wrap gap-2 mt-6">
            {days.map((day, index) => <button type="button" key={day} aria-pressed={date === day} onClick={() => {
              if (date === day) return;
              setDate(day);
              if (cinemaId) beginScheduleLoad(); else clearSchedule();
            }}
              className={`min-w-[84px] px-3 py-3 border rounded-lg text-sm ${focus} ${date === day ? 'border-[#FFB23E] text-[#FFB23E] bg-[#FFB23E]/10' : 'border-[#2A2631] text-[#A39E96] hover:text-[#F3EEE6]'}`}>
              <span className="block text-xs mb-1">{index === 0 ? 'Hôm nay' : new Intl.DateTimeFormat('vi-VN', { weekday: 'short', timeZone: 'UTC' }).format(new Date(`${day}T00:00:00Z`))}</span>
              <span className="font-semibold">{day.slice(8, 10)}/{day.slice(5, 7)}</span>
            </button>)}
          </div>
          <section aria-label="Suất chiếu" aria-busy={showtimesLoading} className="mt-6 min-h-24">
            {!cinemaId && <p className="text-[#A39E96]">Chọn rạp để xem suất chiếu.</p>}
            {cinemaId && showtimesLoading && <p role="status" className="text-[#A39E96]">Đang tải suất chiếu…</p>}
            {cinemaId && showtimesError && <div role="alert"><p>{showtimesError}</p><button type="button" onClick={() => { setShowtimesRetry((value) => value + 1); beginScheduleLoad(); }} className={`mt-2 py-2 text-[#FFB23E] underline ${focus}`}>Thử tải lại lịch chiếu</button></div>}
            {cinemaId && !showtimesLoading && !showtimesError && showtimes.length === 0 && <p className="text-[#A39E96]">Không có suất chiếu trong ngày này. Hãy chọn ngày hoặc rạp khác.</p>}
            <div className="flex flex-wrap gap-3">
              {showtimes.map((item) => <button type="button" key={item.id} onClick={() => onSelectShowtime(item.id)}
                className={`group px-5 py-3 text-left rounded-lg border border-[#2A2631] bg-[#151318] hover:border-[#FFB23E] ${focus}`}>
                <span className="block text-xl font-bold group-hover:text-[#FFB23E]">{vietnamTime.format(new Date(item.startTime))}</span>
                <span className="block mt-1 text-xs text-[#A39E96]">{item.format} · {item.roomName}</span>
                <span className="block mt-1 text-xs text-[#A39E96]">{item.language}</span>
              </button>)}
            </div>
          </section>
          <p className="text-xs text-[#6B665F] flex items-center gap-2 mt-5"><CalendarDays size={14} aria-hidden="true" />Lịch chiếu và giờ hiển thị theo giờ Việt Nam.</p>
        </>}
      </section>}
    </section>
  </section>;
}
