import { useState } from 'react';
import { ExternalLink, Film, Play, X } from 'lucide-react';
import { useModalA11y } from '../hooks/useModalA11y';
import type { ApiMovie } from '../services/api';
import { parseTrailerUrl } from '../utils/trailer';

interface TrailerModalProps {
  movie: ApiMovie | null;
  onClose: () => void;
  onSelectForBooking?: (movie: ApiMovie) => void;
}

export default function TrailerModal({ movie, onClose, onSelectForBooking }: TrailerModalProps) {
  const [iframeActive, setIframeActive] = useState(false);

  useModalA11y({
    isOpen: Boolean(movie),
    onClose: () => {
      setIframeActive(false);
      onClose();
    },
  });

  if (!movie) {
    return null;
  }

  const parsedTrailer = parseTrailerUrl(movie.trailerUrl);
  if (!parsedTrailer) {
    return null;
  }

  const handleClose = () => {
    setIframeActive(false);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/85 p-4 backdrop-blur-md"
      onClick={handleClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="trailer-modal-title"
        className="relative w-full max-w-4xl overflow-hidden rounded-2xl border border-white/15 bg-[var(--color-bg-secondary)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div className="flex items-center gap-3 min-w-0">
            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--color-accent-cta)]/15 text-[var(--color-accent-cta)] border border-[var(--color-accent-cta)]/30">
              <Film className="h-4 w-4" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-text-muted)]">
                Trailer Chính Thức • {movie.ageRating}
              </p>
              <h2 id="trailer-modal-title" className="truncate text-lg font-bold text-white">
                {movie.title}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            aria-label="Đóng cửa sổ trailer"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-zinc-900/80 text-zinc-300 transition-colors hover:border-white/25 hover:text-white"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="relative aspect-video w-full bg-zinc-950">
          {iframeActive ? (
            <iframe
              title={`Trailer phim ${movie.title}`}
              src={`${parsedTrailer.embedUrl}&autoplay=1`}
              className="h-full w-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <div className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden p-6 text-center">
              {movie.posterUrl && (
                <img
                  src={movie.posterUrl}
                  alt={`Poster phim ${movie.title}`}
                  className="absolute inset-0 h-full w-full object-cover opacity-30 blur-sm"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/70 to-zinc-950/40" />

              <div className="relative z-10 max-w-lg space-y-4">
                <span className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-300">
                  Chế độ phát bảo mật (YouTube No-Cookie Facade)
                </span>
                <h3 className="vn-display-safe text-2xl font-bold uppercase text-white sm:text-3xl">
                  {movie.title}
                </h3>
                {movie.description && (
                  <p className="line-clamp-2 text-sm text-[var(--color-text-secondary)]">
                    {movie.description}
                  </p>
                )}
                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIframeActive(true)}
                    className="inline-flex min-h-11 items-center gap-2.5 rounded-xl bg-[var(--color-accent-cta)] px-6 py-3 text-sm font-bold text-white shadow-lg shadow-rose-600/30 transition-colors hover:bg-[var(--color-accent-cta-hover)]"
                  >
                    <Play className="h-4 w-4 fill-current" aria-hidden="true" />
                    Phát Trailer Ngay
                  </button>
                  <a
                    href={parsedTrailer.watchUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-zinc-200 transition-colors hover:border-white/30 hover:bg-white/10"
                  >
                    Mở trên YouTube
                    <ExternalLink className="h-4 w-4" aria-hidden="true" />
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 bg-zinc-950/80 px-5 py-3.5">
          <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--color-text-secondary)] tabular-nums">
            <span>Thời lượng: <strong className="text-white">{movie.durationMin} phút</strong></span>
            {movie.originalTitle && (
              <>
                <span aria-hidden="true">•</span>
                <span>Tựa gốc: <strong className="text-white">{movie.originalTitle}</strong></span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            {onSelectForBooking && (
              <a
                href="#booking-dock"
                onClick={() => {
                  onSelectForBooking(movie);
                  handleClose();
                }}
                className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[var(--color-accent-cta)] px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-[var(--color-accent-cta-hover)]"
              >
                {movie.status === 'COMING_SOON' ? 'Xem thông tin phát hành' : 'Chọn suất chiếu phim này'}
              </a>
            )}
            <button
              type="button"
              onClick={handleClose}
              className="inline-flex min-h-10 items-center rounded-lg border border-white/10 bg-zinc-900 px-4 py-2 text-xs font-semibold text-zinc-300 hover:border-white/25 hover:text-white"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
