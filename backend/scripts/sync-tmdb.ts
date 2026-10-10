import dotenv from 'dotenv';
dotenv.config();

import { PrismaClient, MovieStatus, AgeRating } from '@prisma/client';
import { tmdbService } from '../src/shared/tmdb.service';

const prisma = new PrismaClient();

async function main() {
  console.log('🎬 Bắt đầu đồng bộ danh mục phim từ TMDB...');

  const searchRes = await tmdbService.searchMovies('phim chiếu rạp', 1);
  const candidateIds = searchRes.results.map((m) => m.id);

  // Thêm một số phim bom tấn nổi tiếng nếu danh sách tìm kiếm ít
  const popularIds = [
    438631, // Dune (2021)
    693134, // Dune: Part Two (2024)
    533535, // Deadpool & Wolverine (2024)
    1011985, // Kung Fu Panda 4 (2024)
    823464, // Godzilla x Kong: The New Empire (2024)
  ];

  const uniqueTmdbIds = Array.from(new Set([...candidateIds.slice(0, 5), ...popularIds]));
  console.log(`-> Tìm thấy ${uniqueTmdbIds.length} phim mục tiêu từ TMDB.`);

  let syncedCount = 0;

  for (const tmdbId of uniqueTmdbIds) {
    try {
      console.log(`-> Đang tải chi tiết phim TMDB ID: ${tmdbId}...`);
      const details = await tmdbService.getMovieDetails(tmdbId);

      // 1. Đảm bảo các thể loại đã tồn tại
      const genreIds: string[] = [];
      for (const genreName of details.genres) {
        const slug = genreName
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '');

        let g = await prisma.genre.findFirst({ where: { name: genreName } });
        if (!g) {
          g = await prisma.genre.create({
            data: { name: genreName, slug: slug || `genre-${Date.now()}` },
          });
        }
        genreIds.push(g.id);
      }

      // 2. Tạo hoặc cập nhật phim
      let movie = await prisma.movie.findFirst({
        where: {
          OR: [{ title: details.title }, { originalTitle: details.originalTitle }],
        },
      });

      if (!movie) {
        movie = await prisma.movie.create({
          data: {
            title: details.title,
            originalTitle: details.originalTitle || undefined,
            director: details.director || 'Chưa cập nhật',
            durationMin: details.duration || 120,
            releaseDate: new Date(details.releaseDate),
            ageRating: AgeRating.T13,
            trailerUrl: details.trailerUrl || undefined,
            posterUrl: details.posterUrl || 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=500&auto=format&fit=crop',
            description: details.overview || details.title,
            status: MovieStatus.NOW_SHOWING,
          },
        });

        // Liên kết thể loại
        if (genreIds.length > 0) {
          await prisma.movieGenre.createMany({
            data: genreIds.map((gId) => ({
              movieId: movie!.id,
              genreId: gId,
            })),
            skipDuplicates: true,
          });
        }
        console.log(`  ✓ Đã thêm phim mới: "${details.title}" (${details.duration} phút)`);
      } else {
        console.log(`  - Phim đã tồn tại: "${details.title}"`);
      }

      syncedCount++;
    } catch (err: any) {
      console.warn(`  ⚠️ Bỏ qua phim ID ${tmdbId}: ${err.message}`);
    }
  }

  console.log(`🎉 Hoàn thành đồng bộ! Đã xử lý thành công ${syncedCount} phim từ TMDB.`);
}

main()
  .catch((e) => {
    console.error('Lỗi khi đồng bộ TMDB:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
