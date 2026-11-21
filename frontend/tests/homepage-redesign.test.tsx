import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CinemaExperienceSection } from '../src/components/CinemaExperienceSection';
import { Discovery } from '../src/components/Discovery';
import { Footer } from '../src/components/Footer';
import { PromoSection } from '../src/components/PromoSection';
import { parseTrailerUrl } from '../src/utils/trailer';
import { renderSignedIn, response, routeFetch } from './helpers';

const sampleMovies = [
  {
    id: 'movie-dune-2',
    title: 'Hành Tinh Cát: Phần Hai',
    originalTitle: 'Dune: Part Two',
    posterUrl: '/posters/dune2.jpg',
    trailerUrl: 'https://www.youtube.com/watch?v=Way9Dexny3w',
    description: 'Paul Atreides hợp lực cùng Chani và tộc Fremen.',
    durationMin: 166,
    ageRating: 'T16',
    releaseDate: '2026-03-01',
    status: 'NOW_SHOWING',
    genres: [{ id: 'g1', name: 'Khoa học viễn tưởng', slug: 'sci-fi' }],
  },
  {
    id: 'movie-oppenheimer',
    title: 'Oppenheimer: Kẻ Hủy Diệt',
    originalTitle: 'Oppenheimer',
    posterUrl: '/posters/oppenheimer.jpg',
    trailerUrl: 'https://youtu.be/uYPbbksJxIg',
    description: 'Câu chuyện về nhà vật lý lý thuyết J. Robert Oppenheimer.',
    durationMin: 180,
    ageRating: 'T18',
    releaseDate: '2026-02-15',
    status: 'NOW_SHOWING',
    genres: [{ id: 'g2', name: 'Kịch tính', slug: 'drama' }],
  },
];

describe('Homepage Redesign — Premiere × Editorial Nocturne', () => {
  describe('parseTrailerUrl utility', () => {
    it('extracts videoId and privacy-enhanced embed URL from valid YouTube links', () => {
      const watch = parseTrailerUrl('https://www.youtube.com/watch?v=Way9Dexny3w');
      expect(watch).toEqual({
        videoId: 'Way9Dexny3w',
        embedUrl: 'https://www.youtube-nocookie.com/embed/Way9Dexny3w?rel=0&modestbranding=1',
        watchUrl: 'https://www.youtube.com/watch?v=Way9Dexny3w',
      });

      const short = parseTrailerUrl('https://youtu.be/uYPbbksJxIg');
      expect(short?.videoId).toBe('uYPbbksJxIg');
    });

    it('returns null for missing or untrusted URLs', () => {
      expect(parseTrailerUrl(null)).toBeNull();
      expect(parseTrailerUrl('')).toBeNull();
      expect(parseTrailerUrl('https://example.com/video.mp4')).toBeNull();
    });
  });

  describe('Signature Hero Carousel & Trailer Facade Modal', () => {
    it('cycles spotlight movies via accessible carousel controls and opens/closes the trailer facade modal', async () => {
      routeFetch((url) => {
        if (url.pathname.endsWith('/movies')) {
          return response({
            success: true,
            data: sampleMovies,
            meta: { total: sampleMovies.length },
          });
        }
        if (url.pathname.endsWith('/cinemas')) {
          return response({ success: true, data: [] });
        }
        return response({ success: true, data: [] });
      });

      render(<Discovery onSelectShowtime={vi.fn()} />);

      // Wait for initial spotlight movie
      expect(
        await screen.findByRole('heading', { level: 1, name: 'Hành Tinh Cát: Phần Hai' }),
      ).toBeInTheDocument();

      // Cycle to next spotlight movie via WAI-ARIA carousel button
      fireEvent.click(screen.getByRole('button', { name: 'Phim tiêu điểm tiếp theo' }));
      expect(
        await screen.findByRole('heading', { level: 1, name: 'Oppenheimer: Kẻ Hủy Diệt' }),
      ).toBeInTheDocument();

      // Toggle pause button
      const pauseBtn = screen.getByRole('button', { name: 'Tạm dừng tự chuyển phim' });
      fireEvent.click(pauseBtn);
      expect(
        screen.getByRole('button', { name: 'Tiếp tục tự chuyển phim' }),
      ).toHaveAttribute('aria-pressed', 'true');

      // Open Trailer Facade Modal
      fireEvent.click(
        screen.getByRole('button', { name: 'Xem trailer phim Oppenheimer: Kẻ Hủy Diệt' }),
      );
      const dialog = await screen.findByRole('dialog');
      expect(within(dialog).getByText('Chế độ phát bảo mật (YouTube No-Cookie Facade)')).toBeInTheDocument();

      // Press Escape to close Trailer Modal
      fireEvent.keyDown(window, { key: 'Escape' });
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  describe('Interactive Auditorium & Seat-Tier Stage (CinemaExperienceSection)', () => {
    it('renders verified seat tiers (+0đ, +20.000đ, +40.000đ) without unverified ScreenX/Gold Class claims or external stock photos', () => {
      const { container } = render(<CinemaExperienceSection />);

      expect(container.innerHTML).not.toContain('images.unsplash.com');
      expect(screen.queryByText(/SCREENX/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/GOLD CLASS/i)).not.toBeInTheDocument();

      // Default active tier is VIP (+20.000 ₫ / ghế)
      expect(screen.getByText('+20.000 ₫ / ghế')).toBeInTheDocument();

      // Switch to COUPLE tier
      const tablist = screen.getByRole('tablist', {
        name: 'Chọn hạng ghế để xem góc nhìn và phụ thu',
      });
      const tabs = within(tablist).getAllByRole('tab');
      fireEvent.click(tabs[2]); // COUPLE
      expect(screen.getByText('+40.000 ₫ / ghế đôi')).toBeInTheDocument();

      // Switch to STANDARD tier
      fireEvent.click(tabs[1]); // STANDARD
      expect(screen.getByText('+0 ₫ (Giá gốc)')).toBeInTheDocument();
    });
  });

  describe('Verified Vouchers, Combos & Operational Policies (PromoSection & Footer)', () => {
    it('displays real seeded vouchers (CINEX20, GIAM30K) and combos with working copy action', async () => {
      routeFetch(() => response({ success: true, data: [] }));
      renderSignedIn(<PromoSection />);

      expect(screen.getByText('Giảm 20% cho đơn từ 100.000 ₫')).toBeInTheDocument();
      expect(screen.getByText('Giảm ngay 30.000 ₫ cho đơn từ 120.000 ₫')).toBeInTheDocument();
      expect(screen.getByText('Combo Solo Đơn (1 Bắp Ngọt + 1 Coca/Pepsi)')).toBeInTheDocument();
      expect(screen.getByText('Combo Đôi CineX Sweet Romance')).toBeInTheDocument();
      expect(screen.getByText('CineX Party Pack (Gia đình & Bạn bè)')).toBeInTheDocument();

      const copyBtn = screen.getByRole('button', { name: 'Sao chép mã giảm giá CINEX20' });
      fireEvent.click(copyBtn);
      expect(await screen.findByText('Đã chép CINEX20')).toBeInTheDocument();
    });

    it('switches operational policies interactively in the Footer without dead anchor links', () => {
      render(<Footer />);

      expect(
        screen.getByText('Quy Chuẩn Phân Loại Độ Tuổi Phổ Biến Phim'),
      ).toBeInTheDocument();

      fireEvent.click(
        screen.getByRole('tab', { name: /Chính sách hoàn hủy vé trực tuyến/i }),
      );
      expect(
        screen.getByText('Tự Hoàn Hủy Vé Trực Tuyến Trước Giờ Chiếu'),
      ).toBeInTheDocument();
    });
  });
});
