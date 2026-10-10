import prisma from '../src/shared/prisma';

async function addShowtimes() {
  const room = await prisma.room.findFirst({ include: { cinema: true } });
  const movie = await prisma.movie.findFirst({ where: { status: 'NOW_SHOWING' } });

  if (!room || !movie) {
    console.error('No room or movie found');
    process.exit(1);
  }

  console.log('Room:', room.name, 'Movie:', movie.title);

  const seats = await prisma.seat.findMany({ where: { roomId: room.id } });
  console.log('Seats in room:', seats.length);

  const now = new Date();
  for (let i = 0; i < 5; i++) {
    const start = new Date(now.getTime() + (i + 2) * 24 * 3600 * 1000);
    const end = new Date(start.getTime() + (movie.durationMin + 30) * 60 * 1000);

    const showtime = await prisma.showtime.create({
      data: {
        movieId: movie.id,
        roomId: room.id,
        format: room.format,
        language: 'SUBTITLED',
        startTime: start,
        endTime: end,
        status: 'OPEN',
      },
    });

    const seatData = seats.map((seat) => ({
      showtimeId: showtime.id,
      seatId: seat.id,
      roomId: room.id,
      seatType: seat.type,
      rowLabel: seat.rowLabel,
      seatNumber: seat.seatNumber,
      x: seat.x,
      y: seat.y,
      columnSpan: seat.columnSpan,
      status: 'AVAILABLE' as const,
    }));

    await prisma.showtimeSeat.createMany({ data: seatData });
    console.log(`Showtime ${i + 1} created. ID: ${showtime.id} with ${seats.length} seats`);
  }

  const avail = await prisma.showtimeSeat.count({ where: { status: 'AVAILABLE' } });
  console.log('Total AVAILABLE seats now:', avail);
  await prisma.$disconnect();
}

addShowtimes().catch((e) => { console.error(e); process.exit(1); });
