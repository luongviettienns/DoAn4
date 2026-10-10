import type { SeatItem } from '../src/components/SeatMapModal';

export const showtimeData = {
  showtime: { id: 'showtime-1', startTime: '2028-10-03T12:00:00.000Z', endTime: '2028-10-03T14:00:00.000Z', format: '2D', language: 'VI', basePrice: 80000 },
  movie: { id: 'movie-1', title: 'Phim kiểm thử', posterUrl: '/poster.jpg', ageRating: 'T16', durationMinutes: 120, durationMin: 120 },
  cinema: { id: 'cinema-1', name: 'CineX Test', address: 'Địa chỉ rạp' },
  room: { id: 'room-1', name: 'Phòng 1', format: '2D', rowCount: 1, columnCount: 12 },
};

export function seat(number: number, status: SeatItem['status'] = 'AVAILABLE', price = 80000): SeatItem {
  return { id: `showtime-seat-${number}`, seatId: `seat-${number}`, rowLabel: 'A', seatNumber: number, seatType: 'STANDARD', x: number - 1, y: 0, columnSpan: 1, status, price };
}

export function orderFixture(status = 'PAID') {
  return {
    id: 'order-1', code: 'MV281003TEST01', userId: 'customer-1', showtimeId: 'showtime-1', cinemaId: 'cinema-1', source: 'ONLINE', status, refundStatus: 'NONE',
    customerName: null, customerEmail: null, customerPhone: null,
    ticketSubtotal: 80000, comboSubtotal: 0, subtotal: 80000, discount: 0, total: 80000, currency: 'VND',
    expiresAt: new Date(Date.now() + 600000).toISOString(), createdAt: new Date().toISOString(), paidAt: status === 'PAID' ? new Date().toISOString() : null, cancelledAt: null, cancellationReason: null,
    snapshot: { movieTitle: 'Phim kiểm thử', posterUrl: '/poster.jpg', ageRating: 'T16', cinemaName: 'CineX Test', cinemaAddress: 'Địa chỉ rạp', roomName: 'Phòng 1', format: '2D', language: 'VI', startTime: '2028-10-03T12:00:00.000Z', endTime: '2028-10-03T14:00:00.000Z' },
    items: [{ id: 'item-1', seatId: 'seat-1', seatLabel: 'A1', seatType: 'STANDARD', price: 80000, ticket: status === 'PAID' ? { id: 'ticket-1', ticketCode: 'TK1234567890', status: 'VALID', checkedInAt: null } : null }],
    combos: [], voucher: null, payments: [],
  };
}
