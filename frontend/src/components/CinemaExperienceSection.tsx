import React from 'react';
import { Sparkles, Volume2, Eye, Armchair } from 'lucide-react';

export const CinemaExperienceSection: React.FC = () => {
  const experiences = [
    {
      title: 'IMAX® WITH LASER',
      subtitle: 'Độ sắc nét đỉnh cao & Âm thanh rung chuyển',
      description: 'Hệ thống máy chiếu Laser 4K thế hệ mới cùng dàn âm thanh 12 kênh mang đến hình ảnh rực rỡ và độ tương phản sâu thẳm.',
      icon: Eye,
      accent: '#36B6EB',
      bgImg: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=800&q=80',
    },
    {
      title: 'SCREENX 270°',
      subtitle: 'Vượt qua mọi giới hạn thị giác',
      description: 'Công nghệ chiếu phim đa diện đầu tiên trên thế giới, mở rộng khung hình sang hai bên vách phòng chiếu tạo cảm giác đắm chìm toàn diện.',
      icon: Volume2,
      accent: '#FFB23E',
      bgImg: 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&w=800&q=80',
    },
    {
      title: 'GOLD CLASS VIP',
      subtitle: 'Đẳng cấp hoàng gia & Phục vụ riêng',
      description: 'Ghế bọc da chỉnh điện ngả 180°, nút gọi phục vụ ẩm thực cao cấp tận chỗ cùng sảnh chờ VIP sang trọng biệt lập.',
      icon: Armchair,
      accent: '#E6A15C',
      bgImg: 'https://images.unsplash.com/photo-1595769816263-9b910be24d5f?auto=format&fit=crop&w=800&q=80',
    },
  ];

  return (
    <section id="experience" className="py-24 bg-[#0B0A0C] border-t border-[#151318]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FFB23E]/10 border border-[#FFB23E]/30 text-[#FFB23E] text-xs font-bold uppercase tracking-widest">
            <Sparkles className="w-3.5 h-3.5" />
            Công nghệ phòng chiếu
          </div>
          <h2 className="font-['Barlow_Condensed'] text-4xl sm:text-5xl font-black text-[#F3EEE6] tracking-tight uppercase">
            TRẢI NGHIỆM ĐIỆN ẢNH KHÁC BIỆT
          </h2>
          <p className="text-sm sm:text-base text-[#A39E96]">
            CineX đầu tư đồng bộ các tiêu chuẩn phòng chiếu hiện đại nhất thế giới, biến từng khung hình trở thành khoảnh khắc đáng nhớ.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {experiences.map((exp, idx) => {
            const Icon = exp.icon;
            return (
              <div
                key={idx}
                className="group relative rounded-2xl overflow-hidden bg-[#151318] border border-[#2A2631] hover:border-[#FFB23E]/50 transition-all duration-500 flex flex-col justify-end p-8 min-h-[360px]"
              >
                {/* Background Image with Dark Vignette */}
                <div className="absolute inset-0 z-0">
                  <img
                    src={exp.bgImg}
                    alt={exp.title}
                    loading="lazy"
                    className="w-full h-full object-cover filter brightness-[0.35] group-hover:scale-105 group-hover:brightness-[0.45] transition-all duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0B0A0C] via-[#0B0A0C]/70 to-transparent" />
                </div>

                {/* Content */}
                <div className="relative z-10 space-y-3">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-[#0B0A0C] font-bold shadow-lg transition-transform group-hover:scale-110"
                    style={{ backgroundColor: exp.accent }}
                  >
                    <Icon className="w-6 h-6 stroke-[2.2]" />
                  </div>
                  <h3 className="font-['Barlow_Condensed'] text-2xl sm:text-3xl font-black text-[#F3EEE6] uppercase tracking-wide">
                    {exp.title}
                  </h3>
                  <p className="text-xs font-semibold text-[#FFB23E] tracking-wider uppercase">
                    {exp.subtitle}
                  </p>
                  <p className="text-xs sm:text-sm text-[#A39E96] leading-relaxed">
                    {exp.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
