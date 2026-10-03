import {
  PrismaClient,
  Role,
  UserStatus,
  MovieStatus,
  AgeRating,
  SeatType,
  RoomFormat,
  ShowtimeLanguage,
  ShowtimeStatus,
  DayType,
  TimeSlot,
} from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting CineX database seeding...');

  // 1. Settings
  console.log('-> Seeding System Settings...');
  const defaultSettings = [
    { key: 'seat_hold_duration_minutes', value: '10', description: 'Thời gian giữ ghế tạm thời (phút)' },
    { key: 'max_seats_per_order', value: '8', description: 'Số ghế tối đa cho một đơn hàng' },
    { key: 'cancellation_lead_time_hours', value: '2', description: 'Thời hạn tối thiểu trước giờ chiếu để hủy vé (giờ)' },
    { key: 'booking_lead_time_minutes', value: '15', description: 'Ngừng nhận đặt vé trước giờ chiếu (phút)' },
    { key: 'cleaning_time_minutes', value: '15', description: 'Thời gian dọn phòng giữa 2 suất chiếu (phút)' },
    { key: 'points_earning_rate', value: '10000', description: 'Số tiền VND tương ứng 1 điểm thưởng' },
    { key: 'email_verify_required', value: 'false', description: 'Bắt buộc xác minh email khi đăng ký' },
  ];

  for (const s of defaultSettings) {
    await prisma.setting.upsert({
      where: { key: s.key },
      update: { value: s.value, description: s.description },
      create: { key: s.key, value: s.value, description: s.description },
    });
  }

  // 2. Users (Admin, Manager, Staff, Customer)
  console.log('-> Seeding Users...');
  const passwordHash = await bcrypt.hash('12345678', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@cinex.vn' },
    update: {},
    create: {
      email: 'admin@cinex.vn',
      phone: '0901000001',
      fullName: 'Quản Trị Viên Hệ Thống',
      passwordHash,
      role: Role.ADMIN,
      status: UserStatus.ACTIVE,
    },
  });

  const manager = await prisma.user.upsert({
    where: { email: 'manager@cinex.vn' },
    update: {},
    create: {
      email: 'manager@cinex.vn',
      phone: '0902000002',
      fullName: 'Nguyễn Văn Quản Lý',
      passwordHash,
      role: Role.MANAGER,
      status: UserStatus.ACTIVE,
    },
  });

  const staff = await prisma.user.upsert({
    where: { email: 'staff@cinex.vn' },
    update: {},
    create: {
      email: 'staff@cinex.vn',
      phone: '0903000003',
      fullName: 'Trần Thị Thu Ngân',
      passwordHash,
      role: Role.STAFF,
      status: UserStatus.ACTIVE,
    },
  });

  const customer = await prisma.user.upsert({
    where: { email: 'customer@gmail.com' },
    update: {},
    create: {
      email: 'customer@gmail.com',
      phone: '0904000004',
      fullName: 'Lê Văn Khách Hàng',
      passwordHash,
      role: Role.CUSTOMER,
      status: UserStatus.ACTIVE,
      points: 100,
    },
  });

  // 3. Cinemas
  console.log('-> Seeding Cinemas...');
  let cinemaCG = await prisma.cinema.findFirst({ where: { name: 'CineX Cầu Giấy' } });
  if (!cinemaCG) {
    cinemaCG = await prisma.cinema.create({
      data: {
        name: 'CineX Cầu Giấy',
        address: '26 Liễu Giai, Ba Đình, Hà Nội',
        city: 'Hà Nội',
        phone: '02438889999',
        openTime: new Date('1970-01-01T08:00:00Z'),
        closeTime: new Date('1970-01-01T23:30:00Z'),
      },
    });
  }

  let cinemaBT = await prisma.cinema.findFirst({ where: { name: 'CineX Bà Triệu' } });
  if (!cinemaBT) {
    cinemaBT = await prisma.cinema.create({
      data: {
        name: 'CineX Bà Triệu',
        address: '191 Bà Triệu, Hai Bà Trưng, Hà Nội',
        city: 'Hà Nội',
        phone: '02437778888',
        openTime: new Date('1970-01-01T08:30:00Z'),
        closeTime: new Date('1970-01-01T23:30:00Z'),
      },
    });
  }

  // 4. Assign Users to Cinemas
  await prisma.userCinema.deleteMany({
    where: { userId: { in: [manager.id, staff.id] } },
  });

  await prisma.userCinema.createMany({
    data: [
      { userId: manager.id, cinemaId: cinemaCG.id },
      { userId: manager.id, cinemaId: cinemaBT.id },
      { userId: staff.id, cinemaId: cinemaCG.id },
    ],
  });

  // 5. Rooms & Seats
  console.log('-> Seeding Rooms & Seats for CineX Cầu Giấy...');
  let roomIMAX = await prisma.room.findFirst({
    where: { cinemaId: cinemaCG.id, name: 'Phòng 1 (IMAX Laser)' },
  });

  if (!roomIMAX) {
    roomIMAX = await prisma.room.create({
      data: {
        cinemaId: cinemaCG.id,
        name: 'Phòng 1 (IMAX Laser)',
        format: RoomFormat.IMAX,
        rowCount: 6,
        columnCount: 8,
      },
    });

    const rows = ['A', 'B', 'C', 'D', 'E', 'F'];
    const seatData = [];

    for (let rIdx = 0; rIdx < rows.length; rIdx++) {
      const rowLabel = rows[rIdx];
      const y = rIdx + 1;
      if (rowLabel === 'F') {
        // Couple seats: 4 couple seats on row F
        for (let col = 1; col <= 7; col += 2) {
          seatData.push({
            roomId: roomIMAX.id,
            rowLabel,
            seatNumber: col,
            type: SeatType.COUPLE,
            x: col,
            y,
            columnSpan: 2,
          });
        }
      } else {
        const type = rIdx < 2 ? SeatType.STANDARD : SeatType.VIP;
        for (let col = 1; col <= 8; col++) {
          seatData.push({
            roomId: roomIMAX.id,
            rowLabel,
            seatNumber: col,
            type,
            x: col,
            y,
            columnSpan: 1,
          });
        }
      }
    }
    await prisma.seat.createMany({ data: seatData });
  }

  // 6. Seat Surcharges for CineX Cầu Giấy
  console.log('-> Seeding Seat Surcharges...');
  const effectiveDate = new Date('2026-01-01');

  await prisma.seatSurcharge.upsert({
    where: {
      cinemaId_seatType_effectiveFrom: {
        cinemaId: cinemaCG.id,
        seatType: SeatType.STANDARD,
        effectiveFrom: effectiveDate,
      },
    },
    update: { amount: 0 },
    create: {
      cinemaId: cinemaCG.id,
      seatType: SeatType.STANDARD,
      amount: 0,
      effectiveFrom: effectiveDate,
    },
  });

  await prisma.seatSurcharge.upsert({
    where: {
      cinemaId_seatType_effectiveFrom: {
        cinemaId: cinemaCG.id,
        seatType: SeatType.VIP,
        effectiveFrom: effectiveDate,
      },
    },
    update: { amount: 20000 },
    create: {
      cinemaId: cinemaCG.id,
      seatType: SeatType.VIP,
      amount: 20000,
      effectiveFrom: effectiveDate,
    },
  });

  await prisma.seatSurcharge.upsert({
    where: {
      cinemaId_seatType_effectiveFrom: {
        cinemaId: cinemaCG.id,
        seatType: SeatType.COUPLE,
        effectiveFrom: effectiveDate,
      },
    },
    update: { amount: 40000 },
    create: {
      cinemaId: cinemaCG.id,
      seatType: SeatType.COUPLE,
      amount: 40000,
      effectiveFrom: effectiveDate,
    },
  });

  // 7. Base Price Rules for CineX Cầu Giấy
  console.log('-> Seeding Base Price Rules...');
  await prisma.priceRule.upsert({
    where: {
      cinemaId_roomFormat_dayType_timeSlot_effectiveFrom: {
        cinemaId: cinemaCG.id,
        roomFormat: RoomFormat.IMAX,
        dayType: DayType.WEEKDAY,
        timeSlot: TimeSlot.EVENING,
        effectiveFrom: effectiveDate,
      },
    },
    update: { basePrice: 130000 },
    create: {
      cinemaId: cinemaCG.id,
      roomFormat: RoomFormat.IMAX,
      dayType: DayType.WEEKDAY,
      timeSlot: TimeSlot.EVENING,
      basePrice: 130000,
      effectiveFrom: effectiveDate,
    },
  });

  // 8. Genres
  console.log('-> Seeding Genres...');
  const genreList = [
    { name: 'Hành động', slug: 'hanh-dong' },
    { name: 'Khoa học viễn tưởng', slug: 'khoa-hoc-vien-tuong' },
    { name: 'Phiêu lưu', slug: 'phieu-luu' },
    { name: 'Hoạt hình', slug: 'hoat-hinh' },
    { name: 'Kịch tính', slug: 'kich-tinh' },
    { name: 'Tiểu sử', slug: 'tieu-su' },
    { name: 'Hài hước', slug: 'hai-huoc' },
  ];
  const genreMap = new Map<string, string>();

  for (const g of genreList) {
    const item = await prisma.genre.upsert({
      where: { slug: g.slug },
      update: { name: g.name },
      create: { name: g.name, slug: g.slug },
    });
    genreMap.set(g.name, item.id);
  }

  // 9. Movies
  console.log('-> Seeding Movies...');
  let dune = await prisma.movie.findFirst({ where: { title: 'Hành Tinh Cát: Phần Hai' } });
  if (!dune) {
    dune = await prisma.movie.create({
      data: {
        title: 'Hành Tinh Cát: Phần Hai',
        originalTitle: 'Dune: Part Two',
        director: 'Denis Villeneuve',
        durationMin: 166,
        releaseDate: new Date('2026-03-01'),
        ageRating: AgeRating.T16,
        trailerUrl: 'https://www.youtube.com/watch?v=Way9Dexny3w',
        posterUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=600&q=80',
        description: 'Paul Atreides hợp lực cùng Chani và tộc Fremen khi tìm kiếm sự trả thù chống lại những kẻ đã hủy diệt gia tộc mình.',
        status: MovieStatus.NOW_SHOWING,
      },
    });

    if (genreMap.has('Hành động') && genreMap.has('Khoa học viễn tưởng')) {
      await prisma.movieGenre.createMany({
        data: [
          { movieId: dune.id, genreId: genreMap.get('Hành động')! },
          { movieId: dune.id, genreId: genreMap.get('Khoa học viễn tưởng')! },
        ],
      });
    }
  }

  let oppenheimer = await prisma.movie.findFirst({ where: { title: 'Oppenheimer: Kẻ Hủy Diệt' } });
  if (!oppenheimer) {
    oppenheimer = await prisma.movie.create({
      data: {
        title: 'Oppenheimer: Kẻ Hủy Diệt',
        originalTitle: 'Oppenheimer',
        director: 'Christopher Nolan',
        durationMin: 180,
        releaseDate: new Date('2026-02-15'),
        ageRating: AgeRating.T18,
        trailerUrl: 'https://www.youtube.com/watch?v=uYPbbksJxIg',
        posterUrl: 'https://images.unsplash.com/photo-1578328819058-b69f3a3b0f6b?auto=format&fit=crop&w=600&q=80',
        description: 'Câu chuyện nghẹt thở về nhà vật lý lý thuyết J. Robert Oppenheimer, người lãnh đạo Dự án Manhattan.',
        status: MovieStatus.NOW_SHOWING,
      },
    });

    if (genreMap.has('Tiểu sử') && genreMap.has('Kịch tính')) {
      await prisma.movieGenre.createMany({
        data: [
          { movieId: oppenheimer.id, genreId: genreMap.get('Tiểu sử')! },
          { movieId: oppenheimer.id, genreId: genreMap.get('Kịch tính')! },
        ],
      });
    }
  }

  // 10. Showtimes and Showtime Seats
  console.log('-> Seeding Showtimes & Showtime Seats...');
  const now = new Date();
  const startTime = new Date(now.getTime() + 4 * 3600 * 1000); // 4 hours from now
  const endTime = new Date(startTime.getTime() + 166 * 60 * 1000);

  let showtime = await prisma.showtime.findFirst({
    where: { roomId: roomIMAX.id, movieId: dune.id },
  });

  if (!showtime) {
    showtime = await prisma.showtime.create({
      data: {
        movieId: dune.id,
        roomId: roomIMAX.id,
        format: RoomFormat.IMAX,
        language: ShowtimeLanguage.SUBTITLED,
        startTime,
        endTime,
        status: ShowtimeStatus.OPEN,
      },
    });

    const seats = await prisma.seat.findMany({ where: { roomId: roomIMAX.id } });
    const showtimeSeatsData = seats.map((seat) => ({
      showtimeId: showtime!.id,
      seatId: seat.id,
      roomId: roomIMAX!.id,
      rowLabel: seat.rowLabel,
      seatNumber: seat.seatNumber,
      seatType: seat.type,
      x: seat.x,
      y: seat.y,
      columnSpan: seat.columnSpan,
    }));

    await prisma.showtimeSeat.createMany({ data: showtimeSeatsData });
    console.log(`✓ Created Showtime and ${showtimeSeatsData.length} ShowtimeSeats!`);
  }

  console.log('🎉 Seeding successfully completed!');
}

main()
  .catch((e) => {
    console.error('Seeding failed with error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
