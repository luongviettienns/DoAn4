import { Prisma } from '@prisma/client';
import prisma from '../../shared/prisma';
import { NotFoundError } from '../../shared/errors';
import { ListMoviesQuery, CreateMovieInput, UpdateMovieInput } from './movie.schema';

export class MovieService {
  async listMovies(query: ListMoviesQuery) {
    const { status, genreId, search, page, limit } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.MovieWhereInput = {
      isActive: true,
      ...(status && { status }),
      ...(genreId && {
        genres: {
          some: { genreId },
        },
      }),
      ...(search && {
        OR: [
          { title: { contains: search } },
          { originalTitle: { contains: search } },
        ],
      }),
    };

    const [total, movies] = await Promise.all([
      prisma.movie.count({ where }),
      prisma.movie.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ releaseDate: 'desc' }, { createdAt: 'desc' }],
        include: {
          genres: {
            include: {
              genre: {
                select: { id: true, name: true, slug: true },
              },
            },
          },
        },
      }),
    ]);

    const formattedMovies = movies.map((m) => ({
      id: m.id,
      title: m.title,
      originalTitle: m.originalTitle,
      posterUrl: m.posterUrl,
      bannerUrl: m.bannerUrl,
      trailerUrl: m.trailerUrl,
      description: m.description,
      durationMin: m.durationMin,
      ageRating: m.ageRating,
      releaseDate: m.releaseDate,
      endDate: m.endDate,
      director: m.director,
      status: m.status,
      genres: m.genres.map((g) => g.genre),
    }));

    return {
      movies: formattedMovies,
      meta: {
        page,
        limit,
        total,
      },
    };
  }

  async getMovieById(id: string) {
    const movie = await prisma.movie.findFirst({
      where: { id, isActive: true },
      include: {
        genres: {
          include: {
            genre: {
              select: { id: true, name: true, slug: true },
            },
          },
        },
        showtimes: {
          where: {
            status: 'OPEN',
            startTime: { gte: new Date() },
          },
          orderBy: { startTime: 'asc' },
          include: {
            room: {
              include: {
                cinema: {
                  select: { id: true, name: true, city: true, address: true },
                },
              },
            },
          },
          take: 50,
        },
      },
    });

    if (!movie) {
      throw new NotFoundError('MOVIE_NOT_FOUND', 'Phim không tồn tại hoặc đã ngừng chiếu');
    }

    return {
      id: movie.id,
      title: movie.title,
      originalTitle: movie.originalTitle,
      posterUrl: movie.posterUrl,
      bannerUrl: movie.bannerUrl,
      trailerUrl: movie.trailerUrl,
      description: movie.description,
      durationMin: movie.durationMin,
      ageRating: movie.ageRating,
      releaseDate: movie.releaseDate,
      endDate: movie.endDate,
      director: movie.director,
      cast: movie.cast,
      language: movie.language,
      country: movie.country,
      status: movie.status,
      genres: movie.genres.map((g) => g.genre),
      upcomingShowtimes: movie.showtimes.map((st) => ({
        id: st.id,
        startTime: st.startTime,
        endTime: st.endTime,
        format: st.format,
        language: st.language,
        room: {
          id: st.room.id,
          name: st.room.name,
          cinema: st.room.cinema,
        },
      })),
    };
  }

  async createMovie(input: CreateMovieInput) {
    const movie = await prisma.movie.create({
      data: {
        title: input.title,
        originalTitle: input.originalTitle,
        posterUrl: input.posterUrl,
        bannerUrl: input.bannerUrl,
        trailerUrl: input.trailerUrl,
        description: input.description,
        durationMin: input.durationMin,
        ageRating: input.ageRating,
        releaseDate: new Date(input.releaseDate),
        endDate: input.endDate ? new Date(input.endDate) : null,
        director: input.director,
        cast: input.cast || [],
        language: input.language,
        country: input.country,
        genres: {
          create: input.genreIds.map((genreId) => ({
            genreId,
          })),
        },
      },
      include: {
        genres: { include: { genre: true } },
      },
    });

    return movie;
  }

  async updateMovie(id: string, input: UpdateMovieInput) {
    const existing = await prisma.movie.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('MOVIE_NOT_FOUND', 'Phim không tồn tại');
    }

    const { genreIds, ...movieData } = input;

    const movie = await prisma.$transaction(async (tx) => {
      if (genreIds) {
        await tx.movieGenre.deleteMany({ where: { movieId: id } });
        await tx.movieGenre.createMany({
          data: genreIds.map((genreId) => ({ movieId: id, genreId })),
        });
      }

      return tx.movie.update({
        where: { id },
        data: {
          ...movieData,
          releaseDate: movieData.releaseDate ? new Date(movieData.releaseDate) : undefined,
          endDate: movieData.endDate ? new Date(movieData.endDate) : undefined,
        },
        include: {
          genres: { include: { genre: true } },
        },
      });
    });

    return movie;
  }

  async deleteMovie(id: string) {
    const existing = await prisma.movie.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('MOVIE_NOT_FOUND', 'Phim không tồn tại');
    }

    // Soft delete according to BR-13
    await prisma.movie.update({
      where: { id },
      data: { isActive: false },
    });

    return { success: true };
  }
}

export const movieService = new MovieService();
export default movieService;
