import https from 'node:https';
import dns from 'node:dns';
import { AppError, BadRequestError } from './errors';

// Cấu hình Google DNS & Cloudflare DNS để khắc phục triệt để lỗi chặn DNS của các ISP tại Việt Nam
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch {
  // Bỏ qua nếu môi trường không cho phép thay đổi DNS servers
}

function tmdbDnsLookup(
  hostname: string,
  options: any,
  callback: (err: NodeJS.ErrnoException | null, address: any, family?: number) => void
) {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }

  // Sử dụng resolve4 để vượt qua bộ lọc DNS ISP cục bộ
  dns.resolve4(hostname, (err, addresses) => {
    if (err || !addresses || addresses.length === 0) {
      return dns.lookup(hostname, options, callback);
    }
    if (options && options.all) {
      return callback(
        null,
        addresses.map((addr) => ({ address: addr, family: 4 }))
      );
    }
    return callback(null, addresses[0], 4);
  });
}

const tmdbHttpsAgent = new https.Agent({
  lookup: tmdbDnsLookup,
  keepAlive: true,
  timeout: 10000,
});

export interface TmdbSearchResultItem {
  id: number;
  title: string;
  originalTitle: string;
  overview: string;
  releaseDate: string | null;
  posterUrl: string | null;
  backdropUrl: string | null;
  voteAverage: number;
}

export interface TmdbMovieDetails {
  id: number;
  title: string;
  originalTitle: string;
  overview: string;
  duration: number;
  releaseDate: string;
  posterUrl: string | null;
  backdropUrl: string | null;
  trailerUrl: string | null;
  genres: string[];
  director: string | null;
  voteAverage: number;
}

export class TmdbService {
  private get apiKey(): string {
    const key = process.env.TMDB_API_KEY || 'd57f98353cd138d04009d9b056243e9e';
    return key;
  }

  private request<T>(endpoint: string, queryParams: Record<string, string | number> = {}): Promise<T> {
    return new Promise((resolve, reject) => {
      const apiKey = this.apiKey;
      if (!apiKey) {
        return reject(new AppError(500, 'TMDB_NOT_CONFIGURED', 'Chưa cấu hình TMDB_API_KEY trên máy chủ'));
      }

      const params = new URLSearchParams();
      params.set('api_key', apiKey);
      for (const [key, val] of Object.entries(queryParams)) {
        if (val !== undefined && val !== null) {
          params.set(key, String(val));
        }
      }

      const url = `https://api.themoviedb.org/3${endpoint}?${params.toString()}`;

      const req = https.get(
        url,
        {
          agent: tmdbHttpsAgent,
          headers: {
            Accept: 'application/json',
            'User-Agent': 'CinemaBookingSystem/1.0',
          },
        },
        (res) => {
          let rawData = '';
          res.on('data', (chunk) => {
            rawData += chunk;
          });

          res.on('end', () => {
            try {
              if (res.statusCode && res.statusCode >= 400) {
                return reject(
                  new AppError(
                    res.statusCode === 404 ? 404 : 502,
                    'TMDB_API_ERROR',
                    `Lỗi kết nối máy chủ TMDB (Mã lỗi ${res.statusCode})`
                  )
                );
              }
              const parsed = JSON.parse(rawData);
              resolve(parsed as T);
            } catch (err: any) {
              reject(new AppError(502, 'TMDB_PARSE_ERROR', 'Không thể phân tích dữ liệu phản hồi từ TMDB'));
            }
          });
        }
      );

      req.on('error', (err) => {
        reject(
          new AppError(
            502,
            'TMDB_CONNECTION_ERROR',
            `Không thể kết nối đến máy chủ TMDB: ${err.message}`
          )
        );
      });

      req.setTimeout(10000, () => {
        req.destroy(new Error('Yêu cầu tới TMDB vượt quá thời gian chờ (10s)'));
      });
    });
  }

  /**
   * Tìm kiếm phim theo từ khóa từ TMDB
   */
  async searchMovies(query: string, page = 1): Promise<{ results: TmdbSearchResultItem[]; totalResults: number }> {
    if (!query || query.trim().length === 0) {
      return { results: [], totalResults: 0 };
    }

    const data = await this.request<any>('/search/movie', {
      query: query.trim(),
      language: 'vi-VN',
      page,
      include_adult: 'false',
    });

    const results: TmdbSearchResultItem[] = (data.results || []).map((m: any) => ({
      id: m.id,
      title: m.title || m.original_title || '',
      originalTitle: m.original_title || '',
      overview: m.overview || '',
      releaseDate: m.release_date || null,
      posterUrl: m.poster_path ? `https://image.tmdb.org/t/p/w500${m.poster_path}` : null,
      backdropUrl: m.backdrop_path ? `https://image.tmdb.org/t/p/w1280${m.backdrop_path}` : null,
      voteAverage: Number(m.vote_average || 0),
    }));

    return {
      results,
      totalResults: Number(data.total_results || results.length),
    };
  }

  /**
   * Lấy chi tiết phim đầy đủ từ TMDB để tự động điền form
   */
  async getMovieDetails(tmdbId: number): Promise<TmdbMovieDetails> {
    if (!tmdbId || isNaN(tmdbId) || tmdbId <= 0) {
      throw new BadRequestError('INVALID_TMDB_ID', 'Mã phim TMDB không hợp lệ');
    }

    const m = await this.request<any>(`/movie/${tmdbId}`, {
      append_to_response: 'videos,credits',
      language: 'vi-VN',
      include_video_language: 'vi,en',
    });

    // Tìm video trailer trên YouTube (ưu tiên Trailer, sau đó tới Teaser)
    const videos = m.videos?.results || [];
    const trailer =
      videos.find((v: any) => v.site === 'YouTube' && v.type === 'Trailer') ||
      videos.find((v: any) => v.site === 'YouTube' && v.type === 'Teaser') ||
      videos.find((v: any) => v.site === 'YouTube');

    const trailerUrl = trailer ? `https://www.youtube.com/watch?v=${trailer.key}` : null;

    // Tìm đạo diễn trong danh sách đoàn làm phim
    const crew = m.credits?.crew || [];
    const director = crew.find((c: any) => c.job === 'Director')?.name || null;

    // Danh sách thể loại
    const genres = (m.genres || []).map((g: any) => g.name).filter(Boolean);

    return {
      id: m.id,
      title: m.title || m.original_title || '',
      originalTitle: m.original_title || '',
      overview: m.overview || '',
      duration: Math.max(1, Number(m.runtime || 120)),
      releaseDate: m.release_date || new Date().toISOString().split('T')[0],
      posterUrl: m.poster_path ? `https://image.tmdb.org/t/p/w500${m.poster_path}` : null,
      backdropUrl: m.backdrop_path ? `https://image.tmdb.org/t/p/w1280${m.backdrop_path}` : null,
      trailerUrl,
      genres,
      director,
      voteAverage: Number(m.vote_average || 0),
    };
  }
}

export const tmdbService = new TmdbService();
