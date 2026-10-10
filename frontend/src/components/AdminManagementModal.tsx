import React, { useState, useEffect, useCallback } from 'react';
import {
  X, Film, Calendar, Clapperboard, Plus, Trash2, Search,
  AlertTriangle, CheckCircle2, Loader2, MapPin, Tag, RefreshCw,
  RotateCcw, Check, Coins, Coffee, Sparkles
} from 'lucide-react';
import {
  api, type ApiMovie, type ApiCinema, type ApiShowtime,
  type ApiGenre, type CinemaWithRooms, type CreateMovieInput,
  type ApiRefundItem, type ApiPriceRule, type ApiSeatSurcharge,
  type ApiHoliday, type ApiCombo, type ApiTmdbMovieSummary
} from '../services/api';
import { useModalA11y } from '../hooks/useModalA11y';

interface AdminManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type AdminTab = 'MOVIES' | 'SHOWTIMES' | 'ROOMS' | 'PRICING' | 'COMBOS' | 'VOUCHERS' | 'REFUNDS';

export const AdminManagementModal: React.FC<AdminManagementModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('MOVIES');

  // Shared feedback state
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useModalA11y({
    isOpen,
    onClose,
    closeOnEscape: !submitting,
  });

  // Tab 1: Movies state
  const [movies, setMovies] = useState<ApiMovie[]>([]);
  const [genres, setGenres] = useState<ApiGenre[]>([]);
  const [movieSearch, setMovieSearch] = useState('');
  const [moviesLoading, setMoviesLoading] = useState(false);
  const [showAddMovieForm, setShowAddMovieForm] = useState(false);

  // New Movie Form
  const [newMovieTitle, setNewMovieTitle] = useState('');
  const [newMovieOriginalTitle, setNewMovieOriginalTitle] = useState('');
  const [newMovieDuration, setNewMovieDuration] = useState(120);
  const [newMovieAgeRating, setNewMovieAgeRating] = useState<'P' | 'K' | 'T13' | 'T16' | 'T18' | 'C'>('T13');
  const [newMovieReleaseDate, setNewMovieReleaseDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [newMoviePosterUrl, setNewMoviePosterUrl] = useState('https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=500&auto=format&fit=crop');
  const [newMovieTrailerUrl, setNewMovieTrailerUrl] = useState('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
  const [newMovieDescription, setNewMovieDescription] = useState('');
  const [newMovieGenreIds, setNewMovieGenreIds] = useState<string[]>([]);

  // TMDB Search & Auto-fill state
  const [tmdbQuery, setTmdbQuery] = useState('');
  const [tmdbSearching, setTmdbSearching] = useState(false);
  const [tmdbResults, setTmdbResults] = useState<ApiTmdbMovieSummary[]>([]);
  const [tmdbLoadingDetails, setTmdbLoadingDetails] = useState(false);

  // Tab 2: Showtimes state
  const [cinemas, setCinemas] = useState<ApiCinema[]>([]);
  const [selectedCinemaId, setSelectedCinemaId] = useState<string>('');
  const [cinemaDetails, setCinemaDetails] = useState<CinemaWithRooms | null>(null);
  const [showtimes, setShowtimes] = useState<ApiShowtime[]>([]);
  const [showtimesLoading, setShowtimesLoading] = useState(false);
  const [showAddShowtimeForm, setShowAddShowtimeForm] = useState(false);

  // New Showtime Form
  const [stMovieId, setStMovieId] = useState('');
  const [stRoomId, setStRoomId] = useState('');
  const [stStartTime, setStStartTime] = useState('');
  const [stFormat, setStFormat] = useState<'TWO_D' | 'THREE_D' | 'IMAX_2D' | 'IMAX_3D'>('TWO_D');
  const [stLanguage, setStLanguage] = useState<'SUB' | 'DUB'>('SUB');

  // Tab 3: Rooms state
  const [showAddRoomForm, setShowAddRoomForm] = useState(false);
  const [roomCinemaId, setRoomCinemaId] = useState('');
  const [roomName, setRoomName] = useState('');
  const [roomFormat, setRoomFormat] = useState<'TWO_D' | 'THREE_D' | 'IMAX_2D' | 'IMAX_3D'>('TWO_D');
  const [roomRows, setRoomRows] = useState(6);
  const [roomCols, setRoomCols] = useState(8);

  // Tab 4: Pricing state
  type PricingSubTab = 'RULES' | 'SURCHARGES' | 'HOLIDAYS';
  const [pricingSubTab, setPricingSubTab] = useState<PricingSubTab>('RULES');
  const [priceRules, setPriceRules] = useState<ApiPriceRule[]>([]);
  const [seatSurcharges, setSeatSurcharges] = useState<ApiSeatSurcharge[]>([]);
  const [holidays, setHolidays] = useState<ApiHoliday[]>([]);
  const [pricingCinemaId, setPricingCinemaId] = useState<string>('');
  const [pricingLoading, setPricingLoading] = useState(false);
  const [showAddPriceRuleForm, setShowAddPriceRuleForm] = useState(false);
  const [showAddSurchargeForm, setShowAddSurchargeForm] = useState(false);
  const [showAddHolidayForm, setShowAddHolidayForm] = useState(false);

  // New Price Rule form state
  const [prFormat, setPrFormat] = useState<'TWO_D' | 'THREE_D' | 'IMAX'>('TWO_D');
  const [prDayType, setPrDayType] = useState<'WEEKDAY' | 'WEEKEND' | 'HOLIDAY'>('WEEKDAY');
  const [prTimeSlot, setPrTimeSlot] = useState<'MORNING' | 'AFTERNOON' | 'EVENING'>('EVENING');
  const [prBasePrice, setPrBasePrice] = useState(85000);
  const [prEffectiveFrom, setPrEffectiveFrom] = useState(() => new Date().toISOString().slice(0, 10));

  // New Surcharge form state
  const [scSeatType, setScSeatType] = useState<'STANDARD' | 'VIP' | 'COUPLE'>('VIP');
  const [scAmount, setScAmount] = useState(25000);
  const [scEffectiveFrom, setScEffectiveFrom] = useState(() => new Date().toISOString().slice(0, 10));

  // New Holiday form state
  const [hlDate, setHlDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [hlName, setHlName] = useState('');

  // Tab 5: Combos state
  const [combos, setCombos] = useState<ApiCombo[]>([]);
  const [combosLoading, setCombosLoading] = useState(false);
  const [showAddComboForm, setShowAddComboForm] = useState(false);
  const [comboCinemaFilter, setComboCinemaFilter] = useState('');

  // New Combo form state
  const [newComboCode, setNewComboCode] = useState('');
  const [newComboName, setNewComboName] = useState('');
  const [newComboDescription, setNewComboDescription] = useState('');
  const [newComboPrice, setNewComboPrice] = useState(75000);
  const [newComboItems, setNewComboItems] = useState('1 Bắp rang bơ phô mai, 1 Nước ngọt lớn');

  // Tab 6: Vouchers state
  const [vouchers, setVouchers] = useState<any[]>([]);
  const [vouchersLoading, setVouchersLoading] = useState(false);

  // Tab 5: Refunds state (F16 Đối soát & Hoàn tiền)
  const [refunds, setRefunds] = useState<ApiRefundItem[]>([]);
  const [refundsLoading, setRefundsLoading] = useState(false);
  const [refundStatusFilter, setRefundStatusFilter] = useState<'ALL' | 'PENDING' | 'REFUNDED'>('PENDING');
  const [selectedRefundToProcess, setSelectedRefundToProcess] = useState<ApiRefundItem | null>(null);
  const [refundMethod, setRefundMethod] = useState<'BANK_TRANSFER' | 'CASH' | 'PROVIDER_MANUAL'>('BANK_TRANSFER');
  const [refundExternalRef, setRefundExternalRef] = useState('');
  const [refundNote, setRefundNote] = useState('');

  // Data Loaders
  const loadMoviesAndGenres = useCallback(async () => {
    setMoviesLoading(true);
    try {
      const [moviesRes, genresRes] = await Promise.all([
        api.getMovies(),
        api.getGenres(),
      ]);
      setMovies(moviesRes.data);
      setGenres(genresRes);
      if (genresRes.length > 0 && newMovieGenreIds.length === 0) {
        setNewMovieGenreIds([genresRes[0].id]);
      }
    } catch (err) {
      setFeedback({ type: 'error', message: err instanceof Error ? err.message : 'Lỗi tải danh sách phim' });
    } finally {
      setMoviesLoading(false);
    }
  }, [newMovieGenreIds.length]);

  const loadCinemas = useCallback(async () => {
    try {
      const res = await api.getCinemas();
      setCinemas(res);
      if (res.length > 0 && !selectedCinemaId) {
        setSelectedCinemaId(res[0].id);
        setRoomCinemaId(res[0].id);
      }
    } catch (err) {
      setFeedback({ type: 'error', message: err instanceof Error ? err.message : 'Lỗi tải danh mục rạp' });
    }
  }, [selectedCinemaId]);

  const loadCinemaDetailsAndShowtimes = useCallback(async (cinemaId: string) => {
    if (!cinemaId) return;
    setShowtimesLoading(true);
    try {
      const [details, stList] = await Promise.all([
        api.getCinemaDetails(cinemaId),
        api.getShowtimes({ cinemaId }),
      ]);
      setCinemaDetails(details);
      setShowtimes(stList);
      if (details.rooms && details.rooms.length > 0) {
        setStRoomId(details.rooms[0].id);
      }
    } catch (err) {
      setFeedback({ type: 'error', message: err instanceof Error ? err.message : 'Lỗi tải thông tin rạp và suất chiếu' });
    } finally {
      setShowtimesLoading(false);
    }
  }, []);

  const loadVouchers = useCallback(async () => {
    setVouchersLoading(true);
    try {
      const res = await api.getAdminVouchers();
      setVouchers(res);
    } catch {
      // In case admin voucher endpoint returns mock
      setVouchers([]);
    } finally {
      setVouchersLoading(false);
    }
  }, []);

  const loadRefunds = useCallback(async () => {
    setRefundsLoading(true);
    try {
      const res = await api.getAdminRefunds({
        status: refundStatusFilter === 'ALL' ? undefined : refundStatusFilter,
      });
      setRefunds(res.items);
    } catch (err) {
      setFeedback({ type: 'error', message: err instanceof Error ? err.message : 'Lỗi tải danh sách hoàn tiền' });
      setRefunds([]);
    } finally {
      setRefundsLoading(false);
    }
  }, [refundStatusFilter]);

  const loadPricingData = useCallback(async (cinemaId?: string) => {
    setPricingLoading(true);
    try {
      const [rules, surcharges, hls] = await Promise.all([
        api.getPriceRules(cinemaId || undefined),
        api.getSeatSurcharges(cinemaId || undefined),
        api.getHolidays(),
      ]);
      setPriceRules(rules);
      setSeatSurcharges(surcharges);
      setHolidays(hls);
    } catch (err) {
      setFeedback({ type: 'error', message: err instanceof Error ? err.message : 'Lỗi tải dữ liệu bảng giá' });
    } finally {
      setPricingLoading(false);
    }
  }, []);

  const loadCombosData = useCallback(async (cinemaId?: string) => {
    setCombosLoading(true);
    try {
      const res = await api.getAdminCombos(cinemaId || undefined);
      setCombos(res);
    } catch (err) {
      setFeedback({ type: 'error', message: err instanceof Error ? err.message : 'Lỗi tải danh sách combo' });
      setCombos([]);
    } finally {
      setCombosLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (cancelled) return;
      setFeedback(null);
      void loadMoviesAndGenres();
      void loadCinemas();
    });
    return () => {
      cancelled = true;
    };
  }, [isOpen, loadMoviesAndGenres, loadCinemas]);

  useEffect(() => {
    if (!isOpen || !selectedCinemaId) return;
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (!cancelled) {
        void loadCinemaDetailsAndShowtimes(selectedCinemaId);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [isOpen, selectedCinemaId, loadCinemaDetailsAndShowtimes]);

  useEffect(() => {
    if (!isOpen || activeTab !== 'PRICING') return;
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (!cancelled) void loadPricingData(pricingCinemaId || undefined);
    });
    return () => {
      cancelled = true;
    };
  }, [isOpen, activeTab, pricingCinemaId, loadPricingData]);

  useEffect(() => {
    if (!isOpen || activeTab !== 'COMBOS') return;
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (!cancelled) void loadCombosData(comboCinemaFilter || undefined);
    });
    return () => {
      cancelled = true;
    };
  }, [isOpen, activeTab, comboCinemaFilter, loadCombosData]);

  useEffect(() => {
    if (!isOpen || activeTab !== 'VOUCHERS') return;
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (!cancelled) void loadVouchers();
    });
    return () => {
      cancelled = true;
    };
  }, [isOpen, activeTab, loadVouchers]);

  useEffect(() => {
    if (!isOpen || activeTab !== 'REFUNDS') return;
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (!cancelled) void loadRefunds();
    });
    return () => {
      cancelled = true;
    };
  }, [isOpen, activeTab, loadRefunds]);

  if (!isOpen) return null;

  // Handlers
  const handleCreateMovie = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!newMovieTitle.trim() || !newMovieDescription.trim() || newMovieGenreIds.length === 0) {
      setFeedback({ type: 'error', message: 'Vui lòng điền đầy đủ tiêu đề, mô tả và chọn ít nhất 1 thể loại' });
      return;
    }

    setSubmitting(true);
    try {
      const input: CreateMovieInput = {
        title: newMovieTitle.trim(),
        originalTitle: newMovieOriginalTitle.trim() || undefined,
        durationMin: Number(newMovieDuration),
        ageRating: newMovieAgeRating,
        releaseDate: newMovieReleaseDate,
        posterUrl: newMoviePosterUrl.trim(),
        trailerUrl: newMovieTrailerUrl.trim() || undefined,
        description: newMovieDescription.trim(),
        genreIds: newMovieGenreIds,
      };
      await api.createMovie(input);
      setFeedback({ type: 'success', message: `Đã tạo phim "${newMovieTitle}" thành công!` });
      setShowAddMovieForm(false);
      setNewMovieTitle('');
      setNewMovieOriginalTitle('');
      setNewMovieDescription('');
      void loadMoviesAndGenres();
    } catch (err) {
      setFeedback({ type: 'error', message: err instanceof Error ? err.message : 'Tạo phim thất bại' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteMovie = async (id: string, title: string) => {
    if (!window.confirm(`Bạn có chắc chắn muốn ẩn phim "${title}"? Phim sẽ không xuất hiện trên trang chủ.`)) return;
    setFeedback(null);
    try {
      await api.deleteMovie(id);
      setFeedback({ type: 'success', message: `Đã ẩn phim "${title}"` });
      void loadMoviesAndGenres();
    } catch (err) {
      setFeedback({ type: 'error', message: err instanceof Error ? err.message : 'Không thể xóa phim' });
    }
  };

  const handleTmdbSearch = async () => {
    if (!tmdbQuery.trim()) return;
    setTmdbSearching(true);
    setFeedback(null);
    try {
      const res = await api.searchTmdbMovies(tmdbQuery.trim());
      setTmdbResults(res.results || []);
      if ((res.results || []).length === 0) {
        setFeedback({ type: 'error', message: `Không tìm thấy phim nào trên TMDB khớp với "${tmdbQuery.trim()}"` });
      }
    } catch (err) {
      setFeedback({ type: 'error', message: err instanceof Error ? err.message : 'Lỗi kết nối máy chủ TMDB' });
    } finally {
      setTmdbSearching(false);
    }
  };

  const handleSelectTmdbMovie = async (tmdbId: number) => {
    setTmdbLoadingDetails(true);
    setFeedback(null);
    try {
      const details = await api.getTmdbMovieDetails(tmdbId);
      setNewMovieTitle(details.title);
      setNewMovieOriginalTitle(details.originalTitle || '');
      if (details.duration > 0) setNewMovieDuration(details.duration);
      if (details.releaseDate) setNewMovieReleaseDate(details.releaseDate);
      if (details.posterUrl) setNewMoviePosterUrl(details.posterUrl);
      if (details.trailerUrl) setNewMovieTrailerUrl(details.trailerUrl);
      if (details.overview) setNewMovieDescription(details.overview);

      if (details.genres && details.genres.length > 0 && genres.length > 0) {
        const matchedIds: string[] = [];
        for (const gName of details.genres) {
          const found = genres.find(
            (g) => g.name.toLowerCase().includes(gName.toLowerCase()) || gName.toLowerCase().includes(g.name.toLowerCase())
          );
          if (found && !matchedIds.includes(found.id)) {
            matchedIds.push(found.id);
          }
        }
        if (matchedIds.length > 0) {
          setNewMovieGenreIds(matchedIds);
        }
      }

      setTmdbResults([]);
      setFeedback({
        type: 'success',
        message: `Đã tự động điền thông tin phim "${details.title}" từ TMDB thành công!`,
      });
    } catch (err) {
      setFeedback({ type: 'error', message: err instanceof Error ? err.message : 'Không thể lấy thông tin chi tiết phim từ TMDB' });
    } finally {
      setTmdbLoadingDetails(false);
    }
  };

  const handleCreateShowtime = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!stMovieId || !stRoomId || !stStartTime) {
      setFeedback({ type: 'error', message: 'Vui lòng chọn phim, phòng chiếu và giờ bắt đầu' });
      return;
    }

    setSubmitting(true);
    try {
      await api.createShowtime({
        movieId: stMovieId,
        roomId: stRoomId,
        startTime: new Date(stStartTime).toISOString(),
        format: stFormat,
        language: stLanguage,
        adMinutes: 10,
        cleaningMinutes: 15,
      });
      setFeedback({ type: 'success', message: 'Xếp suất chiếu thành công!' });
      setShowAddShowtimeForm(false);
      setStStartTime('');
      if (selectedCinemaId) void loadCinemaDetailsAndShowtimes(selectedCinemaId);
    } catch (err) {
      setFeedback({ type: 'error', message: err instanceof Error ? err.message : 'Xếp suất chiếu thất bại' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!roomCinemaId || !roomName.trim()) {
      setFeedback({ type: 'error', message: 'Vui lòng nhập tên phòng chiếu' });
      return;
    }

    setSubmitting(true);
    try {
      await api.createRoom({
        cinemaId: roomCinemaId,
        name: roomName.trim(),
        format: roomFormat,
        rowCount: Number(roomRows),
        columnCount: Number(roomCols),
      });
      setFeedback({ type: 'success', message: `Đã tạo phòng chiếu "${roomName}" kèm ${roomRows * roomCols} ghế thành công!` });
      setShowAddRoomForm(false);
      setRoomName('');
      if (selectedCinemaId) void loadCinemaDetailsAndShowtimes(selectedCinemaId);
    } catch (err) {
      setFeedback({ type: 'error', message: err instanceof Error ? err.message : 'Tạo phòng chiếu thất bại' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleProcessRefundSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRefundToProcess) return;
    setSubmitting(true);
    setFeedback(null);
    try {
      await api.processAdminRefund(selectedRefundToProcess.id, {
        method: refundMethod,
        externalReference: refundExternalRef.trim() || undefined,
        note: refundNote.trim() || undefined,
      });
      setFeedback({
        type: 'success',
        message: `Đã xác nhận hoàn tiền thành công cho đơn ${selectedRefundToProcess.order.code}!`,
      });
      setSelectedRefundToProcess(null);
      setRefundExternalRef('');
      setRefundNote('');
      void loadRefunds();
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Xử lý hoàn tiền thất bại',
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Pricing Handlers
  const handleCreatePriceRule = async (e: React.FormEvent) => {
    e.preventDefault();
    const cid = pricingCinemaId || (cinemas.length > 0 ? cinemas[0].id : '');
    if (!cid) {
      setFeedback({ type: 'error', message: 'Vui lòng chọn cụm rạp áp dụng bảng giá' });
      return;
    }
    setSubmitting(true);
    setFeedback(null);
    try {
      await api.upsertPriceRule({
        cinemaId: cid,
        roomFormat: prFormat,
        dayType: prDayType,
        timeSlot: prTimeSlot,
        basePrice: Number(prBasePrice),
        effectiveFrom: prEffectiveFrom,
      });
      setFeedback({ type: 'success', message: 'Đã lưu bảng giá vé thành công!' });
      setShowAddPriceRuleForm(false);
      void loadPricingData(cid);
    } catch (err) {
      setFeedback({ type: 'error', message: err instanceof Error ? err.message : 'Lưu bảng giá thất bại' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePriceRule = async (id: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa bảng giá này?')) return;
    setFeedback(null);
    try {
      await api.deletePriceRule(id);
      setFeedback({ type: 'success', message: 'Đã xóa bảng giá' });
      void loadPricingData(pricingCinemaId || undefined);
    } catch (err) {
      setFeedback({ type: 'error', message: err instanceof Error ? err.message : 'Không thể xóa bảng giá' });
    }
  };

  const handleCreateSeatSurcharge = async (e: React.FormEvent) => {
    e.preventDefault();
    const cid = pricingCinemaId || (cinemas.length > 0 ? cinemas[0].id : '');
    if (!cid) {
      setFeedback({ type: 'error', message: 'Vui lòng chọn cụm rạp áp dụng phụ thu' });
      return;
    }
    setSubmitting(true);
    setFeedback(null);
    try {
      await api.upsertSeatSurcharge({
        cinemaId: cid,
        seatType: scSeatType,
        amount: Number(scAmount),
        effectiveFrom: scEffectiveFrom,
      });
      setFeedback({ type: 'success', message: 'Đã lưu phụ thu ghế thành công!' });
      setShowAddSurchargeForm(false);
      void loadPricingData(cid);
    } catch (err) {
      setFeedback({ type: 'error', message: err instanceof Error ? err.message : 'Lưu phụ thu thất bại' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSeatSurcharge = async (id: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa phụ thu này?')) return;
    setFeedback(null);
    try {
      await api.deleteSeatSurcharge(id);
      setFeedback({ type: 'success', message: 'Đã xóa phụ thu ghế' });
      void loadPricingData(pricingCinemaId || undefined);
    } catch (err) {
      setFeedback({ type: 'error', message: err instanceof Error ? err.message : 'Không thể xóa phụ thu' });
    }
  };

  const handleCreateHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hlDate || !hlName.trim()) {
      setFeedback({ type: 'error', message: 'Vui lòng nhập ngày và tên ngày lễ' });
      return;
    }
    setSubmitting(true);
    setFeedback(null);
    try {
      await api.createHoliday({ date: hlDate, name: hlName.trim() });
      setFeedback({ type: 'success', message: `Đã thêm ngày lễ "${hlName}"` });
      setShowAddHolidayForm(false);
      setHlName('');
      void loadPricingData(pricingCinemaId || undefined);
    } catch (err) {
      setFeedback({ type: 'error', message: err instanceof Error ? err.message : 'Tạo ngày lễ thất bại' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteHoliday = async (id: string, name: string) => {
    if (!window.confirm(`Bạn có chắc muốn xóa ngày lễ "${name}"?`)) return;
    setFeedback(null);
    try {
      await api.deleteHoliday(id);
      setFeedback({ type: 'success', message: `Đã xóa ngày lễ "${name}"` });
      void loadPricingData(pricingCinemaId || undefined);
    } catch (err) {
      setFeedback({ type: 'error', message: err instanceof Error ? err.message : 'Không thể xóa ngày lễ' });
    }
  };

  // Combo Handlers
  const handleCreateCombo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComboCode.trim() || !newComboName.trim() || !newComboItems.trim()) {
      setFeedback({ type: 'error', message: 'Vui lòng điền mã combo, tên và chi tiết món' });
      return;
    }
    const items = newComboItems.split(',').map((s) => s.trim()).filter(Boolean).map((s) => ({
      name: s,
      quantity: 1,
    }));
    setSubmitting(true);
    setFeedback(null);
    try {
      await api.createCombo({
        code: newComboCode.trim().toUpperCase(),
        name: newComboName.trim(),
        description: newComboDescription.trim() || undefined,
        price: Number(newComboPrice),
        items,
        cinemaIds: comboCinemaFilter ? [comboCinemaFilter] : undefined,
      });
      setFeedback({ type: 'success', message: `Đã tạo combo "${newComboName}" thành công!` });
      setShowAddComboForm(false);
      setNewComboCode('');
      setNewComboName('');
      setNewComboDescription('');
      void loadCombosData(comboCinemaFilter || undefined);
    } catch (err) {
      setFeedback({ type: 'error', message: err instanceof Error ? err.message : 'Tạo combo thất bại' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCombo = async (id: string, name: string) => {
    if (!window.confirm(`Bạn có chắc muốn xóa combo "${name}"?`)) return;
    setFeedback(null);
    try {
      await api.deleteCombo(id);
      setFeedback({ type: 'success', message: `Đã xóa combo "${name}"` });
      void loadCombosData(comboCinemaFilter || undefined);
    } catch (err) {
      setFeedback({ type: 'error', message: err instanceof Error ? err.message : 'Không thể xóa combo' });
    }
  };

  const filteredMovies = movies.filter((m) =>
    m.title.toLowerCase().includes(movieSearch.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-fade-in">
      <div
        className="relative w-full max-w-5xl bg-[#151318] border border-[#2A2631] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2A2631] bg-[#0B0A0C]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FFB23E] flex items-center justify-center text-[#0B0A0C] font-black">
              <Clapperboard className="w-5 h-5" />
            </div>
            <div>
              <h2 id="admin-modal-title" className="text-lg font-black text-[#F3EEE6] uppercase tracking-wider">
                Trung Tâm Quản Trị Hệ Thống
              </h2>
              <p className="text-xs text-[#A39E96]">Quản lý Phim, Suất chiếu, Phòng chiếu và Danh mục CineX</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-[#A39E96] hover:text-[#F3EEE6] hover:bg-[#221F28] transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Đóng cửa sổ quản trị"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Global Feedback Banner */}
        {feedback && (
          <div
            className={`px-6 py-2.5 text-xs font-semibold flex items-center justify-between border-b ${
              feedback.type === 'success'
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
            }`}
          >
            <div className="flex items-center gap-2">
              {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
              <span>{feedback.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setFeedback(null)}
              className="text-current hover:opacity-75"
              aria-label="Đóng thông báo"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Main Tab Navigation */}
        <div className="flex border-b border-[#2A2631] px-6 bg-[#0E0D11] overflow-x-auto">
          <button
            type="button"
            onClick={() => { setActiveTab('MOVIES'); setFeedback(null); }}
            className={`py-3.5 px-4 text-xs font-bold border-b-2 whitespace-nowrap transition-all flex items-center gap-2 ${
              activeTab === 'MOVIES' ? 'border-[#FFB23E] text-[#FFB23E]' : 'border-transparent text-[#A39E96] hover:text-[#F3EEE6]'
            }`}
          >
            <Film className="w-4 h-4" />
            <span>1. Quản lý Phim ({movies.length})</span>
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('SHOWTIMES'); setFeedback(null); }}
            className={`py-3.5 px-4 text-xs font-bold border-b-2 whitespace-nowrap transition-all flex items-center gap-2 ${
              activeTab === 'SHOWTIMES' ? 'border-[#FFB23E] text-[#FFB23E]' : 'border-transparent text-[#A39E96] hover:text-[#F3EEE6]'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>2. Xếp Suất Chiếu</span>
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('ROOMS'); setFeedback(null); }}
            className={`py-3.5 px-4 text-xs font-bold border-b-2 whitespace-nowrap transition-all flex items-center gap-2 ${
              activeTab === 'ROOMS' ? 'border-[#FFB23E] text-[#FFB23E]' : 'border-transparent text-[#A39E96] hover:text-[#F3EEE6]'
            }`}
          >
            <MapPin className="w-4 h-4" />
            <span>3. Rạp & Phòng Chiếu</span>
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('PRICING'); setFeedback(null); }}
            className={`py-3.5 px-4 text-xs font-bold border-b-2 whitespace-nowrap transition-all flex items-center gap-2 ${
              activeTab === 'PRICING' ? 'border-[#FFB23E] text-[#FFB23E]' : 'border-transparent text-[#A39E96] hover:text-[#F3EEE6]'
            }`}
          >
            <Coins className="w-4 h-4" />
            <span>4. Bảng Giá & Ngày Lễ</span>
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('COMBOS'); setFeedback(null); }}
            className={`py-3.5 px-4 text-xs font-bold border-b-2 whitespace-nowrap transition-all flex items-center gap-2 ${
              activeTab === 'COMBOS' ? 'border-[#FFB23E] text-[#FFB23E]' : 'border-transparent text-[#A39E96] hover:text-[#F3EEE6]'
            }`}
          >
            <Coffee className="w-4 h-4" />
            <span>5. Combo Bắp Nước ({combos.length})</span>
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('VOUCHERS'); setFeedback(null); }}
            className={`py-3.5 px-4 text-xs font-bold border-b-2 whitespace-nowrap transition-all flex items-center gap-2 ${
              activeTab === 'VOUCHERS' ? 'border-[#FFB23E] text-[#FFB23E]' : 'border-transparent text-[#A39E96] hover:text-[#F3EEE6]'
            }`}
          >
            <Tag className="w-4 h-4" />
            <span>6. Khuyến Mãi & Voucher</span>
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('REFUNDS'); setFeedback(null); }}
            className={`py-3.5 px-4 text-xs font-bold border-b-2 whitespace-nowrap transition-all flex items-center gap-2 ${
              activeTab === 'REFUNDS' ? 'border-[#FFB23E] text-[#FFB23E]' : 'border-transparent text-[#A39E96] hover:text-[#F3EEE6]'
            }`}
          >
            <RotateCcw className="w-4 h-4" />
            <span>7. Đối Soát & Hoàn Tiền</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {/* TAB 1: MOVIES */}
          {activeTab === 'MOVIES' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#A39E96]" />
                  <input
                    type="text"
                    value={movieSearch}
                    onChange={(e) => setMovieSearch(e.target.value)}
                    placeholder="Tìm kiếm phim theo tên..."
                    className="w-full pl-9 pr-4 py-2 bg-[#0B0A0C] border border-[#2A2631] rounded-xl text-xs text-[#F3EEE6] focus:border-[#FFB23E] outline-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddMovieForm(!showAddMovieForm)}
                  className="px-4 py-2 bg-[#FFB23E] hover:bg-[#FFA21A] text-[#0B0A0C] font-bold rounded-xl text-xs flex items-center gap-2 self-start sm:self-auto transition-all shadow-md shadow-[#FFB23E]/20"
                >
                  <Plus className="w-4 h-4" />
                  <span>{showAddMovieForm ? 'Đóng biểu mẫu' : 'Thêm phim mới'}</span>
                </button>
              </div>

              {/* Add Movie Form */}
              {showAddMovieForm && (
                <form onSubmit={handleCreateMovie} className="p-5 bg-[#0E0D11] border border-[#FFB23E]/30 rounded-2xl space-y-4 animate-fade-in">
                  <h3 className="text-sm font-bold text-[#FFB23E] uppercase tracking-wider flex items-center gap-2">
                    <Plus className="w-4 h-4" /> Điền thông tin phim mới
                  </h3>

                  {/* TMDB Quick Search & Auto-Fill */}
                  <div className="p-3.5 bg-[#18151F] border border-[#FFB23E]/30 rounded-xl space-y-2.5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <div className="flex items-center gap-2 text-xs font-bold text-[#FFB23E]">
                        <Sparkles className="w-4 h-4 text-[#FFB23E]" />
                        <span>Tìm & Tự động điền nhanh từ TMDB</span>
                      </div>
                      <span className="text-[11px] text-[#A39E96]">Nhập tên phim để tự điền ảnh, trailer, thời lượng</span>
                    </div>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <input
                          type="text"
                          value={tmdbQuery}
                          onChange={(e) => setTmdbQuery(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              void handleTmdbSearch();
                            }
                          }}
                          placeholder="Nhập tên phim (ví dụ: Dune, Mai, Deadpool, Kung Fu Panda...)"
                          className="w-full px-3 py-2 bg-[#0B0A0C] border border-[#2A2631] rounded-lg text-xs text-[#F3EEE6] focus:border-[#FFB23E] outline-none"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleTmdbSearch}
                        disabled={tmdbSearching || !tmdbQuery.trim()}
                        className="px-3.5 py-2 bg-[#FFB23E]/20 hover:bg-[#FFB23E]/30 text-[#FFB23E] border border-[#FFB23E]/40 font-bold rounded-lg text-xs flex items-center gap-1.5 transition-all disabled:opacity-50"
                      >
                        {tmdbSearching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                        <span>Tìm TMDB</span>
                      </button>
                    </div>

                    {/* Search Results Dropdown/List */}
                    {tmdbResults.length > 0 && (
                      <div className="max-h-56 overflow-y-auto space-y-1.5 pt-2 border-t border-[#2A2631]">
                        <p className="text-[11px] text-[#A39E96] font-medium">Bấm vào phim để tự động điền:</p>
                        {tmdbResults.map((movie) => (
                          <button
                            key={movie.id}
                            type="button"
                            onClick={() => handleSelectTmdbMovie(movie.id)}
                            disabled={tmdbLoadingDetails}
                            className="w-full text-left p-2 rounded-lg bg-[#0B0A0C] hover:bg-[#221F28] border border-transparent hover:border-[#FFB23E]/40 transition-all flex items-center gap-3 text-xs"
                          >
                            {movie.posterUrl ? (
                              <img src={movie.posterUrl} alt={movie.title} className="w-8 h-11 object-cover rounded shadow flex-shrink-0" />
                            ) : (
                              <div className="w-8 h-11 bg-[#1A1721] rounded flex items-center justify-center text-[10px] text-[#A39E96] flex-shrink-0">N/A</div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="font-bold text-[#F3EEE6] truncate">{movie.title}</div>
                              <div className="text-[11px] text-[#A39E96] flex items-center gap-2">
                                {movie.originalTitle && movie.originalTitle !== movie.title && (
                                  <span className="italic truncate">{movie.originalTitle}</span>
                                )}
                                {movie.releaseDate && <span>({movie.releaseDate.slice(0, 4)})</span>}
                                {movie.voteAverage > 0 && <span className="text-[#FFB23E]">⭐ {movie.voteAverage.toFixed(1)}</span>}
                              </div>
                            </div>
                            <span className="text-[10px] px-2 py-1 bg-[#FFB23E]/10 text-[#FFB23E] rounded font-semibold whitespace-nowrap">
                              {tmdbLoadingDetails ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Chọn'}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-[#A39E96] mb-1">Tên phim *</label>
                      <input
                        type="text"
                        required
                        value={newMovieTitle}
                        onChange={(e) => setNewMovieTitle(e.target.value)}
                        placeholder="Ví dụ: Đất Rừng Phương Nam"
                        className="w-full px-3 py-2 bg-[#151318] border border-[#2A2631] rounded-lg text-xs text-[#F3EEE6] focus:border-[#FFB23E] outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-[#A39E96] mb-1">Tên tiếng Anh (Tùy chọn)</label>
                      <input
                        type="text"
                        value={newMovieOriginalTitle}
                        onChange={(e) => setNewMovieOriginalTitle(e.target.value)}
                        placeholder="Song of the South"
                        className="w-full px-3 py-2 bg-[#151318] border border-[#2A2631] rounded-lg text-xs text-[#F3EEE6] focus:border-[#FFB23E] outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs text-[#A39E96] mb-1">Thời lượng (Phút) *</label>
                      <input
                        type="number"
                        min="1"
                        max="600"
                        required
                        value={newMovieDuration}
                        onChange={(e) => setNewMovieDuration(Number(e.target.value))}
                        className="w-full px-3 py-2 bg-[#151318] border border-[#2A2631] rounded-lg text-xs text-[#F3EEE6] focus:border-[#FFB23E] outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-[#A39E96] mb-1">Độ tuổi (Age Rating) *</label>
                      <select
                        value={newMovieAgeRating}
                        onChange={(e) => setNewMovieAgeRating(e.target.value as any)}
                        className="w-full px-3 py-2 bg-[#151318] border border-[#2A2631] rounded-lg text-xs text-[#F3EEE6] focus:border-[#FFB23E] outline-none"
                      >
                        <option value="P">P — Mọi lứa tuổi</option>
                        <option value="K">K — Dưới 13 tuổi cùng phụ huynh</option>
                        <option value="T13">T13 — Khán giả từ 13 tuổi</option>
                        <option value="T16">T16 — Khán giả từ 16 tuổi</option>
                        <option value="T18">T18 — Khán giả từ 18 tuổi</option>
                        <option value="C">C — Cấm chiếu</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-[#A39E96] mb-1">Ngày khởi chiếu *</label>
                      <input
                        type="date"
                        required
                        value={newMovieReleaseDate}
                        onChange={(e) => setNewMovieReleaseDate(e.target.value)}
                        className="w-full px-3 py-2 bg-[#151318] border border-[#2A2631] rounded-lg text-xs text-[#F3EEE6] focus:border-[#FFB23E] outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-[#A39E96] mb-1">Poster Image URL *</label>
                      <input
                        type="url"
                        required
                        value={newMoviePosterUrl}
                        onChange={(e) => setNewMoviePosterUrl(e.target.value)}
                        className="w-full px-3 py-2 bg-[#151318] border border-[#2A2631] rounded-lg text-xs text-[#F3EEE6] focus:border-[#FFB23E] outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-[#A39E96] mb-1">Trailer YouTube URL</label>
                      <input
                        type="url"
                        value={newMovieTrailerUrl}
                        onChange={(e) => setNewMovieTrailerUrl(e.target.value)}
                        className="w-full px-3 py-2 bg-[#151318] border border-[#2A2631] rounded-lg text-xs text-[#F3EEE6] focus:border-[#FFB23E] outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-[#A39E96] mb-1">Thể loại (Chọn ít nhất 1) *</label>
                    <div className="flex flex-wrap gap-2">
                      {genres.map((g) => {
                        const isSelected = newMovieGenreIds.includes(g.id);
                        return (
                          <button
                            key={g.id}
                            type="button"
                            onClick={() => {
                              if (isSelected) {
                                setNewMovieGenreIds(newMovieGenreIds.filter((id) => id !== g.id));
                              } else {
                                setNewMovieGenreIds([...newMovieGenreIds, g.id]);
                              }
                            }}
                            className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-all ${
                              isSelected
                                ? 'bg-[#FFB23E]/20 text-[#FFB23E] border-[#FFB23E]'
                                : 'bg-[#151318] text-[#A39E96] border-[#2A2631] hover:text-[#F3EEE6]'
                            }`}
                          >
                            {g.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-[#A39E96] mb-1">Mô tả tóm tắt phim *</label>
                    <textarea
                      required
                      rows={3}
                      value={newMovieDescription}
                      onChange={(e) => setNewMovieDescription(e.target.value)}
                      placeholder="Nội dung phim, đạo diễn, diễn viên chính..."
                      className="w-full px-3 py-2 bg-[#151318] border border-[#2A2631] rounded-lg text-xs text-[#F3EEE6] focus:border-[#FFB23E] outline-none"
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowAddMovieForm(false)}
                      className="px-4 py-2 rounded-lg text-xs font-bold text-[#A39E96] hover:bg-[#221F28]"
                    >
                      Hủy bỏ
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-5 py-2 bg-[#FFB23E] hover:bg-[#FFA21A] text-[#0B0A0C] font-bold rounded-lg text-xs flex items-center gap-2 disabled:opacity-50"
                    >
                      {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                      <span>Lưu phim mới</span>
                    </button>
                  </div>
                </form>
              )}

              {/* Movies List Table */}
              {moviesLoading ? (
                <div className="flex justify-center py-12 text-[#FFB23E]">
                  <Loader2 className="w-8 h-8 animate-spin" />
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredMovies.map((m) => (
                    <div
                      key={m.id}
                      className="p-3.5 bg-[#0B0A0C] border border-[#2A2631] rounded-xl flex gap-3 hover:border-[#FFB23E]/40 transition-colors"
                    >
                      <img
                        src={m.posterUrl}
                        alt={m.title}
                        className="w-16 h-24 object-cover rounded-lg flex-shrink-0 bg-[#151318]"
                      />
                      <div className="flex-1 min-w-0 flex flex-col justify-between">
                        <div>
                          <div className="flex items-start justify-between gap-1">
                            <h4 className="font-bold text-xs text-[#F3EEE6] truncate">{m.title}</h4>
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-[#FFB23E]/10 text-[#FFB23E] border border-[#FFB23E]/30">
                              {m.ageRating}
                            </span>
                          </div>
                          <p className="text-[11px] text-[#A39E96] mt-0.5">{m.durationMin} phút • {m.status}</p>
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {m.genres.slice(0, 2).map((g) => (
                              <span key={g.id} className="text-[9px] px-1.5 py-0.2 bg-[#151318] text-[#A39E96] rounded">
                                {g.name}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#2A2631]/60">
                          <button
                            type="button"
                            onClick={() => handleDeleteMovie(m.id, m.title)}
                            className="text-xs text-rose-400 hover:text-rose-300 p-1 flex items-center gap-1"
                            title="Ẩn phim này khỏi hệ thống"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Ẩn</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: SHOWTIMES */}
          {activeTab === 'SHOWTIMES' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <label className="text-xs text-[#A39E96] font-bold uppercase whitespace-nowrap">Chọn cụm rạp:</label>
                  <select
                    value={selectedCinemaId}
                    onChange={(e) => setSelectedCinemaId(e.target.value)}
                    className="px-3 py-2 bg-[#0B0A0C] border border-[#2A2631] rounded-xl text-xs text-[#F3EEE6] focus:border-[#FFB23E] outline-none"
                  >
                    {cinemas.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.city})
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  onClick={() => setShowAddShowtimeForm(!showAddShowtimeForm)}
                  className="px-4 py-2 bg-[#FFB23E] hover:bg-[#FFA21A] text-[#0B0A0C] font-bold rounded-xl text-xs flex items-center gap-2 self-start sm:self-auto transition-all shadow-md shadow-[#FFB23E]/20"
                >
                  <Plus className="w-4 h-4" />
                  <span>{showAddShowtimeForm ? 'Đóng biểu mẫu' : 'Xếp suất chiếu mới'}</span>
                </button>
              </div>

              {/* Add Showtime Form */}
              {showAddShowtimeForm && (
                <form onSubmit={handleCreateShowtime} className="p-5 bg-[#0E0D11] border border-[#FFB23E]/30 rounded-2xl space-y-4 animate-fade-in">
                  <h3 className="text-sm font-bold text-[#FFB23E] uppercase tracking-wider flex items-center gap-2">
                    <Plus className="w-4 h-4" /> Xếp suất chiếu mới (Kiểm tra BR-10)
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-[#A39E96] mb-1">Phim chiếu *</label>
                      <select
                        required
                        value={stMovieId}
                        onChange={(e) => setStMovieId(e.target.value)}
                        className="w-full px-3 py-2 bg-[#151318] border border-[#2A2631] rounded-lg text-xs text-[#F3EEE6] focus:border-[#FFB23E] outline-none"
                      >
                        <option value="">-- Chọn phim --</option>
                        {movies.filter((m) => m.ageRating !== 'C').map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.title} ({m.durationMin}p, {m.ageRating})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs text-[#A39E96] mb-1">Phòng chiếu (Tại rạp đang chọn) *</label>
                      <select
                        required
                        value={stRoomId}
                        onChange={(e) => setStRoomId(e.target.value)}
                        className="w-full px-3 py-2 bg-[#151318] border border-[#2A2631] rounded-lg text-xs text-[#F3EEE6] focus:border-[#FFB23E] outline-none"
                      >
                        <option value="">-- Chọn phòng --</option>
                        {cinemaDetails?.rooms.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.name} ({r.format} • {r._count.seats} ghế)
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs text-[#A39E96] mb-1">Giờ bắt đầu chiếu *</label>
                      <input
                        type="datetime-local"
                        required
                        value={stStartTime}
                        onChange={(e) => setStStartTime(e.target.value)}
                        className="w-full px-3 py-2 bg-[#151318] border border-[#2A2631] rounded-lg text-xs text-[#F3EEE6] focus:border-[#FFB23E] outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-[#A39E96] mb-1">Định dạng chiếu *</label>
                      <select
                        value={stFormat}
                        onChange={(e) => setStFormat(e.target.value as any)}
                        className="w-full px-3 py-2 bg-[#151318] border border-[#2A2631] rounded-lg text-xs text-[#F3EEE6] focus:border-[#FFB23E] outline-none"
                      >
                        <option value="TWO_D">2D Tiêu chuẩn</option>
                        <option value="THREE_D">3D Kính nổi</option>
                        <option value="IMAX_2D">IMAX 2D</option>
                        <option value="IMAX_3D">IMAX 3D</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs text-[#A39E96] mb-1">Ngôn ngữ *</label>
                      <select
                        value={stLanguage}
                        onChange={(e) => setStLanguage(e.target.value as any)}
                        className="w-full px-3 py-2 bg-[#151318] border border-[#2A2631] rounded-lg text-xs text-[#F3EEE6] focus:border-[#FFB23E] outline-none"
                      >
                        <option value="SUB">Phụ đề tiếng Việt (SUB)</option>
                        <option value="DUB">Lồng tiếng (DUB)</option>
                      </select>
                    </div>
                  </div>

                  <p className="text-[11px] text-[#A39E96]">
                    * Lưu ý: Hệ thống tự động tính thêm 10 phút trailer quảng cáo và bắt buộc có tối thiểu 15 phút dọn dẹp giữa 2 suất chiếu theo quy định BR-10.
                  </p>

                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowAddShowtimeForm(false)}
                      className="px-4 py-2 rounded-lg text-xs font-bold text-[#A39E96] hover:bg-[#221F28]"
                    >
                      Hủy bỏ
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-5 py-2 bg-[#FFB23E] hover:bg-[#FFA21A] text-[#0B0A0C] font-bold rounded-lg text-xs flex items-center gap-2 disabled:opacity-50"
                    >
                      {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                      <span>Xếp suất chiếu</span>
                    </button>
                  </div>
                </form>
              )}

              {/* Showtimes Table */}
              {showtimesLoading ? (
                <div className="flex justify-center py-12 text-[#FFB23E]">
                  <Loader2 className="w-8 h-8 animate-spin" />
                </div>
              ) : showtimes.length === 0 ? (
                <div className="p-8 text-center bg-[#0B0A0C] border border-[#2A2631] rounded-2xl text-xs text-[#A39E96]">
                  Chưa có suất chiếu nào được tạo tại cụm rạp này. Bấm &quot;Xếp suất chiếu mới&quot; để bắt đầu.
                </div>
              ) : (
                <div className="border border-[#2A2631] rounded-xl overflow-hidden bg-[#0B0A0C]">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#110F14] text-[#A39E96] border-b border-[#2A2631] uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="px-4 py-3">Phim</th>
                        <th className="px-4 py-3">Phòng chiếu</th>
                        <th className="px-4 py-3">Định dạng</th>
                        <th className="px-4 py-3">Thời gian</th>
                        <th className="px-4 py-3">Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#2A2631]/60">
                      {showtimes.map((st) => {
                        const start = new Date(st.startTime);
                        const end = new Date(st.endTime);
                        return (
                          <tr key={st.id} className="hover:bg-[#151318]/50">
                            <td className="px-4 py-3 font-semibold text-[#F3EEE6]">{st.movieTitle}</td>
                            <td className="px-4 py-3 text-[#A39E96]">{st.roomName}</td>
                            <td className="px-4 py-3">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#FFB23E]/10 text-[#FFB23E] border border-[#FFB23E]/30">
                                {st.format} • {st.language}
                              </span>
                            </td>
                            <td className="px-4 py-3 font-mono text-[11px] text-[#A39E96]">
                              {start.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} - {end.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} ({start.toLocaleDateString('vi-VN')})
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-emerald-400 font-bold">{st.status}</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: ROOMS */}
          {activeTab === 'ROOMS' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-bold text-[#F3EEE6]">Danh Sách Phòng Chiếu & Sơ Đồ Ghế</h3>
                  <p className="text-xs text-[#A39E96]">Tạo phòng chiếu mới với cấu hình hàng/cột tự động sinh sơ đồ ghế</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddRoomForm(!showAddRoomForm)}
                  className="px-4 py-2 bg-[#FFB23E] hover:bg-[#FFA21A] text-[#0B0A0C] font-bold rounded-xl text-xs flex items-center gap-2 self-start sm:self-auto transition-all shadow-md shadow-[#FFB23E]/20"
                >
                  <Plus className="w-4 h-4" />
                  <span>{showAddRoomForm ? 'Đóng biểu mẫu' : 'Thêm phòng chiếu'}</span>
                </button>
              </div>

              {/* Add Room Form */}
              {showAddRoomForm && (
                <form onSubmit={handleCreateRoom} className="p-5 bg-[#0E0D11] border border-[#FFB23E]/30 rounded-2xl space-y-4 animate-fade-in">
                  <h3 className="text-sm font-bold text-[#FFB23E] uppercase tracking-wider flex items-center gap-2">
                    <Plus className="w-4 h-4" /> Thêm phòng chiếu mới cho rạp
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-[#A39E96] mb-1">Cụm rạp *</label>
                      <select
                        required
                        value={roomCinemaId}
                        onChange={(e) => setRoomCinemaId(e.target.value)}
                        className="w-full px-3 py-2 bg-[#151318] border border-[#2A2631] rounded-lg text-xs text-[#F3EEE6] focus:border-[#FFB23E] outline-none"
                      >
                        {cinemas.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} ({c.city})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs text-[#A39E96] mb-1">Tên phòng chiếu *</label>
                      <input
                        type="text"
                        required
                        value={roomName}
                        onChange={(e) => setRoomName(e.target.value)}
                        placeholder="Ví dụ: Phòng 03 - Laser VIP"
                        className="w-full px-3 py-2 bg-[#151318] border border-[#2A2631] rounded-lg text-xs text-[#F3EEE6] focus:border-[#FFB23E] outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs text-[#A39E96] mb-1">Định dạng phòng *</label>
                      <select
                        value={roomFormat}
                        onChange={(e) => setRoomFormat(e.target.value as any)}
                        className="w-full px-3 py-2 bg-[#151318] border border-[#2A2631] rounded-lg text-xs text-[#F3EEE6] focus:border-[#FFB23E] outline-none"
                      >
                        <option value="TWO_D">2D Tiêu chuẩn</option>
                        <option value="THREE_D">3D Kính nổi</option>
                        <option value="IMAX_2D">IMAX 2D</option>
                        <option value="IMAX_3D">IMAX 3D</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs text-[#A39E96] mb-1">Số hàng ghế (Rows)</label>
                      <input
                        type="number"
                        min="2"
                        max="26"
                        required
                        value={roomRows}
                        onChange={(e) => setRoomRows(Number(e.target.value))}
                        className="w-full px-3 py-2 bg-[#151318] border border-[#2A2631] rounded-lg text-xs text-[#F3EEE6] focus:border-[#FFB23E] outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-[#A39E96] mb-1">Số ghế mỗi hàng (Cols)</label>
                      <input
                        type="number"
                        min="4"
                        max="30"
                        required
                        value={roomCols}
                        onChange={(e) => setRoomCols(Number(e.target.value))}
                        className="w-full px-3 py-2 bg-[#151318] border border-[#2A2631] rounded-lg text-xs text-[#F3EEE6] focus:border-[#FFB23E] outline-none"
                      />
                    </div>
                  </div>

                  <p className="text-[11px] text-[#FFB23E]">
                    Sẽ tự động khởi tạo {roomRows * roomCols} ghế (Hàng A-{String.fromCharCode(64 + roomRows)}) với phân loại ghế Standard/VIP/Couple theo tiêu chuẩn.
                  </p>

                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowAddRoomForm(false)}
                      className="px-4 py-2 rounded-lg text-xs font-bold text-[#A39E96] hover:bg-[#221F28]"
                    >
                      Hủy bỏ
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-5 py-2 bg-[#FFB23E] hover:bg-[#FFA21A] text-[#0B0A0C] font-bold rounded-lg text-xs flex items-center gap-2 disabled:opacity-50"
                    >
                      {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                      <span>Tạo phòng chiếu</span>
                    </button>
                  </div>
                </form>
              )}

              {/* Rooms Overview */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {cinemaDetails?.rooms.map((r) => (
                  <div key={r.id} className="p-4 bg-[#0B0A0C] border border-[#2A2631] rounded-xl flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-[#F3EEE6]">{r.name}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-[#FFB23E]/10 text-[#FFB23E] border border-[#FFB23E]/30">
                          {r.format}
                        </span>
                      </div>
                      <p className="text-xs text-[#A39E96] mt-1">
                        Kích thước: {r.rowCount} hàng × {r.columnCount} cột • {r._count.seats} ghế hoạt động
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-emerald-400 font-bold bg-emerald-500/10 px-2 py-1 rounded">
                        Đang hoạt động
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: PRICING & HOLIDAYS */}
          {activeTab === 'PRICING' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-bold text-[#F3EEE6]">Quản Lý Bảng Giá Vé, Phụ Thu & Ngày Lễ (F12)</h3>
                  <p className="text-xs text-[#A39E96]">Cấu hình ma trận giá vé theo định dạng phòng, khung giờ và phụ thu loại ghế</p>
                </div>
                <div className="flex items-center gap-3">
                  <select
                    value={pricingCinemaId}
                    onChange={(e) => setPricingCinemaId(e.target.value)}
                    className="px-3 py-1.5 rounded-lg bg-[#0B0A0C] border border-[#2A2631] text-[#F3EEE6] text-xs focus:border-[#FFB23E] outline-none"
                  >
                    <option value="">-- Tất cả cụm rạp --</option>
                    {cinemas.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => loadPricingData(pricingCinemaId || undefined)}
                    className="p-2 rounded-lg bg-[#0B0A0C] border border-[#2A2631] text-[#A39E96] hover:text-[#FFB23E] transition-colors"
                    title="Tải lại bảng giá"
                  >
                    <RefreshCw className={`w-4 h-4 ${pricingLoading ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>

              {/* Sub-tabs */}
              <div className="flex items-center gap-2 border-b border-[#2A2631]">
                <button
                  type="button"
                  onClick={() => setPricingSubTab('RULES')}
                  className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
                    pricingSubTab === 'RULES' ? 'border-[#FFB23E] text-[#FFB23E]' : 'border-transparent text-[#A39E96] hover:text-[#F3EEE6]'
                  }`}
                >
                  1. Bảng giá vé cơ bản ({priceRules.length})
                </button>
                <button
                  type="button"
                  onClick={() => setPricingSubTab('SURCHARGES')}
                  className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
                    pricingSubTab === 'SURCHARGES' ? 'border-[#FFB23E] text-[#FFB23E]' : 'border-transparent text-[#A39E96] hover:text-[#F3EEE6]'
                  }`}
                >
                  2. Phụ thu loại ghế ({seatSurcharges.length})
                </button>
                <button
                  type="button"
                  onClick={() => setPricingSubTab('HOLIDAYS')}
                  className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
                    pricingSubTab === 'HOLIDAYS' ? 'border-[#FFB23E] text-[#FFB23E]' : 'border-transparent text-[#A39E96] hover:text-[#F3EEE6]'
                  }`}
                >
                  3. Ngày lễ toàn quốc ({holidays.length})
                </button>
              </div>

              {/* Subtab 1: Price Rules */}
              {pricingSubTab === 'RULES' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <p className="text-xs text-[#A39E96]">Giá vé gốc theo định dạng phòng (2D/3D/IMAX), loại ngày và khung giờ</p>
                    <button
                      type="button"
                      onClick={() => setShowAddPriceRuleForm(!showAddPriceRuleForm)}
                      className="px-3 py-1.5 bg-[#FFB23E] hover:bg-[#FFA21A] text-[#0B0A0C] font-bold rounded-lg text-xs flex items-center gap-1.5 transition-all"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{showAddPriceRuleForm ? 'Đóng biểu mẫu' : 'Thêm / Cập nhật giá'}</span>
                    </button>
                  </div>

                  {showAddPriceRuleForm && (
                    <form onSubmit={handleCreatePriceRule} className="p-4 bg-[#0B0A0C] border border-[#2A2631] rounded-xl space-y-3">
                      <h4 className="text-xs font-bold text-[#FFB23E] uppercase tracking-wider">Cấu hình giá vé mới</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-[11px] text-[#A39E96] mb-1">Cụm rạp *</label>
                          <select
                            value={pricingCinemaId || (cinemas[0]?.id || '')}
                            onChange={(e) => setPricingCinemaId(e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-[#151318] border border-[#2A2631] rounded-lg text-xs text-[#F3EEE6]"
                          >
                            {cinemas.map((c) => (
                              <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[11px] text-[#A39E96] mb-1">Định dạng *</label>
                          <select
                            value={prFormat}
                            onChange={(e) => setPrFormat(e.target.value as any)}
                            className="w-full px-2.5 py-1.5 bg-[#151318] border border-[#2A2631] rounded-lg text-xs text-[#F3EEE6]"
                          >
                            <option value="TWO_D">2D</option>
                            <option value="THREE_D">3D</option>
                            <option value="IMAX">IMAX</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[11px] text-[#A39E96] mb-1">Loại ngày *</label>
                          <select
                            value={prDayType}
                            onChange={(e) => setPrDayType(e.target.value as any)}
                            className="w-full px-2.5 py-1.5 bg-[#151318] border border-[#2A2631] rounded-lg text-xs text-[#F3EEE6]"
                          >
                            <option value="WEEKDAY">Ngày thường (T2–T6)</option>
                            <option value="WEEKEND">Cuối tuần (T7–CN)</option>
                            <option value="HOLIDAY">Ngày lễ</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[11px] text-[#A39E96] mb-1">Khung giờ *</label>
                          <select
                            value={prTimeSlot}
                            onChange={(e) => setPrTimeSlot(e.target.value as any)}
                            className="w-full px-2.5 py-1.5 bg-[#151318] border border-[#2A2631] rounded-lg text-xs text-[#F3EEE6]"
                          >
                            <option value="MORNING">Sáng (&lt; 12:00)</option>
                            <option value="AFTERNOON">Chiều (12:00 – 17:00)</option>
                            <option value="EVENING">Tối (&gt; 17:00)</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[11px] text-[#A39E96] mb-1">Giá cơ bản (VND) *</label>
                          <input
                            type="number"
                            min="0"
                            step="5000"
                            value={prBasePrice}
                            onChange={(e) => setPrBasePrice(Number(e.target.value))}
                            className="w-full px-2.5 py-1.5 bg-[#151318] border border-[#2A2631] rounded-lg text-xs text-[#F3EEE6]"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] text-[#A39E96] mb-1">Ngày hiệu lực *</label>
                          <input
                            type="date"
                            value={prEffectiveFrom}
                            onChange={(e) => setPrEffectiveFrom(e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-[#151318] border border-[#2A2631] rounded-lg text-xs text-[#F3EEE6]"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setShowAddPriceRuleForm(false)}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold text-[#A39E96] hover:bg-[#221F28]"
                        >
                          Hủy
                        </button>
                        <button
                          type="submit"
                          disabled={submitting}
                          className="px-4 py-1.5 bg-[#FFB23E] hover:bg-[#FFA21A] text-[#0B0A0C] font-bold rounded-lg text-xs flex items-center gap-1.5"
                        >
                          {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                          <span>Lưu giá vé</span>
                        </button>
                      </div>
                    </form>
                  )}

                  {pricingLoading ? (
                    <div className="flex justify-center py-12 text-[#FFB23E]"><Loader2 className="w-6 h-6 animate-spin" /></div>
                  ) : priceRules.length === 0 ? (
                    <div className="p-8 text-center bg-[#0B0A0C] border border-[#2A2631] rounded-xl text-xs text-[#A39E96]">
                      Chưa có quy tắc giá nào. Bấm &quot;Thêm / Cập nhật giá&quot; để thiết lập.
                    </div>
                  ) : (
                    <div className="border border-[#2A2631] rounded-xl overflow-hidden bg-[#0B0A0C]">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-[#110F14] text-[#A39E96] border-b border-[#2A2631] text-[10px] uppercase">
                          <tr>
                            <th className="px-3 py-2.5">Định dạng</th>
                            <th className="px-3 py-2.5">Loại ngày</th>
                            <th className="px-3 py-2.5">Khung giờ</th>
                            <th className="px-3 py-2.5">Giá vé cơ bản</th>
                            <th className="px-3 py-2.5">Hiệu lực từ</th>
                            <th className="px-3 py-2.5 text-right">Thao tác</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#2A2631]/60">
                          {priceRules.map((r) => (
                            <tr key={r.id} className="hover:bg-[#151318]/50">
                              <td className="px-3 py-2.5 font-bold text-[#FFB23E]">{r.roomFormat}</td>
                              <td className="px-3 py-2.5 text-[#F3EEE6]">{r.dayType}</td>
                              <td className="px-3 py-2.5 text-[#A39E96]">{r.timeSlot}</td>
                              <td className="px-3 py-2.5 font-mono font-bold text-[#F3EEE6]">{r.basePrice.toLocaleString('vi-VN')}đ</td>
                              <td className="px-3 py-2.5 text-xs text-[#A39E96]">{r.effectiveFrom ? r.effectiveFrom.slice(0, 10) : '-'}</td>
                              <td className="px-3 py-2.5 text-right">
                                <button
                                  type="button"
                                  onClick={() => handleDeletePriceRule(r.id)}
                                  className="text-rose-400 hover:text-rose-300 p-1"
                                  title="Xóa bảng giá"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Subtab 2: Seat Surcharges */}
              {pricingSubTab === 'SURCHARGES' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <p className="text-xs text-[#A39E96]">Mức phụ thu cộng thêm cho ghế VIP, Couple so với giá vé cơ bản</p>
                    <button
                      type="button"
                      onClick={() => setShowAddSurchargeForm(!showAddSurchargeForm)}
                      className="px-3 py-1.5 bg-[#FFB23E] hover:bg-[#FFA21A] text-[#0B0A0C] font-bold rounded-lg text-xs flex items-center gap-1.5 transition-all"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{showAddSurchargeForm ? 'Đóng biểu mẫu' : 'Thêm / Sửa phụ thu'}</span>
                    </button>
                  </div>

                  {showAddSurchargeForm && (
                    <form onSubmit={handleCreateSeatSurcharge} className="p-4 bg-[#0B0A0C] border border-[#2A2631] rounded-xl space-y-3">
                      <h4 className="text-xs font-bold text-[#FFB23E] uppercase tracking-wider">Cấu hình mức phụ thu ghế</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                        <div>
                          <label className="block text-[11px] text-[#A39E96] mb-1">Cụm rạp *</label>
                          <select
                            value={pricingCinemaId || (cinemas[0]?.id || '')}
                            onChange={(e) => setPricingCinemaId(e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-[#151318] border border-[#2A2631] rounded-lg text-xs text-[#F3EEE6]"
                          >
                            {cinemas.map((c) => (
                              <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[11px] text-[#A39E96] mb-1">Loại ghế *</label>
                          <select
                            value={scSeatType}
                            onChange={(e) => setScSeatType(e.target.value as any)}
                            className="w-full px-2.5 py-1.5 bg-[#151318] border border-[#2A2631] rounded-lg text-xs text-[#F3EEE6]"
                          >
                            <option value="STANDARD">Ghế Tiêu chuẩn (Standard)</option>
                            <option value="VIP">Ghế VIP</option>
                            <option value="COUPLE">Ghế Đôi (Couple)</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[11px] text-[#A39E96] mb-1">Phụ thu (VND) *</label>
                          <input
                            type="number"
                            min="0"
                            step="5000"
                            value={scAmount}
                            onChange={(e) => setScAmount(Number(e.target.value))}
                            className="w-full px-2.5 py-1.5 bg-[#151318] border border-[#2A2631] rounded-lg text-xs text-[#F3EEE6]"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] text-[#A39E96] mb-1">Ngày hiệu lực *</label>
                          <input
                            type="date"
                            value={scEffectiveFrom}
                            onChange={(e) => setScEffectiveFrom(e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-[#151318] border border-[#2A2631] rounded-lg text-xs text-[#F3EEE6]"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setShowAddSurchargeForm(false)}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold text-[#A39E96] hover:bg-[#221F28]"
                        >
                          Hủy
                        </button>
                        <button
                          type="submit"
                          disabled={submitting}
                          className="px-4 py-1.5 bg-[#FFB23E] hover:bg-[#FFA21A] text-[#0B0A0C] font-bold rounded-lg text-xs flex items-center gap-1.5"
                        >
                          {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                          <span>Lưu phụ thu</span>
                        </button>
                      </div>
                    </form>
                  )}

                  {pricingLoading ? (
                    <div className="flex justify-center py-12 text-[#FFB23E]"><Loader2 className="w-6 h-6 animate-spin" /></div>
                  ) : seatSurcharges.length === 0 ? (
                    <div className="p-8 text-center bg-[#0B0A0C] border border-[#2A2631] rounded-xl text-xs text-[#A39E96]">
                      Chưa có mức phụ thu ghế nào. Bấm &quot;Thêm / Sửa phụ thu&quot; để thiết lập.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {seatSurcharges.map((sc) => (
                        <div key={sc.id} className="p-4 bg-[#0B0A0C] border border-[#2A2631] rounded-xl flex items-center justify-between">
                          <div>
                            <span className="font-bold text-sm text-[#FFB23E]">{sc.seatType}</span>
                            <div className="font-mono text-base font-bold text-[#F3EEE6] mt-1">
                              +{sc.amount.toLocaleString('vi-VN')}đ
                            </div>
                            <span className="text-[10px] text-[#A39E96]">Hiệu lực: {sc.effectiveFrom ? sc.effectiveFrom.slice(0, 10) : '-'}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeleteSeatSurcharge(sc.id)}
                            className="p-1.5 text-rose-400 hover:text-rose-300"
                            title="Xóa phụ thu"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Subtab 3: Holidays */}
              {pricingSubTab === 'HOLIDAYS' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <p className="text-xs text-[#A39E96]">Danh sách ngày lễ toàn quốc (hệ thống tự động áp dụng biểu giá HOLIDAY)</p>
                    <button
                      type="button"
                      onClick={() => setShowAddHolidayForm(!showAddHolidayForm)}
                      className="px-3 py-1.5 bg-[#FFB23E] hover:bg-[#FFA21A] text-[#0B0A0C] font-bold rounded-lg text-xs flex items-center gap-1.5 transition-all"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{showAddHolidayForm ? 'Đóng biểu mẫu' : 'Thêm ngày lễ'}</span>
                    </button>
                  </div>

                  {showAddHolidayForm && (
                    <form onSubmit={handleCreateHoliday} className="p-4 bg-[#0B0A0C] border border-[#2A2631] rounded-xl space-y-3">
                      <h4 className="text-xs font-bold text-[#FFB23E] uppercase tracking-wider">Thêm ngày lễ mới</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] text-[#A39E96] mb-1">Ngày lễ (YYYY-MM-DD) *</label>
                          <input
                            type="date"
                            value={hlDate}
                            onChange={(e) => setHlDate(e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-[#151318] border border-[#2A2631] rounded-lg text-xs text-[#F3EEE6]"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] text-[#A39E96] mb-1">Tên ngày lễ *</label>
                          <input
                            type="text"
                            value={hlName}
                            onChange={(e) => setHlName(e.target.value)}
                            placeholder="Ví dụ: Tết Dương Lịch"
                            className="w-full px-2.5 py-1.5 bg-[#151318] border border-[#2A2631] rounded-lg text-xs text-[#F3EEE6]"
                            required
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setShowAddHolidayForm(false)}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold text-[#A39E96] hover:bg-[#221F28]"
                        >
                          Hủy
                        </button>
                        <button
                          type="submit"
                          disabled={submitting}
                          className="px-4 py-1.5 bg-[#FFB23E] hover:bg-[#FFA21A] text-[#0B0A0C] font-bold rounded-lg text-xs flex items-center gap-1.5"
                        >
                          {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                          <span>Lưu ngày lễ</span>
                        </button>
                      </div>
                    </form>
                  )}

                  {pricingLoading ? (
                    <div className="flex justify-center py-12 text-[#FFB23E]"><Loader2 className="w-6 h-6 animate-spin" /></div>
                  ) : holidays.length === 0 ? (
                    <div className="p-8 text-center bg-[#0B0A0C] border border-[#2A2631] rounded-xl text-xs text-[#A39E96]">
                      Chưa có ngày lễ nào được ghi nhận. Bấm &quot;Thêm ngày lễ&quot; để thiết lập.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {holidays.map((h) => (
                        <div key={h.id} className="p-3 bg-[#0B0A0C] border border-[#2A2631] rounded-xl flex items-center justify-between">
                          <div>
                            <span className="font-bold text-xs text-[#F3EEE6]">{h.name}</span>
                            <div className="text-[11px] font-mono text-[#FFB23E] mt-0.5">{h.date}</div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeleteHoliday(h.id, h.name)}
                            className="p-1.5 text-rose-400 hover:text-rose-300"
                            title="Xóa ngày lễ"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: COMBOS */}
          {activeTab === 'COMBOS' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-bold text-[#F3EEE6]">Quản Lý Combo Bắp Nước (F13)</h3>
                  <p className="text-xs text-[#A39E96]">Cấu hình danh mục combo bán kèm vé xem phim trực tuyến và tại rạp</p>
                </div>
                <div className="flex items-center gap-3">
                  <select
                    value={comboCinemaFilter}
                    onChange={(e) => setComboCinemaFilter(e.target.value)}
                    className="px-3 py-1.5 rounded-lg bg-[#0B0A0C] border border-[#2A2631] text-[#F3EEE6] text-xs focus:border-[#FFB23E] outline-none"
                  >
                    <option value="">-- Tất cả rạp & Global --</option>
                    {cinemas.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setShowAddComboForm(!showAddComboForm)}
                    className="px-4 py-2 bg-[#FFB23E] hover:bg-[#FFA21A] text-[#0B0A0C] font-bold rounded-xl text-xs flex items-center gap-2 shadow-md shadow-[#FFB23E]/20"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{showAddComboForm ? 'Đóng biểu mẫu' : 'Thêm Combo mới'}</span>
                  </button>
                </div>
              </div>

              {/* Add Combo Form */}
              {showAddComboForm && (
                <form onSubmit={handleCreateCombo} className="p-4 bg-[#0B0A0C] border border-[#2A2631] rounded-xl space-y-4">
                  <h4 className="text-xs font-bold text-[#FFB23E] uppercase tracking-wider">Thông tin Combo bắp nước</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] text-[#A39E96] mb-1">Mã Combo (Code) *</label>
                      <input
                        type="text"
                        value={newComboCode}
                        onChange={(e) => setNewComboCode(e.target.value)}
                        placeholder="VD: CB_POPCORN_SODA"
                        className="w-full px-2.5 py-1.5 bg-[#151318] border border-[#2A2631] rounded-lg text-xs text-[#F3EEE6] uppercase"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-[#A39E96] mb-1">Tên hiển thị *</label>
                      <input
                        type="text"
                        value={newComboName}
                        onChange={(e) => setNewComboName(e.target.value)}
                        placeholder="VD: Combo 1 Bắp 1 Nước"
                        className="w-full px-2.5 py-1.5 bg-[#151318] border border-[#2A2631] rounded-lg text-xs text-[#F3EEE6]"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-[#A39E96] mb-1">Giá bán (VND) *</label>
                      <input
                        type="number"
                        min="0"
                        step="5000"
                        value={newComboPrice}
                        onChange={(e) => setNewComboPrice(Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 bg-[#151318] border border-[#2A2631] rounded-lg text-xs text-[#F3EEE6]"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] text-[#A39E96] mb-1">Chi tiết các món (phân cách bằng dấu phẩy) *</label>
                      <input
                        type="text"
                        value={newComboItems}
                        onChange={(e) => setNewComboItems(e.target.value)}
                        placeholder="VD: 1 Bắp rang bơ phô mai, 1 Nước ngọt lớn"
                        className="w-full px-2.5 py-1.5 bg-[#151318] border border-[#2A2631] rounded-lg text-xs text-[#F3EEE6]"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-[#A39E96] mb-1">Mô tả ngắn</label>
                      <input
                        type="text"
                        value={newComboDescription}
                        onChange={(e) => setNewComboDescription(e.target.value)}
                        placeholder="VD: Tiết kiệm 20% so với mua lẻ"
                        className="w-full px-2.5 py-1.5 bg-[#151318] border border-[#2A2631] rounded-lg text-xs text-[#F3EEE6]"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowAddComboForm(false)}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold text-[#A39E96] hover:bg-[#221F28]"
                    >
                      Hủy bỏ
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-4 py-1.5 bg-[#FFB23E] hover:bg-[#FFA21A] text-[#0B0A0C] font-bold rounded-lg text-xs flex items-center gap-1.5"
                    >
                      {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      <span>Tạo Combo</span>
                    </button>
                  </div>
                </form>
              )}

              {/* Combos List */}
              {combosLoading ? (
                <div className="flex justify-center py-12 text-[#FFB23E]"><Loader2 className="w-6 h-6 animate-spin" /></div>
              ) : combos.length === 0 ? (
                <div className="p-8 text-center bg-[#0B0A0C] border border-[#2A2631] rounded-xl text-xs text-[#A39E96]">
                  Chưa có combo nào. Bấm &quot;Thêm Combo mới&quot; để tạo combo đầu tiên.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {combos.map((cb) => (
                    <div key={cb.id} className="p-4 bg-[#0B0A0C] border border-[#2A2631] rounded-xl flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs text-[#FFB23E] bg-[#FFB23E]/10 px-2 py-0.5 rounded border border-[#FFB23E]/30">
                            {cb.code}
                          </span>
                          <span className="font-bold text-sm text-[#F3EEE6]">{cb.name}</span>
                        </div>
                        {cb.description && <p className="text-xs text-[#A39E96]">{cb.description}</p>}
                        <div className="font-mono text-sm font-bold text-[#FFB23E] pt-1">
                          {cb.price.toLocaleString('vi-VN')}đ
                        </div>
                        <div className="text-[11px] text-[#A39E96]/80 flex flex-wrap gap-1">
                          {Array.isArray(cb.items) && cb.items.map((it: any, i: number) => (
                            <span key={i} className="bg-[#151318] px-1.5 py-0.5 rounded border border-[#2A2631]">
                              {typeof it === 'string' ? it : `${it.quantity || 1}x ${it.name || ''}`}
                            </span>
                          ))}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteCombo(cb.id, cb.name)}
                        className="p-1.5 text-rose-400 hover:text-rose-300"
                        title="Xóa combo"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 6: VOUCHERS */}
          {activeTab === 'VOUCHERS' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-[#F3EEE6]">Quản Lý Khuyến Mãi & Voucher (F13)</h3>
                  <p className="text-xs text-[#A39E96]">Xem danh sách mã giảm giá, quota và điều kiện tài chính</p>
                </div>
                <button
                  type="button"
                  onClick={loadVouchers}
                  className="p-2 rounded-lg bg-[#0B0A0C] border border-[#2A2631] text-[#A39E96] hover:text-[#FFB23E] transition-colors"
                  title="Tải lại danh sách"
                >
                  <RefreshCw className={`w-4 h-4 ${vouchersLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {vouchers.length === 0 ? (
                <div className="p-8 text-center bg-[#0B0A0C] border border-[#2A2631] rounded-2xl text-xs text-[#A39E96]">
                  Chưa có mã voucher tùy chỉnh nào. Các voucher hệ thống (CINEXVIP, CHAOBANMOI) đang được kích hoạt tự động theo chiến dịch.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {vouchers.map((v) => (
                    <div key={v.id} className="p-4 bg-[#0B0A0C] border border-[#2A2631] rounded-xl flex items-center justify-between">
                      <div>
                        <div className="font-mono font-black text-sm text-[#FFB23E]">{v.code}</div>
                        <p className="text-xs text-[#F3EEE6] mt-0.5">{v.name}</p>
                        <p className="text-[11px] text-[#A39E96] mt-1">
                          Giảm: {v.discountValue}{v.discountType === 'PERCENT' ? '%' : 'đ'} • Còn lại: {v.remainingQuota}/{v.totalQuota} lượt
                        </p>
                      </div>
                      <span className="text-[11px] px-2 py-1 rounded bg-blue-500/10 text-blue-400 font-bold border border-blue-500/30">
                        {v.scope}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: REFUNDS & RECONCILIATION */}
          {activeTab === 'REFUNDS' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-bold text-[#F3EEE6]">Đối Soát & Xử Lý Hoàn Tiền (F16)</h3>
                  <p className="text-xs text-[#A39E96]">Xem xét và xác nhận hoàn tiền cho các yêu cầu hủy vé hoặc hủy suất chiếu</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="inline-flex rounded-lg bg-[#0B0A0C] border border-[#2A2631] p-1 text-xs">
                    {(['PENDING', 'REFUNDED', 'ALL'] as const).map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setRefundStatusFilter(st)}
                        className={`px-3 py-1 rounded-md font-semibold transition-all ${
                          refundStatusFilter === st
                            ? 'bg-[#FFB23E] text-[#0B0A0C]'
                            : 'text-[#A39E96] hover:text-[#F3EEE6]'
                        }`}
                      >
                        {st === 'PENDING' ? 'Chờ duyệt' : st === 'REFUNDED' ? 'Đã hoàn' : 'Tất cả'}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={loadRefunds}
                    className="p-2 rounded-lg bg-[#0B0A0C] border border-[#2A2631] text-[#A39E96] hover:text-[#FFB23E] transition-colors"
                    title="Tải lại danh sách"
                  >
                    <RefreshCw className={`w-4 h-4 ${refundsLoading ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>

              {/* Processing Modal / Form Overlay if selected */}
              {selectedRefundToProcess && (
                <div className="p-5 bg-[#1C1A22] border border-[#FFB23E]/40 rounded-2xl shadow-xl animate-fade-in space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-[#2A2631]">
                    <div className="flex items-center gap-2">
                      <RotateCcw className="w-4 h-4 text-[#FFB23E]" />
                      <h4 className="text-xs font-black text-[#F3EEE6] uppercase tracking-wider">
                        Xác nhận hoàn tiền — Đơn #{selectedRefundToProcess.order.code}
                      </h4>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedRefundToProcess(null)}
                      className="p-1 rounded text-[#A39E96] hover:text-[#F3EEE6]"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <form onSubmit={handleProcessRefundSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                      <div className="p-3 bg-[#0B0A0C] rounded-xl border border-[#2A2631] space-y-1">
                        <div className="text-[#A39E96]">Khách hàng / Liên hệ</div>
                        <div className="font-bold text-[#F3EEE6]">{selectedRefundToProcess.order.customerName || 'Khách vãng lai'}</div>
                        <div className="text-[#A39E96]">{selectedRefundToProcess.order.customerPhone || 'N/A'} • {selectedRefundToProcess.order.customerEmail || 'N/A'}</div>
                      </div>
                      <div className="p-3 bg-[#0B0A0C] rounded-xl border border-[#2A2631] space-y-1">
                        <div className="text-[#A39E96]">Số tiền cần hoàn / Phí hủy</div>
                        <div className="font-extrabold text-[#FFB23E] text-sm">
                          {new Intl.NumberFormat('vi-VN').format(selectedRefundToProcess.amount)}đ
                        </div>
                        <div className="text-[11px] text-[#A39E96]">
                          Phí hủy: {new Intl.NumberFormat('vi-VN').format(selectedRefundToProcess.cancellationFee)}đ • Lý do: {selectedRefundToProcess.reason}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-[#A39E96] mb-1.5">
                          Phương thức hoàn tiền <span className="text-rose-400">*</span>
                        </label>
                        <select
                          value={refundMethod}
                          onChange={(e) => setRefundMethod(e.target.value as any)}
                          className="w-full bg-[#0B0A0C] border border-[#2A2631] rounded-xl px-3 py-2 text-xs text-[#F3EEE6] focus:border-[#FFB23E] focus:outline-none"
                        >
                          <option value="BANK_TRANSFER">Chuyển khoản ngân hàng (BANK_TRANSFER)</option>
                          <option value="CASH">Tiền mặt tại quầy (CASH)</option>
                          <option value="PROVIDER_MANUAL">Hoàn qua cổng VNPay thủ công (PROVIDER_MANUAL)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-[#A39E96] mb-1.5">
                          Mã giao dịch / Số chứng từ
                        </label>
                        <input
                          type="text"
                          value={refundExternalRef}
                          onChange={(e) => setRefundExternalRef(e.target.value)}
                          placeholder="VD: FT2601049923 hoặc UNC-001"
                          className="w-full bg-[#0B0A0C] border border-[#2A2631] rounded-xl px-3 py-2 text-xs text-[#F3EEE6] focus:border-[#FFB23E] focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#A39E96] mb-1.5">
                        Ghi chú nội bộ
                      </label>
                      <input
                        type="text"
                        value={refundNote}
                        onChange={(e) => setRefundNote(e.target.value)}
                        placeholder="Ghi chú thêm về chứng từ đối soát hoặc tài khoản nhận tiền..."
                        className="w-full bg-[#0B0A0C] border border-[#2A2631] rounded-xl px-3 py-2 text-xs text-[#F3EEE6] focus:border-[#FFB23E] focus:outline-none"
                      />
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setSelectedRefundToProcess(null)}
                        className="px-4 py-2 rounded-xl text-xs font-bold text-[#A39E96] hover:bg-[#2A2631] transition-colors"
                      >
                        Hủy bỏ
                      </button>
                      <button
                        type="submit"
                        disabled={submitting}
                        className="px-5 py-2 rounded-xl text-xs font-black bg-emerald-500 hover:bg-emerald-400 text-[#0B0A0C] flex items-center gap-2 transition-all disabled:opacity-50"
                      >
                        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                        <span>Xác Nhận Hoàn Tiền Thành Công</span>
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Refunds List */}
              {refundsLoading ? (
                <div className="p-12 text-center text-[#A39E96] flex items-center justify-center gap-2 text-xs">
                  <Loader2 className="w-4 h-4 animate-spin text-[#FFB23E]" />
                  <span>Đang tải danh sách yêu cầu hoàn tiền...</span>
                </div>
              ) : refunds.length === 0 ? (
                <div className="p-8 text-center bg-[#0B0A0C] border border-[#2A2631] rounded-2xl text-xs text-[#A39E96]">
                  Không có yêu cầu hoàn tiền nào phù hợp với bộ lọc hiện tại.
                </div>
              ) : (
                <div className="space-y-3">
                  {refunds.map((r) => (
                    <div
                      key={r.id}
                      className="p-4 bg-[#0B0A0C] border border-[#2A2631] rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all hover:border-[#3E3947]"
                    >
                      <div className="space-y-1 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono font-black text-sm text-[#FFB23E]">
                            #{r.order.code}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-extrabold border ${
                              r.status === 'REFUNDED'
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                            }`}
                          >
                            {r.status === 'REFUNDED' ? 'ĐÃ HOÀN TIỀN' : 'CHỜ XỬ LÝ'}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#1C1A22] text-[#A39E96]">
                            {r.reason}
                          </span>
                        </div>

                        <div className="text-xs text-[#F3EEE6] font-medium">
                          {r.order.movieTitle} • {r.order.cinemaName} ({r.order.roomName})
                        </div>

                        <div className="text-[11px] text-[#A39E96] flex flex-wrap items-center gap-x-4 gap-y-1">
                          <span>Khách: <strong className="text-[#F3EEE6]">{r.order.customerName || 'N/A'}</strong> ({r.order.customerPhone || 'N/A'})</span>
                          <span>Suất: {new Date(r.order.showtimeStart).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })}</span>
                          <span>Cổng: {r.payment.provider}</span>
                          {r.externalReference && <span>Mã tham chiếu: <strong className="text-emerald-400 font-mono">{r.externalReference}</strong></span>}
                          {r.processedAt && <span>Ngày hoàn: {new Date(r.processedAt).toLocaleDateString('vi-VN')}</span>}
                        </div>
                      </div>

                      <div className="flex items-center justify-between md:justify-end gap-4 shrink-0">
                        <div className="text-right">
                          <div className="text-sm font-black text-[#F3EEE6]">
                            {new Intl.NumberFormat('vi-VN').format(r.amount)}đ
                          </div>
                          {r.cancellationFee > 0 && (
                            <div className="text-[10px] text-rose-400">
                              Phí hủy: {new Intl.NumberFormat('vi-VN').format(r.cancellationFee)}đ
                            </div>
                          )}
                        </div>

                        {r.status === 'PENDING' && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedRefundToProcess(r);
                              setRefundExternalRef('');
                              setRefundNote('');
                            }}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#FFB23E] hover:bg-[#FFA51E] text-[#0B0A0C] transition-all flex items-center gap-1.5"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Xử lý</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
