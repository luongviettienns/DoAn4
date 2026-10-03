export interface MovieSlide {
  id: string;
  title: string;
  originalTitle: string;
  ageRating: 'P' | 'K' | 'T13' | 'T16' | 'T18';
  durationMinutes: number;
  genres: string[];
  tagline: string;
  description: string;
  director: string;
  backdropUrl: string;
  posterUrl: string;
  tintColor: string; // Subtle glow accent for this movie
  formats: string[];
}

export const FEATURED_MOVIES: MovieSlide[] = [
  {
    id: 'm-01',
    title: 'HÀNH TINH CÁT: PHẦN HAI',
    originalTitle: 'Dune: Part Two',
    ageRating: 'T16',
    durationMinutes: 166,
    genres: ['Hành động', 'Khoa học viễn tưởng', 'Phiêu lưu'],
    tagline: 'Cuộc chiến định mệnh giành lại tương lai vũ trụ trên sa mạc Arrakis.',
    description: 'Paul Atreides hợp lực cùng Chani và tộc Fremen khi tìm kiếm sự trả thù chống lại những kẻ đã hủy diệt gia tộc mình, đối mặt với lựa chọn giữa tình yêu và số phận vũ trụ.',
    director: 'Denis Villeneuve',
    backdropUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=1920&q=80',
    posterUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=600&q=80',
    tintColor: '#E6A15C',
    formats: ['IMAX 2D', '2D Phụ đề', '4DX'],
  },
  {
    id: 'm-02',
    title: 'OPPENHEIMER: KẺ HỦY DIỆT',
    originalTitle: 'Oppenheimer',
    ageRating: 'T18',
    durationMinutes: 180,
    genres: ['Tiểu sử', 'Kịch tính', 'Lịch sử'],
    tagline: 'Người mang lại ngọn lửa Prométhée và gánh nặng thay đổi lịch sử nhân loại.',
    description: 'Câu chuyện nghẹt thở về nhà vật lý lý thuyết J. Robert Oppenheimer, người lãnh đạo Dự án Manhattan chế tạo quả bom nguyên tử đầu tiên trong Thế chiến thứ hai.',
    director: 'Christopher Nolan',
    backdropUrl: 'https://images.unsplash.com/photo-1578328819058-b69f3a3b0f6b?auto=format&fit=crop&w=1920&q=80',
    posterUrl: 'https://images.unsplash.com/photo-1578328819058-b69f3a3b0f6b?auto=format&fit=crop&w=600&q=80',
    tintColor: '#E25B2D',
    formats: ['IMAX 2D', 'Standard 2D'],
  },
  {
    id: 'm-03',
    title: 'NGƯỜI NHỆN: DU HÀNH VŨ TRỤ NHỆN',
    originalTitle: 'Spider-Man: Across the Spider-Verse',
    ageRating: 'P',
    durationMinutes: 140,
    genres: ['Hoạt hình', 'Hành động', 'Viễn tưởng'],
    tagline: 'Khi số phận của một người anh hùng va chạm với quy luật của đa vũ trụ.',
    description: 'Miles Morales bị cuốn vào đa vũ trụ, nơi cậu gặp gỡ một đội ngũ Người Nhện chịu trách nhiệm bảo vệ sự tồn vong của thực tại nhưng phải đối mặt với xung đột lý tưởng.',
    director: 'Joaquim Dos Santos',
    backdropUrl: 'https://images.unsplash.com/photo-1635805737707-575885ab0820?auto=format&fit=crop&w=1920&q=80',
    posterUrl: 'https://images.unsplash.com/photo-1635805737707-575885ab0820?auto=format&fit=crop&w=600&q=80',
    tintColor: '#D92344',
    formats: ['2D Lồng tiếng', '2D Phụ đề', 'ScreenX'],
  },
  {
    id: 'm-04',
    title: 'NHỮNG MẢNH GHÉP CẢM XÚC 2',
    originalTitle: 'Inside Out 2',
    ageRating: 'P',
    durationMinutes: 96,
    genres: ['Hoạt hình', 'Gia đình', 'Hài kịch'],
    tagline: 'Chào mừng sự xuất hiện của những cảm xúc mới trong tuổi dậy thì.',
    description: 'Trụ sở cảm xúc trong tâm trí Riley bất ngờ bị đảo lộn khi bước vào tuổi dậy thì với sự xuất hiện của nhóm cảm xúc mới dẫn đầu bởi Lo Âu (Anxiety).',
    director: 'Kelsey Mann',
    backdropUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1920&q=80',
    posterUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80',
    tintColor: '#F3A62B',
    formats: ['2D Lồng tiếng', '2D Phụ đề'],
  },
  {
    id: 'm-05',
    title: 'KẺ TRỘM MẶT TRĂNG 4',
    originalTitle: 'Despicable Me 4',
    ageRating: 'P',
    durationMinutes: 100,
    genres: ['Hoạt hình', 'Phiêu lưu', 'Hài hước'],
    tagline: 'Gia đình Gru trở lại cùng biệt đội Minion siêu quậy thế hệ mới.',
    description: 'Gru và Lucy chào đón thành viên mới Gru Jr., nhưng sớm phải bước vào cuộc phiêu lưu nguy hiểm chạy trốn kẻ thù không đội trời chung Maxime Le Mal.',
    director: 'Chris Renaud',
    backdropUrl: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=1920&q=80',
    posterUrl: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=600&q=80',
    tintColor: '#36B6EB',
    formats: ['2D Lồng tiếng', '2D Phụ đề', '4DX'],
  },
];
